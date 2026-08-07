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
    // Master Schedule fields
    'match_mode', 'court_id', 'time_slot_id', 'day_number', 'slot_span',
    'home_placeholder', 'away_placeholder',
    'home_super_team_id', 'away_super_team_id',
])]
class Match_ extends Model
{
    use HasFactory;

    protected $table = 'matches';

    protected $appends = ['home_display_name', 'away_display_name'];

    protected function casts(): array
    {
        return [
            'scheduled_at' => 'datetime',
            'started_at'   => 'datetime',
            'finished_at'  => 'datetime',
            'slot_span'    => 'integer',
            'day_number'   => 'integer',
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

    // ─── Master Schedule Relationships ─────────────

    public function court(): BelongsTo
    {
        return $this->belongsTo(Court::class);
    }

    public function timeSlot(): BelongsTo
    {
        return $this->belongsTo(TimeSlot::class);
    }

    public function homeSuperTeam(): BelongsTo
    {
        return $this->belongsTo(SuperTeam::class, 'home_super_team_id');
    }

    public function awaySuperTeam(): BelongsTo
    {
        return $this->belongsTo(SuperTeam::class, 'away_super_team_id');
    }

    public function conflicts(): HasMany
    {
        return $this->hasMany(ScheduleConflict::class, 'match_id');
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

    // ─── Master Schedule Helpers ─────────────────

    public function isTeamMode(): bool
    {
        return in_array($this->match_mode, ['team_regu', 'team_double']);
    }

    /**
     * Apakah match ini memiliki placeholder yang belum di-resolve.
     * (Braket match yang menunggu hasil pool selesai)
     */
    public function hasUnresolvedPlaceholder(): bool
    {
        return !is_null($this->home_placeholder) || !is_null($this->away_placeholder);
    }

    /**
     * Tampilkan nama tim A (gunakan placeholder jika belum resolved).
     */
    public function getHomeDisplayNameAttribute(): string
    {
        if ($this->isTeamMode()) {
            return $this->homeSuperTeam?->name ?? $this->home_placeholder ?? 'TBD';
        }
        return $this->homeTeam?->name ?? $this->home_placeholder ?? 'TBD';
    }

    /**
     * Tampilkan nama tim B (gunakan placeholder jika belum resolved).
     */
    public function getAwayDisplayNameAttribute(): string
    {
        if ($this->isTeamMode()) {
            return $this->awaySuperTeam?->name ?? $this->away_placeholder ?? 'TBD';
        }
        return $this->awayTeam?->name ?? $this->away_placeholder ?? 'TBD';
    }

    /**
     * Cek apakah match ini memiliki konflik aktif.
     */
    public function hasActiveConflicts(): bool
    {
        return $this->conflicts()->whereNull('resolved_at')->exists();
    }
}
