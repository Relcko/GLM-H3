<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Investment;
use App\Models\TokenHolding;
use App\Services\CommissionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class InvestmentController extends Controller
{
    public function index(Request $request)
    {
        $query = Investment::with(['user', 'property']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $query->whereHas('user', function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                    ->orWhere('email', 'like', "%{$request->search}%");
            })->orWhere('tx_hash', 'like', "%{$request->search}%");
        }

        $investments = $query->orderBy('created_at', 'desc')->paginate(20)->withQueryString();

        $stats = [
            'pending' => Investment::where('status', 'pending')->count(),
            'confirmed' => Investment::where('status', 'confirmed')->count(),
            'total_value' => Investment::where('status', 'confirmed')->sum('amount_paid'),
        ];

        return Inertia::render('Admin/Investments/Index', [
            'investments' => $investments,
            'filters' => $request->only(['status', 'search']),
            'stats' => $stats,
        ]);
    }

    public function show(Investment $investment)
    {
        $investment->load(['user', 'property', 'transactions']);

        return Inertia::render('Admin/Investments/Show', [
            'investment' => $investment,
        ]);
    }

    public function confirm(Investment $investment)
    {
        if ($investment->status !== 'pending') {
            return back()->withErrors(['error' => 'Investment is not pending.']);
        }

        DB::beginTransaction();

        try {
            $property = $investment->property;

            // Check if tokens are still available
            if ($investment->tokens_purchased > $property->available_tokens) {
                return back()->withErrors(['error' => 'Not enough tokens available.']);
            }

            // Update investment status
            $investment->update([
                'status' => 'confirmed',
                'confirmed_at' => now(),
            ]);

            // Update transaction status
            $investment->transactions()->update(['status' => 'confirmed']);

            // Update property tokens
            $property->decrement('available_tokens', $investment->tokens_purchased);
            $property->increment('sold_tokens', $investment->tokens_purchased);

            if ($property->available_tokens <= 0) {
                $property->update(['status' => 'sold_out']);
            }

            // Update or create token holding
            $holding = TokenHolding::firstOrNew([
                'user_id' => $investment->user_id,
                'property_id' => $investment->property_id,
            ]);

            if ($holding->exists) {
                $totalTokens = $holding->token_amount + $investment->tokens_purchased;
                $totalValue = $holding->total_invested + $investment->amount_paid;
                $holding->average_buy_price = $totalValue / $totalTokens;
                $holding->token_amount = $totalTokens;
                $holding->total_invested = $totalValue;
            } else {
                $holding->token_amount = $investment->tokens_purchased;
                $holding->average_buy_price = $investment->amount_paid / $investment->tokens_purchased;
                $holding->total_invested = $investment->amount_paid;
            }

            $holding->save();

            // Process referral commission if user was referred
            $commissionService = app(CommissionService::class);
            $commissionService->processPrimaryPurchaseCommission($investment);

            DB::commit();

            return back()->with('success', 'Investment confirmed successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->withErrors(['error' => 'Failed to confirm investment: ' . $e->getMessage()]);
        }
    }

    public function reject(Request $request, Investment $investment)
    {
        if ($investment->status !== 'pending') {
            return back()->withErrors(['error' => 'Investment is not pending.']);
        }

        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);

        $investment->update([
            'status' => 'failed',
            'failure_reason' => $validated['reason'],
        ]);

        $investment->transactions()->update(['status' => 'failed']);

        return back()->with('success', 'Investment rejected.');
    }
}
