<?php

namespace Tests\Feature;

use App\Models\Athlete;
use App\Models\SuperTeam;
use App\Models\Team;
use App\Models\Tournament;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MultipleTournamentJoinTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $coach;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'role'      => 'admin',
            'is_active' => true,
        ]);

        $this->coach = User::factory()->create([
            'role'      => 'coach',
            'is_active' => true,
        ]);
    }

    public function test_team_and_super_team_can_join_multiple_tournaments_simultaneously(): void
    {
        // 1. Create Tournament A and Tournament B
        $tournamentA = Tournament::create([
            'name'       => 'Turnamen A (Piala Kemenpora)',
            'start_date' => '2026-09-01',
            'end_date'   => '2026-09-05',
            'status'     => 'registration',
            'mode'       => 'regu',
            'created_by' => $this->admin->id,
        ]);
        $tournamentA->modes()->create(['match_mode' => 'regu', 'pool_count' => 2, 'is_active' => true]);
        $tournamentA->modes()->create(['match_mode' => 'team_regu', 'pool_count' => 2, 'is_active' => true]);

        $tournamentB = Tournament::create([
            'name'       => 'Turnamen B (Piala Gubernur)',
            'start_date' => '2026-09-10',
            'end_date'   => '2026-09-15',
            'status'     => 'registration',
            'mode'       => 'regu',
            'created_by' => $this->admin->id,
        ]);
        $tournamentB->modes()->create(['match_mode' => 'regu', 'pool_count' => 2, 'is_active' => true]);
        $tournamentB->modes()->create(['match_mode' => 'team_regu', 'pool_count' => 2, 'is_active' => true]);

        // 2. Coach creates Regular Team
        $team = Team::create([
            'name'     => 'Tim Elang Jakarta',
            'region'   => 'Jakarta',
            'coach_id' => $this->coach->id,
        ]);
        Athlete::create(['team_id' => $team->id, 'name' => 'Atlet 1', 'jersey_number' => 1, 'position' => 'Tekong']);

        // 3. Coach creates Super Team (with 3 sub teams)
        $superTeam = SuperTeam::create([
            'name'       => 'Super Team Garuda Jaya',
            'match_mode' => 'team_regu',
            'coach_id'   => $this->coach->id,
            'created_by' => $this->coach->id,
        ]);
        $sub1 = Team::create(['name' => 'Garuda 1', 'region' => 'Jakarta', 'coach_id' => $this->coach->id, 'is_super_sub' => true, 'parent_super_team_id' => $superTeam->id]);
        $sub2 = Team::create(['name' => 'Garuda 2', 'region' => 'Jakarta', 'coach_id' => $this->coach->id, 'is_super_sub' => true, 'parent_super_team_id' => $superTeam->id]);
        $sub3 = Team::create(['name' => 'Garuda 3', 'region' => 'Jakarta', 'coach_id' => $this->coach->id, 'is_super_sub' => true, 'parent_super_team_id' => $superTeam->id]);
        $superTeam->members()->attach([$sub1->id, $sub2->id, $sub3->id]);

        // 4. Coach registers Team & SuperTeam to Tournament A
        $this->actingAs($this->coach)
            ->post(route('coach.tournaments.register', $tournamentA->id), [
                'match_mode' => 'regu',
                'team_ids'   => [$team->id],
            ])
            ->assertSessionHas('success');

        $this->actingAs($this->coach)
            ->post(route('coach.tournaments.register-super-team', $tournamentA->id), [
                'super_team_ids' => [$superTeam->id],
            ])
            ->assertSessionHas('success');

        // 5. Coach registers SAME Team & SuperTeam to Tournament B
        $this->actingAs($this->coach)
            ->post(route('coach.tournaments.register', $tournamentB->id), [
                'match_mode' => 'regu',
                'team_ids'   => [$team->id],
            ])
            ->assertSessionHas('success');

        $this->actingAs($this->coach)
            ->post(route('coach.tournaments.register-super-team', $tournamentB->id), [
                'super_team_ids' => [$superTeam->id],
            ])
            ->assertSessionHas('success');

        // 6. Verify Team exists in BOTH Tournament A and Tournament B
        $this->assertTrue($tournamentA->fresh()->teams->contains('id', $team->id));
        $this->assertTrue($tournamentB->fresh()->teams->contains('id', $team->id));

        // 7. Verify Super Team exists in BOTH Tournament A and Tournament B (does not disappear from Tournament A!)
        $this->assertTrue($tournamentA->fresh()->superTeams->contains('id', $superTeam->id));
        $this->assertTrue($tournamentB->fresh()->superTeams->contains('id', $superTeam->id));

        // 8. Verify coach tournament history contains both tournaments
        $this->actingAs($this->coach)
            ->get(route('coach.tournaments.history'))
            ->assertOk();

        // 9. Coach unregisters from Tournament A only
        $this->actingAs($this->coach)
            ->delete(route('coach.tournaments.unregister-super-team', [$tournamentA->id, $superTeam->id]))
            ->assertSessionHas('success');

        // Verify Super Team was removed from Tournament A, BUT STILL REMAINS in Tournament B
        $this->assertFalse($tournamentA->fresh()->superTeams->contains('id', $superTeam->id));
        $this->assertTrue($tournamentB->fresh()->superTeams->contains('id', $superTeam->id));
    }
}
