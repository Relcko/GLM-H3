import { Head, useForm, Link } from '@inertiajs/react';
import { FormEvent } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { User } from '@/Types';
import {
    UserIcon,
    EnvelopeIcon,
    PhoneIcon,
    WalletIcon,
    ShieldCheckIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    Cog6ToothIcon,
    PencilIcon,
} from '@heroicons/react/24/outline';

interface KycVerification {
    id: number;
    status: 'pending' | 'approved' | 'rejected';
    document_type: string;
    submitted_at: string;
    verified_at: string | null;
    rejection_reason: string | null;
}

interface SettingsProps {
    user: User & {
        phone?: string;
        bio?: string;
        kyc_verification?: KycVerification;
        kycVerification?: KycVerification;
    };
}

export default function Settings({ user }: SettingsProps) {
    const { data, setData, put, processing, errors, recentlySuccessful } = useForm({
        name: user.name || '',
        phone: user.phone || '',
        bio: user.bio || '',
    });

    // Handle both snake_case and camelCase from Laravel
    const kycVerification = user.kyc_verification || user.kycVerification;

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        put('/dashboard/settings');
    };

    const shortenAddress = (addr: string) => {
        if (!addr) return '';
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    return (
        <MainLayout>
            <Head title="Settings" />

            {/* Header */}
            <section className="relative py-8 overflow-hidden bg-gray-50 dark:bg-transparent border-b border-gray-200 dark:border-white/5">
                <div className="absolute inset-0 bg-gradient-to-b from-blue-50 dark:from-blue-950/30 to-transparent" />

                <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center">
                            <Cog6ToothIcon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Manage your account settings</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="py-8">
                <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 space-y-8">
                    {/* Success Message */}
                    {recentlySuccessful && (
                        <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-xl p-4 border border-emerald-200 dark:border-emerald-500/20">
                            <div className="flex items-center">
                                <CheckCircleIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mr-3" />
                                <p className="text-sm text-emerald-700 dark:text-emerald-400">Settings saved successfully.</p>
                            </div>
                        </div>
                    )}

                    {/* Profile Section */}
                    <div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/5 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                                    <UserIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Profile Information</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Update your account details</p>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Full Name
                                </label>
                                <div className="relative">
                                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        id="name"
                                        type="text"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        className="w-full rounded-xl py-3 pl-12 pr-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-gray-900/20 dark:focus:ring-white/20 focus:border-gray-400 dark:focus:border-white/30 transition-all"
                                        placeholder="Your full name"
                                    />
                                </div>
                                {errors.name && (
                                    <p className="mt-2 text-sm text-red-500">{errors.name}</p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <EnvelopeIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        id="email"
                                        type="email"
                                        value={user.email}
                                        disabled
                                        className="w-full rounded-xl py-3 pl-12 pr-4 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                                    />
                                </div>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">Email cannot be changed</p>
                            </div>

                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Phone Number
                                </label>
                                <div className="relative">
                                    <PhoneIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        id="phone"
                                        type="tel"
                                        value={data.phone}
                                        onChange={(e) => setData('phone', e.target.value)}
                                        className="w-full rounded-xl py-3 pl-12 pr-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-gray-900/20 dark:focus:ring-white/20 focus:border-gray-400 dark:focus:border-white/30 transition-all"
                                        placeholder="+1 (555) 000-0000"
                                    />
                                </div>
                                {errors.phone && (
                                    <p className="mt-2 text-sm text-red-500">{errors.phone}</p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Bio
                                </label>
                                <textarea
                                    id="bio"
                                    value={data.bio}
                                    onChange={(e) => setData('bio', e.target.value)}
                                    rows={3}
                                    className="w-full rounded-xl py-3 px-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-gray-900/20 dark:focus:ring-white/20 focus:border-gray-400 dark:focus:border-white/30 transition-all resize-none"
                                    placeholder="Tell us about yourself..."
                                />
                                {errors.bio && (
                                    <p className="mt-2 text-sm text-red-500">{errors.bio}</p>
                                )}
                            </div>

                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-900 text-white font-semibold hover:bg-gray-800 transition-all disabled:opacity-50"
                                >
                                    {processing ? (
                                        <>
                                            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            <span>Saving...</span>
                                        </>
                                    ) : (
                                        <>
                                            <PencilIcon className="w-4 h-4" />
                                            <span>Save Changes</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Wallet Section */}
                    <div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/5 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
                                    <WalletIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Wallet Connection</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Your connected blockchain wallet</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6">
                            {user.wallet_address ? (
                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                                            <WalletIcon className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <p className="font-mono text-sm text-gray-900 dark:text-white">{shortenAddress(user.wallet_address)}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Connected wallet</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                                            <CheckCircleIcon className="w-3 h-3" />
                                            Connected
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-6">
                                    <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-3">
                                        <WalletIcon className="w-6 h-6 text-gray-400" />
                                    </div>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm">No wallet connected</p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Connect a wallet from the navbar to enable blockchain features</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* KYC Section */}
                    <div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/5 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                                    <ShieldCheckIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Identity Verification (KYC)</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Verify your identity for full platform access</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6">
                            {kycVerification ? (
                                <div className={`p-4 rounded-xl border ${
                                    kycVerification.status === 'approved'
                                        ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20'
                                        : kycVerification.status === 'submitted' || kycVerification.status === 'pending'
                                        ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20'
                                        : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20'
                                }`}>
                                    <div className="flex items-center gap-3">
                                        {kycVerification.status === 'approved' ? (
                                            <CheckCircleIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                                        ) : kycVerification.status === 'submitted' || kycVerification.status === 'pending' ? (
                                            <ExclamationTriangleIcon className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                                        ) : (
                                            <ExclamationTriangleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
                                        )}
                                        <div>
                                            <p className={`font-medium ${
                                                kycVerification.status === 'approved'
                                                    ? 'text-emerald-700 dark:text-emerald-400'
                                                    : kycVerification.status === 'submitted' || kycVerification.status === 'pending'
                                                    ? 'text-amber-700 dark:text-amber-400'
                                                    : 'text-red-700 dark:text-red-400'
                                            }`}>
                                                {kycVerification.status === 'approved'
                                                    ? 'Identity Verified'
                                                    : kycVerification.status === 'submitted' || kycVerification.status === 'pending'
                                                    ? 'Verification Pending'
                                                    : 'Verification Rejected'}
                                            </p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                {kycVerification.status === 'approved'
                                                    ? 'Your identity has been verified. You have full access to all features.'
                                                    : kycVerification.status === 'submitted' || kycVerification.status === 'pending'
                                                    ? 'Your documents are being reviewed. This usually takes 1-2 business days.'
                                                    : kycVerification.rejection_reason || 'Please resubmit your documents.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-6">
                                    <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-3">
                                        <ShieldCheckIcon className="w-6 h-6 text-gray-400" />
                                    </div>
                                    <p className="text-gray-900 dark:text-white font-medium mb-1">Not Verified</p>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Complete KYC verification to unlock all platform features</p>
                                    <Link
                                        href="/kyc"
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-all text-sm font-medium"
                                    >
                                        Start Verification
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Account Info */}
                    <div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/5 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-white/5">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Account Information</h2>
                        </div>
                        <div className="p-6">
                            <dl className="space-y-4">
                                <div className="flex justify-between py-3 border-b border-gray-100 dark:border-white/5">
                                    <dt className="text-gray-500 dark:text-gray-400">Account ID</dt>
                                    <dd className="font-mono text-sm text-gray-900 dark:text-white">#{user.id}</dd>
                                </div>
                                <div className="flex justify-between py-3 border-b border-gray-100 dark:border-white/5">
                                    <dt className="text-gray-500 dark:text-gray-400">Member Since</dt>
                                    <dd className="text-gray-900 dark:text-white">
                                        {new Date(user.created_at).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                        })}
                                    </dd>
                                </div>
                                <div className="flex justify-between py-3">
                                    <dt className="text-gray-500 dark:text-gray-400">Email Verified</dt>
                                    <dd>
                                        {user.email_verified_at ? (
                                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-sm">
                                                <CheckCircleIcon className="w-4 h-4" />
                                                Verified
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 text-sm">
                                                <ExclamationTriangleIcon className="w-4 h-4" />
                                                Not verified
                                            </span>
                                        )}
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    </div>
                </div>
            </section>
        </MainLayout>
    );
}
