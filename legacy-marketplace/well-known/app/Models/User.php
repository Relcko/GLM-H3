<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'wallet_address',
        'is_admin',
        'status',
        'balance',
        'suspension_reason',
        'suspended_at',
        'avatar',
        'phone',
        'bio',
        'referred_by_code',
        'referred_by_agent_id',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_admin' => 'boolean',
            'balance' => 'decimal:8',
            'suspended_at' => 'datetime',
        ];
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function isSuspended(): bool
    {
        return $this->status === 'suspended';
    }

    public function isBanned(): bool
    {
        return $this->status === 'banned';
    }

    public function addBalance(float $amount, string $description = null): void
    {
        $this->increment('balance', $amount);
    }

    public function deductBalance(float $amount): bool
    {
        if ($this->balance < $amount) {
            return false;
        }
        $this->decrement('balance', $amount);
        return true;
    }

    public function investments(): HasMany
    {
        return $this->hasMany(Investment::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }

    public function tokenHoldings(): HasMany
    {
        return $this->hasMany(TokenHolding::class);
    }

    public function kycVerification(): HasOne
    {
        return $this->hasOne(KycVerification::class);
    }

    public function dividendPayments(): HasMany
    {
        return $this->hasMany(DividendPayment::class);
    }

    public function isKycVerified(): bool
    {
        return $this->kycVerification?->status === 'approved';
    }

    public function getTotalInvestedAttribute(): float
    {
        return $this->tokenHoldings()->sum('total_invested');
    }

    public function getTotalTokensAttribute(): int
    {
        return $this->tokenHoldings()->sum('token_amount');
    }

    // Referral relationships
    public function referredByAgent(): BelongsTo
    {
        return $this->belongsTo(Agent::class, 'referred_by_agent_id');
    }

    public function agent(): HasOne
    {
        return $this->hasOne(Agent::class);
    }

    public function referral(): HasOne
    {
        return $this->hasOne(Referral::class, 'referred_user_id');
    }

    // Trading relationships
    public function propertyListings(): HasMany
    {
        return $this->hasMany(PropertyListing::class, 'seller_id');
    }

    public function bids(): HasMany
    {
        return $this->hasMany(Bid::class, 'bidder_id');
    }

    public function salesTrades(): HasMany
    {
        return $this->hasMany(Trade::class, 'seller_id');
    }

    public function purchaseTrades(): HasMany
    {
        return $this->hasMany(Trade::class, 'buyer_id');
    }

    public function isAgent(): bool
    {
        return $this->agent()->where('status', 'active')->exists();
    }

    public function hasReferrer(): bool
    {
        return !is_null($this->referred_by_agent_id);
    }
}
