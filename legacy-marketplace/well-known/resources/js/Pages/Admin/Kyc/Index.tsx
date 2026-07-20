import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import {
    MagnifyingGlassIcon,
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon,
    EyeIcon,
    IdentificationIcon,
    UserGroupIcon,
    ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface User {
    id: number;
    name: string;
    email: string;
}

interface KycSubmission {
    id: number;
    user_id: number;
    user: User;
    status: 'pending' | 'submitted' | 'approved' | 'rejected';
    document_type: string | null;
    document_front: string | null;
    document_back: string | null;
    selfie: string | null;
    rejection_reason: string | null;
    submitted_at: string | null;
    verified_at: string | null;
}

interface AdminKycIndexProps {
    submissions: {
        data: KycSubmission[];
        links: any[];
    };
    filters: {
        status?: string;
        search?: string;
    };
    stats: {
        pending: number;
        approved: number;
        rejected: number;
    };
}

function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function AdminKycIndex({ submissions, filters, stats }: AdminKycIndexProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [rejectingId, setRejectingId] = useState<number | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [viewingSubmission, setViewingSubmission] = useState<KycSubmission | null>(null);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/admin/kyc', { ...filters, search }, { preserveState: true });
    };

    const handleApprove = (submission: KycSubmission) => {
        if (confirm(`Approve KYC for ${submission.user.name}?`)) {
            router.post(`/admin/kyc/${submission.id}/approve`);
        }
    };

    const handleReject = (kycId: number) => {
        if (!rejectReason.trim()) {
            alert('Please provide a reason for rejection');
            return;
        }
        router.post(`/admin/kyc/${kycId}/reject`, { reason: rejectReason }, {
            onSuccess: () => {
                setRejectingId(null);
                setRejectReason('');
            }
        });
    };

    const statusConfig = {
        pending: { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: ClockIcon },
        submitted: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: ClockIcon },
        approved: { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircleIcon },
        rejected: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircleIcon },
    };

    const documentTypeLabels: Record<string, string> = {
        passport: 'Passport',
        national_id: 'National ID',
        drivers_license: "Driver's License",
    };

    return (
        <AdminLayout title="KYC Verifications">
            <Head title="KYC Verifications - Admin" />

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="glass-card rounded-2xl p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm">Pending Review</p>
                            <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                            <ClockIcon className="h-6 w-6 text-yellow-400" />
                        </div>
                    </div>
                </div>
                <div className="glass-card rounded-2xl p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm">Approved</p>
                            <p className="text-2xl font-bold text-emerald-400">{stats.approved}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                            <CheckCircleIcon className="h-6 w-6 text-emerald-400" />
                        </div>
                    </div>
                </div>
                <div className="glass-card rounded-2xl p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm">Rejected</p>
                            <p className="text-2xl font-bold text-red-400">{stats.rejected}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                            <XCircleIcon className="h-6 w-6 text-red-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="glass-card rounded-2xl p-4 mb-6">
                <div className="flex flex-col sm:flex-row gap-4">
                    <form onSubmit={handleSearch} className="flex-1">
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search by user name or email..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full input-dark rounded-xl py-3 pl-12 pr-4"
                            />
                        </div>
                    </form>

                    <select
                        value={filters.status || ''}
                        onChange={(e) => router.get('/admin/kyc', { ...filters, status: e.target.value }, { preserveState: true })}
                        className="input-dark rounded-xl py-3 px-4"
                    >
                        <option value="">All Statuses</option>
                        <option value="submitted">Pending Review</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>
            </div>

            {/* Submissions Table */}
            <div className="glass-card rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-white/10">
                        <thead className="bg-white/5">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    User
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    Document Type
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    Submitted
                                </th>
                                <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {submissions.data.length > 0 ? (
                                submissions.data.map((submission) => {
                                    const config = statusConfig[submission.status];
                                    const Icon = config?.icon || ClockIcon;
                                    return (
                                        <tr key={submission.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div>
                                                    <div className="font-medium text-white">{submission.user?.name}</div>
                                                    <div className="text-sm text-gray-400">{submission.user?.email}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-white">
                                                    {submission.document_type ? documentTypeLabels[submission.document_type] || submission.document_type : '-'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full border ${config?.color}`}>
                                                    <Icon className="h-3.5 w-3.5 mr-1.5" />
                                                    {submission.status === 'submitted' ? 'Pending Review' : submission.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                                {submission.submitted_at ? formatDate(submission.submitted_at) : '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex items-center justify-end space-x-2">
                                                    <button
                                                        onClick={() => setViewingSubmission(submission)}
                                                        className="text-blue-400 hover:text-blue-300 p-2 rounded-lg hover:bg-blue-500/10 transition-colors"
                                                        title="View Documents"
                                                    >
                                                        <EyeIcon className="h-5 w-5" />
                                                    </button>
                                                    {submission.status === 'submitted' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleApprove(submission)}
                                                                className="text-emerald-400 hover:text-emerald-300 p-2 rounded-lg hover:bg-emerald-500/10 transition-colors"
                                                                title="Approve"
                                                            >
                                                                <CheckCircleIcon className="h-5 w-5" />
                                                            </button>
                                                            <button
                                                                onClick={() => setRejectingId(submission.id)}
                                                                className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                                                                title="Reject"
                                                            >
                                                                <XCircleIcon className="h-5 w-5" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                        No KYC submissions found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {submissions.links && submissions.links.length > 3 && (
                    <div className="px-6 py-4 border-t border-white/10">
                        <nav className="flex items-center justify-center space-x-2">
                            {submissions.links.map((link: any, index: number) => (
                                <button
                                    key={index}
                                    onClick={() => link.url && router.get(link.url)}
                                    disabled={!link.url}
                                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                        link.active
                                            ? 'bg-blue-600 text-white'
                                            : link.url
                                            ? 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                                            : 'bg-white/5 text-gray-500 cursor-not-allowed'
                                    }`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </nav>
                    </div>
                )}
            </div>

            {/* View Documents Modal */}
            {viewingSubmission && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-card rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-semibold text-white">{viewingSubmission.user.name}</h3>
                                <p className="text-sm text-gray-400">{viewingSubmission.user.email}</p>
                            </div>
                            <button
                                onClick={() => setViewingSubmission(null)}
                                className="text-gray-400 hover:text-white p-2"
                            >
                                <XCircleIcon className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="mb-4">
                            <span className="text-sm text-gray-400">Document Type: </span>
                            <span className="text-white font-medium">
                                {viewingSubmission.document_type ? documentTypeLabels[viewingSubmission.document_type] : '-'}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {viewingSubmission.document_front && (
                                <div>
                                    <p className="text-sm text-gray-400 mb-2">Document Front</p>
                                    <img
                                        src={`/storage/${viewingSubmission.document_front}`}
                                        alt="Document Front"
                                        className="w-full rounded-lg border border-white/10"
                                    />
                                </div>
                            )}
                            {viewingSubmission.document_back && (
                                <div>
                                    <p className="text-sm text-gray-400 mb-2">Document Back</p>
                                    <img
                                        src={`/storage/${viewingSubmission.document_back}`}
                                        alt="Document Back"
                                        className="w-full rounded-lg border border-white/10"
                                    />
                                </div>
                            )}
                            {viewingSubmission.selfie && (
                                <div>
                                    <p className="text-sm text-gray-400 mb-2">Selfie with Document</p>
                                    <img
                                        src={`/storage/${viewingSubmission.selfie}`}
                                        alt="Selfie"
                                        className="w-full rounded-lg border border-white/10"
                                    />
                                </div>
                            )}
                        </div>

                        {viewingSubmission.status === 'submitted' && (
                            <div className="flex space-x-3 mt-6 pt-6 border-t border-white/10">
                                <button
                                    onClick={() => {
                                        handleApprove(viewingSubmission);
                                        setViewingSubmission(null);
                                    }}
                                    className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors"
                                >
                                    Approve
                                </button>
                                <button
                                    onClick={() => {
                                        setRejectingId(viewingSubmission.id);
                                        setViewingSubmission(null);
                                    }}
                                    className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors"
                                >
                                    Reject
                                </button>
                            </div>
                        )}

                        {viewingSubmission.rejection_reason && (
                            <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                                <p className="text-sm text-red-400">
                                    <strong>Rejection Reason:</strong> {viewingSubmission.rejection_reason}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {rejectingId && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="glass-card rounded-2xl p-6 max-w-md w-full mx-4">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-white">Reject KYC</h3>
                        </div>
                        <p className="text-gray-400 mb-4">Please provide a reason for rejecting this KYC submission.</p>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Reason for rejection..."
                            className="w-full input-dark rounded-xl py-3 px-4 mb-4"
                            rows={3}
                        />
                        <div className="flex space-x-3">
                            <button
                                onClick={() => {
                                    setRejectingId(null);
                                    setRejectReason('');
                                }}
                                className="flex-1 py-2.5 px-4 border border-white/20 rounded-xl text-gray-300 hover:bg-white/5 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleReject(rejectingId)}
                                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors"
                            >
                                Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
