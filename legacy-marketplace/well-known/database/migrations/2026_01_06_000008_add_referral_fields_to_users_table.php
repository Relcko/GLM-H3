<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('referred_by_code')->nullable()->after('is_admin');
            $table->foreignId('referred_by_agent_id')->nullable()->after('referred_by_code')->constrained('agents')->nullOnDelete();

            $table->index('referred_by_code');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['referred_by_agent_id']);
            $table->dropIndex(['referred_by_code']);
            $table->dropColumn(['referred_by_code', 'referred_by_agent_id']);
        });
    }
};
