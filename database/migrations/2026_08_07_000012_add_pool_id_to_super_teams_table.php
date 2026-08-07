<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Menambahkan pool_id ke tabel super_teams agar super team bisa di-assign ke pool tertentu.
     */
    public function up(): void
    {
        Schema::table('super_teams', function (Blueprint $table) {
            $table->foreignId('pool_id')
                ->nullable()
                ->after('tournament_id')
                ->constrained('pools')
                ->nullOnDelete()
                ->comment('Pool tempat super team bertanding');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('super_teams', function (Blueprint $table) {
            $table->dropForeign(['pool_id']);
            $table->dropColumn('pool_id');
        });
    }
};
