import { Link, usePage } from '@inertiajs/react';
import { Fragment, useState, useEffect, useRef } from 'react';
import { Dialog, Transition, Menu } from '@headlessui/react';
import {
    Bars3Icon,
    XMarkIcon,
    UserCircleIcon,
    ChevronDownIcon,
    CubeTransparentIcon,
    WalletIcon,
    ArrowRightOnRectangleIcon,
    Cog6ToothIcon,
    Squares2X2Icon,
    ShieldCheckIcon,
    SunIcon,
    MoonIcon,
    UserGroupIcon,
} from '@heroicons/react/24/outline';
import { useAppKit } from '@reown/appkit/react';
import { useAccount, useDisconnect } from 'wagmi';
import type { PageProps } from '@/Types';
import { useTheme } from '@/contexts/ThemeContext';

interface MainLayoutProps {
    children: React.ReactNode;
}

const navigation = [
    { name: 'Home', href: '/' },
    { name: 'Properties', href: '/properties' },
    { name: 'Marketplace', href: '/marketplace' },
    { name: 'About', href: '/about' },
    { name: 'FAQ', href: '/faq' },
    { name: 'Contact', href: '/contact' },
];

export default function MainLayout({ children }: MainLayoutProps) {
    const { auth, flash } = usePage<PageProps>().props;
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { theme, toggleTheme } = useTheme();
    const { open } = useAppKit();
    const { address, isConnected } = useAccount();
    const { disconnect } = useDisconnect();

    // Active nav indicator
    const [activeItem, setActiveItem] = useState('Home');
    const indicatorRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Determine active nav item based on current path
    useEffect(() => {
        const path = window.location.pathname;
        const active = navigation.find(item => {
            if (item.href === '/') return path === '/';
            return path.startsWith(item.href);
        });
        if (active) setActiveItem(active.name);
    }, []);

    // Update indicator position
    useEffect(() => {
        const updateIndicator = () => {
            const activeEl = document.querySelector(`[data-nav-item="${activeItem}"]`) as HTMLElement;
            if (activeEl && indicatorRef.current && menuRef.current) {
                const menuRect = menuRef.current.getBoundingClientRect();
                const itemRect = activeEl.getBoundingClientRect();
                indicatorRef.current.style.width = `${itemRect.width}px`;
                indicatorRef.current.style.left = `${itemRect.left - menuRect.left}px`;
            }
        };
        updateIndicator();
        window.addEventListener('resize', updateIndicator);
        return () => window.removeEventListener('resize', updateIndicator);
    }, [activeItem]);

    const shortenAddress = (addr: string) => {
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    return (
        <div className="min-h-screen bg-white dark:bg-dark-950 relative">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 dark:bg-dark-950/80 backdrop-blur-xl border-b border-gray-200 dark:border-white/5">
                <nav className="container mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2">
                        <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                            RWAPlatform
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden lg:block">
                        <div
                            ref={menuRef}
                            className="relative flex items-center gap-6 rounded-full px-8 py-3"
                        >
                            {navigation.map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    data-nav-item={item.name}
                                    onClick={() => setActiveItem(item.name)}
                                    className={`relative cursor-pointer text-sm font-medium transition-colors ${
                                        activeItem === item.name
                                            ? 'text-gray-900 dark:text-white'
                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                                >
                                    {item.name}
                                </Link>
                            ))}
                            {/* Active Indicator */}
                            <div
                                ref={indicatorRef}
                                className="absolute bottom-2 flex h-1 items-center justify-center px-2 transition-all duration-300"
                            >
                                <div className="h-0.5 w-full rounded-full bg-gray-900 dark:bg-white transition-all duration-300" />
                            </div>
                        </div>
                    </div>

                    {/* Right Actions */}
                    <div className="hidden lg:flex items-center gap-3">
                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="p-2.5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
                            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                        >
                            {theme === 'dark' ? (
                                <SunIcon className="w-5 h-5" />
                            ) : (
                                <MoonIcon className="w-5 h-5" />
                            )}
                        </button>

                        {isConnected ? (
                            <button
                                onClick={() => open()}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
                            >
                                <WalletIcon className="w-4 h-4 text-blue-500" />
                                <span>{shortenAddress(address!)}</span>
                            </button>
                        ) : (
                            <button
                                onClick={() => open()}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-all"
                            >
                                <WalletIcon className="w-4 h-4" />
                                <span>Connect</span>
                            </button>
                        )}

                        {auth.user ? (
                            <Menu as="div" className="relative">
                                <Menu.Button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-all border border-gray-200 dark:border-white/10">
                                    <span>{auth.user.name}</span>
                                    <ChevronDownIcon className="w-4 h-4" />
                                </Menu.Button>
                                <Transition
                                    as={Fragment}
                                    enter="transition ease-out duration-200"
                                    enterFrom="transform opacity-0 scale-95 translate-y-2"
                                    enterTo="transform opacity-100 scale-100 translate-y-0"
                                    leave="transition ease-in duration-150"
                                    leaveFrom="transform opacity-100 scale-100 translate-y-0"
                                    leaveTo="transform opacity-0 scale-95 translate-y-2"
                                >
                                    <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right bg-white dark:bg-gray-900 rounded-xl py-2 shadow-xl border border-gray-200 dark:border-white/10 focus:outline-none">
                                        <div className="px-4 py-3 border-b border-gray-100 dark:border-white/5">
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Signed in as</p>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{auth.user.email}</p>
                                        </div>
                                        <div className="py-1">
                                            <Menu.Item>
                                                {({ active }) => (
                                                    <Link
                                                        href="/dashboard"
                                                        className={`${active ? 'bg-gray-50 dark:bg-white/5' : ''} flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300`}
                                                    >
                                                        <Squares2X2Icon className="w-5 h-5" />
                                                        <span>Dashboard</span>
                                                    </Link>
                                                )}
                                            </Menu.Item>
                                            <Menu.Item>
                                                {({ active }) => (
                                                    <Link
                                                        href="/dashboard/portfolio"
                                                        className={`${active ? 'bg-gray-50 dark:bg-white/5' : ''} flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300`}
                                                    >
                                                        <WalletIcon className="w-5 h-5" />
                                                        <span>My Portfolio</span>
                                                    </Link>
                                                )}
                                            </Menu.Item>
                                            <Menu.Item>
                                                {({ active }) => (
                                                    <Link
                                                        href="/dashboard/settings"
                                                        className={`${active ? 'bg-gray-50 dark:bg-white/5' : ''} flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300`}
                                                    >
                                                        <Cog6ToothIcon className="w-5 h-5" />
                                                        <span>Settings</span>
                                                    </Link>
                                                )}
                                            </Menu.Item>
                                            <Menu.Item>
                                                {({ active }) => (
                                                    <Link
                                                        href="/referral"
                                                        className={`${active ? 'bg-gray-50 dark:bg-white/5' : ''} flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300`}
                                                    >
                                                        <UserGroupIcon className="w-5 h-5" />
                                                        <span>Referral Program</span>
                                                    </Link>
                                                )}
                                            </Menu.Item>
                                        </div>
                                        {auth.user.is_admin && (
                                            <div className="py-1 border-t border-gray-100 dark:border-white/5">
                                                <Menu.Item>
                                                    {({ active }) => (
                                                        <Link
                                                            href="/admin"
                                                            className={`${active ? 'bg-gray-50 dark:bg-white/5' : ''} flex items-center gap-3 px-4 py-2.5 text-sm text-blue-600 dark:text-blue-400`}
                                                        >
                                                            <ShieldCheckIcon className="w-5 h-5" />
                                                            <span>Admin Panel</span>
                                                        </Link>
                                                    )}
                                                </Menu.Item>
                                            </div>
                                        )}
                                        <div className="py-1 border-t border-gray-100 dark:border-white/5">
                                            <Menu.Item>
                                                {({ active }) => (
                                                    <Link
                                                        href="/logout"
                                                        method="post"
                                                        as="button"
                                                        className={`${active ? 'bg-gray-50 dark:bg-white/5' : ''} flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 hover:text-red-500`}
                                                    >
                                                        <ArrowRightOnRectangleIcon className="w-5 h-5" />
                                                        <span>Sign out</span>
                                                    </Link>
                                                )}
                                            </Menu.Item>
                                        </div>
                                    </Menu.Items>
                                </Transition>
                            </Menu>
                        ) : (
                            <Link
                                href="/register"
                                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
                            >
                                Sign Up
                            </Link>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="flex items-center gap-2 lg:hidden">
                        {/* Theme Toggle Mobile */}
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
                        >
                            {theme === 'dark' ? (
                                <SunIcon className="w-5 h-5" />
                            ) : (
                                <MoonIcon className="w-5 h-5" />
                            )}
                        </button>
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="relative p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
                        >
                            <div className="relative w-6 h-6 flex items-center justify-center">
                                <Bars3Icon
                                    className={`absolute w-6 h-6 transition-all duration-300 ${
                                        mobileMenuOpen ? 'rotate-90 opacity-0' : 'rotate-0 opacity-100'
                                    }`}
                                />
                                <XMarkIcon
                                    className={`absolute w-6 h-6 transition-all duration-300 ${
                                        mobileMenuOpen ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0'
                                    }`}
                                />
                            </div>
                        </button>
                    </div>
                </nav>

                {/* Mobile Menu */}
                <Transition
                    show={mobileMenuOpen}
                    as={Fragment}
                    enter="transition ease-out duration-200"
                    enterFrom="opacity-0 -translate-y-2"
                    enterTo="opacity-100 translate-y-0"
                    leave="transition ease-in duration-150"
                    leaveFrom="opacity-100 translate-y-0"
                    leaveTo="opacity-0 -translate-y-2"
                >
                    <div className="lg:hidden absolute top-full left-0 right-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-white/10 shadow-xl">
                        <div className="container mx-auto px-4 py-4">
                            <div className="space-y-1">
                                {navigation.map((item) => (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        onClick={() => {
                                            setActiveItem(item.name);
                                            setMobileMenuOpen(false);
                                        }}
                                        className={`flex items-center px-4 py-3 text-sm font-medium border-l-[3px] transition-all ${
                                            activeItem === item.name
                                                ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
                                                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                        }`}
                                    >
                                        {item.name}
                                    </Link>
                                ))}
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 space-y-3">
                                {isConnected ? (
                                    <button
                                        onClick={() => open()}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/5"
                                    >
                                        <WalletIcon className="w-4 h-4 text-blue-500" />
                                        <span>{shortenAddress(address!)}</span>
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => open()}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-white bg-blue-600"
                                    >
                                        <WalletIcon className="w-4 h-4" />
                                        <span>Connect Wallet</span>
                                    </button>
                                )}
                                {!auth.user && (
                                    <Link
                                        href="/register"
                                        className="block w-full text-center px-4 py-3 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        Sign Up
                                    </Link>
                                )}
                                {auth.user && (
                                    <div className="space-y-1 pt-2">
                                        <Link
                                            href="/dashboard"
                                            className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg"
                                            onClick={() => setMobileMenuOpen(false)}
                                        >
                                            <Squares2X2Icon className="w-5 h-5" />
                                            <span>Dashboard</span>
                                        </Link>
                                        <Link
                                            href="/referral"
                                            className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg"
                                            onClick={() => setMobileMenuOpen(false)}
                                        >
                                            <UserGroupIcon className="w-5 h-5" />
                                            <span>Referral Program</span>
                                        </Link>
                                        {auth.user.is_admin && (
                                            <Link
                                                href="/admin"
                                                className="flex items-center gap-3 px-4 py-3 text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg"
                                                onClick={() => setMobileMenuOpen(false)}
                                            >
                                                <ShieldCheckIcon className="w-5 h-5" />
                                                <span>Admin Panel</span>
                                            </Link>
                                        )}
                                        <Link
                                            href="/logout"
                                            method="post"
                                            as="button"
                                            className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 rounded-lg"
                                        >
                                            <ArrowRightOnRectangleIcon className="w-5 h-5" />
                                            <span>Sign out</span>
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </Transition>
            </header>

            {/* Flash Messages */}
            {(flash.success || flash.error) && (
                <div className="relative z-40 container mx-auto px-4 sm:px-6 lg:px-8 mt-4">
                    {flash.success && (
                        <div className="rounded-xl p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <p className="text-sm text-emerald-800 dark:text-emerald-300">{flash.success}</p>
                            </div>
                        </div>
                    )}
                    {flash.error && (
                        <div className="rounded-xl p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </div>
                                <p className="text-sm text-red-800 dark:text-red-300">{flash.error}</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Main Content */}
            <main className="relative z-10">{children}</main>

            {/* Footer */}
            <footer className="relative z-10 border-t border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-dark-950">
                <div className="container mx-auto px-4 py-16 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                        {/* Brand */}
                        <div className="col-span-1 md:col-span-2">
                            <Link href="/" className="inline-block">
                                <span className="text-xl font-bold text-gray-900 dark:text-white">
                                    RWAPlatform
                                </span>
                            </Link>
                            <p className="mt-4 text-gray-600 dark:text-gray-400 text-sm max-w-md leading-relaxed">
                                Revolutionizing real estate investment through blockchain technology.
                                Own fractional shares of premium properties with complete transparency
                                and security.
                            </p>
                            <div className="mt-6 flex items-center gap-4">
                                <a href="#" className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                                    </svg>
                                </a>
                                <a href="#" className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                                    </svg>
                                </a>
                                <a href="#" className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                    </svg>
                                </a>
                            </div>
                        </div>

                        {/* Platform Links */}
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Platform</h3>
                            <ul className="space-y-3">
                                <li>
                                    <Link href="/properties" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm transition-colors">
                                        Browse Properties
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/about" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm transition-colors">
                                        About Us
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/faq" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm transition-colors">
                                        FAQ
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/contact" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm transition-colors">
                                        Contact
                                    </Link>
                                </li>
                            </ul>
                        </div>

                        {/* Legal Links */}
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Legal</h3>
                            <ul className="space-y-3">
                                <li>
                                    <Link href="#" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm transition-colors">
                                        Privacy Policy
                                    </Link>
                                </li>
                                <li>
                                    <Link href="#" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm transition-colors">
                                        Terms of Service
                                    </Link>
                                </li>
                                <li>
                                    <Link href="#" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm transition-colors">
                                        Cookie Policy
                                    </Link>
                                </li>
                                <li>
                                    <Link href="#" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm transition-colors">
                                        Risk Disclosure
                                    </Link>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Bottom bar */}
                    <div className="mt-12 pt-8 border-t border-gray-200 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                            &copy; {new Date().getFullYear()} RWAPlatform. All rights reserved.
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            <span>Powered by</span>
                            <span className="font-semibold text-gray-900 dark:text-white">Blockchain Technology</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
