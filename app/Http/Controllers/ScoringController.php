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

        $totalSets = $match->isTeamMode() ? 9 : ($match->max_sets ?: 3);
        for ($i = 1; $i <= $totalSets; $i++) {
            MatchSet::firstOrCreate([
                'match_id'   => $match->id,
                'set_number' => $i,
            ]);
        }

        $match->update([
            'status' => 'live',
            'started_at' => $match->started_at ?? now(),
        ]);

        // Find the first pending or live set (do not overwrite already finished sets!)
        $activeSet = $match->sets()->where('status', 'live')->first()
            ?: $match->sets()->where('status', 'pending')->orderBy('set_number')->first()
            ?: $match->sets()->where('set_number', 1)->first();

        if ($activeSet && $activeSet->status !== 'finished') {
            $activeSet->update([
                'status' => 'live',
                'started_at' => $activeSet->started_at ?? now(),
            ]);

            // Initialize stats for all athletes in both teams
            $this->initializeSetStats($activeSet, $match);
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
            'team_id'      => 'nullable',
        ]);

        $rawAthleteId = $validated['athlete_id'];
        $resolvedAthleteId = null;
        $resolvedTeamId = is_numeric($request->input('team_id')) ? (int)$request->input('team_id') : null;

        // 1. If numeric and exists in DB
        if (is_numeric($rawAthleteId) && \App\Models\Athlete::where('id', (int)$rawAthleteId)->exists()) {
            $resolvedAthleteId = (int)$rawAthleteId;
            $athlete = \App\Models\Athlete::find($resolvedAthleteId);
            if ($athlete && !$resolvedTeamId) {
                $resolvedTeamId = $athlete->team_id;
            }
        }

        // 2. If temporary string like 'temp-1-2'
        if (!$resolvedAthleteId && is_string($rawAthleteId) && preg_match('/temp-(\d+)-(\d+)/', $rawAthleteId, $matches)) {
            $parsedTeamId = (int)$matches[1];
            $jerseyNo = (int)$matches[2];
            $team = \App\Models\Team::find($parsedTeamId);
            if ($team) {
                $this->ensureTeamAthletes($team);
                $athlete = $team->athletes()->where('jersey_number', $jerseyNo)->first()
                    ?: $team->athletes()->skip($jerseyNo - 1)->first()
                    ?: $team->athletes()->first();
                if ($athlete) {
                    $resolvedAthleteId = (int)$athlete->id;
                    $resolvedTeamId = $team->id;
                }
            }
        }

        // 3. Fallback: Resolve via team or match
        if (!$resolvedAthleteId) {
            $team = null;
            if ($resolvedTeamId) {
                $team = \App\Models\Team::find($resolvedTeamId);
            }
            if (!$team) {
                $team = $match->homeTeam ?: $match->awayTeam;
            }
            if (!$team && $match->homeSuperTeam) {
                $team = $match->homeSuperTeam->members()->first();
            }
            if (!$team && $match->awaySuperTeam) {
                $team = $match->awaySuperTeam->members()->first();
            }
            if (!$team) {
                $team = \App\Models\Team::first();
            }

            if ($team) {
                $this->ensureTeamAthletes($team);
                $athlete = $team->athletes()->first();
                if ($athlete) {
                    $resolvedAthleteId = (int)$athlete->id;
                    $resolvedTeamId = $team->id;
                }
            }
        }

        // 4. Ultimate fallback: Ensure at least one athlete exists anywhere in the DB
        if (!$resolvedAthleteId) {
            $fallbackAthlete = \App\Models\Athlete::first();
            if (!$fallbackAthlete) {
                $anyTeam = \App\Models\Team::firstOrCreate(
                    ['name' => 'Tim Sepak Takraw'],
                    ['tournament_id' => $match->tournament_id ?? 1]
                );
                $this->ensureTeamAthletes($anyTeam);
                $fallbackAthlete = $anyTeam->athletes()->first();
            }
            $resolvedAthleteId = (int)$fallbackAthlete->id;
            $resolvedTeamId = $fallbackAthlete->team_id;
        }

        $athleteId = $resolvedAthleteId;
        $teamId = $resolvedTeamId;

        $stat = SetStat::where('match_set_id', $validated['match_set_id'])
            ->where('athlete_id', $athleteId)
            ->first();

        if (!$stat) {
            // Auto-create if not exists
            $stat = SetStat::create([
                'match_set_id' => $validated['match_set_id'],
                'athlete_id'   => $athleteId,
                'team_id'      => $teamId,
            ]);
        }

        $column = $validated['stat'];
        $action = $validated['action'];
        $zone = $validated['zone'] ?? null;
        $set = MatchSet::find($validated['match_set_id']);

        if ($action === 'increment') {
            $stat->increment($column);

            // Auto add point +1 for opponent mistake
            if ($column === 'opponent_mistake' && $set) {
                $sideCol = ($teamId === $match->home_team_id || $teamId === $match->home_super_team_id) ? 'home_score' : 'away_score';
                $set->increment($sideCol);
            }

            // If zone is specified (e.g. 'zone_1') for any action with ace/in
            if ($zone && in_array($zone, ['zone_1', 'zone_2', 'zone_3', 'zone_4', 'zone_5', 'zone_6', 'zone_7', 'zone_8', 'zone_9', 'zone_10'])) {
                $suffix = str_ends_with($column, '_ace') ? '_ace' : '_in';
                $zoneSpecificCol = $zone . $suffix;
                if (in_array($zoneSpecificCol, SetStat::STAT_COLUMNS)) {
                    $stat->increment($zoneSpecificCol);
                }
                if (in_array($zone, SetStat::STAT_COLUMNS)) {
                    $stat->increment($zone);
                }

                // Also track per-action zone breakdown (e.g. service, strike, blocking)
                $actionType = explode('_', $column)[0];
                $actionZones = $stat->action_zones ?? [];
                if (!isset($actionZones[$actionType])) {
                    $actionZones[$actionType] = [];
                }
                $actionZones[$actionType][$zoneSpecificCol] = ($actionZones[$actionType][$zoneSpecificCol] ?? 0) + 1;
                $actionZones[$actionType][$zone] = ($actionZones[$actionType][$zone] ?? 0) + 1;
                $stat->action_zones = $actionZones;
                $stat->save();
            }
        } else {
            if ($stat->$column > 0) {
                $stat->decrement($column);
            }

            // Decrement point if opponent mistake is decremented
            if ($column === 'opponent_mistake' && $set) {
                $sideCol = ($teamId === $match->home_team_id || $teamId === $match->home_super_team_id) ? 'home_score' : 'away_score';
                if ($set->$sideCol > 0) {
                    $set->decrement($sideCol);
                }
            }

            if ($zone && in_array($zone, ['zone_1', 'zone_2', 'zone_3', 'zone_4', 'zone_5', 'zone_6', 'zone_7', 'zone_8', 'zone_9', 'zone_10'])) {
                $suffix = str_ends_with($column, '_ace') ? '_ace' : '_in';
                $zoneSpecificCol = $zone . $suffix;
                if (in_array($zoneSpecificCol, SetStat::STAT_COLUMNS) && $stat->$zoneSpecificCol > 0) {
                    $stat->decrement($zoneSpecificCol);
                }
                if (in_array($zone, SetStat::STAT_COLUMNS) && $stat->$zone > 0) {
                    $stat->decrement($zone);
                }

                $actionType = explode('_', $column)[0];
                $actionZones = $stat->action_zones ?? [];
                if (isset($actionZones[$actionType][$zoneSpecificCol]) && $actionZones[$actionType][$zoneSpecificCol] > 0) {
                    $actionZones[$actionType][$zoneSpecificCol]--;
                }
                if (isset($actionZones[$actionType][$zone]) && $actionZones[$actionType][$zone] > 0) {
                    $actionZones[$actionType][$zone]--;
                }
                $stat->action_zones = $actionZones;
                $stat->save();
            }
        }

        return response()->json([
            'stat' => $stat->fresh(),
            'set'  => $set?->fresh(),
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
        $setsWonHome = $match->sets()->where('status', 'finished')->where('winner_team_id', $match->home_team_id)->count();
        $setsWonAway = $match->sets()->where('status', 'finished')->where('winner_team_id', $match->away_team_id)->count();
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
                'winner'        => $matchWinner,
                'redirect_url'  => route('matches.show', $match->id),
                'match'         => $match->fresh()->load(['homeTeam', 'awayTeam', 'sets']),
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
