# RWA Tokenization Platform

A full-featured Real World Asset (RWA) tokenization platform built with Laravel, React (Inertia.js), and Solidity smart contracts. This platform allows users to invest in tokenized real estate properties using cryptocurrency on EVM-compatible blockchains (Ethereum, BSC).

## Features

### Public Features
- **Property Marketplace** - Browse tokenized real estate properties
- **Property Details** - View detailed information, images, documents, and investment metrics
- **Wallet Connect** - Connect MetaMask, WalletConnect, and other Web3 wallets
- **Email/Password Auth** - Traditional authentication option
- **User Dashboard** - Track portfolio, holdings, and transactions
- **Investment Flow** - Purchase property tokens with USDT on-chain

### Admin Features
- **Property Management** - Create, edit, and manage property listings
- **User Management** - View and manage registered users
- **Investment Tracking** - Monitor and confirm investments
- **Blockchain Configuration** - Configure supported chains and contracts

### Smart Contracts
- **ERC-1155 Property Tokens** - Multi-token standard for property fractionalization
- **Payment Integration** - Accept USDT payments
- **On-chain Ownership** - Transparent, immutable ownership records

## Tech Stack

- **Backend**: Laravel 12, PHP 8.2+
- **Frontend**: React 19, TypeScript, Inertia.js
- **Styling**: Tailwind CSS 4
- **Web3**: wagmi, viem, RainbowKit
- **Smart Contracts**: Solidity 0.8.20, OpenZeppelin, Hardhat
- **Database**: SQLite (dev) / MySQL/PostgreSQL (prod)

## Installation

### Prerequisites
- PHP 8.2+
- Node.js 18+
- Composer
- npm or yarn

### Setup

1. **Clone the repository**
```bash
cd /path/to/rwa-tokenization
```

2. **Install PHP dependencies**
```bash
composer install
```

3. **Install Node dependencies**
```bash
npm install
```

4. **Configure environment**
```bash
cp .env.example .env
php artisan key:generate
```

5. **Configure the `.env` file**
```env
APP_NAME="RWA Tokenization"
APP_URL=http://localhost:8000

# Get from https://cloud.walletconnect.com
VITE_WALLETCONNECT_PROJECT_ID=your_project_id
```

6. **Run migrations and seed data**
```bash
php artisan migrate --seed
```

7. **Create storage link**
```bash
php artisan storage:link
```

8. **Start development servers**
```bash
# Terminal 1 - Laravel
php artisan serve

# Terminal 2 - Vite
npm run dev
```

9. **Access the application**
- Frontend: http://localhost:8000
- Admin: http://localhost:8000/admin

### Default Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@example.com | password |
| User | demo@example.com | password |

## Smart Contract Deployment

1. **Navigate to contracts directory**
```bash
cd contracts
npm install
```

2. **Configure deployment**
```bash
cp .env.example .env
# Add your deployer private key and RPC URLs
```

3. **Deploy contracts**
```bash
# Local testing
npm run deploy:local

# Testnet
npm run deploy:sepolia
npm run deploy:bscTestnet

# Mainnet (be careful!)
npm run deploy:mainnet
npm run deploy:bsc
```

4. **Update blockchain config**
After deployment, update the contract addresses in the admin panel under Blockchain Configuration.

## Project Structure

```
rwa-tokenization/
├── app/
│   ├── Http/Controllers/
│   │   ├── Admin/           # Admin controllers
│   │   ├── Auth/            # Authentication
│   │   └── ...              # Public controllers
│   └── Models/              # Eloquent models
├── contracts/
│   ├── RWAProperty.sol      # Main ERC-1155 contract
│   ├── MockUSDT.sol         # Test token
│   └── scripts/deploy.js    # Deployment script
├── database/
│   ├── migrations/          # Database schema
│   └── seeders/             # Sample data
├── resources/
│   ├── js/
│   │   ├── Components/      # Reusable components
│   │   ├── Layouts/         # Page layouts
│   │   ├── Pages/           # Inertia pages
│   │   ├── Lib/             # Utilities
│   │   └── Types/           # TypeScript types
│   └── css/app.css          # Tailwind styles
└── routes/
    ├── web.php              # Web routes
    └── api.php              # API routes
```

## Key Features Explained

### Tokenization Model
- Each property is represented as a unique token ID in the ERC-1155 contract
- Users purchase tokens using USDT (or other configured payment tokens)
- Token ownership is recorded both on-chain and in the database
- Dividends can be distributed proportionally to token holders

### Investment Flow
1. User browses properties and selects one to invest
2. User connects wallet and approves USDT spending
3. User calls `purchaseTokens` on the smart contract
4. Transaction is submitted to the backend
5. Admin or automated service confirms the transaction
6. User's token holdings are updated

### Security Features
- Smart contract uses OpenZeppelin's audited libraries
- Pausable functionality for emergencies
- ReentrancyGuard for protection against attacks
- Admin-only functions for critical operations

## API Endpoints

### Public
- `GET /api/properties` - List active properties
- `GET /api/properties/{id}` - Property details
- `GET /api/blockchain-configs` - Supported chains

### Authenticated
- `GET /api/user` - Current user
- `GET /api/user/holdings` - User's token holdings

## Customization

### Adding New Blockchains
1. Add chain to `wagmi.ts` configuration
2. Create blockchain config in admin panel
3. Deploy contracts to the new chain
4. Update contract addresses

### Styling
The project uses Tailwind CSS 4 with custom theme variables defined in `resources/css/app.css`.

## Production Deployment

1. Configure production database (MySQL/PostgreSQL)
2. Set `APP_ENV=production` and `APP_DEBUG=false`
3. Run `npm run build` for frontend assets
4. Configure web server (Nginx/Apache)
5. Set up SSL certificate
6. Configure queue worker for background jobs
7. Deploy smart contracts to mainnet

## License

MIT License

## Support

For questions or issues, please open a GitHub issue.
