<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dividends', function (Blueprint $table) {
            $table->id();
            $table->foreignId('property_id')->constrained()->onDelete('cascade');
            $table->decimal('amount_per_token', 20, 8);
            $table->decimal('total_amount', 20, 8);
            $table->string('currency')->default('USDT');
            $table->date('payment_date');
            $table->text('description')->nullable();
            $table->enum('status', ['scheduled', 'processing', 'completed', 'cancelled'])->default('scheduled');
            $table->timestamps();
        });

        Schema::create('dividend_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dividend_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->unsignedBigInteger('tokens_held');
            $table->decimal('amount', 20, 8);
            $table->string('tx_hash')->nullable();
            $table->enum('status', ['pending', 'processing', 'paid', 'failed'])->default('pending');
            $table->timestamps();

            $table->index(['user_id', 'dividend_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dividend_payments');
        Schema::dropIfExists('dividends');
    }
};
