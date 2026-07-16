<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DividendPayment extends Model
{
    use HasFactory;

    protected $fillable = [
        'dividend_id',
        'user_id',
        'tokens_held',
        'amount',
        'tx_hash',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:8',
        ];
    }

    public function dividend(): BelongsTo
    {
        return $this->belongsTo(Dividend::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
