import { Head, Link } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import { Property } from '@/Types';
import {
    BuildingOfficeIcon,
    ChartBarIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    CubeTransparentIcon,
    MapPinIcon,
    ArrowRightIcon,
    WalletIcon,
    BanknotesIcon,
} from '@heroicons/react/24/outline';

interface Holding {
    id: number;
    property: Property;
    token_amount: number;
    average_buy_price: number;
    total_invested: number;
    current_value: number;
    profit_loss: number;
    profit_loss_percentage: number;
    ownership_percentage: number;
}

interface PortfolioProps {
    holdings: Holding[];
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
}

export default function Portfolio({ holdings }: PortfolioProps) {
    const totalInvested = holdings.reduce((sum, h) => sum + h.total_invested, 0);
    const totalCurrentValue = holdings.reduce((sum, h) => sum + h.current_value, 0);
    const totalProfitLoss = holdings.reduce((sum, h) => sum + h.profit_loss, 0);
    const totalTokens = holdings.reduce((sum, h) => sum + h.token_amount, 0);
    const overallProfitPercentage = totalInvested > 0 ? ((totalCurrentValue - totalInvested) / totalInvested) * 100 : 0;

    return (
        <MainLayout>
            <Head title="My Portfolio" />

            {/* Header */}
            <section className="relative py-8 overflow-hidden bg-gray-50 dark:bg-transparent border-b border-gray-200 dark:border-white/5">
                <div className="absolute inset-0 bg-gradient-to-b from-blue-50 dark:from-blue-950/30 to-transparent" />

                <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center">
                                <WalletIcon className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Portfolio</h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Track your real estate investments</p>
                            </div>
                        </div>
                        <Link
                            href="/properties"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-all text-sm font-medium"
                        >
                            Browse Properties
                            <ArrowRightIcon className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </section>

            <section className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    {/* Portfolio Summary Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white dark:bg-white/[0.03] rounded-2xl p-6 border border-gray-200 dark:border-white/5">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                                    <BanknotesIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                </div>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Invested</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalInvested)}</p>
                        </div>

                        <div className="bg-white dark:bg-white/[0.03] rounded-2xl p-6 border border-gray-200 dark:border-white/5">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                                    <ChartBarIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                                </div>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Current Value</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalCurrentValue)}</p>
                        </div>

                        <div className="bg-white dark:bg-white/[0.03] rounded-2xl p-6 border border-gray-200 dark:border-white/5">
                            <div className="flex items-center justify-between mb-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${totalProfitLoss >= 0 ? 'bg-emerald-100 dark:bg-emerald-500/20' : 'bg-red-100 dark:bg-red-500/20'}`}>
                                    {totalProfitLoss >= 0 ? (
                                        <ArrowTrendingUpIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                                    ) : (
                                        <ArrowTrendingDownIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
                                    )}
                                </div>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Profit/Loss</p>
                            <p className={`text-2xl font-bold ${totalProfitLoss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                {totalProfitLoss >= 0 ? '+' : ''}{formatCurrency(totalProfitLoss)}
                            </p>
                            <p className={`text-sm ${totalProfitLoss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                {overallProfitPercentage >= 0 ? '+' : ''}{overallProfitPercentage.toFixed(2)}%
                            </p>
                        </div>

                        <div className="bg-white dark:bg-white/[0.03] rounded-2xl p-6 border border-gray-200 dark:border-white/5">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
                                    <CubeTransparentIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                                </div>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Tokens</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalTokens.toLocaleString()}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{holdings.length} properties</p>
                        </div>
                    </div>

                    {/* Holdings List */}
                    <div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/5 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-white/5">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your Holdings</h2>
                        </div>

                        {holdings.length > 0 ? (
                            <div className="divide-y divide-gray-200 dark:divide-white/5">
                                {holdings.map((holding) => (
                                    <div key={holding.id} className="p-6 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                                        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                                            {/* Property Info */}
                                            <div className="flex items-center gap-4 flex-1">
                                                <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 dark:bg-white/5 flex-shrink-0">
                                                    {holding.property.images?.[0] ? (
                                                        <img
                                                            src={holding.property.images[0]}
                                                            alt={holding.property.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <BuildingOfficeIcon className="w-8 h-8 text-gray-400" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-gray-900 dark:text-white">{holding.property.name}</h3>
                                                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                        <MapPinIcon className="w-4 h-4 mr-1" />
                                                        {holding.property.location}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                                            holding.property.status === 'active'
                                                                ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                                                                : 'bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-400'
                                                        }`}>
                                                            {holding.property.status}
                                                        </span>
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                                            {holding.ownership_percentage.toFixed(2)}% ownership
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Stats */}
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 lg:gap-8">
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Tokens</p>
                                                    <p className="font-semibold text-gray-900 dark:text-white">{holding.token_amount.toLocaleString()}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Invested</p>
                                                    <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(holding.total_invested)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current Value</p>
                                                    <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(holding.current_value)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Profit/Loss</p>
                                                    <p className={`font-semibold ${holding.profit_loss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                                        {holding.profit_loss >= 0 ? '+' : ''}{formatCurrency(holding.profit_loss)}
                                                        <span className="text-xs ml-1">
                                                            ({holding.profit_loss_percentage >= 0 ? '+' : ''}{holding.profit_loss_percentage.toFixed(2)}%)
                                                        </span>
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Action */}
                                            <div className="flex-shrink-0">
                                                <Link
                                                    href={`/properties/${holding.property.slug}`}
                                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-all text-sm"
                                                >
                                                    View Details
                                                    <ArrowRightIcon className="w-4 h-4" />
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-12 text-center">
                                <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
                                    <BuildingOfficeIcon className="w-8 h-8 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No holdings yet</h3>
                                <p className="text-gray-500 dark:text-gray-400 mb-6">Start building your portfolio by investing in tokenized properties.</p>
                                <Link
                                    href="/properties"
                                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-all font-medium"
                                >
                                    Browse Properties
                                    <ArrowRightIcon className="w-4 h-4" />
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </MainLayout>
    );
}
