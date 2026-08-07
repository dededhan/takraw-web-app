<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['tournament_id', 'match_mode', 'pool_count', 'is_active'])]
class TournamentMode extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'pool_count' => 'integer',
        ];
    }

    // ─── Relationships ──────────────────────────────

    public function tournament(): BelongsTo
    {
        return $this->belongsTo(Tournament::class);
    }

    // ─── Helpers ────────────────────────────────────

    /**
     * Apakah mode ini adalah mode Team (Super Team).
     */
    public function isTeamMode(): bool
    {
        return in_array($this->match_mode, ['team_regu', 'team_double']);
    }

    /**
     * Label tampilan mode.
     */
    public function getModeLabelAttribute(): string
    {
        return match ($this->match_mode) {
            'regu'         => 'Regu',
            'double'       => 'Double',
            'quadrant'     => 'Quadrant',
            'team_regu'    => 'Team Regu',
            'team_double'  => 'Team Double',
            default        => ucfirst($this->match_mode),
        };
    }
}
