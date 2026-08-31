<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

#[Fillable(['team_id', 'name', 'jersey_number', 'position', 'photo'])]
class Athlete extends Model
{
    use HasFactory;

    protected $appends = ['photo_url'];

    // ─── Relationships ──────────────────────────────

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function setStats(): HasMany
    {
        return $this->hasMany(SetStat::class);
    }

    // ─── Helpers ────────────────────────────────────

    public function getPhotoUrlAttribute(): ?string
    {
        return $this->photo ? Storage::disk('public')->url($this->photo) : null;
    }
}
