<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('trades', function (Blueprint $table) {
            $table->id();
            $table->foreignId('listing_id')->constrained('property_listings')->onDelete('cascade');
            $table->foreignId('bid_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('seller_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('buyer_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('property_id')->constrained()->onDelete('cascade');
            $table->decimal('tokens_traded', 20, 8);
            $table->decimal('price_per_token', 20, 8);
            $table->decimal('total_amount', 20, 8);
            $table->string('currency', 10)->default('USDT');
            $table->decimal('platform_fee', 20, 8)->default(0);
            $table->decimal('seller_receives', 20, 8);
            $table->string('tx_hash')->nullable();
            $table->string('blockchain')->nullable();
            $table->enum('status', ['pending', 'processing', 'completed', 'failed', 'refunded'])->default('pending');
            $table->text('failure_reason')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['status']);
            $table->index(['seller_id', 'status']);
            $table->index(['buyer_id', 'status']);
            $table->index('tx_hash');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('trades');
    }
};
