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
        Schema::table('super_teams', function (Blueprint $table) {
            $table->foreignId('tournament_id')->nullable()->change();
            $table->foreignId('coach_id')->nullable()->after('match_mode')->constrained('users')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('super_teams', function (Blueprint $table) {
            $table->dropForeign(['coach_id']);
            $table->dropColumn('coach_id');
        });
    }
};
