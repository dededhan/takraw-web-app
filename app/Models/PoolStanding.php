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

            $winnerId = $isTeamMode ? $match->winner_super_team_id : $match->winner_team_id;
            $playedSets = $match->sets->filter(fn($s) => $s->status === 'finished' || ($s->home_score > 0 || $s->away_score > 0));

            if ($isTeamMode) {
                // Calculate regus won
                $regusWonHome = 0;
                $regusWonAway = 0;
                for ($r = 0; $r < 3; $r++) {
                    $rStart = ($r * 3) + 1;
                    $rEnd = ($r * 3) + 3;
                    $rSets = $playedSets->filter(fn($s) => $s->set_number >= $rStart && $s->set_number <= $rEnd);
                    $rH = $rSets->filter(fn($s) => $s->home_score > $s->away_score)->count();
                    $rA = $rSets->filter(fn($s) => $s->away_score > $s->home_score)->count();
                    if ($rH >= 2 || ($rSets->count() >= 3 && $rH > $rA)) {
                        $regusWonHome++;
                    } elseif ($rA >= 2 || ($rSets->count() >= 3 && $rA > $rH)) {
                        $regusWonAway++;
                    }
                }

                if ($regusWonHome > $regusWonAway || $winnerId === $homeId) {
                    $standings[$homeId]['won']++;
                    $standings[$awayId]['lost']++;
                } elseif ($regusWonAway > $regusWonHome || $winnerId === $awayId) {
                    $standings[$awayId]['won']++;
                    $standings[$homeId]['lost']++;
                }
            } else {
                $homeSetsWon = $playedSets->filter(fn($s) => $s->home_score > $s->away_score)->count();
                $awaySetsWon = $playedSets->filter(fn($s) => $s->away_score > $s->home_score)->count();

                if ($homeSetsWon > $awaySetsWon || $winnerId === $homeId) {
                    $standings[$homeId]['won']++;
                    $standings[$awayId]['lost']++;
                } elseif ($awaySetsWon > $homeSetsWon || $winnerId === $awayId) {
                    $standings[$awayId]['won']++;
                    $standings[$homeId]['lost']++;
                }
            }

            foreach ($playedSets as $set) {
                $standings[$homeId]['points_for'] += $set->home_score;
                $standings[$homeId]['points_against'] += $set->away_score;
                $standings[$awayId]['points_for'] += $set->away_score;
                $standings[$awayId]['points_against'] += $set->home_score;

                if ($set->home_score > $set->away_score) {
                    $standings[$homeId]['sets_won']++;
                    $standings[$awayId]['sets_lost']++;
                } elseif ($set->away_score > $set->home_score) {
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
