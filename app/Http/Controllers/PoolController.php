<?php

namespace App\Http\Controllers;

use App\Models\Match_;
use App\Models\Pool;
use App\Models\PoolStanding;
use App\Models\Tournament;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PoolController extends Controller
{
    /**
     * Show pool management for a tournament.
     */
    public function index(Tournament $tournament): Response
    {
        $tournament->load([
            'teams',
            'modes',
            'superTeams.members',
            'pools.teams',
            'pools.superTeams.members',
            'pools.standings' => fn($q) => $q->with(['team', 'superTeam'])->orderBy('rank'),
        ]);

        return Inertia::render('Pool/Index', [
            'tournament' => $tournament,
        ]);
    }

    /**
     * Create a custom pool manually for a specific match_mode.
     */
    public function createCustom(Request $request, Tournament $tournament)
    {
        $validated = $request->validate([
            'name'         => 'required|string|max:20',
            'bracket_name' => 'nullable|string|max:50',
            'match_mode'   => 'required|in:regu,double,quadrant,team_regu,team_double',
        ]);

        $name = strtoupper(trim($validated['name']));
        $bracketName = $validated['bracket_name'] ? trim($validated['bracket_name']) : null;

        $exists = Pool::where('tournament_id', $tournament->id)
            ->where('match_mode', $validated['match_mode'])
            ->where('name', $name)
            ->where('bracket_name', $bracketName)
            ->exists();

        if ($exists) {
            return back()->withErrors(['name' => "Pool {$name}" . ($bracketName ? " di {$bracketName}" : "") . " sudah ada untuk mode ini!"]);
        }

        Pool::create([
            'tournament_id' => $tournament->id,
            'name'          => $name,
            'bracket_name'  => $bracketName,
            'match_mode'    => $validated['match_mode'],
        ]);

        return back()->with('success', "Pool \"{$name}\"" . ($bracketName ? " ({$bracketName})" : "") . " untuk mode {$validated['match_mode']} berhasil dibuat!");
    }

    /**
     * Auto-generate custom multi-bracket pools with custom pool counts per bracket.
     * e.g.
     * brackets: [
     *   {"name": "Bracket 1", "pool_count": 2},
     *   {"name": "Bracket 2", "pool_count": 3}
     * ]
     */
    public function generateMultiBracket(Request $request, Tournament $tournament)
    {
        $validated = $request->validate([
            'match_mode'            => 'required|in:regu,double,quadrant,team_regu,team_double',
            'brackets'              => 'required|array|min:1|max:6',
            'brackets.*.name'       => 'required|string|max:50',
            'brackets.*.pool_count' => 'required|integer|min:1|max:8',
        ]);

        $matchMode = $validated['match_mode'];
        $bracketsConfig = $validated['brackets'];

        // Hapus pool lama KHUSUS mode ini
        $tournament->pools()->where(function ($q) use ($matchMode) {
            $q->where('match_mode', $matchMode);
            if ($matchMode === 'regu') {
                $q->orWhereNull('match_mode');
            }
        })->delete();

        $allCreatedPools = [];
        $bracketIndex = 1;
        $totalPoolsCreated = 0;

        foreach ($bracketsConfig as $bCfg) {
            $bracketName = trim($bCfg['name']) ?: "Bracket {$bracketIndex}";
            $poolCount = (int) $bCfg['pool_count'];
            $poolLabels = range('A', chr(64 + $poolCount));

            foreach ($poolLabels as $label) {
                $pool = Pool::create([
                    'tournament_id'  => $tournament->id,
                    'name'           => $label,
                    'bracket_name'   => $bracketName,
                    'bracket_number' => $bracketIndex,
                    'match_mode'     => $matchMode,
                ]);
                $allCreatedPools[] = $pool;
                $totalPoolsCreated++;
            }
            $bracketIndex++;
        }

        $isTeamMode = in_array($matchMode, ['team_regu', 'team_double']);

        if ($isTeamMode) {
            $superTeams = $tournament->superTeams()
                ->where('match_mode', $matchMode)
                ->get()
                ->shuffle();

            foreach ($superTeams as $index => $st) {
                $pool = $allCreatedPools[$index % count($allCreatedPools)];
                $st->update(['pool_id' => $pool->id]);

                PoolStanding::create([
                    'pool_id'       => $pool->id,
                    'super_team_id' => $st->id,
                ]);
            }
        } else {
            $superTeamMemberIds = \Illuminate\Support\Facades\DB::table('super_team_members')
                ->join('super_teams', 'super_teams.id', '=', 'super_team_members.super_team_id')
                ->where('super_teams.tournament_id', $tournament->id)
                ->pluck('super_team_members.team_id')
                ->toArray();

            $teams = $tournament->teams
                ->reject(fn($team) => in_array($team->id, $superTeamMemberIds))
                ->filter(function ($team) use ($matchMode) {
                    $nameLower = strtolower($team->name);
                    if ($matchMode === 'regu' && str_contains($nameLower, 'double')) return false;
                    if ($matchMode === 'double' && str_contains($nameLower, 'regu') && !str_contains($nameLower, 'double')) return false;
                    if ($matchMode === 'quadrant' && (str_contains($nameLower, 'regu') || str_contains($nameLower, 'double'))) return false;
                    return true;
                })
                ->shuffle();

            foreach ($teams as $index => $team) {
                $pool = $allCreatedPools[$index % count($allCreatedPools)];
                $pool->teams()->attach($team->id);

                PoolStanding::create([
                    'pool_id' => $pool->id,
                    'team_id' => $team->id,
                ]);
            }
        }

        // Update pool_count pada tournament_modes
        $tournament->modes()->where('match_mode', $matchMode)->update(['pool_count' => $totalPoolsCreated]);
        $this->syncMultiBracketMatrix($tournament, $matchMode, $bracketsConfig);

        return redirect()->route('pools.index', $tournament)
            ->with('success', count($bracketsConfig) . " Bracket (" . $totalPoolsCreated . " Pool) untuk mode \"{$matchMode}\" berhasil dibuat!");
    }

    /**
     * Auto-sync Bracket Matrix untuk struktur multi-bracket.
     */
    public function syncMultiBracketMatrix(Tournament $tournament, string $matchMode, array $bracketsConfig): void
    {
        \App\Models\BracketMatrix::where('tournament_id', $tournament->id)
            ->where('match_mode', $matchMode)
            ->delete();

        $bracketPosition = 1;
        $bracketNum = 1;

        foreach ($bracketsConfig as $bCfg) {
            $poolCount = (int) $bCfg['pool_count'];

            if ($poolCount === 1) {
                // 1 Pool per bracket -> Final (A1 vs A2)
                \App\Models\BracketMatrix::create([
                    'tournament_id'    => $tournament->id,
                    'match_mode'       => $matchMode,
                    'bracket_stage'    => 'final',
                    'bracket_position' => $bracketPosition++,
                    'home_source'      => "pool_A_rank_1",
                    'away_source'      => "pool_A_rank_2",
                ]);
            } elseif ($poolCount === 2) {
                // 2 Pool per bracket -> Direct Final (Juara Pool A vs Juara Pool B)
                \App\Models\BracketMatrix::create([
                    'tournament_id'    => $tournament->id,
                    'match_mode'       => $matchMode,
                    'bracket_stage'    => 'final',
                    'bracket_position' => $bracketPosition++,
                    'home_source'      => "pool_A_rank_1",
                    'away_source'      => "pool_B_rank_1",
                ]);
            } else {
                // > 2 Pool per bracket -> Semifinal + Final
                \App\Models\BracketMatrix::create([
                    'tournament_id'    => $tournament->id,
                    'match_mode'       => $matchMode,
                    'bracket_stage'    => 'semifinal',
                    'bracket_position' => $bracketPosition,
                    'home_source'      => "pool_A_rank_1",
                    'away_source'      => "pool_B_rank_2",
                ]);
                \App\Models\BracketMatrix::create([
                    'tournament_id'    => $tournament->id,
                    'match_mode'       => $matchMode,
                    'bracket_stage'    => 'semifinal',
                    'bracket_position' => $bracketPosition + 1,
                    'home_source'      => "pool_B_rank_1",
                    'away_source'      => "pool_A_rank_2",
                ]);
                \App\Models\BracketMatrix::create([
                    'tournament_id'    => $tournament->id,
                    'match_mode'       => $matchMode,
                    'bracket_stage'    => 'final',
                    'bracket_position' => $bracketPosition,
                    'home_source'      => 'winner_sf_1',
                    'away_source'      => 'winner_sf_2',
                ]);
                $bracketPosition += 2;
            }
            $bracketNum++;
        }
    }

    /**
     * Auto-generate pools (random distribution) per mode.
     */
    public function generateRandom(Request $request, Tournament $tournament)
    {
        $validated = $request->validate([
            'pool_count' => 'required|integer|min:1|max:8',
            'match_mode' => 'required|in:regu,double,quadrant,team_regu,team_double',
        ]);

        $matchMode = $validated['match_mode'];
        $poolCount = $validated['pool_count'];

        // Hapus pool lama KHUSUS mode ini (termasuk yang match_mode IS NULL jika mode regu)
        $tournament->pools()->where(function ($q) use ($matchMode) {
            $q->where('match_mode', $matchMode);
            if ($matchMode === 'regu') {
                $q->orWhereNull('match_mode');
            }
        })->delete();

        $poolLabels = range('A', chr(64 + $poolCount));

        // Buat pools baru untuk mode ini
        $pools = [];
        foreach ($poolLabels as $label) {
            $pools[] = Pool::create([
                'tournament_id' => $tournament->id,
                'name'          => $label,
                'match_mode'    => $matchMode,
            ]);
        }

        $isTeamMode = in_array($matchMode, ['team_regu', 'team_double']);

        if ($isTeamMode) {
            // Distribusi Super Teams per mode
            $superTeams = $tournament->superTeams()
                ->where('match_mode', $matchMode)
                ->get()
                ->shuffle();

            foreach ($superTeams as $index => $st) {
                $pool = $pools[$index % $poolCount];
                $st->update(['pool_id' => $pool->id]);

                // Initialize standing
                PoolStanding::create([
                    'pool_id'       => $pool->id,
                    'super_team_id' => $st->id,
                ]);
            }
        } else {
            // Filter tim agar sub-tim anggota SuperTeam DI-LOCK dan tim mode lain (Regu vs Double) tidak bercampur
            $superTeamMemberIds = \Illuminate\Support\Facades\DB::table('super_team_members')
                ->join('super_teams', 'super_teams.id', '=', 'super_team_members.super_team_id')
                ->where('super_teams.tournament_id', $tournament->id)
                ->pluck('super_team_members.team_id')
                ->toArray();

            $teams = $tournament->teams
                ->reject(fn($team) => in_array($team->id, $superTeamMemberIds))
                ->filter(function ($team) use ($matchMode) {
                    $nameLower = strtolower($team->name);
                    if ($matchMode === 'regu' && str_contains($nameLower, 'double')) return false;
                    if ($matchMode === 'double' && str_contains($nameLower, 'regu') && !str_contains($nameLower, 'double')) return false;
                    if ($matchMode === 'quadrant' && (str_contains($nameLower, 'regu') || str_contains($nameLower, 'double'))) return false;
                    return true;
                })
                ->shuffle();

            foreach ($teams as $index => $team) {
                $pool = $pools[$index % $poolCount];
                $pool->teams()->attach($team->id);

                // Initialize standing
                PoolStanding::create([
                    'pool_id' => $pool->id,
                    'team_id' => $team->id,
                ]);
            }
        }

        // Update sync pool_count pada konfigurasi mode turnamen & auto-generate Bracket Matrix sesuai jumlah pool
        $tournament->modes()->where('match_mode', $matchMode)->update(['pool_count' => $poolCount]);
        $this->syncBracketMatrixForMode($tournament, $matchMode, $poolCount);

        return redirect()->route('pools.index', $tournament)
            ->with('success', "Pool untuk mode \"{$matchMode}\" berhasil di-generate secara acak ({$poolCount} Pool)! Bagan Gugur (Bracket Matrix) telah disesuaikan.");
    }

    /**
     * Auto-sync Bracket Matrix berdasarkan jumlah pool mode tanding.
     * 1 Pool -> Final (1 Laga: A1 vs A2)
     * 2 Pool -> Semifinal (2 Laga: A1 vs B2, B1 vs A2) + Final (1 Laga)
     * 4 Pool -> Quarterfinal (4 Laga) + Semifinal (2 Laga) + Final (1 Laga)
     */
    public function syncBracketMatrixForMode(Tournament $tournament, string $matchMode, int $poolCount): void
    {
        \App\Models\BracketMatrix::where('tournament_id', $tournament->id)
            ->where('match_mode', $matchMode)
            ->delete();

        if ($poolCount === 1) {
            // 1 Pool → Langsung ke Final (A1 vs A2 / Top 2)
            \App\Models\BracketMatrix::create([
                'tournament_id' => $tournament->id, 'match_mode' => $matchMode,
                'bracket_stage' => 'final', 'bracket_position' => 1,
                'home_source'   => 'pool_A_rank_1', 'away_source' => 'pool_A_rank_2',
            ]);
        } elseif ($poolCount === 2) {
            // 2 Pool → Langsung ke Semifinal (A1 vs B2, B1 vs A2)
            \App\Models\BracketMatrix::create([
                'tournament_id' => $tournament->id, 'match_mode' => $matchMode,
                'bracket_stage' => 'semifinal', 'bracket_position' => 1,
                'home_source'   => 'pool_A_rank_1', 'away_source' => 'pool_B_rank_2',
            ]);
            \App\Models\BracketMatrix::create([
                'tournament_id' => $tournament->id, 'match_mode' => $matchMode,
                'bracket_stage' => 'semifinal', 'bracket_position' => 2,
                'home_source'   => 'pool_B_rank_1', 'away_source' => 'pool_A_rank_2',
            ]);
            \App\Models\BracketMatrix::create([
                'tournament_id' => $tournament->id, 'match_mode' => $matchMode,
                'bracket_stage' => 'final', 'bracket_position' => 1,
                'home_source'   => 'winner_sf_1', 'away_source' => 'winner_sf_2',
            ]);
        } else {
            // 4 Pool → Quarterfinal (A1 vs B2, C1 vs D2, B1 vs A2, D1 vs C2)
            \App\Models\BracketMatrix::create([
                'tournament_id' => $tournament->id, 'match_mode' => $matchMode,
                'bracket_stage' => 'round_of_8', 'bracket_position' => 1,
                'home_source'   => 'pool_A_rank_1', 'away_source' => 'pool_B_rank_2',
            ]);
            \App\Models\BracketMatrix::create([
                'tournament_id' => $tournament->id, 'match_mode' => $matchMode,
                'bracket_stage' => 'round_of_8', 'bracket_position' => 2,
                'home_source'   => 'pool_C_rank_1', 'away_source' => 'pool_D_rank_2',
            ]);
            \App\Models\BracketMatrix::create([
                'tournament_id' => $tournament->id, 'match_mode' => $matchMode,
                'bracket_stage' => 'round_of_8', 'bracket_position' => 3,
                'home_source'   => 'pool_B_rank_1', 'away_source' => 'pool_A_rank_2',
            ]);
            \App\Models\BracketMatrix::create([
                'tournament_id' => $tournament->id, 'match_mode' => $matchMode,
                'bracket_stage' => 'round_of_8', 'bracket_position' => 4,
                'home_source'   => 'pool_D_rank_1', 'away_source' => 'pool_C_rank_2',
            ]);

            \App\Models\BracketMatrix::create([
                'tournament_id' => $tournament->id, 'match_mode' => $matchMode,
                'bracket_stage' => 'semifinal', 'bracket_position' => 1,
                'home_source'   => 'winner_qf_1', 'away_source' => 'winner_qf_2',
            ]);
            \App\Models\BracketMatrix::create([
                'tournament_id' => $tournament->id, 'match_mode' => $matchMode,
                'bracket_stage' => 'semifinal', 'bracket_position' => 2,
                'home_source'   => 'winner_qf_3', 'away_source' => 'winner_qf_4',
            ]);
            \App\Models\BracketMatrix::create([
                'tournament_id' => $tournament->id, 'match_mode' => $matchMode,
                'bracket_stage' => 'final', 'bracket_position' => 1,
                'home_source'   => 'winner_sf_1', 'away_source' => 'winner_sf_2',
            ]);
        }
    }

    /**
     * Manually assign a team or super team to a pool.
     */
    public function assignTeam(Request $request, Pool $pool)
    {
        $isTeamMode = in_array($pool->match_mode, ['team_regu', 'team_double']);

        if ($isTeamMode) {
            $validated = $request->validate([
                'super_team_id' => 'required|exists:super_teams,id',
            ]);

            \App\Models\SuperTeam::where('id', $validated['super_team_id'])
                ->update(['pool_id' => $pool->id]);

            PoolStanding::firstOrCreate([
                'pool_id'       => $pool->id,
                'super_team_id' => $validated['super_team_id'],
            ]);
        } else {
            $validated = $request->validate([
                'team_id' => 'required|exists:teams,id',
            ]);

            $pool->teams()->syncWithoutDetaching([$validated['team_id']]);

            PoolStanding::firstOrCreate([
                'pool_id' => $pool->id,
                'team_id' => $validated['team_id'],
            ]);
        }

        return back()->with('success', 'Kontestan berhasil ditambahkan ke pool!');
    }

    /**
     * Remove a team or super team from a pool.
     */
    public function removeTeam(Pool $pool, int $id)
    {
        $isTeamMode = in_array($pool->match_mode, ['team_regu', 'team_double']);

        if ($isTeamMode) {
            \App\Models\SuperTeam::where('id', $id)->update(['pool_id' => null]);
            PoolStanding::where('pool_id', $pool->id)->where('super_team_id', $id)->delete();
        } else {
            $pool->teams()->detach($id);
            PoolStanding::where('pool_id', $pool->id)->where('team_id', $id)->delete();
        }

        return back()->with('success', 'Kontestan berhasil dihapus dari pool!');
    }

    /**
     * Delete a pool completely.
     */
    public function destroy(Pool $pool)
    {
        $pool->teams()->detach();
        $pool->standings()->delete();
        \App\Models\SuperTeam::where('pool_id', $pool->id)->update(['pool_id' => null]);
        $pool->delete();

        return back()->with('success', "Pool \"{$pool->name}\" berhasil dihapus!");
    }

    /**
     * Generate round-robin matches from manually arranged pools.
     * Deletes existing pool-stage matches for this tournament first.
     */
    public function generateMatches(Tournament $tournament)
    {
        $pools = $tournament->pools()->with('teams')->get();

        if ($pools->isEmpty()) {
            return back()->withErrors(['pools' => 'Belum ada pool yang dibuat!']);
        }

        // Check that at least one pool has >= 2 teams
        $hasEnoughTeams = $pools->contains(fn($pool) => $pool->teams->count() >= 2);
        if (!$hasEnoughTeams) {
            return back()->withErrors(['pools' => 'Setiap pool harus memiliki minimal 2 tim untuk generate pertandingan!']);
        }

        // Delete existing pool-stage matches for this tournament
        Match_::where('tournament_id', $tournament->id)
            ->where('stage', 'pool')
            ->where('status', 'scheduled')
            ->delete();

        // Generate round-robin matches for each pool
        $this->generatePoolMatches($tournament, $pools->all());

        return redirect()->route('pools.index', $tournament)
            ->with('success', 'Pertandingan pool (round-robin) berhasil di-generate!');
    }

    /**
     * Generate round-robin matches for pools (mode-aware).
     */
    protected function generatePoolMatches(Tournament $tournament, array $pools): void
    {
        foreach ($pools as $pool) {
            $matchMode  = $pool->match_mode ?: 'regu';
            $isTeamMode = in_array($matchMode, ['team_regu', 'team_double']);

            if ($isTeamMode) {
                $superTeams = $pool->superTeams->values();
                $count      = $superTeams->count();

                for ($i = 0; $i < $count; $i++) {
                    for ($j = $i + 1; $j < $count; $j++) {
                        Match_::create([
                            'tournament_id'      => $tournament->id,
                            'pool_id'            => $pool->id,
                            'match_mode'         => $matchMode,
                            'stage'              => 'pool',
                            'home_super_team_id' => $superTeams[$i]->id,
                            'away_super_team_id' => $superTeams[$j]->id,
                            'slot_span'          => 3,
                            'status'             => 'scheduled',
                        ]);
                    }
                }
            } else {
                $teams = $pool->teams->values();
                $count = $teams->count();

                for ($i = 0; $i < $count; $i++) {
                    for ($j = $i + 1; $j < $count; $j++) {
                        Match_::create([
                            'tournament_id' => $tournament->id,
                            'pool_id'       => $pool->id,
                            'match_mode'    => $matchMode,
                            'stage'         => 'pool',
                            'home_team_id'  => $teams[$i]->id,
                            'away_team_id'  => $teams[$j]->id,
                            'slot_span'     => 1,
                            'status'        => 'scheduled',
                        ]);
                    }
                }
            }
        }
    }
}
