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
        if (!Schema::hasTable('tournament_super_teams')) {
            Schema::create('tournament_super_teams', function (Blueprint $table) {
                $table->id();
                $table->foreignId('tournament_id')->constrained('tournaments')->cascadeOnDelete();
                $table->foreignId('super_team_id')->constrained('super_teams')->cascadeOnDelete();
                $table->string('match_mode')->default('team_regu');
                $table->timestamp('registered_at')->nullable();
                $table->timestamps();

                $table->unique(['tournament_id', 'super_team_id', 'match_mode'], 'tourn_super_team_mode_unique');
            });
        }

        // Migrate existing super_teams where tournament_id is set
        if (Schema::hasTable('super_teams') && Schema::hasTable('tournament_super_teams')) {
            $existing = DB::table('super_teams')->whereNotNull('tournament_id')->get();
            foreach ($existing as $st) {
                DB::table('tournament_super_teams')->insertOrIgnore([
                    'tournament_id' => $st->tournament_id,
                    'super_team_id' => $st->id,
                    'match_mode'    => $st->match_mode ?? 'team_regu',
                    'registered_at' => $st->created_at ?? now(),
                    'created_at'    => now(),
                    'updated_at'    => now(),
                ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tournament_super_teams');
    }
};
