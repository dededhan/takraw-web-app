<?php

namespace App\Services;

use App\Models\Match_;
use App\Models\Pool;
use App\Models\PoolStanding;
use App\Models\SuperTeam;
use App\Models\Tournament;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * PlaceholderResolverService
 *
 * Saat pool match terakhir selesai (status = 'finished') atau saat match dibuka,
 * service ini mengganti placeholder di bracket match ("Juara Pool B") dengan ID tim nyata.
 *
 * PENTING: Posisi jadwal (time_slot_id, court_id, day_number)
 * TIDAK diubah — hanya identitas tim yang di-update.
 */
class PlaceholderResolverService
{
    /**
     * Entry point — dipanggil saat match selesai (pool match atau bracket match).
     *
     * @param  Match_ $finishedMatch Match yang baru selesai
     * @return int Jumlah bracket match yang berhasil di-resolve / di-update
     */
    public function resolve(Match_ $finishedMatch): int
    {
        if ($finishedMatch->status !== 'finished') {
            return 0;
        }

        // Jika ini pool stage match:
        if ($finishedMatch->stage === 'pool') {
            $poolId = $finishedMatch->pool_id;
            if (!$poolId) {
                return 0;
            }

            // Pastikan klasemen pool ter-recalculate terbaru
            PoolStanding::recalculate($poolId);

            $pool = Pool::with(['tournament', 'standings.team'])->find($poolId);
            if (!$pool) {
                return 0;
            }

            // Cek apakah SEMUA pool match dalam pool ini sudah selesai
            $unfinishedCount = Match_::where('pool_id', $poolId)
                ->where('stage', 'pool')
                ->where('status', '!=', 'finished')
                ->count();

            if ($unfinishedCount > 0) {
                Log::info("PlaceholderResolver: Pool #{$poolId} belum selesai ({$unfinishedCount} match tersisa).");
                return 0;
            }

            Log::info("PlaceholderResolver: Pool #{$poolId} selesai. Mulai resolve placeholder...");

            DB::beginTransaction();
            try {
                $resolved = $this->resolvePlaceholdersForPool($pool);
                DB::commit();

                Log::info("PlaceholderResolver: {$resolved} bracket match di-resolve untuk Pool #{$poolId}.");
                return $resolved;
            } catch (\Exception $e) {
                DB::rollBack();
                Log::error("PlaceholderResolver ERROR: " . $e->getMessage());
                throw $e;
            }
        }

        // Jika ini bracket match: majukan pemenang ke next_match_id
        if ($finishedMatch->stage !== 'pool' && $finishedMatch->next_match_id) {
            $winnerId = $finishedMatch->isTeamMode()
                ? $finishedMatch->winner_super_team_id
                : $finishedMatch->winner_team_id;

            if ($winnerId) {
                $advanced = $this->advanceWinnerToNextMatch($finishedMatch, $winnerId, $finishedMatch->isTeamMode());
                return $advanced ? 1 : 0;
            }
        }

        return 0;
    }

    /**
     * Resolve semua placeholder bracket match yang bersumber dari pool ini.
     */
    public function resolvePlaceholdersForPool(Pool $pool): int
    {
        $resolved   = 0;
        $mode       = $pool->mode; // match_mode dari pool ini
        $poolName   = strtoupper(trim($pool->name)); // e.g. "B", "E"
        $isTeamMode = in_array($mode, ['team_regu', 'team_double']);

        // Pastikan klasemen segar
        PoolStanding::recalculate($pool->id);

        $standings = PoolStanding::where('pool_id', $pool->id)
            ->whereNotNull('rank')
            ->orderBy('rank')
            ->get();

        if ($standings->isEmpty()) {
            Log::warning("PlaceholderResolver: Tidak ada standings untuk Pool #{$pool->id}.");
            return 0;
        }

        // Build mapping: rank -> contestant ID
        $rankMap = [];
        foreach ($standings as $standing) {
            if ($isTeamMode) {
                $rankMap[$standing->rank] = $standing->super_team_id ?? $standing->team_id;
            } else {
                $rankMap[$standing->rank] = $standing->team_id;
            }
        }

        // Query match bracket di turnamen dan mode yang sesuai
        $query = Match_::where('tournament_id', $pool->tournament_id)
            ->where('match_mode', $mode)
            ->where('stage', '!=', 'pool');

        // Jika pool memiliki bracket_name tertentu (multi-bracket), utamakan bracket_group yang sama
        if (!empty($pool->bracket_name)) {
            $query->where(function ($q) use ($pool) {
                $q->where('bracket_group', $pool->bracket_name)
                  ->orWhereNull('bracket_group')
                  ->orWhere('bracket_group', '');
            });
        }

        $bracketMatches = $query->get();

        foreach ($bracketMatches as $bracketMatch) {
            $updated = false;

            // 1. Cek home_placeholder
            if ($bracketMatch->home_placeholder) {
                $parsed = $this->parsePoolPlaceholder($bracketMatch->home_placeholder);
                if ($parsed && strtoupper($parsed['pool']) === $poolName) {
                    $teamId = $rankMap[$parsed['rank']] ?? null;
                    if ($teamId) {
                        if ($isTeamMode) {
                            $bracketMatch->home_super_team_id = $teamId;
                        } else {
                            $bracketMatch->home_team_id = $teamId;
                        }
                        $bracketMatch->home_placeholder = null;
                        $updated = true;
                    }
                }
            }

            // 2. Cek away_placeholder
            if ($bracketMatch->away_placeholder) {
                $parsed = $this->parsePoolPlaceholder($bracketMatch->away_placeholder);
                if ($parsed && strtoupper($parsed['pool']) === $poolName) {
                    $teamId = $rankMap[$parsed['rank']] ?? null;
                    if ($teamId) {
                        if ($isTeamMode) {
                            $bracketMatch->away_super_team_id = $teamId;
                        } else {
                            $bracketMatch->away_team_id = $teamId;
                        }
                        $bracketMatch->away_placeholder = null;
                        $updated = true;
                    }
                }
            }

            if ($updated) {
                $bracketMatch->save();
                $resolved++;
            }
        }

        return $resolved;
    }

    /**
     * Resolve langsung untuk 1 match tertentu (misal saat membuka /scoring/{match}).
     * Mencoba menyelesaikan home dan away placeholder dari data pool atau match sebelumnya yang sudah siap.
     *
     * @param  Match_ $bracketMatch
     * @return bool True jika ada tim yang berhasil di-resolve
     */
    public function resolveForMatch(Match_ $bracketMatch): bool
    {
        if ($bracketMatch->stage === 'pool') {
            return false;
        }

        $updated = false;
        $isTeamMode = $bracketMatch->isTeamMode();

        // 1. Resolve Home Side jika belum terisi tim
        $homeId = $isTeamMode ? $bracketMatch->home_super_team_id : $bracketMatch->home_team_id;
        if (!$homeId && $bracketMatch->home_placeholder) {
            $resolvedId = $this->resolveContestantForPlaceholder($bracketMatch, $bracketMatch->home_placeholder, 'home');
            if ($resolvedId) {
                if ($isTeamMode) {
                    $bracketMatch->home_super_team_id = $resolvedId;
                } else {
                    $bracketMatch->home_team_id = $resolvedId;
                }
                $bracketMatch->home_placeholder = null;
                $updated = true;
            }
        }

        // 2. Resolve Away Side jika belum terisi tim
        $awayId = $isTeamMode ? $bracketMatch->away_super_team_id : $bracketMatch->away_team_id;
        if (!$awayId && $bracketMatch->away_placeholder) {
            $resolvedId = $this->resolveContestantForPlaceholder($bracketMatch, $bracketMatch->away_placeholder, 'away');
            if ($resolvedId) {
                if ($isTeamMode) {
                    $bracketMatch->away_super_team_id = $resolvedId;
                } else {
                    $bracketMatch->away_team_id = $resolvedId;
                }
                $bracketMatch->away_placeholder = null;
                $updated = true;
            }
        }

        // 3. Resolve dari relasi previousMatches jika masih ada sisi yang belum terisi
        if ((!$bracketMatch->home_team_id && !$bracketMatch->home_super_team_id) ||
            (!$bracketMatch->away_team_id && !$bracketMatch->away_super_team_id)) {
            $prevMatches = $bracketMatch->previousMatches()->where('status', 'finished')->get();
            foreach ($prevMatches as $pm) {
                $pmWinner = $isTeamMode ? $pm->winner_super_team_id : $pm->winner_team_id;
                if (!$pmWinner) continue;

                $targetSide = ($pm->bracket_position % 2 === 1) ? 'home' : 'away';

                if ($targetSide === 'home' && !$bracketMatch->home_team_id && !$bracketMatch->home_super_team_id) {
                    if ($isTeamMode) {
                        $bracketMatch->home_super_team_id = $pmWinner;
                    } else {
                        $bracketMatch->home_team_id = $pmWinner;
                    }
                    $bracketMatch->home_placeholder = null;
                    $updated = true;
                } elseif ($targetSide === 'away' && !$bracketMatch->away_team_id && !$bracketMatch->away_super_team_id) {
                    if ($isTeamMode) {
                        $bracketMatch->away_super_team_id = $pmWinner;
                    } else {
                        $bracketMatch->away_team_id = $pmWinner;
                    }
                    $bracketMatch->away_placeholder = null;
                    $updated = true;
                }
            }
        }

        if ($updated) {
            $bracketMatch->save();
        }

        return $updated;
    }

    /**
     * Resolve semua placeholder di satu turnamen (bisa dipanggil dari controller bracket/scoring).
     */
    public function resolveAllForTournament(Tournament|int $tournament): int
    {
        $tournamentId = is_numeric($tournament) ? $tournament : $tournament->id;
        $bracketMatches = Match_::where('tournament_id', $tournamentId)
            ->where('stage', '!=', 'pool')
            ->where(function ($q) {
                $q->whereNotNull('home_placeholder')
                  ->orWhereNotNull('away_placeholder')
                  ->orWhereNull('home_team_id')
                  ->orWhereNull('away_team_id');
            })
            ->get();

        $resolvedCount = 0;
        foreach ($bracketMatches as $match) {
            if ($this->resolveForMatch($match)) {
                $resolvedCount++;
            }
        }

        return $resolvedCount;
    }

    /**
     * Majukan pemenang match saat ini ke babak berikutnya (next_match_id) secara presisi.
     */
    public function advanceWinnerToNextMatch(Match_ $match, int $winnerId, bool $isTeamMode): bool
    {
        if (!$match->next_match_id) {
            return false;
        }

        $nextMatch = Match_::find($match->next_match_id);
        if (!$nextMatch) {
            return false;
        }

        // Tentukan apakah match ini mengalir ke sisi Home (posisi ganjil) atau Away (posisi genap)
        $isHomeFeeder = ($match->bracket_position % 2 === 1);

        if ($isHomeFeeder) {
            if ($isTeamMode) {
                $nextMatch->home_super_team_id = $winnerId;
            } else {
                $nextMatch->home_team_id = $winnerId;
            }
            $nextMatch->home_placeholder = null;
        } else {
            if ($isTeamMode) {
                $nextMatch->away_super_team_id = $winnerId;
            } else {
                $nextMatch->away_team_id = $winnerId;
            }
            $nextMatch->away_placeholder = null;
        }

        $nextMatch->save();
        Log::info("PlaceholderResolver: Winner of Match #{$match->id} (Team #{$winnerId}) advanced to Match #{$nextMatch->id} (" . ($isHomeFeeder ? 'HOME' : 'AWAY') . ")");

        return true;
    }

    /**
     * Coba cari contestant ID dari string placeholder (baik dari Pool atau Match sebelumnya).
     */
    protected function resolveContestantForPlaceholder(Match_ $match, string $placeholder, string $side): ?int
    {
        $isTeamMode = $match->isTeamMode();

        // 1. Coba parse sebagai Pool (e.g. "Juara Pool B", "Runner-up Pool E")
        $poolInfo = $this->parsePoolPlaceholder($placeholder);
        if ($poolInfo) {
            $poolName = $poolInfo['pool'];
            $rank     = $poolInfo['rank'];

            // Cari pool yang cocok dalam turnamen & mode ini
            $poolQuery = Pool::where('tournament_id', $match->tournament_id)
                ->where(function ($q) use ($match) {
                    $q->where('mode', $match->match_mode)
                      ->orWhere('match_mode', $match->match_mode);
                })
                ->where(function ($q) use ($poolName) {
                    $q->where('name', $poolName)
                      ->orWhere('name', 'LIKE', "%{$poolName}%");
                });

            if (!empty($match->bracket_group)) {
                $poolQuery->where(function ($q) use ($match) {
                    $q->where('bracket_name', $match->bracket_group)
                      ->orWhereNull('bracket_name')
                      ->orWhere('bracket_name', '');
                });
            }

            $pool = $poolQuery->first();
            if ($pool) {
                // Pastikan standings di-recalculate
                PoolStanding::recalculate($pool->id);

                // Cek apakah pool sudah ada standing untuk rank yang dicari
                $standing = PoolStanding::where('pool_id', $pool->id)
                    ->where('rank', $rank)
                    ->first();

                if ($standing) {
                    return $isTeamMode
                        ? ($standing->super_team_id ?? $standing->team_id)
                        : $standing->team_id;
                }
            }
        }

        // 2. Coba cek apakah placeholder merujuk ke nomor Match (e.g. "Pemenang Match #54", "Pemenang #54")
        if (preg_match('/(?:pemenang|winner|kalah|loser)(?:\s+match)?\s*#?(\d+)/i', $placeholder, $m)) {
            $refNumber = (int) $m[1];
            // Cari match dengan ID tersebut atau urutan master schedule
            $refMatch = Match_::where('tournament_id', $match->tournament_id)->find($refNumber);
            if (!$refMatch) {
                // Coba cari berdasarkan index/urutan
                $allOrdered = Match_::where('tournament_id', $match->tournament_id)
                    ->orderBy('day_number')
                    ->orderBy('time_slot_id')
                    ->orderBy('court_id')
                    ->get();
                $refMatch = $allOrdered->get($refNumber - 1);
            }

            if ($refMatch && $refMatch->status === 'finished') {
                return $isTeamMode ? $refMatch->winner_super_team_id : $refMatch->winner_team_id;
            }
        }

        return null;
    }

    /**
     * Ekstrak nama pool dan peringkat dari string placeholder secara tangguh.
     *
     * Contoh:
     * - "Juara Pool B"       -> ['pool' => 'B', 'rank' => 1]
     * - "Runner-up Pool E"   -> ['pool' => 'E', 'rank' => 2]
     * - "Runner-Up Pool E"   -> ['pool' => 'E', 'rank' => 2]
     * - "Peringkat 3 Pool A" -> ['pool' => 'A', 'rank' => 3]
     * - "pool_B_rank_1"      -> ['pool' => 'B', 'rank' => 1]
     *
     * @param  string $placeholder
     * @return array|null ['pool' => string, 'rank' => int]
     */
    public function parsePoolPlaceholder(string $placeholder): ?array
    {
        $p = trim($placeholder);

        // 1. Format raw: pool_B_rank_1
        if (preg_match('/^pool_([A-Za-z0-9]+)_rank_(\d+)$/i', $p, $m)) {
            return ['pool' => strtoupper($m[1]), 'rank' => (int) $m[2]];
        }

        // 2. Tentukan rank
        $rank = 1;
        if (preg_match('/juara\s*2/i', $p) || preg_match('/runner[-\s]?up/i', $p)) {
            $rank = 2;
        } elseif (preg_match('/juara\s*1/i', $p) || preg_match('/juara/i', $p) || preg_match('/winner/i', $p)) {
            $rank = 1;
        } elseif (preg_match('/(?:peringkat|rank)\s*(\d+)/i', $p, $m)) {
            $rank = (int) $m[1];
        }

        // 3. Tentukan nama pool
        if (preg_match('/(?:pool|bracket)\s+([A-Za-z0-9]+)/i', $p, $m)) {
            return ['pool' => strtoupper($m[1]), 'rank' => $rank];
        }
        if (preg_match('/(?:juara|runner[-\s]?up|winner|peringkat\s*\d+)\s+([A-Za-z0-9]+)$/i', $p, $m)) {
            return ['pool' => strtoupper($m[1]), 'rank' => $rank];
        }

        return null;
    }

    /**
     * Ekstrak rank saja dari string placeholder.
     */
    public function extractRankFromPlaceholder(string $placeholder): int
    {
        $parsed = $this->parsePoolPlaceholder($placeholder);
        return $parsed ? $parsed['rank'] : 1;
    }
}
