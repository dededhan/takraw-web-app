<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'name', 'start_date', 'end_date', 'mode', 'status', 'created_by',
    // Master Schedule config
    'total_days', 'courts_count',
    'session_start_time', 'session_end_time',
    'session_duration_minutes', 'break_duration_minutes',
    'ishoma_start_time', 'ishoma_end_time', 'ishoma_duration_minutes',
    'schedule_status',
])]
class Tournament extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * Get the attributes that should be cast.
     */
    protected function casts(): array
    {
        return [
            'start_date'               => 'date',
            'end_date'                 => 'date',
            'total_days'               => 'integer',
            'courts_count'             => 'integer',
            'session_duration_minutes' => 'integer',
            'break_duration_minutes'   => 'integer',
            'ishoma_duration_minutes'  => 'integer',
        ];
    }

    // ─── Relationships ──────────────────────────────

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function teams(): BelongsToMany
    {
        return $this->belongsToMany(Team::class, 'tournament_teams')
                    ->withPivot('registered_at');
    }

    public function pools(): HasMany
    {
        return $this->hasMany(Pool::class);
    }

    public function matches(): HasMany
    {
        return $this->hasMany(Match_::class);
    }

    // ─── Master Schedule Relationships ─────────────

    public function modes(): HasMany
    {
        return $this->hasMany(TournamentMode::class);
    }

    public function courts(): HasMany
    {
        return $this->hasMany(Court::class)->orderBy('court_number');
    }

    public function timeSlots(): HasMany
    {
        return $this->hasMany(TimeSlot::class)->orderBy('day_number')->orderBy('slot_number');
    }

    public function superTeams(): HasMany
    {
        return $this->hasMany(SuperTeam::class);
    }

    public function bracketMatrices(): HasMany
    {
        return $this->hasMany(BracketMatrix::class);
    }

    public function scheduleConflicts(): HasMany
    {
        return $this->hasMany(ScheduleConflict::class);
    }

    // ─── Helpers ────────────────────────────────────

    public function isSchedulePublished(): bool
    {
        return $this->schedule_status === 'published';
    }

    public function isScheduleGenerated(): bool
    {
        return in_array($this->schedule_status, ['draft', 'published']);
    }

    public function hasActiveMode(string $mode): bool
    {
        return $this->modes()->where('match_mode', $mode)->where('is_active', true)->exists();
    }

    public function getActiveModes(): array
    {
        return $this->modes()->where('is_active', true)->pluck('match_mode')->toArray();
    }

    public function getUnresolvedConflictsCountAttribute(): int
    {
        return $this->scheduleConflicts()->whereNull('resolved_at')->count();
    }
}
