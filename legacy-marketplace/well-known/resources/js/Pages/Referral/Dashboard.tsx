import { Head, Link } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import {
    UsersIcon,
    CurrencyDollarIcon,
    ClipboardDocumentIcon,
    ArrowTrendingUpIcon,
    CheckCircleIcon,
    ClockIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';

interface Agent {
    id: number;
    agent_code: string;
    commission_rate: number;
    total_earnings: number;
    pending_earnings: number;
    available_balance: number;
    status: string;
}

interface Referral {
    id: number;
    referred_user: { id: number; name: string; email: string };
    status: string;
    registered_at: string;
    first_transaction_at: string | null;
}

interface Commission {
    id: number;
    user: { id: number; name: string };
    transaction_type: string;
    transaction_amount: number;
    commission_amount: number;
    currency: string;
    status: string;
    created_at: string;
}

interface Stats {
    total_referrals: number;
    active_referrals: number;
    pending_commissions: number;
    approved_commissions: number;
    paid_commissions: number;
    total_earnings: number;
    available_balance: number;
}

interface Props {
    agent: Agent;
    stats: Stats;
    recentReferrals: Referral[];
    recentCommissions: Commission[];
}

export default function ReferralDashboard({ agent, stats, recentReferrals, recentCommissions }: Props) {
    const [copied, setCopied] = useState(false);

    const referralLink = `${window.location.origin}/register?ref=${agent.agent_code}`;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <MainLayout>
            <Head title="Referral Dashboard" />

            <div className="min-h-screen bg-gray-50 dark:bg-dark-950 py-8">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                            Referral Dashboard
                        </h1>
                        <p className="mt-2 text-gray-600 dark:text-gray-400">
                            Manage your referrals and track your commissions
                        </p>
                    </div>

                    {/* Referral Link */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 mb-8 text-white">
                        <h2 className="text-lg font-semibold mb-2">Your Referral Link</h2>
                        <div className="flex items-center gap-3">
                            <div className="flex-1 bg-white/10 rounded-xl px-4 py-3 font-mono text-sm truncate">
                                {referralLink}
                            </div>
                            <button
                                onClick={copyToClipboard}
                                className="flex items-center gap-2 px-4 py-3 bg-white text-blue-600 rounded-xl font-medium hover:bg-white/90 transition-colors"
                            >
                                <ClipboardDocumentIcon className="w-5 h-5" />
                                {copied ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                        <p className="mt-3 text-blue-100 text-sm">
                            Agent Code: <strong>{agent.agent_code}</strong> | Commission Rate: <strong>{agent.commission_rate}%</strong>
                        </p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-white/5 p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                                    <UsersIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Referrals</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {stats.total_referrals}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-white/5 p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
                                    <CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Active Referrals</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {stats.active_referrals}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-white/5 p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-yellow-100 dark:bg-yellow-500/20 flex items-center justify-center">
                                    <ClockIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Pending Commissions</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                        ${Number(stats.pending_commissions).toFixed(2)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-white/5 p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                                    <CurrencyDollarIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Earnings</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                        ${Number(stats.total_earnings).toFixed(2)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <Link
                            href="/referral/referrals"
                            className="flex items-center gap-4 p-4 bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-white/5 hover:border-blue-500 transition-colors"
                        >
                            <UsersIcon className="w-6 h-6 text-gray-400" />
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">View All Referrals</p>
                                <p className="text-sm text-gray-500">{stats.total_referrals} total</p>
                            </div>
                        </Link>
                        <Link
                            href="/referral/commissions"
                            className="flex items-center gap-4 p-4 bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-white/5 hover:border-blue-500 transition-colors"
                        >
                            <CurrencyDollarIcon className="w-6 h-6 text-gray-400" />
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">View Commissions</p>
                                <p className="text-sm text-gray-500">${Number(stats.paid_commissions).toFixed(2)} earned</p>
                            </div>
                        </Link>
                        <Link
                            href="/referral/withdrawals"
                            className="flex items-center gap-4 p-4 bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-white/5 hover:border-blue-500 transition-colors"
                        >
                            <ArrowTrendingUpIcon className="w-6 h-6 text-gray-400" />
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">Withdrawals</p>
                                <p className="text-sm text-gray-500">${Number(stats.available_balance).toFixed(2)} available</p>
                            </div>
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Recent Referrals */}
                        <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-white/5 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Referrals</h2>
                                <Link href="/referral/referrals" className="text-sm text-blue-600 hover:underline">
                                    View all
                                </Link>
                            </div>
                            {recentReferrals.length === 0 ? (
                                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                                    No referrals yet. Share your link to start earning!
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {recentReferrals.map((referral) => (
                                        <div key={referral.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-700 rounded-xl">
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">
                                                    {referral.referred_user.name}
                                                </p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    {new Date(referral.registered_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                referral.status === 'active'
                                                    ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300'
                                                    : 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300'
                                            }`}>
                                                {referral.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Recent Commissions */}
                        <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-white/5 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Commissions</h2>
                                <Link href="/referral/commissions" className="text-sm text-blue-600 hover:underline">
                                    View all
                                </Link>
                            </div>
                            {recentCommissions.length === 0 ? (
                                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                                    No commissions yet. Commissions are earned when your referrals make transactions.
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {recentCommissions.map((commission) => (
                                        <div key={commission.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-700 rounded-xl">
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">
                                                    {commission.user.name}
                                                </p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    {commission.transaction_type.replace('_', ' ')}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-semibold text-green-600 dark:text-green-400">
                                                    +${Number(commission.commission_amount).toFixed(2)}
                                                </p>
                                                <span className={`text-xs ${
                                                    commission.status === 'paid' ? 'text-green-600' :
                                                    commission.status === 'approved' ? 'text-blue-600' :
                                                    'text-yellow-600'
                                                }`}>
                                                    {commission.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
