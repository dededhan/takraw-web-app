<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Menyimpan konflik jadwal yang terdeteksi oleh ConflictDetectorService.
     * Setiap baris = satu konflik pada satu match.
     * Konflik harus di-resolve (atau ditandai resolved) sebelum Publish jadwal.
     */
    public function up(): void
    {
        Schema::create('schedule_conflicts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tournament_id')
                ->constrained('tournaments')
                ->cascadeOnDelete();

            $table->foreignId('match_id')
                ->constrained('matches')
                ->cascadeOnDelete()
                ->comment('Match yang mengalami konflik ini');

            $table->enum('conflict_type', [
                'time_overlap',         // 2 match di lapangan & slot yang sama
                'rest_violation',       // Tim bertanding di slot N dan N+1 tanpa jeda
                'bracket_dependency',   // Bracket match lebih awal dari pool penyuplainya
                'ishoma_overlap',       // Match menimpa slot ISHOMA
            ])->comment('Jenis konflik');

            $table->enum('severity', ['error', 'warning'])
                ->default('error')
                ->comment('error = tidak boleh publish; warning = bisa publish tapi perlu perhatian');

            $table->text('description')
                ->comment('Deskripsi konflik yang bisa dibaca manusia');

            // Referensi match lain yang terlibat (jika ada, e.g. untuk time_overlap)
            $table->unsignedBigInteger('conflicting_match_id')->nullable()
                ->comment('Match lain yang terlibat dalam konflik ini (optional)');

            $table->foreign('conflicting_match_id')
                ->references('id')
                ->on('matches')
                ->nullOnDelete();

            $table->timestamp('resolved_at')->nullable()
                ->comment('Waktu konflik di-resolve (null = masih aktif)');

            $table->timestamps();

            // Index untuk query panel konflik
            $table->index(['tournament_id', 'resolved_at'], 'idx_conflicts_tournament_unresolved');
            $table->index('match_id', 'idx_conflicts_match');
            $table->index('conflict_type', 'idx_conflicts_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('schedule_conflicts');
    }
};
