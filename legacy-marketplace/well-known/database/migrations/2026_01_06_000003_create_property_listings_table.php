<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('property_listings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seller_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('property_id')->constrained()->onDelete('cascade');
            $table->foreignId('token_holding_id')->constrained()->onDelete('cascade');
            $table->decimal('tokens_to_sell', 20, 8);
            $table->enum('listing_type', ['fixed', 'auction'])->default('fixed');
            $table->decimal('price_per_token', 20, 8); // Fixed price or starting bid price
            $table->decimal('min_bid_increment', 20, 8)->nullable(); // For auctions
            $table->decimal('reserve_price', 20, 8)->nullable(); // Minimum acceptable price for auctions
            $table->string('currency', 10)->default('USDT');
            $table->enum('status', ['active', 'sold', 'cancelled', 'expired'])->default('active');
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('sold_at')->nullable();
            $table->text('description')->nullable();
            $table->timestamps();

            $table->index(['status', 'listing_type']);
            $table->index(['property_id', 'status']);
            $table->index('seller_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('property_listings');
    }
};
