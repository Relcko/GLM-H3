<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Property extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'short_description',
        'location',
        'address',
        'city',
        'country',
        'latitude',
        'longitude',
        'property_type',
        'total_value',
        'token_price',
        'total_tokens',
        'available_tokens',
        'sold_tokens',
        'expected_roi',
        'rental_yield',
        'appreciation_rate',
        'dividend_frequency',
        'min_investment',
        'images',
        'amenities',
        'features',
        'status',
        'blockchain',
        'contract_address',
        'token_id',
        'property_size',
        'property_size_unit',
        'bedrooms',
        'bathrooms',
        'year_built',
        'funding_deadline',
        'is_featured',
    ];

    protected function casts(): array
    {
        return [
            'images' => 'array',
            'amenities' => 'array',
            'features' => 'array',
            'total_value' => 'decimal:2',
            'token_price' => 'decimal:8',
            'expected_roi' => 'decimal:2',
            'rental_yield' => 'decimal:2',
            'appreciation_rate' => 'decimal:2',
            'dividend_frequency' => 'integer',
            'min_investment' => 'decimal:2',
            'is_featured' => 'boolean',
            'funding_deadline' => 'date',
        ];
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($property) {
            if (empty($property->slug)) {
                $property->slug = Str::slug($property->name);
            }
            if (empty($property->available_tokens)) {
                $property->available_tokens = $property->total_tokens;
            }
        });
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    public function documents(): HasMany
    {
        return $this->hasMany(PropertyDocument::class);
    }

    public function investments(): HasMany
    {
        return $this->hasMany(Investment::class);
    }

    public function tokenHoldings(): HasMany
    {
        return $this->hasMany(TokenHolding::class);
    }

    public function dividends(): HasMany
    {
        return $this->hasMany(Dividend::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }

    public function getFundingProgressAttribute(): float
    {
        if ($this->total_tokens === 0) {
            return 0;
        }
        return round(($this->sold_tokens / $this->total_tokens) * 100, 2);
    }

    public function getRemainingValueAttribute(): float
    {
        return $this->available_tokens * $this->token_price;
    }

    public function getFundedValueAttribute(): float
    {
        return $this->sold_tokens * $this->token_price;
    }

    public function getMainImageAttribute(): ?string
    {
        return $this->images[0] ?? null;
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeFeatured($query)
    {
        return $query->where('is_featured', true);
    }

    public function scopeAvailable($query)
    {
        return $query->whereIn('status', ['active', 'upcoming'])
            ->where('available_tokens', '>', 0);
    }
}
