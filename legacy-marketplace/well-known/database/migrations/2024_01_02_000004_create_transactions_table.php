<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('investment_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('property_id')->nullable()->constrained()->onDelete('set null');
            $table->enum('type', ['purchase', 'dividend', 'withdrawal', 'refund']);
            $table->decimal('amount', 20, 8);
            $table->string('currency');
            $table->string('tx_hash')->nullable();
            $table->string('blockchain');
            $table->string('from_address')->nullable();
            $table->string('to_address')->nullable();
            $table->unsignedBigInteger('block_number')->nullable();
            $table->enum('status', ['pending', 'confirmed', 'failed'])->default('pending');
            $table->timestamps();

            $table->index('tx_hash');
            $table->index(['user_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};
