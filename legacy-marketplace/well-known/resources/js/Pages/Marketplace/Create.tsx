import { Head, Link, useForm } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

interface TokenHolding {
    id: number;
    token_amount: number;
    property: {
        id: number;
        name: string;
        token_price: number;
        images: string[];
    };
}

interface Props {
    holdings: TokenHolding[];
}

export default function MarketplaceCreate({ holdings }: Props) {
    const [selectedHolding, setSelectedHolding] = useState<TokenHolding | null>(null);

    const form = useForm({
        token_holding_id: '',
        tokens_to_sell: '',
        listing_type: 'fixed',
        price_per_token: '',
        min_bid_increment: '',
        reserve_price: '',
        currency: 'USDT',
        expires_at: '',
        description: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/marketplace');
    };

    const handleHoldingSelect = (holdingId: string) => {
        form.setData('token_holding_id', holdingId);
        const holding = holdings.find(h => h.id === parseInt(holdingId));
        setSelectedHolding(holding || null);
        if (holding) {
            form.setData('price_per_token', holding.property.token_price.toString());
        }
    };

    return (
        <MainLayout>
            <Head title="Create Listing" />

            <div className="min-h-screen bg-gray-50 dark:bg-dark-950 py-8">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
                    <Link
                        href="/marketplace"
                        className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
                    >
                        <ArrowLeftIcon className="w-4 h-4" />
                        Back to Marketplace
                    </Link>

                    <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-white/5 p-8">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                            List Your Tokens for Sale
                        </h1>

                        {holdings.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-gray-500 dark:text-gray-400 mb-4">
                                    You don't have any tokens to sell.
                                </p>
                                <Link
                                    href="/properties"
                                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"
                                >
                                    Browse Properties
                                </Link>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Select Token Holding */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Select Property Tokens *
                                    </label>
                                    <select
                                        value={form.data.token_holding_id}
                                        onChange={(e) => handleHoldingSelect(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-white/10 rounded-xl"
                                        required
                                    >
                                        <option value="">Select a property</option>
                                        {holdings.map((holding) => (
                                            <option key={holding.id} value={holding.id}>
                                                {holding.property.name} - {Number(holding.token_amount).toLocaleString()} tokens available
                                            </option>
                                        ))}
                                    </select>
                                    {form.errors.token_holding_id && (
                                        <p className="mt-1 text-sm text-red-500">{form.errors.token_holding_id}</p>
                                    )}
                                </div>

                                {selectedHolding && (
                                    <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl">
                                        <p className="text-sm text-blue-800 dark:text-blue-300">
                                            Available tokens: <strong>{Number(selectedHolding.token_amount).toLocaleString()}</strong>
                                            <br />
                                            Current market price: <strong>${Number(selectedHolding.property.token_price).toFixed(2)}</strong> per token
                                        </p>
                                    </div>
                                )}

                                {/* Tokens to Sell */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Tokens to Sell *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.00000001"
                                        min="0"
                                        max={selectedHolding?.token_amount || 0}
                                        value={form.data.tokens_to_sell}
                                        onChange={(e) => form.setData('tokens_to_sell', e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-white/10 rounded-xl"
                                        required
                                    />
                                    {form.errors.tokens_to_sell && (
                                        <p className="mt-1 text-sm text-red-500">{form.errors.tokens_to_sell}</p>
                                    )}
                                </div>

                                {/* Listing Type */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Listing Type *
                                    </label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            type="button"
                                            onClick={() => form.setData('listing_type', 'fixed')}
                                            className={`p-4 rounded-xl border-2 text-left transition-all ${
                                                form.data.listing_type === 'fixed'
                                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                                                    : 'border-gray-200 dark:border-white/10 hover:border-gray-300'
                                            }`}
                                        >
                                            <p className="font-semibold text-gray-900 dark:text-white">Fixed Price</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Sell at a set price</p>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => form.setData('listing_type', 'auction')}
                                            className={`p-4 rounded-xl border-2 text-left transition-all ${
                                                form.data.listing_type === 'auction'
                                                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-500/10'
                                                    : 'border-gray-200 dark:border-white/10 hover:border-gray-300'
                                            }`}
                                        >
                                            <p className="font-semibold text-gray-900 dark:text-white">Auction</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Accept bids from buyers</p>
                                        </button>
                                    </div>
                                </div>

                                {/* Price per Token */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        {form.data.listing_type === 'auction' ? 'Starting Price' : 'Price'} per Token *
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={form.data.price_per_token}
                                            onChange={(e) => form.setData('price_per_token', e.target.value)}
                                            className="flex-1 px-4 py-3 bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-white/10 rounded-xl"
                                            required
                                        />
                                        <select
                                            value={form.data.currency}
                                            onChange={(e) => form.setData('currency', e.target.value)}
                                            className="px-4 py-3 bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-white/10 rounded-xl"
                                        >
                                            <option value="USDT">USDT</option>
                                            <option value="USDC">USDC</option>
                                            <option value="ETH">ETH</option>
                                        </select>
                                    </div>
                                    {form.errors.price_per_token && (
                                        <p className="mt-1 text-sm text-red-500">{form.errors.price_per_token}</p>
                                    )}
                                </div>

                                {/* Auction-specific fields */}
                                {form.data.listing_type === 'auction' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Minimum Bid Increment
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={form.data.min_bid_increment}
                                                onChange={(e) => form.setData('min_bid_increment', e.target.value)}
                                                placeholder="0.00"
                                                className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-white/10 rounded-xl"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Reserve Price (optional)
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={form.data.reserve_price}
                                                onChange={(e) => form.setData('reserve_price', e.target.value)}
                                                placeholder="Minimum price you'll accept"
                                                className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-white/10 rounded-xl"
                                            />
                                        </div>
                                    </>
                                )}

                                {/* Expiration */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Expiration Date (optional)
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={form.data.expires_at}
                                        onChange={(e) => form.setData('expires_at', e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-white/10 rounded-xl"
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Description (optional)
                                    </label>
                                    <textarea
                                        value={form.data.description}
                                        onChange={(e) => form.setData('description', e.target.value)}
                                        rows={3}
                                        placeholder="Add any additional information for buyers..."
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-white/10 rounded-xl resize-none"
                                    />
                                </div>

                                {/* Summary */}
                                {form.data.tokens_to_sell && form.data.price_per_token && (
                                    <div className="p-4 bg-gray-50 dark:bg-dark-700 rounded-xl">
                                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Listing Summary</h3>
                                        <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                                            <p>Tokens: {Number(form.data.tokens_to_sell).toLocaleString()}</p>
                                            <p>Price per token: {form.data.price_per_token} {form.data.currency}</p>
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                Total: {(Number(form.data.tokens_to_sell) * Number(form.data.price_per_token)).toFixed(2)} {form.data.currency}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Submit */}
                                <div className="flex gap-4">
                                    <Link
                                        href="/marketplace"
                                        className="flex-1 py-3 bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-center hover:bg-gray-200 dark:hover:bg-dark-600"
                                    >
                                        Cancel
                                    </Link>
                                    <button
                                        type="submit"
                                        disabled={form.processing}
                                        className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {form.processing ? 'Creating...' : 'Create Listing'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
