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
        Schema::create('matches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tournament_id')->constrained('tournaments');
            $table->foreignId('pool_id')->nullable()->constrained('pools')->nullOnDelete();
            $table->enum('stage', ['pool', 'round_of_16', 'quarterfinal', 'semifinal', 'third_place', 'final']);
            $table->smallInteger('bracket_position')->unsigned()->nullable();
            $table->foreignId('home_team_id')->nullable()->constrained('teams');
            $table->foreignId('away_team_id')->nullable()->constrained('teams');
            $table->foreignId('referee_id')->nullable()->constrained('users')->nullOnDelete();
            $table->smallInteger('court_number')->unsigned()->nullable();
            $table->smallInteger('max_sets')->unsigned()->default(3);
            $table->foreignId('winner_team_id')->nullable()->constrained('teams');
            $table->unsignedBigInteger('next_match_id')->nullable();
            $table->enum('status', ['scheduled', 'setup', 'live', 'finished'])->default('scheduled');
            $table->dateTime('scheduled_at')->nullable();
            $table->dateTime('started_at')->nullable();
            $table->dateTime('finished_at')->nullable();
            $table->timestamps();

            // Self-referencing FK for bracket progression
            $table->foreign('next_match_id')->references('id')->on('matches')->nullOnDelete();

            $table->index(['tournament_id', 'stage'], 'idx_matches_tournament_stage');
            $table->index('referee_id', 'idx_matches_referee');
            $table->index('status', 'idx_matches_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('matches');
    }
};
