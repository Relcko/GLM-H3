<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Bid extends Model
{
    use HasFactory;

    protected $fillable = [
        'listing_id',
        'bidder_id',
        'bid_amount',
        'total_amount',
        'status',
        'message',
        'accepted_at',
    ];

    protected $casts = [
        'bid_amount' => 'decimal:8',
        'total_amount' => 'decimal:8',
        'accepted_at' => 'datetime',
    ];

    public function listing(): BelongsTo
    {
        return $this->belongsTo(PropertyListing::class, 'listing_id');
    }

    public function bidder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'bidder_id');
    }

    public function trade(): HasOne
    {
        return $this->hasOne(Trade::class);
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeAccepted($query)
    {
        return $query->where('status', 'accepted');
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function isAccepted(): bool
    {
        return $this->status === 'accepted';
    }

    public function accept(): void
    {
        $this->update([
            'status' => 'accepted',
            'accepted_at' => now(),
        ]);

        // Mark other bids as outbid
        $this->listing->bids()
            ->where('id', '!=', $this->id)
            ->where('status', 'pending')
            ->update(['status' => 'outbid']);
    }

    public function reject(): void
    {
        $this->update(['status' => 'rejected']);
    }

    public function markOutbid(): void
    {
        $this->update(['status' => 'outbid']);
    }

    public function cancel(): void
    {
        $this->update(['status' => 'cancelled']);
    }
}
