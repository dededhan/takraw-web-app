<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Named Match_ to avoid conflict with PHP reserved word 'match'.
 * Table name is explicitly set to 'matches'.
 */
#[Fillable([
    'tournament_id', 'pool_id', 'stage', 'bracket_position',
    'home_team_id', 'away_team_id', 'referee_id',
    'court_number', 'max_sets', 'winner_team_id',
    'next_match_id', 'status', 'scheduled_at', 'started_at', 'finished_at',
])]
class Match_ extends Model
{
    use HasFactory;

    protected $table = 'matches';

    protected function casts(): array
    {
        return [
            'scheduled_at' => 'datetime',
            'started_at' => 'datetime',
            'finished_at' => 'datetime',
        ];
    }

    // ─── Relationships ──────────────────────────────

    public function tournament(): BelongsTo
    {
        return $this->belongsTo(Tournament::class);
    }

    public function pool(): BelongsTo
    {
        return $this->belongsTo(Pool::class);
    }

    public function homeTeam(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'home_team_id');
    }

    public function awayTeam(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'away_team_id');
    }

    public function referee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'referee_id');
    }

    public function winner(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'winner_team_id');
    }

    public function nextMatch(): BelongsTo
    {
        return $this->belongsTo(self::class, 'next_match_id');
    }

    public function previousMatches(): HasMany
    {
        return $this->hasMany(self::class, 'next_match_id');
    }

    public function sets(): HasMany
    {
        return $this->hasMany(MatchSet::class, 'match_id');
    }

    // ─── Helpers ────────────────────────────────────

    public function isPoolStage(): bool
    {
        return $this->stage === 'pool';
    }

    public function isBracketStage(): bool
    {
        return !$this->isPoolStage();
    }

    public function isLive(): bool
    {
        return $this->status === 'live';
    }

    public function isFinished(): bool
    {
        return $this->status === 'finished';
    }
}
