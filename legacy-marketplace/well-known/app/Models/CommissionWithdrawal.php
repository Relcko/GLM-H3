<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CommissionWithdrawal extends Model
{
    use HasFactory;

    protected $fillable = [
        'agent_id',
        'amount',
        'currency',
        'wallet_address',
        'blockchain',
        'tx_hash',
        'status',
        'failure_reason',
        'processed_at',
        'processed_by',
    ];

    protected $casts = [
        'amount' => 'decimal:8',
        'processed_at' => 'datetime',
    ];

    public function agent(): BelongsTo
    {
        return $this->belongsTo(Agent::class);
    }

    public function processor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by');
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    public function markProcessing(): void
    {
        $this->update(['status' => 'processing']);
    }

    public function markCompleted(string $txHash, int $processedBy): void
    {
        $this->update([
            'status' => 'completed',
            'tx_hash' => $txHash,
            'processed_at' => now(),
            'processed_by' => $processedBy,
        ]);

        // Update agent's withdrawn earnings
        $this->agent->increment('withdrawn_earnings', $this->amount);
    }

    public function markFailed(string $reason, int $processedBy): void
    {
        $this->update([
            'status' => 'failed',
            'failure_reason' => $reason,
            'processed_at' => now(),
            'processed_by' => $processedBy,
        ]);
    }

    public function cancel(): void
    {
        $this->update(['status' => 'cancelled']);
    }
}
