# RWA Tokenization Platform - Setup Guide

A full-stack real estate tokenization platform built with Laravel, React/TypeScript, and Solidity smart contracts.

## Prerequisites

- PHP 8.2+
- Composer
- Node.js 18+
- npm or yarn
- SQLite (default) or MySQL/PostgreSQL

## Quick Start

### 1. Clone and Install Dependencies

```bash
# Install PHP dependencies
composer install

# Install Node dependencies
npm install
```

### 2. Environment Configuration

```bash
# Copy environment file
cp .env.example .env

# Generate application key
php artisan key:generate
```

Edit `.env` and set:

```env
APP_NAME="RWA Tokenization"
APP_URL=http://localhost:8000

# Get from https://cloud.walletconnect.com
VITE_WALLETCONNECT_PROJECT_ID=your_project_id
```

### 3. Database Setup

```bash
# Create SQLite database
touch database/database.sqlite

# Run migrations
php artisan migrate

# (Optional) Seed with sample data
php artisan db:seed
```

### 4. Storage Setup

```bash
# Create storage link for uploads
php artisan storage:link
```

### 5. Start Development Servers

```bash
# Terminal 1: Start Laravel server
php artisan serve

# Terminal 2: Start Vite dev server
npm run dev
```

Visit http://localhost:8000

## Smart Contract Deployment

### 1. Configure Contract Environment

```bash
cd contracts
cp .env.example .env
```

Edit `contracts/.env`:

```env
# Your wallet private key (without 0x prefix)
DEPLOYER_PRIVATE_KEY=your_private_key

# RPC URLs
SEPOLIA_RPC_URL=https://rpc.sepolia.org

# For contract verification
ETHERSCAN_API_KEY=your_api_key
```

### 2. Install Hardhat Dependencies

```bash
cd contracts
npm install
```

### 3. Deploy Contracts

```bash
# Deploy to Sepolia testnet
npx hardhat run scripts/deploy.ts --network sepolia
```

### 4. Update Blockchain Config

After deployment, add the contract addresses in Admin Panel:
1. Go to `/admin/blockchain`
2. Add blockchain configuration with:
   - Chain ID (11155111 for Sepolia)
   - USDT Contract Address
   - RWA Property Contract Address
   - Receiving Wallet Address

## Admin Access

To create an admin user:

```bash
php artisan tinker
```

```php
$user = App\Models\User::first();
$user->is_admin = true;
$user->save();
```

Or create a new admin:

```php
App\Models\User::create([
    'name' => 'Admin',
    'email' => 'admin@example.com',
    'password' => bcrypt('password'),
    'is_admin' => true,
]);
```

## Features

### User Features
- Wallet login (WalletConnect/Reown)
- Email/password authentication
- KYC verification (required before investing)
- Property browsing
- Token investment with USDT
- Portfolio dashboard
- Transaction history

### Admin Features
- Property management (CRUD)
- Property on-chain registration
- Investment approval/rejection
- KYC verification management
- User management
- Blockchain configuration

## Key URLs

| Path | Description |
|------|-------------|
| `/` | Home page |
| `/properties` | Browse properties |
| `/login` | User login |
| `/register` | User registration |
| `/dashboard` | User dashboard |
| `/kyc` | KYC verification |
| `/admin` | Admin dashboard |
| `/admin/properties` | Manage properties |
| `/admin/investments` | Manage investments |
| `/admin/kyc` | Manage KYC submissions |
| `/admin/blockchain` | Blockchain config |

## Investment Flow

1. User registers/logs in
2. User connects wallet
3. User completes KYC verification
4. Admin approves KYC
5. User browses active properties
6. User selects property and token amount
7. User approves USDT spending
8. User confirms purchase transaction
9. Admin confirms on-chain transaction
10. Tokens are credited to user's portfolio

## Tech Stack

- **Backend**: Laravel 11, PHP 8.2+
- **Frontend**: React 18, TypeScript, Inertia.js
- **Styling**: Tailwind CSS 4
- **Web3**: Wagmi, Viem, Reown AppKit
- **Smart Contracts**: Solidity, Hardhat
- **Database**: SQLite/MySQL/PostgreSQL

## Production Deployment

### Build Assets

```bash
npm run build
```

### Environment Variables for Production

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://yourdomain.com

# Use MySQL/PostgreSQL in production
DB_CONNECTION=mysql
DB_HOST=your_db_host
DB_DATABASE=your_db_name
DB_USERNAME=your_db_user
DB_PASSWORD=your_db_password
```

### Running Migrations

```bash
php artisan migrate --force
```

### Optimizations

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

## Contract Addresses (Sepolia Testnet)

- RWAProperty: `0x3C771c8D3CA51b1BE00702b45841Ea48B7dbD9f1`
- MockUSDT: `0xfb4f3c7aA9fef2393EdF7a22C6E80376B711044a`

## Security Notes

- Never commit `.env` files with real credentials
- Use different wallet for testnet development
- Store private keys securely in production
- Implement rate limiting for API endpoints
- Use HTTPS in production

## Support

For issues or questions, check the codebase or reach out to the development team.
