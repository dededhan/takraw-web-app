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
        Schema::table('set_stats', function (Blueprint $table) {
            $table->json('action_zones')->nullable()->after('opponent_mistake');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('set_stats', function (Blueprint $table) {
            $table->dropColumn('action_zones');
        });
    }
};
