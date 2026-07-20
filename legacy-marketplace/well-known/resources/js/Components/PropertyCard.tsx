import { Link } from '@inertiajs/react';
import { Property } from '@/Types';
import { MapPinIcon, ChartBarIcon, BuildingOfficeIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

interface PropertyCardProps {
    property: Property;
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

export default function PropertyCard({ property }: PropertyCardProps) {
    const fundingProgressRaw = property.total_tokens > 0
        ? (property.sold_tokens / property.total_tokens) * 100
        : 0;
    const fundingProgress = fundingProgressRaw < 1 && fundingProgressRaw > 0
        ? fundingProgressRaw.toFixed(2)
        : Math.round(fundingProgressRaw);

    const statusConfig = {
        upcoming: { bg: 'bg-amber-100 dark:bg-amber-500/20', text: 'text-amber-700 dark:text-amber-400' },
        active: { bg: 'bg-emerald-100 dark:bg-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-400' },
        sold_out: { bg: 'bg-red-100 dark:bg-red-500/20', text: 'text-red-700 dark:text-red-400' },
        closed: { bg: 'bg-gray-100 dark:bg-gray-500/20', text: 'text-gray-700 dark:text-gray-400' },
    };

    const propertyTypeLabels = {
        residential: 'Residential',
        commercial: 'Commercial',
        industrial: 'Industrial',
        land: 'Land',
    };

    const status = statusConfig[property.status] || statusConfig.active;

    return (
        <Link
            href={`/properties/${property.slug}`}
            className="group bg-white dark:bg-white/[0.03] rounded-2xl overflow-hidden border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10 transition-all duration-300 hover:shadow-xl block"
        >
            {/* Image */}
            <div className="relative aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-white/5">
                {property.images && property.images.length > 0 ? (
                    <img
                        src={property.images[0]}
                        alt={property.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <BuildingOfficeIcon className="w-16 h-16 text-gray-300 dark:text-gray-600" />
                    </div>
                )}

                {/* Status Badge */}
                <div className="absolute top-4 left-4">
                    <span className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${status.bg} ${status.text}`}>
                        {property.status.replace('_', ' ').toUpperCase()}
                    </span>
                </div>

                {/* Blockchain Badge */}
                <div className="absolute top-4 right-4">
                    <span className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${
                        property.blockchain === 'ethereum'
                            ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400'
                            : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                    }`}>
                        {property.blockchain === 'ethereum' ? 'ETH' : 'BSC'}
                    </span>
                </div>

                {/* Property Type */}
                <div className="absolute bottom-4 left-4">
                    <span className="inline-block px-2.5 py-1 text-xs font-medium rounded-lg bg-white/90 dark:bg-gray-900/90 text-gray-700 dark:text-gray-300 backdrop-blur-sm">
                        {propertyTypeLabels[property.property_type]}
                    </span>
                </div>
            </div>

            {/* Content */}
            <div className="p-5">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors line-clamp-1">
                    {property.name}
                </h3>
                <div className="flex items-center mt-2 text-sm text-gray-500 dark:text-gray-400">
                    <MapPinIcon className="h-4 w-4 mr-1.5" />
                    <span className="line-clamp-1">{property.location}</span>
                </div>

                {/* Stats */}
                <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Token Price</div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(property.token_price)}
                        </div>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Expected ROI</div>
                        <div className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center">
                            <ChartBarIcon className="h-4 w-4 mr-1" />
                            {property.expected_roi}%
                        </div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-5">
                    <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-gray-500 dark:text-gray-400">Funding Progress</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{fundingProgress}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gray-900 dark:bg-white rounded-full transition-all duration-500"
                            style={{ width: `${fundingProgressRaw}%` }}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-5 pt-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                    <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Min. Investment</span>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatCurrency(property.min_investment)}
                        </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center group-hover:bg-gray-900 dark:group-hover:bg-white transition-all">
                        <ArrowRightIcon className="w-4 h-4 text-gray-400 group-hover:text-white dark:group-hover:text-gray-900 transition-colors" />
                    </div>
                </div>
            </div>
        </Link>
    );
}
