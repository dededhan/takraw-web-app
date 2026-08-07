<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Menambahkan kolom match_mode ke tabel pools agar pool bisa dipisahkan per mode tanding.
     */
    public function up(): void
    {
        Schema::table('pools', function (Blueprint $table) {
            $table->enum('match_mode', [
                'regu', 'double', 'quadrant', 'team_regu', 'team_double',
            ])->nullable()->after('tournament_id')
              ->comment('Mode tanding pool ini (null = mode default turnamen)');

            $table->index(['tournament_id', 'match_mode'], 'idx_pools_tournament_mode');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pools', function (Blueprint $table) {
            $table->dropIndex('idx_pools_tournament_mode');
            $table->dropColumn('match_mode');
        });
    }
};
