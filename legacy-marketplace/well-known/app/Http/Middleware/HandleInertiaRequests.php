<?php

namespace App\Http\Middleware;

use App\Models\BlockchainConfig;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user() ? [
                    'id' => $request->user()->id,
                    'name' => $request->user()->name,
                    'email' => $request->user()->email,
                    'wallet_address' => $request->user()->wallet_address,
                    'is_admin' => $request->user()->is_admin,
                    'avatar' => $request->user()->avatar,
                ] : null,
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
            'blockchainConfigs' => fn () => BlockchainConfig::where('is_active', true)->get(),
        ];
    }
}
