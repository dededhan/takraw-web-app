<?php

namespace Tests\Feature;

use App\Models\Tournament;
use App\Models\Pool;
use App\Models\Team;
use App\Models\Match_;
use App\Models\MatchSet;
use App\Models\PoolStanding;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TournamentBracketTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test that finished match recalculates pool standings correctly.
     */
    public function test_pool_match_finish_recalculates_standings(): void
    {
        // 1. Setup tournament, pool, and teams
        $admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin@test.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $referee = User::create([
            'name' => 'Referee User',
            'email' => 'referee@test.com',
            'password' => bcrypt('password'),
            'role' => 'referee',
            'is_active' => true,
        ]);

        $tournament = Tournament::create([
            'name' => 'Takraw Championship',
            'start_date' => now(),
            'end_date' => now()->addDays(2),
            'mode' => 'regu',
            'status' => 'pool_stage',
            'created_by' => $admin->id,
        ]);

        $pool = Pool::create([
            'tournament_id' => $tournament->id,
            'name' => 'A',
        ]);

        $teamA = Team::create([
            'name' => 'Team A',
            'region' => 'Jakarta',
            'coach_id' => null,
        ]);

        $teamB = Team::create([
            'name' => 'Team B',
            'region' => 'Bandung',
            'coach_id' => null,
        ]);

        // Assign teams to pool
        $pool->teams()->attach([$teamA->id, $teamB->id]);

        // Initialize standings
        PoolStanding::create(['pool_id' => $pool->id, 'team_id' => $teamA->id]);
        PoolStanding::create(['pool_id' => $pool->id, 'team_id' => $teamB->id]);

        // Create match
        $match = Match_::create([
            'tournament_id' => $tournament->id,
            'pool_id' => $pool->id,
            'stage' => 'pool',
            'home_team_id' => $teamA->id,
            'away_team_id' => $teamB->id,
            'referee_id' => $referee->id,
            'court_number' => 1,
            'max_sets' => 3,
            'status' => 'live',
        ]);

        // Pre-create sets
        $set1 = MatchSet::create([
            'match_id' => $match->id,
            'set_number' => 1,
            'status' => 'live',
        ]);

        $set2 = MatchSet::create([
            'match_id' => $match->id,
            'set_number' => 2,
            'status' => 'pending',
        ]);

        $set3 = MatchSet::create([
            'match_id' => $match->id,
            'set_number' => 3,
            'status' => 'pending',
        ]);

        // 2. Play Set 1 (Team A wins 21-19)
        $set1->update([
            'home_score' => 21,
            'away_score' => 19,
        ]);

        $response1 = $this->actingAs($referee)
            ->post(route('scoring.finish-set', $match->id), [
                'match_set_id' => $set1->id,
            ]);

        $response1->assertOk();
        $this->assertFalse($response1->json('matchFinished'));

        // 3. Play Set 2 (Team A wins 21-15)
        $set2->refresh();
        $set2->update([
            'home_score' => 21,
            'away_score' => 15,
        ]);

        $response2 = $this->actingAs($referee)
            ->post(route('scoring.finish-set', $match->id), [
                'match_set_id' => $set2->id,
            ]);

        $response2->assertOk();
        $this->assertTrue($response2->json('matchFinished'));

        // 4. Verify match is finished and standings are updated
        $match->refresh();
        $this->assertEquals('finished', $match->status);
        $this->assertEquals($teamA->id, $match->winner_team_id);

        $standingA = PoolStanding::where('pool_id', $pool->id)->where('team_id', $teamA->id)->first();
        $standingB = PoolStanding::where('pool_id', $pool->id)->where('team_id', $teamB->id)->first();

        $this->assertEquals(1, $standingA->played);
        $this->assertEquals(1, $standingA->won);
        $this->assertEquals(0, $standingA->lost);
        $this->assertEquals(2, $standingA->sets_won);
        $this->assertEquals(0, $standingA->sets_lost);
        $this->assertEquals(42, $standingA->points_for);
        $this->assertEquals(34, $standingA->points_against);
        $this->assertEquals(1, $standingA->rank);

        $this->assertEquals(1, $standingB->played);
        $this->assertEquals(0, $standingB->won);
        $this->assertEquals(1, $standingB->lost);
        $this->assertEquals(0, $standingB->sets_won);
        $this->assertEquals(2, $standingB->sets_lost);
        $this->assertEquals(34, $standingB->points_for);
        $this->assertEquals(42, $standingB->points_against);
        $this->assertEquals(2, $standingB->rank);
    }

    /**
     * Test bracket generation with 2 pools.
     */
    public function test_bracket_generation_with_two_pools(): void
    {
        // 1. Setup tournament, pools, teams
        $admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin@test.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $tournament = Tournament::create([
            'name' => 'Takraw Championship',
            'start_date' => now(),
            'end_date' => now()->addDays(2),
            'mode' => 'regu',
            'status' => 'pool_stage',
            'created_by' => $admin->id,
        ]);

        // Pool A
        $poolA = Pool::create(['tournament_id' => $tournament->id, 'name' => 'A']);
        $teamA1 = Team::create(['name' => 'Team A1', 'region' => 'Jakarta']);
        $teamA2 = Team::create(['name' => 'Team A2', 'region' => 'Bandung']);
        $poolA->teams()->attach([$teamA1->id, $teamA2->id]);

        // Pool B
        $poolB = Pool::create(['tournament_id' => $tournament->id, 'name' => 'B']);
        $teamB1 = Team::create(['name' => 'Team B1', 'region' => 'Surabaya']);
        $teamB2 = Team::create(['name' => 'Team B2', 'region' => 'Semarang']);
        $poolB->teams()->attach([$teamB1->id, $teamB2->id]);

        // Create completed pool matches (otherwise bracket controller will complain)
        Match_::create([
            'tournament_id' => $tournament->id,
            'pool_id' => $poolA->id,
            'stage' => 'pool',
            'home_team_id' => $teamA1->id,
            'away_team_id' => $teamA2->id,
            'status' => 'finished',
            'winner_team_id' => $teamA1->id,
        ]);

        Match_::create([
            'tournament_id' => $tournament->id,
            'pool_id' => $poolB->id,
            'stage' => 'pool',
            'home_team_id' => $teamB1->id,
            'away_team_id' => $teamB2->id,
            'status' => 'finished',
            'winner_team_id' => $teamB1->id,
        ]);

        // Seed Standings directly
        PoolStanding::create(['pool_id' => $poolA->id, 'team_id' => $teamA1->id, 'played' => 1, 'won' => 1, 'rank' => 1]);
        PoolStanding::create(['pool_id' => $poolA->id, 'team_id' => $teamA2->id, 'played' => 1, 'won' => 0, 'rank' => 2]);
        PoolStanding::create(['pool_id' => $poolB->id, 'team_id' => $teamB1->id, 'played' => 1, 'won' => 1, 'rank' => 1]);
        PoolStanding::create(['pool_id' => $poolB->id, 'team_id' => $teamB2->id, 'played' => 1, 'won' => 0, 'rank' => 2]);

        // 2. Generate bracket as Admin
        $response = $this->actingAs($admin)
            ->post(route('tournaments.generate-bracket', $tournament->id));

        $response->assertRedirect();
        $response->assertSessionHas('success');

        // 3. Verify database state
        $tournament->refresh();
        $this->assertEquals('bracket_stage', $tournament->status);

        // Should have 4 new bracket matches (2 Semifinals, 1 Final, 1 Third Place)
        $bracketMatches = Match_::where('tournament_id', $tournament->id)
            ->where('stage', '!=', 'pool')
            ->get();

        $this->assertCount(4, $bracketMatches);

        $semifinals = $bracketMatches->where('stage', 'semifinal');
        $final = $bracketMatches->where('stage', 'final')->first();
        $thirdPlace = $bracketMatches->where('stage', 'third_place')->first();

        $this->assertCount(2, $semifinals);
        $this->assertNotNull($final);
        $this->assertNotNull($thirdPlace);

        // SF 1: Juara A (Team A1) vs Runner B (Team B2)
        $sf1 = $semifinals->where('bracket_position', 1)->first();
        $this->assertEquals($teamA1->id, $sf1->home_team_id);
        $this->assertEquals($teamB2->id, $sf1->away_team_id);
        $this->assertEquals($final->id, $sf1->next_match_id);

        // SF 2: Juara B (Team B1) vs Runner A (Team A2)
        $sf2 = $semifinals->where('bracket_position', 2)->first();
        $this->assertEquals($teamB1->id, $sf2->home_team_id);
        $this->assertEquals($teamA2->id, $sf2->away_team_id);
        $this->assertEquals($final->id, $sf2->next_match_id);

        // Final match teams should be TBD (null) initially
        $this->assertNull($final->home_team_id);
        $this->assertNull($final->away_team_id);
    }

    /**
     * Test bracket generation with 4 pools.
     */
    public function test_bracket_generation_with_four_pools(): void
    {
        // 1. Setup tournament, pools, teams
        $admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin@test.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $tournament = Tournament::create([
            'name' => 'Takraw Championship 4 Pools',
            'start_date' => now(),
            'end_date' => now()->addDays(2),
            'mode' => 'regu',
            'status' => 'pool_stage',
            'created_by' => $admin->id,
        ]);

        $pools = [];
        $teams = [];
        
        foreach (['A', 'B', 'C', 'D'] as $pName) {
            $pool = Pool::create(['tournament_id' => $tournament->id, 'name' => $pName]);
            $pools[$pName] = $pool;

            $team1 = Team::create(['name' => "Team {$pName}1", 'region' => 'Jakarta']);
            $team2 = Team::create(['name' => "Team {$pName}2", 'region' => 'Bandung']);
            $pool->teams()->attach([$team1->id, $team2->id]);

            // Completed match
            Match_::create([
                'tournament_id' => $tournament->id,
                'pool_id' => $pool->id,
                'stage' => 'pool',
                'home_team_id' => $team1->id,
                'away_team_id' => $team2->id,
                'status' => 'finished',
                'winner_team_id' => $team1->id,
            ]);

            // Seed Standings
            PoolStanding::create(['pool_id' => $pool->id, 'team_id' => $team1->id, 'played' => 1, 'won' => 1, 'rank' => 1]);
            PoolStanding::create(['pool_id' => $pool->id, 'team_id' => $team2->id, 'played' => 1, 'won' => 0, 'rank' => 2]);

            $teams[$pName . '1'] = $team1;
            $teams[$pName . '2'] = $team2;
        }

        // 2. Generate bracket as Admin
        $response = $this->actingAs($admin)
            ->post(route('tournaments.generate-bracket', $tournament->id));

        $response->assertRedirect();
        $response->assertSessionHas('success');

        // 3. Verify database state
        $tournament->refresh();
        $this->assertEquals('bracket_stage', $tournament->status);

        // Should have 8 new bracket matches (4 Quarterfinals, 2 Semifinals, 1 Final, 1 Third Place)
        $bracketMatches = Match_::where('tournament_id', $tournament->id)
            ->where('stage', '!=', 'pool')
            ->get();

        $this->assertCount(8, $bracketMatches);

        $qfs = $bracketMatches->where('stage', 'quarterfinal');
        $semis = $bracketMatches->where('stage', 'semifinal');
        $final = $bracketMatches->where('stage', 'final')->first();
        $thirdPlace = $bracketMatches->where('stage', 'third_place')->first();

        $this->assertCount(4, $qfs);
        $this->assertCount(2, $semis);
        $this->assertNotNull($final);
        $this->assertNotNull($thirdPlace);

        // Verify pre-wired connections
        $semi1 = $semis->where('bracket_position', 1)->first();
        $semi2 = $semis->where('bracket_position', 2)->first();

        $this->assertEquals($final->id, $semi1->next_match_id);
        $this->assertEquals($final->id, $semi2->next_match_id);

        // QF 1: Juara A (A1) vs Runner B (B2) -> Semi 1
        $qf1 = $qfs->where('bracket_position', 1)->first();
        $this->assertEquals($teams['A1']->id, $qf1->home_team_id);
        $this->assertEquals($teams['B2']->id, $qf1->away_team_id);
        $this->assertEquals($semi1->id, $qf1->next_match_id);

        // QF 2: Juara C (C1) vs Runner D (D2) -> Semi 1
        $qf2 = $qfs->where('bracket_position', 2)->first();
        $this->assertEquals($teams['C1']->id, $qf2->home_team_id);
        $this->assertEquals($teams['D2']->id, $qf2->away_team_id);
        $this->assertEquals($semi1->id, $qf2->next_match_id);

        // QF 3: Juara B (B1) vs Runner A (A2) -> Semi 2
        $qf3 = $qfs->where('bracket_position', 3)->first();
        $this->assertEquals($teams['B1']->id, $qf3->home_team_id);
        $this->assertEquals($teams['A2']->id, $qf3->away_team_id);
        $this->assertEquals($semi2->id, $qf3->next_match_id);

        // QF 4: Juara D (D1) vs Runner C (C2) -> Semi 2
        $qf4 = $qfs->where('bracket_position', 4)->first();
        $this->assertEquals($teams['D1']->id, $qf4->home_team_id);
        $this->assertEquals($teams['C2']->id, $qf4->away_team_id);
        $this->assertEquals($semi2->id, $qf4->next_match_id);
    }

    /**
     * Test admin can add team to a tournament in registration stage.
     */
    public function test_admin_can_add_team_to_tournament(): void
    {
        $admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin@test.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $tournament = Tournament::create([
            'name' => 'Admin Team Add Test',
            'start_date' => now(),
            'end_date' => now()->addDays(2),
            'mode' => 'regu',
            'status' => 'registration',
            'created_by' => $admin->id,
        ]);

        $team = Team::create([
            'name' => 'Testing Team',
            'region' => 'Depok',
        ]);

        $response = $this->actingAs($admin)
            ->post(route('tournaments.add-team', $tournament->id), [
                'team_id' => $team->id,
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');
        
        $this->assertTrue($tournament->teams()->where('team_id', $team->id)->exists());
    }

    /**
     * Test admin cannot add team to tournament if stage is pool_stage.
     */
    public function test_admin_cannot_add_team_to_tournament_in_pool_stage(): void
    {
        $admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin@test.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $tournament = Tournament::create([
            'name' => 'Admin Team Add Test Pool Stage',
            'start_date' => now(),
            'end_date' => now()->addDays(2),
            'mode' => 'regu',
            'status' => 'pool_stage',
            'created_by' => $admin->id,
        ]);

        $team = Team::create([
            'name' => 'Testing Team',
            'region' => 'Depok',
        ]);

        $response = $this->actingAs($admin)
            ->post(route('tournaments.add-team', $tournament->id), [
                'team_id' => $team->id,
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('error');
        
        $this->assertFalse($tournament->teams()->where('team_id', $team->id)->exists());
    }

    /**
     * Test admin can remove team from a tournament in registration stage.
     */
    public function test_admin_can_remove_team_from_tournament(): void
    {
        $admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin@test.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $tournament = Tournament::create([
            'name' => 'Admin Team Remove Test',
            'start_date' => now(),
            'end_date' => now()->addDays(2),
            'mode' => 'regu',
            'status' => 'registration',
            'created_by' => $admin->id,
        ]);

        $team = Team::create([
            'name' => 'Testing Team',
            'region' => 'Depok',
        ]);

        $tournament->teams()->attach($team->id, ['match_mode' => 'regu']);

        $response = $this->actingAs($admin)
            ->delete(route('tournaments.remove-team', [$tournament->id, $team->id]));

        $response->assertRedirect();
        $response->assertSessionHas('success');
        
        $this->assertFalse($tournament->teams()->where('team_id', $team->id)->exists());
    }

    /**
     * Test admin cannot remove team if the team is already assigned to a pool.
     */
    public function test_admin_cannot_remove_team_if_already_in_pool(): void
    {
        $admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin@test.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $tournament = Tournament::create([
            'name' => 'Admin Team Remove Pool Safety Test',
            'start_date' => now(),
            'end_date' => now()->addDays(2),
            'mode' => 'regu',
            'status' => 'registration',
            'created_by' => $admin->id,
        ]);

        $team = Team::create([
            'name' => 'Testing Team',
            'region' => 'Depok',
        ]);

        $tournament->teams()->attach($team->id, ['match_mode' => 'regu']);

        $pool = Pool::create([
            'tournament_id' => $tournament->id,
            'name' => 'A',
        ]);
        $pool->teams()->attach($team->id);

        // Try to remove
        $response = $this->actingAs($admin)
            ->delete(route('tournaments.remove-team', [$tournament->id, $team->id]));

        $response->assertRedirect();
        $response->assertSessionHas('error'); // Should fail because team is in pool
        
        $this->assertTrue($tournament->teams()->where('team_id', $team->id)->exists());
    }
}

