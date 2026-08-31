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
        $this->ensureMatchAthletes($match);

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

        // If a set is live or pending, ensure set_stats rows exist for all athletes
        $liveSet = $match->sets()->where('status', 'live')->first() ?: $match->sets()->first();
        if ($liveSet) {
            $this->initializeSetStats($liveSet, $match);
            $match->load('sets.stats.athlete');
        }

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
        $this->ensureMatchAthletes($match);

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
            'athlete_id'   => 'required',
            'stat'         => 'required|in:' . implode(',', SetStat::STAT_COLUMNS),
            'action'       => 'required|in:increment,decrement',
            'zone'         => 'nullable|string',
            'team_id'      => 'nullable|integer',
        ]);

        $athleteId = $validated['athlete_id'];

        // If athlete_id is a temporary string (e.g. 'temp-1-1') or not found, resolve or create real athlete
        if (!is_numeric($athleteId) || !\App\Models\Athlete::where('id', $athleteId)->exists()) {
            $teamId = $request->input('team_id') ?: $match->home_team_id;
            $team = \App\Models\Team::find($teamId);
            if ($team) {
                $this->ensureTeamAthletes($team);
                $firstAthlete = $team->athletes()->first();
                $athleteId = $firstAthlete ? $firstAthlete->id : null;
            }
        }

        if (!$athleteId) {
            return response()->json(['error' => 'Athlete not found'], 422);
        }

        $stat = SetStat::where('match_set_id', $validated['match_set_id'])
            ->where('athlete_id', $athleteId)
            ->first();

        if (!$stat) {
            // Auto-create if not exists
            $athlete = \App\Models\Athlete::find($athleteId);
            $stat = SetStat::create([
                'match_set_id' => $validated['match_set_id'],
                'athlete_id'   => $athleteId,
                'team_id'      => $request->input('team_id') ?: ($athlete ? $athlete->team_id : null),
            ]);
        }

        $column = $validated['stat'];
        $action = $validated['action'];
        $zone = $validated['zone'] ?? null;

        if ($action === 'increment') {
            $stat->increment($column);

            // If zone is specified (e.g. 'zone_1') for service_in or service_ace
            if ($zone && in_array($zone, ['zone_1', 'zone_2', 'zone_3', 'zone_4', 'zone_5', 'zone_6', 'zone_7', 'zone_8', 'zone_9', 'zone_10'])) {
                $suffix = $column === 'service_ace' ? '_ace' : '_in';
                $zoneSpecificCol = $zone . $suffix;
                if (in_array($zoneSpecificCol, SetStat::STAT_COLUMNS)) {
                    $stat->increment($zoneSpecificCol);
                }
                if (in_array($zone, SetStat::STAT_COLUMNS)) {
                    $stat->increment($zone);
                }
            }
        } else {
            if ($stat->$column > 0) {
                $stat->decrement($column);
            }

            if ($zone && in_array($zone, ['zone_1', 'zone_2', 'zone_3', 'zone_4', 'zone_5', 'zone_6', 'zone_7', 'zone_8', 'zone_9', 'zone_10'])) {
                $suffix = $column === 'service_ace' ? '_ace' : '_in';
                $zoneSpecificCol = $zone . $suffix;
                if (in_array($zoneSpecificCol, SetStat::STAT_COLUMNS) && $stat->$zoneSpecificCol > 0) {
                    $stat->decrement($zoneSpecificCol);
                }
                if (in_array($zone, SetStat::STAT_COLUMNS) && $stat->$zone > 0) {
                    $stat->decrement($zone);
                }
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

    /**
     * Ensure all teams in the match have athletes created in the database.
     */
    private function ensureMatchAthletes(Match_ $match): void
    {
        if ($match->homeTeam) {
            $this->ensureTeamAthletes($match->homeTeam);
        }
        if ($match->awayTeam) {
            $this->ensureTeamAthletes($match->awayTeam);
        }
        if ($match->homeSuperTeam) {
            foreach ($match->homeSuperTeam->members as $subTeam) {
                $this->ensureTeamAthletes($subTeam);
            }
        }
        if ($match->awaySuperTeam) {
            foreach ($match->awaySuperTeam->members as $subTeam) {
                $this->ensureTeamAthletes($subTeam);
            }
        }
    }

    /**
     * Ensure a team has standard default athletes if none exist.
     */
    private function ensureTeamAthletes(\App\Models\Team $team): void
    {
        if ($team->athletes()->count() === 0) {
            $defaults = [
                ['name' => 'Tekong ' . $team->name, 'jersey_number' => 1, 'position' => 'Tekong'],
                ['name' => 'Feeder ' . $team->name, 'jersey_number' => 2, 'position' => 'Feeder'],
                ['name' => 'Killer ' . $team->name, 'jersey_number' => 3, 'position' => 'Killer'],
                ['name' => 'Cadangan ' . $team->name, 'jersey_number' => 4, 'position' => 'Cadangan'],
            ];

            foreach ($defaults as $data) {
                \App\Models\Athlete::create([
                    'team_id'       => $team->id,
                    'name'          => $data['name'],
                    'jersey_number' => $data['jersey_number'],
                    'position'      => $data['position'],
                ]);
            }
        }
    }
}
