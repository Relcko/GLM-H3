import { Head, Link } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import { ArrowsRightLeftIcon } from '@heroicons/react/24/outline';

interface Trade {
    id: number;
    seller: { id: number; name: string };
    buyer: { id: number; name: string };
    property: { id: number; name: string; slug: string };
    tokens_traded: number;
    total_amount: number;
    currency: string;
    status: string;
    created_at: string;
}

interface Props {
    trades: {
        data: Trade[];
        links: any[];
    };
}

export default function DashboardTrades({ trades }: Props) {
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300';
            case 'pending':
            case 'processing':
                return 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300';
            case 'failed':
                return 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300';
            default:
                return 'bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-300';
        }
    };

    return (
        <MainLayout>
            <Head title="My Trades" />

            <div className="min-h-screen bg-gray-50 dark:bg-dark-950 py-8">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Trades</h1>
                        <p className="text-gray-600 dark:text-gray-400">Your trading history</p>
                    </div>

                    {trades.data.length === 0 ? (
                        <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-white/5 p-12 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-dark-700 flex items-center justify-center">
                                <ArrowsRightLeftIcon className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No trades yet</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-6">
                                Buy or sell tokens on the marketplace to see your trades here
                            </p>
                            <Link
                                href="/marketplace"
                                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"
                            >
                                Browse Marketplace
                            </Link>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-white/5 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 dark:bg-dark-700">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ID</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Property</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Role</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tokens</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                                        {trades.data.map((trade) => {
                                            const currentUserId = (window as any).__INERTIA__?.props?.auth?.user?.id;
                                            const isSeller = trade.seller.id === currentUserId;
                                            return (
                                                <tr key={trade.id}>
                                                    <td className="px-6 py-4">
                                                        <Link href={`/marketplace/trade/${trade.id}`} className="text-blue-600 hover:underline">
                                                            #{trade.id}
                                                        </Link>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <Link href={`/properties/${trade.property.slug}`} className="text-blue-600 hover:underline">
                                                            {trade.property.name}
                                                        </Link>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                            isSeller
                                                                ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300'
                                                                : 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300'
                                                        }`}>
                                                            {isSeller ? 'Seller' : 'Buyer'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                                                        {Number(trade.tokens_traded).toLocaleString()}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                                                        ${Number(trade.total_amount).toFixed(2)}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(trade.status)}`}>
                                                            {trade.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                        {new Date(trade.created_at).toLocaleDateString()}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </MainLayout>
    );
}
