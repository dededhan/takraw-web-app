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
        Schema::create('pool_standings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pool_id')->constrained('pools')->cascadeOnDelete();
            $table->foreignId('team_id')->constrained('teams')->cascadeOnDelete();
            $table->smallInteger('played')->unsigned()->default(0);
            $table->smallInteger('won')->unsigned()->default(0);
            $table->smallInteger('lost')->unsigned()->default(0);
            $table->smallInteger('sets_won')->unsigned()->default(0);
            $table->smallInteger('sets_lost')->unsigned()->default(0);
            $table->integer('points_for')->unsigned()->default(0);
            $table->integer('points_against')->unsigned()->default(0);
            $table->smallInteger('rank')->unsigned()->nullable();
            $table->timestamp('updated_at')->nullable();

            $table->unique(['pool_id', 'team_id'], 'uq_pool_standing');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pool_standings');
    }
};
