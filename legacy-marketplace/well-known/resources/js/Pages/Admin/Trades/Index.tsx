import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';

interface Trade {
    id: number;
    seller: { id: number; name: string };
    buyer: { id: number; name: string };
    property: { id: number; name: string; slug: string };
    tokens_traded: number;
    price_per_token: number;
    total_amount: number;
    platform_fee: number;
    currency: string;
    status: string;
    created_at: string;
}

interface Props {
    trades: {
        data: Trade[];
        links: any[];
    };
    stats: {
        total_volume: number;
        total_fees: number;
        pending: number;
        completed: number;
    };
    filters: {
        status?: string;
    };
}

export default function TradesIndex({ trades, stats, filters }: Props) {
    const handleStatusFilter = (status: string) => {
        router.get('/admin/trades', { status: status || undefined }, { preserveState: true });
    };

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
        <AdminLayout>
            <Head title="Manage Trades" />

            <div className="p-6">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Trades</h1>
                        <p className="text-gray-600 dark:text-gray-400">Manage secondary market trades</p>
                    </div>
                    <Link
                        href="/admin/trades/listings"
                        className="px-4 py-2 bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-600"
                    >
                        View Listings
                    </Link>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-white/5 p-6">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total Volume</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">${Number(stats.total_volume).toFixed(2)}</p>
                    </div>
                    <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-white/5 p-6">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Platform Fees</p>
                        <p className="text-2xl font-bold text-green-600">${Number(stats.total_fees).toFixed(2)}</p>
                    </div>
                    <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-white/5 p-6">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
                        <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                    </div>
                    <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-white/5 p-6">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.completed}</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex gap-4 mb-6">
                    <select
                        value={filters.status || ''}
                        onChange={(e) => handleStatusFilter(e.target.value)}
                        className="px-4 py-2 bg-white dark:bg-dark-800 border border-gray-200 dark:border-white/10 rounded-lg"
                    >
                        <option value="">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="completed">Completed</option>
                        <option value="failed">Failed</option>
                    </select>
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-white/5 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-dark-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Property</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Seller</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Buyer</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Fee</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                                {trades.data.map((trade) => (
                                    <tr key={trade.id}>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                                            #{trade.id}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Link href={`/properties/${trade.property.slug}`} className="text-blue-600 hover:underline text-sm">
                                                {trade.property.name}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                                            {trade.seller.name}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                                            {trade.buyer.name}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                                            ${Number(trade.total_amount).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-green-600">
                                            ${Number(trade.platform_fee).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(trade.status)}`}>
                                                {trade.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Link
                                                href={`/admin/trades/${trade.id}`}
                                                className="text-blue-600 hover:underline text-sm"
                                            >
                                                View
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {trades.links && trades.links.length > 3 && (
                        <div className="px-6 py-4 border-t border-gray-200 dark:border-white/5 flex justify-center gap-2">
                            {trades.links.map((link, i) => (
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
        </AdminLayout>
    );
}
