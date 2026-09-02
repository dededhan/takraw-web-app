<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('app:backup-to-seeder', function () {
    $tables = [
        'users',
        'tournaments',
        'tournament_modes',
        'courts',
        'time_slots',
        'super_teams',
        'teams',
        'athletes',
        'tournament_teams',
        'tournament_super_teams',
        'super_team_members',
        'pools',
        'pool_teams',
        'pool_standings',
        'matches',
        'match_sets',
        'set_stats',
        'bracket_matrices',
        'schedule_conflicts',
    ];

    $backupData = [];

    foreach ($tables as $table) {
        if (\Illuminate\Support\Facades\Schema::hasTable($table)) {
            $rows = \Illuminate\Support\Facades\DB::table($table)->get()->map(fn($item) => (array) $item)->toArray();
            $backupData[$table] = $rows;
            $this->line("Table <info>{$table}</info>: " . count($rows) . " rows");
        }
    }

    $jsonPath = database_path('seeders/backup_data.json');
    file_put_contents($jsonPath, json_encode($backupData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    $this->info("💾 Backup berhasil disimpan ke database/seeders/backup_data.json!");
})->purpose('Export current database state to backup_data.json for ServerBackupSeeder');

