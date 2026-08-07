<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Super Team adalah entitas unit untuk Mode Team (Team Regu / Team Double).
     * Contoh: "TRA (Team Regu Putra)" adalah 1 Super Team yang terdiri dari 3 tim regu biasa.
     * Setiap Super Team merupakan 1 kontestan dalam pertandingan Team mode.
     */
    public function up(): void
    {
        Schema::create('super_teams', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tournament_id')
                ->constrained('tournaments')
                ->cascadeOnDelete();

            $table->string('name', 100)
                ->comment('Nama Super Team, e.g. "TRA (Team Regu Putra)"');

            $table->enum('match_mode', ['team_regu', 'team_double'])
                ->comment('Mode tim ini: Team Regu atau Team Double');

            $table->foreignId('created_by')
                ->constrained('users')
                ->comment('Admin yang membuat entri Super Team ini');

            $table->timestamps();
            $table->softDeletes();

            $table->index(['tournament_id', 'match_mode'], 'idx_super_teams_tournament_mode');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('super_teams');
    }
};
