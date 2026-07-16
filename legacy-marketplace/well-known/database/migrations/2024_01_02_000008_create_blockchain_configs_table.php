<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('blockchain_configs', function (Blueprint $table) {
            $table->id();
            $table->string('chain_id')->unique();
            $table->string('name');
            $table->string('symbol');
            $table->string('rpc_url');
            $table->string('explorer_url');
            $table->string('contract_address')->nullable();
            $table->string('payment_token_address')->nullable();
            $table->string('payment_token_symbol')->default('USDT');
            $table->unsignedTinyInteger('payment_token_decimals')->default(18);
            $table->boolean('is_active')->default(true);
            $table->boolean('is_testnet')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('blockchain_configs');
    }
};
