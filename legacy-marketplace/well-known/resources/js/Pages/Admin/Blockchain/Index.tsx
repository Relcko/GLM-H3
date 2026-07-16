import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import {
    PlusIcon,
    PencilIcon,
    TrashIcon,
    LinkIcon,
    CurrencyDollarIcon,
    CheckCircleIcon,
    XCircleIcon,
    Cog6ToothIcon,
    ShieldCheckIcon,
} from '@heroicons/react/24/outline';

interface BlockchainConfig {
    id: number;
    chain_id: string;
    name: string;
    symbol: string;
    rpc_url: string;
    explorer_url: string;
    contract_address: string | null;
    payment_token_address: string | null;
    payment_token_symbol: string;
    payment_token_decimals: number;
    is_active: boolean;
    is_testnet: boolean;
}

interface Settings {
    kyc_required: boolean;
}

interface AdminBlockchainIndexProps {
    configs: BlockchainConfig[];
    settings: Settings;
}

export default function AdminBlockchainIndex({ configs, settings }: AdminBlockchainIndexProps) {
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    const { data, setData, post, put, processing, reset, errors } = useForm({
        chain_id: '',
        name: '',
        symbol: '',
        rpc_url: '',
        explorer_url: '',
        contract_address: '',
        payment_token_address: '',
        payment_token_symbol: 'USDT',
        payment_token_decimals: 6,
        is_active: true,
        is_testnet: false,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingId) {
            put(`/admin/blockchain/${editingId}`, {
                onSuccess: () => {
                    setEditingId(null);
                    reset();
                }
            });
        } else {
            post('/admin/blockchain', {
                onSuccess: () => {
                    setIsAddingNew(false);
                    reset();
                }
            });
        }
    };

    const handleEdit = (config: BlockchainConfig) => {
        setEditingId(config.id);
        setIsAddingNew(false);
        setData({
            chain_id: config.chain_id,
            name: config.name,
            symbol: config.symbol,
            rpc_url: config.rpc_url,
            explorer_url: config.explorer_url,
            contract_address: config.contract_address || '',
            payment_token_address: config.payment_token_address || '',
            payment_token_symbol: config.payment_token_symbol,
            payment_token_decimals: config.payment_token_decimals,
            is_active: config.is_active,
            is_testnet: config.is_testnet,
        });
    };

    const handleDelete = (config: BlockchainConfig) => {
        if (confirm(`Delete blockchain config "${config.name}"?`)) {
            router.delete(`/admin/blockchain/${config.id}`);
        }
    };

    const handleKycToggle = () => {
        router.post('/admin/settings', {
            kyc_required: !settings.kyc_required,
        });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setIsAddingNew(false);
        reset();
    };

    return (
        <AdminLayout title="Blockchain & Settings">
            <Head title="Blockchain & Settings - Admin" />

            {/* Settings Section */}
            <div className="glass-card rounded-2xl p-6 mb-6">
                <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                        <Cog6ToothIcon className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-white">Platform Settings</h2>
                        <p className="text-sm text-gray-400">Configure platform-wide settings</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* KYC Toggle */}
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                    <ShieldCheckIcon className="h-5 w-5 text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="font-medium text-white">KYC Verification Required</h3>
                                    <p className="text-sm text-gray-400">
                                        {settings.kyc_required
                                            ? 'Users must complete KYC before investing'
                                            : 'Users can invest without KYC verification'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleKycToggle}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                    settings.kyc_required ? 'bg-blue-600' : 'bg-gray-600'
                                }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                        settings.kyc_required ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Blockchain Configs Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                        <LinkIcon className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-white">Blockchain Networks</h2>
                        <p className="text-sm text-gray-400">Configure supported blockchain networks</p>
                    </div>
                </div>
                {!isAddingNew && !editingId && (
                    <button
                        onClick={() => setIsAddingNew(true)}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
                    >
                        <PlusIcon className="h-5 w-5" />
                        <span>Add Network</span>
                    </button>
                )}
            </div>

            {/* Add/Edit Form */}
            {(isAddingNew || editingId) && (
                <div className="glass-card rounded-2xl p-6 mb-6">
                    <h3 className="font-semibold text-white mb-4">
                        {editingId ? 'Edit Network' : 'Add New Network'}
                    </h3>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Chain ID</label>
                            <input
                                type="text"
                                value={data.chain_id}
                                onChange={(e) => setData('chain_id', e.target.value)}
                                placeholder="e.g., 11155111"
                                className="w-full input-dark rounded-xl py-3 px-4"
                                disabled={!!editingId}
                            />
                            {errors.chain_id && <p className="text-red-400 text-sm mt-1">{errors.chain_id}</p>}
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Network Name</label>
                            <input
                                type="text"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder="e.g., Sepolia Testnet"
                                className="w-full input-dark rounded-xl py-3 px-4"
                            />
                            {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Symbol</label>
                            <input
                                type="text"
                                value={data.symbol}
                                onChange={(e) => setData('symbol', e.target.value)}
                                placeholder="e.g., ETH"
                                className="w-full input-dark rounded-xl py-3 px-4"
                            />
                            {errors.symbol && <p className="text-red-400 text-sm mt-1">{errors.symbol}</p>}
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">RPC URL</label>
                            <input
                                type="url"
                                value={data.rpc_url}
                                onChange={(e) => setData('rpc_url', e.target.value)}
                                placeholder="https://rpc.sepolia.org"
                                className="w-full input-dark rounded-xl py-3 px-4"
                            />
                            {errors.rpc_url && <p className="text-red-400 text-sm mt-1">{errors.rpc_url}</p>}
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Explorer URL</label>
                            <input
                                type="url"
                                value={data.explorer_url}
                                onChange={(e) => setData('explorer_url', e.target.value)}
                                placeholder="https://sepolia.etherscan.io"
                                className="w-full input-dark rounded-xl py-3 px-4"
                            />
                            {errors.explorer_url && <p className="text-red-400 text-sm mt-1">{errors.explorer_url}</p>}
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">RWA Contract Address</label>
                            <input
                                type="text"
                                value={data.contract_address}
                                onChange={(e) => setData('contract_address', e.target.value)}
                                placeholder="0x..."
                                className="w-full input-dark rounded-xl py-3 px-4 font-mono text-sm"
                            />
                            {errors.contract_address && <p className="text-red-400 text-sm mt-1">{errors.contract_address}</p>}
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Payment Token Address (USDT)</label>
                            <input
                                type="text"
                                value={data.payment_token_address}
                                onChange={(e) => setData('payment_token_address', e.target.value)}
                                placeholder="0x..."
                                className="w-full input-dark rounded-xl py-3 px-4 font-mono text-sm"
                            />
                            {errors.payment_token_address && <p className="text-red-400 text-sm mt-1">{errors.payment_token_address}</p>}
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Payment Token Symbol</label>
                            <input
                                type="text"
                                value={data.payment_token_symbol}
                                onChange={(e) => setData('payment_token_symbol', e.target.value)}
                                placeholder="USDT"
                                className="w-full input-dark rounded-xl py-3 px-4"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Payment Token Decimals</label>
                            <input
                                type="number"
                                value={data.payment_token_decimals}
                                onChange={(e) => setData('payment_token_decimals', parseInt(e.target.value))}
                                min="0"
                                max="18"
                                className="w-full input-dark rounded-xl py-3 px-4"
                            />
                        </div>
                        <div className="md:col-span-2 flex items-center space-x-6">
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={data.is_active}
                                    onChange={(e) => setData('is_active', e.target.checked)}
                                    className="form-checkbox h-5 w-5 rounded bg-dark-800 border-white/20 text-blue-600"
                                />
                                <span className="text-white">Active</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={data.is_testnet}
                                    onChange={(e) => setData('is_testnet', e.target.checked)}
                                    className="form-checkbox h-5 w-5 rounded bg-dark-800 border-white/20 text-blue-600"
                                />
                                <span className="text-white">Testnet</span>
                            </label>
                        </div>
                        <div className="md:col-span-2 flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={cancelEdit}
                                className="px-4 py-2 border border-white/20 text-gray-300 rounded-xl hover:bg-white/5 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={processing}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-50"
                            >
                                {processing ? 'Saving...' : (editingId ? 'Update' : 'Add Network')}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Networks List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {configs.length > 0 ? (
                    configs.map((config) => (
                        <div key={config.id} className="glass-card rounded-2xl p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center space-x-3">
                                    <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center">
                                        <span className="text-white font-bold">{config.symbol}</span>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-white">{config.name}</h3>
                                        <p className="text-sm text-gray-400">Chain ID: {config.chain_id}</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    {config.is_testnet && (
                                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                                            Testnet
                                        </span>
                                    )}
                                    {config.is_active ? (
                                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                            <CheckCircleIcon className="h-3.5 w-3.5 inline mr-1" />
                                            Active
                                        </span>
                                    ) : (
                                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                                            <XCircleIcon className="h-3.5 w-3.5 inline mr-1" />
                                            Inactive
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-3 mb-4">
                                {config.contract_address && (
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">RWA Contract</p>
                                        <p className="text-sm text-gray-300 font-mono break-all">{config.contract_address}</p>
                                    </div>
                                )}
                                {config.payment_token_address && (
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">{config.payment_token_symbol} Contract</p>
                                        <p className="text-sm text-gray-300 font-mono break-all">{config.payment_token_address}</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end space-x-2 pt-4 border-t border-white/10">
                                <button
                                    onClick={() => handleEdit(config)}
                                    className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                                    title="Edit"
                                >
                                    <PencilIcon className="h-5 w-5" />
                                </button>
                                <button
                                    onClick={() => handleDelete(config)}
                                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                    title="Delete"
                                >
                                    <TrashIcon className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="md:col-span-2 glass-card rounded-2xl p-12 text-center">
                        <LinkIcon className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-white mb-2">No Networks Configured</h3>
                        <p className="text-gray-400 mb-4">Add your first blockchain network to get started</p>
                        <button
                            onClick={() => setIsAddingNew(true)}
                            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
                        >
                            <PlusIcon className="h-5 w-5" />
                            <span>Add Network</span>
                        </button>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
