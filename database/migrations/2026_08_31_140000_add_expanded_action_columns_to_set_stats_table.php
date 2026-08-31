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
            // Strike (Smash) Ace, In, Error
            $table->smallInteger('strike_in')->unsigned()->default(0)->after('strike_fail');
            $table->smallInteger('strike_ace')->unsigned()->default(0)->after('strike_in');
            $table->smallInteger('strike_error')->unsigned()->default(0)->after('strike_ace');

            // Freeball Ace, In, Error
            $table->smallInteger('freeball_in')->unsigned()->default(0)->after('strike_error');
            $table->smallInteger('freeball_ace')->unsigned()->default(0)->after('freeball_in');
            $table->smallInteger('freeball_error')->unsigned()->default(0)->after('freeball_ace');

            // Firstball (Receive) Ace, In, Error
            $table->smallInteger('firstball_in')->unsigned()->default(0)->after('freeball_error');
            $table->smallInteger('firstball_ace')->unsigned()->default(0)->after('firstball_in');
            $table->smallInteger('firstball_error')->unsigned()->default(0)->after('firstball_ace');

            // Feeding (Set up) Ace, In, Error
            $table->smallInteger('feeding_in')->unsigned()->default(0)->after('firstball_error');
            $table->smallInteger('feeding_ace')->unsigned()->default(0)->after('feeding_in');
            $table->smallInteger('feeding_error')->unsigned()->default(0)->after('feeding_ace');

            // Blocking Ace, In, Error
            $table->smallInteger('blocking_in')->unsigned()->default(0)->after('feeding_error');
            $table->smallInteger('blocking_ace')->unsigned()->default(0)->after('blocking_in');
            $table->smallInteger('blocking_error')->unsigned()->default(0)->after('blocking_ace');

            // Opponent mistake
            $table->smallInteger('opponent_mistake')->unsigned()->default(0)->after('blocking_error');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('set_stats', function (Blueprint $table) {
            $table->dropColumn([
                'strike_in', 'strike_ace', 'strike_error',
                'freeball_in', 'freeball_ace', 'freeball_error',
                'firstball_in', 'firstball_ace', 'firstball_error',
                'feeding_in', 'feeding_ace', 'feeding_error',
                'blocking_in', 'blocking_ace', 'blocking_error',
                'opponent_mistake',
            ]);
        });
    }
};
