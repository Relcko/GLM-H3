import { Head, useForm } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import {
    UsersIcon,
    CurrencyDollarIcon,
    ChartBarIcon,
    ClockIcon,
} from '@heroicons/react/24/outline';

interface Agent {
    id: number;
    status: string;
    created_at: string;
}

interface Props {
    hasApplied: boolean;
    agent?: Agent;
}

export default function ReferralApply({ hasApplied, agent }: Props) {
    const form = useForm({
        company_name: '',
        license_number: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/referral/apply');
    };

    if (hasApplied && agent) {
        return (
            <MainLayout>
                <Head title="Agent Application" />

                <div className="min-h-screen bg-gray-50 dark:bg-dark-950 py-16">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl">
                        <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-white/5 p-8 text-center">
                            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-yellow-100 dark:bg-yellow-500/20 flex items-center justify-center">
                                <ClockIcon className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                Application Pending
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                Your agent application is currently under review. We'll notify you once it's approved.
                            </p>
                            <div className="p-4 bg-gray-50 dark:bg-dark-700 rounded-xl">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Applied on: {new Date(agent.created_at).toLocaleDateString()}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Status: <span className="font-medium text-yellow-600">{agent.status}</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <Head title="Become an Agent" />

            <div className="min-h-screen bg-gray-50 dark:bg-dark-950 py-16">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                            Become a Referral Agent
                        </h1>
                        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                            Earn commissions by referring new investors to our platform. Join our agent program today!
                        </p>
                    </div>

                    {/* Benefits */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                        <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-white/5 p-6 text-center">
                            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                                <CurrencyDollarIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Earn Commissions</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Earn a percentage on every transaction made by your referrals
                            </p>
                        </div>

                        <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-white/5 p-6 text-center">
                            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
                                <UsersIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                            </div>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Unlimited Referrals</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                No limit on how many people you can refer to the platform
                            </p>
                        </div>

                        <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-white/5 p-6 text-center">
                            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
                                <ChartBarIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                            </div>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Lifetime Earnings</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Continue earning whenever your referrals buy or sell tokens
                            </p>
                        </div>
                    </div>

                    {/* Application Form */}
                    <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-white/5 p-8">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                            Apply to Join
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Company Name (optional)
                                </label>
                                <input
                                    type="text"
                                    value={form.data.company_name}
                                    onChange={(e) => form.setData('company_name', e.target.value)}
                                    placeholder="Enter your company name"
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-white/10 rounded-xl"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    License Number (optional)
                                </label>
                                <input
                                    type="text"
                                    value={form.data.license_number}
                                    onChange={(e) => form.setData('license_number', e.target.value)}
                                    placeholder="Real estate license number if applicable"
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-white/10 rounded-xl"
                                />
                            </div>

                            <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl">
                                <p className="text-sm text-blue-800 dark:text-blue-300">
                                    By applying, you agree to our Agent Terms of Service. Your application will be reviewed by our team, and you will be notified once approved.
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={form.processing}
                                className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50"
                            >
                                {form.processing ? 'Submitting...' : 'Submit Application'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
