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
        // Jika match ini adalah babak gugur (braket) dan belum selesai, selalu pastikan tim sinkron dengan hasil pool/babak sebelumnya:
        if ($match->stage !== 'pool' && $match->status !== 'finished') {
            app(\App\Services\PlaceholderResolverService::class)->resolveForMatch($match, true);
            $match->refresh();
        }

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

        // Ambil kandidat tim turnamen untuk opsi pemilihan manual jika match braket belum terisi
        $tournamentTeams = [];
        if ($match->tournament_id) {
            if ($match->isTeamMode()) {
                $tournamentTeams = \App\Models\SuperTeam::where('tournament_id', $match->tournament_id)
                    ->where('match_mode', $match->match_mode)
                    ->with('members.athletes')
                    ->orderBy('name')
                    ->get();
            } else {
                $tournamentTeams = \App\Models\Team::where('tournament_id', $match->tournament_id)
                    ->with('athletes')
                    ->orderBy('name')
                    ->get();
            }
        }

        return Inertia::render('Scoring/Live', [
            'match'           => $match,
            'tournamentTeams' => $tournamentTeams,
        ]);
    }

    /**
     * Setup match before starting (referee fills court number, max sets).
     */
    public function setup(Request $request, Match_ $match)
    {
        $validated = $request->validate([
            'court_number'        => 'required|integer|min:1',
            'max_sets'            => 'required|integer|min:1|max:9',
            'home_lineup'         => 'nullable|array',
            'away_lineup'         => 'nullable|array',
            'home_team_id'        => 'nullable|integer|exists:teams,id',
            'away_team_id'        => 'nullable|integer|exists:teams,id',
            'home_super_team_id'  => 'nullable|integer|exists:super_teams,id',
            'away_super_team_id'  => 'nullable|integer|exists:super_teams,id',
        ]);

        $totalSets = $match->isTeamMode() ? 9 : $validated['max_sets'];

        $lineup = $match->lineup ?: [];
        if ($request->has('home_lineup')) {
            $lineup['home'] = array_values(array_filter(array_map('intval', (array) $request->input('home_lineup', []))));
        }
        if ($request->has('away_lineup')) {
            $lineup['away'] = array_values(array_filter(array_map('intval', (array) $request->input('away_lineup', []))));
        }

        $updateData = [
            'court_number' => $validated['court_number'],
            'max_sets'     => $totalSets,
            'status'       => 'setup',
            'lineup'       => $lineup,
        ];

        // Jika tim manual diset pada match braket:
        if (!empty($validated['home_team_id'])) {
            $updateData['home_team_id'] = $validated['home_team_id'];
            $updateData['home_placeholder'] = null;
        }
        if (!empty($validated['away_team_id'])) {
            $updateData['away_team_id'] = $validated['away_team_id'];
            $updateData['away_placeholder'] = null;
        }
        if (!empty($validated['home_super_team_id'])) {
            $updateData['home_super_team_id'] = $validated['home_super_team_id'];
            $updateData['home_placeholder'] = null;
        }
        if (!empty($validated['away_super_team_id'])) {
            $updateData['away_super_team_id'] = $validated['away_super_team_id'];
            $updateData['away_placeholder'] = null;
        }

        $match->update($updateData);
        $this->ensureMatchAthletes($match);

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
     * Trigger sinkronisasi otomatis bracket match dengan hasil pool terbaru.
     */
    public function syncBracket(Match_ $match)
    {
        $resolver = app(\App\Services\PlaceholderResolverService::class);
        $updated = $resolver->resolveForMatch($match, true);

        $match->refresh();
        $this->ensureMatchAthletes($match);

        $homeName = $match->isTeamMode() ? $match->homeSuperTeam?->name : $match->homeTeam?->name;
        $awayName = $match->isTeamMode() ? $match->awaySuperTeam?->name : $match->awayTeam?->name;

        if ($updated) {
            return back()->with('success', "Berhasil menyinkronkan nama tim dari bagan! Home: {$homeName}, Away: {$awayName}.");
        }

        return back()->with('info', "Data tim pada pertandingan ini sudah sesuai (Home: {$homeName}, Away: {$awayName}).");
    }

    /**
     * Kembalikan pertandingan berstatus live / setup kembali ke status setup (batalkan live).
     */
    public function resetToSetup(Match_ $match)
    {
        $match->update([
            'status'     => 'setup',
            'started_at' => null,
        ]);

        // Jika ada set yang belum ada skornya atau 0-0, pastikan tetap siap dimainkan
        foreach ($match->sets as $set) {
            if ($set->home_score === 0 && $set->away_score === 0 && $set->status !== 'finished') {
                $set->update([
                    'status'      => 'pending',
                    'started_at'  => null,
                ]);
            }
        }

        return back()->with('success', 'Status pertandingan berhasil dikembalikan ke Setup. Anda dapat mengatur ulang tim atau pemain!');
    }

    /**
     * Selesaikan dan kunci pertandingan secara menyeluruh dari layar wasit.
     */
    public function finalize(Match_ $match)
    {
        $isTeam = $match->isTeamMode() || $match->home_super_team_id || $match->away_super_team_id;
        $homeContestantId = $isTeam ? $match->home_super_team_id : $match->home_team_id;
        $awayContestantId = $isTeam ? $match->away_super_team_id : $match->away_team_id;

        // Tandai set aktif sebagai finished jika memiliki skor
        $sets = $match->sets()->get();
        foreach ($sets as $set) {
            if ($set->home_score > 0 || $set->away_score > 0 || $set->status === 'live') {
                $setWinner = $set->home_score > $set->away_score
                    ? $homeContestantId
                    : ($set->away_score > $set->home_score ? $awayContestantId : null);
                $set->update([
                    'status'               => 'finished',
                    'finished_at'          => $set->finished_at ?? now(),
                    'winner_team_id'       => $isTeam ? null : $setWinner,
                    'winner_super_team_id' => $isTeam ? $setWinner : null,
                ]);
            }
        }

        // Tentukan pemenang pertandingan
        $matchWinner = null;
        if ($isTeam && $match->sets()->count() > 3) {
            $regusWonHome = 0;
            $regusWonAway = 0;
            for ($r = 0; $r < 3; $r++) {
                $rStart = ($r * 3) + 1;
                $rEnd = ($r * 3) + 3;
                $rSets = $match->sets()->whereBetween('set_number', [$rStart, $rEnd])
                    ->where('status', 'finished')
                    ->get();
                $rH = $rSets->filter(fn($s) => $s->home_score > $s->away_score)->count();
                $rA = $rSets->filter(fn($s) => $s->away_score > $s->home_score)->count();
                if ($rH >= 2 || ($rH + $rA >= 3 && $rH > $rA)) {
                    $regusWonHome++;
                } elseif ($rA >= 2 || ($rH + $rA >= 3 && $rA > $rH)) {
                    $regusWonAway++;
                }
            }
            $matchWinner = $regusWonHome >= $regusWonAway ? $homeContestantId : $awayContestantId;
        } else {
            $finishedSets = $match->sets()->where('status', 'finished')->get();
            $setsWonHome = $finishedSets->filter(fn($s) => $s->home_score > $s->away_score)->count();
            $setsWonAway = $finishedSets->filter(fn($s) => $s->away_score > $s->home_score)->count();
            $matchWinner = $setsWonHome >= $setsWonAway ? $homeContestantId : $awayContestantId;
        }

        $match->update([
            'status'               => 'finished',
            'finished_at'          => now(),
            'winner_team_id'       => $isTeam ? null : $matchWinner,
            'winner_super_team_id' => $isTeam ? $matchWinner : null,
        ]);

        if ($match->pool_id) {
            \App\Models\PoolStanding::recalculate($match->pool_id);
            app(\App\Services\PlaceholderResolverService::class)->resolve($match);
        }

        if ($match->next_match_id) {
            app(\App\Services\PlaceholderResolverService::class)->advanceWinnerToNextMatch($match, $matchWinner, $isTeam);
        }

        return back()->with('success', 'Pertandingan berhasil diselesaikan dan dikunci! Hasil telah dicatat ke klasemen & bagan.');
    }

    /**
     * Update active court lineup for home or away side during match.
     */
    public function updateLineup(Request $request, Match_ $match)
    {
        $validated = $request->validate([
            'side'   => 'required|in:home,away',
            'lineup' => 'required|array',
        ]);

        $lineup = $match->lineup ?: [];
        $lineup[$validated['side']] = array_values(array_filter(array_map('intval', (array) $validated['lineup'])));

        $match->update(['lineup' => $lineup]);

        return response()->json([
            'success' => true,
            'lineup'  => $lineup,
        ]);
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
            'stat'         => ['required', 'string', \Illuminate\Validation\Rule::in(SetStat::STAT_COLUMNS)],
            'action'       => 'required|in:increment,decrement',
            'zone'         => 'nullable|string',
            'team_id'      => 'nullable',
            'side'         => 'nullable|in:home,away',
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
        $column = $validated['stat'];
        $action = $validated['action'];
        $zone = $validated['zone'] ?? null;
        $set = MatchSet::find($validated['match_set_id']);

        $stat = SetStat::where('match_set_id', $validated['match_set_id'])
            ->where('athlete_id', $athleteId)
            ->first();

        if (!$stat) {
            $stat = SetStat::create([
                'match_set_id' => $validated['match_set_id'],
                'athlete_id'   => $athleteId,
                'team_id'      => $teamId,
            ]);
        }

        // Determine whether this team/athlete belongs to home or away
        $side = $validated['side'] ?? null;
        if (!$side) {
            if ($match->isTeamMode()) {
                $homeMemberIds = $match->homeSuperTeam?->members->pluck('id')->all() ?? [];
                $side = (in_array($teamId, $homeMemberIds) || $teamId === $match->home_super_team_id) ? 'home' : 'away';
            } else {
                $side = ($teamId === $match->home_team_id) ? 'home' : 'away';
            }
        }
        $sideCol = ($side === 'home') ? 'home_score' : 'away_score';

        if ($action === 'increment') {
            $stat->increment($column);

            // Auto add point +1 for opponent mistake to the team receiving the mistake point
            if ($column === 'opponent_mistake' && $set) {
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

        $set->refresh();

        // If the set was finished and score changed, keep winner in sync
        $isTeam = $match->isTeamMode() || $match->home_super_team_id || $match->away_super_team_id;
        $homeContestantId = $isTeam ? $match->home_super_team_id : $match->home_team_id;
        $awayContestantId = $isTeam ? $match->away_super_team_id : $match->away_team_id;

        if ($set->status === 'finished') {
            $setWinnerId = $set->home_score > $set->away_score
                ? $homeContestantId
                : ($set->away_score > $set->home_score ? $awayContestantId : null);

            $set->update([
                'winner_team_id'        => $isTeam ? null : $setWinnerId,
                'winner_super_team_id'  => $isTeam ? $setWinnerId : null,
            ]);

            // Sinkronkan status dan pemenang pertandingan jika match sudah selesai/diedit
            $this->syncMatchStateAfterScoreUpdate($match);
        }

        return response()->json([
            'set' => $set->fresh(),
            'match' => $match->fresh()->load($this->defaultMatchRelations()),
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

        $isTeam = $match->isTeamMode() || $match->home_super_team_id || $match->away_super_team_id;
        $homeContestantId = $isTeam ? $match->home_super_team_id : $match->home_team_id;
        $awayContestantId = $isTeam ? $match->away_super_team_id : $match->away_team_id;

        // Determine set winner accurately based on points
        $setWinnerId = $set->home_score > $set->away_score
            ? $homeContestantId
            : ($set->away_score > $set->home_score ? $awayContestantId : null);

        $set->update([
            'status'                => 'finished',
            'finished_at'           => $set->finished_at ?? now(),
            'winner_team_id'        => $isTeam ? null : $setWinnerId,
            'winner_super_team_id'  => $isTeam ? $setWinnerId : null,
        ]);

        // ─── TEAM MODE MULTI-SESSION HANDLING (Team Regu / Team Double) ───
        if ($isTeam && $match->sets()->count() > 3) {
            $subIndex = (int) floor(($set->set_number - 1) / 3);
            $subStartSet = ($subIndex * 3) + 1;
            $subEndSet = ($subIndex * 3) + 3;

            // Count sets won in this sub-regu based directly on scores & finished status
            $subSets = $match->sets()->whereBetween('set_number', [$subStartSet, $subEndSet])
                ->where('status', 'finished')
                ->get();

            $subSetsHome = $subSets->filter(fn($s) => $s->home_score > $s->away_score)->count();
            $subSetsAway = $subSets->filter(fn($s) => $s->away_score > $s->home_score)->count();

            $subFinished = ($subSetsHome >= 2 || $subSetsAway >= 2 || ($subSetsHome + $subSetsAway >= 3));
            $subWinner = $subSetsHome > $subSetsAway ? $homeContestantId : ($subSetsAway > $subSetsHome ? $awayContestantId : null);

            // Calculate overall regus won so far across all 3 regus
            $regusWonHome = 0;
            $regusWonAway = 0;
            for ($r = 0; $r < 3; $r++) {
                $rStart = ($r * 3) + 1;
                $rEnd = ($r * 3) + 3;
                $rSets = $match->sets()->whereBetween('set_number', [$rStart, $rEnd])
                    ->where('status', 'finished')
                    ->get();
                $rH = $rSets->filter(fn($s) => $s->home_score > $s->away_score)->count();
                $rA = $rSets->filter(fn($s) => $s->away_score > $s->home_score)->count();
                if ($rH >= 2 || ($rH + $rA >= 3 && $rH > $rA)) {
                    $regusWonHome++;
                } elseif ($rA >= 2 || ($rH + $rA >= 3 && $rA > $rH)) {
                    $regusWonAway++;
                }
            }

            // A Team match with 3 regus finishes when Regu 3 finishes (or all 3 regus are complete)
            $matchOver = ($subFinished && $subIndex >= 2) || ($regusWonHome + $regusWonAway >= 3);

            if ($matchOver) {
                $matchWinner = $regusWonHome >= $regusWonAway ? $homeContestantId : $awayContestantId;
                $match->update([
                    'status'               => 'finished',
                    'finished_at'          => $match->finished_at ?? now(),
                    'winner_super_team_id' => $matchWinner,
                ]);

                if ($match->pool_id) {
                    \App\Models\PoolStanding::recalculate($match->pool_id);
                    app(\App\Services\PlaceholderResolverService::class)->resolve($match);
                }

                if ($match->next_match_id) {
                    app(\App\Services\PlaceholderResolverService::class)->advanceWinnerToNextMatch($match, $matchWinner, true);
                }

                return response()->json([
                    'matchFinished'   => true,
                    'winner'          => $matchWinner,
                    'reguFinished'    => true,
                    'reguWinner'      => $subWinner,
                    'regusWonHome'    => $regusWonHome,
                    'regusWonAway'    => $regusWonAway,
                    'redirect_url'    => route('matches.show', $match->id),
                    'match'           => $match->fresh()->load($this->defaultMatchRelations()),
                ]);
            }

            // If sub-regu finished (Regu 1 or Regu 2), activate the first set of the NEXT sub-regu (e.g. Set 4 for Regu 2, Set 7 for Regu 3)
            if ($subFinished) {
                $nextSubIndex = $subIndex + 1;
                $nextSetNum = ($nextSubIndex * 3) + 1;
                $nextSet = $match->sets()->where('set_number', $nextSetNum)->first();

                if ($nextSet) {
                    $nextSet->update([
                        'status'     => 'live',
                        'started_at' => now(),
                    ]);
                    $this->initializeSetStats($nextSet, $match);
                }

                return response()->json([
                    'matchFinished' => false,
                    'reguFinished'  => true,
                    'reguWinner'    => $subWinner,
                    'reguIndex'     => $subIndex,
                    'nextReguIndex' => $nextSubIndex,
                    'regusWonHome'  => $regusWonHome,
                    'regusWonAway'  => $regusWonAway,
                    'currentSet'    => $nextSet ? $nextSet->fresh() : null,
                    'active_set'    => $nextSet ? $nextSet->fresh() : null,
                    'match'         => $match->fresh()->load($this->defaultMatchRelations()),
                ]);
            }

            // Sub-regu continues: activate next set within this sub-regu
            $nextSet = $match->sets()->where('set_number', $set->set_number + 1)->first();
            if ($nextSet) {
                $nextSet->update([
                    'status'     => 'live',
                    'started_at' => now(),
                ]);
                $this->initializeSetStats($nextSet, $match);
            }

            return response()->json([
                'matchFinished' => false,
                'reguFinished'  => false,
                'regusWonHome'  => $regusWonHome,
                'regusWonAway'  => $regusWonAway,
                'currentSet'    => $nextSet ? $nextSet->fresh() : null,
                'active_set'    => $nextSet ? $nextSet->fresh() : null,
                'match'         => $match->fresh()->load($this->defaultMatchRelations()),
            ]);
        }

        // ─── REGULAR MODE HANDLING (Single Regu / Double / Quadrant) ───
        $finishedSets = $match->sets()->where('status', 'finished')->get();
        foreach ($finishedSets as $s) {
            $sWinner = $s->home_score > $s->away_score
                ? $homeContestantId
                : ($s->away_score > $s->home_score ? $awayContestantId : null);
            if ($sWinner && ($s->winner_team_id !== $sWinner && $s->winner_super_team_id !== $sWinner)) {
                $s->update([
                    'winner_team_id'        => $isTeam ? null : $sWinner,
                    'winner_super_team_id'  => $isTeam ? $sWinner : null,
                ]);
            }
        }

        $setsWonHome = $finishedSets->filter(fn($s) => $s->home_score > $s->away_score)->count();
        $setsWonAway = $finishedSets->filter(fn($s) => $s->away_score > $s->home_score)->count();

        $setsToWin = ceil(($match->max_sets ?: 3) / 2);

        if ($setsWonHome >= $setsToWin || $setsWonAway >= $setsToWin || $match->status === 'finished') {
            // Match finished
            $matchWinner = $setsWonHome >= $setsWonAway ? $homeContestantId : $awayContestantId;

            $match->update([
                'status'               => 'finished',
                'finished_at'          => $match->finished_at ?? now(),
                'winner_team_id'       => $isTeam ? null : $matchWinner,
                'winner_super_team_id' => $isTeam ? $matchWinner : null,
            ]);

            // Recalculate standings if it's a pool match and resolve placeholders synchronously
            if ($match->pool_id) {
                \App\Models\PoolStanding::recalculate($match->pool_id);
                app(\App\Services\PlaceholderResolverService::class)->resolve($match);
            }

            // If bracket match, advance winner to next match
            if ($match->next_match_id) {
                app(\App\Services\PlaceholderResolverService::class)->advanceWinnerToNextMatch($match, $matchWinner, false);
            }

            return response()->json([
                'matchFinished' => true,
                'winner'        => $matchWinner,
                'redirect_url'  => route('matches.show', $match->id),
                'match'         => $match->fresh()->load($this->defaultMatchRelations()),
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
            'match' => $match->fresh()->load($this->defaultMatchRelations()),
        ]);
    }

    /**
     * Sinkronkan pemenang tiap set dan pemenang keseluruhan match setelah update skor.
     * Jika skor berubah pada match yang finished atau memicu kemenangan, perbarui pemenang dan dorong ke bagan/klasemen.
     */
    public function syncMatchStateAfterScoreUpdate(Match_ $match): void
    {
        $isTeam = $match->isTeamMode() || $match->home_super_team_id || $match->away_super_team_id;
        $homeContestantId = $isTeam ? $match->home_super_team_id : $match->home_team_id;
        $awayContestantId = $isTeam ? $match->away_super_team_id : $match->away_team_id;

        $finishedSets = $match->sets()->where('status', 'finished')->get();
        foreach ($finishedSets as $s) {
            $sWinner = $s->home_score > $s->away_score
                ? $homeContestantId
                : ($s->away_score > $s->home_score ? $awayContestantId : null);
            if ($sWinner && ($s->winner_team_id !== $sWinner && $s->winner_super_team_id !== $sWinner)) {
                $s->update([
                    'winner_team_id'        => $isTeam ? null : $sWinner,
                    'winner_super_team_id'  => $isTeam ? $sWinner : null,
                ]);
            }
        }

        if ($isTeam && $match->sets()->count() > 3) {
            $regusWonHome = 0;
            $regusWonAway = 0;
            for ($r = 0; $r < 3; $r++) {
                $rStart = ($r * 3) + 1;
                $rEnd = ($r * 3) + 3;
                $rSets = $match->sets()->whereBetween('set_number', [$rStart, $rEnd])
                    ->where('status', 'finished')
                    ->get();
                $rH = $rSets->filter(fn($s) => $s->home_score > $s->away_score)->count();
                $rA = $rSets->filter(fn($s) => $s->away_score > $s->home_score)->count();
                if ($rH >= 2 || ($rH + $rA >= 3 && $rH > $rA)) {
                    $regusWonHome++;
                } elseif ($rA >= 2 || ($rH + $rA >= 3 && $rA > $rH)) {
                    $regusWonAway++;
                }
            }

            if ($match->status === 'finished' || ($regusWonHome >= 2 || $regusWonAway >= 2 || ($regusWonHome + $regusWonAway >= 3))) {
                $matchWinner = $regusWonHome >= $regusWonAway ? $homeContestantId : $awayContestantId;
                $match->update([
                    'status'               => 'finished',
                    'finished_at'          => $match->finished_at ?? now(),
                    'winner_super_team_id' => $matchWinner,
                ]);

                if ($match->pool_id) {
                    \App\Models\PoolStanding::recalculate($match->pool_id);
                    app(\App\Services\PlaceholderResolverService::class)->resolve($match);
                }

                if ($match->next_match_id) {
                    app(\App\Services\PlaceholderResolverService::class)->advanceWinnerToNextMatch($match, $matchWinner, true);
                }
            }
        } else {
            $setsWonHome = $finishedSets->filter(fn($s) => $s->home_score > $s->away_score)->count();
            $setsWonAway = $finishedSets->filter(fn($s) => $s->away_score > $s->home_score)->count();
            $setsToWin = ceil(($match->max_sets ?: 3) / 2);

            if ($match->status === 'finished' || ($setsWonHome >= $setsToWin || $setsWonAway >= $setsToWin)) {
                $matchWinner = $setsWonHome >= $setsWonAway ? $homeContestantId : $awayContestantId;
                $match->update([
                    'status'               => 'finished',
                    'finished_at'          => $match->finished_at ?? now(),
                    'winner_team_id'       => $isTeam ? null : $matchWinner,
                    'winner_super_team_id' => $isTeam ? $matchWinner : null,
                ]);

                if ($match->pool_id) {
                    \App\Models\PoolStanding::recalculate($match->pool_id);
                    app(\App\Services\PlaceholderResolverService::class)->resolve($match);
                }

                if ($match->next_match_id) {
                    app(\App\Services\PlaceholderResolverService::class)->advanceWinnerToNextMatch($match, $matchWinner, false);
                }
            }
        }
    }

    /**
     * Quick add an athlete on-the-fly during scoring (input dadakan nomor punggung).
     */
    public function quickAthlete(Request $request, Match_ $match)
    {
        $validated = $request->validate([
            'team_id'       => 'required|exists:teams,id',
            'jersey_number' => 'required|integer|min:1|max:99',
            'name'          => 'nullable|string|max:100',
            'position'      => 'nullable|string|max:50',
        ]);

        $team = \App\Models\Team::findOrFail($validated['team_id']);

        // Check if athlete with this jersey number already exists in this team
        $athlete = $team->athletes()->where('jersey_number', $validated['jersey_number'])->first();

        if (!$athlete) {
            $name = !empty($validated['name'])
                ? $validated['name']
                : ($validated['position'] ?? 'Pemain') . ' #' . $validated['jersey_number'];

            $athlete = \App\Models\Athlete::create([
                'team_id'       => $team->id,
                'jersey_number' => $validated['jersey_number'],
                'name'          => $name,
                'position'      => $validated['position'] ?? 'Pemain',
            ]);
        }

        // Ensure set stat exists for current active set
        $activeSet = $match->sets()->where('status', 'live')->first() ?: $match->sets()->first();
        if ($activeSet) {
            SetStat::firstOrCreate([
                'match_set_id' => $activeSet->id,
                'athlete_id'   => $athlete->id,
            ], [
                'team_id'      => $team->id,
            ]);
        }

        return response()->json([
            'success' => true,
            'athlete' => $athlete,
            'team'    => $team->fresh()->load('athletes'),
            'match'   => $match->fresh()->load($this->defaultMatchRelations()),
        ]);
    }

    /**
     * Update an existing athlete's jersey number, name, or position on-the-fly during scoring.
     * Handles jersey number swapping if the target jersey number is already used by another athlete in the same team.
     */
    public function updateAthlete(Request $request, Match_ $match)
    {
        $validated = $request->validate([
            'athlete_id'    => 'required|exists:athletes,id',
            'jersey_number' => 'required|integer|min:1|max:99',
            'name'          => 'nullable|string|max:100',
            'position'      => 'nullable|string|max:50',
        ]);

        $athlete = \App\Models\Athlete::findOrFail($validated['athlete_id']);
        $newJersey = (int) $validated['jersey_number'];
        $oldJersey = (int) $athlete->jersey_number;

        DB::transaction(function () use ($match, $athlete, $newJersey, $oldJersey, $validated) {
            if ($newJersey !== $oldJersey) {
                // Determine team scope (support super teams as well)
                $teamIds = [$athlete->team_id];
                if ($match->isTeamMode()) {
                    if ($match->home_super_team_id && $match->homeSuperTeam?->members->contains('id', $athlete->team_id)) {
                        $teamIds = $match->homeSuperTeam->members->pluck('id')->toArray();
                    } elseif ($match->away_super_team_id && $match->awaySuperTeam?->members->contains('id', $athlete->team_id)) {
                        $teamIds = $match->awaySuperTeam->members->pluck('id')->toArray();
                    }
                }

                // Check if another athlete in the same team scope already has this jersey number
                $conflictAthlete = \App\Models\Athlete::whereIn('team_id', $teamIds)
                    ->where('jersey_number', $newJersey)
                    ->where('id', '!=', $athlete->id)
                    ->first();

                if ($conflictAthlete) {
                    if ($conflictAthlete->team_id === $athlete->team_id) {
                        // Temporary set conflict athlete to a safe unused number to prevent unique key violation
                        $tempNumber = 900 + ($oldJersey % 99);
                        while (\App\Models\Athlete::where('team_id', $athlete->team_id)->where('jersey_number', $tempNumber)->exists()) {
                            $tempNumber++;
                        }

                        $conflictAthlete->update(['jersey_number' => $tempNumber]);
                        $athlete->update([
                            'jersey_number' => $newJersey,
                            'name'          => !empty($validated['name']) ? $validated['name'] : $athlete->name,
                            'position'      => !empty($validated['position']) ? $validated['position'] : $athlete->position,
                        ]);
                        $conflictAthlete->update(['jersey_number' => $oldJersey]);
                    } else {
                        // Different sub-teams in SuperTeam mode (no unique index collision)
                        $conflictAthlete->update(['jersey_number' => $oldJersey]);
                        $athlete->update([
                            'jersey_number' => $newJersey,
                            'name'          => !empty($validated['name']) ? $validated['name'] : $athlete->name,
                            'position'      => !empty($validated['position']) ? $validated['position'] : $athlete->position,
                        ]);
                    }
                } else {
                    $athlete->update([
                        'jersey_number' => $newJersey,
                        'name'          => !empty($validated['name']) ? $validated['name'] : $athlete->name,
                        'position'      => !empty($validated['position']) ? $validated['position'] : $athlete->position,
                    ]);
                }
            } else {
                $athlete->update([
                    'name'     => !empty($validated['name']) ? $validated['name'] : $athlete->name,
                    'position' => !empty($validated['position']) ? $validated['position'] : $athlete->position,
                ]);
            }
        });

        return response()->json([
            'success' => true,
            'athlete' => $athlete->fresh(),
            'match'   => $match->fresh()->load($this->defaultMatchRelations()),
        ]);
    }

    /**
     * Complete match relations needed for live scoring and lineup management.
     */
    private function defaultMatchRelations(): array
    {
        return [
            'homeTeam.athletes',
            'awayTeam.athletes',
            'homeSuperTeam.members.athletes',
            'awaySuperTeam.members.athletes',
            'sets.stats.athlete',
            'court',
            'timeSlot',
        ];
    }

    /**
     * Initialize stat rows for all athletes in both teams for a given set.
     */
    private function initializeSetStats(MatchSet $set, Match_ $match): void
    {
        if ($match->isTeamMode()) {
            $homeAthletes = $match->homeSuperTeam?->members->flatMap->athletes ?? collect();
            $awayAthletes = $match->awaySuperTeam?->members->flatMap->athletes ?? collect();
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
