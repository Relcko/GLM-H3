import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import {
    ArrowLeftIcon,
    UserIcon,
    ShieldCheckIcon,
    WalletIcon,
    CurrencyDollarIcon,
    BuildingOfficeIcon,
    CheckBadgeIcon,
    XCircleIcon,
    ClockIcon,
    NoSymbolIcon,
    PlusIcon,
    MinusIcon,
    BanknotesIcon,
} from '@heroicons/react/24/outline';

interface KycVerification {
    id: number;
    status: string;
    document_type: string;
    submitted_at: string | null;
    verified_at: string | null;
}

interface Property {
    id: number;
    name: string;
    slug: string;
    location: string;
}

interface TokenHolding {
    id: number;
    token_amount: number;
    total_invested: number;
    property: Property;
}

interface Investment {
    id: number;
    tokens_purchased: number;
    amount_paid: number;
    status: string;
    created_at: string;
    property: Property;
}

interface User {
    id: number;
    name: string;
    email: string;
    wallet_address: string | null;
    is_admin: boolean;
    status: 'active' | 'suspended' | 'banned';
    balance: number;
    suspension_reason: string | null;
    suspended_at: string | null;
    created_at: string;
    kyc_verification: KycVerification | null;
    token_holdings: TokenHolding[];
    investments: Investment[];
}

interface Stats {
    total_invested: number;
    properties_owned: number;
    total_tokens: number;
    balance: number;
}

interface AdminUsersShowProps {
    user: User;
    stats: Stats;
}

function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

function formatAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}

export default function AdminUsersShow({ user, stats }: AdminUsersShowProps) {
    const [showSuspendModal, setShowSuspendModal] = useState(false);
    const [showAddFundsModal, setShowAddFundsModal] = useState(false);
    const [showDeductFundsModal, setShowDeductFundsModal] = useState(false);

    const { data, setData, put, processing, errors } = useForm({
        name: user.name,
        email: user.email,
        is_admin: user.is_admin,
    });

    const suspendForm = useForm({
        reason: '',
    });

    const fundsForm = useForm({
        amount: '',
        description: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(`/admin/users/${user.id}`);
    };

    const handleSuspend = (e: React.FormEvent) => {
        e.preventDefault();
        suspendForm.post(`/admin/users/${user.id}/suspend`, {
            onSuccess: () => setShowSuspendModal(false),
        });
    };

    const handleUnsuspend = () => {
        if (confirm('Are you sure you want to reactivate this user?')) {
            router.post(`/admin/users/${user.id}/unsuspend`);
        }
    };

    const handleAddFunds = (e: React.FormEvent) => {
        e.preventDefault();
        fundsForm.post(`/admin/users/${user.id}/add-funds`, {
            onSuccess: () => {
                setShowAddFundsModal(false);
                fundsForm.reset();
            },
        });
    };

    const handleDeductFunds = (e: React.FormEvent) => {
        e.preventDefault();
        fundsForm.post(`/admin/users/${user.id}/deduct-funds`, {
            onSuccess: () => {
                setShowDeductFundsModal(false);
                fundsForm.reset();
            },
        });
    };

    const kycStatusConfig: Record<string, { color: string; icon: any }> = {
        pending: { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: ClockIcon },
        submitted: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: ClockIcon },
        approved: { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckBadgeIcon },
        rejected: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircleIcon },
    };

    const investmentStatusConfig: Record<string, string> = {
        pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        confirmed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
    };

    const statusConfig: Record<string, { color: string; label: string }> = {
        active: { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'Active' },
        suspended: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', label: 'Suspended' },
        banned: { color: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Banned' },
    };

    return (
        <AdminLayout title="User Details">
            <Head title={`${user.name} - Admin`} />

            {/* Back Button */}
            <div className="mb-6">
                <Link
                    href="/admin/users"
                    className="inline-flex items-center text-gray-400 hover:text-white transition-colors"
                >
                    <ArrowLeftIcon className="h-5 w-5 mr-2" />
                    Back to Users
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* User Info Card */}
                <div className="lg:col-span-1">
                    <div className="glass-card rounded-2xl p-6">
                        <div className="text-center mb-6">
                            <div className="h-20 w-20 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-4">
                                <span className="text-white text-3xl font-bold">
                                    {user.name.charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <h2 className="text-xl font-semibold text-white">{user.name}</h2>
                            <p className="text-gray-400">{user.email}</p>
                            <div className="flex items-center justify-center gap-2 mt-2">
                                {user.is_admin && (
                                    <span className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                        <ShieldCheckIcon className="h-3.5 w-3.5 mr-1.5" />
                                        Administrator
                                    </span>
                                )}
                                <span className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full border ${statusConfig[user.status]?.color}`}>
                                    {statusConfig[user.status]?.label}
                                </span>
                            </div>
                        </div>

                        {/* Suspension Info */}
                        {user.status === 'suspended' && user.suspension_reason && (
                            <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                                <p className="text-sm text-yellow-400 font-medium mb-1">Suspension Reason:</p>
                                <p className="text-sm text-gray-300">{user.suspension_reason}</p>
                                {user.suspended_at && (
                                    <p className="text-xs text-gray-500 mt-2">Suspended on: {formatDate(user.suspended_at)}</p>
                                )}
                            </div>
                        )}

                        {/* Quick Actions */}
                        <div className="border-t border-white/10 pt-4 mb-4 space-y-2">
                            <p className="text-sm text-gray-400 mb-3">Quick Actions</p>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => setShowAddFundsModal(true)}
                                    className="flex items-center justify-center gap-2 px-3 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500/30 transition-colors text-sm"
                                >
                                    <PlusIcon className="h-4 w-4" />
                                    Add Funds
                                </button>
                                <button
                                    onClick={() => setShowDeductFundsModal(true)}
                                    className="flex items-center justify-center gap-2 px-3 py-2 bg-orange-500/20 text-orange-400 rounded-xl hover:bg-orange-500/30 transition-colors text-sm"
                                >
                                    <MinusIcon className="h-4 w-4" />
                                    Deduct
                                </button>
                            </div>
                            {!user.is_admin && (
                                <>
                                    {user.status === 'active' ? (
                                        <button
                                            onClick={() => setShowSuspendModal(true)}
                                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors text-sm"
                                        >
                                            <NoSymbolIcon className="h-4 w-4" />
                                            Suspend User
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleUnsuspend}
                                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500/30 transition-colors text-sm"
                                        >
                                            <CheckBadgeIcon className="h-4 w-4" />
                                            Reactivate User
                                        </button>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Wallet */}
                        <div className="border-t border-white/10 pt-4 mb-4">
                            <p className="text-sm text-gray-400 mb-2">Wallet Address</p>
                            {user.wallet_address ? (
                                <div className="flex items-center text-emerald-400 bg-emerald-500/10 rounded-xl p-3">
                                    <WalletIcon className="h-5 w-5 mr-2" />
                                    <span className="font-mono text-sm">{formatAddress(user.wallet_address)}</span>
                                </div>
                            ) : (
                                <div className="text-gray-500 bg-white/5 rounded-xl p-3 text-center">
                                    No wallet connected
                                </div>
                            )}
                        </div>

                        {/* KYC Status */}
                        <div className="border-t border-white/10 pt-4 mb-4">
                            <p className="text-sm text-gray-400 mb-2">KYC Status</p>
                            {user.kyc_verification ? (
                                <div className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full border ${kycStatusConfig[user.kyc_verification.status]?.color}`}>
                                    {user.kyc_verification.status === 'submitted' ? 'Pending Review' : user.kyc_verification.status}
                                </div>
                            ) : (
                                <div className="text-gray-500">Not submitted</div>
                            )}
                        </div>

                        {/* Joined */}
                        <div className="border-t border-white/10 pt-4">
                            <p className="text-sm text-gray-400 mb-1">Joined</p>
                            <p className="text-white">{formatDate(user.created_at)}</p>
                        </div>
                    </div>

                    {/* Stats Card */}
                    <div className="glass-card rounded-2xl p-6 mt-6">
                        <h3 className="font-semibold text-white mb-4">Statistics</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-emerald-500/10 rounded-xl">
                                <div className="flex items-center gap-2">
                                    <BanknotesIcon className="h-5 w-5 text-emerald-400" />
                                    <span className="text-gray-400">Account Balance</span>
                                </div>
                                <span className="text-emerald-400 font-bold text-lg">{formatCurrency(Number(user.balance))}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Total Invested</span>
                                <span className="text-white font-semibold">{formatCurrency(stats.total_invested)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Properties Owned</span>
                                <span className="text-white font-semibold">{stats.properties_owned}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Total Tokens</span>
                                <span className="text-white font-semibold">{stats.total_tokens}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Edit Form */}
                    <div className="glass-card rounded-2xl p-6">
                        <h3 className="font-semibold text-white mb-4">Edit User</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Name</label>
                                <input
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    className="w-full input-dark rounded-xl py-3 px-4"
                                />
                                {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Email</label>
                                <input
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    className="w-full input-dark rounded-xl py-3 px-4"
                                />
                                {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
                            </div>
                            <div>
                                <label className="flex items-center space-x-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={data.is_admin}
                                        onChange={(e) => setData('is_admin', e.target.checked)}
                                        className="form-checkbox h-5 w-5 rounded bg-dark-800 border-white/20 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-white">Administrator</span>
                                </label>
                            </div>
                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-50"
                            >
                                {processing ? 'Saving...' : 'Save Changes'}
                            </button>
                        </form>
                    </div>

                    {/* Token Holdings */}
                    <div className="glass-card rounded-2xl p-6">
                        <h3 className="font-semibold text-white mb-4">Token Holdings</h3>
                        {user.token_holdings.length > 0 ? (
                            <div className="space-y-3">
                                {user.token_holdings.map((holding) => (
                                    <div key={holding.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                                <BuildingOfficeIcon className="h-5 w-5 text-blue-400" />
                                            </div>
                                            <div>
                                                <Link
                                                    href={`/properties/${holding.property.slug}`}
                                                    className="text-white font-medium hover:text-blue-400 transition-colors"
                                                >
                                                    {holding.property.name}
                                                </Link>
                                                <p className="text-sm text-gray-400">{holding.property.location}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-white font-semibold">{holding.token_amount} tokens</p>
                                            <p className="text-sm text-gray-400">{formatCurrency(holding.total_invested)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-400 text-center py-8">No token holdings</p>
                        )}
                    </div>

                    {/* Investments */}
                    <div className="glass-card rounded-2xl p-6">
                        <h3 className="font-semibold text-white mb-4">Investment History</h3>
                        {user.investments.length > 0 ? (
                            <div className="space-y-3">
                                {user.investments.map((investment) => (
                                    <div key={investment.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                                                <CurrencyDollarIcon className="h-5 w-5 text-emerald-400" />
                                            </div>
                                            <div>
                                                <Link
                                                    href={`/properties/${investment.property.slug}`}
                                                    className="text-white font-medium hover:text-blue-400 transition-colors"
                                                >
                                                    {investment.property.name}
                                                </Link>
                                                <p className="text-sm text-gray-400">{formatDate(investment.created_at)}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-white font-semibold">{formatCurrency(investment.amount_paid)}</p>
                                            <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${investmentStatusConfig[investment.status]}`}>
                                                {investment.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-400 text-center py-8">No investments</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Suspend Modal */}
            {showSuspendModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="glass-card rounded-2xl p-6 w-full max-w-md mx-4">
                        <h3 className="text-lg font-semibold text-white mb-4">Suspend User</h3>
                        <p className="text-gray-400 text-sm mb-4">
                            This will prevent the user from logging in and performing any actions.
                        </p>
                        <form onSubmit={handleSuspend}>
                            <div className="mb-4">
                                <label className="block text-sm text-gray-400 mb-2">Reason for Suspension *</label>
                                <textarea
                                    value={suspendForm.data.reason}
                                    onChange={(e) => suspendForm.setData('reason', e.target.value)}
                                    className="w-full input-dark rounded-xl py-3 px-4"
                                    rows={3}
                                    required
                                    placeholder="Enter the reason for suspending this user..."
                                />
                                {suspendForm.errors.reason && (
                                    <p className="text-red-400 text-sm mt-1">{suspendForm.errors.reason}</p>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowSuspendModal(false)}
                                    className="flex-1 py-3 px-4 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={suspendForm.processing}
                                    className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors disabled:opacity-50"
                                >
                                    {suspendForm.processing ? 'Suspending...' : 'Suspend User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Funds Modal */}
            {showAddFundsModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="glass-card rounded-2xl p-6 w-full max-w-md mx-4">
                        <h3 className="text-lg font-semibold text-white mb-4">Add Funds</h3>
                        <p className="text-gray-400 text-sm mb-4">
                            Add funds to {user.name}'s account balance.
                        </p>
                        <form onSubmit={handleAddFunds}>
                            <div className="mb-4">
                                <label className="block text-sm text-gray-400 mb-2">Amount (USD) *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={fundsForm.data.amount}
                                    onChange={(e) => fundsForm.setData('amount', e.target.value)}
                                    className="w-full input-dark rounded-xl py-3 px-4"
                                    required
                                    placeholder="0.00"
                                />
                                {fundsForm.errors.amount && (
                                    <p className="text-red-400 text-sm mt-1">{fundsForm.errors.amount}</p>
                                )}
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm text-gray-400 mb-2">Description (optional)</label>
                                <input
                                    type="text"
                                    value={fundsForm.data.description}
                                    onChange={(e) => fundsForm.setData('description', e.target.value)}
                                    className="w-full input-dark rounded-xl py-3 px-4"
                                    placeholder="e.g., Cash deposit, bank transfer..."
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddFundsModal(false);
                                        fundsForm.reset();
                                    }}
                                    className="flex-1 py-3 px-4 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={fundsForm.processing}
                                    className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors disabled:opacity-50"
                                >
                                    {fundsForm.processing ? 'Adding...' : 'Add Funds'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Deduct Funds Modal */}
            {showDeductFundsModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="glass-card rounded-2xl p-6 w-full max-w-md mx-4">
                        <h3 className="text-lg font-semibold text-white mb-4">Deduct Funds</h3>
                        <p className="text-gray-400 text-sm mb-2">
                            Deduct funds from {user.name}'s account balance.
                        </p>
                        <p className="text-sm text-emerald-400 mb-4">
                            Current Balance: {formatCurrency(Number(user.balance))}
                        </p>
                        <form onSubmit={handleDeductFunds}>
                            <div className="mb-4">
                                <label className="block text-sm text-gray-400 mb-2">Amount (USD) *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    max={Number(user.balance)}
                                    value={fundsForm.data.amount}
                                    onChange={(e) => fundsForm.setData('amount', e.target.value)}
                                    className="w-full input-dark rounded-xl py-3 px-4"
                                    required
                                    placeholder="0.00"
                                />
                                {fundsForm.errors.amount && (
                                    <p className="text-red-400 text-sm mt-1">{fundsForm.errors.amount}</p>
                                )}
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm text-gray-400 mb-2">Description (optional)</label>
                                <input
                                    type="text"
                                    value={fundsForm.data.description}
                                    onChange={(e) => fundsForm.setData('description', e.target.value)}
                                    className="w-full input-dark rounded-xl py-3 px-4"
                                    placeholder="e.g., Withdrawal, refund..."
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowDeductFundsModal(false);
                                        fundsForm.reset();
                                    }}
                                    className="flex-1 py-3 px-4 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={fundsForm.processing}
                                    className="flex-1 py-3 px-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition-colors disabled:opacity-50"
                                >
                                    {fundsForm.processing ? 'Deducting...' : 'Deduct Funds'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
