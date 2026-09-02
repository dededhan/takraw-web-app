<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['tournament_id', 'name', 'match_mode', 'bracket_name', 'bracket_number'])]
class Pool extends Model
{
    use HasFactory;

    protected $appends = ['display_name'];

    // ─── Relationships ──────────────────────────────

    public function tournament(): BelongsTo
    {
        return $this->belongsTo(Tournament::class);
    }

    public function teams(): BelongsToMany
    {
        return $this->belongsToMany(Team::class, 'pool_teams');
    }

    public function standings(): HasMany
    {
        return $this->hasMany(PoolStanding::class);
    }

    public function matches(): HasMany
    {
        return $this->hasMany(Match_::class);
    }

    public function superTeams(): BelongsToMany
    {
        return $this->belongsToMany(SuperTeam::class, 'pool_standings', 'pool_id', 'super_team_id');
    }

    /**
     * Alias mode -> match_mode untuk fleksibilitas query.
     */
    public function getModeAttribute(): ?string
    {
        return $this->match_mode;
    }

    /**
     * Nama tampilan lengkap (misal: "Bracket 1 - Pool A" atau "Pool A").
     */
    public function getDisplayNameAttribute(): string
    {
        if ($this->bracket_name) {
            return "{$this->bracket_name} - Pool {$this->name}";
        }
        return "Pool {$this->name}";
    }
}
