import { Head, Link, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import PropertyCard from '@/Components/PropertyCard';
import { Property } from '@/Types';
import {
    MagnifyingGlassIcon,
    XMarkIcon,
    AdjustmentsHorizontalIcon,
    BuildingOffice2Icon,
    Squares2X2Icon,
    ListBulletIcon,
    MapPinIcon,
    CubeTransparentIcon,
    CheckIcon,
    ArrowRightIcon,
    FunnelIcon,
    ShieldCheckIcon,
    ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';

interface PropertiesIndexProps {
    properties: {
        data: Property[];
        links: any;
        meta?: any;
    };
    filters: {
        type?: string;
        location?: string;
        min_price?: string;
        max_price?: string;
        blockchain?: string;
        status?: string;
        sort?: string;
        direction?: string;
    };
}

const propertyTypes = [
    { value: '', label: 'All' },
    { value: 'residential', label: 'Residential' },
    { value: 'commercial', label: 'Commercial' },
    { value: 'industrial', label: 'Industrial' },
    { value: 'land', label: 'Land' },
];

const statusOptions = [
    { value: '', label: 'All Status', color: 'gray' },
    { value: 'active', label: 'Active', color: 'emerald' },
    { value: 'upcoming', label: 'Upcoming', color: 'amber' },
    { value: 'sold_out', label: 'Sold Out', color: 'red' },
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

export default function PropertiesIndex({ properties, filters }: PropertiesIndexProps) {
    const [showFilters, setShowFilters] = useState(false);
    const [localFilters, setLocalFilters] = useState(filters);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        setIsLoaded(true);
    }, []);

    const applyFilters = () => {
        router.get('/properties', localFilters, { preserveState: true });
    };

    const clearFilters = () => {
        setLocalFilters({});
        router.get('/properties');
    };

    const activeFiltersCount = Object.values(localFilters).filter(Boolean).length;

    const totalValue = properties.data.reduce((sum, p) => sum + (p.total_tokens * p.token_price), 0);
    const avgRoi = properties.data.length > 0
        ? properties.data.reduce((sum, p) => sum + p.expected_roi, 0) / properties.data.length
        : 0;

    return (
        <MainLayout>
            <Head title="Properties - Investment Opportunities" />

            {/* Hero Section */}
            <section className="relative py-24 lg:py-32 overflow-hidden">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-3xl">
                        <p className={`text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 transition-all duration-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
                            Investment Marketplace
                        </p>

                        <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6 transition-all duration-700 delay-100 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                            Discover premium properties
                        </h1>

                        <p className={`text-lg text-gray-600 dark:text-gray-400 mb-10 transition-all duration-700 delay-200 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                            Browse our curated selection of tokenized real estate with verified returns,
                            transparent ownership, and blockchain-secured transactions.
                        </p>

                        {/* Quick Stats */}
                        <div className={`grid grid-cols-2 sm:grid-cols-4 gap-4 transition-all duration-700 delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                            <div className="p-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/5">
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{properties.data.length}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Properties</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/5">
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalValue)}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Total Value</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/5">
                                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{avgRoi.toFixed(1)}%</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Avg. ROI</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/5">
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">$100</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Min. Invest</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Filter Bar */}
            <section className="sticky top-16 z-30 bg-white/80 dark:bg-dark-950/80 backdrop-blur-xl border-b border-gray-200 dark:border-white/5">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between py-4 gap-4">
                        {/* Property Type Tabs */}
                        <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar">
                            {propertyTypes.map((type) => (
                                <button
                                    key={type.value}
                                    onClick={() => {
                                        const newFilters = { ...localFilters, type: type.value || undefined };
                                        if (!type.value) delete newFilters.type;
                                        setLocalFilters(newFilters);
                                        router.get('/properties', newFilters, { preserveState: true });
                                    }}
                                    className={`px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                                        (localFilters.type || '') === type.value
                                            ? 'bg-gray-900 text-white'
                                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
                                    }`}
                                >
                                    {type.label}
                                </button>
                            ))}
                        </div>

                        {/* Right Controls */}
                        <div className="flex items-center gap-3">
                            {/* View Toggle */}
                            <div className="hidden sm:flex items-center bg-gray-100 dark:bg-white/5 rounded-lg p-1">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                                >
                                    <Squares2X2Icon className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                                >
                                    <ListBulletIcon className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Filter Button */}
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                                    activeFiltersCount > 0 || showFilters
                                        ? 'bg-gray-900 text-white border-transparent'
                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
                                }`}
                            >
                                <FunnelIcon className="w-4 h-4" />
                                <span className="hidden sm:inline">Filters</span>
                                {activeFiltersCount > 0 && (
                                    <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center ${
                                        showFilters ? 'bg-white/20' : 'bg-gray-900 text-white'
                                    }`}>
                                        {activeFiltersCount}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Main Content */}
            <section className="py-12">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Filters Sidebar */}
                        <div className={`lg:w-80 flex-shrink-0 transition-all duration-300 ${showFilters ? 'block' : 'hidden lg:block'}`}>
                            <div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/5 p-6 sticky top-36 shadow-xl">
                                {/* Header */}
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                                            <AdjustmentsHorizontalIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                        </div>
                                        <h2 className="font-semibold text-gray-900 dark:text-white">Filters</h2>
                                    </div>
                                    {activeFiltersCount > 0 && (
                                        <button
                                            onClick={clearFilters}
                                            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-1"
                                        >
                                            <XMarkIcon className="w-4 h-4" />
                                            <span>Clear</span>
                                        </button>
                                    )}
                                </div>

                                {/* Status Filter */}
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                        Status
                                    </label>
                                    <div className="space-y-2">
                                        {statusOptions.map((status) => (
                                            <button
                                                key={status.value}
                                                onClick={() => setLocalFilters({ ...localFilters, status: status.value || undefined })}
                                                className={`w-full flex items-center justify-between p-3 rounded-xl text-sm transition-all ${
                                                    (localFilters.status || '') === status.value
                                                        ? 'bg-gray-900 text-white'
                                                        : 'bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-white/20'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className={`w-2 h-2 rounded-full ${
                                                        status.color === 'emerald' ? 'bg-emerald-500' :
                                                        status.color === 'amber' ? 'bg-amber-500' :
                                                        status.color === 'red' ? 'bg-red-500' : 'bg-gray-400'
                                                    }`} />
                                                    <span>{status.label}</span>
                                                </div>
                                                {(localFilters.status || '') === status.value && (
                                                    <CheckIcon className="w-4 h-4" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Blockchain Filter */}
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                        Blockchain
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => setLocalFilters({ ...localFilters, blockchain: localFilters.blockchain === 'ethereum' ? '' : 'ethereum' })}
                                            className={`p-4 rounded-xl text-center transition-all ${
                                                localFilters.blockchain === 'ethereum'
                                                    ? 'bg-gray-900 text-white'
                                                    : 'bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-white/20'
                                            }`}
                                        >
                                            <span className="text-xl mb-2 block">⟠</span>
                                            <span className="text-sm font-medium">Ethereum</span>
                                        </button>
                                        <button
                                            onClick={() => setLocalFilters({ ...localFilters, blockchain: localFilters.blockchain === 'bsc' ? '' : 'bsc' })}
                                            className={`p-4 rounded-xl text-center transition-all ${
                                                localFilters.blockchain === 'bsc'
                                                    ? 'bg-gray-900 text-white'
                                                    : 'bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-white/20'
                                            }`}
                                        >
                                            <span className="text-xl mb-2 block">◆</span>
                                            <span className="text-sm font-medium">BSC</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Location */}
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                        Location
                                    </label>
                                    <div className="relative">
                                        <MapPinIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="City or Country"
                                            value={localFilters.location || ''}
                                            onChange={(e) => setLocalFilters({ ...localFilters, location: e.target.value })}
                                            className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-gray-900/20 dark:focus:ring-white/20 focus:border-gray-900/50 dark:focus:border-white/30 transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Price Range */}
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                        Investment Range
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <input
                                            type="number"
                                            placeholder="Min $"
                                            value={localFilters.min_price || ''}
                                            onChange={(e) => setLocalFilters({ ...localFilters, min_price: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-gray-900/20 dark:focus:ring-white/20 focus:border-gray-900/50 dark:focus:border-white/30 transition-all"
                                        />
                                        <input
                                            type="number"
                                            placeholder="Max $"
                                            value={localFilters.max_price || ''}
                                            onChange={(e) => setLocalFilters({ ...localFilters, max_price: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-gray-900/20 dark:focus:ring-white/20 focus:border-gray-900/50 dark:focus:border-white/30 transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Apply Button */}
                                <button
                                    onClick={applyFilters}
                                    className="w-full py-3 px-4 rounded-xl bg-gray-900 text-white font-semibold hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
                                >
                                    <MagnifyingGlassIcon className="w-5 h-5" />
                                    <span>Apply Filters</span>
                                </button>

                                {/* Trust Box */}
                                <div className="mt-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                                    <div className="flex items-center gap-2 mb-3">
                                        <ShieldCheckIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">Why Invest With Us?</span>
                                    </div>
                                    <ul className="space-y-2">
                                        <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                            <CheckIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                            <span>Verified ownership</span>
                                        </li>
                                        <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                            <CheckIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                            <span>Audited contracts</span>
                                        </li>
                                        <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                            <CheckIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                            <span>Monthly yields</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Mobile Filter Modal */}
                        {showFilters && (
                            <div className="fixed inset-0 z-50 lg:hidden">
                                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowFilters(false)} />
                                <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto">
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Filters</h2>
                                        <button onClick={() => setShowFilters(false)} className="p-2 rounded-lg bg-gray-100 dark:bg-white/5">
                                            <XMarkIcon className="w-5 h-5 text-gray-500" />
                                        </button>
                                    </div>
                                    <div className="space-y-4">
                                        <select
                                            value={localFilters.type || ''}
                                            onChange={(e) => setLocalFilters({ ...localFilters, type: e.target.value })}
                                            className="w-full p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white"
                                        >
                                            <option value="">All Types</option>
                                            <option value="residential">Residential</option>
                                            <option value="commercial">Commercial</option>
                                            <option value="industrial">Industrial</option>
                                            <option value="land">Land</option>
                                        </select>
                                        <select
                                            value={localFilters.status || ''}
                                            onChange={(e) => setLocalFilters({ ...localFilters, status: e.target.value })}
                                            className="w-full p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white"
                                        >
                                            <option value="">All Statuses</option>
                                            <option value="active">Active</option>
                                            <option value="upcoming">Upcoming</option>
                                            <option value="sold_out">Sold Out</option>
                                        </select>
                                        <div className="flex gap-3">
                                            <button onClick={clearFilters} className="flex-1 py-3 rounded-xl border border-gray-300 dark:border-white/20 text-gray-700 dark:text-gray-300 font-medium">
                                                Clear
                                            </button>
                                            <button onClick={() => { applyFilters(); setShowFilters(false); }} className="flex-1 py-3 rounded-xl bg-gray-900 text-white font-medium">
                                                Apply
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Properties Grid */}
                        <div className="flex-1">
                            {/* Header */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {properties.data.length} Properties Available
                                    </h2>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                                        Find your next investment opportunity
                                    </p>
                                </div>
                                <select
                                    value={`${localFilters.sort || 'created_at'}-${localFilters.direction || 'desc'}`}
                                    onChange={(e) => {
                                        const [sort, direction] = e.target.value.split('-');
                                        router.get('/properties', { ...filters, sort, direction }, { preserveState: true });
                                    }}
                                    className="px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-gray-900/20 dark:focus:ring-white/20"
                                >
                                    <option value="created_at-desc">Newest First</option>
                                    <option value="created_at-asc">Oldest First</option>
                                    <option value="token_price-asc">Price: Low to High</option>
                                    <option value="token_price-desc">Price: High to Low</option>
                                    <option value="expected_roi-desc">ROI: High to Low</option>
                                </select>
                            </div>

                            {properties.data.length > 0 ? (
                                <>
                                    {viewMode === 'grid' && (
                                        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
                                            {properties.data.map((property, index) => (
                                                <div
                                                    key={property.id}
                                                    className="transform hover:-translate-y-2 transition-all duration-300"
                                                    style={{ animationDelay: `${index * 50}ms` }}
                                                >
                                                    <PropertyCard property={property} />
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {viewMode === 'list' && (
                                        <div className="space-y-4">
                                            {properties.data.map((property) => (
                                                <PropertyListCard key={property.id} property={property} />
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/5 p-12 text-center">
                                    <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-6">
                                        <MagnifyingGlassIcon className="w-10 h-10 text-gray-400" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">No properties found</h3>
                                    <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
                                        We couldn't find any properties matching your criteria. Try adjusting your filters.
                                    </p>
                                    <button
                                        onClick={clearFilters}
                                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-900 text-white font-semibold transition-all hover:bg-gray-800"
                                    >
                                        <XMarkIcon className="w-5 h-5" />
                                        <span>Clear Filters</span>
                                    </button>
                                </div>
                            )}

                            {/* Pagination */}
                            {properties.links && properties.links.length > 3 && (
                                <div className="mt-12 flex justify-center">
                                    <nav className="inline-flex items-center gap-1 p-1.5 bg-white dark:bg-white/[0.03] rounded-xl border border-gray-200 dark:border-white/5 shadow-xl">
                                        {properties.links.map((link: any, index: number) => (
                                            <button
                                                key={index}
                                                onClick={() => link.url && router.get(link.url)}
                                                disabled={!link.url}
                                                className={`px-4 py-2 text-sm rounded-lg font-medium transition-all ${
                                                    link.active
                                                        ? 'bg-gray-900 text-white'
                                                        : link.url
                                                        ? 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                                                        : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                                                }`}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        ))}
                                    </nav>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 lg:py-32 bg-gray-900 dark:bg-black">
                <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                        Can't find what you're looking for?
                    </h2>
                    <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
                        New properties are added regularly. Create an account to get notified about new opportunities.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            href="/register"
                            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white text-gray-900 font-semibold shadow-lg hover:shadow-xl transition-all hover:bg-gray-100"
                        >
                            Create Free Account
                        </Link>
                        <Link
                            href="/contact"
                            className="w-full sm:w-auto px-8 py-4 rounded-xl border-2 border-white/30 text-white font-semibold hover:bg-white/10 transition-all"
                        >
                            Contact Us
                        </Link>
                    </div>
                </div>
            </section>
        </MainLayout>
    );
}

function PropertyListCard({ property }: { property: Property }) {
    const fundingProgress = property.total_tokens > 0
        ? (property.sold_tokens / property.total_tokens) * 100
        : 0;

    const statusColors = {
        active: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
        upcoming: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400',
        sold_out: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400',
        closed: 'bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-400',
    };

    return (
        <Link
            href={`/properties/${property.slug}`}
            className="group flex flex-col sm:flex-row gap-6 p-4 bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/5 hover:border-gray-400 dark:hover:border-white/10 transition-all duration-300 hover:shadow-xl"
        >
            {/* Image */}
            <div className="relative w-full sm:w-56 h-40 flex-shrink-0 rounded-xl overflow-hidden">
                {property.images && property.images.length > 0 ? (
                    <img
                        src={property.images[0]}
                        alt={property.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-white/5">
                        <CubeTransparentIcon className="w-12 h-12 text-gray-400" />
                    </div>
                )}
                <div className="absolute top-3 left-3">
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg ${statusColors[property.status] || statusColors.active}`}>
                        {property.status.replace('_', ' ').toUpperCase()}
                    </span>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col justify-between py-1">
                <div>
                    <div className="flex items-start justify-between gap-4">
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-white group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                            {property.name}
                        </h3>
                        <span className={`flex-shrink-0 px-3 py-1 text-xs font-semibold rounded-lg ${
                            property.blockchain === 'ethereum'
                                ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400'
                                : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                        }`}>
                            {property.blockchain === 'ethereum' ? 'ETH' : 'BSC'}
                        </span>
                    </div>
                    <div className="flex items-center mt-1 text-sm text-gray-500 dark:text-gray-400">
                        <MapPinIcon className="w-4 h-4 mr-1.5" />
                        {property.location}
                    </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-6">
                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Token Price</p>
                        <p className="font-semibold text-gray-900 dark:text-white">${property.token_price}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Expected ROI</p>
                        <p className="font-semibold text-emerald-600 dark:text-emerald-400">{property.expected_roi}%</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Min. Investment</p>
                        <p className="font-semibold text-gray-900 dark:text-white">${property.min_investment}</p>
                    </div>
                    <div className="flex-1 min-w-[120px]">
                        <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-500 dark:text-gray-400">Funding</span>
                            <span className="font-medium text-gray-900 dark:text-white">{fundingProgress.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gray-900 dark:bg-white"
                                style={{ width: `${fundingProgress}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Arrow */}
            <div className="hidden sm:flex items-center">
                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center group-hover:bg-gray-900 dark:group-hover:bg-white transition-all">
                    <ArrowRightIcon className="w-5 h-5 text-gray-400 group-hover:text-white dark:group-hover:text-gray-900 transition-colors" />
                </div>
            </div>
        </Link>
    );
}
