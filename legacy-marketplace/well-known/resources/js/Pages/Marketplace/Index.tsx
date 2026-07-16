import { Head, Link, router } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import {
    FunnelIcon,
    MagnifyingGlassIcon,
    ClockIcon,
    TagIcon,
    ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';

interface Property {
    id: number;
    name: string;
    slug: string;
    images: string[];
    city: string;
    country: string;
}

interface Listing {
    id: number;
    property: Property;
    seller: { id: number; name: string };
    tokens_to_sell: number;
    listing_type: 'fixed' | 'auction';
    price_per_token: number;
    currency: string;
    status: string;
    expires_at: string | null;
    created_at: string;
    highest_bid?: { bid_amount: number };
    bid_count: number;
}

interface Props {
    listings: {
        data: Listing[];
        links: any[];
        current_page: number;
        last_page: number;
    };
    properties: { id: number; name: string; slug: string }[];
    filters: {
        property_id?: string;
        type?: string;
        sort?: string;
        dir?: string;
    };
}

export default function MarketplaceIndex({ listings, properties, filters }: Props) {
    const [showFilters, setShowFilters] = useState(false);

    const handleFilter = (key: string, value: string) => {
        router.get('/marketplace', { ...filters, [key]: value || undefined }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    return (
        <MainLayout>
            <Head title="Marketplace" />

            <div className="min-h-screen bg-gray-50 dark:bg-dark-950">
                {/* Header */}
                <div className="bg-white dark:bg-dark-900 border-b border-gray-200 dark:border-white/5">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                                    Token Marketplace
                                </h1>
                                <p className="mt-2 text-gray-600 dark:text-gray-400">
                                    Buy and sell property tokens from other investors
                                </p>
                            </div>
                            <Link
                                href="/marketplace/create"
                                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                            >
                                List Your Tokens
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-wrap items-center gap-4">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-dark-800 border border-gray-200 dark:border-white/10 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-700"
                        >
                            <FunnelIcon className="w-4 h-4" />
                            Filters
                        </button>

                        <select
                            value={filters.type || ''}
                            onChange={(e) => handleFilter('type', e.target.value)}
                            className="px-4 py-2 bg-white dark:bg-dark-800 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-700 dark:text-gray-300"
                        >
                            <option value="">All Types</option>
                            <option value="fixed">Fixed Price</option>
                            <option value="auction">Auction</option>
                        </select>

                        <select
                            value={filters.property_id || ''}
                            onChange={(e) => handleFilter('property_id', e.target.value)}
                            className="px-4 py-2 bg-white dark:bg-dark-800 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-700 dark:text-gray-300"
                        >
                            <option value="">All Properties</option>
                            {properties.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>

                        <select
                            value={`${filters.sort || 'created_at'}-${filters.dir || 'desc'}`}
                            onChange={(e) => {
                                const [sort, dir] = e.target.value.split('-');
                                router.get('/marketplace', { ...filters, sort, dir }, {
                                    preserveState: true,
                                    preserveScroll: true,
                                });
                            }}
                            className="px-4 py-2 bg-white dark:bg-dark-800 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-700 dark:text-gray-300"
                        >
                            <option value="created_at-desc">Newest First</option>
                            <option value="created_at-asc">Oldest First</option>
                            <option value="price_per_token-asc">Price: Low to High</option>
                            <option value="price_per_token-desc">Price: High to Low</option>
                        </select>
                    </div>
                </div>

                {/* Listings Grid */}
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-12">
                    {listings.data.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-dark-800 flex items-center justify-center">
                                <TagIcon className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">No listings found</h3>
                            <p className="mt-2 text-gray-600 dark:text-gray-400">
                                Be the first to list your tokens for sale!
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {listings.data.map((listing) => (
                                <Link
                                    key={listing.id}
                                    href={`/marketplace/${listing.id}`}
                                    className="group bg-white dark:bg-dark-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-white/5 hover:border-blue-500 dark:hover:border-blue-500 transition-all hover:shadow-xl"
                                >
                                    {/* Image */}
                                    <div className="aspect-[4/3] relative overflow-hidden">
                                        <img
                                            src={listing.property.images?.[0] || '/images/placeholder.jpg'}
                                            alt={listing.property.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                        <div className="absolute top-3 left-3">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                listing.listing_type === 'auction'
                                                    ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300'
                                                    : 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300'
                                            }`}>
                                                {listing.listing_type === 'auction' ? 'Auction' : 'Fixed Price'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-5">
                                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                                            {listing.property.name}
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {listing.property.city}, {listing.property.country}
                                        </p>

                                        <div className="mt-4 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-500 dark:text-gray-400">Tokens</span>
                                                <span className="font-medium text-gray-900 dark:text-white">
                                                    {Number(listing.tokens_to_sell).toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                                    {listing.listing_type === 'auction' ? 'Current Bid' : 'Price/Token'}
                                                </span>
                                                <span className="font-semibold text-blue-600 dark:text-blue-400">
                                                    {listing.listing_type === 'auction' && listing.highest_bid
                                                        ? Number(listing.highest_bid.bid_amount).toFixed(2)
                                                        : Number(listing.price_per_token).toFixed(2)
                                                    } {listing.currency}
                                                </span>
                                            </div>
                                        </div>

                                        {listing.listing_type === 'auction' && (
                                            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                                <span className="flex items-center gap-1">
                                                    <ArrowTrendingUpIcon className="w-4 h-4" />
                                                    {listing.bid_count} bids
                                                </span>
                                                {listing.expires_at && (
                                                    <span className="flex items-center gap-1">
                                                        <ClockIcon className="w-4 h-4" />
                                                        Ends {new Date(listing.expires_at).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {listings.last_page > 1 && (
                        <div className="mt-8 flex justify-center gap-2">
                            {listings.links.map((link, i) => (
                                <Link
                                    key={i}
                                    href={link.url || '#'}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        link.active
                                            ? 'bg-blue-600 text-white'
                                            : link.url
                                                ? 'bg-white dark:bg-dark-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-700'
                                                : 'bg-gray-100 dark:bg-dark-800 text-gray-400 cursor-not-allowed'
                                    }`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </MainLayout>
    );
}
