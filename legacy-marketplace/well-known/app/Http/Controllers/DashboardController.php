<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        $user = Auth::user();

        $holdings = $user->tokenHoldings()
            ->with('property')
            ->get()
            ->map(function ($holding) {
                return [
                    'id' => $holding->id,
                    'property' => $holding->property,
                    'token_amount' => $holding->token_amount,
                    'average_buy_price' => $holding->average_buy_price,
                    'total_invested' => $holding->total_invested,
                    'current_value' => $holding->current_value,
                    'profit_loss' => $holding->profit_loss,
                    'profit_loss_percentage' => $holding->profit_loss_percentage,
                    'ownership_percentage' => $holding->ownership_percentage,
                ];
            });

        $recentTransactions = $user->transactions()
            ->with('property')
            ->orderBy('created_at', 'desc')
            ->take(10)
            ->get();

        $recentInvestments = $user->investments()
            ->with('property')
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get();

        $stats = [
            'total_invested' => $holdings->sum('total_invested'),
            'current_value' => $holdings->sum('current_value'),
            'total_profit' => $holdings->sum('profit_loss'),
            'properties_count' => $holdings->count(),
            'total_tokens' => $holdings->sum('token_amount'),
        ];

        $dividendPayments = $user->dividendPayments()
            ->with(['dividend.property'])
            ->where('status', 'paid')
            ->orderBy('created_at', 'desc')
            ->take(10)
            ->get();

        return Inertia::render('Dashboard/Index', [
            'holdings' => $holdings,
            'recentTransactions' => $recentTransactions,
            'recentInvestments' => $recentInvestments,
            'stats' => $stats,
            'dividendPayments' => $dividendPayments,
        ]);
    }

    public function portfolio()
    {
        $user = Auth::user();

        $holdings = $user->tokenHoldings()
            ->with('property')
            ->get()
            ->map(function ($holding) {
                return [
                    'id' => $holding->id,
                    'property' => $holding->property,
                    'token_amount' => $holding->token_amount,
                    'average_buy_price' => $holding->average_buy_price,
                    'total_invested' => $holding->total_invested,
                    'current_value' => $holding->current_value,
                    'profit_loss' => $holding->profit_loss,
                    'profit_loss_percentage' => $holding->profit_loss_percentage,
                    'ownership_percentage' => $holding->ownership_percentage,
                ];
            });

        return Inertia::render('Dashboard/Portfolio', [
            'holdings' => $holdings,
        ]);
    }

    public function transactions()
    {
        $user = Auth::user();

        $transactions = $user->transactions()
            ->with('property')
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return Inertia::render('Dashboard/Transactions', [
            'transactions' => $transactions,
        ]);
    }

    public function settings()
    {
        $user = Auth::user()->load('kycVerification');

        return Inertia::render('Dashboard/Settings', [
            'user' => $user,
        ]);
    }

    public function updateProfile(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:20'],
            'bio' => ['nullable', 'string', 'max:500'],
        ]);

        Auth::user()->update($validated);

        return back()->with('success', 'Profile updated successfully.');
    }
}
