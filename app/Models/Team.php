<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['name', 'region', 'coach_id', 'is_super_sub', 'parent_super_team_id'])]
class Team extends Model
{
    use HasFactory, SoftDeletes;

    protected $appends = ['is_locked', 'tournaments_count', 'has_match_scores'];

    protected $casts = [
        'is_super_sub' => 'boolean',
    ];

    // ─── Helpers ────────────────────────────────────

    public function parentSuperTeam(): BelongsTo
    {
        return $this->belongsTo(SuperTeam::class, 'parent_super_team_id');
    }

    public function getIsLockedAttribute(): bool
    {
        return false;
    }

    public function getTournamentsCountAttribute(): int
    {
        return $this->tournaments()->count();
    }

    /**
     * Cek apakah tim sudah memiliki nilai pertandingan (skor set, match selesai/live, atau poin pool).
     */
    public function hasMatchScores(): bool
    {
        // 1. Cek apakah ada set dengan skor > 0 di pertandingan tim ini
        $hasScoresInSets = MatchSet::whereHas('match', function ($q) {
            $q->where('home_team_id', $this->id)
              ->orWhere('away_team_id', $this->id);
        })->where(function ($q) {
            $q->where('home_score', '>', 0)
              ->orWhere('away_score', '>', 0);
        })->exists();

        if ($hasScoresInSets) {
            return true;
        }

        // 2. Cek apakah ada pertandingan tim ini yang sudah berjalan atau selesai
        $hasActiveMatches = Match_::where(function ($q) {
            $q->where('home_team_id', $this->id)
              ->orWhere('away_team_id', $this->id);
        })->whereIn('status', ['live', 'completed'])->exists();

        if ($hasActiveMatches) {
            return true;
        }

        // 3. Cek di klasemen pool jika played > 0 atau points_for > 0
        return PoolStanding::where('team_id', $this->id)
            ->where(function ($q) {
                $q->where('played', '>', 0)
                  ->orWhere('points_for', '>', 0);
            })->exists();
    }

    public function getHasMatchScoresAttribute(): bool
    {
        return $this->hasMatchScores();
    }

    /**
     * Roster lock dinonaktifkan sesuai permintaan agar tim selalu dapat diedit/dikelola.
     */
    public function isRosterLocked(): bool
    {
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
