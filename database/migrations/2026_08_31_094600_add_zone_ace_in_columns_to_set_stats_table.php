<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Adds separate ace/in tracking per zone (1-10).
     */
    public function up(): void
    {
        Schema::table('set_stats', function (Blueprint $table) {
            // Zone ACE columns (service ace landing in each zone)
            $table->smallInteger('zone_1_ace')->unsigned()->default(0)->after('zone_10');
            $table->smallInteger('zone_2_ace')->unsigned()->default(0)->after('zone_1_ace');
            $table->smallInteger('zone_3_ace')->unsigned()->default(0)->after('zone_2_ace');
            $table->smallInteger('zone_4_ace')->unsigned()->default(0)->after('zone_3_ace');
            $table->smallInteger('zone_5_ace')->unsigned()->default(0)->after('zone_4_ace');
            $table->smallInteger('zone_6_ace')->unsigned()->default(0)->after('zone_5_ace');
            $table->smallInteger('zone_7_ace')->unsigned()->default(0)->after('zone_6_ace');
            $table->smallInteger('zone_8_ace')->unsigned()->default(0)->after('zone_7_ace');
            $table->smallInteger('zone_9_ace')->unsigned()->default(0)->after('zone_8_ace');
            $table->smallInteger('zone_10_ace')->unsigned()->default(0)->after('zone_9_ace');

            // Zone IN columns (service in landing in each zone)
            $table->smallInteger('zone_1_in')->unsigned()->default(0)->after('zone_10_ace');
            $table->smallInteger('zone_2_in')->unsigned()->default(0)->after('zone_1_in');
            $table->smallInteger('zone_3_in')->unsigned()->default(0)->after('zone_2_in');
            $table->smallInteger('zone_4_in')->unsigned()->default(0)->after('zone_3_in');
            $table->smallInteger('zone_5_in')->unsigned()->default(0)->after('zone_4_in');
            $table->smallInteger('zone_6_in')->unsigned()->default(0)->after('zone_5_in');
            $table->smallInteger('zone_7_in')->unsigned()->default(0)->after('zone_6_in');
            $table->smallInteger('zone_8_in')->unsigned()->default(0)->after('zone_7_in');
            $table->smallInteger('zone_9_in')->unsigned()->default(0)->after('zone_8_in');
            $table->smallInteger('zone_10_in')->unsigned()->default(0)->after('zone_9_in');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('set_stats', function (Blueprint $table) {
            $table->dropColumn([
                'zone_1_ace', 'zone_2_ace', 'zone_3_ace', 'zone_4_ace', 'zone_5_ace',
                'zone_6_ace', 'zone_7_ace', 'zone_8_ace', 'zone_9_ace', 'zone_10_ace',
                'zone_1_in', 'zone_2_in', 'zone_3_in', 'zone_4_in', 'zone_5_in',
                'zone_6_in', 'zone_7_in', 'zone_8_in', 'zone_9_in', 'zone_10_in',
            ]);
        });
    }
};
