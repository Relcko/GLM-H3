<?php

use App\Models\BlockchainConfig;
use App\Models\Property;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/properties', function (Request $request) {
    $query = Property::whereIn('status', ['active', 'upcoming']);

    if ($request->filled('blockchain')) {
        $query->where('blockchain', $request->blockchain);
    }

    return $query->get(['id', 'name', 'slug', 'token_price', 'available_tokens', 'blockchain', 'contract_address', 'token_id']);
});

Route::get('/properties/{property}', function (Property $property) {
    return $property->only([
        'id', 'name', 'slug', 'token_price', 'available_tokens', 'min_investment',
        'blockchain', 'contract_address', 'token_id', 'total_tokens', 'sold_tokens'
    ]);
});

Route::get('/blockchain-configs', function () {
    return BlockchainConfig::where('is_active', true)->get();
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    Route::get('/user/holdings', function (Request $request) {
        return $request->user()->tokenHoldings()->with('property')->get();
    });

    Route::post('/investments/{investment}/webhook', function (Request $request, \App\Models\Investment $investment) {
        // Webhook for confirming investment from external service
        $validated = $request->validate([
            'tx_hash' => 'required|string',
            'block_number' => 'required|integer',
            'status' => 'required|in:confirmed,failed',
        ]);

        if ($validated['status'] === 'confirmed') {
            app(\App\Http\Controllers\InvestmentController::class)->confirm($request, $investment);
        } else {
            $investment->update([
                'status' => 'failed',
                'failure_reason' => 'Transaction failed on blockchain',
            ]);
        }

        return response()->json(['success' => true]);
    });
});
