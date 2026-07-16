<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('investments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('property_id')->constrained()->onDelete('cascade');
            $table->unsignedBigInteger('tokens_purchased');
            $table->decimal('amount_paid', 20, 8);
            $table->string('payment_currency')->default('ETH');
            $table->string('tx_hash')->nullable();
            $table->string('blockchain');
            $table->enum('status', ['pending', 'processing', 'confirmed', 'failed', 'refunded'])->default('pending');
            $table->text('failure_reason')->nullable();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'property_id']);
            $table->index('tx_hash');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('investments');
    }
};
