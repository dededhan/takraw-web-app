<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['tournament_id', 'day_number', 'slot_number', 'start_time', 'end_time', 'slot_type', 'label'])]
class TimeSlot extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'start_time'  => 'datetime',
            'end_time'    => 'datetime',
            'day_number'  => 'integer',
            'slot_number' => 'integer',
        ];
    }

    // ─── Relationships ──────────────────────────────

    public function tournament(): BelongsTo
    {
        return $this->belongsTo(Tournament::class);
    }

    public function matches(): HasMany
    {
        return $this->hasMany(Match_::class);
    }

    // ─── Helpers ────────────────────────────────────

    public function isMatchSlot(): bool
    {
        return $this->slot_type === 'match';
    }

    public function isIshomaSlot(): bool
    {
        return $this->slot_type === 'ishoma';
    }

    public function isBreakSlot(): bool
    {
        return $this->slot_type === 'break';
    }

    /**
     * Apakah slot ini tersedia untuk diisi pertandingan di lapangan tertentu.
     * (Tidak ada match lain di slot yang sama di lapangan yang sama)
     */
    public function isAvailableForCourt(int $courtId, int $span = 1): bool
    {
        if (!$this->isMatchSlot()) {
            return false;
        }

        // Untuk multi-span (Team mode), cek N slot berturut-turut
        if ($span > 1) {
            // Logika multi-span di-handle oleh MasterScheduleGeneratorService
            return true;
        }

        return !$this->matches()->where('court_id', $courtId)->exists();
    }

    /**
     * Durasi slot dalam menit.
     */
    public function getDurationMinutesAttribute(): int
    {
        if (!$this->start_time || !$this->end_time) {
            return 0;
        }
        return (int) $this->start_time->diffInMinutes($this->end_time);
    }
}
