import { Head, Link, useForm, router } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Property, PropertyDocument } from '@/Types';
import {
    ArrowLeftIcon,
    PencilIcon,
    TrashIcon,
    DocumentTextIcon,
    DocumentIcon,
    PhotoIcon,
    TableCellsIcon,
    ArchiveBoxIcon,
    ArrowDownTrayIcon,
    EyeIcon,
    PlusIcon,
    XMarkIcon,
    CurrencyDollarIcon,
    UserGroupIcon,
    ChartBarIcon,
    BuildingOfficeIcon,
    MapPinIcon,
    CalendarDaysIcon,
    LinkIcon,
} from '@heroicons/react/24/outline';

interface AdminPropertyShowProps {
    property: Property;
    stats: {
        total_investors: number;
        total_invested: number;
        pending_investments: number;
    };
}

const categoryOptions = [
    { value: 'legal', label: 'Legal' },
    { value: 'financial', label: 'Financial' },
    { value: 'technical', label: 'Technical' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'compliance', label: 'Compliance' },
    { value: 'other', label: 'Other' },
];

const categoryColors: Record<string, string> = {
    legal: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    financial: 'bg-green-500/20 text-green-400 border-green-500/30',
    technical: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    marketing: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    compliance: 'bg-red-500/20 text-red-400 border-red-500/30',
    other: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const getIconComponent = (iconName: string) => {
    switch (iconName) {
        case 'document-text':
            return DocumentTextIcon;
        case 'table-cells':
            return TableCellsIcon;
        case 'photo':
            return PhotoIcon;
        case 'archive-box':
            return ArchiveBoxIcon;
        default:
            return DocumentIcon;
    }
};

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

export default function AdminPropertyShow({ property, stats }: AdminPropertyShowProps) {
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [deletingDocId, setDeletingDocId] = useState<number | null>(null);

    const uploadForm = useForm({
        name: '',
        title: '',
        description: '',
        type: '',
        category: 'other',
        file: null as File | null,
        is_public: true,
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            uploadForm.setData('file', file);
            if (!uploadForm.data.name) {
                uploadForm.setData('name', file.name);
            }
            // Auto-detect file type
            const ext = file.name.split('.').pop()?.toLowerCase() || '';
            uploadForm.setData('type', ext);
        }
    };

    const handleUploadSubmit = (e: FormEvent) => {
        e.preventDefault();
        uploadForm.post(`/admin/properties/${property.slug}/documents`, {
            forceFormData: true,
            onSuccess: () => {
                setShowUploadModal(false);
                uploadForm.reset();
            },
        });
    };

    const handleDeleteDocument = (docId: number) => {
        if (confirm('Are you sure you want to delete this document?')) {
            setDeletingDocId(docId);
            router.delete(`/admin/properties/${property.slug}/documents/${docId}`, {
                onFinish: () => setDeletingDocId(null),
            });
        }
    };

    const statusConfig = {
        draft: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Draft' },
        upcoming: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Upcoming' },
        active: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Active' },
        sold_out: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Sold Out' },
        closed: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Closed' },
    };

    const status = statusConfig[property.status] || statusConfig.draft;
    const fundingProgress = property.total_tokens > 0 ? (property.sold_tokens / property.total_tokens) * 100 : 0;

    return (
        <AdminLayout title={property.name}>
            <Head title={`${property.name} - Admin`} />

            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/admin/properties"
                            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                        >
                            <ArrowLeftIcon className="h-5 w-5 text-gray-400" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-white">{property.name}</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <MapPinIcon className="h-4 w-4 text-gray-500" />
                                <span className="text-gray-400 text-sm">{property.location}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.bg} ${status.text}`}>
                            {status.label}
                        </span>
                        <Link
                            href={`/admin/properties/${property.slug}/edit`}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                        >
                            <PencilIcon className="h-4 w-4" />
                            <span>Edit</span>
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="glass-card rounded-xl p-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                        <CurrencyDollarIcon className="h-5 w-5 text-emerald-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-400">Total Invested</p>
                                        <p className="text-xl font-bold text-white">{formatCurrency(stats.total_invested)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="glass-card rounded-xl p-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                        <UserGroupIcon className="h-5 w-5 text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-400">Total Investors</p>
                                        <p className="text-xl font-bold text-white">{stats.total_investors}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="glass-card rounded-xl p-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                                        <CalendarDaysIcon className="h-5 w-5 text-amber-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-400">Pending</p>
                                        <p className="text-xl font-bold text-white">{stats.pending_investments}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Funding Progress */}
                        <div className="glass-card rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">Funding Progress</h3>
                            <div className="mb-3">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-400">{property.sold_tokens.toLocaleString()} tokens sold</span>
                                    <span className="text-white font-medium">{fundingProgress.toFixed(1)}%</span>
                                </div>
                                <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all"
                                        style={{ width: `${fundingProgress}%` }}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-between text-sm text-gray-400">
                                <span>Available: {property.available_tokens.toLocaleString()}</span>
                                <span>Total: {property.total_tokens.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Documents Section */}
                        <div className="glass-card rounded-xl p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold text-white">Documents</h3>
                                <button
                                    onClick={() => setShowUploadModal(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                                >
                                    <PlusIcon className="h-4 w-4" />
                                    <span>Upload Document</span>
                                </button>
                            </div>

                            {property.documents && property.documents.length > 0 ? (
                                <div className="space-y-3">
                                    {property.documents.map((doc) => {
                                        const IconComponent = getIconComponent(doc.icon);
                                        return (
                                            <div
                                                key={doc.id}
                                                className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-all"
                                            >
                                                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                                                    <IconComponent className="h-5 w-5 text-blue-400" />
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-medium text-white truncate">
                                                        {doc.title || doc.name}
                                                    </h4>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className={`text-xs px-2 py-0.5 rounded-full border ${categoryColors[doc.category] || categoryColors.other}`}>
                                                            {doc.category}
                                                        </span>
                                                        <span className="text-xs text-gray-500 uppercase">{doc.type}</span>
                                                        <span className="text-xs text-gray-500">{doc.formatted_size}</span>
                                                        {doc.download_count > 0 && (
                                                            <span className="text-xs text-gray-500">
                                                                {doc.download_count} downloads
                                                            </span>
                                                        )}
                                                        <span className={`text-xs px-2 py-0.5 rounded-full ${doc.is_public ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                                            {doc.is_public ? 'Public' : 'Private'}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <a
                                                        href={doc.download_url.replace('/download', '/view')}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                                        title="View"
                                                    >
                                                        <EyeIcon className="h-5 w-5" />
                                                    </a>
                                                    <a
                                                        href={doc.download_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                                        title="Download"
                                                    >
                                                        <ArrowDownTrayIcon className="h-5 w-5" />
                                                    </a>
                                                    <button
                                                        onClick={() => handleDeleteDocument(doc.id)}
                                                        disabled={deletingDocId === doc.id}
                                                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                                                        title="Delete"
                                                    >
                                                        <TrashIcon className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <DocumentIcon className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                                    <p className="text-gray-400">No documents uploaded yet</p>
                                    <button
                                        onClick={() => setShowUploadModal(true)}
                                        className="mt-3 text-blue-400 hover:text-blue-300 transition-colors text-sm"
                                    >
                                        Upload your first document
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Property Images */}
                        {property.images && property.images.length > 0 && (
                            <div className="glass-card rounded-xl p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">Images</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {property.images.map((image, index) => (
                                        <div key={index} className="aspect-video rounded-lg overflow-hidden bg-white/5">
                                            <img src={image} alt={`Property ${index + 1}`} className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Property Details */}
                        <div className="glass-card rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">Property Details</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between py-2 border-b border-white/5">
                                    <span className="text-gray-400">Total Value</span>
                                    <span className="text-white font-medium">{formatCurrency(property.total_value)}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-white/5">
                                    <span className="text-gray-400">Token Price</span>
                                    <span className="text-white font-medium">{formatCurrency(property.token_price)}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-white/5">
                                    <span className="text-gray-400">Min Investment</span>
                                    <span className="text-white font-medium">{formatCurrency(property.min_investment)}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-white/5">
                                    <span className="text-gray-400">Expected ROI</span>
                                    <span className="text-emerald-400 font-medium">{property.expected_roi}%</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-white/5">
                                    <span className="text-gray-400">Rental Yield</span>
                                    <span className="text-blue-400 font-medium">{property.rental_yield || 0}%</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-white/5">
                                    <span className="text-gray-400">Type</span>
                                    <span className="text-white capitalize">{property.property_type}</span>
                                </div>
                                <div className="flex justify-between py-2">
                                    <span className="text-gray-400">Blockchain</span>
                                    <span className="text-white">{property.blockchain}</span>
                                </div>
                            </div>
                        </div>

                        {/* Blockchain Info */}
                        {property.contract_address && (
                            <div className="glass-card rounded-xl p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">Blockchain</h3>
                                <div className="space-y-3">
                                    {property.token_id !== undefined && (
                                        <div>
                                            <p className="text-sm text-gray-400 mb-1">Token ID</p>
                                            <p className="text-white font-mono">{property.token_id}</p>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-sm text-gray-400 mb-1">Contract Address</p>
                                        <p className="text-white font-mono text-xs break-all">{property.contract_address}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Quick Actions */}
                        <div className="glass-card rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                            <div className="space-y-3">
                                <Link
                                    href={`/properties/${property.slug}`}
                                    target="_blank"
                                    className="flex items-center gap-3 w-full p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors text-gray-300 hover:text-white"
                                >
                                    <LinkIcon className="h-5 w-5" />
                                    <span>View Public Page</span>
                                </Link>
                                <Link
                                    href={`/admin/properties/${property.slug}/edit`}
                                    className="flex items-center gap-3 w-full p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors text-gray-300 hover:text-white"
                                >
                                    <PencilIcon className="h-5 w-5" />
                                    <span>Edit Property</span>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Upload Document Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-[#1a1a2e] rounded-2xl w-full max-w-lg shadow-2xl border border-white/10">
                        <div className="flex items-center justify-between p-6 border-b border-white/10">
                            <h3 className="text-lg font-semibold text-white">Upload Document</h3>
                            <button
                                onClick={() => setShowUploadModal(false)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <XMarkIcon className="h-5 w-5 text-gray-400" />
                            </button>
                        </div>

                        <form onSubmit={handleUploadSubmit} className="p-6 space-y-4">
                            {/* File Upload */}
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    File *
                                </label>
                                <label className="block w-full p-6 border-2 border-dashed border-white/20 rounded-xl text-center cursor-pointer hover:border-blue-500 hover:bg-blue-500/10 transition-colors">
                                    <DocumentIcon className="h-10 w-10 text-gray-500 mx-auto mb-2" />
                                    {uploadForm.data.file ? (
                                        <p className="text-white">{uploadForm.data.file.name}</p>
                                    ) : (
                                        <p className="text-gray-400">Click to select file</p>
                                    )}
                                    <input
                                        type="file"
                                        onChange={handleFileChange}
                                        className="hidden"
                                        required
                                    />
                                </label>
                                {uploadForm.errors.file && (
                                    <p className="mt-1 text-sm text-red-400">{uploadForm.errors.file}</p>
                                )}
                            </div>

                            {/* Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    File Name *
                                </label>
                                <input
                                    type="text"
                                    value={uploadForm.data.name}
                                    onChange={(e) => uploadForm.setData('name', e.target.value)}
                                    className="w-full input-dark rounded-xl py-3 px-4"
                                    required
                                />
                            </div>

                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    Display Title
                                </label>
                                <input
                                    type="text"
                                    value={uploadForm.data.title}
                                    onChange={(e) => uploadForm.setData('title', e.target.value)}
                                    placeholder="Optional display title"
                                    className="w-full input-dark rounded-xl py-3 px-4"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={uploadForm.data.description}
                                    onChange={(e) => uploadForm.setData('description', e.target.value)}
                                    placeholder="Brief description of the document"
                                    rows={2}
                                    className="w-full input-dark rounded-xl py-3 px-4"
                                />
                            </div>

                            {/* Category */}
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    Category *
                                </label>
                                <select
                                    value={uploadForm.data.category}
                                    onChange={(e) => uploadForm.setData('category', e.target.value)}
                                    className="w-full input-dark rounded-xl py-3 px-4"
                                    required
                                >
                                    {categoryOptions.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Public Toggle */}
                            <div>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={uploadForm.data.is_public}
                                        onChange={(e) => uploadForm.setData('is_public', e.target.checked)}
                                        className="w-5 h-5 rounded border-white/20 bg-white/5 text-blue-500"
                                    />
                                    <span className="text-white">Make publicly visible</span>
                                </label>
                                <p className="text-sm text-gray-500 mt-1 ml-8">
                                    Public documents can be viewed and downloaded by all users
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowUploadModal(false)}
                                    className="px-4 py-2 border border-white/20 rounded-xl text-gray-300 hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploadForm.processing}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                    {uploadForm.processing ? 'Uploading...' : 'Upload'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
