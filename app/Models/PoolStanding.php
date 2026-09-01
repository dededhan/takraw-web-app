<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['pool_id', 'team_id', 'super_team_id', 'played', 'won', 'lost', 'sets_won', 'sets_lost', 'points_for', 'points_against', 'rank'])]
class PoolStanding extends Model
{
    /**
     * This model only uses updated_at, not created_at.
     */
    public $timestamps = false;

    protected function casts(): array
    {
        return [
            'updated_at' => 'datetime',
        ];
    }

    // ─── Relationships ──────────────────────────────

    public function pool(): BelongsTo
    {
        return $this->belongsTo(Pool::class);
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function superTeam(): BelongsTo
    {
        return $this->belongsTo(SuperTeam::class);
    }

    // ─── Helpers ────────────────────────────────────

    /**
     * Calculate point difference (for tiebreaker).
     */
    public function getPointDiffAttribute(): int
    {
        return $this->points_for - $this->points_against;
    }

    /**
     * Calculate set ratio (for tiebreaker).
     */
    public function getSetRatioAttribute(): float
    {
        return $this->sets_lost > 0
            ? round($this->sets_won / $this->sets_lost, 3)
            : ($this->sets_won > 0 ? 999.0 : 0.0);
    }

    /**
     * Recalculate standings for a specific pool.
     */
    public static function recalculate(int $poolId): void
    {
        $pool = Pool::findOrFail($poolId);
        $isTeamMode = in_array($pool->match_mode, ['team_regu', 'team_double']);

        if ($isTeamMode) {
            $contestants = $pool->superTeams;
        } else {
            $contestants = $pool->teams;
        }

        // Initialize standings data
        $standings = [];
        foreach ($contestants as $c) {
            $standings[$c->id] = [
                'pool_id'        => $poolId,
                'team_id'        => $isTeamMode ? null : $c->id,
                'super_team_id'  => $isTeamMode ? $c->id : null,
                'played'         => 0,
                'won'            => 0,
                'lost'           => 0,
                'sets_won'       => 0,
                'sets_lost'      => 0,
                'points_for'     => 0,
                'points_against' => 0,
                'rank'           => null,
                'updated_at'     => now(),
            ];
        }

        // Get all finished matches in this pool
        $matches = Match_::where('pool_id', $poolId)
            ->where('status', 'finished')
            ->with('sets')
            ->get();

        foreach ($matches as $match) {
            $homeId = $isTeamMode ? $match->home_super_team_id : $match->home_team_id;
            $awayId = $isTeamMode ? $match->away_super_team_id : $match->away_team_id;

            if (!$homeId || !$awayId) {
                continue;
            }

            // If contestant is not in the pool for some reason, skip
            if (!isset($standings[$homeId]) || !isset($standings[$awayId])) {
                continue;
            }

            $standings[$homeId]['played']++;
            $standings[$awayId]['played']++;

            $winnerId = $match->winner_team_id;
            if ($isTeamMode) {
                // For team mode, check match sets won or winner_team_id against super team
                $homeSets = $match->sets->where('status', 'finished')->filter(fn($s) => $s->winner_team_id === $homeId || $s->home_score > $s->away_score)->count();
                $awaySets = $match->sets->where('status', 'finished')->filter(fn($s) => $s->winner_team_id === $awayId || $s->away_score > $s->home_score)->count();
                if ($homeSets > $awaySets) {
                    $standings[$homeId]['won']++;
                    $standings[$awayId]['lost']++;
                } elseif ($awaySets > $homeSets) {
                    $standings[$awayId]['won']++;
                    $standings[$homeId]['lost']++;
                } elseif ($winnerId === $homeId) {
                    $standings[$homeId]['won']++;
                    $standings[$awayId]['lost']++;
                } elseif ($winnerId === $awayId) {
                    $standings[$awayId]['won']++;
                    $standings[$homeId]['lost']++;
                }
            } else {
                if ($winnerId === $homeId) {
                    $standings[$homeId]['won']++;
                    $standings[$awayId]['lost']++;
                } elseif ($winnerId === $awayId) {
                    $standings[$awayId]['won']++;
                    $standings[$homeId]['lost']++;
                }
            }

            foreach ($match->sets as $set) {
                if ($set->status !== 'finished') {
                    continue;
                }

                $standings[$homeId]['points_for'] += $set->home_score;
                $standings[$homeId]['points_against'] += $set->away_score;
                $standings[$awayId]['points_for'] += $set->away_score;
                $standings[$awayId]['points_against'] += $set->home_score;

                if ($set->home_score > $set->away_score || $set->winner_team_id === $homeId) {
                    $standings[$homeId]['sets_won']++;
                    $standings[$awayId]['sets_lost']++;
                } elseif ($set->away_score > $set->home_score || $set->winner_team_id === $awayId) {
                    $standings[$awayId]['sets_won']++;
                    $standings[$homeId]['sets_lost']++;
                }
            }
        }

        // Sort standings to determine ranks
        $sorted = array_values($standings);
        usort($sorted, function ($a, $b) {
            // 1. Won DESC
            if ($a['won'] !== $b['won']) {
                return $b['won'] <=> $a['won'];
            }
            // 2. Set difference DESC (sets_won - sets_lost)
            $setDiffA = $a['sets_won'] - $a['sets_lost'];
            $setDiffB = $b['sets_won'] - $b['sets_lost'];
            if ($setDiffA !== $setDiffB) {
                return $setDiffB <=> $setDiffA;
            }
            // 3. Point difference DESC (points_for - points_against)
            $pointDiffA = $a['points_for'] - $a['points_against'];
            $pointDiffB = $b['points_for'] - $b['points_against'];
            if ($pointDiffA !== $pointDiffB) {
                return $pointDiffB <=> $pointDiffA;
            }
            return 0; // tie
        });

        // Save sorted standings with ranks
        foreach ($sorted as $index => $data) {
            $keyId = $isTeamMode ? $data['super_team_id'] : $data['team_id'];
            if (!$keyId) continue;

            $standings[$keyId]['rank'] = $index + 1;

            if ($isTeamMode) {
                self::updateOrCreate(
                    ['pool_id' => $poolId, 'super_team_id' => $keyId],
                    $standings[$keyId]
                );
            } else {
                self::updateOrCreate(
                    ['pool_id' => $poolId, 'team_id' => $keyId],
                    $standings[$keyId]
                );
            }
        }
    }
}
