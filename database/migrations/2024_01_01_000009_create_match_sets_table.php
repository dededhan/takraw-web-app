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
        Schema::create('match_sets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('match_id')->constrained('matches')->cascadeOnDelete();
            $table->smallInteger('set_number')->unsigned();
            $table->smallInteger('home_score')->unsigned()->default(0);
            $table->smallInteger('away_score')->unsigned()->default(0);
            $table->foreignId('winner_team_id')->nullable()->constrained('teams');
            $table->enum('status', ['pending', 'live', 'finished'])->default('pending');
            $table->dateTime('started_at')->nullable();
            $table->dateTime('finished_at')->nullable();
            $table->timestamps();

            $table->unique(['match_id', 'set_number'], 'uq_match_set');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('match_sets');
    }
};
