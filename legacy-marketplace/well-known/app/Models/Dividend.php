<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Dividend extends Model
{
    use HasFactory;

    protected $fillable = [
        'property_id',
        'amount_per_token',
        'total_amount',
        'currency',
        'payment_date',
        'description',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'amount_per_token' => 'decimal:8',
            'total_amount' => 'decimal:8',
            'payment_date' => 'date',
        ];
    }

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(DividendPayment::class);
    }
}
