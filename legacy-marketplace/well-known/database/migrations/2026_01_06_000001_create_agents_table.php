<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('agents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('agent_code')->unique(); // Unique referral code
            $table->string('company_name')->nullable();
            $table->string('license_number')->nullable();
            $table->enum('status', ['pending', 'active', 'suspended', 'terminated'])->default('pending');
            $table->decimal('commission_rate', 5, 2)->default(0); // Admin sets this per agent
            $table->decimal('total_earnings', 20, 8)->default(0);
            $table->decimal('pending_earnings', 20, 8)->default(0);
            $table->decimal('withdrawn_earnings', 20, 8)->default(0);
            $table->text('notes')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('agent_code');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('agents');
    }
};
