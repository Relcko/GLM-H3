import { Link, usePage } from '@inertiajs/react';
import { Fragment, useState } from 'react';
import { Dialog, Transition, Menu } from '@headlessui/react';
import {
    Bars3Icon,
    XMarkIcon,
    HomeIcon,
    BuildingOfficeIcon,
    UsersIcon,
    CurrencyDollarIcon,
    Cog6ToothIcon,
    ArrowLeftOnRectangleIcon,
    LinkIcon,
    CubeTransparentIcon,
    ChartBarIcon,
    ChevronDownIcon,
    WalletIcon,
    IdentificationIcon,
} from '@heroicons/react/24/outline';
import type { PageProps } from '@/Types';
import { useAppKit } from '@reown/appkit/react';
import { useAccount, useDisconnect } from 'wagmi';

interface AdminLayoutProps {
    children: React.ReactNode;
    title?: string;
}

const navigation = [
    { name: 'Dashboard', href: '/admin', icon: HomeIcon },
    { name: 'Properties', href: '/admin/properties', icon: BuildingOfficeIcon },
    { name: 'Users', href: '/admin/users', icon: UsersIcon },
    { name: 'Investments', href: '/admin/investments', icon: CurrencyDollarIcon },
    { name: 'Agents', href: '/admin/agents', icon: UsersIcon },
    { name: 'Commissions', href: '/admin/commissions', icon: CurrencyDollarIcon },
    { name: 'Trades', href: '/admin/trades', icon: ChartBarIcon },
    { name: 'KYC Verifications', href: '/admin/kyc', icon: IdentificationIcon },
    { name: 'Blockchain', href: '/admin/blockchain', icon: LinkIcon },
    { name: 'Settings', href: '/admin/settings', icon: Cog6ToothIcon },
];

function classNames(...classes: string[]) {
    return classes.filter(Boolean).join(' ');
}

export default function AdminLayout({ children, title }: AdminLayoutProps) {
    const { auth, flash } = usePage<PageProps>().props;
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const currentPath = window.location.pathname;

    const { open } = useAppKit();
    const { address, isConnected } = useAccount();
    const { disconnect } = useDisconnect();

    const formatAddress = (addr: string) => {
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    return (
        <div className="min-h-screen bg-dark-950">
            {/* Mobile sidebar */}
            <Transition.Root show={sidebarOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50 lg:hidden" onClose={setSidebarOpen}>
                    <Transition.Child
                        as={Fragment}
                        enter="transition-opacity ease-linear duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="transition-opacity ease-linear duration-300"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-dark-950/90 backdrop-blur-sm" />
                    </Transition.Child>

                    <div className="fixed inset-0 flex">
                        <Transition.Child
                            as={Fragment}
                            enter="transition ease-in-out duration-300 transform"
                            enterFrom="-translate-x-full"
                            enterTo="translate-x-0"
                            leave="transition ease-in-out duration-300 transform"
                            leaveFrom="translate-x-0"
                            leaveTo="-translate-x-full"
                        >
                            <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                                <Transition.Child
                                    as={Fragment}
                                    enter="ease-in-out duration-300"
                                    enterFrom="opacity-0"
                                    enterTo="opacity-100"
                                    leave="ease-in-out duration-300"
                                    leaveFrom="opacity-100"
                                    leaveTo="opacity-0"
                                >
                                    <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                                        <button type="button" className="-m-2.5 p-2.5" onClick={() => setSidebarOpen(false)}>
                                            <XMarkIcon className="h-6 w-6 text-white" />
                                        </button>
                                    </div>
                                </Transition.Child>
                                <div className="flex grow flex-col gap-y-5 overflow-y-auto glass-card border-r border-white/10 px-6 pb-4">
                                    <div className="flex h-16 shrink-0 items-center">
                                        <Link href="/admin" className="flex items-center space-x-3">
                                            <div className="w-10 h-10 gradient-bg rounded-xl flex items-center justify-center">
                                                <CubeTransparentIcon className="h-5 w-5 text-white" />
                                            </div>
                                            <span className="font-bold text-white text-lg">Admin</span>
                                        </Link>
                                    </div>
                                    <nav className="flex flex-1 flex-col">
                                        <ul className="flex flex-1 flex-col gap-y-7">
                                            <li>
                                                <ul className="-mx-2 space-y-1">
                                                    {navigation.map((item) => (
                                                        <li key={item.name}>
                                                            <Link
                                                                href={item.href}
                                                                className={classNames(
                                                                    currentPath === item.href
                                                                        ? 'bg-blue-600/20 text-blue-400 border-blue-500/30'
                                                                        : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent',
                                                                    'group flex gap-x-3 rounded-xl p-3 text-sm font-medium border transition-all'
                                                                )}
                                                            >
                                                                <item.icon className="h-5 w-5 shrink-0" />
                                                                {item.name}
                                                            </Link>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </li>
                                        </ul>
                                    </nav>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </Dialog>
            </Transition.Root>

            {/* Static sidebar for desktop */}
            <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
                <div className="flex grow flex-col gap-y-5 overflow-y-auto glass-card border-r border-white/10 px-6 pb-4">
                    <div className="flex h-16 shrink-0 items-center">
                        <Link href="/admin" className="flex items-center space-x-3">
                            <div className="w-10 h-10 gradient-bg rounded-xl flex items-center justify-center neon-glow">
                                <CubeTransparentIcon className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <span className="font-bold text-white text-lg">RWA Token</span>
                                <span className="block text-xs text-gray-500">Admin Panel</span>
                            </div>
                        </Link>
                    </div>
                    <nav className="flex flex-1 flex-col">
                        <ul className="flex flex-1 flex-col gap-y-7">
                            <li>
                                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">
                                    Main Menu
                                </div>
                                <ul className="-mx-2 space-y-1">
                                    {navigation.map((item) => (
                                        <li key={item.name}>
                                            <Link
                                                href={item.href}
                                                className={classNames(
                                                    currentPath === item.href || currentPath.startsWith(item.href + '/')
                                                        ? 'bg-blue-600/20 text-blue-400 border-blue-500/30'
                                                        : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent',
                                                    'group flex gap-x-3 rounded-xl p-3 text-sm font-medium border transition-all'
                                                )}
                                            >
                                                <item.icon className="h-5 w-5 shrink-0" />
                                                {item.name}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </li>
                            <li className="mt-auto">
                                <Link
                                    href="/"
                                    className="group -mx-2 flex gap-x-3 rounded-xl p-3 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 border border-transparent transition-all"
                                >
                                    <ArrowLeftOnRectangleIcon className="h-5 w-5 shrink-0" />
                                    Back to Site
                                </Link>
                            </li>
                        </ul>
                    </nav>
                </div>
            </div>

            {/* Main content */}
            <div className="lg:pl-72">
                {/* Top bar */}
                <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 glass border-b border-white/10 px-4 sm:gap-x-6 sm:px-6 lg:px-8">
                    <button
                        type="button"
                        className="-m-2.5 p-2.5 text-gray-400 lg:hidden"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Bars3Icon className="h-6 w-6" />
                    </button>

                    <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
                        <div className="flex flex-1 items-center">
                            {title && (
                                <h1 className="text-lg font-semibold text-white">{title}</h1>
                            )}
                        </div>
                        <div className="flex items-center gap-x-4 lg:gap-x-6">
                            {/* Wallet Connect Button */}
                            {isConnected ? (
                                <button
                                    onClick={() => disconnect()}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                                >
                                    <WalletIcon className="h-4 w-4" />
                                    <span className="text-sm font-medium">{formatAddress(address!)}</span>
                                </button>
                            ) : (
                                <button
                                    onClick={() => open()}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 transition-colors"
                                >
                                    <WalletIcon className="h-4 w-4" />
                                    <span className="text-sm font-medium">Connect Wallet</span>
                                </button>
                            )}

                            <Menu as="div" className="relative">
                                <Menu.Button className="flex items-center gap-x-3 p-2 rounded-xl hover:bg-white/5 transition-colors">
                                    <div className="h-9 w-9 rounded-xl gradient-bg flex items-center justify-center">
                                        <span className="text-white text-sm font-bold">
                                            {auth.user?.name?.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="hidden sm:block text-left">
                                        <span className="block text-sm font-medium text-white">{auth.user?.name}</span>
                                        <span className="block text-xs text-gray-500">Administrator</span>
                                    </div>
                                    <ChevronDownIcon className="h-4 w-4 text-gray-500 hidden sm:block" />
                                </Menu.Button>
                                <Transition
                                    as={Fragment}
                                    enter="transition ease-out duration-100"
                                    enterFrom="transform opacity-0 scale-95"
                                    enterTo="transform opacity-100 scale-100"
                                    leave="transition ease-in duration-75"
                                    leaveFrom="transform opacity-100 scale-100"
                                    leaveTo="transform opacity-0 scale-95"
                                >
                                    <Menu.Items className="absolute right-0 z-10 mt-2.5 w-48 origin-top-right rounded-xl glass-card border border-white/10 py-2 shadow-xl focus:outline-none">
                                        <Menu.Item>
                                            {({ active }) => (
                                                <Link
                                                    href="/dashboard"
                                                    className={classNames(
                                                        active ? 'bg-white/5' : '',
                                                        'block px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors'
                                                    )}
                                                >
                                                    User Dashboard
                                                </Link>
                                            )}
                                        </Menu.Item>
                                        <Menu.Item>
                                            {({ active }) => (
                                                <Link
                                                    href="/logout"
                                                    method="post"
                                                    as="button"
                                                    className={classNames(
                                                        active ? 'bg-white/5' : '',
                                                        'block w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors'
                                                    )}
                                                >
                                                    Sign out
                                                </Link>
                                            )}
                                        </Menu.Item>
                                    </Menu.Items>
                                </Transition>
                            </Menu>
                        </div>
                    </div>
                </div>

                {/* Flash Messages */}
                {(flash.success || flash.error) && (
                    <div className="px-4 sm:px-6 lg:px-8 mt-4">
                        {flash.success && (
                            <div className="rounded-xl glass p-4 border border-emerald-500/30 bg-emerald-500/10">
                                <p className="text-sm text-emerald-400">{flash.success}</p>
                            </div>
                        )}
                        {flash.error && (
                            <div className="rounded-xl glass p-4 border border-red-500/30 bg-red-500/10">
                                <p className="text-sm text-red-400">{flash.error}</p>
                            </div>
                        )}
                    </div>
                )}

                <main className="py-6">
                    <div className="px-4 sm:px-6 lg:px-8">{children}</div>
                </main>
            </div>
        </div>
    );
}
