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
        Schema::table('pools', function (Blueprint $table) {
            $table->dropUnique('uq_tournament_mode_pool_name');
            $table->string('bracket_name', 50)->nullable()->after('match_mode');
            $table->tinyInteger('bracket_number')->unsigned()->nullable()->after('bracket_name');
            $table->index(['tournament_id', 'match_mode', 'bracket_name'], 'idx_pool_bracket_group');
        });

        Schema::table('matches', function (Blueprint $table) {
            $table->string('bracket_group', 50)->nullable()->after('bracket_position');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('matches', function (Blueprint $table) {
            $table->dropColumn('bracket_group');
        });

        Schema::table('pools', function (Blueprint $table) {
            $table->dropIndex('idx_pool_bracket_group');
            $table->dropColumn(['bracket_name', 'bracket_number']);
            $table->unique(['tournament_id', 'match_mode', 'name'], 'uq_tournament_mode_pool_name');
        });
    }
};
