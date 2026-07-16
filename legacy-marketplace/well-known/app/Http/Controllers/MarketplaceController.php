<?php

namespace App\Http\Controllers;

use App\Models\Bid;
use App\Models\Property;
use App\Models\PropertyListing;
use App\Models\TokenHolding;
use App\Models\Trade;
use App\Services\TradingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class MarketplaceController extends Controller
{
    protected TradingService $tradingService;

    public function __construct(TradingService $tradingService)
    {
        $this->tradingService = $tradingService;
    }

    /**
     * Display marketplace with all active listings
     */
    public function index(Request $request)
    {
        $query = PropertyListing::with(['property', 'seller', 'highestBid'])
            ->active()
            ->notExpired();

        // Filter by property
        if ($request->property_id) {
            $query->where('property_id', $request->property_id);
        }

        // Filter by listing type
        if ($request->type && in_array($request->type, ['fixed', 'auction'])) {
            $query->where('listing_type', $request->type);
        }

        // Sort
        $sortField = $request->sort ?? 'created_at';
        $sortDir = $request->dir ?? 'desc';
        $query->orderBy($sortField, $sortDir);

        $listings = $query->paginate(12)->withQueryString();

        $properties = Property::whereHas('tokenHoldings')
            ->select('id', 'name', 'slug')
            ->get();

        return Inertia::render('Marketplace/Index', [
            'listings' => $listings,
            'properties' => $properties,
            'filters' => $request->only(['property_id', 'type', 'sort', 'dir']),
        ]);
    }

    /**
     * Show single listing
     */
    public function show(PropertyListing $listing)
    {
        $listing->load(['property', 'seller', 'bids' => function ($q) {
            $q->with('bidder')->orderByDesc('bid_amount');
        }]);

        $userBid = null;
        if (Auth::check()) {
            $userBid = $listing->bids()
                ->where('bidder_id', Auth::id())
                ->where('status', 'pending')
                ->first();
        }

        return Inertia::render('Marketplace/Show', [
            'listing' => $listing,
            'userBid' => $userBid,
            'canBid' => Auth::check() && $listing->canUserBid(Auth::user()),
            'canBuy' => Auth::check() && $listing->canUserBuy(Auth::user()),
        ]);
    }

    /**
     * Show create listing form
     */
    public function create()
    {
        $holdings = TokenHolding::with('property')
            ->where('user_id', Auth::id())
            ->where('token_amount', '>', 0)
            ->get();

        return Inertia::render('Marketplace/Create', [
            'holdings' => $holdings,
        ]);
    }

    /**
     * Store new listing
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'token_holding_id' => 'required|exists:token_holdings,id',
            'tokens_to_sell' => 'required|numeric|min:0.00000001',
            'listing_type' => 'required|in:fixed,auction',
            'price_per_token' => 'required|numeric|min:0.00000001',
            'min_bid_increment' => 'nullable|numeric|min:0',
            'reserve_price' => 'nullable|numeric|min:0',
            'currency' => 'nullable|string|max:10',
            'expires_at' => 'nullable|date|after:now',
            'description' => 'nullable|string|max:1000',
        ]);

        $holding = TokenHolding::where('id', $validated['token_holding_id'])
            ->where('user_id', Auth::id())
            ->firstOrFail();

        try {
            $listing = $this->tradingService->createListing(
                Auth::user(),
                $holding,
                $validated['tokens_to_sell'],
                $validated['listing_type'],
                $validated['price_per_token'],
                [
                    'min_bid_increment' => $validated['min_bid_increment'] ?? null,
                    'reserve_price' => $validated['reserve_price'] ?? null,
                    'currency' => $validated['currency'] ?? 'USDT',
                    'expires_at' => $validated['expires_at'] ?? null,
                    'description' => $validated['description'] ?? null,
                ]
            );

            return redirect()->route('marketplace.show', $listing)
                ->with('success', 'Listing created successfully');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    /**
     * Place a bid on auction listing
     */
    public function placeBid(Request $request, PropertyListing $listing)
    {
        $validated = $request->validate([
            'bid_amount' => 'required|numeric|min:0.00000001',
            'message' => 'nullable|string|max:500',
        ]);

        try {
            $bid = $this->tradingService->placeBid(
                $listing,
                Auth::user(),
                $validated['bid_amount'],
                $validated['message'] ?? null
            );

            return back()->with('success', 'Bid placed successfully');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    /**
     * Accept a bid (seller only)
     */
    public function acceptBid(Request $request, Bid $bid)
    {
        try {
            $trade = $this->tradingService->acceptBid($bid, Auth::user());

            return redirect()->route('marketplace.trade', $trade)
                ->with('success', 'Bid accepted. Please complete the trade.');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    /**
     * Buy at fixed price
     */
    public function buy(Request $request, PropertyListing $listing)
    {
        $validated = $request->validate([
            'tx_hash' => 'required|string|regex:/^0x[a-fA-F0-9]{64}$/',
            'blockchain' => 'required|string',
        ]);

        try {
            $trade = $this->tradingService->buyFixedPrice(
                $listing,
                Auth::user(),
                $validated['tx_hash'],
                $validated['blockchain']
            );

            return redirect()->route('marketplace.trade', $trade)
                ->with('success', 'Purchase initiated. Awaiting confirmation.');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    /**
     * Show trade details
     */
    public function trade(Trade $trade)
    {
        // Only buyer or seller can view
        if ($trade->seller_id !== Auth::id() && $trade->buyer_id !== Auth::id()) {
            abort(403);
        }

        $trade->load(['property', 'seller', 'buyer', 'listing']);

        return Inertia::render('Marketplace/Trade', [
            'trade' => $trade,
            'isSeller' => $trade->seller_id === Auth::id(),
            'isBuyer' => $trade->buyer_id === Auth::id(),
        ]);
    }

    /**
     * Cancel listing (seller only)
     */
    public function cancel(PropertyListing $listing)
    {
        try {
            $this->tradingService->cancelListing($listing, Auth::user());
            return redirect()->route('dashboard.listings')
                ->with('success', 'Listing cancelled successfully');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    /**
     * Show user's listings
     */
    public function myListings()
    {
        $listings = PropertyListing::with(['property', 'highestBid'])
            ->where('seller_id', Auth::id())
            ->orderByDesc('created_at')
            ->paginate(10);

        return Inertia::render('Dashboard/Listings', [
            'listings' => $listings,
        ]);
    }

    /**
     * Show user's bids
     */
    public function myBids()
    {
        $bids = Bid::with(['listing.property', 'listing.seller'])
            ->where('bidder_id', Auth::id())
            ->orderByDesc('created_at')
            ->paginate(10);

        return Inertia::render('Dashboard/Bids', [
            'bids' => $bids,
        ]);
    }

    /**
     * Show user's trades
     */
    public function myTrades()
    {
        $trades = Trade::with(['property', 'seller', 'buyer'])
            ->where(function ($q) {
                $q->where('seller_id', Auth::id())
                    ->orWhere('buyer_id', Auth::id());
            })
            ->orderByDesc('created_at')
            ->paginate(10);

        return Inertia::render('Dashboard/Trades', [
            'trades' => $trades,
        ]);
    }
}
