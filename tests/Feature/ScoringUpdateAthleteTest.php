<?php

namespace Tests\Feature;

use App\Models\Athlete;
use App\Models\Match_;
use App\Models\Pool;
use App\Models\Team;
use App\Models\Tournament;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ScoringUpdateAthleteTest extends TestCase
{
    use RefreshDatabase;

    protected User $referee;
    protected Match_ $match;
    protected Team $homeTeam;
    protected Team $awayTeam;
    protected Athlete $athlete1;
    protected Athlete $athlete2;

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

        $tournament = Tournament::create([
            'name'       => 'Turnamen Test Update Athlete',
            'start_date' => now()->toDateString(),
            'end_date'   => now()->addDays(2)->toDateString(),
            'mode'       => 'regu',
            'status'     => 'pool_stage',
            'created_by' => $admin->id,
        ]);

        $pool = Pool::create([
            'tournament_id' => $tournament->id,
            'name'          => 'A',
            'match_mode'    => 'regu',
        ]);

        $this->homeTeam = Team::create(['name' => 'Tim Home Test', 'region' => 'Jakarta']);
        $this->awayTeam = Team::create(['name' => 'Tim Away Test', 'region' => 'Bandung']);

        // Athlete 1 has position 'Smash'
        $this->athlete1 = Athlete::create([
            'team_id'       => $this->homeTeam->id,
            'name'          => 'Pemain Smash',
            'jersey_number' => 7,
            'position'      => 'Smash',
        ]);

        // Athlete 2 has position 'Feeder'
        $this->athlete2 = Athlete::create([
            'team_id'       => $this->homeTeam->id,
            'name'          => 'Pemain Feeder',
            'jersey_number' => 8,
            'position'      => 'Feeder',
        ]);

        $this->match = Match_::create([
            'tournament_id' => $tournament->id,
            'pool_id'       => $pool->id,
            'match_mode'    => 'regu',
            'stage'         => 'pool',
            'home_team_id'  => $this->homeTeam->id,
            'away_team_id'  => $this->awayTeam->id,
            'referee_id'    => $this->referee->id,
            'status'        => 'live',
            'max_sets'      => 3,
        ]);
    }

    public function test_can_update_jersey_number_with_smash_position(): void
    {
        $response = $this->actingAs($this->referee)
            ->postJson(route('scoring.update-athlete', $this->match->id), [
                'athlete_id'    => $this->athlete1->id,
                'jersey_number' => 15,
                'name'          => 'Pemain Smash Baru',
                'position'      => 'Smash',
            ]);

        $response->assertOk();
        $response->assertJson(['success' => true]);

        $this->athlete1->refresh();
        $this->assertEquals(15, $this->athlete1->jersey_number);
        $this->assertEquals('Smash', $this->athlete1->position);
        $this->assertEquals('Pemain Smash Baru', $this->athlete1->name);
    }

    public function test_can_swap_jersey_numbers_between_athletes(): void
    {
        // Swap athlete 1 (#7, Smash) to #8 (currently held by athlete 2)
        $response = $this->actingAs($this->referee)
            ->postJson(route('scoring.update-athlete', $this->match->id), [
                'athlete_id'    => $this->athlete1->id,
                'jersey_number' => 8,
                'name'          => $this->athlete1->name,
                'position'      => 'Smash',
            ]);

        $response->assertOk();
        $response->assertJson(['success' => true]);

        $this->athlete1->refresh();
        $this->athlete2->refresh();

        // Athlete 1 now has #8, Athlete 2 now has #7
        $this->assertEquals(8, $this->athlete1->jersey_number);
        $this->assertEquals(7, $this->athlete2->jersey_number);
    }

    public function test_can_quick_add_athlete_with_smash_position(): void
    {
        $response = $this->actingAs($this->referee)
            ->postJson(route('scoring.quick-athlete', $this->match->id), [
                'team_id'       => $this->homeTeam->id,
                'jersey_number' => 20,
                'name'          => 'Pemain Baru 20',
                'position'      => 'Smash',
            ]);

        $response->assertOk();
        $response->assertJson(['success' => true]);

        $this->assertDatabaseHas('athletes', [
            'team_id'       => $this->homeTeam->id,
            'jersey_number' => 20,
            'position'      => 'Smash',
            'name'          => 'Pemain Baru 20',
        ]);
    }
}
