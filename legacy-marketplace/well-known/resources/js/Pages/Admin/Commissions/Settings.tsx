import { Head, Link, useForm } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

interface Props {
    settings: {
        default_commission_rate: string;
        platform_trading_fee: string;
        min_withdrawal_amount: string;
        commission_auto_approve: string;
    };
}

export default function CommissionSettings({ settings }: Props) {
    const form = useForm({
        default_commission_rate: settings.default_commission_rate,
        platform_trading_fee: settings.platform_trading_fee,
        min_withdrawal_amount: settings.min_withdrawal_amount,
        commission_auto_approve: settings.commission_auto_approve,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/admin/commissions/settings');
    };

    return (
        <AdminLayout>
            <Head title="Commission Settings" />

            <div className="p-6">
                <Link
                    href="/admin/commissions"
                    className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
                >
                    <ArrowLeftIcon className="w-4 h-4" />
                    Back to Commissions
                </Link>

                <div className="max-w-2xl">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Commission Settings</h1>

                    <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-white/5 p-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Default Commission Rate (%)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={form.data.default_commission_rate}
                                    onChange={(e) => form.setData('default_commission_rate', e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-white/10 rounded-lg"
                                />
                                <p className="mt-1 text-sm text-gray-500">Default commission rate for new agents</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Platform Trading Fee (%)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={form.data.platform_trading_fee}
                                    onChange={(e) => form.setData('platform_trading_fee', e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-white/10 rounded-lg"
                                />
                                <p className="mt-1 text-sm text-gray-500">Fee charged on secondary market trades</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Minimum Withdrawal Amount
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={form.data.min_withdrawal_amount}
                                    onChange={(e) => form.setData('min_withdrawal_amount', e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-white/10 rounded-lg"
                                />
                                <p className="mt-1 text-sm text-gray-500">Minimum amount agents can withdraw</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Auto-Approve Commissions
                                </label>
                                <select
                                    value={form.data.commission_auto_approve}
                                    onChange={(e) => form.setData('commission_auto_approve', e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-white/10 rounded-lg"
                                >
                                    <option value="false">No - Manual Approval Required</option>
                                    <option value="true">Yes - Auto Approve</option>
                                </select>
                                <p className="mt-1 text-sm text-gray-500">Automatically approve commissions when transactions are confirmed</p>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={form.processing}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {form.processing ? 'Saving...' : 'Save Settings'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
