<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['pool_id', 'team_id', 'played', 'won', 'lost', 'sets_won', 'sets_lost', 'points_for', 'points_against', 'rank'])]
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
        $teams = $pool->teams; // Get all teams in this pool

        // Initialize standings data
        $standings = [];
        foreach ($teams as $team) {
            $standings[$team->id] = [
                'pool_id' => $poolId,
                'team_id' => $team->id,
                'played' => 0,
                'won' => 0,
                'lost' => 0,
                'sets_won' => 0,
                'sets_lost' => 0,
                'points_for' => 0,
                'points_against' => 0,
                'rank' => null,
                'updated_at' => now(),
            ];
        }

        // Get all finished matches in this pool
        $matches = Match_::where('pool_id', $poolId)
            ->where('status', 'finished')
            ->with('sets')
            ->get();

        foreach ($matches as $match) {
            $homeId = $match->home_team_id;
            $awayId = $match->away_team_id;

            // If team is not in the pool for some reason, skip
            if (!isset($standings[$homeId]) || !isset($standings[$awayId])) {
                continue;
            }

            $standings[$homeId]['played']++;
            $standings[$awayId]['played']++;

            if ($match->winner_team_id === $homeId) {
                $standings[$homeId]['won']++;
                $standings[$awayId]['lost']++;
            } elseif ($match->winner_team_id === $awayId) {
                $standings[$awayId]['won']++;
                $standings[$homeId]['lost']++;
            }

            foreach ($match->sets as $set) {
                if ($set->status !== 'finished') {
                    continue;
                }

                $standings[$homeId]['points_for'] += $set->home_score;
                $standings[$homeId]['points_against'] += $set->away_score;
                $standings[$awayId]['points_for'] += $set->away_score;
                $standings[$awayId]['points_against'] += $set->home_score;

                if ($set->winner_team_id === $homeId) {
                    $standings[$homeId]['sets_won']++;
                    $standings[$awayId]['sets_lost']++;
                } elseif ($set->winner_team_id === $awayId) {
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
            $teamId = $data['team_id'];
            $standings[$teamId]['rank'] = $index + 1;

            self::updateOrCreate(
                ['pool_id' => $poolId, 'team_id' => $teamId],
                $standings[$teamId]
            );
        }
    }
}
