<?php

namespace Database\Seeders;

use App\Models\Athlete;
use App\Models\BracketMatrix;
use App\Models\Pool;
use App\Models\PoolStanding;
use App\Models\SuperTeam;
use App\Models\Team;
use App\Models\Tournament;
use App\Models\User;
use App\Services\MasterScheduleGeneratorService;
use App\Services\TimeSlotGeneratorService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class MasterScheduleDemoSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Membuat 1 Turnamen Master Skala Besar (8 Kontingen Daerah, 40 Tim Total, 4 Pool per Mode)
     * - Admin buat 1 Turnamen dengan 3 mode aktif (Regu, Double, Team Regu).
     * - 8 Pelatih mendaftarkan:
     *   1) 1 tim khusus Mode Regu
     *   2) 1 tim khusus Mode Double
     *   3) 1 Super Team khusus Mode Team Regu (gabungan 3 sub-regu)
     * - Pool disetup (4 Pool: A, B, C, D) & Master Schedule di-generate secara otomatis!
     */
    public function run(): void
    {
        DB::transaction(function () {
            // Hapus turnamen lama dengan nama yang sama jika ada
            Tournament::where('name', 'Kejuaraan Nasional Sepak Takraw Grand Master 2026')->delete();

            // ─── 1. User Accounts (Admin & 8 Pelatih) ────────────────
            $admin = User::firstOrCreate(
                ['email' => 'admin@takraw.test'],
                ['name' => 'Admin Takraw', 'password' => Hash::make('password'), 'role' => 'admin', 'phone' => '081234567890']
            );

            $coachesData = [
                ['name' => 'Pelatih Jakarta',   'email' => 'coach1@takraw.test', 'region' => 'DKI Jakarta',        'code' => 'DKI Jakarta'],
                ['name' => 'Pelatih Bandung',   'email' => 'coach2@takraw.test', 'region' => 'Jawa Barat',         'code' => 'Jawa Barat'],
                ['name' => 'Pelatih Surabaya',  'email' => 'coach3@takraw.test', 'region' => 'Jawa Timur',         'code' => 'Jawa Timur'],
                ['name' => 'Pelatih Yogyakarta','email' => 'coach4@takraw.test', 'region' => 'DIY',                'code' => 'DIY'],
                ['name' => 'Pelatih Semarang',  'email' => 'coach5@takraw.test', 'region' => 'Jawa Tengah',        'code' => 'Jawa Tengah'],
                ['name' => 'Pelatih Medan',     'email' => 'coach6@takraw.test', 'region' => 'Sumatera Utara',     'code' => 'Sumatera Utara'],
                ['name' => 'Pelatih Makassar',  'email' => 'coach7@takraw.test', 'region' => 'Sulawesi Selatan',   'code' => 'Sulawesi Selatan'],
                ['name' => 'Pelatih Denpasar',  'email' => 'coach8@takraw.test', 'region' => 'Bali',              'code' => 'Bali'],
            ];

            $coaches = [];
            foreach ($coachesData as $cd) {
                $coach = User::firstOrCreate(
                    ['email' => $cd['email']],
                    ['name' => $cd['name'], 'password' => Hash::make('password'), 'role' => 'coach']
                );
                $coaches[$cd['code']] = ['user' => $coach, 'region' => $cd['region']];
            }

            // ─── 2. Buat Turnamen Skala Besar (8 Daerah, 4 Lapangan, 5 Hari) ──
            $tournament = Tournament::create([
                'name'                     => 'Kejuaraan Nasional Sepak Takraw Grand Master 2026',
                'start_date'               => '2026-08-15',
                'end_date'                 => '2026-08-19',
                'mode'                     => 'regu',
                'status'                   => 'pool_stage',
                'created_by'               => $admin->id,
                'total_days'               => 5,
                'courts_count'             => 4,
                'session_start_time'       => '08:00:00',
                'session_end_time'         => '17:00:00',
                'session_duration_minutes' => 50,
                'break_duration_minutes'   => 10,
                'ishoma_start_time'        => '12:00:00',
                'ishoma_end_time'          => '13:00:00',
                'ishoma_duration_minutes'  => 60,
                'schedule_status'          => 'not_generated',
            ]);

            // Aktifkan 3 Mode Tanding dengan 4 Pool per mode
            foreach (['regu', 'double', 'team_regu'] as $m) {
                $tournament->modes()->create([
                    'match_mode' => $m,
                    'pool_count' => 4,
                    'is_active'  => true,
                ]);
            }

            $this->command->info("🏆 Turnamen Mega dibuat dengan 3 Mode Aktif & 4 Pool per Mode.");

            // ─── 3. Pendaftaran Tim oleh 8 Pelatih ────────────────────
            $reguTeams   = [];
            $doubleTeams = [];
            $superTeams  = [];

            foreach ($coaches as $region => $c) {
                $coach = $c['user'];

                // A) 1 Tim khusus Mode Regu
                $reguTeam = Team::create([
                    'name'     => "Tim Regu {$region}",
                    'region'   => $region,
                    'coach_id' => $coach->id,
                ]);
                foreach (['Tekong', 'Feeder', 'Killer', 'Cadangan'] as $idx => $pos) {
                    Athlete::create([
                        'team_id'       => $reguTeam->id,
                        'name'          => "Atlet Regu {$region} " . ($idx + 1),
                        'jersey_number' => $idx + 1,
                        'position'      => $pos,
                    ]);
                }
                $tournament->teams()->attach($reguTeam->id);
                $reguTeams[$region] = $reguTeam;

                // B) 1 Tim khusus Mode Double
                $doubleTeam = Team::create([
                    'name'     => "Tim Double {$region}",
                    'region'   => $region,
                    'coach_id' => $coach->id,
                ]);
                foreach (['Pemain 1', 'Pemain 2', 'Cadangan'] as $idx => $pos) {
                    Athlete::create([
                        'team_id'       => $doubleTeam->id,
                        'name'          => "Atlet Double {$region} " . ($idx + 1),
                        'jersey_number' => $idx + 10,
                        'position'      => $pos,
                    ]);
                }
                $tournament->teams()->attach($doubleTeam->id);
                $doubleTeams[$region] = $doubleTeam;

                // C) 1 Super Team khusus Mode Team Regu (3 sub-regu)
                $superTeam = SuperTeam::create([
                    'tournament_id' => $tournament->id,
                    'name'          => "TRA {$region} (Team Regu)",
                    'match_mode'    => 'team_regu',
                    'created_by'    => $coach->id,
                ]);

                // Buat 3 sub-regu bawahan
                for ($r = 1; $r <= 3; $r++) {
                    $subRegu = Team::create([
                        'name'     => "Regu {$r} {$region}",
                        'region'   => $region,
                        'coach_id' => $coach->id,
                    ]);

                    foreach (['Tekong', 'Feeder', 'Killer', 'Cadangan'] as $idx => $pos) {
                        Athlete::create([
                            'team_id'       => $subRegu->id,
                            'name'          => "Atlet R{$r} {$region} " . ($idx + 1),
                            'jersey_number' => ($r * 10) + $idx + 1,
                            'position'      => $pos,
                        ]);
                    }

                    $tournament->teams()->attach($subRegu->id);
                    $superTeam->members()->attach($subRegu->id);
                }

                $superTeams[$region] = $superTeam;
            }

            $this->command->info("👥 8 Kontingen mendaftarkan: 8 Tim Regu, 8 Tim Double, dan 8 Super Team (24 sub-regu). Total 40 tim terdaftar.");

            // ─── 4. Pembagian 4 Pool per Mode (A, B, C, D) ──────────────
            $regionsList = array_keys($coaches); // 8 daerah

            // A) Mode Regu (Pool A, B, C, D)
            $pRegu = [];
            foreach (['A', 'B', 'C', 'D'] as $label) {
                $pRegu[$label] = Pool::create(['tournament_id' => $tournament->id, 'name' => $label, 'match_mode' => 'regu']);
            }
            $pRegu['A']->teams()->attach([$reguTeams['DKI Jakarta']->id, $reguTeams['Jawa Barat']->id]);
            $pRegu['B']->teams()->attach([$reguTeams['Jawa Timur']->id, $reguTeams['DIY']->id]);
            $pRegu['C']->teams()->attach([$reguTeams['Jawa Tengah']->id, $reguTeams['Sumatera Utara']->id]);
            $pRegu['D']->teams()->attach([$reguTeams['Sulawesi Selatan']->id, $reguTeams['Bali']->id]);

            // B) Mode Double (Pool A, B, C, D)
            $pDouble = [];
            foreach (['A', 'B', 'C', 'D'] as $label) {
                $pDouble[$label] = Pool::create(['tournament_id' => $tournament->id, 'name' => $label, 'match_mode' => 'double']);
            }
            $pDouble['A']->teams()->attach([$doubleTeams['DKI Jakarta']->id, $doubleTeams['Jawa Barat']->id]);
            $pDouble['B']->teams()->attach([$doubleTeams['Jawa Timur']->id, $doubleTeams['DIY']->id]);
            $pDouble['C']->teams()->attach([$doubleTeams['Jawa Tengah']->id, $doubleTeams['Sumatera Utara']->id]);
            $pDouble['D']->teams()->attach([$doubleTeams['Sulawesi Selatan']->id, $doubleTeams['Bali']->id]);

            // C) Mode Team Regu (Pool A, B, C, D Super Teams)
            $pTeam = [];
            foreach (['A', 'B', 'C', 'D'] as $label) {
                $pTeam[$label] = Pool::create(['tournament_id' => $tournament->id, 'name' => $label, 'match_mode' => 'team_regu']);
            }
            $superTeams['DKI Jakarta']->update(['pool_id' => $pTeam['A']->id]);
            $superTeams['Jawa Barat']->update(['pool_id' => $pTeam['A']->id]);

            $superTeams['Jawa Timur']->update(['pool_id' => $pTeam['B']->id]);
            $superTeams['DIY']->update(['pool_id' => $pTeam['B']->id]);

            $superTeams['Jawa Tengah']->update(['pool_id' => $pTeam['C']->id]);
            $superTeams['Sumatera Utara']->update(['pool_id' => $pTeam['C']->id]);

            $superTeams['Sulawesi Selatan']->update(['pool_id' => $pTeam['D']->id]);
            $superTeams['Bali']->update(['pool_id' => $pTeam['D']->id]);

            // Inisialisasi pool standings untuk regu & double
            foreach ([...array_values($pRegu), ...array_values($pDouble)] as $p) {
                foreach ($p->teams as $t) {
                    PoolStanding::create(['pool_id' => $p->id, 'team_id' => $t->id]);
                }
            }

            $this->command->info("🏊 12 Pool berhasil dibuat (4 Pool x 3 Mode).");

            // ─── 5. Konfigurasi Bracket Matrix 4 Pool (Quarterfinal -> Semifinal -> Final) ──
            foreach (['regu', 'double', 'team_regu'] as $m) {
                // QF 1: Pool A Rank 1 vs Pool B Rank 2
                BracketMatrix::create([
                    'tournament_id' => $tournament->id, 'match_mode' => $m,
                    'bracket_stage' => 'round_of_8', 'bracket_position' => 1,
                    'home_source'   => 'pool_A_rank_1', 'away_source' => 'pool_B_rank_2',
                ]);
                // QF 2: Pool C Rank 1 vs Pool D Rank 2
                BracketMatrix::create([
                    'tournament_id' => $tournament->id, 'match_mode' => $m,
                    'bracket_stage' => 'round_of_8', 'bracket_position' => 2,
                    'home_source'   => 'pool_C_rank_1', 'away_source' => 'pool_D_rank_2',
                ]);
                // QF 3: Pool B Rank 1 vs Pool A Rank 2
                BracketMatrix::create([
                    'tournament_id' => $tournament->id, 'match_mode' => $m,
                    'bracket_stage' => 'round_of_8', 'bracket_position' => 3,
                    'home_source'   => 'pool_B_rank_1', 'away_source' => 'pool_A_rank_2',
                ]);
                // QF 4: Pool D Rank 1 vs Pool C Rank 2
                BracketMatrix::create([
                    'tournament_id' => $tournament->id, 'match_mode' => $m,
                    'bracket_stage' => 'round_of_8', 'bracket_position' => 4,
                    'home_source'   => 'pool_D_rank_1', 'away_source' => 'pool_C_rank_2',
                ]);

                // Semifinals
                BracketMatrix::create([
                    'tournament_id' => $tournament->id, 'match_mode' => $m,
                    'bracket_stage' => 'semifinal', 'bracket_position' => 1,
                    'home_source'   => 'winner_qf_1', 'away_source' => 'winner_qf_2',
                ]);
                BracketMatrix::create([
                    'tournament_id' => $tournament->id, 'match_mode' => $m,
                    'bracket_stage' => 'semifinal', 'bracket_position' => 2,
                    'home_source'   => 'winner_qf_3', 'away_source' => 'winner_qf_4',
                ]);

                // Final
                BracketMatrix::create([
                    'tournament_id' => $tournament->id, 'match_mode' => $m,
                    'bracket_stage' => 'final', 'bracket_position' => 1,
                    'home_source'   => 'winner_sf_1', 'away_source' => 'winner_sf_2',
                ]);
            }

            // ─── 6. Time Slot & Master Schedule Auto-Generate ─────────
            $slotGen = new TimeSlotGeneratorService();
            $slotGen->generate($tournament);

            $schedGen = new MasterScheduleGeneratorService();
            $stats = $schedGen->generate($tournament);

            $this->command->info("⚡ MASTER SCHEDULE GENERATED LENGKAP!");
            $this->command->info("   - Team Matches (3 sesi): " . $stats['team_matches_scheduled']);
            $this->command->info("   - Pool Matches (1 sesi): " . $stats['pool_matches_scheduled']);
            $this->command->info("   - Bracket Matches      : " . $stats['bracket_matches_created']);
        });
    }
}
