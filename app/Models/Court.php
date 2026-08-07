<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['tournament_id', 'court_number', 'name', 'is_active'])]
class Court extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'is_active'    => 'boolean',
            'court_number' => 'integer',
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

    /**
     * Ambil semua match di lapangan ini pada hari tertentu,
     * diurutkan berdasarkan slot waktu.
     */
    public function matchesOnDay(int $dayNumber)
    {
        return $this->matches()
                    ->where('day_number', $dayNumber)
                    ->with('timeSlot')
                    ->orderBy('day_number')
                    ->get()
                    ->sortBy(fn($m) => $m->timeSlot?->slot_number);
    }
}
