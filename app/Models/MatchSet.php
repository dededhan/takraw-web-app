<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['match_id', 'set_number', 'home_score', 'away_score', 'winner_team_id', 'winner_super_team_id', 'status', 'started_at', 'finished_at'])]
class MatchSet extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'finished_at' => 'datetime',
        ];
    }

    // ─── Relationships ──────────────────────────────

    public function match(): BelongsTo
    {
        return $this->belongsTo(Match_::class, 'match_id');
    }

    public function winner(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'winner_team_id');
    }

    public function winnerSuperTeam(): BelongsTo
    {
        return $this->belongsTo(SuperTeam::class, 'winner_super_team_id');
    }

    public function stats(): HasMany
    {
        return $this->hasMany(SetStat::class, 'match_set_id');
    }

    public function setStats(): HasMany
    {
        return $this->hasMany(SetStat::class, 'match_set_id');
    }

    // ─── Helpers ────────────────────────────────────

    public function isLive(): bool
    {
        return $this->status === 'live';
    }

    public function isFinished(): bool
    {
        return $this->status === 'finished';
    }
}
