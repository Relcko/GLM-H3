import { Head, Link } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import {
    ShieldCheckIcon,
    GlobeAltIcon,
    ChartBarIcon,
    LockClosedIcon,
    ArrowRightIcon,
    UserGroupIcon,
    BuildingOffice2Icon,
    CubeTransparentIcon,
    BanknotesIcon,
} from '@heroicons/react/24/outline';

const values = [
    {
        name: 'Transparency',
        description: 'Every transaction is recorded on the blockchain, providing complete transparency and auditability.',
        icon: ShieldCheckIcon,
        gradient: 'from-blue-500 to-cyan-600',
    },
    {
        name: 'Accessibility',
        description: 'We believe everyone should have access to premium real estate investments, regardless of their capital.',
        icon: GlobeAltIcon,
        gradient: 'from-violet-500 to-purple-600',
    },
    {
        name: 'Innovation',
        description: 'We leverage cutting-edge blockchain technology to revolutionize property investment.',
        icon: ChartBarIcon,
        gradient: 'from-emerald-500 to-teal-600',
    },
    {
        name: 'Security',
        description: 'Your investments are secured by smart contracts and industry-leading security practices.',
        icon: LockClosedIcon,
        gradient: 'from-amber-500 to-orange-600',
    },
];

const stats = [
    { value: '$5M+', label: 'Total Property Value' },
    { value: '223+', label: 'Active Investors' },
    { value: '15+', label: 'Properties Listed' },
    { value: '16%', label: 'Avg. Annual ROI' },
];

const steps = [
    { step: '01', title: 'Create Account', description: 'Sign up with email or connect your wallet', icon: UserGroupIcon },
    { step: '02', title: 'Browse Properties', description: 'Explore our curated selection of properties', icon: BuildingOffice2Icon },
    { step: '03', title: 'Invest', description: 'Purchase tokens representing property ownership', icon: BanknotesIcon },
    { step: '04', title: 'Earn Returns', description: 'Receive rental income and capital appreciation', icon: ChartBarIcon },
];

const team = [
    { name: 'Dr. Satish Kumar', role: 'CEO & Co-Founder', avatar: 'SK' },
    { name: 'Sunil Dhanraj', role: 'CTO', avatar: 'SD' },
    { name: 'Michael Park', role: 'Head of Investments', avatar: 'MP' },
    { name: 'Emily Davis', role: 'Head of Legal', avatar: 'ED' },
];

export default function About() {
    return (
        <MainLayout>
            <Head title="About Us" />

            {/* Hero */}
            <section className="relative py-24 lg:py-32 overflow-hidden">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-3xl mx-auto text-center">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                            About Us
                        </p>
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
                            Democratizing real estate investment
                        </h1>
                        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
                            We're building the future of property investment through blockchain technology,
                            making premium real estate accessible to everyone.
                        </p>
                    </div>
                </div>
            </section>

            {/* Mission */}
            <section className="py-20 bg-gray-50 dark:bg-white/[0.02]">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                                Our Mission
                            </p>
                            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-6">
                                Making real estate investment accessible to all
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                                Traditional real estate investment has always been reserved for the wealthy.
                                High capital requirements, complex legal processes, and limited access have kept
                                most people out of one of the most stable and profitable asset classes.
                            </p>
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-8">
                                We're changing that. By tokenizing real-world assets on the blockchain, we enable
                                anyone to invest in premium properties with as little as $100. Our platform handles
                                all the complexity, from legal compliance to property management, so you can focus
                                on building your portfolio.
                            </p>
                            <Link
                                href="/properties"
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gray-900 text-white font-semibold hover:bg-gray-800 transition-all"
                            >
                                <span>Start Investing</span>
                                <ArrowRightIcon className="w-4 h-4" />
                            </Link>
                        </div>
                        <div className="bg-white dark:bg-white/[0.03] rounded-2xl p-8 border border-gray-200 dark:border-white/5 shadow-xl">
                            <div className="grid grid-cols-2 gap-8">
                                {stats.map((stat, index) => (
                                    <div key={index} className="text-center">
                                        <div className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">{stat.value}</div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Values */}
            <section className="py-24 lg:py-32">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                            Our Values
                        </p>
                        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                            The principles that guide us
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                            Everything we do is guided by our commitment to transparency, security, and accessibility.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {values.map((value) => (
                            <div key={value.name} className="group p-8 rounded-2xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10 transition-all hover:-translate-y-2 hover:shadow-xl">
                                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-r ${value.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                                    <value.icon className="h-7 w-7 text-white" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{value.name}</h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{value.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="py-24 lg:py-32 bg-gray-50 dark:bg-white/[0.02]">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                            How It Works
                        </p>
                        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                            Start investing in 4 simple steps
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                            From creating an account to earning passive income, we've made real estate investment as simple as possible.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        {steps.map((item, index) => (
                            <div key={item.step} className="relative group text-center">
                                {index < steps.length - 1 && (
                                    <div className="hidden md:block absolute top-8 left-[60%] w-[calc(100%-20%)] h-px">
                                        <div className="w-full h-full bg-gradient-to-r from-gray-300 dark:from-gray-600 via-gray-200 dark:via-gray-700 to-transparent" />
                                    </div>
                                )}
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-900 text-white font-bold text-xl mb-6 shadow-lg group-hover:scale-110 transition-transform">
                                    {item.step}
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{item.title}</h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{item.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Team */}
            <section className="py-24 lg:py-32">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                            Our Team
                        </p>
                        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                            Meet the experts behind the platform
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                            A dedicated team of professionals with expertise in blockchain, real estate, and finance.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
                        {team.map((member) => (
                            <div key={member.name} className="text-center group">
                                <div className="w-24 h-24 rounded-full bg-gray-900 dark:bg-white flex items-center justify-center text-white dark:text-gray-900 text-2xl font-bold mx-auto mb-4 group-hover:scale-110 transition-transform">
                                    {member.avatar}
                                </div>
                                <h3 className="font-semibold text-gray-900 dark:text-white">{member.name}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{member.role}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-24 lg:py-32 bg-gray-900 dark:bg-black">
                <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                        Ready to start your investment journey?
                    </h2>
                    <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
                        Join thousands of investors already building wealth through tokenized real estate.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            href="/register"
                            className="w-full sm:w-auto px-8 py-4 rounded-lg bg-white text-gray-900 font-semibold shadow-lg hover:shadow-xl transition-all hover:bg-gray-100"
                        >
                            Create Free Account
                        </Link>
                        <Link
                            href="/contact"
                            className="w-full sm:w-auto px-8 py-4 rounded-lg border-2 border-white/30 text-white font-semibold hover:bg-white/10 transition-all"
                        >
                            Contact Us
                        </Link>
                    </div>
                </div>
            </section>
        </MainLayout>
    );
}
