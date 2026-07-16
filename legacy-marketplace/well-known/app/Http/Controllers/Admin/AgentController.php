<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Agent;
use App\Services\CommissionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class AgentController extends Controller
{
    protected CommissionService $commissionService;

    public function __construct(CommissionService $commissionService)
    {
        $this->commissionService = $commissionService;
    }

    /**
     * List all agents
     */
    public function index(Request $request)
    {
        $query = Agent::with('user');

        // Filter by status
        if ($request->status && in_array($request->status, ['pending', 'active', 'suspended', 'terminated'])) {
            $query->where('status', $request->status);
        }

        // Search
        if ($request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('agent_code', 'like', "%{$search}%")
                    ->orWhere('company_name', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        $agents = $query->orderByDesc('created_at')->paginate(20)->withQueryString();

        $stats = [
            'total' => Agent::count(),
            'pending' => Agent::pending()->count(),
            'active' => Agent::active()->count(),
        ];

        return Inertia::render('Admin/Agents/Index', [
            'agents' => $agents,
            'stats' => $stats,
            'filters' => $request->only(['status', 'search']),
        ]);
    }

    /**
     * Show agent details
     */
    public function show(Agent $agent)
    {
        $agent->load(['user', 'approver']);

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

        return Inertia::render('Admin/Agents/Show', [
            'agent' => $agent,
            'stats' => $stats,
            'recentReferrals' => $recentReferrals,
            'recentCommissions' => $recentCommissions,
        ]);
    }

    /**
     * Approve agent application
     */
    public function approve(Request $request, Agent $agent)
    {
        $validated = $request->validate([
            'commission_rate' => 'required|numeric|min:0|max:100',
            'notes' => 'nullable|string|max:1000',
        ]);

        $agent->update([
            'status' => 'active',
            'commission_rate' => $validated['commission_rate'],
            'notes' => $validated['notes'] ?? $agent->notes,
            'approved_at' => now(),
            'approved_by' => Auth::id(),
        ]);

        return back()->with('success', 'Agent approved successfully');
    }

    /**
     * Update agent
     */
    public function update(Request $request, Agent $agent)
    {
        $validated = $request->validate([
            'commission_rate' => 'required|numeric|min:0|max:100',
            'status' => 'required|in:pending,active,suspended,terminated',
            'notes' => 'nullable|string|max:1000',
        ]);

        $agent->update($validated);

        return back()->with('success', 'Agent updated successfully');
    }

    /**
     * Suspend agent
     */
    public function suspend(Agent $agent)
    {
        $agent->update(['status' => 'suspended']);
        return back()->with('success', 'Agent suspended');
    }

    /**
     * Reactivate agent
     */
    public function reactivate(Agent $agent)
    {
        $agent->update(['status' => 'active']);
        return back()->with('success', 'Agent reactivated');
    }

    /**
     * Terminate agent
     */
    public function terminate(Agent $agent)
    {
        $agent->update(['status' => 'terminated']);
        return back()->with('success', 'Agent terminated');
    }
}
