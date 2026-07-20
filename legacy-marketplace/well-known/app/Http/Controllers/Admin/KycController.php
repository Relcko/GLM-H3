<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\KycVerification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class KycController extends Controller
{
    public function index(Request $request)
    {
        $query = KycVerification::with('user');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->whereHas('user', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $submissions = $query->orderByRaw("CASE WHEN status = 'submitted' THEN 0 ELSE 1 END")
            ->orderBy('submitted_at', 'desc')
            ->paginate(15);

        $stats = [
            'pending' => KycVerification::where('status', 'submitted')->count(),
            'approved' => KycVerification::where('status', 'approved')->count(),
            'rejected' => KycVerification::where('status', 'rejected')->count(),
        ];

        return Inertia::render('Admin/Kyc/Index', [
            'submissions' => $submissions,
            'filters' => $request->only(['status', 'search']),
            'stats' => $stats,
        ]);
    }

    public function show(KycVerification $kyc)
    {
        return Inertia::render('Admin/Kyc/Show', [
            'kyc' => $kyc->load('user'),
        ]);
    }

    public function approve(KycVerification $kyc)
    {
        if ($kyc->status !== 'submitted') {
            return back()->withErrors(['kyc' => 'This KYC submission cannot be approved.']);
        }

        $kyc->update([
            'status' => 'approved',
            'verified_at' => now(),
            'verified_by' => Auth::id(),
            'rejection_reason' => null,
        ]);

        return back()->with('success', 'KYC approved successfully.');
    }

    public function reject(Request $request, KycVerification $kyc)
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);

        if ($kyc->status !== 'submitted') {
            return back()->withErrors(['kyc' => 'This KYC submission cannot be rejected.']);
        }

        $kyc->update([
            'status' => 'rejected',
            'verified_at' => now(),
            'verified_by' => Auth::id(),
            'rejection_reason' => $validated['reason'],
        ]);

        return back()->with('success', 'KYC rejected.');
    }
}
