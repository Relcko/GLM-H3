import { Head, Link } from '@inertiajs/react';
import { Disclosure } from '@headlessui/react';
import {
    ChevronDownIcon,
    QuestionMarkCircleIcon,
    SparklesIcon,
    ShieldCheckIcon,
    CurrencyDollarIcon,
    WalletIcon,
    ChartBarIcon,
    GlobeAltIcon,
    DocumentTextIcon,
    ArrowRightIcon,
} from '@heroicons/react/24/outline';
import MainLayout from '@/Layouts/MainLayout';

const faqs = [
    {
        category: 'Getting Started',
        icon: SparklesIcon,
        color: 'blue',
        questions: [
            {
                question: 'What is RWA tokenization?',
                answer: 'RWA (Real World Asset) tokenization is the process of converting ownership rights to real-world assets, like real estate, into digital tokens on a blockchain. Each token represents a fraction of ownership, making it possible to invest in high-value assets with smaller amounts of capital.',
            },
            {
                question: 'How do I start investing?',
                answer: 'Getting started is easy: 1) Create an account using your email or by connecting your wallet, 2) Browse available properties on our marketplace, 3) Select a property and choose how many tokens you want to purchase, 4) Complete the transaction using USDT or other supported cryptocurrencies.',
            },
            {
                question: 'What is the minimum investment amount?',
                answer: 'The minimum investment varies by property, typically starting from $100. Each property listing displays its minimum investment requirement. This low barrier to entry allows anyone to start building a real estate portfolio.',
            },
        ],
    },
    {
        category: 'Returns & Earnings',
        icon: ChartBarIcon,
        color: 'emerald',
        questions: [
            {
                question: 'How do I earn returns?',
                answer: 'You can earn returns in two ways: 1) Rental Income - Property rental income is distributed proportionally to token holders, typically on a quarterly basis. 2) Capital Appreciation - As property values increase, so does the value of your tokens, which you can sell on secondary markets.',
            },
            {
                question: 'What happens if a property is sold?',
                answer: 'If a property is sold, the proceeds are distributed proportionally to all token holders. You would receive your share of the sale price minus any applicable fees, directly to your wallet. The tokens are then burned to reflect the change in ownership.',
            },
            {
                question: 'What fees are involved?',
                answer: 'We charge a small platform fee on transactions (typically 1-2%). Additionally, there are blockchain gas fees for transactions. Property management fees (8-12% of rental income) are deducted before distributions. All fees are transparently disclosed on each property listing.',
            },
        ],
    },
    {
        category: 'Security & Compliance',
        icon: ShieldCheckIcon,
        color: 'cyan',
        questions: [
            {
                question: 'Are my investments secure?',
                answer: 'Yes, your investments are secured through multiple layers: 1) Smart contracts ensure transparent and automated execution of all transactions, 2) Each property is legally structured through SPVs (Special Purpose Vehicles), 3) All properties undergo thorough due diligence before listing, 4) Your tokens are stored in your own wallet, giving you full control.',
            },
            {
                question: 'Do I need to complete KYC?',
                answer: 'KYC (Know Your Customer) requirements may apply depending on your jurisdiction and investment amount. Some properties may require KYC verification to comply with local regulations. We use secure, privacy-focused identity verification processes.',
            },
        ],
    },
    {
        category: 'Blockchain & Wallets',
        icon: WalletIcon,
        color: 'blue',
        questions: [
            {
                question: 'Which blockchains do you support?',
                answer: 'We currently support Ethereum and Binance Smart Chain (BSC). Each property specifies which blockchain it operates on. We plan to expand to additional chains in the future to provide more options and lower transaction costs.',
            },
            {
                question: 'Can I sell my tokens?',
                answer: 'Yes, you can sell your tokens at any time. Our platform will support peer-to-peer trading, and tokens can also be traded on decentralized exchanges. The liquidity varies depending on market conditions and demand for specific properties.',
            },
            {
                question: 'What wallets can I use?',
                answer: 'We support all major Web3 wallets including MetaMask, WalletConnect-compatible wallets, Coinbase Wallet, Trust Wallet, and more. You can also connect hardware wallets like Ledger for enhanced security.',
            },
        ],
    },
    {
        category: 'Property Management',
        icon: DocumentTextIcon,
        color: 'amber',
        questions: [
            {
                question: 'How are property management and maintenance handled?',
                answer: 'Each property has a professional management team that handles all operational aspects including tenant relations, maintenance, repairs, and rent collection. Management reports are shared regularly with token holders.',
            },
        ],
    },
];

const colorClasses = {
    blue: { bg: 'bg-blue-100 dark:bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-500/20' },
    emerald: { bg: 'bg-emerald-100 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-500/20' },
    cyan: { bg: 'bg-cyan-100 dark:bg-cyan-500/20', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-200 dark:border-cyan-500/20' },
    amber: { bg: 'bg-amber-100 dark:bg-amber-500/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-500/20' },
};

export default function FAQ() {
    return (
        <MainLayout>
            <Head title="FAQ" />

            {/* Hero */}
            <section className="relative py-20 overflow-hidden bg-gray-50 dark:bg-transparent">
                <div className="absolute inset-0 bg-gradient-to-b from-blue-100/50 dark:from-blue-950/50 to-transparent" />
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-200/30 dark:bg-blue-500/20 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-200/30 dark:bg-cyan-500/20 rounded-full blur-3xl" />

                <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
                    <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 mb-6">
                        <QuestionMarkCircleIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">Help Center</span>
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                        Frequently Asked <span className="gradient-text">Questions</span>
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                        Everything you need to know about investing in tokenized real estate on our platform.
                    </p>
                </div>
            </section>

            {/* FAQ Content */}
            <section className="py-20">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                    <div className="space-y-8">
                        {faqs.map((category, categoryIndex) => {
                            const colors = colorClasses[category.color as keyof typeof colorClasses];
                            return (
                                <div key={categoryIndex} className="bg-white dark:bg-white/[0.03] rounded-2xl p-6 border border-gray-200 dark:border-white/5 shadow-sm">
                                    <div className="flex items-center space-x-3 mb-6">
                                        <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center`}>
                                            <category.icon className={`h-5 w-5 ${colors.text}`} />
                                        </div>
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{category.category}</h2>
                                    </div>

                                    <div className="space-y-3">
                                        {category.questions.map((faq, index) => (
                                            <Disclosure key={index}>
                                                {({ open }) => (
                                                    <div className={`bg-gray-50 dark:bg-white/5 rounded-xl border ${open ? 'border-blue-300 dark:border-blue-500/30' : 'border-gray-200 dark:border-white/5'} transition-all`}>
                                                        <Disclosure.Button className="flex w-full items-center justify-between px-5 py-4 text-left">
                                                            <span className={`font-medium ${open ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                                                                {faq.question}
                                                            </span>
                                                            <ChevronDownIcon
                                                                className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${
                                                                    open ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''
                                                                }`}
                                                            />
                                                        </Disclosure.Button>
                                                        <Disclosure.Panel className="px-5 pb-4 text-gray-600 dark:text-gray-400 leading-relaxed">
                                                            {faq.answer}
                                                        </Disclosure.Panel>
                                                    </div>
                                                )}
                                            </Disclosure>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Contact CTA */}
                    <div className="mt-16 bg-white dark:bg-white/[0.03] rounded-2xl p-8 text-center relative overflow-hidden border border-gray-200 dark:border-white/5 shadow-sm">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-100/50 dark:from-blue-600/10 to-cyan-100/50 dark:to-cyan-600/10" />
                        <div className="relative">
                            <div className="w-16 h-16 rounded-2xl bg-gray-900 flex items-center justify-center mx-auto mb-6">
                                <QuestionMarkCircleIcon className="h-8 w-8 text-white" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Still have questions?</h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                                Can't find the answer you're looking for? Our support team is here to help you 24/7.
                            </p>
                            <Link
                                href="/contact"
                                className="inline-flex items-center space-x-2 bg-gray-900 text-white py-3 px-6 rounded-xl font-medium hover:bg-gray-800 transition-all"
                            >
                                <span>Contact Support</span>
                                <ArrowRightIcon className="h-4 w-4" />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </MainLayout>
    );
}
