<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Agent extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'agent_code',
        'company_name',
        'license_number',
        'status',
        'commission_rate',
        'total_earnings',
        'pending_earnings',
        'withdrawn_earnings',
        'notes',
        'approved_at',
        'approved_by',
    ];

    protected $casts = [
        'commission_rate' => 'decimal:2',
        'total_earnings' => 'decimal:8',
        'pending_earnings' => 'decimal:8',
        'withdrawn_earnings' => 'decimal:8',
        'approved_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($agent) {
            if (empty($agent->agent_code)) {
                $agent->agent_code = self::generateUniqueCode();
            }
        });
    }

    public static function generateUniqueCode(): string
    {
        do {
            $code = 'AG' . strtoupper(Str::random(6));
        } while (self::where('agent_code', $code)->exists());

        return $code;
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function referrals(): HasMany
    {
        return $this->hasMany(Referral::class);
    }

    public function referredUsers(): HasMany
    {
        return $this->hasMany(User::class, 'referred_by_agent_id');
    }

    public function commissions(): HasMany
    {
        return $this->hasMany(Commission::class);
    }

    public function withdrawals(): HasMany
    {
        return $this->hasMany(CommissionWithdrawal::class);
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

    public function getAvailableBalanceAttribute(): float
    {
        return $this->total_earnings - $this->withdrawn_earnings;
    }

    public function getReferralCountAttribute(): int
    {
        return $this->referrals()->count();
    }

    public function getActiveReferralCountAttribute(): int
    {
        return $this->referrals()->where('status', 'active')->count();
    }
}
