import { Head, Link, useForm } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import {
    ArrowLeftIcon,
    ClockIcon,
    UserIcon,
    CurrencyDollarIcon,
    TagIcon,
    ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';

interface Bid {
    id: number;
    bidder: { id: number; name: string };
    bid_amount: number;
    total_amount: number;
    status: string;
    created_at: string;
}

interface Listing {
    id: number;
    property: {
        id: number;
        name: string;
        slug: string;
        images: string[];
        city: string;
        country: string;
        token_price: number;
    };
    seller: { id: number; name: string };
    tokens_to_sell: number;
    listing_type: 'fixed' | 'auction';
    price_per_token: number;
    min_bid_increment: number | null;
    reserve_price: number | null;
    currency: string;
    status: string;
    expires_at: string | null;
    description: string | null;
    created_at: string;
    bids: Bid[];
    total_value: number;
    current_price: number;
    min_next_bid: number;
}

interface Props {
    listing: Listing;
    userBid: Bid | null;
    canBid: boolean;
    canBuy: boolean;
}

export default function MarketplaceShow({ listing, userBid, canBid, canBuy }: Props) {
    const [showBidForm, setShowBidForm] = useState(false);

    const bidForm = useForm({
        bid_amount: listing.min_next_bid,
        message: '',
    });

    const buyForm = useForm({
        tx_hash: '',
        blockchain: 'ethereum',
    });

    const handleBid = (e: React.FormEvent) => {
        e.preventDefault();
        bidForm.post(`/marketplace/${listing.id}/bid`, {
            onSuccess: () => setShowBidForm(false),
        });
    };

    const handleBuy = (e: React.FormEvent) => {
        e.preventDefault();
        buyForm.post(`/marketplace/${listing.id}/buy`);
    };

    return (
        <MainLayout>
            <Head title={`${listing.property.name} - Marketplace`} />

            <div className="min-h-screen bg-gray-50 dark:bg-dark-950 py-8">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Back Button */}
                    <Link
                        href="/marketplace"
                        className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
                    >
                        <ArrowLeftIcon className="w-4 h-4" />
                        Back to Marketplace
                    </Link>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Property Image */}
                            <div className="bg-white dark:bg-dark-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-white/5">
                                <div className="aspect-video">
                                    <img
                                        src={listing.property.images?.[0] || '/images/placeholder.jpg'}
                                        alt={listing.property.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="p-6">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-3 ${
                                                listing.listing_type === 'auction'
                                                    ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300'
                                                    : 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300'
                                            }`}>
                                                {listing.listing_type === 'auction' ? 'Auction' : 'Fixed Price'}
                                            </span>
                                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                                {listing.property.name}
                                            </h1>
                                            <p className="text-gray-500 dark:text-gray-400">
                                                {listing.property.city}, {listing.property.country}
                                            </p>
                                        </div>
                                    </div>

                                    {listing.description && (
                                        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-white/5">
                                            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Description</h3>
                                            <p className="text-gray-600 dark:text-gray-400">{listing.description}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Bids (for auctions) */}
                            {listing.listing_type === 'auction' && (
                                <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-white/5 p-6">
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                        Bid History ({listing.bids.length})
                                    </h2>
                                    {listing.bids.length === 0 ? (
                                        <p className="text-gray-500 dark:text-gray-400">No bids yet. Be the first!</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {listing.bids.map((bid, index) => (
                                                <div
                                                    key={bid.id}
                                                    className={`flex items-center justify-between p-4 rounded-xl ${
                                                        index === 0
                                                            ? 'bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20'
                                                            : 'bg-gray-50 dark:bg-dark-700'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-dark-600 flex items-center justify-center">
                                                            <UserIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-gray-900 dark:text-white">
                                                                {bid.bidder.name}
                                                                {index === 0 && (
                                                                    <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">Highest</span>
                                                                )}
                                                            </p>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                                {new Date(bid.created_at).toLocaleString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-semibold text-gray-900 dark:text-white">
                                                            {Number(bid.bid_amount).toFixed(2)} {listing.currency}
                                                        </p>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">per token</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Listing Details */}
                            <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-white/5 p-6">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-500 dark:text-gray-400">Seller</span>
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {listing.seller.name}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-500 dark:text-gray-400">Tokens for Sale</span>
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {Number(listing.tokens_to_sell).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-500 dark:text-gray-400">
                                            {listing.listing_type === 'auction' ? 'Starting Price' : 'Price per Token'}
                                        </span>
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {Number(listing.price_per_token).toFixed(2)} {listing.currency}
                                        </span>
                                    </div>
                                    {listing.listing_type === 'auction' && listing.bids.length > 0 && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500 dark:text-gray-400">Current Bid</span>
                                            <span className="font-semibold text-blue-600 dark:text-blue-400">
                                                {Number(listing.current_price).toFixed(2)} {listing.currency}
                                            </span>
                                        </div>
                                    )}
                                    <div className="pt-4 border-t border-gray-100 dark:border-white/5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500 dark:text-gray-400">Total Value</span>
                                            <span className="text-xl font-bold text-gray-900 dark:text-white">
                                                {Number(listing.current_price * listing.tokens_to_sell).toFixed(2)} {listing.currency}
                                            </span>
                                        </div>
                                    </div>
                                    {listing.expires_at && (
                                        <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
                                            <ClockIcon className="w-4 h-4" />
                                            Ends {new Date(listing.expires_at).toLocaleString()}
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="mt-6 space-y-3">
                                    {listing.listing_type === 'fixed' && canBuy && (
                                        <form onSubmit={handleBuy} className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Transaction Hash
                                                </label>
                                                <input
                                                    type="text"
                                                    value={buyForm.data.tx_hash}
                                                    onChange={(e) => buyForm.setData('tx_hash', e.target.value)}
                                                    placeholder="0x..."
                                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-white/10 rounded-xl text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Blockchain
                                                </label>
                                                <select
                                                    value={buyForm.data.blockchain}
                                                    onChange={(e) => buyForm.setData('blockchain', e.target.value)}
                                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-white/10 rounded-xl text-sm"
                                                >
                                                    <option value="ethereum">Ethereum</option>
                                                    <option value="bsc">BSC</option>
                                                    <option value="sepolia">Sepolia</option>
                                                </select>
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={buyForm.processing}
                                                className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50"
                                            >
                                                {buyForm.processing ? 'Processing...' : `Buy Now - ${Number(listing.total_value).toFixed(2)} ${listing.currency}`}
                                            </button>
                                        </form>
                                    )}

                                    {listing.listing_type === 'auction' && canBid && (
                                        <>
                                            {!showBidForm ? (
                                                <button
                                                    onClick={() => setShowBidForm(true)}
                                                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"
                                                >
                                                    Place Bid
                                                </button>
                                            ) : (
                                                <form onSubmit={handleBid} className="space-y-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                            Bid Amount (per token)
                                                        </label>
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                min={listing.min_next_bid}
                                                                value={bidForm.data.bid_amount}
                                                                onChange={(e) => bidForm.setData('bid_amount', parseFloat(e.target.value))}
                                                                className="flex-1 px-4 py-2 bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-white/10 rounded-xl text-sm"
                                                            />
                                                            <span className="text-gray-500">{listing.currency}</span>
                                                        </div>
                                                        <p className="mt-1 text-xs text-gray-500">
                                                            Min bid: {listing.min_next_bid.toFixed(2)} {listing.currency}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                            Message (optional)
                                                        </label>
                                                        <textarea
                                                            value={bidForm.data.message}
                                                            onChange={(e) => bidForm.setData('message', e.target.value)}
                                                            rows={2}
                                                            className="w-full px-4 py-2 bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-white/10 rounded-xl text-sm resize-none"
                                                        />
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowBidForm(false)}
                                                            className="flex-1 py-2 bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            type="submit"
                                                            disabled={bidForm.processing}
                                                            className="flex-1 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50"
                                                        >
                                                            {bidForm.processing ? 'Placing...' : 'Place Bid'}
                                                        </button>
                                                    </div>
                                                </form>
                                            )}
                                        </>
                                    )}

                                    {userBid && (
                                        <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl">
                                            <p className="text-sm text-blue-800 dark:text-blue-300">
                                                Your current bid: <strong>{Number(userBid.bid_amount).toFixed(2)} {listing.currency}</strong>
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Property Link */}
                            <Link
                                href={`/properties/${listing.property.slug}`}
                                className="block bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-white/5 p-6 hover:border-blue-500 transition-colors"
                            >
                                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">View Property Details</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Learn more about {listing.property.name}
                                </p>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
