<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Menambahkan kolom konfigurasi Master Schedule ke tabel tournaments.
     */
    public function up(): void
    {
        Schema::table('tournaments', function (Blueprint $table) {
            // ─── Konfigurasi Hari & Lapangan ───────────────
            $table->tinyInteger('total_days')->unsigned()->default(5)
                ->after('end_date')
                ->comment('Total hari pelaksanaan turnamen');

            $table->tinyInteger('courts_count')->unsigned()->default(4)
                ->after('total_days')
                ->comment('Jumlah lapangan (berlaku sama untuk semua hari)');

            // ─── Jam Operasional Harian ─────────────────────
            $table->time('session_start_time')->default('08:00:00')
                ->after('courts_count')
                ->comment('Jam mulai sesi pertandingan per hari');

            $table->time('session_end_time')->default('17:00:00')
                ->after('session_start_time')
                ->comment('Jam berakhir sesi pertandingan per hari');

            $table->smallInteger('session_duration_minutes')->unsigned()->default(50)
                ->after('session_end_time')
                ->comment('Durasi satu sesi pertandingan (menit)');

            $table->smallInteger('break_duration_minutes')->unsigned()->default(10)
                ->after('session_duration_minutes')
                ->comment('Durasi jeda antar sesi (menit)');

            // ─── Konfigurasi ISHOMA ─────────────────────────
            // Berlaku serentak untuk SEMUA lapangan
            $table->time('ishoma_start_time')->nullable()
                ->after('break_duration_minutes')
                ->comment('Jam mulai ISHOMA/UPP (null = tidak ada ISHOMA)');

            $table->time('ishoma_end_time')->nullable()
                ->after('ishoma_start_time')
                ->comment('Jam selesai ISHOMA/UPP');

            $table->smallInteger('ishoma_duration_minutes')->unsigned()->nullable()
                ->after('ishoma_end_time')
                ->comment('Durasi ISHOMA (menit, computed dari start-end)');

            // ─── Status Jadwal Master ───────────────────────
            $table->enum('schedule_status', ['not_generated', 'draft', 'published'])
                ->default('not_generated')
                ->after('status')
                ->comment('Status Master Schedule: not_generated → draft → published');

            $table->index('schedule_status', 'idx_tournaments_schedule_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tournaments', function (Blueprint $table) {
            $table->dropIndex('idx_tournaments_schedule_status');
            $table->dropColumn([
                'total_days',
                'courts_count',
                'session_start_time',
                'session_end_time',
                'session_duration_minutes',
                'break_duration_minutes',
                'ishoma_start_time',
                'ishoma_end_time',
                'ishoma_duration_minutes',
                'schedule_status',
            ]);
        });
    }
};
