<?php

namespace Database\Seeders;

use App\Models\Athlete;
use App\Models\Match_;
use App\Models\MatchSet;
use App\Models\Pool;
use App\Models\PoolStanding;
use App\Models\SetStat;
use App\Models\Team;
use App\Models\Tournament;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // ─── Users ──────────────────────────────────────
        $admin = User::create([
            'name' => 'Admin Takraw',
            'email' => 'admin@takraw.test',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'phone' => '081234567890',
        ]);

        $coach1 = User::create([
            'name' => 'Pelatih Jakarta',
            'email' => 'coach1@takraw.test',
            'password' => Hash::make('password'),
            'role' => 'coach',
            'phone' => '081234567891',
        ]);

        $coach2 = User::create([
            'name' => 'Pelatih Bandung',
            'email' => 'coach2@takraw.test',
            'password' => Hash::make('password'),
            'role' => 'coach',
            'phone' => '081234567892',
        ]);

        $coach3 = User::create([
            'name' => 'Pelatih Surabaya',
            'email' => 'coach3@takraw.test',
            'password' => Hash::make('password'),
            'role' => 'coach',
        ]);

        $coach4 = User::create([
            'name' => 'Pelatih Yogyakarta',
            'email' => 'coach4@takraw.test',
            'password' => Hash::make('password'),
            'role' => 'coach',
        ]);

        $referee1 = User::create([
            'name' => 'Wasit Utama',
            'email' => 'referee1@takraw.test',
            'password' => Hash::make('password'),
            'role' => 'referee',
            'phone' => '081234567893',
        ]);

        $referee2 = User::create([
            'name' => 'Wasit Cadangan',
            'email' => 'referee2@takraw.test',
            'password' => Hash::make('password'),
            'role' => 'referee',
        ]);

        // ─── Tournament ─────────────────────────────────
        $tournament = Tournament::create([
            'name' => 'Kejuaraan Sepak Takraw UNJ 2024',
            'start_date' => '2024-09-01',
            'end_date' => '2024-09-07',
            'mode' => 'regu',
            'status' => 'pool_stage',
            'created_by' => $admin->id,
        ]);

        // ─── Teams & Athletes ───────────────────────────
        $teamsData = [
            ['name' => 'Elang Jakarta', 'region' => 'DKI Jakarta', 'coach' => $coach1, 'athletes' => [
                ['name' => 'Ahmad Rizki', 'jersey_number' => 1, 'position' => 'Tekong'],
                ['name' => 'Budi Santoso', 'jersey_number' => 7, 'position' => 'Feeder'],
                ['name' => 'Candra Wijaya', 'jersey_number' => 10, 'position' => 'Killer'],
                ['name' => 'Dimas Prayoga', 'jersey_number' => 3, 'position' => 'Cadangan'],
            ]],
            ['name' => 'Maung Bandung', 'region' => 'Jawa Barat', 'coach' => $coach2, 'athletes' => [
                ['name' => 'Eko Prasetyo', 'jersey_number' => 2, 'position' => 'Tekong'],
                ['name' => 'Fajar Nugroho', 'jersey_number' => 5, 'position' => 'Feeder'],
                ['name' => 'Gilang Ramadhan', 'jersey_number' => 9, 'position' => 'Killer'],
                ['name' => 'Hendra Gunawan', 'jersey_number' => 4, 'position' => 'Cadangan'],
            ]],
            ['name' => 'Singa Surabaya', 'region' => 'Jawa Timur', 'coach' => $coach3, 'athletes' => [
                ['name' => 'Irfan Hakim', 'jersey_number' => 1, 'position' => 'Tekong'],
                ['name' => 'Joko Widodo', 'jersey_number' => 8, 'position' => 'Feeder'],
                ['name' => 'Kurniawan Dwi', 'jersey_number' => 11, 'position' => 'Killer'],
            ]],
            ['name' => 'Garuda Yogya', 'region' => 'DIY', 'coach' => $coach4, 'athletes' => [
                ['name' => 'Lukman Hakim', 'jersey_number' => 3, 'position' => 'Tekong'],
                ['name' => 'Mulyadi Adi', 'jersey_number' => 6, 'position' => 'Feeder'],
                ['name' => 'Naufal Rizky', 'jersey_number' => 12, 'position' => 'Killer'],
            ]],
            ['name' => 'Banteng Semarang', 'region' => 'Jawa Tengah', 'coach' => null, 'athletes' => [
                ['name' => 'Oscar Putra', 'jersey_number' => 2, 'position' => 'Tekong'],
                ['name' => 'Pandu Wibowo', 'jersey_number' => 7, 'position' => 'Feeder'],
                ['name' => 'Qodri Fauzan', 'jersey_number' => 9, 'position' => 'Killer'],
            ]],
            ['name' => 'Rajawali Medan', 'region' => 'Sumatera Utara', 'coach' => null, 'athletes' => [
                ['name' => 'Rendi Saputra', 'jersey_number' => 4, 'position' => 'Tekong'],
                ['name' => 'Surya Darma', 'jersey_number' => 8, 'position' => 'Feeder'],
                ['name' => 'Teguh Prasetya', 'jersey_number' => 10, 'position' => 'Killer'],
            ]],
        ];

        $teams = [];
        foreach ($teamsData as $td) {
            $team = Team::create([
                'name' => $td['name'],
                'region' => $td['region'],
                'coach_id' => $td['coach']?->id,
            ]);

            foreach ($td['athletes'] as $ad) {
                Athlete::create([
                    'team_id' => $team->id,
                    'name' => $ad['name'],
                    'jersey_number' => $ad['jersey_number'],
                    'position' => $ad['position'],
                ]);
            }

            // Register team to tournament
            $tournament->teams()->attach($team->id);
            $teams[] = $team;
        }

        // ─── Pools (2 pools × 3 teams) ─────────────────
        $poolA = Pool::create(['tournament_id' => $tournament->id, 'name' => 'A']);
        $poolB = Pool::create(['tournament_id' => $tournament->id, 'name' => 'B']);

        // Pool A: Elang Jakarta, Maung Bandung, Singa Surabaya
        $poolA->teams()->attach([$teams[0]->id, $teams[1]->id, $teams[2]->id]);
        // Pool B: Garuda Yogya, Banteng Semarang, Rajawali Medan
        $poolB->teams()->attach([$teams[3]->id, $teams[4]->id, $teams[5]->id]);

        // Initialize pool standings
        foreach ([$poolA, $poolB] as $pool) {
            foreach ($pool->teams as $team) {
                PoolStanding::create([
                    'pool_id' => $pool->id,
                    'team_id' => $team->id,
                ]);
            }
        }

        // ─── Sample Match (Pool A: Elang Jakarta vs Maung Bandung) ──
        $match = Match_::create([
            'tournament_id' => $tournament->id,
            'pool_id' => $poolA->id,
            'stage' => 'pool',
            'home_team_id' => $teams[0]->id,
            'away_team_id' => $teams[1]->id,
            'referee_id' => $referee1->id,
            'court_number' => 1,
            'max_sets' => 3,
            'status' => 'finished',
            'started_at' => '2024-09-01 09:00:00',
            'finished_at' => '2024-09-01 10:30:00',
            'winner_team_id' => $teams[0]->id,
        ]);

        // Set 1: Elang Jakarta wins 21-18
        $set1 = MatchSet::create([
            'match_id' => $match->id,
            'set_number' => 1,
            'home_score' => 21,
            'away_score' => 18,
            'winner_team_id' => $teams[0]->id,
            'status' => 'finished',
            'started_at' => '2024-09-01 09:00:00',
            'finished_at' => '2024-09-01 09:35:00',
        ]);

        // Set 2: Maung Bandung wins 21-19
        $set2 = MatchSet::create([
            'match_id' => $match->id,
            'set_number' => 2,
            'home_score' => 19,
            'away_score' => 21,
            'winner_team_id' => $teams[1]->id,
            'status' => 'finished',
            'started_at' => '2024-09-01 09:40:00',
            'finished_at' => '2024-09-01 10:10:00',
        ]);

        // Set 3: Elang Jakarta wins 21-15
        $set3 = MatchSet::create([
            'match_id' => $match->id,
            'set_number' => 3,
            'home_score' => 21,
            'away_score' => 15,
            'winner_team_id' => $teams[0]->id,
            'status' => 'finished',
            'started_at' => '2024-09-01 10:15:00',
            'finished_at' => '2024-09-01 10:30:00',
        ]);

        // ─── Sample Stats for Set 1 ────────────────────
        $homeAthletes = $teams[0]->athletes;
        $awayAthletes = $teams[1]->athletes;

        // Stats for home team athletes (Set 1)
        foreach ($homeAthletes as $i => $athlete) {
            SetStat::create([
                'match_set_id' => $set1->id,
                'athlete_id' => $athlete->id,
                'team_id' => $teams[0]->id,
                'service_in' => rand(2, 5),
                'service_ace' => rand(0, 2),
                'service_error' => rand(0, 2),
                'receive_success' => rand(3, 7),
                'receive_fail' => rand(0, 3),
                'feeding_success' => rand(2, 6),
                'feeding_fail' => rand(0, 2),
                'strike_success' => rand(1, 5),
                'strike_fail' => rand(0, 3),
                'block_success' => rand(0, 3),
                'block_fail' => rand(0, 2),
            ]);
        }

        // Stats for away team athletes (Set 1)
        foreach ($awayAthletes as $athlete) {
            SetStat::create([
                'match_set_id' => $set1->id,
                'athlete_id' => $athlete->id,
                'team_id' => $teams[1]->id,
                'service_in' => rand(2, 4),
                'service_ace' => rand(0, 1),
                'service_error' => rand(1, 3),
                'receive_success' => rand(2, 5),
                'receive_fail' => rand(1, 4),
                'feeding_success' => rand(1, 4),
                'feeding_fail' => rand(1, 3),
                'strike_success' => rand(1, 3),
                'strike_fail' => rand(1, 4),
                'block_success' => rand(0, 2),
                'block_fail' => rand(0, 3),
            ]);
        }

        // ─── Second match scheduled ─────────────────────
        Match_::create([
            'tournament_id' => $tournament->id,
            'pool_id' => $poolA->id,
            'stage' => 'pool',
            'home_team_id' => $teams[0]->id,
            'away_team_id' => $teams[2]->id,
            'referee_id' => $referee2->id,
            'status' => 'scheduled',
            'scheduled_at' => '2024-09-02 09:00:00',
        ]);

        Match_::create([
            'tournament_id' => $tournament->id,
            'pool_id' => $poolA->id,
            'stage' => 'pool',
            'home_team_id' => $teams[1]->id,
            'away_team_id' => $teams[2]->id,
            'referee_id' => $referee1->id,
            'status' => 'scheduled',
            'scheduled_at' => '2024-09-02 11:00:00',
        ]);

        // Pool B matches
        Match_::create([
            'tournament_id' => $tournament->id,
            'pool_id' => $poolB->id,
            'stage' => 'pool',
            'home_team_id' => $teams[3]->id,
            'away_team_id' => $teams[4]->id,
            'referee_id' => $referee1->id,
            'status' => 'scheduled',
            'scheduled_at' => '2024-09-01 13:00:00',
        ]);

        // Update standings for the completed match
        PoolStanding::where('pool_id', $poolA->id)
            ->where('team_id', $teams[0]->id)
            ->update([
                'played' => 1, 'won' => 1, 'lost' => 0,
                'sets_won' => 2, 'sets_lost' => 1,
                'points_for' => 61, 'points_against' => 54,
                'rank' => 1,
            ]);

        PoolStanding::where('pool_id', $poolA->id)
            ->where('team_id', $teams[1]->id)
            ->update([
                'played' => 1, 'won' => 0, 'lost' => 1,
                'sets_won' => 1, 'sets_lost' => 2,
                'points_for' => 54, 'points_against' => 61,
                'rank' => 2,
            ]);

        $this->command->info('✅ Database seeded with sample tournament data!');
    }
}
