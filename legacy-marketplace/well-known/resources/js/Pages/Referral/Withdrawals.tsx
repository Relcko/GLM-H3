import { Head, Link, useForm } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

interface Withdrawal {
    id: number;
    amount: number;
    currency: string;
    wallet_address: string;
    blockchain: string;
    tx_hash: string | null;
    status: string;
    created_at: string;
}

interface Agent {
    id: number;
    agent_code: string;
}

interface Props {
    withdrawals: {
        data: Withdrawal[];
        links: any[];
    };
    agent: Agent;
    availableBalance: number;
}

export default function Withdrawals({ withdrawals, agent, availableBalance }: Props) {
    const [showForm, setShowForm] = useState(false);

    const form = useForm({
        amount: '',
        wallet_address: '',
        blockchain: 'ethereum',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/referral/withdrawals', {
            onSuccess: () => {
                setShowForm(false);
                form.reset();
            },
        });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300';
            case 'processing':
                return 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300';
            case 'pending':
                return 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300';
            case 'failed':
                return 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300';
            default:
                return 'bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-300';
        }
    };

    return (
        <MainLayout>
            <Head title="Withdrawals" />

            <div className="min-h-screen bg-gray-50 dark:bg-dark-950 py-8">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <Link
                        href="/referral"
                        className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
                    >
                        <ArrowLeftIcon className="w-4 h-4" />
                        Back to Dashboard
                    </Link>

                    <div className="flex items-center justify-between mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                            Withdrawals
                        </h1>
                        {!showForm && availableBalance > 0 && (
                            <button
                                onClick={() => setShowForm(true)}
                                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"
                            >
                                Request Withdrawal
                            </button>
                        )}
                    </div>

                    {/* Available Balance */}
                    <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-6 mb-8 text-white">
                        <p className="text-green-100">Available Balance</p>
                        <p className="text-4xl font-bold">${Number(availableBalance).toFixed(2)}</p>
                    </div>

                    {/* Withdrawal Form */}
                    {showForm && (
                        <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-white/5 p-6 mb-8">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                Request Withdrawal
                            </h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Amount
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="10"
                                        max={availableBalance}
                                        value={form.data.amount}
                                        onChange={(e) => form.setData('amount', e.target.value)}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-white/10 rounded-xl"
                                        required
                                    />
                                    {form.errors.amount && (
                                        <p className="mt-1 text-sm text-red-500">{form.errors.amount}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Wallet Address
                                    </label>
                                    <input
                                        type="text"
                                        value={form.data.wallet_address}
                                        onChange={(e) => form.setData('wallet_address', e.target.value)}
                                        placeholder="0x..."
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-white/10 rounded-xl"
                                        required
                                    />
                                    {form.errors.wallet_address && (
                                        <p className="mt-1 text-sm text-red-500">{form.errors.wallet_address}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Blockchain
                                    </label>
                                    <select
                                        value={form.data.blockchain}
                                        onChange={(e) => form.setData('blockchain', e.target.value)}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-white/10 rounded-xl"
                                    >
                                        <option value="ethereum">Ethereum</option>
                                        <option value="bsc">BSC</option>
                                    </select>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowForm(false)}
                                        className="flex-1 py-2 bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={form.processing}
                                        className="flex-1 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {form.processing ? 'Submitting...' : 'Submit Request'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Withdrawals List */}
                    <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-white/5 overflow-hidden">
                        {withdrawals.data.length === 0 ? (
                            <div className="p-12 text-center">
                                <p className="text-gray-500 dark:text-gray-400">
                                    No withdrawal history yet.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 dark:bg-dark-700">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                                Amount
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                                Wallet
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                                Network
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                                Status
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                                Date
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                                        {withdrawals.data.map((withdrawal) => (
                                            <tr key={withdrawal.id}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <p className="font-semibold text-gray-900 dark:text-white">
                                                        ${Number(withdrawal.amount).toFixed(2)}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="font-mono text-sm text-gray-600 dark:text-gray-400 truncate max-w-[150px]">
                                                        {withdrawal.wallet_address}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 capitalize">
                                                    {withdrawal.blockchain}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(withdrawal.status)}`}>
                                                        {withdrawal.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    {new Date(withdrawal.created_at).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
