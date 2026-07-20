<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SettingsController extends Controller
{
    public function index()
    {
        $settings = [
            'kyc_required' => Setting::get('kyc_required', 'true') === 'true',
            'platform_trading_fee' => (float) Setting::get('platform_trading_fee', '1'),
            'default_rental_yield' => (float) Setting::get('default_rental_yield', '5'),
            'default_appreciation_rate' => (float) Setting::get('default_appreciation_rate', '3'),
            'calculator_projection_years' => (int) Setting::get('calculator_projection_years', '5'),
            'min_investment_global' => (float) Setting::get('min_investment_global', '100'),
            'max_investment_global' => (float) Setting::get('max_investment_global', '1000000'),
            'referral_commission_rate' => (float) Setting::get('referral_commission_rate', '5'),
            'agent_commission_rate' => (float) Setting::get('agent_commission_rate', '3'),
        ];

        return Inertia::render('Admin/Settings/Index', [
            'settings' => $settings,
        ]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'kyc_required' => ['sometimes', 'boolean'],
            'platform_trading_fee' => ['sometimes', 'numeric', 'min:0', 'max:100'],
            'default_rental_yield' => ['sometimes', 'numeric', 'min:0', 'max:100'],
            'default_appreciation_rate' => ['sometimes', 'numeric', 'min:0', 'max:100'],
            'calculator_projection_years' => ['sometimes', 'integer', 'min:1', 'max:30'],
            'min_investment_global' => ['sometimes', 'numeric', 'min:0'],
            'max_investment_global' => ['sometimes', 'numeric', 'min:0'],
            'referral_commission_rate' => ['sometimes', 'numeric', 'min:0', 'max:100'],
            'agent_commission_rate' => ['sometimes', 'numeric', 'min:0', 'max:100'],
        ]);

        foreach ($validated as $key => $value) {
            if ($key === 'kyc_required') {
                Setting::set($key, $value ? 'true' : 'false');
            } else {
                Setting::set($key, (string) $value);
            }
        }

        return back()->with('success', 'Settings updated successfully.');
    }
}
