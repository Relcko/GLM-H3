<?php

namespace App\Http\Controllers;

use App\Models\KycVerification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class KycController extends Controller
{
    public function index()
    {
        $kyc = Auth::user()->kycVerification;

        return Inertia::render('Kyc/Index', [
            'kyc' => $kyc,
        ]);
    }

    public function store(Request $request)
    {
        $user = Auth::user();

        // Check if user already has a pending or approved KYC
        $existingKyc = $user->kycVerification;
        if ($existingKyc && in_array($existingKyc->status, ['submitted', 'approved'])) {
            return back()->withErrors(['kyc' => 'You already have a KYC submission.']);
        }

        $validated = $request->validate([
            'document_type' => ['required', 'string', 'in:passport,national_id,drivers_license'],
            'document_front' => ['required', 'image', 'max:5120'], // 5MB max
            'document_back' => ['nullable', 'image', 'max:5120'],
            'selfie' => ['required', 'image', 'max:5120'],
        ]);

        // Store uploaded files
        $documentFrontPath = $request->file('document_front')->store('kyc/' . $user->id, 'public');
        $documentBackPath = $request->hasFile('document_back')
            ? $request->file('document_back')->store('kyc/' . $user->id, 'public')
            : null;
        $selfiePath = $request->file('selfie')->store('kyc/' . $user->id, 'public');

        // Create or update KYC record
        $kyc = KycVerification::updateOrCreate(
            ['user_id' => $user->id],
            [
                'document_type' => $validated['document_type'],
                'document_front' => $documentFrontPath,
                'document_back' => $documentBackPath,
                'selfie' => $selfiePath,
                'status' => 'submitted',
                'submitted_at' => now(),
                'rejection_reason' => null,
            ]
        );

        return redirect()->route('kyc.index')->with('success', 'KYC documents submitted successfully. We will review them shortly.');
    }
}
