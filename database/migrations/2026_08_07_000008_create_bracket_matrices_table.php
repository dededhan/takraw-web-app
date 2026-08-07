<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Konfigurasi matriks braket yang di-setup Admin sebelum generate jadwal.
     * Mendefinisikan "siapa lawan siapa" di setiap babak gugur per mode tanding.
     *
     * Contoh baris:
     *   mode=regu, stage=quarterfinal, pos=1, home="pool_A_rank_1", away="pool_B_rank_2"
     *   → QF1 Regu: Juara Pool A vs Runner-up Pool B
     *
     * Untuk pool ganjil (3 pool):
     *   mode=regu, stage=quarterfinal, pos=1, home="pool_A_rank_1", away="bye"
     *   → QF1: Juara Pool A mendapat Bye (langsung ke semifinal)
     */
    public function up(): void
    {
        Schema::create('bracket_matrices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tournament_id')
                ->constrained('tournaments')
                ->cascadeOnDelete();

            $table->enum('match_mode', [
                'regu', 'double', 'quadrant', 'team_regu', 'team_double',
            ])->comment('Mode tanding yang dikonfigurasi');

            $table->enum('bracket_stage', [
                'round_of_16',  // 16 besar (jika 8 pool)
                'round_of_8',   // 8 besar / Quarterfinal
                'semifinal',    // 4 besar
                'third_place',  // Perebutan juara 3
                'final',        // Final
            ])->comment('Babak gugur ini');

            $table->tinyInteger('bracket_position')->unsigned()
                ->comment('Posisi di bagan (1, 2, 3, 4 untuk QF; 1, 2 untuk SF)');

            // Format sumber: "pool_{nama}_rank_{n}" | "bye" | "wildcard_{n}" | "winner_pos_{n}"
            $table->string('home_source', 60)
                ->comment('Sumber tim A, e.g. "pool_A_rank_1", "bye", "winner_pos_1"');

            $table->string('away_source', 60)
                ->comment('Sumber tim B, e.g. "pool_B_rank_2", "wildcard_1"');

            $table->timestamps();

            // Satu posisi braket unik per mode per turnamen
            $table->unique(
                ['tournament_id', 'match_mode', 'bracket_stage', 'bracket_position'],
                'uq_bracket_matrix_pos'
            );

            $table->index(['tournament_id', 'match_mode'], 'idx_bracket_matrices_mode');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bracket_matrices');
    }
};
