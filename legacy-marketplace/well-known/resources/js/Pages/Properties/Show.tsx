import { Head, Link, usePage } from '@inertiajs/react';
import { useState } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Property, PageProps } from '@/Types';
import {
    MapPinIcon,
    ChartBarIcon,
    BuildingOfficeIcon,
    CurrencyDollarIcon,
    DocumentTextIcon,
    ShieldCheckIcon,
    ArrowTrendingUpIcon,
    CheckCircleIcon,
    ArrowRightIcon,
    UsersIcon,
    ChevronLeftIcon,
} from '@heroicons/react/24/outline';
import PropertyCard from '@/Components/PropertyCard';
import ReturnCalculator from '@/Components/ReturnCalculator';
import DocumentsSection from '@/Components/DocumentsSection';

interface PropertyShowProps {
    property: Property;
    relatedProperties: Property[];
    investorCount: number;
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

export default function PropertyShow({ property, relatedProperties, investorCount }: PropertyShowProps) {
    const { auth } = usePage<PageProps>().props;
    const [selectedImage, setSelectedImage] = useState(0);

    const fundingProgressRaw = property.total_tokens > 0
        ? (property.sold_tokens / property.total_tokens) * 100
        : 0;
    const fundingProgress = fundingProgressRaw < 1 && fundingProgressRaw > 0
        ? fundingProgressRaw.toFixed(2)
        : Math.round(fundingProgressRaw);

    const statusConfig = {
        upcoming: { bg: 'bg-amber-100 dark:bg-amber-500/20', text: 'text-amber-700 dark:text-amber-400', label: 'UPCOMING' },
        active: { bg: 'bg-emerald-100 dark:bg-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-400', label: 'LIVE' },
        sold_out: { bg: 'bg-red-100 dark:bg-red-500/20', text: 'text-red-700 dark:text-red-400', label: 'SOLD OUT' },
        closed: { bg: 'bg-gray-100 dark:bg-gray-500/20', text: 'text-gray-700 dark:text-gray-400', label: 'CLOSED' },
    };

    const status = statusConfig[property.status] || statusConfig.closed;

    return (
        <MainLayout>
            <Head title={property.name} />

            {/* Hero Section */}
            <section className="py-8">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Back Button */}
                    <Link
                        href="/properties"
                        className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
                    >
                        <ChevronLeftIcon className="w-5 h-5" />
                        <span>Back to Properties</span>
                    </Link>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* Image Gallery */}
                            <div className="space-y-4">
                                <div className="aspect-[16/9] rounded-2xl overflow-hidden bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5">
                                    {property.images && property.images.length > 0 ? (
                                        <img
                                            src={property.images[selectedImage]}
                                            alt={property.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <BuildingOfficeIcon className="h-24 w-24 text-gray-300 dark:text-gray-600" />
                                        </div>
                                    )}
                                </div>
                                {property.images && property.images.length > 1 && (
                                    <div className="grid grid-cols-5 gap-3">
                                        {property.images.map((image, index) => (
                                            <button
                                                key={index}
                                                onClick={() => setSelectedImage(index)}
                                                className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                                                    selectedImage === index
                                                        ? 'border-gray-900 dark:border-white ring-2 ring-gray-900/20 dark:ring-white/20'
                                                        : 'border-gray-200 dark:border-white/10 hover:border-gray-400 dark:hover:border-white/30'
                                                }`}
                                            >
                                                <img
                                                    src={image}
                                                    alt={`${property.name} ${index + 1}`}
                                                    className="w-full h-full object-cover"
                                                />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Property Info */}
                            <div className="bg-white dark:bg-white/[0.03] rounded-2xl p-6 border border-gray-200 dark:border-white/5 shadow-xl">
                                <div className="flex items-start justify-between flex-wrap gap-4">
                                    <div>
                                        <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${status.bg} ${status.text}`}>
                                            {status.label}
                                        </span>
                                        <h1 className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">{property.name}</h1>
                                        <div className="flex items-center mt-2 text-gray-600 dark:text-gray-400">
                                            <MapPinIcon className="h-5 w-5 mr-2" />
                                            <span>{property.location}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm text-gray-500 dark:text-gray-400">Total Value</div>
                                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                            {formatCurrency(property.total_value)}
                                        </div>
                                    </div>
                                </div>

                                {/* Stats Grid */}
                                <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 border border-gray-100 dark:border-white/5">
                                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-2">
                                            <CurrencyDollarIcon className="h-4 w-4" />
                                            <span>Token Price</span>
                                        </div>
                                        <div className="text-xl font-bold text-gray-900 dark:text-white">
                                            {formatCurrency(property.token_price)}
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 border border-gray-100 dark:border-white/5">
                                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-2">
                                            <ArrowTrendingUpIcon className="h-4 w-4" />
                                            <span>Expected ROI</span>
                                        </div>
                                        <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                                            {property.expected_roi}%
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 border border-gray-100 dark:border-white/5">
                                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-2">
                                            <ChartBarIcon className="h-4 w-4" />
                                            <span>Rental Yield</span>
                                        </div>
                                        <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                                            {property.rental_yield || 0}%
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 border border-gray-100 dark:border-white/5">
                                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-2">
                                            <UsersIcon className="h-4 w-4" />
                                            <span>Investors</span>
                                        </div>
                                        <div className="text-xl font-bold text-gray-900 dark:text-white">
                                            {investorCount}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="bg-white dark:bg-white/[0.03] rounded-2xl p-6 border border-gray-200 dark:border-white/5 shadow-xl">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                                        <DocumentTextIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">About This Property</h2>
                                </div>
                                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line leading-relaxed">{property.description}</p>
                            </div>

                            {/* Features */}
                            {property.features && property.features.length > 0 && (
                                <div className="bg-white dark:bg-white/[0.03] rounded-2xl p-6 border border-gray-200 dark:border-white/5 shadow-xl">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                                            <ShieldCheckIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Key Features</h2>
                                    </div>
                                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {property.features.map((feature: string, index: number) => (
                                            <li key={index} className="flex items-center text-gray-700 dark:text-gray-300">
                                                <CheckCircleIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mr-3 flex-shrink-0" />
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Amenities */}
                            {property.amenities && property.amenities.length > 0 && (
                                <div className="bg-white dark:bg-white/[0.03] rounded-2xl p-6 border border-gray-200 dark:border-white/5 shadow-xl">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                                            <BuildingOfficeIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Amenities</h2>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {property.amenities.map((amenity: string, index: number) => (
                                            <span
                                                key={index}
                                                className="px-3 py-1.5 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-full text-sm border border-gray-200 dark:border-white/10"
                                            >
                                                {amenity}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Documents Section */}
                            <DocumentsSection
                                documents={property.documents?.filter(doc => doc.is_public) || []}
                                propertyName={property.name}
                            />
                        </div>

                        {/* Sidebar */}
                        <div className="lg:col-span-1">
                            <div className="sticky top-24 space-y-6">
                                {/* Return Calculator */}
                                <ReturnCalculator property={property} />

                                {/* Investment Card */}
                                <div className="bg-white dark:bg-white/[0.03] rounded-2xl p-6 border border-gray-200 dark:border-white/5 shadow-xl">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Investment Details</h3>

                                    {/* Funding Progress */}
                                    <div className="mb-6">
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="text-gray-500 dark:text-gray-400">Funding Progress</span>
                                            <span className="font-bold text-gray-900 dark:text-white">{fundingProgress}%</span>
                                        </div>
                                        <div className="w-full h-3 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gray-900 dark:bg-white rounded-full transition-all duration-500"
                                                style={{ width: `${fundingProgressRaw}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-xs mt-2 text-gray-500">
                                            <span>{property.sold_tokens.toLocaleString()} sold</span>
                                            <span>{property.total_tokens.toLocaleString()} total</span>
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="space-y-4 mb-6">
                                        <div className="flex justify-between py-3 border-b border-gray-100 dark:border-white/5">
                                            <span className="text-gray-500 dark:text-gray-400">Available Tokens</span>
                                            <span className="font-semibold text-gray-900 dark:text-white">
                                                {property.available_tokens.toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="flex justify-between py-3 border-b border-gray-100 dark:border-white/5">
                                            <span className="text-gray-500 dark:text-gray-400">Min Investment</span>
                                            <span className="font-semibold text-gray-900 dark:text-white">
                                                {formatCurrency(property.min_investment)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between py-3 border-b border-gray-100 dark:border-white/5">
                                            <span className="text-gray-500 dark:text-gray-400">Total Investors</span>
                                            <span className="font-semibold text-gray-900 dark:text-white">{investorCount}</span>
                                        </div>
                                        <div className="flex justify-between py-3">
                                            <span className="text-gray-500 dark:text-gray-400">Blockchain</span>
                                            <span className={`font-semibold px-3 py-1 rounded-full text-xs ${
                                                property.blockchain === 'ethereum'
                                                    ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400'
                                                    : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                                            }`}>
                                                {property.blockchain === 'ethereum' ? 'Ethereum' : 'BSC'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* CTA */}
                                    {property.status === 'active' && property.available_tokens > 0 ? (
                                        auth.user ? (
                                            <Link
                                                href={`/invest/${property.slug}`}
                                                className="block w-full py-4 px-6 rounded-xl bg-gray-900 text-white font-bold text-center text-lg hover:bg-gray-800 transition-all"
                                            >
                                                <span className="flex items-center justify-center gap-2">
                                                    <span>Invest Now</span>
                                                    <ArrowRightIcon className="h-5 w-5" />
                                                </span>
                                            </Link>
                                        ) : (
                                            <Link
                                                href="/login"
                                                className="block w-full py-4 px-6 rounded-xl bg-gray-900 text-white font-bold text-center text-lg hover:bg-gray-800 transition-all"
                                            >
                                                <span className="flex items-center justify-center gap-2">
                                                    <span>Login to Invest</span>
                                                    <ArrowRightIcon className="h-5 w-5" />
                                                </span>
                                            </Link>
                                        )
                                    ) : (
                                        <button
                                            disabled
                                            className="w-full bg-gray-200 dark:bg-gray-800 text-gray-500 py-4 px-6 rounded-xl font-bold cursor-not-allowed"
                                        >
                                            {property.status === 'sold_out' ? 'Sold Out' : 'Not Available'}
                                        </button>
                                    )}
                                </div>

                                {/* Property Details */}
                                <div className="bg-white dark:bg-white/[0.03] rounded-2xl p-6 border border-gray-200 dark:border-white/5 shadow-xl">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                                            <BuildingOfficeIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Property Details</h3>
                                    </div>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between py-2 border-b border-gray-100 dark:border-white/5">
                                            <span className="text-gray-500 dark:text-gray-400">Type</span>
                                            <span className="text-gray-900 dark:text-white capitalize">{property.property_type}</span>
                                        </div>
                                        {property.property_size && (
                                            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-white/5">
                                                <span className="text-gray-500 dark:text-gray-400">Size</span>
                                                <span className="text-gray-900 dark:text-white">
                                                    {property.property_size.toLocaleString()} {property.property_size_unit}
                                                </span>
                                            </div>
                                        )}
                                        {property.bedrooms && (
                                            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-white/5">
                                                <span className="text-gray-500 dark:text-gray-400">Bedrooms</span>
                                                <span className="text-gray-900 dark:text-white">{property.bedrooms}</span>
                                            </div>
                                        )}
                                        {property.bathrooms && (
                                            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-white/5">
                                                <span className="text-gray-500 dark:text-gray-400">Bathrooms</span>
                                                <span className="text-gray-900 dark:text-white">{property.bathrooms}</span>
                                            </div>
                                        )}
                                        {property.year_built && (
                                            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-white/5">
                                                <span className="text-gray-500 dark:text-gray-400">Year Built</span>
                                                <span className="text-gray-900 dark:text-white">{property.year_built}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between py-2">
                                            <span className="text-gray-500 dark:text-gray-400">Location</span>
                                            <span className="text-gray-900 dark:text-white">{property.city}, {property.country}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Security Badge */}
                                <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl p-4 border border-emerald-200 dark:border-emerald-500/20">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                                            <ShieldCheckIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-semibold text-gray-900 dark:text-white">Verified Property</div>
                                            <div className="text-xs text-gray-600 dark:text-gray-400">Smart contract audited</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Related Properties */}
                    {relatedProperties.length > 0 && (
                        <div className="mt-20">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Similar Properties</h2>
                                    <p className="text-gray-600 dark:text-gray-400 mt-1">Explore other investment opportunities</p>
                                </div>
                                <Link
                                    href="/properties"
                                    className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium flex items-center gap-2 transition-colors"
                                >
                                    <span>View All</span>
                                    <ArrowRightIcon className="h-4 w-4" />
                                </Link>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                {relatedProperties.map((prop) => (
                                    <PropertyCard key={prop.id} property={prop} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </MainLayout>
    );
}
