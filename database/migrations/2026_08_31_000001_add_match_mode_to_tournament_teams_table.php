<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('tournament_teams', 'match_mode')) {
            Schema::table('tournament_teams', function (Blueprint $table) {
                $table->enum('match_mode', ['regu', 'double', 'quadrant'])->nullable()->after('team_id');
            });
        }

        // Backfill existing rows with a sensible default mode: the first
        // active regular-team mode configured for the tournament, or 'regu'
        // if none is configured.
        $rows = DB::table('tournament_teams')->whereNull('match_mode')->select('id', 'tournament_id')->get();

        foreach ($rows as $row) {
            $defaultMode = DB::table('tournament_modes')
                ->where('tournament_id', $row->tournament_id)
                ->whereIn('match_mode', ['regu', 'double', 'quadrant'])
                ->where('is_active', true)
                ->orderBy('id')
                ->value('match_mode');

            DB::table('tournament_teams')
                ->where('id', $row->id)
                ->update(['match_mode' => $defaultMode ?? 'regu']);
        }

        Schema::table('tournament_teams', function (Blueprint $table) {
            $table->enum('match_mode', ['regu', 'double', 'quadrant'])->nullable(false)->change();
        });

        // Add the new unique index (which also covers tournament_id for the
        // FK constraint) before dropping the old one, since MySQL requires
        // the FK column to remain covered by an index at all times.
        $indexes = Schema::getIndexes('tournament_teams');
        $hasNewIndex = collect($indexes)->contains(fn ($idx) => $idx['name'] === 'uq_tournament_team_mode');
        $hasOldIndex = collect($indexes)->contains(fn ($idx) => $idx['name'] === 'uq_tournament_team');

        if (!$hasNewIndex) {
            Schema::table('tournament_teams', function (Blueprint $table) {
                $table->unique(['tournament_id', 'team_id', 'match_mode'], 'uq_tournament_team_mode');
            });
        }

        if ($hasOldIndex) {
            Schema::table('tournament_teams', function (Blueprint $table) {
                $table->dropUnique('uq_tournament_team');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tournament_teams', function (Blueprint $table) {
            $table->unique(['tournament_id', 'team_id'], 'uq_tournament_team');
        });

        Schema::table('tournament_teams', function (Blueprint $table) {
            $table->dropUnique('uq_tournament_team_mode');
            $table->dropColumn('match_mode');
        });
    }
};
