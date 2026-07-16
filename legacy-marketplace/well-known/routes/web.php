<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\InvestmentController;
use App\Http\Controllers\KycController;
use App\Http\Controllers\PropertyController;
use App\Http\Controllers\MarketplaceController;
use App\Http\Controllers\ReferralController;
use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\Admin\AgentController;
use App\Http\Controllers\Admin\BlockchainController;
use App\Http\Controllers\Admin\CommissionController;
use App\Http\Controllers\Admin\InvestmentController as AdminInvestmentController;
use App\Http\Controllers\Admin\KycController as AdminKycController;
use App\Http\Controllers\Admin\PropertyController as AdminPropertyController;
use App\Http\Controllers\Admin\SettingsController as AdminSettingsController;
use App\Http\Controllers\Admin\TradeController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\DocumentController;
use Illuminate\Support\Facades\Route;

// Document download/view routes
Route::get('/documents/{document}/download', [DocumentController::class, 'download'])->name('documents.download');
Route::get('/documents/{document}/view', [DocumentController::class, 'view'])->name('documents.view');

// Public routes
Route::get('/', [HomeController::class, 'index'])->name('home');
Route::get('/about', [HomeController::class, 'about'])->name('about');
Route::get('/contact', [HomeController::class, 'contact'])->name('contact');
Route::get('/faq', [HomeController::class, 'faq'])->name('faq');

// Properties
Route::get('/properties', [PropertyController::class, 'index'])->name('properties.index');
Route::get('/properties/{property:slug}', [PropertyController::class, 'show'])->name('properties.show');

// Marketplace (Public listing view)
Route::get('/marketplace', [MarketplaceController::class, 'index'])->name('marketplace.index');
Route::get('/marketplace/create', [MarketplaceController::class, 'create'])->middleware('auth')->name('marketplace.create');
Route::get('/marketplace/{listing}', [MarketplaceController::class, 'show'])->name('marketplace.show');

// Auth routes
Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login']);
    Route::get('/register', [AuthController::class, 'showRegister'])->name('register');
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/wallet-login', [AuthController::class, 'walletLogin'])->name('wallet.login');
});

Route::middleware('auth')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
    Route::post('/link-wallet', [AuthController::class, 'linkWallet'])->name('wallet.link');

    // User Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('/dashboard/portfolio', [DashboardController::class, 'portfolio'])->name('dashboard.portfolio');
    Route::get('/dashboard/transactions', [DashboardController::class, 'transactions'])->name('dashboard.transactions');
    Route::get('/dashboard/settings', [DashboardController::class, 'settings'])->name('dashboard.settings');
    Route::put('/dashboard/settings', [DashboardController::class, 'updateProfile'])->name('dashboard.settings.update');

    // KYC
    Route::get('/kyc', [KycController::class, 'index'])->name('kyc.index');
    Route::post('/kyc', [KycController::class, 'store'])->name('kyc.store');

    // Investment
    Route::get('/invest/{property:slug}', [InvestmentController::class, 'create'])->name('invest.create');
    Route::post('/invest/{property}', [InvestmentController::class, 'store'])->name('invest.store');

    // Marketplace (Authenticated actions)
    Route::post('/marketplace', [MarketplaceController::class, 'store'])->name('marketplace.store');
    Route::post('/marketplace/{listing}/bid', [MarketplaceController::class, 'placeBid'])->name('marketplace.bid');
    Route::post('/marketplace/{listing}/buy', [MarketplaceController::class, 'buy'])->name('marketplace.buy');
    Route::post('/marketplace/bids/{bid}/accept', [MarketplaceController::class, 'acceptBid'])->name('marketplace.acceptBid');
    Route::post('/marketplace/{listing}/cancel', [MarketplaceController::class, 'cancel'])->name('marketplace.cancel');
    Route::get('/marketplace/trade/{trade}', [MarketplaceController::class, 'trade'])->name('marketplace.trade');

    // User's marketplace items
    Route::get('/dashboard/listings', [MarketplaceController::class, 'myListings'])->name('dashboard.listings');
    Route::get('/dashboard/bids', [MarketplaceController::class, 'myBids'])->name('dashboard.bids');
    Route::get('/dashboard/trades', [MarketplaceController::class, 'myTrades'])->name('dashboard.trades');

    // Referral Program
    Route::get('/referral', [ReferralController::class, 'dashboard'])->name('referral.dashboard');
    Route::post('/referral/apply', [ReferralController::class, 'apply'])->name('referral.apply');
    Route::get('/referral/referrals', [ReferralController::class, 'referrals'])->name('referral.referrals');
    Route::get('/referral/commissions', [ReferralController::class, 'commissions'])->name('referral.commissions');
    Route::get('/referral/withdrawals', [ReferralController::class, 'withdrawals'])->name('referral.withdrawals');
    Route::post('/referral/withdrawals', [ReferralController::class, 'requestWithdrawal'])->name('referral.withdrawals.request');
});

// Admin routes
Route::prefix('admin')->name('admin.')->middleware(['auth', 'admin'])->group(function () {
    Route::get('/', [AdminDashboardController::class, 'index'])->name('dashboard');

    // Properties
    Route::resource('properties', AdminPropertyController::class);
    Route::post('/properties/{property}/documents', [AdminPropertyController::class, 'uploadDocument'])->name('properties.documents.upload');
    Route::delete('/properties/{property}/documents/{document}', [AdminPropertyController::class, 'deleteDocument'])->name('properties.documents.delete');
    Route::post('/properties/{property}/register-blockchain', [AdminPropertyController::class, 'registerOnBlockchain'])->name('properties.register-blockchain');

    // Users
    Route::resource('users', UserController::class)->except(['create', 'store']);
    Route::post('/users/{user}/suspend', [UserController::class, 'suspend'])->name('users.suspend');
    Route::post('/users/{user}/unsuspend', [UserController::class, 'unsuspend'])->name('users.unsuspend');
    Route::post('/users/{user}/add-funds', [UserController::class, 'addFunds'])->name('users.addFunds');
    Route::post('/users/{user}/deduct-funds', [UserController::class, 'deductFunds'])->name('users.deductFunds');

    // Investments
    Route::get('/investments', [AdminInvestmentController::class, 'index'])->name('investments.index');
    Route::get('/investments/{investment}', [AdminInvestmentController::class, 'show'])->name('investments.show');
    Route::post('/investments/{investment}/confirm', [AdminInvestmentController::class, 'confirm'])->name('investments.confirm');
    Route::post('/investments/{investment}/reject', [AdminInvestmentController::class, 'reject'])->name('investments.reject');

    // Blockchain Config
    Route::get('/blockchain', [BlockchainController::class, 'index'])->name('blockchain.index');
    Route::post('/blockchain', [BlockchainController::class, 'store'])->name('blockchain.store');
    Route::put('/blockchain/{config}', [BlockchainController::class, 'update'])->name('blockchain.update');
    Route::delete('/blockchain/{config}', [BlockchainController::class, 'destroy'])->name('blockchain.destroy');

    // KYC Management
    Route::get('/kyc', [AdminKycController::class, 'index'])->name('kyc.index');
    Route::get('/kyc/{kyc}', [AdminKycController::class, 'show'])->name('kyc.show');
    Route::post('/kyc/{kyc}/approve', [AdminKycController::class, 'approve'])->name('kyc.approve');
    Route::post('/kyc/{kyc}/reject', [AdminKycController::class, 'reject'])->name('kyc.reject');

    // Settings
    Route::get('/settings', [AdminSettingsController::class, 'index'])->name('settings.index');
    Route::post('/settings', [AdminSettingsController::class, 'update'])->name('settings.update');

    // Agents Management
    Route::get('/agents', [AgentController::class, 'index'])->name('agents.index');
    Route::get('/agents/{agent}', [AgentController::class, 'show'])->name('agents.show');
    Route::post('/agents/{agent}/approve', [AgentController::class, 'approve'])->name('agents.approve');
    Route::put('/agents/{agent}', [AgentController::class, 'update'])->name('agents.update');
    Route::post('/agents/{agent}/suspend', [AgentController::class, 'suspend'])->name('agents.suspend');
    Route::post('/agents/{agent}/reactivate', [AgentController::class, 'reactivate'])->name('agents.reactivate');
    Route::post('/agents/{agent}/terminate', [AgentController::class, 'terminate'])->name('agents.terminate');

    // Commissions Management
    Route::get('/commissions', [CommissionController::class, 'index'])->name('commissions.index');
    Route::get('/commissions/settings', [CommissionController::class, 'settings'])->name('commissions.settings');
    Route::post('/commissions/settings', [CommissionController::class, 'updateSettings'])->name('commissions.settings.update');
    Route::get('/commissions/withdrawals', [CommissionController::class, 'withdrawals'])->name('commissions.withdrawals');
    Route::get('/commissions/{commission}', [CommissionController::class, 'show'])->name('commissions.show');
    Route::post('/commissions/{commission}/approve', [CommissionController::class, 'approve'])->name('commissions.approve');
    Route::post('/commissions/{commission}/mark-paid', [CommissionController::class, 'markPaid'])->name('commissions.markPaid');
    Route::post('/commissions/{commission}/cancel', [CommissionController::class, 'cancel'])->name('commissions.cancel');
    Route::post('/commissions/bulk-approve', [CommissionController::class, 'bulkApprove'])->name('commissions.bulkApprove');
    Route::post('/commissions/withdrawals/{withdrawal}/process', [CommissionController::class, 'processWithdrawal'])->name('commissions.withdrawals.process');

    // Trades Management
    Route::get('/trades', [TradeController::class, 'index'])->name('trades.index');
    Route::get('/trades/listings', [TradeController::class, 'listings'])->name('trades.listings');
    Route::get('/trades/{trade}', [TradeController::class, 'show'])->name('trades.show');
    Route::post('/trades/{trade}/confirm', [TradeController::class, 'confirm'])->name('trades.confirm');
    Route::post('/trades/{trade}/fail', [TradeController::class, 'fail'])->name('trades.fail');
    Route::post('/trades/listings/{listing}/cancel', [TradeController::class, 'cancelListing'])->name('trades.listings.cancel');
});
