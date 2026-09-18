<?php

namespace App\Http\Controllers;

use App\Models\BracketMatrix;
use App\Models\Tournament;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BracketMatrixController extends Controller
{
    /**
     * Tampilkan form konfigurasi bracket matrix per mode.
     */
    public function index(Tournament $tournament): Response
    {
        $tournament->load(['modes', 'bracketMatrices', 'pools.teams', 'pools.superTeams']);

        // Siapkan data: untuk setiap mode aktif, tampilkan matrix yang sudah ada
        $activeModes = $tournament->modes()
            ->where('is_active', true)
            ->get();

        $allMatrices = BracketMatrix::where('tournament_id', $tournament->id)->get();

        // Buat structure bracket & matriks per braket & mode
        $modeBrackets = [];

        foreach ($activeModes as $mode) {
            $poolsForMode = $tournament->pools->where('match_mode', $mode->match_mode);
            $bracketsGrouped = $poolsForMode->groupBy('bracket_name');

            if ($bracketsGrouped->isNotEmpty()) {
                $bList = [];
                $bracketIdx = 1;
                foreach ($bracketsGrouped as $bracketName => $pools) {
                    $bPoolCount = $pools->count();
                    $bName = $bracketName ?: "Braket {$bracketIdx}";

                    // Filter saved matrices for this bracket
                    $savedMatrices = $allMatrices
                        ->where('match_mode', $mode->match_mode)
                        ->filter(function ($m) use ($bName, $bracketsGrouped) {
                            if ($bracketsGrouped->count() === 1) return true;
                            return $m->bracket_name === $bName;
                        })
                        ->values();

                    $defaultStages = $this->getBracketStages($bPoolCount);

                    $bList[] = [
                        'bracket_number' => $bracketIdx++,
                        'bracket_name'   => $bName,
                        'pool_count'     => $bPoolCount,
                        'pools'          => $pools->values()->map(fn($p) => [
                            'id'           => $p->id,
                            'name'         => $p->name,
                            'display_name' => $p->display_name ?? "Pool {$p->name}",
                            'teams_count'  => in_array($mode->match_mode, ['team_regu', 'team_double'])
                                ? $p->superTeams->count()
                                : $p->teams->count(),
                        ]),
                        'is_single_pool' => $bPoolCount <= 1,
                        'stages'         => $savedMatrices->isNotEmpty() ? $savedMatrices->toArray() : $defaultStages,
                    ];
                }
                $modeBrackets[$mode->match_mode] = $bList;
            } else {
                $poolCount = $mode->pool_count ?? 2;
                $savedMatrices = $allMatrices->where('match_mode', $mode->match_mode)->values();
                $defaultStages = $this->getBracketStages($poolCount);

                $modeBrackets[$mode->match_mode] = [
                    [
                        'bracket_number' => 1,
                        'bracket_name'   => 'Braket Utama',
                        'pool_count'     => $poolCount,
                        'pools'          => [],
                        'is_single_pool' => $poolCount <= 1,
                        'stages'         => $savedMatrices->isNotEmpty() ? $savedMatrices->toArray() : $defaultStages,
                    ],
                ];
            }
        }

        return Inertia::render('Tournament/MasterSchedule/BracketMatrix', [
            'tournament'   => $tournament,
            'activeModes'  => $activeModes,
            'modeBrackets' => $modeBrackets,
        ]);
    }

    /**
     * Simpan atau update konfigurasi bracket matrix.
     * Menerima array konfigurasi untuk semua mode sekaligus.
     */
    public function store(Request $request, Tournament $tournament)
    {
        $validated = $request->validate([
            'matrices'                        => 'nullable|array',
            'matrices.*.match_mode'           => 'required|in:regu,double,quadrant,team_regu,team_double',
            'matrices.*.bracket_name'         => 'nullable|string|max:50',
            'matrices.*.bracket_stage'        => 'required|in:round_of_16,round_of_8,semifinal,third_place,final',
            'matrices.*.bracket_position'     => 'required|integer|min:1',
            'matrices.*.home_source'          => 'required|string|max:60',
            'matrices.*.away_source'          => 'required|string|max:60',
        ]);

        // Hapus konfigurasi lama untuk turnamen ini
        BracketMatrix::where('tournament_id', $tournament->id)->delete();

        // Insert konfigurasi baru jika ada
        if (!empty($validated['matrices'])) {
            foreach ($validated['matrices'] as $matrixData) {
                BracketMatrix::create([
                    'tournament_id'    => $tournament->id,
                    'match_mode'       => $matrixData['match_mode'],
                    'bracket_name'     => $matrixData['bracket_name'] ?? null,
                    'bracket_stage'    => $matrixData['bracket_stage'],
                    'bracket_position' => $matrixData['bracket_position'],
                    'home_source'      => $matrixData['home_source'],
                    'away_source'      => $matrixData['away_source'],
                ]);
            }
        }

        return redirect()
            ->route('tournaments.master-schedule.generate-form', $tournament)
            ->with('success', 'Konfigurasi Bracket Matrix berhasil disimpan! Siap untuk Generate Jadwal.');
    }

    /**
     * Update satu baris matriks (digunakan saat user mengubah dropdown).
     */
    public function update(Request $request, Tournament $tournament, BracketMatrix $matrix)
    {
        // Pastikan matrix milik tournament ini
        abort_unless($matrix->tournament_id === $tournament->id, 403);

        $validated = $request->validate([
            'home_source' => 'required|string|max:60',
            'away_source' => 'required|string|max:60',
        ]);

        $matrix->update($validated);

        return response()->json([
            'success' => true,
            'matrix'  => $matrix->fresh(),
        ]);
    }

    // ─────────────────────────────────────────────────────────────────
    // HELPER: Bracket Stage Builder
    // ─────────────────────────────────────────────────────────────────

    /**
     * Tentukan struktur bracket stages berdasarkan jumlah pool.
     *
     * 1 pool  → Full Round Robin ([] - tidak ada babak gugur, juara dari klasemen)
     * 2 pool  → SF (4 tim) + Final
     * 3 pool  → Bye/Wildcard + SF + Final (pool ganjil)
     * 4 pool  → QF (8 tim) + SF + Final
     * 6 pool  → Round of 16 (12 tim, ada bye) + QF + SF + Final
     * 8 pool  → Round of 16 (16 tim) + QF + SF + Final
     *
     * @return array Daftar stage dengan posisi dan sumber tim yang bisa dipilih
     */
    public function getBracketStages(int $poolCount): array
    {
        $stages = [];
        $pools  = range('A', chr(64 + max(1, min($poolCount, 16))));

        if ($poolCount <= 1) {
            // 1 pool → Full Round Robin (Setengah Kompetisi, juara dari klasemen akhir)
            return [];
        } elseif ($poolCount === 2) {
            // 2 pool → Juara & Runner-up (4 tim) → Semifinal (2 laga) + Final
            $stages[] = $this->makeStage('semifinal', 1, 'pool_A_rank_1', 'pool_B_rank_2');
            $stages[] = $this->makeStage('semifinal', 2, 'pool_B_rank_1', 'pool_A_rank_2');
            $stages[] = $this->makeStage('final', 1, 'winner_sf_1', 'winner_sf_2');
        } elseif ($poolCount === 3) {
            // 3 pool → Juara & Runner-up (6 tim) → 8 Besar (4 laga, 2 BYE) + SF + Final
            $stages[] = $this->makeStage('round_of_8', 1, 'pool_A_rank_1', 'bye');
            $stages[] = $this->makeStage('round_of_8', 2, 'pool_C_rank_1', 'pool_B_rank_2');
            $stages[] = $this->makeStage('round_of_8', 3, 'pool_B_rank_1', 'bye');
            $stages[] = $this->makeStage('round_of_8', 4, 'pool_A_rank_2', 'pool_C_rank_2');
            $stages[] = $this->makeStage('semifinal', 1, 'winner_qf_1', 'winner_qf_2');
            $stages[] = $this->makeStage('semifinal', 2, 'winner_qf_3', 'winner_qf_4');
            $stages[] = $this->makeStage('final', 1, 'winner_sf_1', 'winner_sf_2');
        } elseif ($poolCount === 4) {
            // 4 pool → Juara & Runner-up (8 tim) → 8 Besar (4 laga murni tanpa BYE) + SF + Final
            $stages[] = $this->makeStage('round_of_8', 1, 'pool_A_rank_1', 'pool_B_rank_2');
            $stages[] = $this->makeStage('round_of_8', 2, 'pool_C_rank_1', 'pool_D_rank_2');
            $stages[] = $this->makeStage('round_of_8', 3, 'pool_B_rank_1', 'pool_A_rank_2');
            $stages[] = $this->makeStage('round_of_8', 4, 'pool_D_rank_1', 'pool_C_rank_2');
            $stages[] = $this->makeStage('semifinal', 1, 'winner_qf_1', 'winner_qf_2');
            $stages[] = $this->makeStage('semifinal', 2, 'winner_qf_3', 'winner_qf_4');
            $stages[] = $this->makeStage('final', 1, 'winner_sf_1', 'winner_sf_2');
        } elseif ($poolCount === 5) {
            // 5 pool → Juara & Runner-up (10 tim) → 16 Besar (8 laga, 6 BYE) + 8 Besar (4 laga) + SF + Final
            $stages[] = $this->makeStage('round_of_16', 1, 'pool_A_rank_1', 'bye');
            $stages[] = $this->makeStage('round_of_16', 2, 'pool_C_rank_1', 'pool_D_rank_2');
            $stages[] = $this->makeStage('round_of_16', 3, 'pool_E_rank_1', 'bye');
            $stages[] = $this->makeStage('round_of_16', 4, 'pool_B_rank_2', 'bye');
            $stages[] = $this->makeStage('round_of_16', 5, 'pool_B_rank_1', 'bye');
            $stages[] = $this->makeStage('round_of_16', 6, 'pool_D_rank_1', 'pool_C_rank_2');
            $stages[] = $this->makeStage('round_of_16', 7, 'pool_A_rank_2', 'bye');
            $stages[] = $this->makeStage('round_of_16', 8, 'pool_E_rank_2', 'bye');
            $stages[] = $this->makeStage('round_of_8', 1, 'winner_r16_1', 'winner_r16_2');
            $stages[] = $this->makeStage('round_of_8', 2, 'winner_r16_3', 'winner_r16_4');
            $stages[] = $this->makeStage('round_of_8', 3, 'winner_r16_5', 'winner_r16_6');
            $stages[] = $this->makeStage('round_of_8', 4, 'winner_r16_7', 'winner_r16_8');
            $stages[] = $this->makeStage('semifinal', 1, 'winner_qf_1', 'winner_qf_2');
            $stages[] = $this->makeStage('semifinal', 2, 'winner_qf_3', 'winner_qf_4');
            $stages[] = $this->makeStage('final', 1, 'winner_sf_1', 'winner_sf_2');
        } elseif ($poolCount === 6) {
            // 6 pool → Juara & Runner-up (12 tim) → 16 Besar (8 laga, 4 BYE) + 8 Besar (4 laga) + SF + Final
            $stages[] = $this->makeStage('round_of_16', 1, 'pool_A_rank_1', 'bye');
            $stages[] = $this->makeStage('round_of_16', 2, 'pool_E_rank_1', 'pool_F_rank_2');
            $stages[] = $this->makeStage('round_of_16', 3, 'pool_C_rank_1', 'bye');
            $stages[] = $this->makeStage('round_of_16', 4, 'pool_B_rank_2', 'pool_D_rank_2');
            $stages[] = $this->makeStage('round_of_16', 5, 'pool_B_rank_1', 'bye');
            $stages[] = $this->makeStage('round_of_16', 6, 'pool_F_rank_1', 'pool_E_rank_2');
            $stages[] = $this->makeStage('round_of_16', 7, 'pool_D_rank_1', 'bye');
            $stages[] = $this->makeStage('round_of_16', 8, 'pool_A_rank_2', 'pool_C_rank_2');
            $stages[] = $this->makeStage('round_of_8', 1, 'winner_r16_1', 'winner_r16_2');
            $stages[] = $this->makeStage('round_of_8', 2, 'winner_r16_3', 'winner_r16_4');
            $stages[] = $this->makeStage('round_of_8', 3, 'winner_r16_5', 'winner_r16_6');
            $stages[] = $this->makeStage('round_of_8', 4, 'winner_r16_7', 'winner_r16_8');
            $stages[] = $this->makeStage('semifinal', 1, 'winner_qf_1', 'winner_qf_2');
            $stages[] = $this->makeStage('semifinal', 2, 'winner_qf_3', 'winner_qf_4');
            $stages[] = $this->makeStage('final', 1, 'winner_sf_1', 'winner_sf_2');
        } elseif ($poolCount === 7) {
            // 7 pool → Juara & Runner-up (14 tim) → 16 Besar (8 laga / 8 kotak, 2 BYE) + 8 Besar (4 laga) + SF + Final
            $stages[] = $this->makeStage('round_of_16', 1, 'pool_A_rank_1', 'bye');
            $stages[] = $this->makeStage('round_of_16', 2, 'pool_C_rank_1', 'pool_D_rank_2');
            $stages[] = $this->makeStage('round_of_16', 3, 'pool_E_rank_1', 'pool_F_rank_2');
            $stages[] = $this->makeStage('round_of_16', 4, 'pool_G_rank_1', 'pool_B_rank_2');
            $stages[] = $this->makeStage('round_of_16', 5, 'pool_B_rank_1', 'bye');
            $stages[] = $this->makeStage('round_of_16', 6, 'pool_D_rank_1', 'pool_C_rank_2');
            $stages[] = $this->makeStage('round_of_16', 7, 'pool_F_rank_1', 'pool_E_rank_2');
            $stages[] = $this->makeStage('round_of_16', 8, 'pool_A_rank_2', 'pool_G_rank_2');
            $stages[] = $this->makeStage('round_of_8', 1, 'winner_r16_1', 'winner_r16_2');
            $stages[] = $this->makeStage('round_of_8', 2, 'winner_r16_3', 'winner_r16_4');
            $stages[] = $this->makeStage('round_of_8', 3, 'winner_r16_5', 'winner_r16_6');
            $stages[] = $this->makeStage('round_of_8', 4, 'winner_r16_7', 'winner_r16_8');
            $stages[] = $this->makeStage('semifinal', 1, 'winner_qf_1', 'winner_qf_2');
            $stages[] = $this->makeStage('semifinal', 2, 'winner_qf_3', 'winner_qf_4');
            $stages[] = $this->makeStage('final', 1, 'winner_sf_1', 'winner_sf_2');
        } elseif ($poolCount === 8) {
            // 8 pool → Juara & Runner-up (16 tim) → 16 Besar (8 laga / 8 kotak murni) + 8 Besar (4 laga) + SF + Final
            $stages[] = $this->makeStage('round_of_16', 1, 'pool_A_rank_1', 'pool_B_rank_2');
            $stages[] = $this->makeStage('round_of_16', 2, 'pool_C_rank_1', 'pool_D_rank_2');
            $stages[] = $this->makeStage('round_of_16', 3, 'pool_E_rank_1', 'pool_F_rank_2');
            $stages[] = $this->makeStage('round_of_16', 4, 'pool_G_rank_1', 'pool_H_rank_2');
            $stages[] = $this->makeStage('round_of_16', 5, 'pool_B_rank_1', 'pool_A_rank_2');
            $stages[] = $this->makeStage('round_of_16', 6, 'pool_D_rank_1', 'pool_C_rank_2');
            $stages[] = $this->makeStage('round_of_16', 7, 'pool_F_rank_1', 'pool_E_rank_2');
            $stages[] = $this->makeStage('round_of_16', 8, 'pool_H_rank_1', 'pool_G_rank_2');
            $stages[] = $this->makeStage('round_of_8', 1, 'winner_r16_1', 'winner_r16_2');
            $stages[] = $this->makeStage('round_of_8', 2, 'winner_r16_3', 'winner_r16_4');
            $stages[] = $this->makeStage('round_of_8', 3, 'winner_r16_5', 'winner_r16_6');
            $stages[] = $this->makeStage('round_of_8', 4, 'winner_r16_7', 'winner_r16_8');
            $stages[] = $this->makeStage('semifinal', 1, 'winner_qf_1', 'winner_qf_2');
            $stages[] = $this->makeStage('semifinal', 2, 'winner_qf_3', 'winner_qf_4');
            $stages[] = $this->makeStage('final', 1, 'winner_sf_1', 'winner_sf_2');
        } else {
            // 9 s/d 16 pool → Juara & Runner-up (18 s/d 32 tim)
            // Babak 32 Besar (16 laga / 16 kotak dengan 32 - 2*poolCount BYE) + 16 Besar + 8 Besar + SF + Final
            $totalTeams = $poolCount * 2;
            $byeCount   = max(0, 32 - $totalTeams);
            $byePositions = [1, 9, 5, 13, 3, 11, 7, 15, 2, 10, 6, 14, 4, 12, 8, 16];
            $slotsWithBye = array_slice($byePositions, 0, $byeCount);

            // Pool pairs
            for ($pos = 1; $pos <= 16; $pos++) {
                $poolIdx = ($pos - 1) % $poolCount;
                $pLetter = $pools[$poolIdx];
                $oppIdx  = ($poolIdx + 1) % $poolCount;
                $oppLetter = $pools[$oppIdx];

                $home = "pool_{$pLetter}_rank_1";
                if (in_array($pos, $slotsWithBye)) {
                    $away = 'bye';
                } else {
                    $away = "pool_{$oppLetter}_rank_2";
                }
                $stages[] = $this->makeStage('round_of_32', $pos, $home, $away);
            }

            // 16 Besar (8 laga)
            for ($p = 1; $p <= 8; $p++) {
                $h = ($p * 2) - 1;
                $a = $p * 2;
                $stages[] = $this->makeStage('round_of_16', $p, "winner_r32_{$h}", "winner_r32_{$a}");
            }

            // 8 Besar (QF 1..4)
            $stages[] = $this->makeStage('round_of_8', 1, 'winner_r16_1', 'winner_r16_2');
            $stages[] = $this->makeStage('round_of_8', 2, 'winner_r16_3', 'winner_r16_4');
            $stages[] = $this->makeStage('round_of_8', 3, 'winner_r16_5', 'winner_r16_6');
            $stages[] = $this->makeStage('round_of_8', 4, 'winner_r16_7', 'winner_r16_8');

            // Semifinal 1..2
            $stages[] = $this->makeStage('semifinal', 1, 'winner_qf_1', 'winner_qf_2');
            $stages[] = $this->makeStage('semifinal', 2, 'winner_qf_3', 'winner_qf_4');

            // Final
            $stages[] = $this->makeStage('final', 1, 'winner_sf_1', 'winner_sf_2');
        }

        return $stages;
    }

    protected function makeStage(string $stage, int $position, string $home, string $away, bool $isOdd = false): array
    {
        return [
            'bracket_stage'    => $stage,
            'bracket_position' => $position,
            'home_source'      => $home,
            'away_source'      => $away,
            'is_odd_pool'      => $isOdd,
        ];
    }
}
