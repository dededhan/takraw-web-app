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
        Schema::table('set_stats', function (Blueprint $table) {
            // Additional ball landing zones (8=bottom center, 9=center court, 10=top center)
            $table->smallInteger('zone_8')->unsigned()->default(0)->after('zone_7');
            $table->smallInteger('zone_9')->unsigned()->default(0)->after('zone_8');
            $table->smallInteger('zone_10')->unsigned()->default(0)->after('zone_9');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('set_stats', function (Blueprint $table) {
            $table->dropColumn(['zone_8', 'zone_9', 'zone_10']);
        });
    }
};
