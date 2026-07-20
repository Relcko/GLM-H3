import { Head, Link } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import {
    UsersIcon,
    BuildingOfficeIcon,
    CurrencyDollarIcon,
    ClockIcon,
    ArrowTrendingUpIcon,
    ChartBarIcon,
    ArrowRightIcon,
    SparklesIcon,
} from '@heroicons/react/24/outline';

interface AdminDashboardProps {
    stats: {
        total_users: number;
        total_properties: number;
        active_properties: number;
        total_investments: number;
        pending_investments: number;
        total_tokens_sold: number;
    };
    recentInvestments: any[];
    recentUsers: any[];
    investmentsByMonth: any[];
    topProperties: any[];
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

export default function AdminDashboard({
    stats,
    recentInvestments,
    recentUsers,
    topProperties,
}: AdminDashboardProps) {
    const statCards = [
        {
            name: 'Total Users',
            value: stats.total_users,
            icon: UsersIcon,
            color: 'blue',
            gradient: 'from-blue-600 to-blue-400',
        },
        {
            name: 'Properties',
            value: stats.total_properties,
            subtext: `${stats.active_properties} active`,
            icon: BuildingOfficeIcon,
            color: 'emerald',
            gradient: 'from-emerald-600 to-emerald-400',
        },
        {
            name: 'Total Investments',
            value: formatCurrency(stats.total_investments),
            icon: CurrencyDollarIcon,
            color: 'cyan',
            gradient: 'from-cyan-600 to-cyan-400',
        },
        {
            name: 'Pending',
            value: stats.pending_investments,
            icon: ClockIcon,
            color: 'amber',
            gradient: 'from-amber-600 to-amber-400',
        },
    ];

    return (
        <AdminLayout title="Dashboard">
            <Head title="Admin Dashboard" />

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {statCards.map((stat) => (
                    <div key={stat.name} className="glass-card rounded-2xl p-6 group hover:border-white/20 transition-all">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-400 mb-1">{stat.name}</p>
                                <p className="text-2xl font-bold text-white">{stat.value}</p>
                                {stat.subtext && (
                                    <p className="text-xs text-emerald-400 mt-1">{stat.subtext}</p>
                                )}
                            </div>
                            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                <stat.icon className="h-7 w-7 text-white" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Investments */}
                <div className="glass-card rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-white/5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                                    <CurrencyDollarIcon className="h-5 w-5 text-cyan-400" />
                                </div>
                                <h2 className="text-lg font-semibold text-white">Recent Investments</h2>
                            </div>
                            <Link
                                href="/admin/investments"
                                className="text-sm text-blue-400 hover:text-blue-300 flex items-center space-x-1 transition-colors"
                            >
                                <span>View all</span>
                                <ArrowRightIcon className="h-4 w-4" />
                            </Link>
                        </div>
                    </div>

                    <div className="divide-y divide-white/5">
                        {recentInvestments.length > 0 ? (
                            recentInvestments.map((investment) => (
                                <div key={investment.id} className="p-4 hover:bg-white/5 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-white">
                                                {investment.user?.name || 'Unknown User'}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                {investment.property?.name} • {investment.tokens_purchased} tokens
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-white">
                                                {formatCurrency(investment.amount_paid)}
                                            </p>
                                            <span className={`text-xs px-2 py-1 rounded-full ${
                                                investment.status === 'confirmed'
                                                    ? 'bg-emerald-500/20 text-emerald-400'
                                                    : investment.status === 'pending'
                                                    ? 'bg-amber-500/20 text-amber-400'
                                                    : 'bg-red-500/20 text-red-400'
                                            }`}>
                                                {investment.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center">
                                <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center mx-auto mb-3">
                                    <CurrencyDollarIcon className="h-6 w-6 text-gray-600" />
                                </div>
                                <p className="text-gray-500">No investments yet</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Users */}
                <div className="glass-card rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-white/5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                    <UsersIcon className="h-5 w-5 text-blue-400" />
                                </div>
                                <h2 className="text-lg font-semibold text-white">Recent Users</h2>
                            </div>
                            <Link
                                href="/admin/users"
                                className="text-sm text-blue-400 hover:text-blue-300 flex items-center space-x-1 transition-colors"
                            >
                                <span>View all</span>
                                <ArrowRightIcon className="h-4 w-4" />
                            </Link>
                        </div>
                    </div>

                    <div className="divide-y divide-white/5">
                        {recentUsers.length > 0 ? (
                            recentUsers.map((user) => (
                                <div key={user.id} className="p-4 hover:bg-white/5 transition-colors">
                                    <div className="flex items-center">
                                        <div className="w-10 h-10 gradient-bg rounded-xl flex items-center justify-center flex-shrink-0">
                                            <span className="text-white font-bold text-sm">
                                                {user.name.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="ml-4 flex-1">
                                            <p className="font-medium text-white">{user.name}</p>
                                            <p className="text-sm text-gray-500">{user.email}</p>
                                        </div>
                                        {user.is_admin && (
                                            <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full">
                                                Admin
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center">
                                <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center mx-auto mb-3">
                                    <UsersIcon className="h-6 w-6 text-gray-600" />
                                </div>
                                <p className="text-gray-500">No users yet</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Top Properties */}
            {topProperties.length > 0 && (
                <div className="mt-8 glass-card rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-white/5">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                                <ChartBarIcon className="h-5 w-5 text-emerald-400" />
                            </div>
                            <h2 className="text-lg font-semibold text-white">Top Properties by Sales</h2>
                        </div>
                    </div>

                    <div className="divide-y divide-white/5">
                        {topProperties.map((property, index) => (
                            <div key={property.id} className="p-4 hover:bg-white/5 transition-colors">
                                <div className="flex items-center">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                        index === 0 ? 'bg-amber-500/20' :
                                        index === 1 ? 'bg-gray-500/20' :
                                        index === 2 ? 'bg-orange-500/20' : 'bg-gray-800'
                                    }`}>
                                        <span className={`font-bold ${
                                            index === 0 ? 'text-amber-400' :
                                            index === 1 ? 'text-gray-400' :
                                            index === 2 ? 'text-orange-400' : 'text-gray-500'
                                        }`}>
                                            #{index + 1}
                                        </span>
                                    </div>
                                    <div className="ml-4 flex-1">
                                        <Link
                                            href={`/admin/properties/${property.id}`}
                                            className="font-medium text-white hover:text-blue-400 transition-colors"
                                        >
                                            {property.name}
                                        </Link>
                                        <p className="text-sm text-gray-500">{property.location}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-white">
                                            {property.sold_tokens.toLocaleString()} tokens
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {property.investments_count} investors
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
