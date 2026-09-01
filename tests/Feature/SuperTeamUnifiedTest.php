<?php

namespace Tests\Feature;

use App\Models\SuperTeam;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SuperTeamUnifiedTest extends TestCase
{
    use RefreshDatabase;

    protected $admin;
    protected $coach;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'role' => 'admin',
            'is_active' => true,
        ]);

        $this->coach = User::factory()->create([
            'role' => 'coach',
            'is_active' => true,
        ]);
    }

    public function test_admin_can_create_unified_super_team_with_single_roster(): void
    {
        $athletes = [];
        for ($i = 1; $i <= 12; $i++) {
            $athletes[] = [
                'name' => "Athlete {$i}",
                'jersey_number' => $i,
                'position' => $i % 4 === 1 ? 'Tekong' : ($i % 4 === 2 ? 'Feeder' : ($i % 4 === 3 ? 'Killer' : 'Cadangan')),
                'sub_regu' => min(3, intdiv($i - 1, 4) + 1),
            ];
        }

        $response = $this->actingAs($this->admin)
            ->post(route('super-teams.store-unified'), [
                'name' => 'TRA U-18 JAKARTA BARAT',
                'region' => 'JAKARTA BARAT',
                'match_mode' => 'team_regu',
                'coach_id' => $this->coach->id,
                'athletes' => $athletes,
            ]);

        $response->assertSessionHas('success');

        $superTeam = SuperTeam::where('name', 'TRA U-18 JAKARTA BARAT')->first();
        $this->assertNotNull($superTeam);
        $this->assertEquals($this->coach->id, $superTeam->coach_id);
        $this->assertEquals('team_regu', $superTeam->match_mode);

        // Check 3 sub teams created
        $this->assertCount(3, $superTeam->members);
        $this->assertEquals('TRA U-18 JAKARTA BARAT-1', $superTeam->members[0]->name);
        $this->assertEquals('TRA U-18 JAKARTA BARAT-2', $superTeam->members[1]->name);
        $this->assertEquals('TRA U-18 JAKARTA BARAT-3', $superTeam->members[2]->name);

        // Check athletes distributed 4 to each sub team
        $this->assertCount(4, $superTeam->members[0]->athletes);
        $this->assertCount(4, $superTeam->members[1]->athletes);
        $this->assertCount(4, $superTeam->members[2]->athletes);
    }

    public function test_coach_can_create_unified_super_team(): void
    {
        $athletes = [
            ['name' => 'Player 1', 'jersey_number' => 10, 'position' => 'Tekong', 'sub_regu' => 1],
            ['name' => 'Player 2', 'jersey_number' => 20, 'position' => 'Feeder', 'sub_regu' => 2],
            ['name' => 'Player 3', 'jersey_number' => 30, 'position' => 'Killer', 'sub_regu' => 3],
        ];

        $response = $this->actingAs($this->coach)
            ->post(route('super-teams.store-unified'), [
                'name' => 'PSTG Garuda',
                'region' => 'Bandung',
                'match_mode' => 'team_double',
                'athletes' => $athletes,
            ]);

        $response->assertSessionHas('success');

        $superTeam = SuperTeam::where('name', 'PSTG Garuda')->first();
        $this->assertNotNull($superTeam);
        $this->assertEquals($this->coach->id, $superTeam->coach_id);
        $this->assertCount(3, $superTeam->members);
    }

    public function test_admin_can_delete_unlocked_super_team(): void
    {
        $superTeam = SuperTeam::create([
            'name' => 'Super Team Delete Test',
            'match_mode' => 'team_regu',
            'coach_id' => $this->coach->id,
            'created_by' => $this->admin->id,
        ]);

        $sub1 = Team::create(['name' => 'Sub 1', 'region' => 'X', 'is_super_sub' => true, 'parent_super_team_id' => $superTeam->id]);
        $sub2 = Team::create(['name' => 'Sub 2', 'region' => 'X', 'is_super_sub' => true, 'parent_super_team_id' => $superTeam->id]);
        $sub3 = Team::create(['name' => 'Sub 3', 'region' => 'X', 'is_super_sub' => true, 'parent_super_team_id' => $superTeam->id]);
        $superTeam->members()->attach([$sub1->id, $sub2->id, $sub3->id]);

        $response = $this->actingAs($this->admin)
            ->delete(route('super-teams.destroy', $superTeam->id));

        $response->assertSessionHas('success');
        $this->assertSoftDeleted('super_teams', ['id' => $superTeam->id]);
        $this->assertSoftDeleted('teams', ['id' => $sub1->id]);
    }

    public function test_can_create_super_team_with_optional_tournament(): void
    {
        $tournament = \App\Models\Tournament::create([
            'name' => 'Kejurda Takraw 2026',
            'status' => 'registration',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addDays(3)->toDateString(),
            'categories' => ['team_regu'],
            'created_by' => $this->admin->id,
        ]);

        $athletes = [
            ['name' => 'Pemain A', 'jersey_number' => 7, 'position' => 'Tekong'],
        ];

        $response = $this->actingAs($this->coach)
            ->post(route('super-teams.store-unified'), [
                'name' => 'Persikota Super',
                'region' => 'Tangerang',
                'tournament_id' => $tournament->id,
                'athletes' => $athletes,
            ]);

        $response->assertSessionHas('success');

        $superTeam = SuperTeam::where('name', 'Persikota Super')->first();
        $this->assertNotNull($superTeam);
        $this->assertEquals($tournament->id, $superTeam->tournament_id);
    }

    public function test_admin_can_update_unified_super_team(): void
    {
        $superTeam = SuperTeam::create([
            'name' => 'TRA U-18 JAKARTA BARAT',
            'match_mode' => 'team_regu',
            'coach_id' => $this->coach->id,
            'created_by' => $this->admin->id,
        ]);

        $sub1 = Team::create(['name' => 'TRA U-18 JAKARTA BARAT-1', 'region' => 'JAKARTA BARAT', 'is_super_sub' => true, 'parent_super_team_id' => $superTeam->id]);
        $sub2 = Team::create(['name' => 'TRA U-18 JAKARTA BARAT-2', 'region' => 'JAKARTA BARAT', 'is_super_sub' => true, 'parent_super_team_id' => $superTeam->id]);
        $sub3 = Team::create(['name' => 'TRA U-18 JAKARTA BARAT-3', 'region' => 'JAKARTA BARAT', 'is_super_sub' => true, 'parent_super_team_id' => $superTeam->id]);
        $superTeam->members()->attach([$sub1->id, $sub2->id, $sub3->id]);

        $ath1 = \App\Models\Athlete::create(['team_id' => $sub1->id, 'name' => 'Old Name', 'jersey_number' => 10, 'position' => 'Tekong']);

        $response = $this->actingAs($this->admin)
            ->post(route('super-teams.update-unified', $superTeam->id), [
                'name' => 'TRA U-18 JAKARTA BARAT EDITED',
                'region' => 'JAKARTA UTARA',
                'athletes' => [
                    ['id' => $ath1->id, 'name' => 'New Name', 'jersey_number' => 11, 'position' => 'Smash'],
                    ['name' => 'New Player 2', 'jersey_number' => 22, 'position' => 'Feeder'],
                ],
            ]);

        $response->assertSessionHas('success');

        $superTeam->refresh();
        $this->assertEquals('TRA U-18 JAKARTA BARAT EDITED', $superTeam->name);

        $ath1->refresh();
        $this->assertEquals('New Name', $ath1->name);
        $this->assertEquals(11, $ath1->jersey_number);
        $this->assertEquals('Smash', $ath1->position);
    }
}
