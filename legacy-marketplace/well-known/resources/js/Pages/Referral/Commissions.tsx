import { Head, Link } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

interface Commission {
    id: number;
    user: { id: number; name: string };
    transaction_type: string;
    transaction_amount: number;
    commission_rate: number;
    commission_amount: number;
    currency: string;
    status: string;
    created_at: string;
}

interface Agent {
    id: number;
    agent_code: string;
    commission_rate: number;
}

interface Props {
    commissions: {
        data: Commission[];
        links: any[];
    };
    totals: {
        pending: number;
        approved: number;
        paid: number;
    };
    agent: Agent;
}

export default function Commissions({ commissions, totals, agent }: Props) {
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'paid':
                return 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300';
            case 'approved':
                return 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300';
            case 'pending':
                return 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300';
            default:
                return 'bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-300';
        }
    };

    const getTransactionTypeLabel = (type: string) => {
        switch (type) {
            case 'primary_purchase':
                return 'Primary Purchase';
            case 'secondary_buy':
                return 'Secondary Buy';
            case 'secondary_sell':
                return 'Secondary Sell';
            default:
                return type;
        }
    };

    return (
        <MainLayout>
            <Head title="My Commissions" />

            <div className="min-h-screen bg-gray-50 dark:bg-dark-950 py-8">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <Link
                        href="/referral"
                        className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
                    >
                        <ArrowLeftIcon className="w-4 h-4" />
                        Back to Dashboard
                    </Link>

                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
                        My Commissions
                    </h1>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-white/5 p-6">
                            <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
                            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                                ${Number(totals.pending).toFixed(2)}
                            </p>
                        </div>
                        <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-white/5 p-6">
                            <p className="text-sm text-gray-500 dark:text-gray-400">Approved</p>
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                ${Number(totals.approved).toFixed(2)}
                            </p>
                        </div>
                        <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-white/5 p-6">
                            <p className="text-sm text-gray-500 dark:text-gray-400">Total Paid</p>
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                ${Number(totals.paid).toFixed(2)}
                            </p>
                        </div>
                    </div>

                    {/* Commissions Table */}
                    <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-white/5 overflow-hidden">
                        {commissions.data.length === 0 ? (
                            <div className="p-12 text-center">
                                <p className="text-gray-500 dark:text-gray-400">
                                    No commissions yet. Commissions are earned when your referrals make transactions.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 dark:bg-dark-700">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                                User
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                                Type
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                                Transaction
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                                Commission
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
                                        {commissions.data.map((commission) => (
                                            <tr key={commission.id}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <p className="font-medium text-gray-900 dark:text-white">
                                                        {commission.user.name}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    {getTransactionTypeLabel(commission.transaction_type)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                    ${Number(commission.transaction_amount).toFixed(2)} {commission.currency}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <p className="font-semibold text-green-600 dark:text-green-400">
                                                        +${Number(commission.commission_amount).toFixed(2)}
                                                    </p>
                                                    <p className="text-xs text-gray-500">({commission.commission_rate}%)</p>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(commission.status)}`}>
                                                        {commission.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    {new Date(commission.created_at).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Pagination */}
                        {commissions.links && commissions.links.length > 3 && (
                            <div className="px-6 py-4 border-t border-gray-200 dark:border-white/5 flex justify-center gap-2">
                                {commissions.links.map((link, i) => (
                                    <Link
                                        key={i}
                                        href={link.url || '#'}
                                        className={`px-3 py-1 rounded text-sm ${
                                            link.active
                                                ? 'bg-blue-600 text-white'
                                                : link.url
                                                    ? 'bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300'
                                                    : 'bg-gray-50 dark:bg-dark-800 text-gray-400 cursor-not-allowed'
                                        }`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
