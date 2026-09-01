<?php

namespace Tests\Feature;

use App\Models\BracketMatrix;
use App\Models\Court;
use App\Models\Match_;
use App\Models\MatchSet;
use App\Models\Pool;
use App\Models\PoolStanding;
use App\Models\SuperTeam;
use App\Models\TimeSlot;
use App\Models\Tournament;
use App\Models\User;
use App\Services\MasterScheduleGeneratorService;
use App\Services\PlaceholderResolverService;
use App\Services\TimeSlotGeneratorService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TeamReguPoolAndBracketTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $referee;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::create([
            'name'      => 'Admin User',
            'email'     => 'admin_team_test@test.com',
            'password'  => bcrypt('password'),
            'role'      => 'admin',
            'is_active' => true,
        ]);

        $this->referee = User::create([
            'name'      => 'Referee User',
            'email'     => 'referee_team_test@test.com',
            'password'  => bcrypt('password'),
            'role'      => 'referee',
            'is_active' => true,
        ]);
    }

    /**
     * Test 10 Super Teams in 2 Pools (5 in Pool A, 5 in Pool B) with Direct Final (Juara A vs Juara B).
     */
    public function test_ten_super_teams_two_pools_direct_final(): void
    {
        $tournament = Tournament::create([
            'name'                     => 'Kejurda Team Regu 10 Tim',
            'start_date'               => now()->toDateString(),
            'end_date'                 => now()->addDays(3)->toDateString(),
            'mode'                     => 'regu',
            'status'                   => 'pool_stage',
            'total_days'               => 3,
            'courts_count'             => 4,
            'session_start_time'       => '08:00:00',
            'session_end_time'         => '18:00:00',
            'session_duration_minutes' => 45,
            'break_duration_minutes'   => 15,
            'created_by'               => $this->admin->id,
        ]);

        $tournament->modes()->create([
            'match_mode' => 'team_regu',
            'pool_count' => 2,
            'is_active'  => true,
        ]);

        // Create Pool A & Pool B
        $poolA = Pool::create(['tournament_id' => $tournament->id, 'name' => 'A', 'match_mode' => 'team_regu']);
        $poolB = Pool::create(['tournament_id' => $tournament->id, 'name' => 'B', 'match_mode' => 'team_regu']);

        // Create 10 Super Teams: 5 in Pool A, 5 in Pool B
        $superTeamsA = [];
        for ($i = 1; $i <= 5; $i++) {
            $st = SuperTeam::create([
                'tournament_id' => $tournament->id,
                'name'          => "Super Team A{$i}",
                'match_mode'    => 'team_regu',
                'pool_id'       => $poolA->id,
                'created_by'    => $this->admin->id,
            ]);
            PoolStanding::create(['pool_id' => $poolA->id, 'super_team_id' => $st->id]);
            $superTeamsA[] = $st;
        }

        $superTeamsB = [];
        for ($i = 1; $i <= 5; $i++) {
            $st = SuperTeam::create([
                'tournament_id' => $tournament->id,
                'name'          => "Super Team B{$i}",
                'match_mode'    => 'team_regu',
                'pool_id'       => $poolB->id,
                'created_by'    => $this->admin->id,
            ]);
            PoolStanding::create(['pool_id' => $poolB->id, 'super_team_id' => $st->id]);
            $superTeamsB[] = $st;
        }

        // Bracket Matrix: Direct Final (1 Winner from Bracket A vs 1 Winner from Bracket B)
        BracketMatrix::create([
            'tournament_id'    => $tournament->id,
            'match_mode'       => 'team_regu',
            'bracket_stage'    => 'final',
            'bracket_position' => 1,
            'home_source'      => 'pool_A_rank_1',
            'away_source'      => 'pool_B_rank_1',
        ]);

        // Generate Time slots & Courts
        app(TimeSlotGeneratorService::class)->generate($tournament);

        // Generate Schedule
        $scheduleStats = app(MasterScheduleGeneratorService::class)->generate($tournament);

        $this->assertEquals(20, $scheduleStats['team_matches_scheduled']); // 5C2 in A = 10, 5C2 in B = 10 -> Total 20 pool matches
        $this->assertEquals(1, $scheduleStats['bracket_matches_created']);  // 1 Final match

        // Check Final match created with span 3 and placeholder
        $finalMatch = Match_::where('tournament_id', $tournament->id)
            ->where('stage', 'final')
            ->where('match_mode', 'team_regu')
            ->first();

        $this->assertNotNull($finalMatch);
        $this->assertEquals(3, $finalMatch->slot_span);
        $this->assertEquals('Juara Pool A', $finalMatch->home_placeholder);
        $this->assertEquals('Juara Pool B', $finalMatch->away_placeholder);
        $this->assertNull($finalMatch->home_super_team_id);
        $this->assertNull($finalMatch->away_super_team_id);

        // Simulate finishing Pool A matches so SuperTeam A1 wins all matches
        $poolAMatches = Match_::where('pool_id', $poolA->id)->get();
        foreach ($poolAMatches as $m) {
            $winnerId = ($m->home_super_team_id === $superTeamsA[0]->id) ? $superTeamsA[0]->id :
                        (($m->away_super_team_id === $superTeamsA[0]->id) ? $superTeamsA[0]->id : $m->home_super_team_id);

            $m->update([
                'status'               => 'finished',
                'winner_super_team_id' => $winnerId,
            ]);

            // Add sets
            MatchSet::create([
                'match_id'              => $m->id,
                'set_number'            => 1,
                'home_score'            => $winnerId === $m->home_super_team_id ? 21 : 15,
                'away_score'            => $winnerId === $m->home_super_team_id ? 15 : 21,
                'status'                => 'finished',
                'winner_super_team_id'  => $winnerId,
            ]);
        }

        // Recalculate Pool A standings
        PoolStanding::recalculate($poolA->id);

        $standingA1 = PoolStanding::where('pool_id', $poolA->id)->where('super_team_id', $superTeamsA[0]->id)->first();
        $this->assertEquals(1, $standingA1->rank);
        $this->assertEquals(4, $standingA1->won);

        // Resolve placeholders for Pool A
        $resolver = app(PlaceholderResolverService::class);
        $resolver->resolve($poolAMatches->last());

        $finalMatch->refresh();
        $this->assertEquals($superTeamsA[0]->id, $finalMatch->home_super_team_id);
        $this->assertNull($finalMatch->home_placeholder);
        $this->assertEquals('Juara Pool B', $finalMatch->away_placeholder);

        // Simulate finishing Pool B matches so SuperTeam B1 wins
        $poolBMatches = Match_::where('pool_id', $poolB->id)->get();
        foreach ($poolBMatches as $m) {
            $winnerId = ($m->home_super_team_id === $superTeamsB[0]->id) ? $superTeamsB[0]->id :
                        (($m->away_super_team_id === $superTeamsB[0]->id) ? $superTeamsB[0]->id : $m->home_super_team_id);

            $m->update([
                'status'               => 'finished',
                'winner_super_team_id' => $winnerId,
            ]);

            MatchSet::create([
                'match_id'              => $m->id,
                'set_number'            => 1,
                'home_score'            => $winnerId === $m->home_super_team_id ? 21 : 15,
                'away_score'            => $winnerId === $m->home_super_team_id ? 15 : 21,
                'status'                => 'finished',
                'winner_super_team_id'  => $winnerId,
            ]);
        }

        PoolStanding::recalculate($poolB->id);
        $resolver->resolve($poolBMatches->last());

        $finalMatch->refresh();
        $this->assertEquals($superTeamsA[0]->id, $finalMatch->home_super_team_id);
        $this->assertEquals($superTeamsB[0]->id, $finalMatch->away_super_team_id);
        $this->assertNull($finalMatch->away_placeholder);
    }

    /**
     * Test 10 Super Teams in 1 Single Pool (1 Pool, Top 2 to Direct Final).
     */
    public function test_ten_super_teams_one_pool_direct_final(): void
    {
        $tournament = Tournament::create([
            'name'                     => 'Kejurda 1 Pool 10 Tim',
            'start_date'               => now()->toDateString(),
            'end_date'                 => now()->addDays(4)->toDateString(),
            'mode'                     => 'regu',
            'status'                   => 'pool_stage',
            'total_days'               => 4,
            'courts_count'             => 4,
            'session_start_time'       => '08:00:00',
            'session_end_time'         => '18:00:00',
            'session_duration_minutes' => 45,
            'break_duration_minutes'   => 15,
            'created_by'               => $this->admin->id,
        ]);

        $tournament->modes()->create([
            'match_mode' => 'team_regu',
            'pool_count' => 1,
            'is_active'  => true,
        ]);

        $poolA = Pool::create(['tournament_id' => $tournament->id, 'name' => 'A', 'match_mode' => 'team_regu']);

        $superTeams = [];
        for ($i = 1; $i <= 10; $i++) {
            $st = SuperTeam::create([
                'tournament_id' => $tournament->id,
                'name'          => "Super Team #{$i}",
                'match_mode'    => 'team_regu',
                'pool_id'       => $poolA->id,
                'created_by'    => $this->admin->id,
            ]);
            PoolStanding::create(['pool_id' => $poolA->id, 'super_team_id' => $st->id]);
            $superTeams[] = $st;
        }

        // Bracket Matrix: Final (Rank 1 vs Rank 2 of Pool A)
        BracketMatrix::create([
            'tournament_id'    => $tournament->id,
            'match_mode'       => 'team_regu',
            'bracket_stage'    => 'final',
            'bracket_position' => 1,
            'home_source'      => 'pool_A_rank_1',
            'away_source'      => 'pool_A_rank_2',
        ]);

        app(TimeSlotGeneratorService::class)->generate($tournament);
        $scheduleStats = app(MasterScheduleGeneratorService::class)->generate($tournament);

        $this->assertEquals(45, $scheduleStats['team_matches_scheduled']); // 10C2 = 45 matches
        $this->assertEquals(1, $scheduleStats['bracket_matches_created']);

        $finalMatch = Match_::where('tournament_id', $tournament->id)
            ->where('stage', 'final')
            ->where('match_mode', 'team_regu')
            ->first();

        $this->assertNotNull($finalMatch);
        $this->assertEquals('Juara Pool A', $finalMatch->home_placeholder);
        $this->assertEquals('Runner-up Pool A', $finalMatch->away_placeholder);
    }

    /**
     * Test live scoring finishes team regu match, recalculates standings, and advances winner.
     */
    public function test_live_scoring_team_regu_standings_and_advancement(): void
    {
        $tournament = Tournament::create([
            'name'                     => 'Turnamen Team Regu Live Scoring',
            'start_date'               => now()->toDateString(),
            'end_date'                 => now()->addDays(2)->toDateString(),
            'mode'                     => 'regu',
            'status'                   => 'pool_stage',
            'created_by'               => $this->admin->id,
        ]);

        $pool = Pool::create(['tournament_id' => $tournament->id, 'name' => 'A', 'match_mode' => 'team_regu']);

        $st1 = SuperTeam::create(['tournament_id' => $tournament->id, 'name' => 'ST Alpha', 'match_mode' => 'team_regu', 'pool_id' => $pool->id, 'created_by' => $this->admin->id]);
        $st2 = SuperTeam::create(['tournament_id' => $tournament->id, 'name' => 'ST Beta', 'match_mode' => 'team_regu', 'pool_id' => $pool->id, 'created_by' => $this->admin->id]);

        PoolStanding::create(['pool_id' => $pool->id, 'super_team_id' => $st1->id]);
        PoolStanding::create(['pool_id' => $pool->id, 'super_team_id' => $st2->id]);

        // Create Pool Match
        $poolMatch = Match_::create([
            'tournament_id'      => $tournament->id,
            'pool_id'            => $pool->id,
            'match_mode'         => 'team_regu',
            'stage'              => 'pool',
            'home_super_team_id' => $st1->id,
            'away_super_team_id' => $st2->id,
            'max_sets'           => 3,
            'status'             => 'live',
        ]);

        $set1 = MatchSet::create(['match_id' => $poolMatch->id, 'set_number' => 1, 'home_score' => 21, 'away_score' => 10, 'status' => 'live']);
        $set2 = MatchSet::create(['match_id' => $poolMatch->id, 'set_number' => 2, 'home_score' => 21, 'away_score' => 12, 'status' => 'pending']);

        // Referee finishes set 1 via API
        $res1 = $this->actingAs($this->referee)->post(route('scoring.finish-set', $poolMatch->id), [
            'match_set_id' => $set1->id,
        ]);
        $res1->assertOk();
        $this->assertFalse($res1->json('matchFinished'));

        // Referee finishes set 2 via API (ST1 wins 2-0)
        $res2 = $this->actingAs($this->referee)->post(route('scoring.finish-set', $poolMatch->id), [
            'match_set_id' => $set2->id,
        ]);
        $res2->assertOk();
        $this->assertTrue($res2->json('matchFinished'));

        // Check match state
        $poolMatch->refresh();
        $this->assertEquals('finished', $poolMatch->status);
        $this->assertEquals($st1->id, $poolMatch->winner_super_team_id);

        // Check PoolStandings recalculated automatically
        $standing1 = PoolStanding::where('pool_id', $pool->id)->where('super_team_id', $st1->id)->first();
        $standing2 = PoolStanding::where('pool_id', $pool->id)->where('super_team_id', $st2->id)->first();

        $this->assertEquals(1, $standing1->won);
        $this->assertEquals(1, $standing1->rank);
        $this->assertEquals(0, $standing2->won);
        $this->assertEquals(2, $standing2->rank);
    }

    /**
     * Test 10 Super Teams in 2 Brackets: Final Bracket 1 (A1 vs A2) & Final Bracket 2 (B1 vs B2) - Finish.
     */
    public function test_two_separate_bracket_finals_finish(): void
    {
        $tournament = Tournament::create([
            'name'                     => 'Kejurda 2 Bracket Finish',
            'start_date'               => now()->toDateString(),
            'end_date'                 => now()->addDays(3)->toDateString(),
            'mode'                     => 'regu',
            'status'                   => 'pool_stage',
            'total_days'               => 3,
            'courts_count'             => 4,
            'session_start_time'       => '08:00:00',
            'session_end_time'         => '18:00:00',
            'session_duration_minutes' => 45,
            'break_duration_minutes'   => 15,
            'created_by'               => $this->admin->id,
        ]);

        $tournament->modes()->create([
            'match_mode' => 'team_regu',
            'pool_count' => 2,
            'is_active'  => true,
        ]);

        $poolA = Pool::create(['tournament_id' => $tournament->id, 'name' => 'A', 'match_mode' => 'team_regu']);
        $poolB = Pool::create(['tournament_id' => $tournament->id, 'name' => 'B', 'match_mode' => 'team_regu']);

        $superTeamsA = [];
        for ($i = 1; $i <= 5; $i++) {
            $st = SuperTeam::create([
                'tournament_id' => $tournament->id,
                'name'          => "Super Team A{$i}",
                'match_mode'    => 'team_regu',
                'pool_id'       => $poolA->id,
                'created_by'    => $this->admin->id,
            ]);
            PoolStanding::create(['pool_id' => $poolA->id, 'super_team_id' => $st->id]);
            $superTeamsA[] = $st;
        }

        $superTeamsB = [];
        for ($i = 1; $i <= 5; $i++) {
            $st = SuperTeam::create([
                'tournament_id' => $tournament->id,
                'name'          => "Super Team B{$i}",
                'match_mode'    => 'team_regu',
                'pool_id'       => $poolB->id,
                'created_by'    => $this->admin->id,
            ]);
            PoolStanding::create(['pool_id' => $poolB->id, 'super_team_id' => $st->id]);
            $superTeamsB[] = $st;
        }

        // Bracket Matrix: 2 Separate Finals
        // Final Bracket 1: A1 vs A2 (Juara Bracket 1 - Selesai)
        BracketMatrix::create([
            'tournament_id'    => $tournament->id,
            'match_mode'       => 'team_regu',
            'bracket_stage'    => 'final',
            'bracket_position' => 1,
            'home_source'      => 'pool_A_rank_1',
            'away_source'      => 'pool_A_rank_2',
        ]);

        // Final Bracket 2: B1 vs B2 (Juara Bracket 2 - Selesai)
        BracketMatrix::create([
            'tournament_id'    => $tournament->id,
            'match_mode'       => 'team_regu',
            'bracket_stage'    => 'final',
            'bracket_position' => 2,
            'home_source'      => 'pool_B_rank_1',
            'away_source'      => 'pool_B_rank_2',
        ]);

        app(TimeSlotGeneratorService::class)->generate($tournament);
        $scheduleStats = app(MasterScheduleGeneratorService::class)->generate($tournament);

        $this->assertEquals(20, $scheduleStats['team_matches_scheduled']);
        $this->assertEquals(2, $scheduleStats['bracket_matches_created']); // 2 Final matches

        $finals = Match_::where('tournament_id', $tournament->id)
            ->where('stage', 'final')
            ->where('match_mode', 'team_regu')
            ->orderBy('bracket_position')
            ->get();

        $this->assertCount(2, $finals);
        $this->assertEquals('Juara Pool A', $finals[0]->home_placeholder);
        $this->assertEquals('Runner-up Pool A', $finals[0]->away_placeholder);
        $this->assertEquals('Juara Pool B', $finals[1]->home_placeholder);
        $this->assertEquals('Runner-up Pool B', $finals[1]->away_placeholder);

        // Finish Pool A matches: A1 wins all, A2 wins 3
        $poolAMatches = Match_::where('pool_id', $poolA->id)->get();
        foreach ($poolAMatches as $m) {
            $winnerId = ($m->home_super_team_id === $superTeamsA[0]->id || $m->away_super_team_id === $superTeamsA[0]->id)
                ? $superTeamsA[0]->id
                : (($m->home_super_team_id === $superTeamsA[1]->id || $m->away_super_team_id === $superTeamsA[1]->id) ? $superTeamsA[1]->id : $m->home_super_team_id);

            $m->update(['status' => 'finished', 'winner_super_team_id' => $winnerId]);
            MatchSet::create([
                'match_id'             => $m->id,
                'set_number'           => 1,
                'home_score'           => $winnerId === $m->home_super_team_id ? 21 : 15,
                'away_score'           => $winnerId === $m->home_super_team_id ? 15 : 21,
                'status'               => 'finished',
                'winner_super_team_id' => $winnerId,
            ]);
        }

        PoolStanding::recalculate($poolA->id);
        app(PlaceholderResolverService::class)->resolve($poolAMatches->last());

        $finals[0]->refresh();
        $this->assertEquals($superTeamsA[0]->id, $finals[0]->home_super_team_id); // Rank 1 Bracket 1
        $this->assertEquals($superTeamsA[1]->id, $finals[0]->away_super_team_id); // Rank 2 Bracket 1
        $this->assertNull($finals[0]->home_placeholder);
        $this->assertNull($finals[0]->away_placeholder);
    }
}
