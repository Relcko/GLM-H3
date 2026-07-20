import { Head, Link, useForm } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function AdminPropertiesCreate() {
    const [imagePreview, setImagePreview] = useState<string[]>([]);

    const { data, setData, post, processing, errors } = useForm({
        name: '',
        description: '',
        short_description: '',
        location: '',
        address: '',
        city: '',
        country: '',
        latitude: '',
        longitude: '',
        property_type: 'residential',
        total_value: '',
        token_price: '',
        total_tokens: '',
        expected_roi: '',
        rental_yield: '',
        appreciation_rate: '',
        dividend_frequency: '12',
        min_investment: '',
        amenities: [] as string[],
        features: [] as string[],
        status: 'draft',
        blockchain: 'sepolia',
        contract_address: '',
        token_id: '',
        property_size: '',
        property_size_unit: 'sqft',
        bedrooms: '',
        bathrooms: '',
        year_built: '',
        funding_deadline: '',
        is_featured: false,
        images: [] as File[],
    });

    const [amenityInput, setAmenityInput] = useState('');
    const [featureInput, setFeatureInput] = useState('');

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        post('/admin/properties', {
            forceFormData: true,
        });
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        setData('images', [...data.images, ...files]);

        // Create previews
        files.forEach((file) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                setImagePreview((prev) => [...prev, e.target?.result as string]);
            };
            reader.readAsDataURL(file);
        });
    };

    const removeImage = (index: number) => {
        setData('images', data.images.filter((_, i) => i !== index));
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
        <AdminLayout title="Add Property">
            <Head title="Add Property - Admin" />

            <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                    <Link href="/admin/properties" className="text-blue-400 hover:text-blue-300 transition-colors">
                        &larr; Back to Properties
                    </Link>
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
                                    Total Tokens *
                                </label>
                                <input
                                    type="number"
                                    value={data.total_tokens}
                                    onChange={(e) => setData('total_tokens', e.target.value)}
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
                                <p className="text-xs text-gray-500 mt-1">Annual property value increase for calculator</p>
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
                                    Token ID (on contract)
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
                        <h2 className="text-lg font-semibold text-white mb-6">Property Images</h2>

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

                    {/* Documents Note */}
                    <div className="glass-card rounded-2xl p-6 border border-blue-500/30 bg-blue-500/5">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                                <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-white font-medium mb-1">Property Documents</h3>
                                <p className="text-gray-400 text-sm">
                                    Documents (legal papers, financial reports, compliance certificates, etc.) can be uploaded after creating the property.
                                    Go to the property details page after creation to upload documents.
                                </p>
                            </div>
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

                    {/* Submit */}
                    <div className="flex items-center justify-end space-x-4">
                        <Link
                            href="/admin/properties"
                            className="px-6 py-3 border border-white/20 rounded-xl text-gray-300 hover:bg-white/5 transition-colors"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-6 py-3 btn-primary rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {processing ? 'Creating...' : 'Create Property'}
                        </button>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}
