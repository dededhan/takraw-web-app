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
        Schema::create('set_stats', function (Blueprint $table) {
            $table->id();
            $table->foreignId('match_set_id')->constrained('match_sets')->cascadeOnDelete();
            $table->foreignId('athlete_id')->constrained('athletes');
            $table->foreignId('team_id')->constrained('teams');

            // Servis
            $table->smallInteger('service_in')->unsigned()->default(0);
            $table->smallInteger('service_ace')->unsigned()->default(0);
            $table->smallInteger('service_error')->unsigned()->default(0);

            // First Ball (Receive)
            $table->smallInteger('receive_success')->unsigned()->default(0);
            $table->smallInteger('receive_fail')->unsigned()->default(0);

            // Feeding (Set up)
            $table->smallInteger('feeding_success')->unsigned()->default(0);
            $table->smallInteger('feeding_fail')->unsigned()->default(0);

            // Strike (Smash)
            $table->smallInteger('strike_success')->unsigned()->default(0);
            $table->smallInteger('strike_fail')->unsigned()->default(0);

            // Block
            $table->smallInteger('block_success')->unsigned()->default(0);
            $table->smallInteger('block_fail')->unsigned()->default(0);

            $table->timestamps();

            $table->unique(['match_set_id', 'athlete_id'], 'uq_set_athlete');
            $table->index('team_id', 'idx_set_stats_team');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('set_stats');
    }
};
