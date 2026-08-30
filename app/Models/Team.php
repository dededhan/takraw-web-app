<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['name', 'region', 'coach_id'])]
class Team extends Model
{
    use HasFactory, SoftDeletes;

    protected $appends = ['is_locked', 'tournaments_count'];

    // ─── Helpers ────────────────────────────────────

    public function getIsLockedAttribute(): bool
    {
        return $this->isRosterLocked();
    }

    public function getTournamentsCountAttribute(): int
    {
        return $this->tournaments()->count();
    }

    /**
     * Cek apakah roster tim ini terkunci karena pernah/sedang mengikuti turnamen.
     */
    public function isRosterLocked(): bool
    {
        if ($this->tournaments()->exists()) {
            return true;
        }

        if ($this->homeMatches()->exists() || $this->awayMatches()->exists()) {
            return true;
        }

        if ($this->superTeams()->whereNotNull('tournament_id')->exists()) {
            return true;
        }

        return false;
    }

    // ─── Relationships ──────────────────────────────

    public function coach(): BelongsTo
    {
        return $this->belongsTo(User::class, 'coach_id');
    }

    public function superTeams(): BelongsToMany
    {
        return $this->belongsToMany(SuperTeam::class, 'super_team_members');
    }

    public function athletes(): HasMany
    {
        return $this->hasMany(Athlete::class);
    }

    public function tournaments(): BelongsToMany
    {
        return $this->belongsToMany(Tournament::class, 'tournament_teams')
                    ->withPivot('registered_at');
    }

    public function pools(): BelongsToMany
    {
        return $this->belongsToMany(Pool::class, 'pool_teams');
    }

    public function homeMatches(): HasMany
    {
        return $this->hasMany(Match_::class, 'home_team_id');
    }

    public function awayMatches(): HasMany
    {
        return $this->hasMany(Match_::class, 'away_team_id');
    }

    public function setStats(): HasMany
    {
        return $this->hasMany(SetStat::class);
    }
}
