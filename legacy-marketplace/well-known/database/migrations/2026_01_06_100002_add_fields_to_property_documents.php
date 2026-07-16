<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('property_documents', function (Blueprint $table) {
            if (!Schema::hasColumn('property_documents', 'title')) {
                $table->string('title')->after('property_id')->nullable();
            }
            if (!Schema::hasColumn('property_documents', 'description')) {
                $table->string('description')->nullable()->after('title');
            }
            if (!Schema::hasColumn('property_documents', 'category')) {
                $table->string('category')->default('other')->after('is_public');
            }
            if (!Schema::hasColumn('property_documents', 'download_count')) {
                $table->unsignedInteger('download_count')->default(0)->after('category');
            }
            if (!Schema::hasColumn('property_documents', 'uploaded_by')) {
                $table->foreignId('uploaded_by')->nullable()->after('download_count');
            }
        });

        // Add appreciation_rate and dividend_frequency to properties
        Schema::table('properties', function (Blueprint $table) {
            if (!Schema::hasColumn('properties', 'appreciation_rate')) {
                $table->decimal('appreciation_rate', 5, 2)->default(3.00)->after('rental_yield');
            }
            if (!Schema::hasColumn('properties', 'dividend_frequency')) {
                $table->unsignedInteger('dividend_frequency')->default(12)->after('appreciation_rate');
            }
        });
    }

    public function down(): void
    {
        Schema::table('property_documents', function (Blueprint $table) {
            $table->dropColumn(['title', 'description', 'category', 'download_count', 'uploaded_by']);
        });

        Schema::table('properties', function (Blueprint $table) {
            $table->dropColumn(['appreciation_rate', 'dividend_frequency']);
        });
    }
};
