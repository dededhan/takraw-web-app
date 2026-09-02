<?php

namespace App\Services;

use App\Models\Athlete;
use App\Models\Match_;
use App\Models\Pool;
use App\Models\SetStat;
use App\Models\Tournament;
use Illuminate\Support\Collection;

class AthletePerformanceService
{
    /**
     * Calculate and get best players for a tournament (by bracket, pool, and overall).
     */
    public function getTournamentBestPlayers(Tournament $tournament): array
    {
        // 1. Get all matches belonging to this tournament
        $matches = Match_::where('tournament_id', $tournament->id)
            ->with(['sets.setStats.athlete.team', 'pool'])
            ->get();

        if ($matches->isEmpty()) {
            return [
                'has_data'   => false,
                'overall'    => null,
                'brackets'   => [],
                'pools'      => [],
            ];
        }

        // 2. Flatten all setStats with match and pool metadata
        $allStats = collect();

        foreach ($matches as $match) {
            $poolId = $match->pool_id;
            $bracketNumber = $match->pool ? ($match->pool->bracket_number ?? 1) : 1;
            $bracketName = $match->pool ? ($match->pool->bracket_name ?? "Bracket {$bracketNumber}") : "Bracket {$bracketNumber}";

            foreach ($match->sets as $set) {
                foreach ($set->setStats as $stat) {
                    if (!$stat->athlete_id || !$stat->athlete) {
                        continue;
                    }

                    $allStats->push([
                        'stat'           => $stat,
                        'athlete'        => $stat->athlete,
                        'team'           => $stat->athlete->team ?? $stat->team,
                        'match_id'       => $match->id,
                        'match_set_id'   => $set->id,
                        'pool_id'        => $poolId,
                        'pool_name'      => $match->pool ? $match->pool->name : null,
                        'pool_display'   => $match->pool ? $match->pool->display_name : null,
                        'bracket_number' => $bracketNumber,
                        'bracket_name'   => $bracketName,
                    ]);
                }
            }
        }

        if ($allStats->isEmpty()) {
            return [
                'has_data'   => false,
                'overall'    => null,
                'brackets'   => [],
                'pools'      => [],
            ];
        }

        // 3. Aggregate overall tournament stats
        $overallLeaderboard = $this->aggregateStats($allStats);
        $overallAwards = $this->determineAwards($overallLeaderboard);

        // 4. Aggregate per Bracket
        $bracketsData = [];
        $bracketGroups = $allStats->groupBy('bracket_number');

        foreach ($bracketGroups as $bNum => $bStats) {
            $bName = $bStats->first()['bracket_name'] ?? "Bracket {$bNum}";
            $bLeaderboard = $this->aggregateStats($bStats);
            $bAwards = $this->determineAwards($bLeaderboard);

            // Group by pools within this bracket
            $poolGroups = $bStats->whereNotNull('pool_id')->groupBy('pool_id');
            $poolsInBracket = [];

            foreach ($poolGroups as $pId => $pStats) {
                $pName = $pStats->first()['pool_name'] ?? "Pool";
                $pDisplay = $pStats->first()['pool_display'] ?? "Pool {$pName}";
                $pLeaderboard = $this->aggregateStats($pStats);
                $pAwards = $this->determineAwards($pLeaderboard);

                $poolsInBracket[] = [
                    'pool_id'      => $pId,
                    'pool_name'    => $pName,
                    'display_name' => $pDisplay,
                    'awards'       => $pAwards,
                    'leaderboard'  => $pLeaderboard,
                ];
            }

            $bracketsData[] = [
                'bracket_number' => (int) $bNum,
                'bracket_name'   => $bName,
                'awards'         => $bAwards,
                'leaderboard'    => $bLeaderboard,
                'pools'          => $poolsInBracket,
            ];
        }

        // Sort brackets by bracket_number
        usort($bracketsData, fn($a, $b) => $a['bracket_number'] <=> $b['bracket_number']);

        return [
            'has_data'   => true,
            'overall'    => [
                'awards'      => $overallAwards,
                'leaderboard' => $overallLeaderboard,
            ],
            'brackets'   => $bracketsData,
        ];
    }

    /**
     * Get awards won by athletes coached by a specific coach.
     */
    public function getCoachAthleteAwards(int $coachId, ?int $tournamentId = null): array
    {
        $tournamentsQuery = Tournament::query();
        if ($tournamentId) {
            $tournamentsQuery->where('id', $tournamentId);
        } else {
            $tournamentsQuery->whereIn('status', ['pool_stage', 'bracket_stage', 'completed']);
        }

        $tournaments = $tournamentsQuery->get();
        $coachAwards = [];

        foreach ($tournaments as $tournament) {
            $perf = $this->getTournamentBestPlayers($tournament);
            if (!$perf['has_data']) {
                continue;
            }

            // Check overall awards
            if (!empty($perf['overall']['awards'])) {
                foreach ($perf['overall']['awards'] as $catKey => $awardAthlete) {
                    if ($awardAthlete && isset($awardAthlete['coach_id']) && $awardAthlete['coach_id'] === $coachId) {
                        $coachAwards[] = [
                            'tournament_id'   => $tournament->id,
                            'tournament_name' => $tournament->name,
                            'scope'           => 'Overall Turnamen',
                            'category_key'    => $catKey,
                            'category_title'  => $this->getCategoryTitle($catKey),
                            'badge'           => $this->getCategoryBadge($catKey),
                            'athlete'         => $awardAthlete,
                        ];
                    }
                }
            }

            // Check bracket awards
            foreach ($perf['brackets'] as $bracket) {
                foreach ($bracket['awards'] as $catKey => $awardAthlete) {
                    if ($awardAthlete && isset($awardAthlete['coach_id']) && $awardAthlete['coach_id'] === $coachId) {
                        $coachAwards[] = [
                            'tournament_id'   => $tournament->id,
                            'tournament_name' => $tournament->name,
                            'scope'           => $bracket['bracket_name'],
                            'category_key'    => $catKey,
                            'category_title'  => $this->getCategoryTitle($catKey),
                            'badge'           => $this->getCategoryBadge($catKey),
                            'athlete'         => $awardAthlete,
                        ];
                    }
                }

                // Check pool awards
                foreach ($bracket['pools'] as $pool) {
                    foreach ($pool['awards'] as $catKey => $awardAthlete) {
                        if ($awardAthlete && isset($awardAthlete['coach_id']) && $awardAthlete['coach_id'] === $coachId) {
                            $coachAwards[] = [
                                'tournament_id'   => $tournament->id,
                                'tournament_name' => $tournament->name,
                                'scope'           => $pool['display_name'],
                                'category_key'    => $catKey,
                                'category_title'  => $this->getCategoryTitle($catKey),
                                'badge'           => $this->getCategoryBadge($catKey),
                                'athlete'         => $awardAthlete,
                            ];
                        }
                    }
                }
            }
        }

        return $coachAwards;
    }

    /**
     * Aggregate individual SetStat rows by athlete.
     */
    private function aggregateStats(Collection $statsCollection): array
    {
        $athletesGrouped = $statsCollection->groupBy(fn($item) => $item['athlete']->id);
        $leaderboard = [];

        foreach ($athletesGrouped as $athleteId => $items) {
            $first = $items->first();
            $athlete = $first['athlete'];
            $team = $first['team'];

            $matchesCount = $items->pluck('match_id')->unique()->count();
            $setsCount = $items->pluck('match_set_id')->unique()->count();

            $serviceAce = 0;
            $serviceIn = 0;
            $serviceError = 0;

            $strikeAce = 0;
            $strikeSuccess = 0;
            $strikeIn = 0;
            $strikeFail = 0;

            $blockingAce = 0;
            $blockSuccess = 0;
            $blockingIn = 0;
            $blockFail = 0;

            $feedingAce = 0;
            $feedingSuccess = 0;
            $feedingIn = 0;
            $feedingFail = 0;

            $receiveSuccess = 0;
            $receiveFail = 0;
            $firstballIn = 0;

            foreach ($items as $entry) {
                /** @var SetStat $s */
                $s = $entry['stat'];

                $serviceAce += $s->service_ace;
                $serviceIn += $s->service_in;
                $serviceError += $s->service_error;

                $strikeAce += $s->strike_ace;
                $strikeSuccess += $s->strike_success;
                $strikeIn += $s->strike_in;
                $strikeFail += ($s->strike_error + $s->strike_fail);

                $blockingAce += $s->blocking_ace;
                $blockSuccess += $s->block_success;
                $blockingIn += $s->blocking_in;
                $blockFail += ($s->blocking_error + $s->block_fail);

                $feedingAce += $s->feeding_ace;
                $feedingSuccess += $s->feeding_success;
                $feedingIn += $s->feeding_in;
                $feedingFail += ($s->feeding_error + $s->feeding_fail);

                $receiveSuccess += $s->receive_success;
                $receiveFail += $s->receive_fail;
                $firstballIn += $s->firstball_in;
            }

            $totalPoints = $serviceAce + $strikeAce + $blockingAce + $strikeSuccess + $blockSuccess;
            $totalAttempts = $serviceAce + $serviceIn + $serviceError + $strikeAce + $strikeSuccess + $strikeIn + $strikeFail + $blockingAce + $blockSuccess + $blockingIn + $blockFail;

            // Performance Index / MVP Score
            $positiveScore = ($serviceAce * 3) + ($strikeAce * 3) + ($blockingAce * 3)
                + ($strikeSuccess * 2) + ($blockSuccess * 2)
                + ($receiveSuccess * 1) + ($feedingSuccess * 1)
                + ($serviceIn * 1) + ($firstballIn * 1) + ($feedingIn * 1);

            $negativeScore = ($serviceError * 1) + ($strikeFail * 1) + ($blockFail * 1) + ($receiveFail * 1) + ($feedingFail * 1);

            $mvpScore = max(0, $positiveScore - $negativeScore);

            // Sub-scores for categories
            $serverScore = ($serviceAce * 3) + ($serviceIn * 1) - ($serviceError * 1);
            $strikerScore = ($strikeAce * 3) + ($strikeSuccess * 2) + ($strikeIn * 1) - ($strikeFail * 1);
            $blockerScore = ($blockingAce * 3) + ($blockSuccess * 2) + ($receiveSuccess * 1) - ($blockFail * 1) - ($receiveFail * 1);
            $feederScore = ($feedingAce * 3) + ($feedingSuccess * 2) + ($feedingIn * 1) - ($feedingFail * 1);

            $leaderboard[] = [
                'athlete_id'      => $athlete->id,
                'name'            => $athlete->name,
                'jersey_number'   => $athlete->jersey_number,
                'position'        => $athlete->position ?? 'All-Round',
                'photo_url'       => $athlete->photo_url,
                'team_id'         => $team ? $team->id : null,
                'team_name'       => $team ? $team->name : 'N/A',
                'team_logo_url'   => $team ? $team->logo_url : null,
                'coach_id'        => $team ? $team->coach_id : null,
                'matches_played'  => $matchesCount,
                'sets_played'     => $setsCount,
                'total_points'    => $totalPoints,
                'mvp_score'       => $mvpScore,
                'server_score'    => $serverScore,
                'striker_score'   => $strikerScore,
                'blocker_score'   => $blockerScore,
                'feeder_score'    => $feederScore,
                'stats'           => [
                    'service_ace'     => $serviceAce,
                    'service_in'      => $serviceIn,
                    'service_error'   => $serviceError,
                    'strike_ace'      => $strikeAce,
                    'strike_success'  => $strikeSuccess,
                    'strike_in'       => $strikeIn,
                    'strike_fail'     => $strikeFail,
                    'blocking_ace'    => $blockingAce,
                    'block_success'   => $blockSuccess,
                    'block_fail'      => $blockFail,
                    'feeding_ace'     => $feedingAce,
                    'feeding_success' => $feedingSuccess,
                    'feeding_fail'    => $feedingFail,
                    'receive_success' => $receiveSuccess,
                    'receive_fail'    => $receiveFail,
                ],
            ];
        }

        // Sort leaderboard by MVP score descending
        usort($leaderboard, function ($a, $b) {
            if ($b['mvp_score'] === $a['mvp_score']) {
                return $b['total_points'] <=> $a['total_points'];
            }
            return $b['mvp_score'] <=> $a['mvp_score'];
        });

        // Add rank
        foreach ($leaderboard as $index => &$player) {
            $player['rank'] = $index + 1;
        }

        return $leaderboard;
    }

    /**
     * Determine best player award winners for a leaderboard.
     */
    private function determineAwards(array $leaderboard): array
    {
        if (empty($leaderboard)) {
            return [
                'mvp'          => null,
                'best_server'  => null,
                'best_striker' => null,
                'best_blocker' => null,
                'best_feeder'  => null,
            ];
        }

        // 1. MVP: Highest MVP Score
        $mvp = $leaderboard[0]['mvp_score'] > 0 ? $leaderboard[0] : null;

        // 2. Best Server (Tekong): Highest server_score & at least 1 ace or 2 services
        $serverSorted = $leaderboard;
        usort($serverSorted, function ($a, $b) {
            if ($b['server_score'] === $a['server_score']) {
                return $b['stats']['service_ace'] <=> $a['stats']['service_ace'];
            }
            return $b['server_score'] <=> $a['server_score'];
        });
        $bestServer = (!empty($serverSorted) && $serverSorted[0]['server_score'] > 0) ? $serverSorted[0] : null;

        // 3. Best Striker (Killer/Smasher): Highest striker_score
        $strikerSorted = $leaderboard;
        usort($strikerSorted, function ($a, $b) {
            if ($b['striker_score'] === $a['striker_score']) {
                return $b['stats']['strike_ace'] <=> $a['stats']['strike_ace'];
            }
            return $b['striker_score'] <=> $a['striker_score'];
        });
        $bestStriker = (!empty($strikerSorted) && $strikerSorted[0]['striker_score'] > 0) ? $strikerSorted[0] : null;

        // 4. Best Blocker / Defender: Highest blocker_score
        $blockerSorted = $leaderboard;
        usort($blockerSorted, function ($a, $b) {
            if ($b['blocker_score'] === $a['blocker_score']) {
                return $b['stats']['blocking_ace'] <=> $a['stats']['blocking_ace'];
            }
            return $b['blocker_score'] <=> $a['blocker_score'];
        });
        $bestBlocker = (!empty($blockerSorted) && $blockerSorted[0]['blocker_score'] > 0) ? $blockerSorted[0] : null;

        // 5. Best Feeder (Setter): Highest feeder_score
        $feederSorted = $leaderboard;
        usort($feederSorted, function ($a, $b) {
            if ($b['feeder_score'] === $a['feeder_score']) {
                return $b['stats']['feeding_success'] <=> $a['stats']['feeding_success'];
            }
            return $b['feeder_score'] <=> $a['feeder_score'];
        });
        $bestFeeder = (!empty($feederSorted) && $feederSorted[0]['feeder_score'] > 0) ? $feederSorted[0] : null;

        return [
            'mvp'          => $mvp,
            'best_server'  => $bestServer,
            'best_striker' => $bestStriker,
            'best_blocker' => $bestBlocker,
            'best_feeder'  => $bestFeeder,
        ];
    }

    private function getCategoryTitle(string $key): string
    {
        return match ($key) {
            'mvp'          => 'Pemain Terbaik (MVP)',
            'best_server'  => 'Tekong Terbaik (Best Server)',
            'best_striker' => 'Killer/Smasher Terbaik (Best Striker)',
            'best_blocker' => 'Defender/Blocker Terbaik (Best Blocker)',
            'best_feeder'  => 'Feeder/Setter Terbaik (Best Feeder)',
            default        => 'Penghargaan Atlet',
        };
    }

    private function getCategoryBadge(string $key): string
    {
        return match ($key) {
            'mvp'          => '👑',
            'best_server'  => '⚡',
            'best_striker' => '💥',
            'best_blocker' => '🛡️',
            'best_feeder'  => '🎯',
            default        => '🎖️',
        };
    }
}
