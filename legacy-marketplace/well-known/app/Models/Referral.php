<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Referral extends Model
{
    use HasFactory;

    protected $fillable = [
        'agent_id',
        'referred_user_id',
        'status',
        'registered_at',
        'first_transaction_at',
    ];

    protected $casts = [
        'registered_at' => 'datetime',
        'first_transaction_at' => 'datetime',
    ];

    public function agent(): BelongsTo
    {
        return $this->belongsTo(Agent::class);
    }

    public function referredUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'referred_user_id');
    }

    public function commissions(): HasMany
    {
        return $this->hasMany(Commission::class);
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function markAsActive(): void
    {
        $this->update([
            'status' => 'active',
            'first_transaction_at' => now(),
        ]);
    }

    public function getTotalCommissionsAttribute(): float
    {
        return $this->commissions()->sum('commission_amount');
    }
}
