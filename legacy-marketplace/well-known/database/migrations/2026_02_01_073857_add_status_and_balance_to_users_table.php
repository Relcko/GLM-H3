<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->enum('status', ['active', 'suspended', 'banned'])->default('active')->after('is_admin');
            $table->decimal('balance', 20, 8)->default(0)->after('status');
            $table->text('suspension_reason')->nullable()->after('balance');
            $table->timestamp('suspended_at')->nullable()->after('suspension_reason');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['status', 'balance', 'suspension_reason', 'suspended_at']);
        });
    }
};
