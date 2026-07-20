import { Head, useForm } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import {
    Cog6ToothIcon,
    CalculatorIcon,
    CurrencyDollarIcon,
    UserGroupIcon,
    ShieldCheckIcon,
} from '@heroicons/react/24/outline';

interface Settings {
    kyc_required: boolean;
    platform_trading_fee: number;
    default_rental_yield: number;
    default_appreciation_rate: number;
    calculator_projection_years: number;
    min_investment_global: number;
    max_investment_global: number;
    referral_commission_rate: number;
    agent_commission_rate: number;
}

interface Props {
    settings: Settings;
}

export default function AdminSettingsIndex({ settings }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        kyc_required: settings.kyc_required,
        platform_trading_fee: settings.platform_trading_fee.toString(),
        default_rental_yield: settings.default_rental_yield.toString(),
        default_appreciation_rate: settings.default_appreciation_rate.toString(),
        calculator_projection_years: settings.calculator_projection_years.toString(),
        min_investment_global: settings.min_investment_global.toString(),
        max_investment_global: settings.max_investment_global.toString(),
        referral_commission_rate: settings.referral_commission_rate.toString(),
        agent_commission_rate: settings.agent_commission_rate.toString(),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/admin/settings');
    };

    return (
        <AdminLayout title="Settings">
            <Head title="Settings - Admin" />

            <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
                {/* General Settings */}
                <div className="glass-card rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                            <Cog6ToothIcon className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">General Settings</h2>
                            <p className="text-sm text-gray-400">Configure platform-wide settings</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                            <div>
                                <p className="text-white font-medium">KYC Required for Investment</p>
                                <p className="text-sm text-gray-400">Users must complete KYC before investing</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={data.kyc_required}
                                    onChange={(e) => setData('kyc_required', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                Platform Trading Fee (%)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                value={data.platform_trading_fee}
                                onChange={(e) => setData('platform_trading_fee', e.target.value)}
                                className="w-full input-dark rounded-xl py-3 px-4"
                            />
                            <p className="text-xs text-gray-500 mt-1">Fee charged on P2P trades</p>
                            {errors.platform_trading_fee && (
                                <p className="text-red-400 text-sm mt-1">{errors.platform_trading_fee}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Return Calculator Settings */}
                <div className="glass-card rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                            <CalculatorIcon className="h-5 w-5 text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">Return Calculator</h2>
                            <p className="text-sm text-gray-400">Default values for investment projections</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                Default Rental Yield (%)
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                value={data.default_rental_yield}
                                onChange={(e) => setData('default_rental_yield', e.target.value)}
                                className="w-full input-dark rounded-xl py-3 px-4"
                            />
                            <p className="text-xs text-gray-500 mt-1">Used when property doesn't specify</p>
                            {errors.default_rental_yield && (
                                <p className="text-red-400 text-sm mt-1">{errors.default_rental_yield}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                Default Appreciation Rate (%)
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                value={data.default_appreciation_rate}
                                onChange={(e) => setData('default_appreciation_rate', e.target.value)}
                                className="w-full input-dark rounded-xl py-3 px-4"
                            />
                            <p className="text-xs text-gray-500 mt-1">Annual property value increase</p>
                            {errors.default_appreciation_rate && (
                                <p className="text-red-400 text-sm mt-1">{errors.default_appreciation_rate}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                Projection Years
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="30"
                                value={data.calculator_projection_years}
                                onChange={(e) => setData('calculator_projection_years', e.target.value)}
                                className="w-full input-dark rounded-xl py-3 px-4"
                            />
                            <p className="text-xs text-gray-500 mt-1">Years to project in calculator</p>
                            {errors.calculator_projection_years && (
                                <p className="text-red-400 text-sm mt-1">{errors.calculator_projection_years}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Investment Limits */}
                <div className="glass-card rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                            <CurrencyDollarIcon className="h-5 w-5 text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">Investment Limits</h2>
                            <p className="text-sm text-gray-400">Global investment constraints</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                Minimum Investment (USD)
                            </label>
                            <input
                                type="number"
                                step="1"
                                min="0"
                                value={data.min_investment_global}
                                onChange={(e) => setData('min_investment_global', e.target.value)}
                                className="w-full input-dark rounded-xl py-3 px-4"
                            />
                            {errors.min_investment_global && (
                                <p className="text-red-400 text-sm mt-1">{errors.min_investment_global}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                Maximum Investment (USD)
                            </label>
                            <input
                                type="number"
                                step="1"
                                min="0"
                                value={data.max_investment_global}
                                onChange={(e) => setData('max_investment_global', e.target.value)}
                                className="w-full input-dark rounded-xl py-3 px-4"
                            />
                            {errors.max_investment_global && (
                                <p className="text-red-400 text-sm mt-1">{errors.max_investment_global}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Commission Settings */}
                <div className="glass-card rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                            <UserGroupIcon className="h-5 w-5 text-orange-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">Commission Settings</h2>
                            <p className="text-sm text-gray-400">Referral and agent commissions</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                Referral Commission Rate (%)
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                value={data.referral_commission_rate}
                                onChange={(e) => setData('referral_commission_rate', e.target.value)}
                                className="w-full input-dark rounded-xl py-3 px-4"
                            />
                            <p className="text-xs text-gray-500 mt-1">Commission for user referrals</p>
                            {errors.referral_commission_rate && (
                                <p className="text-red-400 text-sm mt-1">{errors.referral_commission_rate}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                Agent Commission Rate (%)
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                value={data.agent_commission_rate}
                                onChange={(e) => setData('agent_commission_rate', e.target.value)}
                                className="w-full input-dark rounded-xl py-3 px-4"
                            />
                            <p className="text-xs text-gray-500 mt-1">Commission for verified agents</p>
                            {errors.agent_commission_rate && (
                                <p className="text-red-400 text-sm mt-1">{errors.agent_commission_rate}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={processing}
                        className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                    >
                        {processing ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </form>
        </AdminLayout>
    );
}
