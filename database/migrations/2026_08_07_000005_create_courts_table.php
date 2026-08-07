<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Tabel lapangan pertandingan per turnamen.
     * Jumlah lapangan sama untuk semua hari (sesuai klarifikasi Q2).
     */
    public function up(): void
    {
        Schema::create('courts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tournament_id')
                ->constrained('tournaments')
                ->cascadeOnDelete();

            $table->tinyInteger('court_number')->unsigned()
                ->comment('Nomor urut lapangan (1, 2, 3, ...)');

            $table->string('name', 50)
                ->comment('Nama lapangan, e.g. "Lapangan 1", "Court A"');

            $table->boolean('is_active')->default(true)
                ->comment('Lapangan aktif/non-aktif (bisa dinonaktifkan jika kerusakan)');

            $table->timestamps();

            // Satu nomor lapangan unik per turnamen
            $table->unique(['tournament_id', 'court_number'], 'uq_court_number');

            $table->index('tournament_id', 'idx_courts_tournament');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('courts');
    }
};
