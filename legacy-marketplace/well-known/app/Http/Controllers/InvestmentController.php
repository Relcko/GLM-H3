<?php

namespace App\Http\Controllers;

use App\Models\BlockchainConfig;
use App\Models\Investment;
use App\Models\Property;
use App\Models\Setting;
use App\Models\TokenHolding;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class InvestmentController extends Controller
{
    public function create(Property $property)
    {
        $user = Auth::user();

        // Check KYC status if required
        if (Setting::isKycRequired() && !$user->isKycVerified()) {
            return redirect()->route('kyc.index')->with('error', 'Please complete KYC verification before investing.');
        }

        if ($property->status !== 'active') {
            return back()->with('error', 'This property is not available for investment.');
        }

        return Inertia::render('Investment/Create', [
            'property' => $property->load('documents'),
            'blockchainConfigs' => BlockchainConfig::where('is_active', true)->get(),
        ]);
    }

    public function store(Request $request, Property $property)
    {
        $user = Auth::user();

        // Check KYC status if required
        if (Setting::isKycRequired() && !$user->isKycVerified()) {
            return back()->withErrors(['kyc' => 'Please complete KYC verification before investing.']);
        }

        $validated = $request->validate([
            'tokens' => ['required', 'integer', 'min:1'],
            'tx_hash' => ['required', 'string', 'regex:/^0x[a-fA-F0-9]{64}$/'],
            'blockchain' => ['required', 'string', 'in:ethereum,bsc,sepolia,bsc_testnet'],
        ]);

        if ($property->status !== 'active') {
            return back()->withErrors(['property' => 'This property is not available for investment.']);
        }

        if ($validated['tokens'] > $property->available_tokens) {
            return back()->withErrors(['tokens' => 'Not enough tokens available.']);
        }

        $amount = $validated['tokens'] * $property->token_price;

        // Check minimum investment
        if ($amount < $property->min_investment) {
            return back()->withErrors(['tokens' => "Minimum investment is \${$property->min_investment}."]);
        }

        DB::beginTransaction();

        try {
            // Create investment record
            $investment = Investment::create([
                'user_id' => Auth::id(),
                'property_id' => $property->id,
                'tokens_purchased' => $validated['tokens'],
                'amount_paid' => $amount,
                'payment_currency' => 'USDT',
                'tx_hash' => $validated['tx_hash'],
                'blockchain' => $validated['blockchain'],
                'status' => 'pending',
            ]);

            // Create transaction record
            Transaction::create([
                'user_id' => Auth::id(),
                'investment_id' => $investment->id,
                'property_id' => $property->id,
                'type' => 'purchase',
                'amount' => $amount,
                'currency' => 'USDT',
                'tx_hash' => $validated['tx_hash'],
                'blockchain' => $validated['blockchain'],
                'from_address' => Auth::user()->wallet_address,
                'status' => 'pending',
            ]);

            DB::commit();

            return redirect()->route('dashboard')->with('success', 'Investment submitted successfully. We will confirm the transaction shortly.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->withErrors(['error' => 'Failed to process investment. Please try again.']);
        }
    }

    public function confirm(Request $request, Investment $investment)
    {
        // This would typically be called by a webhook or background job
        // after verifying the transaction on-chain

        if ($investment->status !== 'pending') {
            return response()->json(['error' => 'Investment already processed'], 400);
        }

        DB::beginTransaction();

        try {
            $property = $investment->property;

            // Update investment status
            $investment->update([
                'status' => 'confirmed',
                'confirmed_at' => now(),
            ]);

            // Update transaction status
            $investment->transactions()->update(['status' => 'confirmed']);

            // Update property available tokens
            $property->decrement('available_tokens', $investment->tokens_purchased);
            $property->increment('sold_tokens', $investment->tokens_purchased);

            // Check if property is sold out
            if ($property->available_tokens <= 0) {
                $property->update(['status' => 'sold_out']);
            }

            // Update or create token holding
            $holding = TokenHolding::firstOrNew([
                'user_id' => $investment->user_id,
                'property_id' => $investment->property_id,
            ]);

            if ($holding->exists) {
                // Calculate new average price
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

            DB::commit();

            return response()->json(['success' => true]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Failed to confirm investment'], 500);
        }
    }
}
