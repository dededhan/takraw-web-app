<?php

namespace App\Http\Controllers;

use App\Models\Match_;
use App\Models\MatchSet;
use App\Models\SetStat;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ScoringController extends Controller
{
    /**
     * Show the live scoring interface for a match.
     */
    public function show(Match_ $match): Response
    {
        $match->load([
            'homeTeam.athletes',
            'awayTeam.athletes',
            'homeSuperTeam.members.athletes',
            'awaySuperTeam.members.athletes',
            'tournament',
            'court',
            'timeSlot',
            'sets.stats.athlete',
        ]);

        return Inertia::render('Scoring/Live', [
            'match' => $match,
        ]);
    }

    /**
     * Setup match before starting (referee fills court number, max sets).
     */
    public function setup(Request $request, Match_ $match)
    {
        $validated = $request->validate([
            'court_number' => 'required|integer|min:1',
            'max_sets'     => 'required|integer|min:1|max:9',
        ]);

        $totalSets = $match->isTeamMode() ? 9 : $validated['max_sets'];

        $match->update([
            'court_number' => $validated['court_number'],
            'max_sets'     => $totalSets,
            'status'       => 'setup',
        ]);

        // Pre-create sets (9 sets for Team mode: 3 sets x 3 sub-regu matches)
        for ($i = 1; $i <= $totalSets; $i++) {
            MatchSet::firstOrCreate([
                'match_id'   => $match->id,
                'set_number' => $i,
            ]);
        }

        return back()->with('success', 'Setup pertandingan berhasil!');
    }

    /**
     * Start the match — move status to live.
     */
    public function start(Match_ $match)
    {
        $match->update([
            'status' => 'live',
            'started_at' => now(),
        ]);

        // Start first set
        $firstSet = $match->sets()->where('set_number', 1)->first();
        if ($firstSet) {
            $firstSet->update([
                'status' => 'live',
                'started_at' => now(),
            ]);

            // Initialize stats for all athletes in both teams
            $this->initializeSetStats($firstSet, $match);
        }

        return back()->with('success', 'Pertandingan dimulai!');
    }

    /**
     * Update a stat value (increment or decrement).
     * This is the core real-time scoring endpoint.
     */
    public function updateStat(Request $request, Match_ $match)
    {
        $validated = $request->validate([
            'match_set_id' => 'required|exists:match_sets,id',
            'athlete_id' => 'required|exists:athletes,id',
            'stat' => 'required|in:' . implode(',', SetStat::STAT_COLUMNS),
            'action' => 'required|in:increment,decrement',
        ]);

        $stat = SetStat::where('match_set_id', $validated['match_set_id'])
            ->where('athlete_id', $validated['athlete_id'])
            ->first();

        if (!$stat) {
            // Auto-create if not exists
            $stat = SetStat::create([
                'match_set_id' => $validated['match_set_id'],
                'athlete_id' => $validated['athlete_id'],
                'team_id' => $request->input('team_id'),
            ]);
        }

        $column = $validated['stat'];
        if ($validated['action'] === 'increment') {
            $stat->increment($column);
        } else {
            if ($stat->$column > 0) {
                $stat->decrement($column);
            }
        }

        return response()->json([
            'stat' => $stat->fresh(),
        ]);
    }

    /**
     * Update the main score for a set.
     */
    public function updateScore(Request $request, Match_ $match)
    {
        $validated = $request->validate([
            'match_set_id' => 'required|exists:match_sets,id',
            'side' => 'required|in:home,away',
            'action' => 'required|in:increment,decrement',
        ]);

        $set = MatchSet::findOrFail($validated['match_set_id']);
        $column = $validated['side'] === 'home' ? 'home_score' : 'away_score';

        if ($validated['action'] === 'increment') {
            $set->increment($column);
        } else {
            if ($set->$column > 0) {
                $set->decrement($column);
            }
        }

        return response()->json([
            'set' => $set->fresh(),
        ]);
    }

    /**
     * Finish a set and start the next one if applicable.
     */
    public function finishSet(Request $request, Match_ $match)
    {
        $validated = $request->validate([
            'match_set_id' => 'required|exists:match_sets,id',
        ]);

        $set = MatchSet::findOrFail($validated['match_set_id']);

        // Determine winner
        $winnerId = $set->home_score > $set->away_score
            ? $match->home_team_id
            : $match->away_team_id;

        $set->update([
            'status' => 'finished',
            'finished_at' => now(),
            'winner_team_id' => $winnerId,
        ]);

        // Check if match is over (best of N)
        $setsWonHome = $match->sets()->where('winner_team_id', $match->home_team_id)->count();
        $setsWonAway = $match->sets()->where('winner_team_id', $match->away_team_id)->count();
        $setsToWin = ceil($match->max_sets / 2);

        if ($setsWonHome >= $setsToWin || $setsWonAway >= $setsToWin) {
            // Match finished
            $matchWinner = $setsWonHome >= $setsToWin ? $match->home_team_id : $match->away_team_id;
            $match->update([
                'status' => 'finished',
                'finished_at' => now(),
                'winner_team_id' => $matchWinner,
            ]);

            // Recalculate standings if it's a pool match
            if ($match->pool_id) {
                \App\Models\PoolStanding::recalculate($match->pool_id);
            }

            // If bracket match, advance winner to next match
            if ($match->next_match_id) {
                $nextMatch = Match_::find($match->next_match_id);
                if ($nextMatch) {
                    if ($match->home_super_team_id || $match->away_super_team_id) {
                        $winnerSuperTeamId = $setsWonHome >= $setsToWin ? $match->home_super_team_id : $match->away_super_team_id;
                        if (!$nextMatch->home_super_team_id) {
                            $nextMatch->update(['home_super_team_id' => $winnerSuperTeamId]);
                        } else {
                            $nextMatch->update(['away_super_team_id' => $winnerSuperTeamId]);
                        }
                    } else {
                        if (!$nextMatch->home_team_id) {
                            $nextMatch->update(['home_team_id' => $matchWinner]);
                        } else {
                            $nextMatch->update(['away_team_id' => $matchWinner]);
                        }
                    }
                }
            }

            return response()->json([
                'matchFinished' => true,
                'winner' => $matchWinner,
                'match' => $match->fresh()->load(['homeTeam', 'awayTeam', 'sets']),
            ]);
        }

        // Start next set
        $nextSet = $match->sets()
            ->where('status', 'pending')
            ->orderBy('set_number')
            ->first();

        if ($nextSet) {
            $nextSet->update([
                'status' => 'live',
                'started_at' => now(),
            ]);
            $this->initializeSetStats($nextSet, $match);
        }

        return response()->json([
            'matchFinished' => false,
            'currentSet' => $nextSet?->fresh(),
            'match' => $match->fresh()->load(['sets.stats.athlete']),
        ]);
    }

    /**
     * Initialize stat rows for all athletes in both teams for a given set.
     */
    private function initializeSetStats(MatchSet $set, Match_ $match): void
    {
        if ($match->isTeamMode()) {
            // Tentukan sub-regu index berdasarkan set_number (1-3: Regu 1, 4-6: Regu 2, 7-9: Regu 3)
            $subIndex = (int) floor(($set->set_number - 1) / 3);
            $homeSubTeam = $match->homeSuperTeam?->members[$subIndex] ?? null;
            $awaySubTeam = $match->awaySuperTeam?->members[$subIndex] ?? null;

            $homeAthletes = $homeSubTeam?->athletes ?? collect();
            $awayAthletes = $awaySubTeam?->athletes ?? collect();
        } else {
            $homeAthletes = $match->homeTeam?->athletes ?? collect();
            $awayAthletes = $match->awayTeam?->athletes ?? collect();
        }

        foreach ($homeAthletes as $athlete) {
            SetStat::firstOrCreate([
                'match_set_id' => $set->id,
                'athlete_id'   => $athlete->id,
            ], [
                'team_id'      => $athlete->team_id,
            ]);
        }

        foreach ($awayAthletes as $athlete) {
            SetStat::firstOrCreate([
                'match_set_id' => $set->id,
                'athlete_id'   => $athlete->id,
            ], [
                'team_id'      => $athlete->team_id,
            ]);
        }
    }
}
