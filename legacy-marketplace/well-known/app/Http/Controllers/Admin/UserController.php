<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $query = User::withCount(['investments', 'tokenHoldings']);

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                    ->orWhere('email', 'like', "%{$request->search}%")
                    ->orWhere('wallet_address', 'like', "%{$request->search}%");
            });
        }

        if ($request->filled('role')) {
            if ($request->role === 'admin') {
                $query->where('is_admin', true);
            } else {
                $query->where('is_admin', false);
            }
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $users = $query->orderBy('created_at', 'desc')->paginate(20)->withQueryString();

        return Inertia::render('Admin/Users/Index', [
            'users' => $users,
            'filters' => $request->only(['search', 'role', 'status']),
        ]);
    }

    public function show(User $user)
    {
        $user->load(['kycVerification', 'tokenHoldings.property', 'investments.property']);

        $stats = [
            'total_invested' => $user->tokenHoldings()->sum('total_invested'),
            'properties_owned' => $user->tokenHoldings()->count(),
            'total_tokens' => $user->tokenHoldings()->sum('token_amount'),
            'balance' => $user->balance,
        ];

        return Inertia::render('Admin/Users/Show', [
            'user' => $user,
            'stats' => $stats,
        ]);
    }

    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email,' . $user->id],
            'is_admin' => ['boolean'],
        ]);

        $user->update($validated);

        return back()->with('success', 'User updated successfully.');
    }

    public function destroy(User $user)
    {
        if ($user->tokenHoldings()->exists()) {
            return back()->withErrors(['error' => 'Cannot delete user with token holdings.']);
        }

        $user->delete();

        return redirect()->route('admin.users.index')
            ->with('success', 'User deleted successfully.');
    }

    public function suspend(Request $request, User $user)
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);

        if ($user->is_admin) {
            return back()->withErrors(['error' => 'Cannot suspend an admin user.']);
        }

        $user->update([
            'status' => 'suspended',
            'suspension_reason' => $validated['reason'],
            'suspended_at' => now(),
        ]);

        return back()->with('success', 'User has been suspended.');
    }

    public function unsuspend(User $user)
    {
        $user->update([
            'status' => 'active',
            'suspension_reason' => null,
            'suspended_at' => null,
        ]);

        return back()->with('success', 'User has been reactivated.');
    }

    public function addFunds(Request $request, User $user)
    {
        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.00000001'],
            'description' => ['nullable', 'string', 'max:500'],
        ]);

        $user->addBalance($validated['amount'], $validated['description'] ?? null);

        return back()->with('success', "Added \${$validated['amount']} to user's balance.");
    }

    public function deductFunds(Request $request, User $user)
    {
        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.00000001'],
            'description' => ['nullable', 'string', 'max:500'],
        ]);

        if ($user->balance < $validated['amount']) {
            return back()->withErrors(['error' => 'Insufficient balance.']);
        }

        $user->deductBalance($validated['amount']);

        return back()->with('success', "Deducted \${$validated['amount']} from user's balance.");
    }
}
