import { Head, Link } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import {
    ArrowLeftIcon,
    CheckCircleIcon,
    ClockIcon,
    XCircleIcon,
    ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline';

interface Trade {
    id: number;
    seller: { id: number; name: string };
    buyer: { id: number; name: string };
    property: { id: number; name: string; slug: string };
    listing: { id: number };
    tokens_traded: number;
    price_per_token: number;
    total_amount: number;
    platform_fee: number;
    seller_receives: number;
    currency: string;
    tx_hash: string | null;
    blockchain: string | null;
    status: string;
    failure_reason: string | null;
    completed_at: string | null;
    created_at: string;
}

interface Props {
    trade: Trade;
    isSeller: boolean;
    isBuyer: boolean;
}

export default function TradePage({ trade, isSeller, isBuyer }: Props) {
    const getStatusBadge = () => {
        switch (trade.status) {
            case 'completed':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300 rounded-full text-sm font-medium">
                        <CheckCircleIcon className="w-4 h-4" />
                        Completed
                    </span>
                );
            case 'pending':
            case 'processing':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 rounded-full text-sm font-medium">
                        <ClockIcon className="w-4 h-4" />
                        {trade.status === 'pending' ? 'Pending' : 'Processing'}
                    </span>
                );
            case 'failed':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 rounded-full text-sm font-medium">
                        <XCircleIcon className="w-4 h-4" />
                        Failed
                    </span>
                );
            default:
                return (
                    <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm font-medium">
                        {trade.status}
                    </span>
                );
        }
    };

    return (
        <MainLayout>
            <Head title={`Trade #${trade.id}`} />

            <div className="min-h-screen bg-gray-50 dark:bg-dark-950 py-8">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
                    <Link
                        href="/dashboard/trades"
                        className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
                    >
                        <ArrowLeftIcon className="w-4 h-4" />
                        Back to My Trades
                    </Link>

                    <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-white/5 overflow-hidden">
                        {/* Header */}
                        <div className="p-6 border-b border-gray-200 dark:border-white/5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                        Trade #{trade.id}
                                    </h1>
                                    <p className="text-gray-500 dark:text-gray-400">
                                        {new Date(trade.created_at).toLocaleString()}
                                    </p>
                                </div>
                                {getStatusBadge()}
                            </div>
                        </div>

                        {/* Trade Details */}
                        <div className="p-6">
                            {/* Participants */}
                            <div className="flex items-center justify-center gap-8 py-6">
                                <div className="text-center">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Seller</p>
                                    <p className="font-semibold text-gray-900 dark:text-white">
                                        {trade.seller.name}
                                        {isSeller && <span className="text-blue-500 ml-1">(You)</span>}
                                    </p>
                                </div>
                                <ArrowsRightLeftIcon className="w-8 h-8 text-gray-400" />
                                <div className="text-center">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Buyer</p>
                                    <p className="font-semibold text-gray-900 dark:text-white">
                                        {trade.buyer.name}
                                        {isBuyer && <span className="text-blue-500 ml-1">(You)</span>}
                                    </p>
                                </div>
                            </div>

                            {/* Property */}
                            <div className="p-4 bg-gray-50 dark:bg-dark-700 rounded-xl mb-6">
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Property</p>
                                <Link
                                    href={`/properties/${trade.property.slug}`}
                                    className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                    {trade.property.name}
                                </Link>
                            </div>

                            {/* Trade Info */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-white/5">
                                    <span className="text-gray-500 dark:text-gray-400">Tokens Traded</span>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                        {Number(trade.tokens_traded).toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-white/5">
                                    <span className="text-gray-500 dark:text-gray-400">Price per Token</span>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                        {Number(trade.price_per_token).toFixed(2)} {trade.currency}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-white/5">
                                    <span className="text-gray-500 dark:text-gray-400">Total Amount</span>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                        {Number(trade.total_amount).toFixed(2)} {trade.currency}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-white/5">
                                    <span className="text-gray-500 dark:text-gray-400">Platform Fee</span>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                        {Number(trade.platform_fee).toFixed(2)} {trade.currency}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between py-3">
                                    <span className="text-gray-500 dark:text-gray-400">Seller Receives</span>
                                    <span className="font-semibold text-green-600 dark:text-green-400">
                                        {Number(trade.seller_receives).toFixed(2)} {trade.currency}
                                    </span>
                                </div>
                            </div>

                            {/* Transaction Hash */}
                            {trade.tx_hash && (
                                <div className="mt-6 p-4 bg-gray-50 dark:bg-dark-700 rounded-xl">
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Transaction Hash</p>
                                    <p className="font-mono text-sm text-gray-900 dark:text-white break-all">
                                        {trade.tx_hash}
                                    </p>
                                    {trade.blockchain && (
                                        <p className="text-xs text-gray-500 mt-1">on {trade.blockchain}</p>
                                    )}
                                </div>
                            )}

                            {/* Failure Reason */}
                            {trade.failure_reason && (
                                <div className="mt-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl">
                                    <p className="text-sm text-red-800 dark:text-red-300">
                                        <strong>Failure Reason:</strong> {trade.failure_reason}
                                    </p>
                                </div>
                            )}

                            {/* Status Message */}
                            {trade.status === 'pending' && (
                                <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-xl">
                                    <p className="text-sm text-yellow-800 dark:text-yellow-300">
                                        This trade is awaiting confirmation. Please wait while the transaction is being processed.
                                    </p>
                                </div>
                            )}

                            {trade.status === 'completed' && (
                                <div className="mt-6 p-4 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl">
                                    <p className="text-sm text-green-800 dark:text-green-300">
                                        Trade completed successfully on {trade.completed_at ? new Date(trade.completed_at).toLocaleString() : 'N/A'}.
                                        {isBuyer && ' The tokens have been added to your portfolio.'}
                                        {isSeller && ' The payment has been processed.'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
