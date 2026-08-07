<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Mendaftarkan mode tanding yang aktif dalam satu turnamen.
     * Satu turnamen bisa memiliki maksimal 5 mode sekaligus.
     */
    public function up(): void
    {
        Schema::create('tournament_modes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tournament_id')
                ->constrained('tournaments')
                ->cascadeOnDelete();

            $table->enum('match_mode', [
                'regu',        // Mode Regu (3 pemain)
                'double',      // Mode Double/Duo (2 pemain)
                'quadrant',    // Mode Quadrant (4 pemain)
                'team_regu',   // Mode Team Regu (Super Team: 3 tim regu)
                'team_double', // Mode Team Double (Super Team: 3 tim double)
            ]);

            $table->tinyInteger('pool_count')->unsigned()->default(2)
                ->comment('Jumlah pool untuk mode ini (min:2, umumnya 2-8)');

            $table->boolean('is_active')->default(true)
                ->comment('Apakah mode ini aktif/digunakan dalam turnamen');

            $table->timestamps();

            // Satu turnamen hanya boleh punya satu entry per mode
            $table->unique(['tournament_id', 'match_mode'], 'uq_tournament_mode');

            $table->index('tournament_id', 'idx_tournament_modes_tournament');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tournament_modes');
    }
};
