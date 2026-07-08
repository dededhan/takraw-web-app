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
            // Ball landing zones (fan-shaped, 1=far left to 7=far right)
            $table->smallInteger('zone_1')->unsigned()->default(0)->after('block_fail');
            $table->smallInteger('zone_2')->unsigned()->default(0)->after('zone_1');
            $table->smallInteger('zone_3')->unsigned()->default(0)->after('zone_2');
            $table->smallInteger('zone_4')->unsigned()->default(0)->after('zone_3');
            $table->smallInteger('zone_5')->unsigned()->default(0)->after('zone_4');
            $table->smallInteger('zone_6')->unsigned()->default(0)->after('zone_5');
            $table->smallInteger('zone_7')->unsigned()->default(0)->after('zone_6');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('set_stats', function (Blueprint $table) {
            $table->dropColumn([
                'zone_1', 'zone_2', 'zone_3', 'zone_4',
                'zone_5', 'zone_6', 'zone_7',
            ]);
        });
    }
};
