<?php

namespace Tests\Feature;

use App\Models\BracketMatrix;
use App\Models\Match_;
use App\Models\MatchSet;
use App\Models\Pool;
use App\Models\PoolStanding;
use App\Models\Team;
use App\Models\Tournament;
use App\Models\User;
use App\Services\PlaceholderResolverService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BracketWinnerCorrectionTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $referee;
    protected Tournament $tournament;
    protected Pool $poolB;
    protected Team $teamA;
    protected Team $teamB;
    protected Match_ $poolMatch;
    protected Match_ $bracketMatch;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin@test.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $this->referee = User::create([
            'name' => 'Referee User',
            'email' => 'referee@test.com',
            'password' => bcrypt('password'),
            'role' => 'referee',
            'is_active' => true,
        ]);

        $this->tournament = Tournament::create([
            'name' => 'UNJ OPEN 2026',
            'start_date' => now(),
            'end_date' => now()->addDays(3),
            'mode' => 'regu',
            'status' => 'pool_stage',
            'created_by' => $this->admin->id,
        ]);

        $this->poolB = Pool::create([
            'tournament_id' => $this->tournament->id,
            'name' => 'B',
            'match_mode' => 'regu',
            'bracket_name' => 'Knock out RPA',
        ]);

        $this->teamA = Team::create([
            'name' => 'Team A (RPA UNJ B)',
            'region' => 'JAKARTA',
        ]);

        $this->teamB = Team::create([
            'name' => 'Team B (RPA PPOP A)',
            'region' => 'JAKARTA',
        ]);

        $this->poolB->teams()->attach([$this->teamA->id, $this->teamB->id]);
        PoolStanding::create(['pool_id' => $this->poolB->id, 'team_id' => $this->teamA->id]);
        PoolStanding::create(['pool_id' => $this->poolB->id, 'team_id' => $this->teamB->id]);

        // 1. Setup Pool Match where initially Team B won mistakenly (Set 1: 15-21, Set 2: 18-21)
        $this->poolMatch = Match_::create([
            'tournament_id' => $this->tournament->id,
            'pool_id' => $this->poolB->id,
            'stage' => 'pool',
            'home_team_id' => $this->teamA->id,
            'away_team_id' => $this->teamB->id,
            'referee_id' => $this->referee->id,
            'status' => 'finished',
            'winner_team_id' => $this->teamB->id,
            'max_sets' => 3,
            'match_mode' => 'regu',
            'bracket_group' => 'Knock out RPA',
        ]);

        $s1 = MatchSet::create([
            'match_id' => $this->poolMatch->id,
            'set_number' => 1,
            'home_score' => 15,
            'away_score' => 21,
            'status' => 'finished',
            'winner_team_id' => $this->teamB->id,
        ]);

        $s2 = MatchSet::create([
            'match_id' => $this->poolMatch->id,
            'set_number' => 2,
            'home_score' => 18,
            'away_score' => 21,
            'status' => 'finished',
            'winner_team_id' => $this->teamB->id,
        ]);

        PoolStanding::recalculate($this->poolB->id);

        // 2. Setup Bracket Matrix for Round of 16 (Match #344 equivalent)
        BracketMatrix::create([
            'tournament_id' => $this->tournament->id,
            'match_mode' => 'regu',
            'bracket_name' => 'Knock out RPA',
            'bracket_stage' => 'round_of_16',
            'bracket_position' => 2,
            'home_source' => 'pool_B_rank_1',
            'away_source' => 'pool_E_rank_2',
        ]);

        $this->bracketMatch = Match_::create([
            'tournament_id' => $this->tournament->id,
            'stage' => 'round_of_16',
            'bracket_position' => 2,
            'match_mode' => 'regu',
            'bracket_group' => 'Knock out RPA',
            'referee_id' => $this->referee->id,
            'max_sets' => 3,
            'status' => 'scheduled',
            'home_placeholder' => 'pool_B_rank_1',
            'away_placeholder' => 'pool_E_rank_2',
        ]);
    }

    /**
     * Test that when an earlier pool match score/winner is corrected,
     * a subsequent live bracket match automatically updates its team to the new winner.
     */
    public function test_bracket_match_updates_team_when_pool_winner_is_corrected_even_if_already_live(): void
    {
        // First resolve: Team B (Rank 1 Pool B) should enter bracketMatch home side
        $resolver = app(PlaceholderResolverService::class);
        $resolver->resolveForMatch($this->bracketMatch);

        $this->bracketMatch->refresh();
        $this->assertEquals($this->teamB->id, $this->bracketMatch->home_team_id);

        // Referee starts the bracket match (status becomes 'live')
        $this->actingAs($this->referee)->post(route('scoring.start', $this->bracketMatch->id));
        $this->bracketMatch->refresh();
        $this->assertEquals('live', $this->bracketMatch->status);

        // Now: User edits the earlier pool match scores so Team A won (21-15, 21-18)
        $set1 = $this->poolMatch->sets()->where('set_number', 1)->first();
        $set2 = $this->poolMatch->sets()->where('set_number', 2)->first();

        $set1->update(['home_score' => 21, 'away_score' => 15]);
        $set2->update(['home_score' => 21, 'away_score' => 18]);

        // Finish set / updateScore triggers recalculation of winner
        $this->actingAs($this->referee)->post(route('scoring.finish-set', $this->poolMatch->id), [
            'match_set_id' => $set2->id,
        ]);

        $this->poolMatch->refresh();
        $this->assertEquals($this->teamA->id, $this->poolMatch->winner_team_id);

        // Check Pool B standings
        $standing1 = PoolStanding::where('pool_id', $this->poolB->id)->where('rank', 1)->first();
        $this->assertEquals($this->teamA->id, $standing1->team_id);

        // Verify the bracket match was automatically updated to Team A
        $this->bracketMatch->refresh();
        $this->assertEquals($this->teamA->id, $this->bracketMatch->home_team_id, 'Bracket match home team should update to Team A even when live');

        // Test referee screen show endpoint also keeps it fresh
        $response = $this->actingAs($this->referee)->get(route('scoring.show', $this->bracketMatch->id));
        $response->assertOk();
        $this->bracketMatch->refresh();
        $this->assertEquals($this->teamA->id, $this->bracketMatch->home_team_id);

        // Test explicit sync-bracket endpoint
        $syncResponse = $this->actingAs($this->referee)->post(route('scoring.sync-bracket', $this->bracketMatch->id));
        $syncResponse->assertSessionHasNoErrors();
        $this->bracketMatch->refresh();
        $this->assertEquals($this->teamA->id, $this->bracketMatch->home_team_id);
    }

    /**
     * Test finalize match endpoint explicitly finishes the match and saves the winner.
     */
    public function test_finalize_match_endpoint(): void
    {
        $match = Match_::create([
            'tournament_id' => $this->tournament->id,
            'stage' => 'round_of_16',
            'bracket_position' => 3,
            'match_mode' => 'regu',
            'home_team_id' => $this->teamA->id,
            'away_team_id' => $this->teamB->id,
            'referee_id' => $this->referee->id,
            'status' => 'live',
            'max_sets' => 3,
        ]);

        MatchSet::create([
            'match_id' => $match->id,
            'set_number' => 1,
            'home_score' => 21,
            'away_score' => 17,
            'status' => 'finished',
        ]);

        MatchSet::create([
            'match_id' => $match->id,
            'set_number' => 2,
            'home_score' => 21,
            'away_score' => 19,
            'status' => 'finished',
        ]);

        $response = $this->actingAs($this->referee)->post(route('scoring.finalize', $match->id));
        $response->assertRedirect();
        $response->assertSessionHas('success');

        $match->refresh();
        $this->assertEquals('finished', $match->status);
        $this->assertEquals($this->teamA->id, $match->winner_team_id);
    }

    /**
     * Test reset to setup endpoint reverts a live match to setup mode.
     */
    public function test_reset_to_setup_endpoint(): void
    {
        $match = Match_::create([
            'tournament_id' => $this->tournament->id,
            'stage' => 'round_of_16',
            'bracket_position' => 4,
            'match_mode' => 'regu',
            'home_team_id' => $this->teamA->id,
            'away_team_id' => $this->teamB->id,
            'referee_id' => $this->referee->id,
            'status' => 'live',
            'max_sets' => 3,
            'started_at' => now(),
        ]);

        MatchSet::create([
            'match_id' => $match->id,
            'set_number' => 1,
            'home_score' => 0,
            'away_score' => 0,
            'status' => 'live',
        ]);

        $response = $this->actingAs($this->referee)->post(route('scoring.reset-to-setup', $match->id));
        $response->assertRedirect();
        $response->assertSessionHas('success');

        $match->refresh();
        $this->assertEquals('setup', $match->status);
        $this->assertNull($match->started_at);

        $set1 = $match->sets()->where('set_number', 1)->first();
        $this->assertEquals('pending', $set1->status);
    }

    /**
     * Test that editing a set score on an already finished match flips set winner and match winner,
     * and saves the finished match state properly without being stuck in live.
     */
    public function test_editing_score_and_finishing_set_saves_changes_and_finishes_match(): void
    {
        // 1. Create a match initially won by Team B (2 sets to 1)
        $match = Match_::create([
            'tournament_id' => $this->tournament->id,
            'pool_id' => $this->poolB->id,
            'stage' => 'pool',
            'home_team_id' => $this->teamA->id,
            'away_team_id' => $this->teamB->id,
            'referee_id' => $this->referee->id,
            'status' => 'finished',
            'winner_team_id' => $this->teamB->id,
            'max_sets' => 3,
            'match_mode' => 'regu',
            'bracket_group' => 'Knock out RPA',
        ]);

        $set1 = MatchSet::create([
            'match_id' => $match->id,
            'set_number' => 1,
            'home_score' => 21,
            'away_score' => 15,
            'status' => 'finished',
            'winner_team_id' => $this->teamA->id,
        ]);

        $set2 = MatchSet::create([
            'match_id' => $match->id,
            'set_number' => 2,
            'home_score' => 15,
            'away_score' => 21,
            'status' => 'finished',
            'winner_team_id' => $this->teamB->id,
        ]);

        $set3 = MatchSet::create([
            'match_id' => $match->id,
            'set_number' => 3,
            'home_score' => 18,
            'away_score' => 21,
            'status' => 'finished',
            'winner_team_id' => $this->teamB->id,
        ]);

        // 2. Referee enters edit mode on Set 3: reverses score to 22-20 for Team A
        $set3->update(['home_score' => 22, 'away_score' => 20]);

        // Call finish-set endpoint on the edited set
        $res = $this->actingAs($this->referee)->post(route('scoring.finish-set', $match->id), [
            'match_set_id' => $set3->id,
        ]);

        $res->assertOk();
        $data = $res->json();
        $this->assertTrue($data['matchFinished']);
        $this->assertEquals($this->teamA->id, $data['winner']);

        $match->refresh();
        $this->assertEquals('finished', $match->status, 'Match status must remain finished');
        $this->assertEquals($this->teamA->id, $match->winner_team_id, 'Match winner must flip to Team A');

        $set3->refresh();
        $this->assertEquals($this->teamA->id, $set3->winner_team_id, 'Set 3 winner must flip to Team A');
    }
}
