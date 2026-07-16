<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Commission extends Model
{
    use HasFactory;

    protected $fillable = [
        'agent_id',
        'referral_id',
        'user_id',
        'commissionable_type',
        'commissionable_id',
        'transaction_type',
        'transaction_amount',
        'commission_rate',
        'commission_amount',
        'currency',
        'status',
        'payout_tx_hash',
        'approved_at',
        'paid_at',
        'approved_by',
    ];

    protected $casts = [
        'transaction_amount' => 'decimal:8',
        'commission_rate' => 'decimal:2',
        'commission_amount' => 'decimal:8',
        'approved_at' => 'datetime',
        'paid_at' => 'datetime',
    ];

    public function agent(): BelongsTo
    {
        return $this->belongsTo(Agent::class);
    }

    public function referral(): BelongsTo
    {
        return $this->belongsTo(Referral::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function commissionable(): MorphTo
    {
        return $this->morphTo();
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    public function scopePaid($query)
    {
        return $query->where('status', 'paid');
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function isApproved(): bool
    {
        return $this->status === 'approved';
    }

    public function isPaid(): bool
    {
        return $this->status === 'paid';
    }

    public function approve(int $approverId): void
    {
        $this->update([
            'status' => 'approved',
            'approved_at' => now(),
            'approved_by' => $approverId,
        ]);

        // Update agent's pending earnings
        $this->agent->increment('pending_earnings', $this->commission_amount);
    }

    public function markPaid(string $txHash = null): void
    {
        $this->update([
            'status' => 'paid',
            'paid_at' => now(),
            'payout_tx_hash' => $txHash,
        ]);

        // Update agent earnings
        $this->agent->decrement('pending_earnings', $this->commission_amount);
        $this->agent->increment('total_earnings', $this->commission_amount);
    }

    public function cancel(): void
    {
        if ($this->status === 'approved') {
            $this->agent->decrement('pending_earnings', $this->commission_amount);
        }

        $this->update(['status' => 'cancelled']);
    }

    public static function calculateCommission(float $amount, float $rate): float
    {
        return $amount * ($rate / 100);
    }
}
