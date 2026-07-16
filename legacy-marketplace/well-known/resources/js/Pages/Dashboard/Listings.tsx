import { Head, Link } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import { PlusIcon, TagIcon } from '@heroicons/react/24/outline';

interface Listing {
    id: number;
    property: { id: number; name: string; slug: string };
    tokens_to_sell: number;
    listing_type: 'fixed' | 'auction';
    price_per_token: number;
    currency: string;
    status: string;
    highest_bid?: { bid_amount: number };
    created_at: string;
}

interface Props {
    listings: {
        data: Listing[];
        links: any[];
    };
}

export default function DashboardListings({ listings }: Props) {
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300';
            case 'sold':
                return 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300';
            case 'cancelled':
                return 'bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-300';
            case 'expired':
                return 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300';
            default:
                return 'bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-300';
        }
    };

    return (
        <MainLayout>
            <Head title="My Listings" />

            <div className="min-h-screen bg-gray-50 dark:bg-dark-950 py-8">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Listings</h1>
                            <p className="text-gray-600 dark:text-gray-400">Manage your token listings</p>
                        </div>
                        <Link
                            href="/marketplace/create"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"
                        >
                            <PlusIcon className="w-5 h-5" />
                            New Listing
                        </Link>
                    </div>

                    {listings.data.length === 0 ? (
                        <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-white/5 p-12 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-dark-700 flex items-center justify-center">
                                <TagIcon className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No listings yet</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-6">
                                Create your first listing to sell your property tokens
                            </p>
                            <Link
                                href="/marketplace/create"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"
                            >
                                Create Listing
                            </Link>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-white/5 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 dark:bg-dark-700">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Property</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tokens</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Price</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                                        {listings.data.map((listing) => (
                                            <tr key={listing.id}>
                                                <td className="px-6 py-4">
                                                    <Link href={`/properties/${listing.property.slug}`} className="text-blue-600 hover:underline">
                                                        {listing.property.name}
                                                    </Link>
                                                </td>
                                                <td className="px-6 py-4 text-sm capitalize text-gray-900 dark:text-white">
                                                    {listing.listing_type}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                                                    {Number(listing.tokens_to_sell).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                                                    {listing.listing_type === 'auction' && listing.highest_bid
                                                        ? Number(listing.highest_bid.bid_amount).toFixed(2)
                                                        : Number(listing.price_per_token).toFixed(2)
                                                    } {listing.currency}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(listing.status)}`}>
                                                        {listing.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Link
                                                        href={`/marketplace/${listing.id}`}
                                                        className="text-blue-600 hover:underline text-sm"
                                                    >
                                                        View
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </MainLayout>
    );
}
