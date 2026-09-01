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
        Schema::table('pool_standings', function (Blueprint $table) {
            $table->foreignId('team_id')->nullable()->change();
            $table->foreignId('super_team_id')
                ->nullable()
                ->after('team_id')
                ->constrained('super_teams')
                ->cascadeOnDelete();

            $table->index(['pool_id', 'super_team_id'], 'idx_pool_super_team_standing');
        });

        Schema::table('matches', function (Blueprint $table) {
            $table->foreignId('winner_super_team_id')
                ->nullable()
                ->after('winner_team_id')
                ->constrained('super_teams')
                ->nullOnDelete();
        });

        Schema::table('match_sets', function (Blueprint $table) {
            $table->foreignId('winner_super_team_id')
                ->nullable()
                ->after('winner_team_id')
                ->constrained('super_teams')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('match_sets', function (Blueprint $table) {
            $table->dropForeign(['winner_super_team_id']);
            $table->dropColumn('winner_super_team_id');
        });

        Schema::table('matches', function (Blueprint $table) {
            $table->dropForeign(['winner_super_team_id']);
            $table->dropColumn('winner_super_team_id');
        });

        Schema::table('pool_standings', function (Blueprint $table) {
            $table->dropIndex('idx_pool_super_team_standing');
            $table->dropForeign(['super_team_id']);
            $table->dropColumn('super_team_id');
            $table->foreignId('team_id')->nullable(false)->change();
        });
    }
};
