<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Menambah kolom-kolom Master Schedule ke tabel matches yang sudah ada.
     * Kolom lama dipertahankan untuk backward compatibility.
     */
    public function up(): void
    {
        Schema::table('matches', function (Blueprint $table) {
            // ─── Mode Tanding ──────────────────────────────
            $table->enum('match_mode', [
                'regu', 'double', 'quadrant', 'team_regu', 'team_double',
            ])->nullable()
              ->after('tournament_id')
              ->comment('Mode tanding match ini');

            // ─── Referensi Lapangan & Slot Waktu ───────────
            $table->foreignId('court_id')
                ->nullable()
                ->after('pool_id')
                ->constrained('courts')
                ->nullOnDelete()
                ->comment('Lapangan yang digunakan (FK ke courts)');

            $table->foreignId('time_slot_id')
                ->nullable()
                ->after('court_id')
                ->constrained('time_slots')
                ->nullOnDelete()
                ->comment('Slot waktu yang digunakan (FK ke time_slots)');

            $table->tinyInteger('day_number')->unsigned()->nullable()
                ->after('time_slot_id')
                ->comment('Hari ke-berapa match ini dijadwalkan (denormalisasi untuk query cepat)');

            // ─── Multi-Slot Spanning ────────────────────────
            $table->tinyInteger('slot_span')->unsigned()->default(1)
                ->after('day_number')
                ->comment('Jumlah slot waktu yang dipakai: 1=normal(50min), 3=Team mode(150min)');

            // ─── Placeholder Tim (Braket Dinamis) ──────────
            $table->string('home_placeholder', 100)->nullable()
                ->after('home_team_id')
                ->comment('Placeholder nama tim A, e.g. "Juara Pool A". NULL setelah resolved.');

            $table->string('away_placeholder', 100)->nullable()
                ->after('away_team_id')
                ->comment('Placeholder nama tim B, e.g. "Runner-up Pool B". NULL setelah resolved.');

            // ─── Super Team FK (untuk mode team_regu/team_double) ──
            $table->foreignId('home_super_team_id')
                ->nullable()
                ->after('home_placeholder')
                ->constrained('super_teams')
                ->nullOnDelete()
                ->comment('Super Team A (hanya untuk mode team_regu/team_double)');

            $table->foreignId('away_super_team_id')
                ->nullable()
                ->after('home_super_team_id')
                ->constrained('super_teams')
                ->nullOnDelete()
                ->comment('Super Team B (hanya untuk mode team_regu/team_double)');

            // ─── Index Tambahan ─────────────────────────────
            $table->index(['tournament_id', 'match_mode'], 'idx_matches_tournament_mode');
            $table->index(['tournament_id', 'day_number'], 'idx_matches_tournament_day');
            $table->index('time_slot_id', 'idx_matches_time_slot');
            $table->index('court_id', 'idx_matches_court');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('matches', function (Blueprint $table) {
            $table->dropIndex('idx_matches_tournament_mode');
            $table->dropIndex('idx_matches_tournament_day');
            $table->dropIndex('idx_matches_time_slot');
            $table->dropIndex('idx_matches_court');

            $table->dropForeign(['court_id']);
            $table->dropForeign(['time_slot_id']);
            $table->dropForeign(['home_super_team_id']);
            $table->dropForeign(['away_super_team_id']);

            $table->dropColumn([
                'match_mode',
                'court_id',
                'time_slot_id',
                'day_number',
                'slot_span',
                'home_placeholder',
                'away_placeholder',
                'home_super_team_id',
                'away_super_team_id',
            ]);
        });
    }
};
