<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PropertyListing;
use App\Models\Trade;
use App\Services\TradingService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TradeController extends Controller
{
    protected TradingService $tradingService;

    public function __construct(TradingService $tradingService)
    {
        $this->tradingService = $tradingService;
    }

    /**
     * List all listings
     */
    public function listings(Request $request)
    {
        $query = PropertyListing::with(['seller', 'property', 'highestBid']);

        if ($request->status && in_array($request->status, ['active', 'sold', 'cancelled', 'expired'])) {
            $query->where('status', $request->status);
        }

        if ($request->type && in_array($request->type, ['fixed', 'auction'])) {
            $query->where('listing_type', $request->type);
        }

        $listings = $query->orderByDesc('created_at')->paginate(20)->withQueryString();

        $stats = [
            'total' => PropertyListing::count(),
            'active' => PropertyListing::active()->count(),
            'sold' => PropertyListing::where('status', 'sold')->count(),
        ];

        return Inertia::render('Admin/Trades/Listings', [
            'listings' => $listings,
            'stats' => $stats,
            'filters' => $request->only(['status', 'type']),
        ]);
    }

    /**
     * List all trades
     */
    public function index(Request $request)
    {
        $query = Trade::with(['seller', 'buyer', 'property', 'listing']);

        if ($request->status && in_array($request->status, ['pending', 'processing', 'completed', 'failed', 'refunded'])) {
            $query->where('status', $request->status);
        }

        $trades = $query->orderByDesc('created_at')->paginate(20)->withQueryString();

        $stats = [
            'total_volume' => Trade::completed()->sum('total_amount'),
            'total_fees' => Trade::completed()->sum('platform_fee'),
            'pending' => Trade::pending()->count(),
            'completed' => Trade::completed()->count(),
        ];

        return Inertia::render('Admin/Trades/Index', [
            'trades' => $trades,
            'stats' => $stats,
            'filters' => $request->only(['status']),
        ]);
    }

    /**
     * Show trade details
     */
    public function show(Trade $trade)
    {
        $trade->load(['seller', 'buyer', 'property', 'listing', 'bid', 'commissions.agent.user']);

        return Inertia::render('Admin/Trades/Show', [
            'trade' => $trade,
        ]);
    }

    /**
     * Confirm trade (admin confirmation)
     */
    public function confirm(Request $request, Trade $trade)
    {
        if (!$trade->isPending() && !$trade->isProcessing()) {
            return back()->withErrors(['error' => 'This trade cannot be confirmed']);
        }

        $validated = $request->validate([
            'tx_hash' => 'required|string|regex:/^0x[a-fA-F0-9]{64}$/',
            'blockchain' => 'required|string',
        ]);

        try {
            $this->tradingService->completeTrade($trade, $validated['tx_hash'], $validated['blockchain']);
            return back()->with('success', 'Trade completed successfully');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    /**
     * Fail trade
     */
    public function fail(Request $request, Trade $trade)
    {
        $validated = $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        $trade->markFailed($validated['reason']);

        // Reopen the listing
        if ($trade->listing) {
            $trade->listing->update(['status' => 'active', 'sold_at' => null]);
        }

        return back()->with('success', 'Trade marked as failed');
    }

    /**
     * Cancel listing (admin action)
     */
    public function cancelListing(PropertyListing $listing)
    {
        if (!$listing->isActive()) {
            return back()->withErrors(['error' => 'This listing is not active']);
        }

        $listing->bids()->where('status', 'pending')->update(['status' => 'cancelled']);
        $listing->update(['status' => 'cancelled']);

        return back()->with('success', 'Listing cancelled');
    }
}
