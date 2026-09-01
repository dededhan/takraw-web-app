<?php

namespace Tests\Feature;

use App\Models\Athlete;
use App\Models\Match_;
use App\Models\MatchSet;
use App\Models\Pool;
use App\Models\SuperTeam;
use App\Models\Team;
use App\Models\Tournament;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ScoringTeamReguTest extends TestCase
{
    use RefreshDatabase;

    protected User $referee;
    protected Tournament $tournament;
    protected SuperTeam $stHome;
    protected SuperTeam $stAway;
    protected Match_ $match;

    protected function setUp(): void
    {
        parent::setUp();

        $admin = User::create([
            'name'      => 'Admin User',
            'email'     => 'admin_test@test.com',
            'password'  => bcrypt('password'),
            'role'      => 'admin',
            'is_active' => true,
        ]);
        $this->referee = User::create([
            'name'      => 'Referee User',
            'email'     => 'referee_test@test.com',
            'password'  => bcrypt('password'),
            'role'      => 'referee',
            'is_active' => true,
        ]);

        $this->tournament = Tournament::create([
            'name'       => 'Turnamen Test Team Regu',
            'start_date' => now()->toDateString(),
            'end_date'   => now()->addDays(2)->toDateString(),
            'mode'       => 'regu',
            'status'     => 'pool_stage',
            'created_by' => $admin->id,
        ]);

        $pool = Pool::create(['tournament_id' => $this->tournament->id, 'name' => 'A', 'match_mode' => 'team_regu']);

        $this->stHome = SuperTeam::create([
            'tournament_id' => $this->tournament->id,
            'name'          => 'Super Team Home',
            'match_mode'    => 'team_regu',
            'pool_id'       => $pool->id,
            'created_by'    => $admin->id,
        ]);

        $this->stAway = SuperTeam::create([
            'tournament_id' => $this->tournament->id,
            'name'          => 'Super Team Away',
            'match_mode'    => 'team_regu',
            'pool_id'       => $pool->id,
            'created_by'    => $admin->id,
        ]);

        // 3 sub-teams for each SuperTeam
        for ($i = 1; $i <= 3; $i++) {
            $subH = Team::create([
                'name'                  => "ST Home-$i",
                'region'                => 'Jakarta',
                'is_super_sub'          => true,
                'parent_super_team_id'  => $this->stHome->id,
            ]);
            $this->stHome->members()->attach($subH->id);

            $subA = Team::create([
                'name'                  => "ST Away-$i",
                'region'                => 'Jakarta',
                'is_super_sub'          => true,
                'parent_super_team_id'  => $this->stAway->id,
            ]);
            $this->stAway->members()->attach($subA->id);
        }

        $this->match = Match_::create([
            'tournament_id'      => $this->tournament->id,
            'pool_id'            => $pool->id,
            'match_mode'         => 'team_regu',
            'stage'              => 'pool',
            'home_super_team_id' => $this->stHome->id,
            'away_super_team_id' => $this->stAway->id,
            'referee_id'         => $this->referee->id,
            'status'             => 'scheduled',
            'max_sets'           => 9,
        ]);
    }

    public function test_quick_athlete_can_be_added_on_the_fly(): void
    {
        // 1. Start match
        $this->actingAs($this->referee)->post(route('scoring.start', $this->match->id));
        $this->match->refresh();
        $this->assertEquals('live', $this->match->status);

        $subTeam = $this->stHome->members->first();

        // 2. Add dadakan athlete #15
        $res = $this->actingAs($this->referee)->post(route('scoring.quick-athlete', $this->match->id), [
            'team_id'       => $subTeam->id,
            'jersey_number' => 15,
            'name'          => 'Bintang Dadakan',
            'position'      => 'Tekong',
        ]);

        $res->assertOk();
        $res->assertJsonPath('success', true);
        $res->assertJsonPath('athlete.jersey_number', 15);
        $res->assertJsonPath('athlete.name', 'Bintang Dadakan');

        // Athlete exists in DB
        $this->assertDatabaseHas('athletes', [
            'team_id'       => $subTeam->id,
            'jersey_number' => 15,
            'name'          => 'Bintang Dadakan',
        ]);
    }

    public function test_team_regu_multi_session_flow(): void
    {
        // Setup & start match
        $this->actingAs($this->referee)->post(route('scoring.setup', $this->match->id), [
            'court_number' => 1,
            'max_sets'     => 9,
        ]);
        $this->actingAs($this->referee)->post(route('scoring.start', $this->match->id));

        $set1 = $this->match->sets()->where('set_number', 1)->first();
        $set2 = $this->match->sets()->where('set_number', 2)->first();
        $set3 = $this->match->sets()->where('set_number', 3)->first();

        // Regu 1:
        // Set 1: Away wins (2 - 6)
        $set1->update(['home_score' => 2, 'away_score' => 6]);
        $res1 = $this->actingAs($this->referee)->post(route('scoring.finish-set', $this->match->id), [
            'match_set_id' => $set1->id,
        ]);
        $res1->assertOk();
        $this->assertFalse($res1->json('reguFinished'));

        // Set 2: Home wins (2 - 0)
        $set2->update(['home_score' => 2, 'away_score' => 0]);
        $res2 = $this->actingAs($this->referee)->post(route('scoring.finish-set', $this->match->id), [
            'match_set_id' => $set2->id,
        ]);
        $res2->assertOk();
        $this->assertFalse($res2->json('reguFinished'));

        // Set 3: Home wins (5 - 0) -> Regu 1 finishes (2-1 for Home)!
        $set3->update(['home_score' => 5, 'away_score' => 0]);
        $res3 = $this->actingAs($this->referee)->post(route('scoring.finish-set', $this->match->id), [
            'match_set_id' => $set3->id,
        ]);
        $res3->assertOk();
        $this->assertTrue($res3->json('reguFinished'));
        $this->assertEquals($this->stHome->id, $res3->json('reguWinner'));
        $this->assertEquals(1, $res3->json('regusWonHome'));
        $this->assertEquals(0, $res3->json('regusWonAway'));
        $this->assertEquals(1, $res3->json('nextReguIndex'));

        // Regu 2:
        // Set 4: Home wins (21 - 10)
        $set4 = $this->match->sets()->where('set_number', 4)->first();
        $this->assertEquals('live', $set4->status);
        $set4->update(['home_score' => 21, 'away_score' => 10]);
        $this->actingAs($this->referee)->post(route('scoring.finish-set', $this->match->id), [
            'match_set_id' => $set4->id,
        ]);

        // Set 5: Home wins (21 - 12) -> Regu 2 finishes (2-0 for Home), transitions to Regu 3!
        $set5 = $this->match->sets()->where('set_number', 5)->first();
        $set5->update(['home_score' => 21, 'away_score' => 12]);
        $res5 = $this->actingAs($this->referee)->post(route('scoring.finish-set', $this->match->id), [
            'match_set_id' => $set5->id,
        ]);
        $res5->assertOk();
        $this->assertTrue($res5->json('reguFinished'));
        $this->assertEquals($this->stHome->id, $res5->json('reguWinner'));
        $this->assertEquals(2, $res5->json('regusWonHome'));
        $this->assertEquals(0, $res5->json('regusWonAway'));
        $this->assertEquals(2, $res5->json('nextReguIndex'));
        $this->assertFalse($res5->json('matchFinished'));

        // Regu 3:
        // Set 7: Home wins (21 - 19)
        $set7 = $this->match->sets()->where('set_number', 7)->first();
        $this->assertEquals('live', $set7->status);
        $set7->update(['home_score' => 21, 'away_score' => 19]);
        $this->actingAs($this->referee)->post(route('scoring.finish-set', $this->match->id), [
            'match_set_id' => $set7->id,
        ]);

        // Set 8: Away wins (18 - 21)
        $set8 = $this->match->sets()->where('set_number', 8)->first();
        $set8->update(['home_score' => 18, 'away_score' => 21]);
        $this->actingAs($this->referee)->post(route('scoring.finish-set', $this->match->id), [
            'match_set_id' => $set8->id,
        ]);

        // Set 9: Away wins (15 - 21) -> Regu 3 finishes (1-2 for Away). Entire match finishes (2-1 for Home)!
        $set9 = $this->match->sets()->where('set_number', 9)->first();
        $set9->update(['home_score' => 15, 'away_score' => 21]);
        $resFinal = $this->actingAs($this->referee)->post(route('scoring.finish-set', $this->match->id), [
            'match_set_id' => $set9->id,
        ]);

        $resFinal->assertOk();
        $this->assertTrue($resFinal->json('matchFinished'));
        $this->assertEquals($this->stHome->id, $resFinal->json('winner'));
        $this->assertEquals(2, $resFinal->json('regusWonHome'));
        $this->assertEquals(1, $resFinal->json('regusWonAway'));

        $this->match->refresh();
        $this->assertEquals('finished', $this->match->status);
        $this->assertEquals($this->stHome->id, $this->match->winner_super_team_id);
    }

    public function test_opponent_mistake_adds_point_to_the_correct_team(): void
    {
        $this->actingAs($this->referee)->post(route('scoring.start', $this->match->id));
        $set1 = $this->match->sets()->where('set_number', 1)->first();

        $homeSubTeam = $this->stHome->members->first();
        $awaySubTeam = $this->stAway->members->first();

        $homeAthlete = $homeSubTeam->athletes()->first();
        $awayAthlete = $awaySubTeam->athletes()->first();

        // 1. Home athlete gains opponent mistake -> home_score increments!
        $resHome = $this->actingAs($this->referee)->post(route('scoring.update-stat', $this->match->id), [
            'match_set_id' => $set1->id,
            'athlete_id'   => $homeAthlete->id,
            'team_id'      => $homeSubTeam->id,
            'stat'         => 'opponent_mistake',
            'action'       => 'increment',
            'side'         => 'home',
        ]);
        $resHome->assertOk();

        $set1->refresh();
        $this->assertEquals(1, $set1->home_score);
        $this->assertEquals(0, $set1->away_score);

        // 2. Away athlete gains opponent mistake -> away_score increments!
        $resAway = $this->actingAs($this->referee)->post(route('scoring.update-stat', $this->match->id), [
            'match_set_id' => $set1->id,
            'athlete_id'   => $awayAthlete->id,
            'team_id'      => $awaySubTeam->id,
            'stat'         => 'opponent_mistake',
            'action'       => 'increment',
            'side'         => 'away',
        ]);
        $resAway->assertOk();

        $set1->refresh();
        $this->assertEquals(1, $set1->home_score);
        $this->assertEquals(1, $set1->away_score);
    }
}
