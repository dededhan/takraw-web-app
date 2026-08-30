<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

#[Fillable(['name', 'email', 'password', 'role', 'phone', 'is_active'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, SoftDeletes;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    // ─── Helpers ────────────────────────────────────

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isCoach(): bool
    {
        return $this->role === 'coach';
    }

    public function isReferee(): bool
    {
        return $this->role === 'referee';
    }

    // ─── Relationships ──────────────────────────────

    public function createdTournaments(): HasMany
    {
        return $this->hasMany(Tournament::class, 'created_by');
    }

    public function coachedTeams(): HasMany
    {
        return $this->hasMany(Team::class, 'coach_id');
    }

    public function coachedSuperTeams(): HasMany
    {
        return $this->hasMany(SuperTeam::class, 'coach_id');
    }

    public function assignedMatches(): HasMany
    {
        return $this->hasMany(Match_::class, 'referee_id');
    }
}
