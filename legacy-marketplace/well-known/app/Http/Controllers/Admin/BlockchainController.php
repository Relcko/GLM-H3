<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\BlockchainConfig;
use App\Models\Setting;
use Illuminate\Http\Request;
use Inertia\Inertia;

class BlockchainController extends Controller
{
    public function index()
    {
        $configs = BlockchainConfig::all();

        return Inertia::render('Admin/Blockchain/Index', [
            'configs' => $configs,
            'settings' => [
                'kyc_required' => Setting::isKycRequired(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'chain_id' => ['required', 'string', 'unique:blockchain_configs'],
            'name' => ['required', 'string', 'max:100'],
            'symbol' => ['required', 'string', 'max:10'],
            'rpc_url' => ['required', 'url'],
            'explorer_url' => ['required', 'url'],
            'contract_address' => ['nullable', 'string', 'regex:/^0x[a-fA-F0-9]{40}$/'],
            'payment_token_address' => ['nullable', 'string', 'regex:/^0x[a-fA-F0-9]{40}$/'],
            'payment_token_symbol' => ['required', 'string', 'max:10'],
            'payment_token_decimals' => ['required', 'integer', 'min:0', 'max:18'],
            'is_active' => ['boolean'],
            'is_testnet' => ['boolean'],
        ]);

        BlockchainConfig::create($validated);

        return back()->with('success', 'Blockchain configuration added.');
    }

    public function update(Request $request, BlockchainConfig $config)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'symbol' => ['required', 'string', 'max:10'],
            'rpc_url' => ['required', 'url'],
            'explorer_url' => ['required', 'url'],
            'contract_address' => ['nullable', 'string', 'regex:/^0x[a-fA-F0-9]{40}$/'],
            'payment_token_address' => ['nullable', 'string', 'regex:/^0x[a-fA-F0-9]{40}$/'],
            'payment_token_symbol' => ['required', 'string', 'max:10'],
            'payment_token_decimals' => ['required', 'integer', 'min:0', 'max:18'],
            'is_active' => ['boolean'],
            'is_testnet' => ['boolean'],
        ]);

        $config->update($validated);

        return back()->with('success', 'Blockchain configuration updated.');
    }

    public function destroy(BlockchainConfig $config)
    {
        $config->delete();

        return back()->with('success', 'Blockchain configuration deleted.');
    }
}
