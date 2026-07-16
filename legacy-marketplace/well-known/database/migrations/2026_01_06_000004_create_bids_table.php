<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bids', function (Blueprint $table) {
            $table->id();
            $table->foreignId('listing_id')->constrained('property_listings')->onDelete('cascade');
            $table->foreignId('bidder_id')->constrained('users')->onDelete('cascade');
            $table->decimal('bid_amount', 20, 8); // Price per token
            $table->decimal('total_amount', 20, 8); // Total = bid_amount * tokens
            $table->enum('status', ['pending', 'accepted', 'rejected', 'outbid', 'cancelled', 'expired'])->default('pending');
            $table->text('message')->nullable();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamps();

            $table->index(['listing_id', 'status']);
            $table->index('bidder_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bids');
    }
};
