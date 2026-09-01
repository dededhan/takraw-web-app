<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ServerBackupSeeder extends Seeder
{
    public function run(): void
    {
        $jsonPath = database_path('seeders/backup_data.json');
        if (!file_exists($jsonPath)) {
            $this->command->error("File {$jsonPath} tidak ditemukan!");
            return;
        }

        $data = json_decode(file_get_contents($jsonPath), true);
        if (!$data) {
            $this->command->error("Format JSON tidak valid!");
            return;
        }

        // Matikan foreign key checks saat seeding
        Schema::disableForeignKeyConstraints();

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
            'super_team_members',
            'pools',
            'pool_teams',
            'pool_standings',
            'matches',
            'match_sets',
            'set_stats',
            'bracket_matrices',
        ];

        foreach ($tables as $table) {
            if (!isset($data[$table]) || empty($data[$table])) {
                continue;
            }

            if (!Schema::hasTable($table)) {
                $this->command->warn("Tabel {$table} belum ada di database, lewati.");
                continue;
            }

            DB::table($table)->truncate();

            // Filter kolom yang hanya ada di tabel database saat ini
            $columns = Schema::getColumnListing($table);

            $chunks = array_chunk($data[$table], 100);
            foreach ($chunks as $chunk) {
                $filteredChunk = array_map(function ($row) use ($columns) {
                    return array_intersect_key($row, array_flip($columns));
                }, $chunk);

                DB::table($table)->insert($filteredChunk);
            }

            $count = count($data[$table]);
            $this->command->info("✅ Berhasil restore {$count} baris ke tabel {$table}");
        }

        Schema::enableForeignKeyConstraints();

        $this->command->info("🎉 Seluruh data server berhasil di-restore!");
    }
}
