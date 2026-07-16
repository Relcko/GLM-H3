import { useState } from 'react';
import {
    DocumentTextIcon,
    DocumentIcon,
    TableCellsIcon,
    PhotoIcon,
    ArchiveBoxIcon,
    ArrowDownTrayIcon,
    EyeIcon,
    FolderIcon,
    MagnifyingGlassIcon,
    FunnelIcon,
} from '@heroicons/react/24/outline';

interface Document {
    id: number;
    name: string;
    title?: string;
    description?: string;
    type: string;
    file_path: string;
    file_size: number;
    is_public: boolean;
    category: string;
    download_count: number;
    download_url: string;
    formatted_size: string;
    icon: string;
    created_at: string;
}

interface DocumentsSectionProps {
    documents: Document[];
    propertyName?: string;
}

const categoryLabels: Record<string, string> = {
    legal: 'Legal',
    financial: 'Financial',
    technical: 'Technical',
    marketing: 'Marketing',
    compliance: 'Compliance',
    other: 'Other',
};

const categoryColors: Record<string, string> = {
    legal: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300',
    financial: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300',
    technical: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
    marketing: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',
    compliance: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
    other: 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300',
};

const getIconComponent = (iconName: string) => {
    switch (iconName) {
        case 'document-text':
            return DocumentTextIcon;
        case 'document':
            return DocumentIcon;
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

export default function DocumentsSection({ documents, propertyName }: DocumentsSectionProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Get unique categories from documents
    const categories = ['all', ...new Set(documents.map(doc => doc.category))];

    // Filter documents
    const filteredDocuments = documents.filter(doc => {
        const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const handleDownload = (doc: Document) => {
        window.open(doc.download_url, '_blank');
    };

    const handleView = (doc: Document) => {
        const viewUrl = doc.download_url.replace('/download', '/view');
        window.open(viewUrl, '_blank');
    };

    const canPreview = (type: string) => {
        return ['pdf', 'jpg', 'jpeg', 'png', 'gif'].includes(type.toLowerCase());
    };

    if (documents.length === 0) {
        return (
            <div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/5 p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <FolderIcon className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Documents Available</h3>
                <p className="text-gray-500 dark:text-gray-400">
                    Property documents will appear here once they are uploaded.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/5 overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 dark:border-white/5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                            <FolderIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Property Documents</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {documents.length} document{documents.length !== 1 ? 's' : ''} available
                            </p>
                        </div>
                    </div>
                </div>

                {/* Search and Filters */}
                <div className="mt-4 flex flex-col sm:flex-row gap-3">
                    {/* Search */}
                    <div className="relative flex-1">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search documents..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                    </div>

                    {/* Category Filter */}
                    <div className="flex items-center gap-2">
                        <FunnelIcon className="w-5 h-5 text-gray-400" />
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm"
                        >
                            <option value="all">All Categories</option>
                            {categories.filter(c => c !== 'all').map((category) => (
                                <option key={category} value={category}>
                                    {categoryLabels[category] || category}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* View Toggle */}
                    <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-all ${
                                viewMode === 'grid'
                                    ? 'bg-white dark:bg-gray-700 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                            </svg>
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-all ${
                                viewMode === 'list'
                                    ? 'bg-white dark:bg-gray-700 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Documents */}
            <div className="p-6">
                {filteredDocuments.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-gray-500 dark:text-gray-400">No documents match your search.</p>
                    </div>
                ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredDocuments.map((doc) => {
                            const IconComponent = getIconComponent(doc.icon);
                            return (
                                <div
                                    key={doc.id}
                                    className="group bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all border border-transparent hover:border-gray-200 dark:hover:border-white/10"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="w-12 h-12 rounded-lg bg-white dark:bg-gray-700 flex items-center justify-center flex-shrink-0 shadow-sm">
                                            <IconComponent className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-medium text-gray-900 dark:text-white truncate">
                                                {doc.title || doc.name}
                                            </h4>
                                            {doc.description && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                                                    {doc.description}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColors[doc.category] || categoryColors.other}`}>
                                                    {categoryLabels[doc.category] || doc.category}
                                                </span>
                                                <span className="text-xs text-gray-400">
                                                    {doc.formatted_size}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                                        {canPreview(doc.type) && (
                                            <button
                                                onClick={() => handleView(doc)}
                                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                            >
                                                <EyeIcon className="w-4 h-4" />
                                                <span>View</span>
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDownload(doc)}
                                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                                        >
                                            <ArrowDownTrayIcon className="w-4 h-4" />
                                            <span>Download</span>
                                        </button>
                                    </div>

                                    {doc.download_count > 0 && (
                                        <p className="text-xs text-gray-400 text-center mt-2">
                                            {doc.download_count.toLocaleString()} download{doc.download_count !== 1 ? 's' : ''}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filteredDocuments.map((doc) => {
                            const IconComponent = getIconComponent(doc.icon);
                            return (
                                <div
                                    key={doc.id}
                                    className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-white dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                                        <IconComponent className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-gray-900 dark:text-white truncate">
                                            {doc.title || doc.name}
                                        </h4>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColors[doc.category] || categoryColors.other}`}>
                                                {categoryLabels[doc.category] || doc.category}
                                            </span>
                                            <span className="text-xs text-gray-400 uppercase">{doc.type}</span>
                                            <span className="text-xs text-gray-400">{doc.formatted_size}</span>
                                            {doc.download_count > 0 && (
                                                <span className="text-xs text-gray-400">
                                                    {doc.download_count} downloads
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {canPreview(doc.type) && (
                                            <button
                                                onClick={() => handleView(doc)}
                                                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                                title="View"
                                            >
                                                <EyeIcon className="w-5 h-5" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDownload(doc)}
                                            className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                                            title="Download"
                                        >
                                            <ArrowDownTrayIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
