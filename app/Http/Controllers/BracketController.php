<?php

namespace App\Http\Controllers;

use App\Models\Tournament;
use App\Models\Match_;
use App\Models\PoolStanding;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BracketController extends Controller
{
    /**
     * Generate bracket matches (Quarterfinals or Semifinals) from pool standings.
     */
    public function generateFromPools(Request $request, Tournament $tournament)
    {
        // 1. Check if tournament is in pool_stage
        if ($tournament->status !== 'pool_stage') {
            return back()->with('error', 'Turnamen tidak dalam fase penyisihan pool.');
        }

        // 2. Check if all pool matches are finished
        $unfinishedMatches = Match_::where('tournament_id', $tournament->id)
            ->where('stage', 'pool')
            ->where('status', '!=', 'finished')
            ->count();

        if ($unfinishedMatches > 0) {
            return back()->with('error', 'Semua pertandingan babak penyisihan pool harus diselesaikan terlebih dahulu.');
        }

        $pools = $tournament->pools()->with('standings')->get();
        $poolCount = $pools->count();

        if ($poolCount != 2 && $poolCount != 4) {
            return back()->with('error', 'Jumlah pool harus 2 atau 4 untuk men-generate bracket otomatis.');
        }

        // Check that each pool has at least rank 1 and 2
        foreach ($pools as $pool) {
            $rank1 = $pool->standings()->where('rank', 1)->first();
            $rank2 = $pool->standings()->where('rank', 2)->first();
            if (!$rank1 || !$rank2) {
                return back()->with('error', "Klasemen untuk Pool {$pool->name} belum lengkap atau belum di-ranking.");
            }
        }

        DB::beginTransaction();
        try {
            if ($poolCount == 2) {
                // 2 Pools -> Semifinals (4 teams)
                $poolA = $pools->firstWhere('name', 'A') ?: $pools[0];
                $poolB = $pools->firstWhere('name', 'B') ?: $pools[1];

                $juara1A = $poolA->standings()->where('rank', 1)->first()->team_id;
                $juara2A = $poolA->standings()->where('rank', 2)->first()->team_id;
                $juara1B = $poolB->standings()->where('rank', 1)->first()->team_id;
                $juara2B = $poolB->standings()->where('rank', 2)->first()->team_id;

                // Create Final Match
                $final = Match_::create([
                    'tournament_id' => $tournament->id,
                    'stage' => 'final',
                    'status' => 'scheduled',
                    'bracket_position' => 1,
                ]);

                // Create Third Place Match
                Match_::create([
                    'tournament_id' => $tournament->id,
                    'stage' => 'third_place',
                    'status' => 'scheduled',
                    'bracket_position' => 1,
                ]);

                // Create Semifinal 1 (Juara A vs Runner B) pointing to Final
                Match_::create([
                    'tournament_id' => $tournament->id,
                    'stage' => 'semifinal',
                    'status' => 'scheduled',
                    'home_team_id' => $juara1A,
                    'away_team_id' => $juara2B,
                    'next_match_id' => $final->id,
                    'bracket_position' => 1,
                ]);

                // Create Semifinal 2 (Juara B vs Runner A) pointing to Final
                Match_::create([
                    'tournament_id' => $tournament->id,
                    'stage' => 'semifinal',
                    'status' => 'scheduled',
                    'home_team_id' => $juara1B,
                    'away_team_id' => $juara2A,
                    'next_match_id' => $final->id,
                    'bracket_position' => 2,
                ]);

            } else {
                // 4 Pools -> Quarterfinals (8 teams)
                $poolA = $pools->firstWhere('name', 'A') ?: $pools[0];
                $poolB = $pools->firstWhere('name', 'B') ?: $pools[1];
                $poolC = $pools->firstWhere('name', 'C') ?: $pools[2];
                $poolD = $pools->firstWhere('name', 'D') ?: $pools[3];

                $j1A = $poolA->standings()->where('rank', 1)->first()->team_id;
                $j2A = $poolA->standings()->where('rank', 2)->first()->team_id;
                $j1B = $poolB->standings()->where('rank', 1)->first()->team_id;
                $j2B = $poolB->standings()->where('rank', 2)->first()->team_id;
                $j1C = $poolC->standings()->where('rank', 1)->first()->team_id;
                $j2C = $poolC->standings()->where('rank', 2)->first()->team_id;
                $j1D = $poolD->standings()->where('rank', 1)->first()->team_id;
                $j2D = $poolD->standings()->where('rank', 2)->first()->team_id;

                // Create Final
                $final = Match_::create([
                    'tournament_id' => $tournament->id,
                    'stage' => 'final',
                    'status' => 'scheduled',
                    'bracket_position' => 1,
                ]);

                // Create Third Place
                Match_::create([
                    'tournament_id' => $tournament->id,
                    'stage' => 'third_place',
                    'status' => 'scheduled',
                    'bracket_position' => 1,
                ]);

                // Create Semifinals pointing to Final
                $semi1 = Match_::create([
                    'tournament_id' => $tournament->id,
                    'stage' => 'semifinal',
                    'status' => 'scheduled',
                    'next_match_id' => $final->id,
                    'bracket_position' => 1,
                ]);

                $semi2 = Match_::create([
                    'tournament_id' => $tournament->id,
                    'stage' => 'semifinal',
                    'status' => 'scheduled',
                    'next_match_id' => $final->id,
                    'bracket_position' => 2,
                ]);

                // Create Quarterfinals pointing to Semifinals
                // QF 1: Juara A vs Runner B -> Semi 1
                Match_::create([
                    'tournament_id' => $tournament->id,
                    'stage' => 'quarterfinal',
                    'status' => 'scheduled',
                    'home_team_id' => $j1A,
                    'away_team_id' => $j2B,
                    'next_match_id' => $semi1->id,
                    'bracket_position' => 1,
                ]);

                // QF 2: Juara C vs Runner D -> Semi 1
                Match_::create([
                    'tournament_id' => $tournament->id,
                    'stage' => 'quarterfinal',
                    'status' => 'scheduled',
                    'home_team_id' => $j1C,
                    'away_team_id' => $j2D,
                    'next_match_id' => $semi1->id,
                    'bracket_position' => 2,
                ]);

                // QF 3: Juara B vs Runner A -> Semi 2
                Match_::create([
                    'tournament_id' => $tournament->id,
                    'stage' => 'quarterfinal',
                    'status' => 'scheduled',
                    'home_team_id' => $j1B,
                    'away_team_id' => $j2A,
                    'next_match_id' => $semi2->id,
                    'bracket_position' => 3,
                ]);

                // QF 4: Juara D vs Runner C -> Semi 2
                Match_::create([
                    'tournament_id' => $tournament->id,
                    'stage' => 'quarterfinal',
                    'status' => 'scheduled',
                    'home_team_id' => $j1D,
                    'away_team_id' => $j2C,
                    'next_match_id' => $semi2->id,
                    'bracket_position' => 4,
                ]);
            }

            // Update tournament status to bracket stage
            $tournament->update(['status' => 'bracket_stage']);

            DB::commit();
            return back()->with('success', 'Bagan bracket gugur berhasil di-generate dari klasemen akhir pool!');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Gagal men-generate bagan: ' . $e->getMessage());
        }
    }
}
