<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'tournament_id', 'match_mode', 'bracket_stage',
    'bracket_position', 'home_source', 'away_source',
])]
class BracketMatrix extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'bracket_position' => 'integer',
        ];
    }

    // ─── Relationships ──────────────────────────────

    public function tournament(): BelongsTo
    {
        return $this->belongsTo(Tournament::class);
    }

    // ─── Helpers ────────────────────────────────────

    /**
     * Parse source string ke array [pool_name, rank] atau special values.
     * Format: "pool_A_rank_1" → ['type'=>'pool', 'pool'=>'A', 'rank'=>1]
     *         "bye"           → ['type'=>'bye']
     *         "wildcard_1"    → ['type'=>'wildcard', 'position'=>1]
     *         "winner_pos_1"  → ['type'=>'winner', 'position'=>1]
     */
    public static function parseSource(string $source): array
    {
        if ($source === 'bye') {
            return ['type' => 'bye'];
        }

        if (str_starts_with($source, 'pool_')) {
            // pool_A_rank_1
            preg_match('/^pool_([A-Z])_rank_(\d+)$/', $source, $m);
            if ($m) {
                return ['type' => 'pool', 'pool' => $m[1], 'rank' => (int) $m[2]];
            }
        }

        if (str_starts_with($source, 'wildcard_')) {
            return ['type' => 'wildcard', 'position' => (int) substr($source, 9)];
        }

        if (str_starts_with($source, 'winner_pos_')) {
            return ['type' => 'winner', 'position' => (int) substr($source, 11)];
        }

        return ['type' => 'unknown', 'raw' => $source];
    }

    /**
     * Label tampilan untuk sumber tim (human-readable).
     */
    public function getHomeLabelAttribute(): string
    {
        return $this->sourceToLabel($this->home_source);
    }

    public function getAwayLabelAttribute(): string
    {
        return $this->sourceToLabel($this->away_source);
    }

    protected function sourceToLabel(string $source): string
    {
        $parsed = self::parseSource($source);
        return match ($parsed['type']) {
            'pool'     => "Juara Pool {$parsed['pool']}" . ($parsed['rank'] > 1 ? " (Peringkat {$parsed['rank']})" : ''),
            'bye'      => 'BYE (Langsung Lolos)',
            'wildcard' => "Wildcard #{$parsed['position']}",
            'winner'   => "Pemenang Posisi #{$parsed['position']}",
            default    => $source,
        };
    }
}
