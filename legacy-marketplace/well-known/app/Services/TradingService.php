<?php

namespace App\Services;

use App\Models\Bid;
use App\Models\PropertyListing;
use App\Models\Setting;
use App\Models\TokenHolding;
use App\Models\Trade;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class TradingService
{
    protected CommissionService $commissionService;

    public function __construct(CommissionService $commissionService)
    {
        $this->commissionService = $commissionService;
    }

    /**
     * Create a new property listing
     */
    public function createListing(
        User $seller,
        TokenHolding $tokenHolding,
        float $tokensToSell,
        string $listingType,
        float $pricePerToken,
        array $options = []
    ): PropertyListing {
        // Validate seller owns enough tokens
        if ($tokenHolding->token_amount < $tokensToSell) {
            throw new \Exception('Insufficient tokens to sell');
        }

        // Check for existing active listings on same holding
        $existingListing = PropertyListing::where('token_holding_id', $tokenHolding->id)
            ->where('status', 'active')
            ->first();

        if ($existingListing) {
            throw new \Exception('You already have an active listing for these tokens');
        }

        return PropertyListing::create([
            'seller_id' => $seller->id,
            'property_id' => $tokenHolding->property_id,
            'token_holding_id' => $tokenHolding->id,
            'tokens_to_sell' => $tokensToSell,
            'listing_type' => $listingType,
            'price_per_token' => $pricePerToken,
            'min_bid_increment' => $options['min_bid_increment'] ?? null,
            'reserve_price' => $options['reserve_price'] ?? null,
            'currency' => $options['currency'] ?? 'USDT',
            'expires_at' => $options['expires_at'] ?? null,
            'description' => $options['description'] ?? null,
            'status' => 'active',
        ]);
    }

    /**
     * Place a bid on an auction listing
     */
    public function placeBid(
        PropertyListing $listing,
        User $bidder,
        float $bidAmount,
        ?string $message = null
    ): Bid {
        if (!$listing->canUserBid($bidder)) {
            throw new \Exception('You cannot bid on this listing');
        }

        if (!$listing->isAuction()) {
            throw new \Exception('This listing does not accept bids');
        }

        // Check minimum bid
        if ($bidAmount < $listing->min_next_bid) {
            throw new \Exception("Bid must be at least {$listing->min_next_bid} {$listing->currency}");
        }

        // Mark previous bids from this user as cancelled
        Bid::where('listing_id', $listing->id)
            ->where('bidder_id', $bidder->id)
            ->where('status', 'pending')
            ->update(['status' => 'outbid']);

        $totalAmount = $bidAmount * $listing->tokens_to_sell;

        return Bid::create([
            'listing_id' => $listing->id,
            'bidder_id' => $bidder->id,
            'bid_amount' => $bidAmount,
            'total_amount' => $totalAmount,
            'message' => $message,
            'status' => 'pending',
        ]);
    }

    /**
     * Accept a bid (seller action)
     */
    public function acceptBid(Bid $bid, User $seller): Trade
    {
        $listing = $bid->listing;

        // Verify seller owns the listing
        if ($listing->seller_id !== $seller->id) {
            throw new \Exception('You do not own this listing');
        }

        if (!$bid->isPending()) {
            throw new \Exception('This bid is no longer available');
        }

        return DB::transaction(function () use ($bid, $listing) {
            // Accept the bid
            $bid->accept();

            // Update listing status
            $listing->update([
                'status' => 'sold',
                'sold_at' => now(),
            ]);

            // Create trade
            return $this->createTrade($listing, $bid->bidder, $bid->bid_amount, $bid);
        });
    }

    /**
     * Buy at fixed price
     */
    public function buyFixedPrice(
        PropertyListing $listing,
        User $buyer,
        string $txHash,
        string $blockchain
    ): Trade {
        if (!$listing->canUserBuy($buyer)) {
            throw new \Exception('You cannot buy this listing');
        }

        return DB::transaction(function () use ($listing, $buyer, $txHash, $blockchain) {
            // Update listing status
            $listing->update([
                'status' => 'sold',
                'sold_at' => now(),
            ]);

            // Create trade
            $trade = $this->createTrade($listing, $buyer, $listing->price_per_token);
            $trade->update([
                'tx_hash' => $txHash,
                'blockchain' => $blockchain,
                'status' => 'processing',
            ]);

            return $trade;
        });
    }

    /**
     * Create a trade record
     */
    protected function createTrade(
        PropertyListing $listing,
        User $buyer,
        float $pricePerToken,
        ?Bid $bid = null
    ): Trade {
        $totalAmount = $pricePerToken * $listing->tokens_to_sell;
        $platformFeeRate = (float) Setting::get('platform_trading_fee', '1'); // 1% default
        $platformFee = $totalAmount * ($platformFeeRate / 100);
        $sellerReceives = $totalAmount - $platformFee;

        return Trade::create([
            'listing_id' => $listing->id,
            'bid_id' => $bid?->id,
            'seller_id' => $listing->seller_id,
            'buyer_id' => $buyer->id,
            'property_id' => $listing->property_id,
            'tokens_traded' => $listing->tokens_to_sell,
            'price_per_token' => $pricePerToken,
            'total_amount' => $totalAmount,
            'currency' => $listing->currency,
            'platform_fee' => $platformFee,
            'seller_receives' => $sellerReceives,
            'status' => 'pending',
        ]);
    }

    /**
     * Complete a trade (transfer tokens)
     */
    public function completeTrade(Trade $trade, string $txHash, string $blockchain): Trade
    {
        return DB::transaction(function () use ($trade, $txHash, $blockchain) {
            // Get seller's token holding
            $sellerHolding = TokenHolding::where('user_id', $trade->seller_id)
                ->where('property_id', $trade->property_id)
                ->first();

            if (!$sellerHolding || $sellerHolding->token_amount < $trade->tokens_traded) {
                throw new \Exception('Seller does not have enough tokens');
            }

            // Deduct from seller
            $sellerHolding->decrement('token_amount', $trade->tokens_traded);

            // Calculate new average price for seller
            if ($sellerHolding->token_amount > 0) {
                $remainingInvested = $sellerHolding->total_invested -
                    ($trade->tokens_traded * $sellerHolding->average_buy_price);
                $sellerHolding->update(['total_invested' => max(0, $remainingInvested)]);
            } else {
                $sellerHolding->update(['total_invested' => 0]);
            }

            // Add to buyer (create or update holding)
            $buyerHolding = TokenHolding::firstOrCreate(
                [
                    'user_id' => $trade->buyer_id,
                    'property_id' => $trade->property_id,
                ],
                [
                    'token_amount' => 0,
                    'average_buy_price' => 0,
                    'total_invested' => 0,
                ]
            );

            // Calculate new average buy price for buyer
            $existingValue = $buyerHolding->token_amount * $buyerHolding->average_buy_price;
            $newValue = $trade->tokens_traded * $trade->price_per_token;
            $totalTokens = $buyerHolding->token_amount + $trade->tokens_traded;
            $newAveragePrice = $totalTokens > 0 ? ($existingValue + $newValue) / $totalTokens : 0;

            $buyerHolding->update([
                'token_amount' => $totalTokens,
                'average_buy_price' => $newAveragePrice,
                'total_invested' => $buyerHolding->total_invested + $trade->total_amount,
            ]);

            // Mark trade as completed
            $trade->markCompleted($txHash, $blockchain);

            // Process commissions
            $this->commissionService->processTradeCommission($trade);

            return $trade->fresh();
        });
    }

    /**
     * Cancel a listing
     */
    public function cancelListing(PropertyListing $listing, User $seller): void
    {
        if ($listing->seller_id !== $seller->id) {
            throw new \Exception('You do not own this listing');
        }

        if (!$listing->isActive()) {
            throw new \Exception('This listing cannot be cancelled');
        }

        DB::transaction(function () use ($listing) {
            // Cancel all pending bids
            $listing->bids()
                ->where('status', 'pending')
                ->update(['status' => 'cancelled']);

            // Cancel listing
            $listing->update(['status' => 'cancelled']);
        });
    }

    /**
     * Expire old listings
     */
    public function expireListings(): int
    {
        $count = PropertyListing::where('status', 'active')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', now())
            ->update(['status' => 'expired']);

        // Also expire pending bids on expired listings
        Bid::whereHas('listing', function ($q) {
            $q->where('status', 'expired');
        })
            ->where('status', 'pending')
            ->update(['status' => 'expired']);

        return $count;
    }
}
