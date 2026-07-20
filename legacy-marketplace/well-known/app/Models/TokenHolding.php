<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TokenHolding extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'property_id',
        'token_amount',
        'average_buy_price',
        'total_invested',
    ];

    protected function casts(): array
    {
        return [
            'average_buy_price' => 'decimal:8',
            'total_invested' => 'decimal:8',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    public function getCurrentValueAttribute(): float
    {
        return $this->token_amount * $this->property->token_price;
    }

    public function getProfitLossAttribute(): float
    {
        return $this->current_value - $this->total_invested;
    }

    public function getProfitLossPercentageAttribute(): float
    {
        if ($this->total_invested == 0) {
            return 0;
        }
        return round(($this->profit_loss / $this->total_invested) * 100, 2);
    }

    public function getOwnershipPercentageAttribute(): float
    {
        if ($this->property->total_tokens == 0) {
            return 0;
        }
        return round(($this->token_amount / $this->property->total_tokens) * 100, 4);
    }
}
