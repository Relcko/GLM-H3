import { Head, Link, useForm, usePage, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Property, PageProps } from '@/Types';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { useAppKit } from '@reown/appkit/react';
import {
    BuildingOfficeIcon,
    MapPinIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    CubeTransparentIcon,
    ArrowRightIcon,
    ShieldCheckIcon,
    WalletIcon,
    MinusIcon,
    PlusIcon,
    ArrowTrendingUpIcon,
    CurrencyDollarIcon,
    ChartBarIcon,
    ArrowLeftIcon,
} from '@heroicons/react/24/outline';

interface InvestmentCreateProps {
    property: Property;
}

const ERC20_ABI = [
    {
        name: 'approve',
        type: 'function',
        inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ type: 'bool' }],
    },
    {
        name: 'allowance',
        type: 'function',
        inputs: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
        ],
        outputs: [{ type: 'uint256' }],
    },
] as const;

const RWA_PROPERTY_ABI = [
    {
        name: 'purchaseTokens',
        type: 'function',
        inputs: [
            { name: '_propertyId', type: 'uint256' },
            { name: '_amount', type: 'uint256' },
        ],
        outputs: [],
    },
] as const;

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
}

export default function InvestmentCreate({ property }: InvestmentCreateProps) {
    const { auth, blockchainConfigs } = usePage<PageProps & { blockchainConfigs: any[] }>().props;
    const { address, isConnected, chain } = useAccount();
    const { open } = useAppKit();
    const [tokens, setTokens] = useState(1);
    const [step, setStep] = useState<'input' | 'approve' | 'purchase' | 'complete'>('input');
    const [error, setError] = useState<string | null>(null);

    const totalCost = tokens * property.token_price;
    const minTokens = Math.ceil(property.min_investment / property.token_price);

    // Map blockchain name to chain ID (as string since DB stores it as string)
    const blockchainToChainId: Record<string, string> = {
        ethereum: '1',
        bsc: '56',
        sepolia: '11155111',
        bsc_testnet: '97',
    };

    const chainConfig = blockchainConfigs?.find(
        (c: any) => String(c.chain_id) === blockchainToChainId[property.blockchain]
    );

    const { data, setData, post, processing, errors: formErrors } = useForm({
        tokens: tokens,
        tx_hash: '',
        blockchain: property.blockchain,
    });

    const { writeContract: writeApprove, data: approveHash, isPending: isApproving } = useWriteContract();
    const { writeContract: writePurchase, data: purchaseHash, isPending: isPurchasing } = useWriteContract();
    const { isLoading: isWaitingApprove, isSuccess: approveSuccess } = useWaitForTransactionReceipt({
        hash: approveHash,
    });
    const { isLoading: isWaitingPurchase, isSuccess: purchaseSuccess } = useWaitForTransactionReceipt({
        hash: purchaseHash,
    });

    useEffect(() => {
        if (approveSuccess) {
            setStep('purchase');
        }
    }, [approveSuccess]);

    useEffect(() => {
        if (purchaseSuccess && purchaseHash) {
            setStep('complete');
            // Auto-submit the investment to the backend
            router.post(`/invest/${property.id}`, {
                tokens: tokens,
                tx_hash: purchaseHash,
                blockchain: property.blockchain,
            });
        }
    }, [purchaseSuccess, purchaseHash]);

    const handleApprove = async () => {
        if (!chainConfig?.payment_token_address || !chainConfig?.contract_address) {
            setError('Blockchain configuration not found');
            return;
        }

        try {
            const amount = parseUnits(totalCost.toString(), chainConfig.payment_token_decimals || 18);

            writeApprove({
                address: chainConfig.payment_token_address as `0x${string}`,
                abi: ERC20_ABI,
                functionName: 'approve',
                args: [chainConfig.contract_address as `0x${string}`, amount],
            });

            setStep('approve');
        } catch (err: any) {
            setError(err.message || 'Failed to approve transaction');
        }
    };

    const handlePurchase = async () => {
        if (!chainConfig?.contract_address || !property.token_id) {
            setError('Contract configuration not found');
            return;
        }

        try {
            writePurchase({
                address: chainConfig.contract_address as `0x${string}`,
                abi: RWA_PROPERTY_ABI,
                functionName: 'purchaseTokens',
                args: [BigInt(property.token_id), BigInt(tokens)],
            });
        } catch (err: any) {
            setError(err.message || 'Failed to purchase tokens');
        }
    };

    const handleSubmit = () => {
        if (!purchaseHash) return;
        post(`/invest/${property.id}`);
    };

    return (
        <MainLayout>
            <Head title={`Invest in ${property.name}`} />

            {/* Hero */}
            <section className="relative py-8 overflow-hidden bg-gray-50 dark:bg-transparent border-b border-gray-200 dark:border-white/5">
                <div className="absolute inset-0 bg-gradient-to-b from-blue-50 dark:from-blue-950/30 to-transparent" />

                <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <nav className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
                        <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Home</Link>
                        <span className="text-gray-400 dark:text-gray-600">/</span>
                        <Link href="/properties" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Properties</Link>
                        <span className="text-gray-400 dark:text-gray-600">/</span>
                        <Link href={`/properties/${property.slug}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">{property.name}</Link>
                        <span className="text-gray-400 dark:text-gray-600">/</span>
                        <span className="text-gray-900 dark:text-white">Invest</span>
                    </nav>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center">
                                <CubeTransparentIcon className="h-5 w-5 text-white" />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invest in Property</h1>
                        </div>
                        <Link
                            href={`/properties/${property.slug}`}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-all text-sm"
                        >
                            <ArrowLeftIcon className="w-4 h-4" />
                            Back to Property
                        </Link>
                    </div>
                </div>
            </section>

            <section className="py-12">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Property Summary */}
                        <div className="bg-white dark:bg-white/[0.03] rounded-2xl p-6 border border-gray-200 dark:border-white/5 shadow-sm">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                                    <BuildingOfficeIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Property Details</h2>
                            </div>

                            <div className="flex items-start space-x-4 mb-6">
                                <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 dark:bg-white/5 flex-shrink-0">
                                    {property.images?.[0] ? (
                                        <img
                                            src={property.images[0]}
                                            alt={property.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <BuildingOfficeIcon className="h-8 w-8 text-gray-400 dark:text-gray-600" />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white">{property.name}</h3>
                                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        <MapPinIcon className="h-4 w-4 mr-1 text-blue-600 dark:text-blue-400" />
                                        {property.location}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between py-3 border-b border-gray-100 dark:border-white/5">
                                    <span className="text-gray-500 dark:text-gray-400 flex items-center">
                                        <CurrencyDollarIcon className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                                        Token Price
                                    </span>
                                    <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(property.token_price)}</span>
                                </div>
                                <div className="flex justify-between py-3 border-b border-gray-100 dark:border-white/5">
                                    <span className="text-gray-500 dark:text-gray-400 flex items-center">
                                        <ChartBarIcon className="h-4 w-4 mr-2 text-cyan-600 dark:text-cyan-400" />
                                        Available Tokens
                                    </span>
                                    <span className="font-semibold text-gray-900 dark:text-white">{property.available_tokens.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between py-3 border-b border-gray-100 dark:border-white/5">
                                    <span className="text-gray-500 dark:text-gray-400 flex items-center">
                                        <ArrowTrendingUpIcon className="h-4 w-4 mr-2 text-emerald-600 dark:text-emerald-400" />
                                        Expected ROI
                                    </span>
                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{property.expected_roi}%</span>
                                </div>
                                <div className="flex justify-between py-3 border-b border-gray-100 dark:border-white/5">
                                    <span className="text-gray-500 dark:text-gray-400">Min Investment</span>
                                    <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(property.min_investment)}</span>
                                </div>
                                <div className="flex justify-between py-3">
                                    <span className="text-gray-500 dark:text-gray-400">Blockchain</span>
                                    <span className={`font-semibold px-3 py-1 rounded-full text-xs ${
                                        property.blockchain === 'ethereum' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400' :
                                        property.blockchain === 'sepolia' ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400' :
                                        property.blockchain === 'bsc_testnet' ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400' :
                                        'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                                    }`}>
                                        {property.blockchain === 'ethereum' ? 'Ethereum' :
                                         property.blockchain === 'sepolia' ? 'Sepolia (Testnet)' :
                                         property.blockchain === 'bsc_testnet' ? 'BSC Testnet' : 'BSC'}
                                    </span>
                                </div>
                            </div>

                            {/* Security Badge */}
                            <div className="mt-6 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl p-4 border border-emerald-200 dark:border-emerald-500/20">
                                <div className="flex items-center space-x-3">
                                    <ShieldCheckIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                    <div>
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">Secured Investment</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Smart contract audited & verified</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Investment Form */}
                        <div className="bg-white dark:bg-white/[0.03] rounded-2xl p-6 border border-gray-200 dark:border-white/5 shadow-sm">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center">
                                    <WalletIcon className="h-5 w-5 text-white" />
                                </div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Investment Amount</h2>
                            </div>

                            {/* Wallet Connection */}
                            {!isConnected ? (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                                        <WalletIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-400 mb-6">Connect your wallet to start investing</p>
                                    <button
                                        onClick={() => open()}
                                        className="px-6 py-3 rounded-xl bg-gray-900 text-white font-semibold hover:bg-gray-800 transition-all flex items-center space-x-2 mx-auto"
                                    >
                                        <WalletIcon className="w-5 h-5" />
                                        <span>Connect Wallet</span>
                                    </button>
                                </div>
                            ) : step === 'complete' ? (
                                <div className="text-center py-8">
                                    <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                                        <CheckCircleIcon className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Transaction Submitted!</h3>
                                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                                        Your investment has been submitted. We will verify the transaction and update your portfolio.
                                    </p>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={processing}
                                        className="bg-gray-900 text-white py-3 px-8 rounded-xl font-semibold flex items-center justify-center space-x-2 mx-auto hover:bg-gray-800 transition-all disabled:opacity-50"
                                    >
                                        {processing ? (
                                            <>
                                                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                </svg>
                                                <span>Submitting...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Confirm Investment</span>
                                                <ArrowRightIcon className="h-4 w-4" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {/* Token Input */}
                                    <div className="mb-6">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                            Number of Tokens
                                        </label>
                                        <div className="flex items-center space-x-4">
                                            <button
                                                onClick={() => setTokens(Math.max(minTokens, tokens - 1))}
                                                className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 hover:border-gray-300 dark:hover:border-white/20 transition-all flex items-center justify-center"
                                            >
                                                <MinusIcon className="h-5 w-5" />
                                            </button>
                                            <input
                                                type="number"
                                                value={tokens}
                                                onChange={(e) => setTokens(Math.max(minTokens, parseInt(e.target.value) || minTokens))}
                                                min={minTokens}
                                                max={property.available_tokens}
                                                className="flex-1 text-center text-2xl font-bold rounded-xl py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-900/20 dark:focus:ring-white/20 focus:border-gray-400 dark:focus:border-white/30 transition-all"
                                            />
                                            <button
                                                onClick={() => setTokens(Math.min(property.available_tokens, tokens + 1))}
                                                className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 hover:border-gray-300 dark:hover:border-white/20 transition-all flex items-center justify-center"
                                            >
                                                <PlusIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-500 text-center">
                                            Min: {minTokens} | Max: {property.available_tokens.toLocaleString()}
                                        </p>
                                    </div>

                                    {/* Cost Summary */}
                                    <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-5 mb-6 border border-gray-200 dark:border-white/5">
                                        <div className="flex justify-between mb-3">
                                            <span className="text-gray-500 dark:text-gray-400">Tokens</span>
                                            <span className="font-medium text-gray-900 dark:text-white">{tokens}</span>
                                        </div>
                                        <div className="flex justify-between mb-3">
                                            <span className="text-gray-500 dark:text-gray-400">Price per Token</span>
                                            <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(property.token_price)}</span>
                                        </div>
                                        <div className="border-t border-gray-200 dark:border-white/10 mt-3 pt-3">
                                            <div className="flex justify-between items-center">
                                                <span className="font-semibold text-gray-900 dark:text-white">Total Cost</span>
                                                <span className="font-bold text-2xl text-gray-900 dark:text-white">
                                                    {formatCurrency(totalCost)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Error Message */}
                                    {error && (
                                        <div className="bg-red-50 dark:bg-red-500/10 rounded-xl p-4 mb-4 border border-red-200 dark:border-red-500/20">
                                            <div className="flex items-center">
                                                <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400 mr-3" />
                                                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    {step === 'input' && (
                                        <button
                                            onClick={handleApprove}
                                            disabled={isApproving || tokens < minTokens}
                                            className="w-full bg-gray-900 text-white py-4 px-6 rounded-xl font-bold text-lg flex items-center justify-center space-x-2 hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isApproving ? (
                                                <>
                                                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                    </svg>
                                                    <span>Approving...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span>Approve & Invest</span>
                                                    <ArrowRightIcon className="h-5 w-5" />
                                                </>
                                            )}
                                        </button>
                                    )}

                                    {step === 'approve' && (
                                        <div className="text-center py-6">
                                            <div className="w-12 h-12 rounded-full border-2 border-gray-900 dark:border-white border-t-transparent animate-spin mx-auto mb-4"></div>
                                            <p className="text-gray-600 dark:text-gray-400">
                                                {isWaitingApprove ? 'Waiting for approval confirmation...' : 'Processing approval...'}
                                            </p>
                                        </div>
                                    )}

                                    {step === 'purchase' && (
                                        <button
                                            onClick={handlePurchase}
                                            disabled={isPurchasing || isWaitingPurchase}
                                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 px-6 rounded-xl font-bold text-lg flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {isPurchasing || isWaitingPurchase ? (
                                                <>
                                                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                    </svg>
                                                    <span>Processing...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span>Complete Purchase</span>
                                                    <CheckCircleIcon className="h-5 w-5" />
                                                </>
                                            )}
                                        </button>
                                    )}

                                    <p className="mt-4 text-xs text-gray-500 dark:text-gray-500 text-center">
                                        By investing, you agree to our Terms of Service and acknowledge that investments carry risk.
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </MainLayout>
    );
}
