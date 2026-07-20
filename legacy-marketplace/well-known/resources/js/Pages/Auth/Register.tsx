import { Head, Link, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { useAppKit } from '@reown/appkit/react';
import { useAccount, useSignMessage } from 'wagmi';
import {
    WalletIcon,
    EnvelopeIcon,
    LockClosedIcon,
    UserIcon,
    ArrowRightIcon,
    CheckIcon,
} from '@heroicons/react/24/outline';

const benefits = [
    'Access to premium tokenized properties',
    'Fractional ownership starting at $100',
    'Automated dividend distributions',
    'Secure blockchain-verified ownership',
];

interface Props {
    referralCode?: string;
}

export default function Register({ referralCode }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        referral_code: referralCode || '',
    });

    const { address, isConnected } = useAccount();
    const { signMessageAsync } = useSignMessage();
    const { open } = useAppKit();

    const shortenAddress = (addr: string) => {
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        post('/register');
    };

    const handleWalletLogin = async () => {
        if (!address) return;

        try {
            const message = `Sign this message to authenticate with RWAPlatform.\n\nWallet: ${address}\nTimestamp: ${Date.now()}`;
            const signature = await signMessageAsync({ message });

            const form = document.createElement('form');
            form.method = 'POST';
            form.action = '/wallet-login';

            const csrfInput = document.createElement('input');
            csrfInput.type = 'hidden';
            csrfInput.name = '_token';
            csrfInput.value = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
            form.appendChild(csrfInput);

            const addressInput = document.createElement('input');
            addressInput.type = 'hidden';
            addressInput.name = 'wallet_address';
            addressInput.value = address;
            form.appendChild(addressInput);

            const signatureInput = document.createElement('input');
            signatureInput.type = 'hidden';
            signatureInput.name = 'signature';
            signatureInput.value = signature;
            form.appendChild(signatureInput);

            const messageInput = document.createElement('input');
            messageInput.type = 'hidden';
            messageInput.name = 'message';
            messageInput.value = message;
            form.appendChild(messageInput);

            document.body.appendChild(form);
            form.submit();
        } catch (error) {
            console.error('Wallet login failed:', error);
        }
    };

    return (
        <MainLayout>
            <Head title="Register" />

            <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="w-full max-w-5xl">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        {/* Left side - Benefits */}
                        <div className="hidden lg:block">
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                                Free Forever
                            </p>
                            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                                Start your real estate investment journey
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400 text-lg mb-8">
                                Join thousands of investors who are building wealth through tokenized real estate on the blockchain.
                            </p>

                            <ul className="space-y-4">
                                {benefits.map((benefit, index) => (
                                    <li key={index} className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                                            <CheckIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <span className="text-gray-700 dark:text-gray-300">{benefit}</span>
                                    </li>
                                ))}
                            </ul>

                            <div className="mt-12 bg-white dark:bg-white/[0.03] rounded-2xl p-6 border border-gray-200 dark:border-white/5">
                                <div className="flex items-center gap-4">
                                    <div className="flex -space-x-3">
                                        {['AC', 'BJ', 'CK', 'DL'].map((initials, i) => (
                                            <div
                                                key={i}
                                                className="w-10 h-10 rounded-full bg-gray-900 dark:bg-white border-2 border-white dark:border-dark-950 flex items-center justify-center text-white dark:text-gray-900 text-sm font-medium"
                                            >
                                                {initials}
                                            </div>
                                        ))}
                                    </div>
                                    <div>
                                        <div className="text-gray-900 dark:text-white font-medium">Join 1,000+ investors</div>
                                        <div className="text-gray-500 text-sm">Already building wealth</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right side - Form */}
                        <div className="space-y-6">
                            {/* Header */}
                            <div className="text-center lg:text-left">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create your account</h2>
                                <p className="mt-2 text-gray-600 dark:text-gray-400">
                                    Start investing in tokenized real estate
                                </p>
                            </div>

                            {/* Wallet Connect Card */}
                            <div className="bg-white dark:bg-white/[0.03] rounded-2xl p-6 border border-gray-200 dark:border-white/5 shadow-xl">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                                        <WalletIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-gray-900 dark:text-white">Quick Sign Up</h3>
                                        <p className="text-xs text-gray-500">Connect wallet to get started instantly</p>
                                    </div>
                                </div>

                                {isConnected && address ? (
                                    <>
                                        <button
                                            onClick={() => open()}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/10 transition-all text-gray-900 dark:text-white font-medium"
                                        >
                                            <WalletIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                            <span>{shortenAddress(address)}</span>
                                        </button>
                                        <button
                                            onClick={handleWalletLogin}
                                            className="mt-4 w-full py-3 px-4 rounded-xl bg-gray-900 text-white font-semibold flex items-center justify-center gap-2 hover:bg-gray-800 transition-all"
                                        >
                                            <span>Continue with Wallet</span>
                                            <ArrowRightIcon className="w-4 h-4" />
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => open()}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gray-900 text-white font-semibold hover:bg-gray-800 transition-all"
                                    >
                                        <WalletIcon className="w-4 h-4" />
                                        <span>Connect Wallet</span>
                                    </button>
                                )}
                            </div>

                            {/* Divider */}
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-200 dark:border-white/10" />
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-4 text-gray-500 bg-white dark:bg-dark-950">Or register with email</span>
                                </div>
                            </div>

                            {/* Email Registration Form */}
                            <form className="bg-white dark:bg-white/[0.03] rounded-2xl p-6 border border-gray-200 dark:border-white/5 shadow-xl" onSubmit={handleSubmit}>
                                <div className="space-y-4">
                                    <div>
                                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Full name
                                        </label>
                                        <div className="relative">
                                            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <input
                                                id="name"
                                                name="name"
                                                type="text"
                                                autoComplete="name"
                                                required
                                                value={data.name}
                                                onChange={(e) => setData('name', e.target.value)}
                                                placeholder="John Doe"
                                                className="w-full rounded-xl py-3 pl-12 pr-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-gray-900/20 dark:focus:ring-white/20 focus:border-gray-900/50 dark:focus:border-white/30 transition-all"
                                            />
                                        </div>
                                        {errors.name && (
                                            <p className="mt-2 text-sm text-red-500">{errors.name}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Email address
                                        </label>
                                        <div className="relative">
                                            <EnvelopeIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <input
                                                id="email"
                                                name="email"
                                                type="email"
                                                autoComplete="email"
                                                required
                                                value={data.email}
                                                onChange={(e) => setData('email', e.target.value)}
                                                placeholder="you@example.com"
                                                className="w-full rounded-xl py-3 pl-12 pr-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-gray-900/20 dark:focus:ring-white/20 focus:border-gray-900/50 dark:focus:border-white/30 transition-all"
                                            />
                                        </div>
                                        {errors.email && (
                                            <p className="mt-2 text-sm text-red-500">{errors.email}</p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Password
                                            </label>
                                            <div className="relative">
                                                <LockClosedIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                <input
                                                    id="password"
                                                    name="password"
                                                    type="password"
                                                    autoComplete="new-password"
                                                    required
                                                    value={data.password}
                                                    onChange={(e) => setData('password', e.target.value)}
                                                    placeholder="Create password"
                                                    className="w-full rounded-xl py-3 pl-12 pr-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-gray-900/20 dark:focus:ring-white/20 focus:border-gray-900/50 dark:focus:border-white/30 transition-all"
                                                />
                                            </div>
                                            {errors.password && (
                                                <p className="mt-2 text-sm text-red-500">{errors.password}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label htmlFor="password_confirmation" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Confirm
                                            </label>
                                            <div className="relative">
                                                <LockClosedIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                <input
                                                    id="password_confirmation"
                                                    name="password_confirmation"
                                                    type="password"
                                                    autoComplete="new-password"
                                                    required
                                                    value={data.password_confirmation}
                                                    onChange={(e) => setData('password_confirmation', e.target.value)}
                                                    placeholder="Confirm password"
                                                    className="w-full rounded-xl py-3 pl-12 pr-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-gray-900/20 dark:focus:ring-white/20 focus:border-gray-900/50 dark:focus:border-white/30 transition-all"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Referral Code */}
                                    {data.referral_code && (
                                        <div className="p-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl">
                                            <p className="text-sm text-blue-800 dark:text-blue-300">
                                                Referral code: <span className="font-mono font-medium">{data.referral_code}</span>
                                            </p>
                                        </div>
                                    )}
                                    <input type="hidden" name="referral_code" value={data.referral_code} />
                                </div>

                                <p className="mt-4 text-xs text-gray-500">
                                    By signing up, you agree to our{' '}
                                    <Link href="#" className="text-gray-900 dark:text-white hover:underline">Terms of Service</Link>
                                    {' '}and{' '}
                                    <Link href="#" className="text-gray-900 dark:text-white hover:underline">Privacy Policy</Link>.
                                </p>

                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="mt-6 w-full py-3 px-4 rounded-xl bg-gray-900 text-white font-semibold flex items-center justify-center gap-2 hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {processing ? (
                                        <>
                                            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            <span>Creating account...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Create account</span>
                                            <ArrowRightIcon className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </form>

                            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                                Already have an account?{' '}
                                <Link href="/login" className="font-medium text-gray-900 dark:text-white hover:underline">
                                    Sign in
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
