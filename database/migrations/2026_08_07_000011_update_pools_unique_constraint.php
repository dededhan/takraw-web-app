<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Mengubah constraint unique uq_pool_name pada tabel pools agar memperhitungkan match_mode.
     * (Satu turnamen bisa memiliki Pool A Regu dan Pool A Team Regu sekaligus)
     */
    public function up(): void
    {
        Schema::table('pools', function (Blueprint $table) {
            $table->dropUnique('uq_pool_name');
            $table->unique(['tournament_id', 'match_mode', 'name'], 'uq_tournament_mode_pool_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pools', function (Blueprint $table) {
            $table->dropUnique('uq_tournament_mode_pool_name');
            $table->unique(['tournament_id', 'name'], 'uq_pool_name');
        });
    }
};
