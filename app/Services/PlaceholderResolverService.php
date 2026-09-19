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
     * Menggunakan BracketMatrix dan/atau placeholder sebagai acuan permanen.
     * Jika pemenang pool berubah dan match babak gugur belum selesai, tim otomatis diperbarui.
     */
    public function resolvePlaceholdersForPool(Pool $pool): int
    {
        $resolved   = 0;
        $mode       = $pool->match_mode ?: ($pool->tournament?->mode ?? 'regu');
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

        // Query match bracket di turnamen dan mode yang sesuai (hanya yang belum finished)
        $query = Match_::where('tournament_id', $pool->tournament_id)
            ->where('match_mode', $mode)
            ->where('stage', '!=', 'pool')
            ->where('status', '!=', 'finished');

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

            // Cari BracketMatrix jika ada untuk match ini
            $matrix = \App\Models\BracketMatrix::where('tournament_id', $bracketMatch->tournament_id)
                ->where('match_mode', $bracketMatch->match_mode)
                ->where('bracket_stage', $bracketMatch->stage)
                ->where('bracket_position', $bracketMatch->bracket_position)
                ->when(!empty($bracketMatch->bracket_group), function ($q) use ($bracketMatch) {
                    $q->where(function ($sub) use ($bracketMatch) {
                        $sub->where('bracket_name', $bracketMatch->bracket_group)
                            ->orWhereNull('bracket_name')
                            ->orWhere('bracket_name', '');
                    });
                })
                ->first();

            // 1. Cek HOME Side (dari placeholder ATAU matrix home_source)
            $homeSource = $bracketMatch->home_placeholder ?: ($matrix?->home_source ?? null);
            if ($homeSource) {
                $parsed = $this->parsePoolPlaceholder($homeSource);
                if ($parsed && strtoupper($parsed['pool']) === $poolName) {
                    $expectedTeamId = $rankMap[$parsed['rank']] ?? null;
                    $currentTeamId = $isTeamMode ? $bracketMatch->home_super_team_id : $bracketMatch->home_team_id;
                    if ($expectedTeamId && ($currentTeamId !== $expectedTeamId || $bracketMatch->home_placeholder)) {
                        if (!$matrix && $bracketMatch->home_placeholder) {
                            \App\Models\BracketMatrix::firstOrCreate([
                                'tournament_id'    => $bracketMatch->tournament_id,
                                'match_mode'       => $bracketMatch->match_mode,
                                'bracket_stage'    => $bracketMatch->stage,
                                'bracket_position' => $bracketMatch->bracket_position ?: 1,
                                'bracket_name'     => $bracketMatch->bracket_group,
                            ], [
                                'home_source'      => $bracketMatch->home_placeholder,
                                'away_source'      => $bracketMatch->away_placeholder,
                            ]);
                        }

                        if ($isTeamMode) {
                            $bracketMatch->home_super_team_id = $expectedTeamId;
                        } else {
                            $bracketMatch->home_team_id = $expectedTeamId;
                        }
                        $bracketMatch->home_placeholder = null;

                        // Reset lineup home agar pemain tim baru disiapkan
                        $lineup = $bracketMatch->lineup ?: [];
                        $lineup['home'] = [];
                        $bracketMatch->lineup = $lineup;

                        $this->ensureContestantAthletes($expectedTeamId, $isTeamMode);
                        $this->syncSetStatsForNewContestant($bracketMatch, $expectedTeamId, 'home', $isTeamMode);

                        Log::info("PlaceholderResolver: Match #{$bracketMatch->id} Home diupdate dari Tim #{$currentTeamId} ke Tim #{$expectedTeamId} (Pool {$poolName} Rank {$parsed['rank']})");
                        $updated = true;
                    }
                }
            }

            // 2. Cek AWAY Side (dari placeholder ATAU matrix away_source)
            $awaySource = $bracketMatch->away_placeholder ?: ($matrix?->away_source ?? null);
            if ($awaySource) {
                $parsed = $this->parsePoolPlaceholder($awaySource);
                if ($parsed && strtoupper($parsed['pool']) === $poolName) {
                    $expectedTeamId = $rankMap[$parsed['rank']] ?? null;
                    $currentTeamId = $isTeamMode ? $bracketMatch->away_super_team_id : $bracketMatch->away_team_id;
                    if ($expectedTeamId && ($currentTeamId !== $expectedTeamId || $bracketMatch->away_placeholder)) {
                        if (!$matrix && $bracketMatch->away_placeholder) {
                            \App\Models\BracketMatrix::firstOrCreate([
                                'tournament_id'    => $bracketMatch->tournament_id,
                                'match_mode'       => $bracketMatch->match_mode,
                                'bracket_stage'    => $bracketMatch->stage,
                                'bracket_position' => $bracketMatch->bracket_position ?: 1,
                                'bracket_name'     => $bracketMatch->bracket_group,
                            ], [
                                'home_source'      => $bracketMatch->home_placeholder,
                                'away_source'      => $bracketMatch->away_placeholder,
                            ]);
                        }

                        if ($isTeamMode) {
                            $bracketMatch->away_super_team_id = $expectedTeamId;
                        } else {
                            $bracketMatch->away_team_id = $expectedTeamId;
                        }
                        $bracketMatch->away_placeholder = null;

                        // Reset lineup away agar pemain tim baru disiapkan
                        $lineup = $bracketMatch->lineup ?: [];
                        $lineup['away'] = [];
                        $bracketMatch->lineup = $lineup;

                        $this->ensureContestantAthletes($expectedTeamId, $isTeamMode);
                        $this->syncSetStatsForNewContestant($bracketMatch, $expectedTeamId, 'away', $isTeamMode);

                        Log::info("PlaceholderResolver: Match #{$bracketMatch->id} Away diupdate dari Tim #{$currentTeamId} ke Tim #{$expectedTeamId} (Pool {$poolName} Rank {$parsed['rank']})");
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
     * @param  bool   $force Jika true, tetap update jika tim di hasil pool/babak sebelumnya berbeda
     * @return bool   True jika ada tim yang berhasil di-resolve atau diperbarui
     */
    public function resolveForMatch(Match_ $bracketMatch, bool $force = false): bool
    {
        if ($bracketMatch->stage === 'pool' || $bracketMatch->status === 'finished') {
            return false;
        }

        $updated = false;
        $isTeamMode = $bracketMatch->isTeamMode();

        // Cari BracketMatrix jika ada untuk match ini
        $matrix = \App\Models\BracketMatrix::where('tournament_id', $bracketMatch->tournament_id)
            ->where('match_mode', $bracketMatch->match_mode)
            ->where('bracket_stage', $bracketMatch->stage)
            ->where('bracket_position', $bracketMatch->bracket_position)
            ->when(!empty($bracketMatch->bracket_group), function ($q) use ($bracketMatch) {
                $q->where(function ($sub) use ($bracketMatch) {
                    $sub->where('bracket_name', $bracketMatch->bracket_group)
                        ->orWhereNull('bracket_name')
                        ->orWhere('bracket_name', '');
                });
            })
            ->first();

        // 1. Resolve Home Side
        $homeSource = $bracketMatch->home_placeholder ?: ($matrix?->home_source ?? null);
        $currentHomeId = $isTeamMode ? $bracketMatch->home_super_team_id : $bracketMatch->home_team_id;

        if ($homeSource && (!$currentHomeId || $force || $bracketMatch->home_placeholder)) {
            $resolvedId = $this->resolveContestantForSource($bracketMatch, $homeSource, 'home');
            if ($resolvedId && ($resolvedId !== $currentHomeId || $bracketMatch->home_placeholder)) {
                if (!$matrix && $bracketMatch->home_placeholder) {
                    \App\Models\BracketMatrix::firstOrCreate([
                        'tournament_id'    => $bracketMatch->tournament_id,
                        'match_mode'       => $bracketMatch->match_mode,
                        'bracket_stage'    => $bracketMatch->stage,
                        'bracket_position' => $bracketMatch->bracket_position ?: 1,
                        'bracket_name'     => $bracketMatch->bracket_group,
                    ], [
                        'home_source'      => $bracketMatch->home_placeholder,
                        'away_source'      => $bracketMatch->away_placeholder,
                    ]);
                }

                if ($isTeamMode) {
                    $bracketMatch->home_super_team_id = $resolvedId;
                } else {
                    $bracketMatch->home_team_id = $resolvedId;
                }
                $bracketMatch->home_placeholder = null;

                $lineup = $bracketMatch->lineup ?: [];
                $lineup['home'] = [];
                $bracketMatch->lineup = $lineup;

                $this->ensureContestantAthletes($resolvedId, $isTeamMode);
                $this->syncSetStatsForNewContestant($bracketMatch, $resolvedId, 'home', $isTeamMode);
                $updated = true;
            }
        }

        // 2. Resolve Away Side
        $awaySource = $bracketMatch->away_placeholder ?: ($matrix?->away_source ?? null);
        $currentAwayId = $isTeamMode ? $bracketMatch->away_super_team_id : $bracketMatch->away_team_id;

        if ($awaySource && (!$currentAwayId || $force || $bracketMatch->away_placeholder)) {
            $resolvedId = $this->resolveContestantForSource($bracketMatch, $awaySource, 'away');
            if ($resolvedId && ($resolvedId !== $currentAwayId || $bracketMatch->away_placeholder)) {
                if (!$matrix && $bracketMatch->away_placeholder) {
                    \App\Models\BracketMatrix::firstOrCreate([
                        'tournament_id'    => $bracketMatch->tournament_id,
                        'match_mode'       => $bracketMatch->match_mode,
                        'bracket_stage'    => $bracketMatch->stage,
                        'bracket_position' => $bracketMatch->bracket_position ?: 1,
                        'bracket_name'     => $bracketMatch->bracket_group,
                    ], [
                        'home_source'      => $bracketMatch->home_placeholder,
                        'away_source'      => $bracketMatch->away_placeholder,
                    ]);
                }

                if ($isTeamMode) {
                    $bracketMatch->away_super_team_id = $resolvedId;
                } else {
                    $bracketMatch->away_team_id = $resolvedId;
                }
                $bracketMatch->away_placeholder = null;

                $lineup = $bracketMatch->lineup ?: [];
                $lineup['away'] = [];
                $bracketMatch->lineup = $lineup;

                $this->ensureContestantAthletes($resolvedId, $isTeamMode);
                $this->syncSetStatsForNewContestant($bracketMatch, $resolvedId, 'away', $isTeamMode);
                $updated = true;
            }
        }

        // 3. Resolve dari relasi previousMatches jika bersumber dari babak gugur sebelumnya
        $prevMatches = $bracketMatch->previousMatches()->where('status', 'finished')->get();
        foreach ($prevMatches as $pm) {
            $pmWinner = $isTeamMode ? $pm->winner_super_team_id : $pm->winner_team_id;
            if (!$pmWinner) continue;

            $targetSide = ($pm->bracket_position % 2 === 1) ? 'home' : 'away';
            $sideContestantId = ($targetSide === 'home')
                ? ($isTeamMode ? $bracketMatch->home_super_team_id : $bracketMatch->home_team_id)
                : ($isTeamMode ? $bracketMatch->away_super_team_id : $bracketMatch->away_team_id);

            if ((!$sideContestantId || $force) && $sideContestantId !== $pmWinner) {
                if ($targetSide === 'home') {
                    if ($isTeamMode) {
                        $bracketMatch->home_super_team_id = $pmWinner;
                    } else {
                        $bracketMatch->home_team_id = $pmWinner;
                    }
                    $lineup = $bracketMatch->lineup ?: [];
                    $lineup['home'] = [];
                    $bracketMatch->lineup = $lineup;
                } else {
                    if ($isTeamMode) {
                        $bracketMatch->away_super_team_id = $pmWinner;
                    } else {
                        $bracketMatch->away_team_id = $pmWinner;
                    }
                    $lineup = $bracketMatch->lineup ?: [];
                    $lineup['away'] = [];
                    $bracketMatch->lineup = $lineup;
                }

                $this->ensureContestantAthletes($pmWinner, $isTeamMode);
                $this->syncSetStatsForNewContestant($bracketMatch, $pmWinner, $targetSide, $isTeamMode);
                $updated = true;
            }
        }

        if ($updated) {
            $bracketMatch->save();
        }

        return $updated;
    }

    /**
     * Resolve contestant ID dari source (bisa format BracketMatrix maupun format placeholder biasa).
     */
    public function resolveContestantForSource(Match_ $match, string $source, string $side): ?int
    {
        // 1. Coba parse via BracketMatrix
        $parsed = \App\Models\BracketMatrix::parseSource($source);
        if ($parsed['type'] === 'pool' && !empty($parsed['pool'])) {
            return $this->resolveContestantFromPool($match, $parsed['pool'], (int) ($parsed['rank'] ?? 1));
        }

        if ($parsed['type'] === 'winner' && !empty($parsed['position'])) {
            $stage = $parsed['stage'] ?? null;
            if ($stage) {
                $feederMatch = Match_::where('tournament_id', $match->tournament_id)
                    ->where('match_mode', $match->match_mode)
                    ->where('stage', $stage)
                    ->where('bracket_position', $parsed['position'])
                    ->first();
                if ($feederMatch && $feederMatch->status === 'finished') {
                    return $match->isTeamMode() ? $feederMatch->winner_super_team_id : $feederMatch->winner_team_id;
                }
            }
        }

        // 2. Coba parse via placeholder method
        return $this->resolveContestantForPlaceholder($match, $source, $side);
    }

    /**
     * Cari contestant ID dari Pool dan rank tertentu.
     */
    public function resolveContestantFromPool(Match_ $match, string $poolName, int $rank): ?int
    {
        $poolQuery = Pool::where('tournament_id', $match->tournament_id)
            ->where(function ($q) use ($match) {
                $q->where('match_mode', $match->match_mode)
                  ->orWhereNull('match_mode');
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
        if (!$pool) {
            return null;
        }

        // Pastikan klasemen pool segar
        PoolStanding::recalculate($pool->id);

        $standing = PoolStanding::where('pool_id', $pool->id)
            ->where('rank', $rank)
            ->first();

        if ($standing) {
            return $match->isTeamMode()
                ? ($standing->super_team_id ?? $standing->team_id)
                : $standing->team_id;
        }

        return null;
    }

    /**
     * Resolve semua placeholder di satu turnamen (bisa dipanggil dari controller bracket/scoring).
     */
    public function resolveAllForTournament(Tournament|int $tournament): int
    {
        $tournamentId = is_numeric($tournament) ? $tournament : $tournament->id;
        $bracketMatches = Match_::where('tournament_id', $tournamentId)
            ->where('stage', '!=', 'pool')
            ->where('status', '!=', 'finished')
            ->get();

        $resolvedCount = 0;
        foreach ($bracketMatches as $match) {
            if ($this->resolveForMatch($match, true)) {
                $resolvedCount++;
            }
        }

        return $resolvedCount;
    }

    /**
     * Majukan pemenang match saat ini ke babak berikutnya (next_match_id) secara presisi.
     * Jika pemenang berubah, perbarui tim di next_match dan reset susunan pemain.
     */
    public function advanceWinnerToNextMatch(Match_ $match, int $winnerId, bool $isTeamMode): bool
    {
        if (!$match->next_match_id) {
            return false;
        }

        $nextMatch = Match_::find($match->next_match_id);
        if (!$nextMatch || $nextMatch->status === 'finished') {
            return false;
        }

        // Tentukan apakah match ini mengalir ke sisi Home (posisi ganjil) atau Away (posisi genap)
        $isHomeFeeder = ($match->bracket_position % 2 === 1);
        $targetSide = $isHomeFeeder ? 'home' : 'away';

        $currentContestantId = $isHomeFeeder
            ? ($isTeamMode ? $nextMatch->home_super_team_id : $nextMatch->home_team_id)
            : ($isTeamMode ? $nextMatch->away_super_team_id : $nextMatch->away_team_id);

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

        // Jika tim berbeda dari sebelumnya, reset lineup dan pastikan atlet terdaftar
        if ($currentContestantId !== $winnerId) {
            $lineup = $nextMatch->lineup ?: [];
            $lineup[$targetSide] = [];
            $nextMatch->lineup = $lineup;

            $this->ensureContestantAthletes($winnerId, $isTeamMode);
            $this->syncSetStatsForNewContestant($nextMatch, $winnerId, $targetSide, $isTeamMode);
        }

        $nextMatch->save();
        Log::info("PlaceholderResolver: Winner of Match #{$match->id} (Team #{$winnerId}) advanced to Match #{$nextMatch->id} (" . ($isHomeFeeder ? 'HOME' : 'AWAY') . ")");

        return true;
    }

    /**
     * Pastikan atlet untuk kontestan (Team / SuperTeam) sudah terdaftar di database.
     */
    public function ensureContestantAthletes(int $contestantId, bool $isTeamMode): void
    {
        if ($isTeamMode) {
            $superTeam = \App\Models\SuperTeam::with('members.athletes')->find($contestantId);
            if ($superTeam) {
                foreach ($superTeam->members as $team) {
                    $this->ensureTeamDefaultAthletes($team);
                }
            }
        } else {
            $team = \App\Models\Team::with('athletes')->find($contestantId);
            if ($team) {
                $this->ensureTeamDefaultAthletes($team);
            }
        }
    }

    /**
     * Buat default 4 atlet jika tim belum memiliki atlet sama sekali.
     */
    protected function ensureTeamDefaultAthletes(\App\Models\Team $team): void
    {
        if ($team->athletes()->count() === 0) {
            $defaults = [
                ['name' => 'Tekong ' . $team->name, 'jersey_number' => 1, 'position' => 'Tekong'],
                ['name' => 'Feeder ' . $team->name, 'jersey_number' => 2, 'position' => 'Feeder'],
                ['name' => 'Killer ' . $team->name, 'jersey_number' => 3, 'position' => 'Killer'],
                ['name' => 'Cadangan ' . $team->name, 'jersey_number' => 4, 'position' => 'Cadangan'],
            ];

            foreach ($defaults as $data) {
                \App\Models\Athlete::create([
                    'team_id'       => $team->id,
                    'name'          => $data['name'],
                    'jersey_number' => $data['jersey_number'],
                    'position'      => $data['position'],
                ]);
            }
        }
    }

    /**
     * Sinkronkan baris SetStat untuk atlet baru pada set yang sudah ada dalam match.
     */
    public function syncSetStatsForNewContestant(Match_ $match, int $contestantId, string $side, bool $isTeamMode): void
    {
        $sets = $match->sets()->get();
        if ($sets->isEmpty()) {
            return;
        }

        if ($isTeamMode) {
            $superTeam = \App\Models\SuperTeam::with('members.athletes')->find($contestantId);
            $athletes = $superTeam?->members->flatMap->athletes ?? collect();
        } else {
            $team = \App\Models\Team::with('athletes')->find($contestantId);
            $athletes = $team?->athletes ?? collect();
        }

        foreach ($sets as $set) {
            foreach ($athletes as $athlete) {
                \App\Models\SetStat::firstOrCreate([
                    'match_set_id' => $set->id,
                    'athlete_id'   => $athlete->id,
                ], [
                    'team_id'      => $athlete->team_id,
                ]);
            }
        }
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
                    $q->where('match_mode', $match->match_mode)
                      ->orWhereNull('match_mode');
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
