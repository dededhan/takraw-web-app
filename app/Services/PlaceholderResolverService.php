<?php

namespace App\Services;

use App\Models\Match_;
use App\Models\Pool;
use App\Models\PoolStanding;
use App\Models\SuperTeam;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * PlaceholderResolverService
 *
 * Saat pool match terakhir selesai (status = 'finished'),
 * service ini mengganti placeholder di bracket match
 * ("Juara Pool A") dengan ID tim nyata.
 *
 * PENTING: Posisi jadwal (time_slot_id, court_id, day_number)
 * TIDAK diubah — hanya identitas tim yang di-update.
 */
class PlaceholderResolverService
{
    /**
     * Entry point — dipanggil oleh MatchObserver atau ResolvePlaceholderJob.
     *
     * @param  Match_ $finishedMatch Pool match yang baru selesai
     * @return int Jumlah bracket match yang berhasil di-resolve
     */
    public function resolve(Match_ $finishedMatch): int
    {
        if ($finishedMatch->stage !== 'pool' || $finishedMatch->status !== 'finished') {
            return 0;
        }

        $poolId = $finishedMatch->pool_id;
        if (!$poolId) {
            return 0;
        }

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
            // Pool belum selesai, belum saatnya resolve
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

    /**
     * Resolve semua placeholder bracket match yang bersumber dari pool ini.
     */
    protected function resolvePlaceholdersForPool(Pool $pool): int
    {
        $resolved  = 0;
        $mode      = $pool->mode; // match_mode dari pool ini
        $poolName  = $pool->name; // e.g. "A", "B", "C"
        $isTeamMode = in_array($mode, ['team_regu', 'team_double']);

        // Ambil standings untuk pool ini, terurut berdasarkan rank
        $standings = PoolStanding::where('pool_id', $pool->id)
            ->orderBy('rank')
            ->get();

        if ($standings->isEmpty()) {
            Log::warning("PlaceholderResolver: Tidak ada standings untuk Pool #{$pool->id}.");
            return 0;
        }

        // Build mapping: rank → team_id / super_team_id
        $rankMap = [];
        foreach ($standings as $standing) {
            if ($isTeamMode) {
                // Untuk team mode, team_id di standing sebenarnya adalah super_team_id
                $rankMap[$standing->rank] = $standing->super_team_id ?? $standing->team_id;
            } else {
                $rankMap[$standing->rank] = $standing->team_id;
            }
        }

        // Cari semua bracket match yang punya placeholder dari pool ini
        $bracketMatches = Match_::where('tournament_id', $pool->tournament_id)
            ->where('match_mode', $mode)
            ->where('stage', '!=', 'pool')
            ->where(function ($q) use ($poolName) {
                $q->where('home_placeholder', 'LIKE', "%Pool {$poolName}%")
                  ->orWhere('home_placeholder', 'LIKE', "%Bracket {$poolName}%")
                  ->orWhere('away_placeholder', 'LIKE', "%Pool {$poolName}%")
                  ->orWhere('away_placeholder', 'LIKE', "%Bracket {$poolName}%");
            })
            ->get();

        foreach ($bracketMatches as $bracketMatch) {
            $updated = false;

            // Resolve home_placeholder
            if ($bracketMatch->home_placeholder && (str_contains($bracketMatch->home_placeholder, "Pool {$poolName}") || str_contains($bracketMatch->home_placeholder, "Bracket {$poolName}"))) {
                $rank    = $this->extractRankFromPlaceholder($bracketMatch->home_placeholder);
                $teamId  = $rankMap[$rank] ?? null;

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

            // Resolve away_placeholder
            if ($bracketMatch->away_placeholder && (str_contains($bracketMatch->away_placeholder, "Pool {$poolName}") || str_contains($bracketMatch->away_placeholder, "Bracket {$poolName}"))) {
                $rank   = $this->extractRankFromPlaceholder($bracketMatch->away_placeholder);
                $teamId = $rankMap[$rank] ?? null;

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

            if ($updated) {
                // JANGAN ubah time_slot_id, court_id, day_number — hanya tim yang berubah
                $bracketMatch->save();
                $resolved++;
            }
        }

        return $resolved;
    }

    /**
     * Ekstrak rank dari string placeholder.
     * "Juara Pool A"       → 1
     * "Juara 1 Pool A"     → 1
     * "Juara 2 Pool A"     → 2
     * "Runner-up Pool A"   → 2
     * "Peringkat 3 Pool A" → 3
     */
    protected function extractRankFromPlaceholder(string $placeholder): int
    {
        if (preg_match('/Juara\s+1/i', $placeholder)) {
            return 1;
        }
        if (preg_match('/Juara\s+2/i', $placeholder)) {
            return 2;
        }
        if (str_starts_with($placeholder, 'Juara') || str_starts_with($placeholder, 'Winner')) {
            return 1;
        }
        if (str_starts_with($placeholder, 'Runner-up') || str_starts_with($placeholder, 'Runner up')) {
            return 2;
        }
        if (preg_match('/Peringkat\s+(\d+)/i', $placeholder, $matches)) {
            return (int) $matches[1];
        }
        if (preg_match('/Rank\s+(\d+)/i', $placeholder, $matches)) {
            return (int) $matches[1];
        }
        return 1; // Default ke rank 1 jika tidak bisa di-parse
    }
}
