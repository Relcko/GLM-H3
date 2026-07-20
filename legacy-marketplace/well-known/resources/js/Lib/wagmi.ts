import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { mainnet, bsc, sepolia, bscTestnet } from '@reown/appkit/networks';
import { createAppKit } from '@reown/appkit/react';

// Get projectId from environment or use a placeholder
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'demo-project-id';

// Define networks
export const networks = [sepolia, mainnet, bsc, bscTestnet] as const;

// Metadata for the app
const metadata = {
    name: 'RWA Tokenization',
    description: 'Real World Asset Property Tokenization Platform',
    url: typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
    icons: ['/favicon.svg'],
};

// Create wagmi adapter
export const wagmiAdapter = new WagmiAdapter({
    networks,
    projectId,
    ssr: false,
});

// Create the modal
createAppKit({
    adapters: [wagmiAdapter],
    networks,
    projectId,
    metadata,
    features: {
        analytics: false,
        email: false,
        socials: false,
    },
    themeMode: 'dark',
    themeVariables: {
        '--w3m-accent': '#3b82f6',
        '--w3m-border-radius-master': '12px',
    },
});

// Export wagmi config for hooks
export const wagmiConfig = wagmiAdapter.wagmiConfig;

export const supportedChains = [
    { id: 1, name: 'Ethereum', symbol: 'ETH', explorer: 'https://etherscan.io' },
    { id: 56, name: 'BNB Chain', symbol: 'BNB', explorer: 'https://bscscan.com' },
    { id: 11155111, name: 'Sepolia', symbol: 'ETH', explorer: 'https://sepolia.etherscan.io' },
    { id: 97, name: 'BSC Testnet', symbol: 'tBNB', explorer: 'https://testnet.bscscan.com' },
];
