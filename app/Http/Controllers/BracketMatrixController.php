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
        $tournament->load(['modes', 'bracketMatrices']);

        // Siapkan data: untuk setiap mode aktif, tampilkan matrix yang sudah ada
        $activeModes = $tournament->modes()
            ->where('is_active', true)
            ->get();

        $matrices = BracketMatrix::where('tournament_id', $tournament->id)
            ->get()
            ->groupBy('match_mode');

        // Buat structure bracket stages per jumlah pool
        $stageOptions = [];
        foreach ($activeModes as $mode) {
            $poolCount   = $mode->pool_count;
            $stageOptions[$mode->match_mode] = $this->getBracketStages($poolCount);
        }

        return Inertia::render('Tournament/MasterSchedule/BracketMatrix', [
            'tournament'   => $tournament,
            'activeModes'  => $activeModes,
            'matrices'     => $matrices,
            'stageOptions' => $stageOptions,
        ]);
    }

    /**
     * Simpan atau update konfigurasi bracket matrix.
     * Menerima array konfigurasi untuk semua mode sekaligus.
     */
    public function store(Request $request, Tournament $tournament)
    {
        $validated = $request->validate([
            'matrices'                        => 'required|array',
            'matrices.*.match_mode'           => 'required|in:regu,double,quadrant,team_regu,team_double',
            'matrices.*.bracket_stage'        => 'required|in:round_of_16,round_of_8,semifinal,third_place,final',
            'matrices.*.bracket_position'     => 'required|integer|min:1',
            'matrices.*.home_source'          => 'required|string|max:60',
            'matrices.*.away_source'          => 'required|string|max:60',
        ]);

        // Hapus konfigurasi lama untuk turnamen ini
        BracketMatrix::where('tournament_id', $tournament->id)->delete();

        // Insert konfigurasi baru
        foreach ($validated['matrices'] as $matrixData) {
            BracketMatrix::create([
                'tournament_id'    => $tournament->id,
                'match_mode'       => $matrixData['match_mode'],
                'bracket_stage'    => $matrixData['bracket_stage'],
                'bracket_position' => $matrixData['bracket_position'],
                'home_source'      => $matrixData['home_source'],
                'away_source'      => $matrixData['away_source'],
            ]);
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
     * 2 pool  → SF (4 tim) + Final
     * 3 pool  → Bye/Wildcard + SF + Final (pool ganjil)
     * 4 pool  → QF (8 tim) + SF + Final
     * 6 pool  → Round of 16 (12 tim, ada bye) + QF + SF + Final
     * 8 pool  → Round of 16 (16 tim) + QF + SF + Final
     *
     * @return array Daftar stage dengan posisi dan sumber tim yang bisa dipilih
     */
    protected function getBracketStages(int $poolCount): array
    {
        $stages = [];
        $pools  = range('A', chr(64 + max(1, $poolCount)));

        if ($poolCount <= 1) {
            // 1 pool → Langsung ke Final (Juara 1 Pool A vs Runner-up Pool A / Bracket A vs Bracket B)
            $stages[] = $this->makeStage('final', 1, 'pool_A_rank_1', 'pool_A_rank_2');
        } elseif ($poolCount === 2) {
            // 2 pool → Langsung ke Semifinal + Final
            $stages[] = $this->makeStage('semifinal', 1, 'pool_A_rank_1', 'pool_B_rank_2');
            $stages[] = $this->makeStage('semifinal', 2, 'pool_B_rank_1', 'pool_A_rank_2');
            $stages[] = $this->makeStage('final', 1, 'winner_sf_1', 'winner_sf_2');
        } elseif ($poolCount === 3) {
            // 3 pool (ganjil) → Wildcard round terlebih dahulu
            $stages[] = $this->makeStage('round_of_8', 1, 'pool_A_rank_1', 'bye', isOdd: true);
            $stages[] = $this->makeStage('round_of_8', 2, 'pool_B_rank_1', 'wildcard_1', isOdd: true);
            $stages[] = $this->makeStage('round_of_8', 3, 'pool_C_rank_1', 'wildcard_2', isOdd: true);
            $stages[] = $this->makeStage('semifinal', 1, 'winner_pos_1', 'winner_pos_2');
            $stages[] = $this->makeStage('semifinal', 2, 'winner_pos_3', 'best_runner_up');
            $stages[] = $this->makeStage('final', 1, 'winner_sf_1', 'winner_sf_2');
        } elseif ($poolCount === 4) {
            // 4 pool → Quarterfinal + Semifinal + Final
            $stages[] = $this->makeStage('round_of_8', 1, 'pool_A_rank_1', 'pool_B_rank_2');
            $stages[] = $this->makeStage('round_of_8', 2, 'pool_C_rank_1', 'pool_D_rank_2');
            $stages[] = $this->makeStage('round_of_8', 3, 'pool_B_rank_1', 'pool_A_rank_2');
            $stages[] = $this->makeStage('round_of_8', 4, 'pool_D_rank_1', 'pool_C_rank_2');
            $stages[] = $this->makeStage('semifinal', 1, 'winner_qf_1', 'winner_qf_2');
            $stages[] = $this->makeStage('semifinal', 2, 'winner_qf_3', 'winner_qf_4');
            $stages[] = $this->makeStage('final', 1, 'winner_sf_1', 'winner_sf_2');
        } else {
            // 6 atau 8 pool → Round of 16 + QF + SF + Final
            for ($i = 1; $i <= min($poolCount, 8); $i++) {
                $homePool = $pools[$i - 1];
                $awayPool = $pools[$poolCount - $i];
                $stages[] = $this->makeStage('round_of_16', $i, "pool_{$homePool}_rank_1", "pool_{$awayPool}_rank_2");
            }
            for ($i = 1; $i <= 4; $i++) {
                $stages[] = $this->makeStage('round_of_8', $i, "winner_r16_pos_{$i}", "winner_r16_pos_" . ($i + 4));
            }
            for ($i = 1; $i <= 2; $i++) {
                $stages[] = $this->makeStage('semifinal', $i, "winner_qf_pos_{$i}", "winner_qf_pos_" . ($i + 2));
            }
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
