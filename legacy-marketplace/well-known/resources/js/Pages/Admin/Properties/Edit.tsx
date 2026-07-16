import { Head, Link, useForm, router } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Property } from '@/Types';
import { PhotoIcon, XMarkIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

interface AdminPropertiesEditProps {
    property: Property;
}

export default function AdminPropertiesEdit({ property }: AdminPropertiesEditProps) {
    const [imagePreview, setImagePreview] = useState<string[]>(property.images || []);
    const [deleteImages, setDeleteImages] = useState<string[]>([]);

    const { data, setData, post, processing, errors } = useForm({
        _method: 'PUT',
        name: property.name || '',
        description: property.description || '',
        short_description: (property as any).short_description || '',
        location: property.location || '',
        address: property.address || '',
        city: property.city || '',
        country: property.country || '',
        latitude: (property as any).latitude || '',
        longitude: (property as any).longitude || '',
        property_type: property.property_type || 'residential',
        total_value: String(property.total_value || ''),
        token_price: String(property.token_price || ''),
        expected_roi: String(property.expected_roi || ''),
        rental_yield: String(property.rental_yield || ''),
        appreciation_rate: String(property.appreciation_rate || ''),
        dividend_frequency: String(property.dividend_frequency || '12'),
        min_investment: String(property.min_investment || ''),
        amenities: property.amenities || [],
        features: property.features || [],
        status: property.status || 'draft',
        blockchain: property.blockchain || 'sepolia',
        contract_address: property.contract_address || '',
        token_id: property.token_id ? String(property.token_id) : '',
        property_size: property.property_size ? String(property.property_size) : '',
        property_size_unit: property.property_size_unit || 'sqft',
        bedrooms: property.bedrooms ? String(property.bedrooms) : '',
        bathrooms: property.bathrooms ? String(property.bathrooms) : '',
        year_built: property.year_built ? String(property.year_built) : '',
        funding_deadline: (property as any).funding_deadline || '',
        is_featured: (property as any).is_featured || false,
        new_images: [] as File[],
        delete_images: [] as string[],
    });

    const [amenityInput, setAmenityInput] = useState('');
    const [featureInput, setFeatureInput] = useState('');

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setData('delete_images', deleteImages);
        post(`/admin/properties/${property.slug}`, {
            forceFormData: true,
        });
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        setData('new_images', [...data.new_images, ...files]);

        files.forEach((file) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                setImagePreview((prev) => [...prev, e.target?.result as string]);
            };
            reader.readAsDataURL(file);
        });
    };

    const removeImage = (index: number) => {
        const imageUrl = imagePreview[index];

        // If it's an existing image (starts with http or /storage), mark for deletion
        if (imageUrl.startsWith('http') || imageUrl.startsWith('/storage')) {
            setDeleteImages((prev) => [...prev, imageUrl]);
        } else {
            // It's a new image preview, remove from new_images
            const newImageIndex = index - (property.images?.length || 0);
            setData('new_images', data.new_images.filter((_, i) => i !== newImageIndex));
        }

        setImagePreview(imagePreview.filter((_, i) => i !== index));
    };

    const addAmenity = () => {
        if (amenityInput.trim()) {
            setData('amenities', [...data.amenities, amenityInput.trim()]);
            setAmenityInput('');
        }
    };

    const removeAmenity = (index: number) => {
        setData('amenities', data.amenities.filter((_, i) => i !== index));
    };

    const addFeature = () => {
        if (featureInput.trim()) {
            setData('features', [...data.features, featureInput.trim()]);
            setFeatureInput('');
        }
    };

    const removeFeature = (index: number) => {
        setData('features', data.features.filter((_, i) => i !== index));
    };

    return (
        <AdminLayout title={`Edit: ${property.name}`}>
            <Head title={`Edit ${property.name} - Admin`} />

            <div className="max-w-4xl mx-auto">
                <div className="mb-6 flex items-center gap-4">
                    <Link
                        href={`/admin/properties/${property.slug}`}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                    >
                        <ArrowLeftIcon className="h-5 w-5 text-gray-400" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Edit Property</h1>
                        <p className="text-gray-400 text-sm">{property.name}</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Basic Information */}
                    <div className="glass-card rounded-2xl p-6">
                        <h2 className="text-lg font-semibold text-white mb-6">Basic Information</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    Property Name *
                                </label>
                                <input
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    className="w-full input-dark rounded-xl py-3 px-4"
                                    required
                                />
                                {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    Short Description
                                </label>
                                <input
                                    type="text"
                                    value={data.short_description}
                                    onChange={(e) => setData('short_description', e.target.value)}
                                    className="w-full input-dark rounded-xl py-3 px-4"
                                    maxLength={500}
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    Full Description *
                                </label>
                                <textarea
                                    rows={6}
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    className="w-full input-dark rounded-xl py-3 px-4"
                                    required
                                />
                                {errors.description && <p className="mt-1 text-sm text-red-400">{errors.description}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    Property Type *
                                </label>
                                <select
                                    value={data.property_type}
                                    onChange={(e) => setData('property_type', e.target.value)}
                                    className="w-full input-dark rounded-xl py-3 px-4"
                                >
                                    <option value="residential">Residential</option>
                                    <option value="commercial">Commercial</option>
                                    <option value="industrial">Industrial</option>
                                    <option value="land">Land</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    Status *
                                </label>
                                <select
                                    value={data.status}
                                    onChange={(e) => setData('status', e.target.value)}
                                    className="w-full input-dark rounded-xl py-3 px-4"
                                >
                                    <option value="draft">Draft</option>
                                    <option value="upcoming">Upcoming</option>
                                    <option value="active">Active</option>
                                    <option value="sold_out">Sold Out</option>
                                    <option value="closed">Closed</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Location */}
                    <div className="glass-card rounded-2xl p-6">
                        <h2 className="text-lg font-semibold text-white mb-6">Location</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    Display Location *
                                </label>
                                <input
                                    type="text"
                                    value={data.location}
                                    onChange={(e) => setData('location', e.target.value)}
                                    placeholder="e.g., Downtown Manhattan, NYC"
                                    className="w-full input-dark rounded-xl py-3 px-4"
                                    required
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    Full Address *
                                </label>
                                <textarea
                                    rows={2}
                                    value={data.address}
                                    onChange={(e) => setData('address', e.target.value)}
                                    className="w-full input-dark rounded-xl py-3 px-4"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    City *
                                </label>
                                <input
                                    type="text"
                                    value={data.city}
                                    onChange={(e) => setData('city', e.target.value)}
                                    className="w-full input-dark rounded-xl py-3 px-4"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    Country *
                                </label>
                                <input
                                    type="text"
                                    value={data.country}
                                    onChange={(e) => setData('country', e.target.value)}
                                    className="w-full input-dark rounded-xl py-3 px-4"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Financial Details */}
                    <div className="glass-card rounded-2xl p-6">
                        <h2 className="text-lg font-semibold text-white mb-6">Financial Details</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    Total Value (USD) *
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={data.total_value}
                                    onChange={(e) => setData('total_value', e.target.value)}
                                    className="w-full input-dark rounded-xl py-3 px-4"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    Token Price (USD) *
                                </label>
                                <input
                                    type="number"
                                    step="0.00000001"
                                    value={data.token_price}
                                    onChange={(e) => setData('token_price', e.target.value)}
                                    className="w-full input-dark rounded-xl py-3 px-4"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    Expected ROI (%) *
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={data.expected_roi}
                                    onChange={(e) => setData('expected_roi', e.target.value)}
                                    className="w-full input-dark rounded-xl py-3 px-4"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    Rental Yield (%)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={data.rental_yield}
                                    onChange={(e) => setData('rental_yield', e.target.value)}
                                    className="w-full input-dark rounded-xl py-3 px-4"
                                    placeholder="Uses global default if empty"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    Min Investment (USD) *
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={data.min_investment}
                                    onChange={(e) => setData('min_investment', e.target.value)}
                                    className="w-full input-dark rounded-xl py-3 px-4"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Return Calculator Settings */}
                    <div className="glass-card rounded-2xl p-6">
                        <h2 className="text-lg font-semibold text-white mb-2">Return Calculator Settings</h2>
                        <p className="text-sm text-gray-400 mb-6">These values are used for the investment return calculator. Leave empty to use global defaults from Settings.</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    Appreciation Rate (%)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={data.appreciation_rate}
                                    onChange={(e) => setData('appreciation_rate', e.target.value)}
                                    className="w-full input-dark rounded-xl py-3 px-4"
                                    placeholder="Uses global default if empty"
                                />
                                <p className="text-xs text-gray-500 mt-1">Annual property value increase</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    Dividend Frequency
                                </label>
                                <select
                                    value={data.dividend_frequency}
                                    onChange={(e) => setData('dividend_frequency', e.target.value)}
                                    className="w-full input-dark rounded-xl py-3 px-4"
                                >
                                    <option value="12">Monthly (12/year)</option>
                                    <option value="4">Quarterly (4/year)</option>
                                    <option value="2">Semi-Annual (2/year)</option>
                                    <option value="1">Annual (1/year)</option>
                                </select>
                                <p className="text-xs text-gray-500 mt-1">How often dividends are distributed</p>
                            </div>
                        </div>
                    </div>

                    {/* Property Details */}
                    <div className="glass-card rounded-2xl p-6">
                        <h2 className="text-lg font-semibold text-white mb-6">Property Details</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    Size
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        value={data.property_size}
                                        onChange={(e) => setData('property_size', e.target.value)}
                                        className="flex-1 input-dark rounded-xl py-3 px-4"
                                    />
                                    <select
                                        value={data.property_size_unit}
                                        onChange={(e) => setData('property_size_unit', e.target.value)}
                                        className="w-24 input-dark rounded-xl py-3 px-4"
                                    >
                                        <option value="sqft">sqft</option>
                                        <option value="sqm">sqm</option>
                                        <option value="acres">acres</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    Bedrooms
                                </label>
                                <input
                                    type="number"
                                    value={data.bedrooms}
                                    onChange={(e) => setData('bedrooms', e.target.value)}
                                    className="w-full input-dark rounded-xl py-3 px-4"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    Bathrooms
                                </label>
                                <input
                                    type="number"
                                    value={data.bathrooms}
                                    onChange={(e) => setData('bathrooms', e.target.value)}
                                    className="w-full input-dark rounded-xl py-3 px-4"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    Year Built
                                </label>
                                <input
                                    type="number"
                                    value={data.year_built}
                                    onChange={(e) => setData('year_built', e.target.value)}
                                    className="w-full input-dark rounded-xl py-3 px-4"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Blockchain */}
                    <div className="glass-card rounded-2xl p-6">
                        <h2 className="text-lg font-semibold text-white mb-6">Blockchain Configuration</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    Blockchain *
                                </label>
                                <select
                                    value={data.blockchain}
                                    onChange={(e) => setData('blockchain', e.target.value)}
                                    className="w-full input-dark rounded-xl py-3 px-4"
                                >
                                    <option value="sepolia">Sepolia (Testnet)</option>
                                    <option value="ethereum">Ethereum</option>
                                    <option value="bsc">BSC</option>
                                    <option value="bsc_testnet">BSC Testnet</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    Token ID
                                </label>
                                <input
                                    type="number"
                                    value={data.token_id}
                                    onChange={(e) => setData('token_id', e.target.value)}
                                    className="w-full input-dark rounded-xl py-3 px-4"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    Contract Address
                                </label>
                                <input
                                    type="text"
                                    value={data.contract_address}
                                    onChange={(e) => setData('contract_address', e.target.value)}
                                    placeholder="0x..."
                                    className="w-full input-dark rounded-xl py-3 px-4"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Images */}
                    <div className="glass-card rounded-2xl p-6">
                        <h2 className="text-lg font-semibold text-white mb-6">Images</h2>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            {imagePreview.map((src, index) => (
                                <div key={index} className="relative aspect-square rounded-xl overflow-hidden bg-white/5">
                                    <img src={src} alt="" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => removeImage(index)}
                                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                                    >
                                        <XMarkIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}

                            <label className="aspect-square rounded-xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-500/10 transition-colors">
                                <PhotoIcon className="h-8 w-8 text-gray-500" />
                                <span className="mt-2 text-sm text-gray-400">Add Image</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleImageChange}
                                    className="hidden"
                                />
                            </label>
                        </div>
                    </div>

                    {/* Amenities */}
                    <div className="glass-card rounded-2xl p-6">
                        <h2 className="text-lg font-semibold text-white mb-6">Amenities</h2>

                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                value={amenityInput}
                                onChange={(e) => setAmenityInput(e.target.value)}
                                placeholder="Add amenity..."
                                className="flex-1 input-dark rounded-xl py-3 px-4"
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAmenity())}
                            />
                            <button
                                type="button"
                                onClick={addAmenity}
                                className="px-6 py-3 btn-primary rounded-xl font-medium"
                            >
                                Add
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {data.amenities.map((amenity, index) => (
                                <span
                                    key={index}
                                    className="inline-flex items-center px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-full text-sm border border-blue-500/30"
                                >
                                    {amenity}
                                    <button
                                        type="button"
                                        onClick={() => removeAmenity(index)}
                                        className="ml-2 text-blue-400 hover:text-red-400"
                                    >
                                        <XMarkIcon className="h-4 w-4" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Features */}
                    <div className="glass-card rounded-2xl p-6">
                        <h2 className="text-lg font-semibold text-white mb-6">Key Features</h2>

                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                value={featureInput}
                                onChange={(e) => setFeatureInput(e.target.value)}
                                placeholder="Add feature..."
                                className="flex-1 input-dark rounded-xl py-3 px-4"
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                            />
                            <button
                                type="button"
                                onClick={addFeature}
                                className="px-6 py-3 btn-primary rounded-xl font-medium"
                            >
                                Add
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {data.features.map((feature, index) => (
                                <span
                                    key={index}
                                    className="inline-flex items-center px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-full text-sm border border-emerald-500/30"
                                >
                                    {feature}
                                    <button
                                        type="button"
                                        onClick={() => removeFeature(index)}
                                        className="ml-2 text-emerald-400 hover:text-red-400"
                                    >
                                        <XMarkIcon className="h-4 w-4" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Featured */}
                    <div className="glass-card rounded-2xl p-6">
                        <label className="flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={data.is_featured}
                                onChange={(e) => setData('is_featured', e.target.checked)}
                                className="w-5 h-5 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500/50 focus:ring-offset-0"
                            />
                            <span className="ml-3">
                                <span className="font-medium text-white">Featured Property</span>
                                <p className="text-sm text-gray-400">Display this property on the homepage</p>
                            </span>
                        </label>
                    </div>

                    {/* Documents Section */}
                    <div className="glass-card rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-white">Property Documents</h2>
                            <Link
                                href={`/admin/properties/${property.slug}`}
                                className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
                            >
                                Manage Documents
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </Link>
                        </div>

                        {property.documents && property.documents.length > 0 ? (
                            <div className="space-y-2">
                                {property.documents.map((doc) => (
                                    <div key={doc.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                                <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-white text-sm font-medium">{doc.title || doc.name}</p>
                                                <p className="text-gray-500 text-xs">{doc.category} - {doc.formatted_size}</p>
                                            </div>
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded-full ${doc.is_public ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                            {doc.is_public ? 'Public' : 'Private'}
                                        </span>
                                    </div>
                                ))}
                                <p className="text-gray-500 text-sm mt-3">
                                    To upload, delete, or manage documents, go to the property details page.
                                </p>
                            </div>
                        ) : (
                            <div className="text-center py-6 bg-white/5 rounded-xl">
                                <svg className="w-10 h-10 text-gray-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <p className="text-gray-400 mb-2">No documents uploaded yet</p>
                                <Link
                                    href={`/admin/properties/${property.slug}`}
                                    className="text-blue-400 hover:text-blue-300 text-sm"
                                >
                                    Go to property details to upload documents
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Submit */}
                    <div className="flex items-center justify-end space-x-4">
                        <Link
                            href={`/admin/properties/${property.slug}`}
                            className="px-6 py-3 border border-white/20 rounded-xl text-gray-300 hover:bg-white/5 transition-colors"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-6 py-3 btn-primary rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {processing ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}
