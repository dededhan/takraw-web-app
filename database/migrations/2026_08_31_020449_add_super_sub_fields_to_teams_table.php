<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('teams', function (Blueprint $table) {
            $table->boolean('is_super_sub')->default(false)->after('coach_id');
            $table->foreignId('parent_super_team_id')
                ->nullable()
                ->after('is_super_sub')
                ->constrained('super_teams')
                ->nullOnDelete();
            $table->index(['is_super_sub', 'parent_super_team_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('teams', function (Blueprint $table) {
            $table->dropConstrainedForeignId('parent_super_team_id');
            $table->dropIndex(['is_super_sub', 'parent_super_team_id']);
            $table->dropColumn('is_super_sub');
        });
    }
};
