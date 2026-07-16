<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Trade extends Model
{
    use HasFactory;

    protected $fillable = [
        'listing_id',
        'bid_id',
        'seller_id',
        'buyer_id',
        'property_id',
        'tokens_traded',
        'price_per_token',
        'total_amount',
        'currency',
        'platform_fee',
        'seller_receives',
        'tx_hash',
        'blockchain',
        'status',
        'failure_reason',
        'completed_at',
    ];

    protected $casts = [
        'tokens_traded' => 'decimal:8',
        'price_per_token' => 'decimal:8',
        'total_amount' => 'decimal:8',
        'platform_fee' => 'decimal:8',
        'seller_receives' => 'decimal:8',
        'completed_at' => 'datetime',
    ];

    public function listing(): BelongsTo
    {
        return $this->belongsTo(PropertyListing::class, 'listing_id');
    }

    public function bid(): BelongsTo
    {
        return $this->belongsTo(Bid::class);
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    public function buyer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'buyer_id');
    }

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    public function commissions(): HasMany
    {
        return $this->hasMany(Commission::class, 'commissionable_id')
            ->where('commissionable_type', self::class);
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function scopeProcessing($query)
    {
        return $query->where('status', 'processing');
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    public function isProcessing(): bool
    {
        return $this->status === 'processing';
    }

    public function markProcessing(): void
    {
        $this->update(['status' => 'processing']);
    }

    public function markCompleted(string $txHash = null, string $blockchain = null): void
    {
        $this->update([
            'status' => 'completed',
            'tx_hash' => $txHash ?? $this->tx_hash,
            'blockchain' => $blockchain ?? $this->blockchain,
            'completed_at' => now(),
        ]);
    }

    public function markFailed(string $reason): void
    {
        $this->update([
            'status' => 'failed',
            'failure_reason' => $reason,
        ]);
    }
}
