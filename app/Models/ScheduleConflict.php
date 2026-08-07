<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'tournament_id', 'match_id', 'conflict_type', 'severity',
    'description', 'conflicting_match_id', 'resolved_at',
])]
class ScheduleConflict extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'resolved_at' => 'datetime',
        ];
    }

    // ─── Relationships ──────────────────────────────

    public function tournament(): BelongsTo
    {
        return $this->belongsTo(Tournament::class);
    }

    public function match(): BelongsTo
    {
        return $this->belongsTo(Match_::class, 'match_id');
    }

    public function conflictingMatch(): BelongsTo
    {
        return $this->belongsTo(Match_::class, 'conflicting_match_id');
    }

    // ─── Scopes ─────────────────────────────────────

    /**
     * Hanya konflik yang belum di-resolve.
     */
    public function scopeUnresolved($query)
    {
        return $query->whereNull('resolved_at');
    }

    /**
     * Hanya konflik dengan severity 'error'.
     */
    public function scopeErrors($query)
    {
        return $query->where('severity', 'error');
    }

    // ─── Helpers ────────────────────────────────────

    public function isResolved(): bool
    {
        return !is_null($this->resolved_at);
    }

    public function isError(): bool
    {
        return $this->severity === 'error';
    }

    /**
     * Resolves this conflict (mark as fixed).
     */
    public function markResolved(): void
    {
        $this->update(['resolved_at' => now()]);
    }

    /**
     * Icon dan warna untuk tampilan di UI.
     */
    public function getConflictTypeIconAttribute(): string
    {
        return match ($this->conflict_type) {
            'time_overlap'       => '⚡',
            'rest_violation'     => '😴',
            'bracket_dependency' => '🔗',
            'ishoma_overlap'     => '🕌',
            default              => '⚠️',
        };
    }
}
