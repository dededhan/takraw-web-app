<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Tabel slot waktu harian yang di-generate otomatis oleh TimeSlotGeneratorService.
     * Setiap baris mewakili satu slot waktu (match/ishoma/break) pada hari tertentu.
     *
     * ISHOMA berlaku serentak untuk SEMUA lapangan (sesuai klarifikasi Q3).
     * Slot ISHOMA di sini = global (tidak per lapangan).
     */
    public function up(): void
    {
        Schema::create('time_slots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tournament_id')
                ->constrained('tournaments')
                ->cascadeOnDelete();

            $table->tinyInteger('day_number')->unsigned()
                ->comment('Hari ke-berapa (1, 2, 3, 4, 5, ...)');

            $table->smallInteger('slot_number')->unsigned()
                ->comment('Urutan slot dalam satu hari (1, 2, 3, ...)');

            $table->dateTime('start_time')
                ->comment('Waktu mulai slot (DateTime penuh, bukan hanya time)');

            $table->dateTime('end_time')
                ->comment('Waktu berakhir slot');

            $table->enum('slot_type', ['match', 'ishoma', 'break', 'upp'])
                ->default('match')
                ->comment('Jenis slot: match=bisa diisi pertandingan, ishoma=blokir semua lapangan, break=jeda kecil, upp=upacara pembukaan/penutupan');

            $table->string('label', 50)->nullable()
                ->comment('Label tampilan, e.g. "08:00 - 08:50", "ISHOMA 12:00-13:00"');

            $table->timestamps();

            // Index untuk query grid jadwal
            $table->index(['tournament_id', 'day_number'], 'idx_time_slots_tournament_day');
            $table->index(['tournament_id', 'slot_type'], 'idx_time_slots_type');

            // Slot number unik per hari per turnamen
            $table->unique(['tournament_id', 'day_number', 'slot_number'], 'uq_time_slot_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('time_slots');
    }
};
