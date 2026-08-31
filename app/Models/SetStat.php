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
    'zone_8', 'zone_9', 'zone_10',
    'zone_1_ace', 'zone_2_ace', 'zone_3_ace', 'zone_4_ace', 'zone_5_ace',
    'zone_6_ace', 'zone_7_ace', 'zone_8_ace', 'zone_9_ace', 'zone_10_ace',
    'zone_1_in', 'zone_2_in', 'zone_3_in', 'zone_4_in', 'zone_5_in',
    'zone_6_in', 'zone_7_in', 'zone_8_in', 'zone_9_in', 'zone_10_in',
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
        'zone_8', 'zone_9', 'zone_10',
        'zone_1_ace', 'zone_2_ace', 'zone_3_ace', 'zone_4_ace', 'zone_5_ace',
        'zone_6_ace', 'zone_7_ace', 'zone_8_ace', 'zone_9_ace', 'zone_10_ace',
        'zone_1_in', 'zone_2_in', 'zone_3_in', 'zone_4_in', 'zone_5_in',
        'zone_6_in', 'zone_7_in', 'zone_8_in', 'zone_9_in', 'zone_10_in',
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
