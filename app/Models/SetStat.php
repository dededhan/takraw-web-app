<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'match_set_id', 'athlete_id', 'team_id',
    'service_in', 'service_ace', 'service_error',
    'receive_success', 'receive_fail',
    'feeding_success', 'feeding_fail',
    'strike_success', 'strike_fail',
    'block_success', 'block_fail',
    'zone_1', 'zone_2', 'zone_3', 'zone_4',
    'zone_5', 'zone_6', 'zone_7',
])]
class SetStat extends Model
{
    use HasFactory;

    /**
     * All stat columns that can be incremented/decremented by the referee.
     */
    public const STAT_COLUMNS = [
        'service_in', 'service_ace', 'service_error',
        'receive_success', 'receive_fail',
        'feeding_success', 'feeding_fail',
        'strike_success', 'strike_fail',
        'block_success', 'block_fail',
        'zone_1', 'zone_2', 'zone_3', 'zone_4',
        'zone_5', 'zone_6', 'zone_7',
    ];

    // ─── Relationships ──────────────────────────────

    public function matchSet(): BelongsTo
    {
        return $this->belongsTo(MatchSet::class, 'match_set_id');
    }

    public function athlete(): BelongsTo
    {
        return $this->belongsTo(Athlete::class);
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    // ─── Helpers ────────────────────────────────────

    /**
     * Get total services attempted.
     */
    public function getTotalServicesAttribute(): int
    {
        return $this->service_in + $this->service_ace + $this->service_error;
    }

    /**
     * Get service success rate.
     */
    public function getServiceRateAttribute(): float
    {
        $total = $this->total_services;
        return $total > 0 ? round(($this->service_in + $this->service_ace) / $total * 100, 1) : 0.0;
    }

    /**
     * Get strike success rate.
     */
    public function getStrikeRateAttribute(): float
    {
        $total = $this->strike_success + $this->strike_fail;
        return $total > 0 ? round($this->strike_success / $total * 100, 1) : 0.0;
    }
}
