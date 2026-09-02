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
        Schema::table('bracket_matrices', function (Blueprint $table) {
            $table->string('bracket_name', 50)->nullable()->after('match_mode');
            $table->dropUnique('uq_bracket_matrix_pos');
            $table->index(['tournament_id', 'match_mode', 'bracket_name'], 'idx_bracket_matrices_bracket');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bracket_matrices', function (Blueprint $table) {
            $table->dropIndex('idx_bracket_matrices_bracket');
            $table->dropColumn('bracket_name');
            $table->unique(
                ['tournament_id', 'match_mode', 'bracket_stage', 'bracket_position'],
                'uq_bracket_matrix_pos'
            );
        });
    }
};
