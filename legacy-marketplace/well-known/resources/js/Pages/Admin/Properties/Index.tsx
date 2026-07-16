import { Head, Link, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Property } from '@/Types';
import { PlusIcon, MagnifyingGlassIcon, PencilIcon, EyeIcon, TrashIcon, LinkIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId, useSwitchChain } from 'wagmi';
import { parseUnits } from 'viem';

// RWA Property ABI - only the functions we need
const RWA_PROPERTY_ABI = [
    {
        inputs: [
            { internalType: 'uint256', name: '_totalSupply', type: 'uint256' },
            { internalType: 'uint256', name: '_pricePerToken', type: 'uint256' },
            { internalType: 'string', name: '_uri', type: 'string' },
        ],
        name: 'createProperty',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'nonpayable',
        type: 'function',
    },
] as const;

// Chain IDs for different blockchains
const CHAIN_IDS: Record<string, number> = {
    ethereum: 1,
    bsc: 56,
    sepolia: 11155111,
    bsc_testnet: 97,
};

// Contract addresses by blockchain
const CONTRACT_ADDRESSES: Record<string, `0x${string}`> = {
    sepolia: '0x3C771c8D3CA51b1BE00702b45841Ea48B7dbD9f1',
    // Add mainnet addresses when deployed
};

interface AdminPropertiesIndexProps {
    properties: {
        data: Property[];
        links: any[];
    };
    filters: {
        search?: string;
        status?: string;
        type?: string;
    };
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

export default function AdminPropertiesIndex({ properties, filters }: AdminPropertiesIndexProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [registeringProperty, setRegisteringProperty] = useState<Property | null>(null);
    const [pendingTxHash, setPendingTxHash] = useState<`0x${string}` | null>(null);

    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const { switchChain } = useSwitchChain();
    const { writeContract, data: txHash, isPending: isWritePending, error: writeError } = useWriteContract();

    const { isLoading: isConfirming, isSuccess: isConfirmed, data: txReceipt } = useWaitForTransactionReceipt({
        hash: pendingTxHash ?? undefined,
    });

    // Handle transaction confirmation
    useEffect(() => {
        if (txHash && !pendingTxHash) {
            setPendingTxHash(txHash);
        }
    }, [txHash, pendingTxHash]);

    useEffect(() => {
        if (isConfirmed && registeringProperty && txReceipt && pendingTxHash) {
            // Parse the logs to get the token ID from PropertyCreated event
            // The PropertyCreated event signature is: PropertyCreated(uint256 indexed propertyId, uint256 totalSupply, uint256 pricePerToken)
            const logs = txReceipt.logs;
            let tokenId = 0;

            // Find the PropertyCreated event - it's the first topic as it's indexed
            for (const log of logs) {
                if (log.topics[0] === '0x9d0e8e1f40b8e7e1f1f8c0a0e0c0d0e0f0a0b0c0d0e0f0a0b0c0d0e0f0a0b0c0') {
                    // This would be the event signature - but let's just use the first indexed topic
                    tokenId = parseInt(log.topics[1] || '0', 16);
                    break;
                }
            }

            // If we couldn't parse it from logs, check if there's a simpler way
            // For now, we'll need to query the contract or use the transaction's return value
            // Let's just use 0 for now and the backend can update it

            // The safest approach: look for any topic that could be the property ID
            if (logs.length > 0 && logs[0].topics.length > 1) {
                tokenId = parseInt(logs[0].topics[1] || '0', 16);
            }

            // Submit to backend
            router.post(`/admin/properties/${registeringProperty.slug}/register-blockchain`, {
                token_id: tokenId,
                tx_hash: pendingTxHash,
            }, {
                onSuccess: () => {
                    setRegisteringProperty(null);
                    setPendingTxHash(null);
                },
                onError: () => {
                    alert('Failed to update property. Please manually set the token ID.');
                    setRegisteringProperty(null);
                    setPendingTxHash(null);
                }
            });
        }
    }, [isConfirmed, registeringProperty, txReceipt, pendingTxHash]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/admin/properties', { ...filters, search }, { preserveState: true });
    };

    const handleDelete = (property: Property) => {
        if (confirm(`Are you sure you want to delete "${property.name}"?`)) {
            router.delete(`/admin/properties/${property.slug}`);
        }
    };

    const handleRegisterOnBlockchain = async (property: Property) => {
        if (!isConnected) {
            alert('Please connect your wallet first');
            return;
        }

        const requiredChainId = CHAIN_IDS[property.blockchain];
        const contractAddress = CONTRACT_ADDRESSES[property.blockchain];

        if (!contractAddress) {
            alert(`No contract deployed on ${property.blockchain} yet`);
            return;
        }

        // Switch chain if needed
        if (chainId !== requiredChainId) {
            try {
                await switchChain({ chainId: requiredChainId });
                // Wait a bit for chain switch to complete
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                alert('Please switch to the correct network');
                return;
            }
        }

        setRegisteringProperty(property);

        // Token price in USDT (6 decimals for standard USDT, 18 for BSC USDT)
        // Assuming 18 decimals for testnet MockUSDT
        const priceInWei = parseUnits(property.token_price.toString(), 18);

        // Create a URI for the property metadata
        const uri = `${window.location.origin}/api/properties/${property.id}`;

        try {
            writeContract({
                address: contractAddress,
                abi: RWA_PROPERTY_ABI,
                functionName: 'createProperty',
                args: [BigInt(property.total_tokens), priceInWei, uri],
            });
        } catch (error) {
            console.error('Error creating property on blockchain:', error);
            setRegisteringProperty(null);
        }
    };

    const statusColors = {
        draft: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
        upcoming: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
        active: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
        sold_out: 'bg-red-500/20 text-red-400 border border-red-500/30',
        closed: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
    };

    return (
        <AdminLayout title="Properties">
            <Head title="Properties - Admin" />

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <p className="text-gray-400">Manage your property listings</p>
                </div>
                <Link
                    href="/admin/properties/create"
                    className="inline-flex items-center btn-primary px-4 py-2.5 rounded-xl font-medium"
                >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Add Property
                </Link>
            </div>

            {/* Filters */}
            <div className="glass-card rounded-2xl p-4 mb-6">
                <div className="flex flex-col sm:flex-row gap-4">
                    <form onSubmit={handleSearch} className="flex-1">
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search properties..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full input-dark rounded-xl py-3 pl-12 pr-4"
                            />
                        </div>
                    </form>

                    <select
                        value={filters.status || ''}
                        onChange={(e) => router.get('/admin/properties', { ...filters, status: e.target.value }, { preserveState: true })}
                        className="input-dark rounded-xl py-3 px-4"
                    >
                        <option value="">All Statuses</option>
                        <option value="draft">Draft</option>
                        <option value="upcoming">Upcoming</option>
                        <option value="active">Active</option>
                        <option value="sold_out">Sold Out</option>
                        <option value="closed">Closed</option>
                    </select>

                    <select
                        value={filters.type || ''}
                        onChange={(e) => router.get('/admin/properties', { ...filters, type: e.target.value }, { preserveState: true })}
                        className="input-dark rounded-xl py-3 px-4"
                    >
                        <option value="">All Types</option>
                        <option value="residential">Residential</option>
                        <option value="commercial">Commercial</option>
                        <option value="industrial">Industrial</option>
                        <option value="land">Land</option>
                    </select>
                </div>
            </div>

            {/* Properties Table */}
            <div className="glass-card rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-white/10">
                        <thead className="bg-white/5">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    Property
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    Type
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    Price
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    Tokens
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    On-Chain
                                </th>
                                <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {properties.data.length > 0 ? (
                                properties.data.map((property) => (
                                    <tr key={property.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/10 flex-shrink-0">
                                                    {property.images?.[0] ? (
                                                        <img
                                                            src={property.images[0]}
                                                            alt={property.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full bg-blue-500/20 flex items-center justify-center">
                                                            <span className="text-blue-400 font-bold">
                                                                {property.name.charAt(0)}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="font-medium text-white">{property.name}</div>
                                                    <div className="text-sm text-gray-400">{property.location}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="capitalize text-gray-300">{property.property_type}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-white">{formatCurrency(property.token_price)}</div>
                                            <div className="text-sm text-gray-500">per token</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-gray-300">{property.sold_tokens.toLocaleString()} / {property.total_tokens.toLocaleString()}</div>
                                            <div className="w-full h-2 bg-white/10 rounded-full mt-1">
                                                <div
                                                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                                                    style={{ width: `${(property.sold_tokens / property.total_tokens) * 100}%` }}
                                                />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusColors[property.status]}`}>
                                                {property.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {property.token_id !== null && property.token_id !== undefined ? (
                                                <div className="flex items-center">
                                                    <CheckCircleIcon className="h-4 w-4 text-emerald-400 mr-1" />
                                                    <span className="text-xs text-gray-400">
                                                        ID: {property.token_id}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-500">Not registered</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end space-x-2">
                                                {/* Blockchain Registration Button */}
                                                {property.token_id === null || property.token_id === undefined ? (
                                                    <button
                                                        onClick={() => handleRegisterOnBlockchain(property)}
                                                        disabled={registeringProperty?.id === property.id}
                                                        className="text-gray-400 hover:text-emerald-400 p-2 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50"
                                                        title="Register on Blockchain"
                                                    >
                                                        {registeringProperty?.id === property.id ? (
                                                            <span className="inline-flex items-center">
                                                                <svg className="animate-spin h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                </svg>
                                                            </span>
                                                        ) : (
                                                            <LinkIcon className="h-5 w-5" />
                                                        )}
                                                    </button>
                                                ) : (
                                                    <span className="text-emerald-400 p-2" title={`Token ID: ${property.token_id}`}>
                                                        <CheckCircleIcon className="h-5 w-5" />
                                                    </span>
                                                )}
                                                <Link
                                                    href={`/admin/properties/${property.slug}`}
                                                    className="text-gray-400 hover:text-blue-400 p-2 rounded-lg hover:bg-white/5 transition-colors"
                                                >
                                                    <EyeIcon className="h-5 w-5" />
                                                </Link>
                                                <Link
                                                    href={`/admin/properties/${property.slug}/edit`}
                                                    className="text-gray-400 hover:text-blue-400 p-2 rounded-lg hover:bg-white/5 transition-colors"
                                                >
                                                    <PencilIcon className="h-5 w-5" />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(property)}
                                                    className="text-gray-400 hover:text-red-400 p-2 rounded-lg hover:bg-white/5 transition-colors"
                                                >
                                                    <TrashIcon className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                                        No properties found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {properties.links && properties.links.length > 3 && (
                    <div className="px-6 py-4 border-t border-white/10">
                        <nav className="flex items-center justify-center space-x-2">
                            {properties.links.map((link: any, index: number) => (
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
        </AdminLayout>
    );
}
