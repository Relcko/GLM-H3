import { Head, Link } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import { Property } from '@/Types';
import PropertyCard from '@/Components/PropertyCard';
import { useState, useEffect } from 'react';
import {
    ArrowRightIcon,
    ChevronDownIcon,
    PlayCircleIcon,
    ShieldCheckIcon,
    CubeTransparentIcon,
    ChartBarIcon,
    GlobeAltIcon,
    BoltIcon,
    LockClosedIcon,
    UserGroupIcon,
    BanknotesIcon,
    ArrowTrendingUpIcon,
    CheckIcon,
    SparklesIcon,
    BuildingOffice2Icon,
    PlusIcon,
    StarIcon,
} from '@heroicons/react/24/outline';

interface HomeProps {
    featuredProperties: Property[];
    latestProperties: Property[];
    stats: {
        total_properties: number;
        total_value: number;
        total_investors: number;
        total_invested: number;
    };
}

const partners = [
    { name: 'Ethereum', logo: '⟠' },
    { name: 'Binance', logo: '◆' },
    { name: 'Chainlink', logo: '⬡' },
    { name: 'Polygon', logo: '⬢' },
    { name: 'Uniswap', logo: '🦄' },
];

const features = [
    {
        icon: CubeTransparentIcon,
        title: 'Tokenized Assets',
        description: 'Real estate properties converted into blockchain tokens for fractional ownership and seamless trading.',
        color: 'from-violet-500 to-purple-600',
    },
    {
        icon: ShieldCheckIcon,
        title: 'Institutional Security',
        description: 'Multi-signature wallets, audited smart contracts, and enterprise-grade infrastructure protection.',
        color: 'from-emerald-500 to-teal-600',
    },
    {
        icon: ChartBarIcon,
        title: 'Yield Generation',
        description: 'Earn passive income through rental yields and property appreciation, distributed automatically.',
        color: 'from-blue-500 to-cyan-600',
    },
    {
        icon: GlobeAltIcon,
        title: 'Global Marketplace',
        description: 'Access premium properties worldwide with 24/7 trading and instant settlement on-chain.',
        color: 'from-amber-500 to-orange-600',
    },
];

const processSteps = [
    {
        number: '01',
        title: 'Connect & Verify',
        description: 'Link your Web3 wallet and complete our streamlined KYC verification process.',
        icon: LockClosedIcon,
    },
    {
        number: '02',
        title: 'Explore Opportunities',
        description: 'Browse our curated selection of institutional-grade real estate investments.',
        icon: BuildingOffice2Icon,
    },
    {
        number: '03',
        title: 'Invest with Crypto',
        description: 'Purchase property tokens using USDT, USDC, ETH, or other supported assets.',
        icon: BanknotesIcon,
    },
    {
        number: '04',
        title: 'Earn & Trade',
        description: 'Receive yield distributions and trade your tokens on secondary markets.',
        icon: ArrowTrendingUpIcon,
    },
];

const faqs = [
    {
        question: 'What is real estate tokenization?',
        answer: 'Real estate tokenization is the process of converting property ownership rights into digital tokens on a blockchain. This enables fractional ownership, allowing investors to own a portion of high-value properties with smaller investment amounts while maintaining liquidity through secondary market trading.',
    },
    {
        question: 'How do I start investing?',
        answer: 'Getting started is simple: Connect your Web3 wallet (MetaMask, WalletConnect, etc.), complete our KYC verification, browse available properties, and purchase tokens using supported cryptocurrencies. Your investment is secured on-chain and you can track your portfolio in real-time.',
    },
    {
        question: 'What are the minimum investment requirements?',
        answer: 'Our platform democratizes real estate investing with a minimum investment of just $100. This low barrier to entry allows anyone to build a diversified real estate portfolio without the traditional capital requirements.',
    },
    {
        question: 'How do I receive rental income?',
        answer: 'Rental income is distributed proportionally to token holders on a monthly basis. Payments are made automatically to your connected wallet in USDT/USDC, with full transparency through on-chain transactions.',
    },
    {
        question: 'Are the smart contracts audited?',
        answer: 'Yes, all our smart contracts undergo rigorous security audits by leading blockchain security firms. We maintain a bug bounty program and implement multi-signature governance for critical operations.',
    },
    {
        question: 'Can I sell my tokens?',
        answer: 'Absolutely. Property tokens can be traded on our secondary marketplace or supported DEXs. This provides liquidity that traditional real estate investments lack, allowing you to exit positions when needed.',
    },
];

const testimonials = [
    {
        quote: "This platform has completely changed how I think about real estate investing. The transparency and ease of use are unmatched.",
        author: "Michael Chen",
        role: "Crypto Investor",
        avatar: "MC",
    },
    {
        quote: "Finally, a way to diversify into real estate without the massive capital requirements. The yield distributions are consistent and reliable.",
        author: "Sarah Williams",
        role: "Portfolio Manager",
        avatar: "SW",
    },
    {
        quote: "The institutional-grade security and audited smart contracts give me confidence in my investments. Truly next-generation.",
        author: "David Park",
        role: "DeFi Enthusiast",
        avatar: "DP",
    },
];

// Industry/Property Type cards for hover effect section
const propertyTypes = [
    {
        name: 'Residential',
        description: 'Premium residential properties including luxury apartments, villas, and multi-family units with stable rental yields.',
        image: '/images/6365645.jpg',
        url: '/properties?type=residential',
    },
    {
        name: 'Commercial',
        description: 'Office buildings, retail spaces, and mixed-use developments in prime locations with long-term lease agreements.',
        image: '/images/6379082.jpg',
        url: '/properties?type=commercial',
    },
    {
        name: 'Industrial',
        description: 'Warehouses, logistics centers, and manufacturing facilities benefiting from e-commerce growth.',
        image: '/images/5429482.jpg',
        url: '/properties?type=industrial',
    },
    {
        name: 'Land',
        description: 'Strategic land investments with development potential and long-term appreciation opportunities.',
        image: '/images/hand_coin_and_house.jpg',
        url: '/properties?type=land',
    },
];

function formatCurrency(value: number): string {
    if (value >= 1000000) {
        return '$' + (value / 1000000).toFixed(1) + 'M';
    }
    if (value >= 1000) {
        return '$' + (value / 1000).toFixed(0) + 'K';
    }
    return '$' + value.toFixed(0);
}

function FAQItem({ question, answer, isOpen, onToggle }: { question: string; answer: string; isOpen: boolean; onToggle: () => void }) {
    return (
        <div className="border-b border-gray-200 dark:border-white/10 last:border-0">
            <button
                onClick={onToggle}
                className="w-full py-6 flex items-center justify-between text-left group"
            >
                <span className="text-lg font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors pr-8">
                    {question}
                </span>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${isOpen ? 'bg-gray-900 text-white rotate-180' : 'bg-gray-100 dark:bg-white/10 text-gray-500'}`}>
                    <ChevronDownIcon className="w-4 h-4" />
                </div>
            </button>
            <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96 pb-6' : 'max-h-0'}`}>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    {answer}
                </p>
            </div>
        </div>
    );
}

function PropertyTypeCard({ item, index }: { item: typeof propertyTypes[0]; index: number }) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <Link
            href={item.url}
            className="group relative overflow-hidden bg-gray-900"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Default state: Image and heading */}
            <div
                className={`relative z-0 flex h-full min-h-[28rem] lg:min-h-[32rem] xl:min-h-[28rem] flex-col items-center justify-center transition-all duration-400 ${
                    isHovered ? 'opacity-0 pointer-events-none' : 'opacity-100'
                }`}
                style={{
                    clipPath: isHovered ? 'inset(0% 0% 100% 0%)' : 'inset(0% 0% 0% 0%)',
                    transition: 'clip-path 0.4s ease, opacity 0.4s ease',
                }}
            >
                <div className="absolute inset-0">
                    <img
                        src={item.image}
                        alt={item.name}
                        className="h-full w-full object-cover"
                    />
                    {/* Dark overlay for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/20 to-transparent" />
                </div>
                <h3 className="absolute bottom-10 text-lg font-medium text-white drop-shadow-lg">
                    {item.name}
                </h3>
            </div>

            {/* Black overlay - slides up from bottom */}
            <div
                className="absolute inset-0 z-10 bg-gray-900"
                style={{
                    transform: isHovered ? 'translateY(0%)' : 'translateY(100%)',
                    transition: 'transform 0.4s ease',
                }}
            />

            {/* Hover state: Description */}
            <div
                className={`absolute inset-0 z-20 flex min-h-[28rem] lg:min-h-[32rem] xl:min-h-[28rem] items-center justify-center p-8 transition-all duration-400 ${
                    isHovered ? 'opacity-100' : 'opacity-0'
                }`}
                style={{
                    transform: isHovered ? 'translateY(0)' : 'translateY(20px)',
                    transition: 'opacity 0.4s ease, transform 0.4s ease',
                    color: '#ffffff',
                }}
            >
                <div className="space-y-3">
                    <p className="font-medium opacity-90" style={{ color: '#ffffff' }}>Overview:</p>
                    <p style={{ color: '#ffffff' }}>{item.description}</p>
                </div>
            </div>

            {/* Plus button */}
            <div
                className="absolute top-4 right-4 z-30"
                style={{
                    opacity: isHovered ? 1 : 0.7,
                    transform: isHovered ? 'rotate(90deg)' : 'rotate(0)',
                    transition: 'opacity 0.4s ease, transform 0.4s ease',
                }}
            >
                <div className="relative rounded-full p-2">
                    <div className={`absolute inset-0 rounded-full transition-all duration-400 ${isHovered ? 'bg-white/30' : 'bg-black/40'}`} />
                    <PlusIcon className="relative z-10 w-4 h-4 text-white" />
                </div>
            </div>
        </Link>
    );
}

export default function Home({ featuredProperties, latestProperties, stats: propStats }: HomeProps) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [openFaq, setOpenFaq] = useState<number | null>(0);
    const [activeTestimonial, setActiveTestimonial] = useState(0);

    useEffect(() => {
        setIsLoaded(true);

        const interval = setInterval(() => {
            setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <MainLayout>
            <Head title="Tokenized Real Estate Investment Platform" />

            {/* ==================== HERO SECTION ==================== */}
            <section className="relative min-h-[90vh] flex items-center overflow-hidden">
                {/* Background Image with Overlay */}
                <div className="absolute inset-0">
                    <img
                        src="/images/82303a59-723d-400f-9376-b9545fdcc059.jpg"
                        alt="Real Estate Investment"
                        className="w-full h-full object-cover"
                    />
                    {/* Light mode overlay - slightly darker for readability */}
                    <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/80 to-white/60 dark:from-gray-900/95 dark:via-gray-900/90 dark:to-gray-900/70" />
                    {/* Additional gradient for better text contrast */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/50 dark:to-gray-900/50" />
                </div>

                <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-32">
                    {/* Badge */}
                    <Link
                        href="/properties"
                        className={`group mx-auto lg:mx-0 mb-4 flex w-fit items-center rounded-full bg-gray-100/80 dark:bg-white/10 px-4 py-2 text-sm backdrop-blur-sm transition-all duration-700 hover:bg-gray-200/80 dark:hover:bg-white/20 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}
                    >
                        <span className="mr-1 font-semibold text-gray-900 dark:text-white">What's new</span>
                        <div className="mx-2 h-3.5 w-px bg-gray-400 dark:bg-gray-500"></div>
                        <span className="text-gray-600 dark:text-gray-300">New properties available</span>
                        <ArrowRightIcon className="ml-2 inline w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform group-hover:translate-x-0.5" />
                    </Link>

                    {/* Main Heading */}
                    <h1 className={`mx-auto lg:mx-0 my-4 mb-6 max-w-3xl text-center lg:text-left text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 dark:text-white transition-all duration-700 delay-100 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                        Invest in premium real estate with blockchain technology.
                    </h1>

                    <p className={`mx-auto lg:mx-0 mb-8 max-w-2xl text-center lg:text-left text-gray-600 dark:text-gray-300 text-lg lg:text-xl transition-all duration-700 delay-200 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                        Access institutional-grade real estate through tokenization. Fractional ownership, transparent yields, and 24/7 liquidity for everyone.
                    </p>

                    {/* CTA Button */}
                    <div className={`flex justify-center lg:justify-start transition-all duration-700 delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                        <Link
                            href="/properties"
                            className="w-full sm:w-auto px-8 py-4 bg-gray-900 text-white rounded-lg text-base font-semibold shadow-lg hover:shadow-xl transition-all hover:bg-gray-800 lg:mt-10"
                        >
                            Get started for free
                        </Link>
                    </div>

                    {/* Trust Badges */}
                    <div className={`mt-8 lg:mt-12 transition-all duration-700 delay-500 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                        <ul className="flex flex-wrap justify-center lg:justify-start gap-6 text-sm lg:text-base">
                            <li className="flex items-center gap-2 whitespace-nowrap text-gray-700 dark:text-gray-300">
                                <ShieldCheckIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                Audited Smart Contracts
                            </li>
                            <li className="flex items-center gap-2 whitespace-nowrap text-gray-700 dark:text-gray-300">
                                <LockClosedIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                Bank-Grade Security
                            </li>
                            <li className="flex items-center gap-2 whitespace-nowrap text-gray-700 dark:text-gray-300">
                                <StarIcon className="w-5 h-5 text-amber-500" />
                                4.9 Investor Rating
                            </li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* ==================== PARTNERS SECTION ==================== */}
            <section className="py-16 border-y border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02]">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                        <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">
                            Powered by leading blockchain networks
                        </p>
                        <div className="flex items-center space-x-12">
                            {partners.map((partner) => (
                                <div key={partner.name} className="flex items-center space-x-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                                    <span className="text-2xl">{partner.logo}</span>
                                    <span className="font-medium hidden sm:inline">{partner.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ==================== PROPERTY TYPES / INDUSTRIES SECTION ==================== */}
            <section className="py-16">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="mb-8 text-3xl font-medium text-gray-900 dark:text-white">
                        Property Types
                    </h2>
                    <div className="grid grid-cols-1 gap-1 lg:grid-cols-2 xl:grid-cols-4">
                        {propertyTypes.map((item, index) => (
                            <PropertyTypeCard key={index} item={item} index={index} />
                        ))}
                    </div>
                </div>
            </section>

            {/* ==================== FEATURES SECTION ==================== */}
            <section className="py-24 lg:py-32 relative overflow-hidden bg-gray-50 dark:bg-white/[0.02]">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-20">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                            Why Choose Us
                        </p>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-6">
                            Built for the next generation of investors
                        </h2>
                        <p className="text-lg text-gray-600 dark:text-gray-400">
                            Combining institutional-grade infrastructure with cutting-edge blockchain technology.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {features.map((feature) => (
                            <div
                                key={feature.title}
                                className="group relative p-8 rounded-2xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10 transition-all duration-500 hover:-translate-y-2 hover:shadow-xl"
                            >
                                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                    <feature.icon className="w-7 h-7 text-white" />
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                                    {feature.title}
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                    {feature.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ==================== FEATURED PROPERTIES ==================== */}
            {featuredProperties.length > 0 && (
                <section className="py-24 lg:py-32">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                                    Featured Properties
                                </p>
                                <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                                    Premium investment opportunities
                                </h2>
                                <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
                                    Hand-picked properties with exceptional growth potential and verified returns.
                                </p>
                            </div>
                            <Link
                                href="/properties"
                                className="group inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-900 dark:text-white font-medium transition-all"
                            >
                                <span>View All Properties</span>
                                <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>

                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                            {featuredProperties.slice(0, 3).map((property) => (
                                <div key={property.id} className="transform hover:-translate-y-2 transition-all duration-300">
                                    <PropertyCard property={property} />
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* ==================== HOW IT WORKS ==================== */}
            <section className="py-24 lg:py-32 relative overflow-hidden bg-gray-50 dark:bg-white/[0.02]">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-20">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                            How It Works
                        </p>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-6">
                            Start investing in four simple steps
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {processSteps.map((step, index) => (
                            <div key={step.number} className="relative group text-center">
                                {index < processSteps.length - 1 && (
                                    <div className="hidden lg:block absolute top-8 left-[60%] w-[calc(100%-20%)] h-px">
                                        <div className="w-full h-full bg-gradient-to-r from-gray-300 dark:from-gray-600 via-gray-200 dark:via-gray-700 to-transparent" />
                                    </div>
                                )}

                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-900 text-white font-bold text-xl mb-6 shadow-lg group-hover:scale-110 transition-transform">
                                    {step.number}
                                </div>

                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                                    {step.title}
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400">
                                    {step.description}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="text-center mt-16">
                        <Link
                            href="/register"
                            className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-gray-900 text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:bg-gray-800"
                        >
                            <span>Get Started Now</span>
                            <ArrowRightIcon className="w-5 h-5" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* ==================== TESTIMONIALS ==================== */}
            <section className="py-24 lg:py-32">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                            Testimonials
                        </p>
                        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-6">
                            Trusted by investors worldwide
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {testimonials.map((testimonial, index) => (
                            <div
                                key={index}
                                className={`p-8 rounded-2xl bg-white dark:bg-white/[0.03] border transition-all duration-500 ${activeTestimonial === index ? 'border-gray-900 dark:border-white shadow-xl' : 'border-gray-200 dark:border-white/5'}`}
                            >
                                <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6 text-lg">
                                    "{testimonial.quote}"
                                </p>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-gray-900 dark:bg-white flex items-center justify-center text-white dark:text-gray-900 font-semibold">
                                        {testimonial.avatar}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900 dark:text-white">{testimonial.author}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{testimonial.role}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-center gap-2 mt-8">
                        {testimonials.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setActiveTestimonial(index)}
                                className={`h-2 rounded-full transition-all ${activeTestimonial === index ? 'w-8 bg-gray-900 dark:bg-white' : 'w-2 bg-gray-300 dark:bg-gray-600'}`}
                            />
                        ))}
                    </div>
                </div>
            </section>

            {/* ==================== FAQ SECTION ==================== */}
            <section className="py-24 lg:py-32 bg-gray-50 dark:bg-white/[0.02]">
                <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                            FAQ
                        </p>
                        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-6">
                            Frequently asked questions
                        </h2>
                    </div>

                    <div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/5 p-8 shadow-xl">
                        {faqs.map((faq, index) => (
                            <FAQItem
                                key={index}
                                question={faq.question}
                                answer={faq.answer}
                                isOpen={openFaq === index}
                                onToggle={() => setOpenFaq(openFaq === index ? null : index)}
                            />
                        ))}
                    </div>
                </div>
            </section>

            {/* ==================== CTA SECTION ==================== */}
            <section className="py-24 lg:py-32 relative overflow-hidden bg-gray-50 dark:bg-black border-t border-gray-200 dark:border-white/5">
                <div className="absolute inset-0 opacity-10 dark:opacity-20" style={{
                    backgroundImage: `linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)`,
                    backgroundSize: '40px 40px',
                }} />

                <div className="relative container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-6">
                        Ready to build your real estate portfolio?
                    </h2>
                    <p className="text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-2xl mx-auto">
                        Join thousands of investors already earning passive income through tokenized real estate.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            href="/register"
                            className="w-full sm:w-auto px-8 py-4 rounded-lg bg-gray-900 text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:bg-gray-800"
                        >
                            Create Free Account
                        </Link>
                        <Link
                            href="/properties"
                            className="w-full sm:w-auto px-8 py-4 rounded-lg border-2 border-gray-300 dark:border-white/30 text-gray-900 dark:text-white font-semibold hover:bg-gray-100 dark:hover:bg-white/10 transition-all"
                        >
                            Browse Properties
                        </Link>
                    </div>

                    <div className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
                        <div>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">$100</p>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Min. Investment</p>
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">12%</p>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Avg. Annual ROI</p>
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">0%</p>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Platform Fees</p>
                        </div>
                    </div>
                </div>
            </section>
        </MainLayout>
    );
}
