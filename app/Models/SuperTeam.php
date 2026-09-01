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

    protected $appends = ['is_locked'];

    // ─── Relationships ──────────────────────────────

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
        return $this->isRosterLocked();
    }

    /**
     * Cek apakah roster Super Team terkunci karena sudah dinilai saat bertanding (live/finished match atau ada set_stats).
     */
    public function isRosterLocked(): bool
    {
        // 1. Cek apakah Super Team pernah/sedang bertanding di match berstatus 'live' atau 'finished'
        if ($this->homeMatches()->whereIn('status', ['live', 'finished'])->exists()
            || $this->awayMatches()->whereIn('status', ['live', 'finished'])->exists()) {
            return true;
        }

        // 2. Cek apakah sub-tim anggota sudah memiliki catatan statistik penilaian (set_stats)
        if ($this->members()->whereHas('setStats')->exists()) {
            return true;
        }

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
