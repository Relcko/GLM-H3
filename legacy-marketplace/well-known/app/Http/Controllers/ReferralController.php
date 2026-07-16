<?php

namespace App\Http\Controllers;

use App\Models\Agent;
use App\Services\CommissionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ReferralController extends Controller
{
    protected CommissionService $commissionService;

    public function __construct(CommissionService $commissionService)
    {
        $this->commissionService = $commissionService;
    }

    /**
     * Show agent dashboard (for users who are agents)
     */
    public function dashboard()
    {
        $user = Auth::user();
        $agent = $user->agent;

        if (!$agent) {
            return Inertia::render('Referral/Apply', [
                'hasApplied' => false,
            ]);
        }

        if ($agent->status !== 'active') {
            return Inertia::render('Referral/Apply', [
                'hasApplied' => true,
                'agent' => $agent,
            ]);
        }

        $stats = $this->commissionService->getAgentStats($agent);

        $recentReferrals = $agent->referrals()
            ->with('referredUser')
            ->orderByDesc('created_at')
            ->limit(10)
            ->get();

        $recentCommissions = $agent->commissions()
            ->with(['user', 'commissionable'])
            ->orderByDesc('created_at')
            ->limit(10)
            ->get();

        return Inertia::render('Referral/Dashboard', [
            'agent' => $agent,
            'stats' => $stats,
            'recentReferrals' => $recentReferrals,
            'recentCommissions' => $recentCommissions,
        ]);
    }

    /**
     * Apply to become an agent
     */
    public function apply(Request $request)
    {
        $user = Auth::user();

        // Check if already an agent
        if ($user->agent) {
            return back()->withErrors(['error' => 'You have already applied to become an agent']);
        }

        $validated = $request->validate([
            'company_name' => 'nullable|string|max:255',
            'license_number' => 'nullable|string|max:100',
        ]);

        Agent::create([
            'user_id' => $user->id,
            'company_name' => $validated['company_name'] ?? null,
            'license_number' => $validated['license_number'] ?? null,
            'status' => 'pending',
            'commission_rate' => 0, // Admin will set this
        ]);

        return redirect()->route('referral.dashboard')
            ->with('success', 'Your application has been submitted. We will review it shortly.');
    }

    /**
     * Show all referrals
     */
    public function referrals()
    {
        $agent = Auth::user()->agent;

        if (!$agent || $agent->status !== 'active') {
            abort(403);
        }

        $referrals = $agent->referrals()
            ->with(['referredUser', 'commissions'])
            ->orderByDesc('created_at')
            ->paginate(20);

        return Inertia::render('Referral/Referrals', [
            'referrals' => $referrals,
            'agent' => $agent,
        ]);
    }

    /**
     * Show all commissions
     */
    public function commissions()
    {
        $agent = Auth::user()->agent;

        if (!$agent || $agent->status !== 'active') {
            abort(403);
        }

        $commissions = $agent->commissions()
            ->with(['user', 'commissionable'])
            ->orderByDesc('created_at')
            ->paginate(20);

        $totals = [
            'pending' => $agent->commissions()->pending()->sum('commission_amount'),
            'approved' => $agent->commissions()->approved()->sum('commission_amount'),
            'paid' => $agent->commissions()->paid()->sum('commission_amount'),
        ];

        return Inertia::render('Referral/Commissions', [
            'commissions' => $commissions,
            'totals' => $totals,
            'agent' => $agent,
        ]);
    }

    /**
     * Show withdrawals
     */
    public function withdrawals()
    {
        $agent = Auth::user()->agent;

        if (!$agent || $agent->status !== 'active') {
            abort(403);
        }

        $withdrawals = $agent->withdrawals()
            ->orderByDesc('created_at')
            ->paginate(20);

        return Inertia::render('Referral/Withdrawals', [
            'withdrawals' => $withdrawals,
            'agent' => $agent,
            'availableBalance' => $agent->available_balance,
        ]);
    }

    /**
     * Request withdrawal
     */
    public function requestWithdrawal(Request $request)
    {
        $agent = Auth::user()->agent;

        if (!$agent || $agent->status !== 'active') {
            abort(403);
        }

        $validated = $request->validate([
            'amount' => 'required|numeric|min:10',
            'wallet_address' => 'required|string|regex:/^0x[a-fA-F0-9]{40}$/',
            'blockchain' => 'required|string',
        ]);

        if ($validated['amount'] > $agent->available_balance) {
            return back()->withErrors(['amount' => 'Insufficient balance']);
        }

        $agent->withdrawals()->create([
            'amount' => $validated['amount'],
            'wallet_address' => $validated['wallet_address'],
            'blockchain' => $validated['blockchain'],
            'status' => 'pending',
        ]);

        return back()->with('success', 'Withdrawal request submitted');
    }
}
