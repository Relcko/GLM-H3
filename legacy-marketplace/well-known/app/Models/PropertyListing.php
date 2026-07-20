<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class PropertyListing extends Model
{
    use HasFactory;

    protected $fillable = [
        'seller_id',
        'property_id',
        'token_holding_id',
        'tokens_to_sell',
        'listing_type',
        'price_per_token',
        'min_bid_increment',
        'reserve_price',
        'currency',
        'status',
        'expires_at',
        'sold_at',
        'description',
    ];

    protected $casts = [
        'tokens_to_sell' => 'decimal:8',
        'price_per_token' => 'decimal:8',
        'min_bid_increment' => 'decimal:8',
        'reserve_price' => 'decimal:8',
        'expires_at' => 'datetime',
        'sold_at' => 'datetime',
    ];

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    public function tokenHolding(): BelongsTo
    {
        return $this->belongsTo(TokenHolding::class);
    }

    public function bids(): HasMany
    {
        return $this->hasMany(Bid::class, 'listing_id');
    }

    public function activeBids(): HasMany
    {
        return $this->hasMany(Bid::class, 'listing_id')->where('status', 'pending');
    }

    public function highestBid(): HasOne
    {
        return $this->hasOne(Bid::class, 'listing_id')
            ->where('status', 'pending')
            ->orderByDesc('bid_amount');
    }

    public function trade(): HasOne
    {
        return $this->hasOne(Trade::class, 'listing_id');
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeAuction($query)
    {
        return $query->where('listing_type', 'auction');
    }

    public function scopeFixed($query)
    {
        return $query->where('listing_type', 'fixed');
    }

    public function scopeNotExpired($query)
    {
        return $query->where(function ($q) {
            $q->whereNull('expires_at')
                ->orWhere('expires_at', '>', now());
        });
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function isAuction(): bool
    {
        return $this->listing_type === 'auction';
    }

    public function isFixed(): bool
    {
        return $this->listing_type === 'fixed';
    }

    public function isExpired(): bool
    {
        return $this->expires_at && $this->expires_at->isPast();
    }

    public function getTotalValueAttribute(): float
    {
        return $this->tokens_to_sell * $this->price_per_token;
    }

    public function getCurrentPriceAttribute(): float
    {
        if ($this->isAuction() && $this->highestBid) {
            return $this->highestBid->bid_amount;
        }
        return $this->price_per_token;
    }

    public function getBidCountAttribute(): int
    {
        return $this->bids()->count();
    }

    public function getMinNextBidAttribute(): float
    {
        $currentHighest = $this->highestBid?->bid_amount ?? $this->price_per_token;
        return $currentHighest + ($this->min_bid_increment ?? 0);
    }

    public function canUserBid(User $user): bool
    {
        if ($this->seller_id === $user->id) {
            return false;
        }
        if (!$this->isActive()) {
            return false;
        }
        if ($this->isExpired()) {
            return false;
        }
        return true;
    }

    public function canUserBuy(User $user): bool
    {
        if ($this->seller_id === $user->id) {
            return false;
        }
        if (!$this->isActive() || !$this->isFixed()) {
            return false;
        }
        if ($this->isExpired()) {
            return false;
        }
        return true;
    }
}
