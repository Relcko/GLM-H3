<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BlockchainConfig extends Model
{
    use HasFactory;

    protected $fillable = [
        'chain_id',
        'name',
        'symbol',
        'rpc_url',
        'explorer_url',
        'contract_address',
        'payment_token_address',
        'payment_token_symbol',
        'payment_token_decimals',
        'is_active',
        'is_testnet',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'is_testnet' => 'boolean',
        ];
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeMainnet($query)
    {
        return $query->where('is_testnet', false);
    }

    public function scopeTestnet($query)
    {
        return $query->where('is_testnet', true);
    }
}
