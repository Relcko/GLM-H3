<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('commissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agent_id')->constrained()->onDelete('cascade');
            $table->foreignId('referral_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade'); // The referred user who made the transaction
            $table->morphs('commissionable'); // Can be: Investment, Trade
            $table->enum('transaction_type', ['primary_purchase', 'secondary_buy', 'secondary_sell']);
            $table->decimal('transaction_amount', 20, 8);
            $table->decimal('commission_rate', 5, 2); // Rate at the time of transaction
            $table->decimal('commission_amount', 20, 8);
            $table->string('currency', 10)->default('USDT');
            $table->enum('status', ['pending', 'approved', 'paid', 'cancelled'])->default('pending');
            $table->string('payout_tx_hash')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['agent_id', 'status']);
            $table->index(['user_id']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('commissions');
    }
};
