import { Head, useForm, Link } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import {
    IdentificationIcon,
    DocumentTextIcon,
    CameraIcon,
    CheckCircleIcon,
    ClockIcon,
    XCircleIcon,
    ExclamationTriangleIcon,
    ShieldCheckIcon,
    ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';

interface KycVerification {
    id: number;
    status: 'pending' | 'submitted' | 'approved' | 'rejected';
    document_type: string | null;
    rejection_reason: string | null;
    submitted_at: string | null;
    verified_at: string | null;
}

interface KycIndexProps {
    kyc: KycVerification | null;
}

export default function KycIndex({ kyc }: KycIndexProps) {
    const [documentFrontPreview, setDocumentFrontPreview] = useState<string | null>(null);
    const [documentBackPreview, setDocumentBackPreview] = useState<string | null>(null);
    const [selfiePreview, setSelfiePreview] = useState<string | null>(null);

    const { data, setData, post, processing, errors, progress } = useForm({
        document_type: 'passport',
        document_front: null as File | null,
        document_back: null as File | null,
        selfie: null as File | null,
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'document_front' | 'document_back' | 'selfie') => {
        const file = e.target.files?.[0];
        if (file) {
            setData(field, file);
            const reader = new FileReader();
            reader.onloadend = () => {
                if (field === 'document_front') setDocumentFrontPreview(reader.result as string);
                if (field === 'document_back') setDocumentBackPreview(reader.result as string);
                if (field === 'selfie') setSelfiePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/kyc', {
            forceFormData: true,
        });
    };

    // If approved, show success message
    if (kyc?.status === 'approved') {
        return (
            <MainLayout>
                <Head title="KYC Verification" />

                {/* Header */}
                <section className="relative py-8 overflow-hidden bg-gray-50 dark:bg-transparent border-b border-gray-200 dark:border-white/5">
                    <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center">
                                    <ShieldCheckIcon className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Identity Verification</h1>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">KYC Status</p>
                                </div>
                            </div>
                            <Link
                                href="/dashboard/settings"
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-all text-sm"
                            >
                                <ArrowLeftIcon className="w-4 h-4" />
                                Back to Settings
                            </Link>
                        </div>
                    </div>
                </section>

                <div className="py-12">
                    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
                        <div className="bg-white dark:bg-white/[0.03] rounded-2xl p-8 text-center border border-gray-200 dark:border-white/5">
                            <div className="w-20 h-20 mx-auto rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center mb-6">
                                <CheckCircleIcon className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">KYC Verified</h2>
                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                Your identity has been verified. You can now invest in properties.
                            </p>
                            <Link
                                href="/properties"
                                className="inline-flex items-center px-6 py-3 rounded-xl bg-gray-900 text-white font-semibold hover:bg-gray-800 transition-all"
                            >
                                Browse Properties
                            </Link>
                        </div>
                    </div>
                </div>
            </MainLayout>
        );
    }

    // If submitted, show pending message
    if (kyc?.status === 'submitted') {
        return (
            <MainLayout>
                <Head title="KYC Verification" />

                {/* Header */}
                <section className="relative py-8 overflow-hidden bg-gray-50 dark:bg-transparent border-b border-gray-200 dark:border-white/5">
                    <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
                                    <ClockIcon className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Identity Verification</h1>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">KYC Status</p>
                                </div>
                            </div>
                            <Link
                                href="/dashboard/settings"
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-all text-sm"
                            >
                                <ArrowLeftIcon className="w-4 h-4" />
                                Back to Settings
                            </Link>
                        </div>
                    </div>
                </section>

                <div className="py-12">
                    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
                        <div className="bg-white dark:bg-white/[0.03] rounded-2xl p-8 text-center border border-gray-200 dark:border-white/5">
                            <div className="w-20 h-20 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center mb-6">
                                <ClockIcon className="h-10 w-10 text-amber-600 dark:text-amber-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Verification In Progress</h2>
                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                Your documents are being reviewed. This usually takes 1-2 business days.
                            </p>
                            <div className="text-sm text-gray-500 dark:text-gray-500">
                                Submitted on {new Date(kyc.submitted_at!).toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <Head title="KYC Verification" />

            {/* Header */}
            <section className="relative py-8 overflow-hidden bg-gray-50 dark:bg-transparent border-b border-gray-200 dark:border-white/5">
                <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center">
                                <ShieldCheckIcon className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Identity Verification</h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Complete KYC to start investing</p>
                            </div>
                        </div>
                        <Link
                            href="/dashboard/settings"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-all text-sm"
                        >
                            <ArrowLeftIcon className="w-4 h-4" />
                            Back to Settings
                        </Link>
                    </div>
                </div>
            </section>

            <div className="py-12">
                <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                    {/* Rejection Notice */}
                    {kyc?.status === 'rejected' && (
                        <div className="bg-red-50 dark:bg-red-500/10 rounded-2xl p-6 mb-8 border border-red-200 dark:border-red-500/20">
                            <div className="flex items-start space-x-4">
                                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center flex-shrink-0">
                                    <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-red-700 dark:text-red-400 mb-1">Verification Rejected</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{kyc.rejection_reason}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Please resubmit your documents.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="bg-white dark:bg-white/[0.03] rounded-2xl p-6 md:p-8 space-y-8 border border-gray-200 dark:border-white/5">
                            {/* Document Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                    Document Type
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {[
                                        { value: 'passport', label: 'Passport' },
                                        { value: 'national_id', label: 'National ID' },
                                        { value: 'drivers_license', label: "Driver's License" },
                                    ].map((option) => (
                                        <label
                                            key={option.value}
                                            className={`flex items-center justify-center p-4 rounded-xl border cursor-pointer transition-all ${
                                                data.document_type === option.value
                                                    ? 'bg-blue-50 dark:bg-blue-500/20 border-blue-300 dark:border-blue-500/50 text-blue-700 dark:text-white'
                                                    : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="document_type"
                                                value={option.value}
                                                checked={data.document_type === option.value}
                                                onChange={(e) => setData('document_type', e.target.value)}
                                                className="sr-only"
                                            />
                                            <span className="font-medium">{option.label}</span>
                                        </label>
                                    ))}
                                </div>
                                {errors.document_type && (
                                    <p className="mt-2 text-sm text-red-500">{errors.document_type}</p>
                                )}
                            </div>

                            {/* Document Front */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                    <DocumentTextIcon className="inline h-5 w-5 mr-2" />
                                    Document Front
                                </label>
                                <div
                                    className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                                        documentFrontPreview
                                            ? 'border-blue-300 dark:border-blue-500/50 bg-blue-50 dark:bg-blue-500/10'
                                            : 'border-gray-300 dark:border-white/20 hover:border-gray-400 dark:hover:border-white/40'
                                    }`}
                                >
                                    {documentFrontPreview ? (
                                        <div className="relative">
                                            <img
                                                src={documentFrontPreview}
                                                alt="Document front preview"
                                                className="max-h-48 mx-auto rounded-lg"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setDocumentFrontPreview(null);
                                                    setData('document_front', null);
                                                }}
                                                className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600"
                                            >
                                                <XCircleIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <IdentificationIcon className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                                            <p className="text-gray-600 dark:text-gray-400 mb-2">
                                                Upload the front of your document
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                PNG, JPG up to 5MB
                                            </p>
                                        </>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleFileChange(e, 'document_front')}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                </div>
                                {errors.document_front && (
                                    <p className="mt-2 text-sm text-red-500">{errors.document_front}</p>
                                )}
                            </div>

                            {/* Document Back */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                    <DocumentTextIcon className="inline h-5 w-5 mr-2" />
                                    Document Back (Optional)
                                </label>
                                <div
                                    className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                                        documentBackPreview
                                            ? 'border-blue-300 dark:border-blue-500/50 bg-blue-50 dark:bg-blue-500/10'
                                            : 'border-gray-300 dark:border-white/20 hover:border-gray-400 dark:hover:border-white/40'
                                    }`}
                                >
                                    {documentBackPreview ? (
                                        <div className="relative">
                                            <img
                                                src={documentBackPreview}
                                                alt="Document back preview"
                                                className="max-h-48 mx-auto rounded-lg"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setDocumentBackPreview(null);
                                                    setData('document_back', null);
                                                }}
                                                className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600"
                                            >
                                                <XCircleIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <IdentificationIcon className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                                            <p className="text-gray-600 dark:text-gray-400 mb-2">
                                                Upload the back of your document
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                PNG, JPG up to 5MB
                                            </p>
                                        </>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleFileChange(e, 'document_back')}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                </div>
                            </div>

                            {/* Selfie */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                    <CameraIcon className="inline h-5 w-5 mr-2" />
                                    Selfie with Document
                                </label>
                                <div
                                    className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                                        selfiePreview
                                            ? 'border-blue-300 dark:border-blue-500/50 bg-blue-50 dark:bg-blue-500/10'
                                            : 'border-gray-300 dark:border-white/20 hover:border-gray-400 dark:hover:border-white/40'
                                    }`}
                                >
                                    {selfiePreview ? (
                                        <div className="relative">
                                            <img
                                                src={selfiePreview}
                                                alt="Selfie preview"
                                                className="max-h-48 mx-auto rounded-lg"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelfiePreview(null);
                                                    setData('selfie', null);
                                                }}
                                                className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600"
                                            >
                                                <XCircleIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <CameraIcon className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                                            <p className="text-gray-600 dark:text-gray-400 mb-2">
                                                Take a selfie holding your document
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                PNG, JPG up to 5MB
                                            </p>
                                        </>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleFileChange(e, 'selfie')}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                </div>
                                {errors.selfie && (
                                    <p className="mt-2 text-sm text-red-500">{errors.selfie}</p>
                                )}
                            </div>

                            {/* Upload Progress */}
                            {progress && (
                                <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-2">
                                    <div
                                        className="bg-blue-600 h-2 rounded-full transition-all"
                                        style={{ width: `${progress.percentage}%` }}
                                    />
                                </div>
                            )}

                            {/* Submit Button */}
                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={processing || !data.document_front || !data.selfie}
                                    className="w-full bg-gray-900 text-white py-4 rounded-xl font-semibold hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {processing ? 'Submitting...' : 'Submit for Verification'}
                                </button>
                            </div>
                        </div>
                    </form>

                    {/* Info Box */}
                    <div className="mt-8 bg-white dark:bg-white/[0.03] rounded-2xl p-6 border border-gray-200 dark:border-white/5">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Why do we need KYC?</h3>
                        <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                            <li className="flex items-start space-x-3">
                                <CheckCircleIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                                <span>Comply with financial regulations and anti-money laundering laws</span>
                            </li>
                            <li className="flex items-start space-x-3">
                                <CheckCircleIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                                <span>Protect our platform and users from fraud</span>
                            </li>
                            <li className="flex items-start space-x-3">
                                <CheckCircleIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                                <span>Enable secure property token ownership</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
