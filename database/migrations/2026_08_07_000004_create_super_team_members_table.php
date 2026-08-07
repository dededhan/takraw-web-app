<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Pivot tabel: menghubungkan 1 SuperTeam ke 3 tim regu anggotanya.
     * Contoh: Super Team "TRA" → [Tim Jakarta A, Tim Bogor B, Tim Depok C]
     */
    public function up(): void
    {
        Schema::create('super_team_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('super_team_id')
                ->constrained('super_teams')
                ->cascadeOnDelete();

            $table->foreignId('team_id')
                ->constrained('teams')
                ->cascadeOnDelete();

            $table->timestamps();

            // Satu tim hanya boleh menjadi anggota satu super team per entri
            $table->unique(['super_team_id', 'team_id'], 'uq_super_team_member');

            $table->index('super_team_id', 'idx_stm_super_team');
            $table->index('team_id', 'idx_stm_team');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('super_team_members');
    }
};
