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
}
