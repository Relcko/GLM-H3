import { Head, Link } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import {
    CurrencyDollarIcon,
    BuildingOfficeIcon,
    ChartBarIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    WalletIcon,
    Squares2X2Icon,
    Cog6ToothIcon,
    ArrowRightIcon,
    ClockIcon,
    BanknotesIcon,
    ArrowsRightLeftIcon,
    TagIcon,
    ShoppingCartIcon,
} from '@heroicons/react/24/outline';

interface DashboardProps {
    holdings: Array<{
        id: number;
        property: any;
        token_amount: number;
        total_invested: number;
        current_value: number;
        profit_loss: number;
        profit_loss_percentage: number;
        ownership_percentage: number;
    }>;
    recentTransactions: any[];
    recentInvestments: any[];
    stats: {
        total_invested: number;
        current_value: number;
        total_profit: number;
        properties_count: number;
        total_tokens: number;
    };
    dividendPayments: any[];
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
}

export default function DashboardIndex({
    holdings,
    recentTransactions,
    recentInvestments,
    stats,
    dividendPayments,
}: DashboardProps) {
    const profitIsPositive = stats.total_profit >= 0;
    const profitPercentage = stats.total_invested > 0
        ? ((stats.total_profit / stats.total_invested) * 100).toFixed(2)
        : '0.00';

    return (
        <MainLayout>
            <Head title="Dashboard" />

            {/* Header */}
            <section className="py-12">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                Dashboard
                            </p>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome back!</h1>
                            <p className="mt-1 text-gray-600 dark:text-gray-400">Track your investments and portfolio performance</p>
                        </div>
                        <Link
                            href="/properties"
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-900 text-white hover:bg-gray-800 transition-all font-semibold"
                        >
                            <span>New Investment</span>
                            <ArrowRightIcon className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </section>

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-20">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white dark:bg-white/[0.03] rounded-2xl p-6 border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10 transition-all hover:shadow-xl">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Invested</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {formatCurrency(stats.total_invested)}
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                                <CurrencyDollarIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Across {stats.properties_count} properties</p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-white/[0.03] rounded-2xl p-6 border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10 transition-all hover:shadow-xl">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Current Value</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {formatCurrency(stats.current_value)}
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
                                <ChartBarIcon className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
                            <p className="text-xs text-gray-500 dark:text-gray-400">{stats.total_tokens.toLocaleString()} tokens owned</p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-white/[0.03] rounded-2xl p-6 border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10 transition-all hover:shadow-xl">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Profit/Loss</p>
                                <p className={`text-2xl font-bold ${profitIsPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {profitIsPositive ? '+' : ''}{formatCurrency(stats.total_profit)}
                                </p>
                            </div>
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                profitIsPositive ? 'bg-emerald-100 dark:bg-emerald-500/20' : 'bg-red-100 dark:bg-red-500/20'
                            }`}>
                                {profitIsPositive ? (
                                    <ArrowTrendingUpIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                                ) : (
                                    <ArrowTrendingDownIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
                                )}
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
                            <p className={`text-xs ${profitIsPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                {profitIsPositive ? '+' : ''}{profitPercentage}% all time
                            </p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-white/[0.03] rounded-2xl p-6 border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10 transition-all hover:shadow-xl">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Properties Owned</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.properties_count}</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                                <BuildingOfficeIcon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
                            <Link href="/properties" className="text-xs text-gray-900 dark:text-white hover:underline">
                                Explore more properties &rarr;
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Portfolio Holdings */}
                    <div className="lg:col-span-2">
                        <div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/5 overflow-hidden shadow-xl">
                            <div className="p-6 border-b border-gray-100 dark:border-white/5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                                            <WalletIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                        </div>
                                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">My Holdings</h2>
                                    </div>
                                    <Link
                                        href="/dashboard/portfolio"
                                        className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                                    >
                                        View all
                                    </Link>
                                </div>
                            </div>

                            {holdings.length > 0 ? (
                                <div className="divide-y divide-gray-100 dark:divide-white/5">
                                    {holdings.slice(0, 5).map((holding) => (
                                        <div key={holding.id} className="p-6 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 dark:bg-white/5">
                                                        {holding.property.images?.[0] ? (
                                                            <img
                                                                src={holding.property.images[0]}
                                                                alt={holding.property.name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <BuildingOfficeIcon className="h-6 w-6 text-gray-400" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <Link
                                                            href={`/properties/${holding.property.slug}`}
                                                            className="font-medium text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                                        >
                                                            {holding.property.name}
                                                        </Link>
                                                        <div className="flex items-center gap-3 mt-1">
                                                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                                                {holding.token_amount.toLocaleString()} tokens
                                                            </span>
                                                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400">
                                                                {holding.ownership_percentage.toFixed(2)}% ownership
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-semibold text-gray-900 dark:text-white">
                                                        {formatCurrency(holding.current_value)}
                                                    </p>
                                                    <p className={`text-sm flex items-center justify-end gap-1 ${
                                                        holding.profit_loss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                                                    }`}>
                                                        {holding.profit_loss >= 0 ? (
                                                            <ArrowTrendingUpIcon className="w-4 h-4" />
                                                        ) : (
                                                            <ArrowTrendingDownIcon className="w-4 h-4" />
                                                        )}
                                                        <span>
                                                            {holding.profit_loss >= 0 ? '+' : ''}
                                                            {formatCurrency(holding.profit_loss)} ({holding.profit_loss_percentage}%)
                                                        </span>
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-12 text-center">
                                    <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
                                        <BuildingOfficeIcon className="h-8 w-8 text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No holdings yet</h3>
                                    <p className="text-gray-500 dark:text-gray-400 mb-6">Start investing in properties to build your portfolio</p>
                                    <Link
                                        href="/properties"
                                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-900 text-white hover:bg-gray-800 transition-all font-semibold"
                                    >
                                        <span>Browse Properties</span>
                                        <ArrowRightIcon className="w-4 h-4" />
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Recent Transactions */}
                        <div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/5 overflow-hidden shadow-xl">
                            <div className="p-6 border-b border-gray-100 dark:border-white/5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                                            <ClockIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                        </div>
                                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
                                    </div>
                                    <Link
                                        href="/dashboard/transactions"
                                        className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                                    >
                                        View all
                                    </Link>
                                </div>
                            </div>

                            {recentTransactions.length > 0 ? (
                                <div className="divide-y divide-gray-100 dark:divide-white/5">
                                    {recentTransactions.slice(0, 5).map((tx) => (
                                        <div key={tx.id} className="p-4 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                                        tx.type === 'purchase' ? 'bg-emerald-100 dark:bg-emerald-500/20' :
                                                        tx.type === 'dividend' ? 'bg-blue-100 dark:bg-blue-500/20' : 'bg-gray-100 dark:bg-white/5'
                                                    }`}>
                                                        <BanknotesIcon className={`h-5 w-5 ${
                                                            tx.type === 'purchase' ? 'text-emerald-600 dark:text-emerald-400' :
                                                            tx.type === 'dividend' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'
                                                        }`} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                                                            {tx.type}
                                                        </p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                            {new Date(tx.created_at).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {formatCurrency(tx.amount)}
                                                    </p>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                        tx.status === 'confirmed' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' :
                                                        tx.status === 'pending' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400' : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
                                                    }`}>
                                                        {tx.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                                    <p>No transactions yet</p>
                                </div>
                            )}
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-white dark:bg-white/[0.03] rounded-2xl p-6 border border-gray-200 dark:border-white/5 shadow-xl">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
                            <div className="space-y-3">
                                <Link
                                    href="/properties"
                                    className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10 transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center">
                                            <BuildingOfficeIcon className="w-5 h-5 text-white" />
                                        </div>
                                        <span className="font-medium text-gray-900 dark:text-white">Browse Properties</span>
                                    </div>
                                    <ArrowRightIcon className="w-4 h-4 text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white group-hover:translate-x-1 transition-all" />
                                </Link>
                                <Link
                                    href="/dashboard/portfolio"
                                    className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10 transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                                            <WalletIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <span className="font-medium text-gray-900 dark:text-white">View Portfolio</span>
                                    </div>
                                    <ArrowRightIcon className="w-4 h-4 text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white group-hover:translate-x-1 transition-all" />
                                </Link>
                                <Link
                                    href="/dashboard/settings"
                                    className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10 transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                                            <Cog6ToothIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                        </div>
                                        <span className="font-medium text-gray-900 dark:text-white">Account Settings</span>
                                    </div>
                                    <ArrowRightIcon className="w-4 h-4 text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white group-hover:translate-x-1 transition-all" />
                                </Link>
                            </div>
                        </div>

                        {/* Marketplace Actions */}
                        <div className="bg-white dark:bg-white/[0.03] rounded-2xl p-6 border border-gray-200 dark:border-white/5 shadow-xl">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Marketplace</h2>
                            <div className="space-y-3">
                                <Link
                                    href="/marketplace"
                                    className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10 transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
                                            <ShoppingCartIcon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                                        </div>
                                        <span className="font-medium text-gray-900 dark:text-white">Browse Marketplace</span>
                                    </div>
                                    <ArrowRightIcon className="w-4 h-4 text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white group-hover:translate-x-1 transition-all" />
                                </Link>
                                <Link
                                    href="/dashboard/listings"
                                    className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10 transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                                            <TagIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                        </div>
                                        <span className="font-medium text-gray-900 dark:text-white">My Listings</span>
                                    </div>
                                    <ArrowRightIcon className="w-4 h-4 text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white group-hover:translate-x-1 transition-all" />
                                </Link>
                                <Link
                                    href="/dashboard/bids"
                                    className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10 transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                                            <CurrencyDollarIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <span className="font-medium text-gray-900 dark:text-white">My Bids</span>
                                    </div>
                                    <ArrowRightIcon className="w-4 h-4 text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white group-hover:translate-x-1 transition-all" />
                                </Link>
                                <Link
                                    href="/dashboard/trades"
                                    className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10 transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                                            <ArrowsRightLeftIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <span className="font-medium text-gray-900 dark:text-white">My Trades</span>
                                    </div>
                                    <ArrowRightIcon className="w-4 h-4 text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white group-hover:translate-x-1 transition-all" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
