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
            'pools.teams',
            'pools.standings' => fn($q) => $q->with('team')->orderBy('rank'),
        ]);

        return Inertia::render('Pool/Index', [
            'tournament' => $tournament,
        ]);
    }

    /**
     * Auto-generate pools (random distribution).
     */
    public function generateRandom(Request $request, Tournament $tournament)
    {
        $validated = $request->validate([
            'pool_count' => 'required|integer|min:2|max:8',
        ]);

        // Remove existing pools
        $tournament->pools()->delete();

        $teams = $tournament->teams->shuffle();
        $poolCount = $validated['pool_count'];
        $poolLabels = range('A', chr(64 + $poolCount));

        // Create pools
        $pools = [];
        foreach ($poolLabels as $label) {
            $pools[] = Pool::create([
                'tournament_id' => $tournament->id,
                'name' => $label,
            ]);
        }

        // Distribute teams round-robin style
        foreach ($teams as $index => $team) {
            $pool = $pools[$index % $poolCount];
            $pool->teams()->attach($team->id);

            // Initialize standing
            PoolStanding::create([
                'pool_id' => $pool->id,
                'team_id' => $team->id,
            ]);
        }

        // Generate round-robin matches for each pool
        $this->generatePoolMatches($tournament, $pools);

        return redirect()->route('pools.index', $tournament)
            ->with('success', 'Pool berhasil di-generate secara acak!');
    }

    /**
     * Manually assign a team to a pool.
     */
    public function assignTeam(Request $request, Pool $pool)
    {
        $validated = $request->validate([
            'team_id' => 'required|exists:teams,id',
        ]);

        $pool->teams()->syncWithoutDetaching([$validated['team_id']]);

        PoolStanding::firstOrCreate([
            'pool_id' => $pool->id,
            'team_id' => $validated['team_id'],
        ]);

        return back()->with('success', 'Tim berhasil ditambahkan ke pool!');
    }

    /**
     * Remove a team from a pool.
     */
    public function removeTeam(Pool $pool, int $teamId)
    {
        $pool->teams()->detach($teamId);
        PoolStanding::where('pool_id', $pool->id)->where('team_id', $teamId)->delete();

        return back()->with('success', 'Tim berhasil dihapus dari pool!');
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
     * Generate round-robin matches for pools.
     */
    protected function generatePoolMatches(Tournament $tournament, array $pools): void
    {
        foreach ($pools as $pool) {
            $teams = $pool->teams->values();
            $teamCount = $teams->count();

            // Round-robin: each pair plays once
            for ($i = 0; $i < $teamCount; $i++) {
                for ($j = $i + 1; $j < $teamCount; $j++) {
                    Match_::create([
                        'tournament_id' => $tournament->id,
                        'pool_id' => $pool->id,
                        'stage' => 'pool',
                        'home_team_id' => $teams[$i]->id,
                        'away_team_id' => $teams[$j]->id,
                        'status' => 'scheduled',
                    ]);
                }
            }
        }
    }
}
