import { Head, Link } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import { ArrowLeftIcon, UsersIcon } from '@heroicons/react/24/outline';

interface Referral {
    id: number;
    referred_user: { id: number; name: string; email: string };
    status: string;
    registered_at: string;
    first_transaction_at: string | null;
    commissions: { commission_amount: number }[];
    total_commissions: number;
}

interface Agent {
    id: number;
    agent_code: string;
}

interface Props {
    referrals: {
        data: Referral[];
        links: any[];
    };
    agent: Agent;
}

export default function Referrals({ referrals, agent }: Props) {
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300';
            case 'pending':
                return 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300';
            default:
                return 'bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-300';
        }
    };

    return (
        <MainLayout>
            <Head title="My Referrals" />

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
                        My Referrals
                    </h1>

                    {referrals.data.length === 0 ? (
                        <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-white/5 p-12 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-dark-700 flex items-center justify-center">
                                <UsersIcon className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No referrals yet</h3>
                            <p className="text-gray-500 dark:text-gray-400">
                                Share your referral link to start earning commissions
                            </p>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-white/5 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 dark:bg-dark-700">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">User</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Registered</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">First Transaction</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total Commissions</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                                        {referrals.data.map((referral) => (
                                            <tr key={referral.id}>
                                                <td className="px-6 py-4">
                                                    <p className="font-medium text-gray-900 dark:text-white">{referral.referred_user.name}</p>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">{referral.referred_user.email}</p>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                    {new Date(referral.registered_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                    {referral.first_transaction_at
                                                        ? new Date(referral.first_transaction_at).toLocaleDateString()
                                                        : '-'
                                                    }
                                                </td>
                                                <td className="px-6 py-4 text-sm font-medium text-green-600 dark:text-green-400">
                                                    ${Number(referral.total_commissions || 0).toFixed(2)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(referral.status)}`}>
                                                        {referral.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {referrals.links && referrals.links.length > 3 && (
                                <div className="px-6 py-4 border-t border-gray-200 dark:border-white/5 flex justify-center gap-2">
                                    {referrals.links.map((link, i) => (
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
                    )}
                </div>
            </div>
        </MainLayout>
    );
}
