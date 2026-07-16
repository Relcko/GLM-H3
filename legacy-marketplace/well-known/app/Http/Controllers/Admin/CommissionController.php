<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Commission;
use App\Models\CommissionWithdrawal;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class CommissionController extends Controller
{
    /**
     * List all commissions
     */
    public function index(Request $request)
    {
        $query = Commission::with(['agent.user', 'user', 'commissionable']);

        // Filter by status
        if ($request->status && in_array($request->status, ['pending', 'approved', 'paid', 'cancelled'])) {
            $query->where('status', $request->status);
        }

        // Filter by transaction type
        if ($request->type && in_array($request->type, ['primary_purchase', 'secondary_buy', 'secondary_sell'])) {
            $query->where('transaction_type', $request->type);
        }

        // Filter by agent
        if ($request->agent_id) {
            $query->where('agent_id', $request->agent_id);
        }

        $commissions = $query->orderByDesc('created_at')->paginate(20)->withQueryString();

        $stats = [
            'total' => Commission::sum('commission_amount'),
            'pending' => Commission::pending()->sum('commission_amount'),
            'approved' => Commission::approved()->sum('commission_amount'),
            'paid' => Commission::paid()->sum('commission_amount'),
        ];

        return Inertia::render('Admin/Commissions/Index', [
            'commissions' => $commissions,
            'stats' => $stats,
            'filters' => $request->only(['status', 'type', 'agent_id']),
        ]);
    }

    /**
     * Show commission details
     */
    public function show(Commission $commission)
    {
        $commission->load(['agent.user', 'user', 'referral', 'commissionable', 'approver']);

        return Inertia::render('Admin/Commissions/Show', [
            'commission' => $commission,
        ]);
    }

    /**
     * Approve commission
     */
    public function approve(Commission $commission)
    {
        if (!$commission->isPending()) {
            return back()->withErrors(['error' => 'This commission cannot be approved']);
        }

        $commission->approve(Auth::id());

        return back()->with('success', 'Commission approved');
    }

    /**
     * Approve multiple commissions
     */
    public function bulkApprove(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:commissions,id',
        ]);

        $count = 0;
        foreach ($validated['ids'] as $id) {
            $commission = Commission::find($id);
            if ($commission && $commission->isPending()) {
                $commission->approve(Auth::id());
                $count++;
            }
        }

        return back()->with('success', "{$count} commissions approved");
    }

    /**
     * Mark commission as paid
     */
    public function markPaid(Request $request, Commission $commission)
    {
        if (!$commission->isApproved()) {
            return back()->withErrors(['error' => 'This commission must be approved first']);
        }

        $validated = $request->validate([
            'tx_hash' => 'nullable|string|regex:/^0x[a-fA-F0-9]{64}$/',
        ]);

        $commission->markPaid($validated['tx_hash'] ?? null);

        return back()->with('success', 'Commission marked as paid');
    }

    /**
     * Cancel commission
     */
    public function cancel(Commission $commission)
    {
        if ($commission->isPaid()) {
            return back()->withErrors(['error' => 'Paid commissions cannot be cancelled']);
        }

        $commission->cancel();

        return back()->with('success', 'Commission cancelled');
    }

    /**
     * List withdrawals
     */
    public function withdrawals(Request $request)
    {
        $query = CommissionWithdrawal::with(['agent.user', 'processor']);

        if ($request->status && in_array($request->status, ['pending', 'processing', 'completed', 'failed', 'cancelled'])) {
            $query->where('status', $request->status);
        }

        $withdrawals = $query->orderByDesc('created_at')->paginate(20)->withQueryString();

        $stats = [
            'pending' => CommissionWithdrawal::pending()->sum('amount'),
            'completed' => CommissionWithdrawal::completed()->sum('amount'),
        ];

        return Inertia::render('Admin/Commissions/Withdrawals', [
            'withdrawals' => $withdrawals,
            'stats' => $stats,
            'filters' => $request->only(['status']),
        ]);
    }

    /**
     * Process withdrawal
     */
    public function processWithdrawal(Request $request, CommissionWithdrawal $withdrawal)
    {
        $validated = $request->validate([
            'action' => 'required|in:complete,fail',
            'tx_hash' => 'required_if:action,complete|nullable|string|regex:/^0x[a-fA-F0-9]{64}$/',
            'failure_reason' => 'required_if:action,fail|nullable|string|max:500',
        ]);

        if ($validated['action'] === 'complete') {
            $withdrawal->markCompleted($validated['tx_hash'], Auth::id());
            return back()->with('success', 'Withdrawal completed');
        } else {
            $withdrawal->markFailed($validated['failure_reason'], Auth::id());
            return back()->with('success', 'Withdrawal marked as failed');
        }
    }

    /**
     * Commission settings
     */
    public function settings()
    {
        $settings = [
            'default_commission_rate' => Setting::get('default_commission_rate', '5'),
            'platform_trading_fee' => Setting::get('platform_trading_fee', '1'),
            'min_withdrawal_amount' => Setting::get('min_withdrawal_amount', '10'),
            'commission_auto_approve' => Setting::get('commission_auto_approve', 'false'),
        ];

        return Inertia::render('Admin/Commissions/Settings', [
            'settings' => $settings,
        ]);
    }

    /**
     * Update commission settings
     */
    public function updateSettings(Request $request)
    {
        $validated = $request->validate([
            'default_commission_rate' => 'required|numeric|min:0|max:100',
            'platform_trading_fee' => 'required|numeric|min:0|max:100',
            'min_withdrawal_amount' => 'required|numeric|min:0',
            'commission_auto_approve' => 'required|in:true,false',
        ]);

        foreach ($validated as $key => $value) {
            Setting::set($key, (string) $value);
        }

        return back()->with('success', 'Settings updated successfully');
    }
}
