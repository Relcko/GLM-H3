<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('properties', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description');
            $table->text('short_description')->nullable();
            $table->string('location');
            $table->text('address');
            $table->string('city');
            $table->string('country');
            $table->decimal('latitude', 10, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();
            $table->enum('property_type', ['residential', 'commercial', 'industrial', 'land']);
            $table->decimal('total_value', 20, 2);
            $table->decimal('token_price', 20, 8);
            $table->unsignedBigInteger('total_tokens');
            $table->unsignedBigInteger('available_tokens');
            $table->unsignedBigInteger('sold_tokens')->default(0);
            $table->decimal('expected_roi', 5, 2);
            $table->decimal('rental_yield', 5, 2)->nullable();
            $table->decimal('min_investment', 20, 2);
            $table->json('images')->nullable();
            $table->json('amenities')->nullable();
            $table->json('features')->nullable();
            $table->enum('status', ['draft', 'upcoming', 'active', 'sold_out', 'closed'])->default('draft');
            $table->string('blockchain')->default('sepolia'); // ethereum, bsc, sepolia, bsc_testnet
            $table->string('contract_address')->nullable();
            $table->unsignedBigInteger('token_id')->nullable();
            $table->integer('property_size')->nullable();
            $table->string('property_size_unit')->default('sqft');
            $table->integer('bedrooms')->nullable();
            $table->integer('bathrooms')->nullable();
            $table->integer('year_built')->nullable();
            $table->date('funding_deadline')->nullable();
            $table->boolean('is_featured')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('properties');
    }
};
