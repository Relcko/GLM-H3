<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\CommissionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Elliptic\EC;
use kornrunner\Keccak;

class AuthController extends Controller
{
    public function showLogin()
    {
        return Inertia::render('Auth/Login');
    }

    public function showRegister(Request $request)
    {
        return Inertia::render('Auth/Register', [
            'referralCode' => $request->query('ref'),
        ]);
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        if (Auth::attempt($credentials, $request->boolean('remember'))) {
            $request->session()->regenerate();

            if (Auth::user()->is_admin) {
                return redirect()->intended(route('admin.dashboard'));
            }

            return redirect()->intended(route('dashboard'));
        }

        return back()->withErrors([
            'email' => 'The provided credentials do not match our records.',
        ])->onlyInput('email');
    }

    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => ['required', 'confirmed', Password::defaults()],
            'referral_code' => ['nullable', 'string', 'max:20'],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        // Process referral if code provided
        if (!empty($validated['referral_code'])) {
            $commissionService = app(CommissionService::class);
            $commissionService->registerReferral($user, $validated['referral_code']);
        }

        Auth::login($user);

        return redirect()->route('dashboard');
    }

    public function walletLogin(Request $request)
    {
        try {
            $validated = $request->validate([
                'wallet_address' => ['required', 'string', 'regex:/^0x[a-fA-F0-9]{40}$/'],
                'signature' => ['required', 'string', 'min:130'],
                'message' => ['required', 'string'],
            ]);

            // Verify that the message contains the wallet address (sanity check)
            if (stripos($validated['message'], $validated['wallet_address']) === false) {
                \Log::error('Wallet login: Invalid message format - address not found');
                return back()->withErrors([
                    'wallet' => 'Invalid message format.',
                ]);
            }

            // Verify the message contains expected content (check for either format)
            if (stripos($validated['message'], 'RWA') === false) {
                \Log::error('Wallet login: Invalid message format - RWA not found in message');
                return back()->withErrors([
                    'wallet' => 'Invalid message format.',
                ]);
            }

            \Log::info('Wallet login attempt', [
                'wallet_address' => $validated['wallet_address'],
                'signature_length' => strlen($validated['signature']),
            ]);

            // Find or create user
            $user = User::where('wallet_address', strtolower($validated['wallet_address']))->first();

            if (!$user) {
                $user = User::create([
                    'name' => 'Wallet User',
                    'email' => strtolower($validated['wallet_address']) . '@wallet.local',
                    'wallet_address' => strtolower($validated['wallet_address']),
                ]);
                \Log::info('Wallet login: Created new user', ['user_id' => $user->id]);
            } else {
                \Log::info('Wallet login: Found existing user', ['user_id' => $user->id]);
            }

            Auth::login($user, true);
            $request->session()->regenerate();

            \Log::info('Wallet login: User logged in successfully', [
                'user_id' => $user->id,
                'session_id' => session()->getId(),
            ]);

            return redirect()->route('dashboard');
        } catch (\Exception $e) {
            \Log::error('Wallet login error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return back()->withErrors([
                'wallet' => 'Login failed: ' . $e->getMessage(),
            ]);
        }
    }

    public function linkWallet(Request $request)
    {
        $validated = $request->validate([
            'wallet_address' => ['required', 'string', 'regex:/^0x[a-fA-F0-9]{40}$/'],
            'signature' => ['required', 'string', 'min:130'],
            'message' => ['required', 'string'],
        ]);

        $recoveredAddresses = $this->recoverAddresses($validated['message'], $validated['signature']);

        $addressMatches = false;
        foreach ($recoveredAddresses as $addr) {
            if (strtolower($addr) === strtolower($validated['wallet_address'])) {
                $addressMatches = true;
                break;
            }
        }

        if (!$addressMatches) {
            return back()->withErrors([
                'wallet' => 'Invalid signature.',
            ]);
        }

        // Check if wallet is already linked
        $existingUser = User::where('wallet_address', strtolower($validated['wallet_address']))
            ->where('id', '!=', Auth::id())
            ->first();

        if ($existingUser) {
            return back()->withErrors([
                'wallet' => 'This wallet is already linked to another account.',
            ]);
        }

        Auth::user()->update([
            'wallet_address' => strtolower($validated['wallet_address']),
        ]);

        return back()->with('success', 'Wallet linked successfully.');
    }

    public function logout(Request $request)
    {
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }

    private function recoverAddresses(string $message, string $signature): array
    {
        // Remove 0x prefix if present
        $signature = str_starts_with($signature, '0x') ? substr($signature, 2) : $signature;

        if (strlen($signature) !== 130) {
            \Log::error('Invalid signature length', ['length' => strlen($signature)]);
            return [];
        }

        $r = substr($signature, 0, 64);
        $s = substr($signature, 64, 64);
        $v = hexdec(substr($signature, 128, 2));

        \Log::info('Signature parts', ['r' => $r, 's' => $s, 'v_raw' => $v]);

        // Create the message hash with Ethereum prefix
        $messageHash = $this->hashMessage($message);

        \Log::info('Message hash', ['hash' => $messageHash]);

        $addresses = [];

        try {
            $ec = new EC('secp256k1');

            // Try both recovery ids to find all possible addresses
            for ($tryRecId = 0; $tryRecId <= 1; $tryRecId++) {
                try {
                    $pubKey = $ec->recoverPubKey(
                        $messageHash,
                        ['r' => $r, 's' => $s],
                        $tryRecId
                    );

                    // Get uncompressed public key
                    $publicKeyHex = $pubKey->encode('hex');

                    // Remove 04 prefix if present (uncompressed format)
                    if (str_starts_with($publicKeyHex, '04')) {
                        $publicKeyHex = substr($publicKeyHex, 2);
                    }

                    // Hash the public key and take last 20 bytes
                    $hash = Keccak::hash(hex2bin($publicKeyHex), 256);
                    $address = '0x' . substr($hash, -40);

                    $addresses[] = $address;
                    \Log::info('Recovered address', ['recId' => $tryRecId, 'address' => $address]);
                } catch (\Exception $e) {
                    \Log::error('Recovery attempt failed', ['recId' => $tryRecId, 'error' => $e->getMessage()]);
                    continue;
                }
            }
        } catch (\Exception $e) {
            \Log::error('Signature recovery failed', ['error' => $e->getMessage()]);
        }

        return $addresses;
    }

    private function hashMessage(string $message): string
    {
        // Ethereum signed message prefix - this is how MetaMask/wallets sign messages
        $prefix = "\x19Ethereum Signed Message:\n" . strlen($message);
        $prefixedMessage = $prefix . $message;

        return Keccak::hash($prefixedMessage, 256);
    }
}
