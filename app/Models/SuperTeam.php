<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Super Team adalah entitas untuk Mode Team (team_regu / team_double).
 * Satu Super Team terdiri dari 3 tim regu biasa yang bergabung.
 * Contoh: "TRA (Team Regu Putra)" = 1 super team yang berisi 3 tim regu.
 */
#[Fillable(['tournament_id', 'pool_id', 'name', 'match_mode', 'created_by', 'coach_id'])]
class SuperTeam extends Model
{
    use HasFactory, SoftDeletes;

    protected $appends = ['is_locked', 'has_match_scores'];

    protected static function booted(): void
    {
        static::saved(function (SuperTeam $superTeam) {
            if ($superTeam->tournament_id) {
                \Illuminate\Support\Facades\DB::table('tournament_super_teams')->insertOrIgnore([
                    'tournament_id' => $superTeam->tournament_id,
                    'super_team_id' => $superTeam->id,
                    'match_mode'    => $superTeam->match_mode ?? 'team_regu',
                    'registered_at' => $superTeam->created_at ?? now(),
                    'created_at'    => now(),
                    'updated_at'    => now(),
                ]);
            }
        });
    }

    public function tournaments(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(Tournament::class, 'tournament_super_teams')
                    ->withPivot(['registered_at', 'match_mode'])
                    ->withTimestamps();
    }

    public function tournament(): BelongsTo
    {
        return $this->belongsTo(Tournament::class);
    }

    public function coach(): BelongsTo
    {
        return $this->belongsTo(User::class, 'coach_id');
    }

    public function pool(): BelongsTo
    {
        return $this->belongsTo(Pool::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function getIsLockedAttribute(): bool
    {
        return false;
    }

    /**
     * Cek apakah super team sudah memiliki nilai pertandingan (skor set, match berjalan, atau poin pool).
     */
    public function hasMatchScores(): bool
    {
        // 1. Cek apakah ada anggota super team (tim regu) yang memiliki skor
        foreach ($this->members as $member) {
            if ($member->hasMatchScores()) {
                return true;
            }
        }

        // 2. Cek apakah super team terdaftar di pool standings dengan played > 0 atau points_for > 0
        $hasStanding = PoolStanding::where('super_team_id', $this->id)
            ->where(function ($q) {
                $q->where('played', '>', 0)
                  ->orWhere('points_for', '>', 0);
            })->exists();

        if ($hasStanding) {
            return true;
        }

        // 3. Cek apakah super team ada di matches live atau completed
        return Match_::where(function ($q) {
            $q->where('home_super_team_id', $this->id)
              ->orWhere('away_super_team_id', $this->id);
        })->whereIn('status', ['live', 'completed'])->exists();
    }

    public function getHasMatchScoresAttribute(): bool
    {
        return $this->hasMatchScores();
    }

    /**
     * Roster lock dinonaktifkan sesuai permintaan agar Super Team selalu dapat diedit/dikelola.
     */
    public function isRosterLocked(): bool
    {
        return false;
    }

    /**
     * Tim-tim regu yang menjadi anggota Super Team ini.
     * (via super_team_members pivot)
     */
    public function members(): BelongsToMany
    {
        return $this->belongsToMany(Team::class, 'super_team_members')
                    ->withTimestamps();
    }

    /**
     * Match di mana Super Team ini bertanding sebagai tim A (home).
     */
    public function homeMatches(): HasMany
    {
        return $this->hasMany(Match_::class, 'home_super_team_id');
    }

    /**
     * Match di mana Super Team ini bertanding sebagai tim B (away).
     */
    public function awayMatches(): HasMany
    {
        return $this->hasMany(Match_::class, 'away_super_team_id');
    }

    // ─── Helpers ────────────────────────────────────

    public function isTeamRegu(): bool
    {
        return $this->match_mode === 'team_regu';
    }

    public function isTeamDouble(): bool
    {
        return $this->match_mode === 'team_double';
    }

    public function getMemberCountAttribute(): int
    {
        return $this->members()->count();
    }

    /**
     * Apakah Super Team sudah lengkap (memiliki 3 anggota tim).
     */
    public function isComplete(): bool
    {
        return $this->members()->count() >= 3;
    }
}
