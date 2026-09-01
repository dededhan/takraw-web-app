<?php

namespace Tests\Feature;

use App\Models\Athlete;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TeamAthleteManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $coach;
    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->coach = User::create([
            'name' => 'Coach Budi',
            'email' => 'coach_budi@test.com',
            'password' => bcrypt('password'),
            'role' => 'coach',
            'is_active' => true,
        ]);

        $this->admin = User::create([
            'name' => 'Admin Utama',
            'email' => 'admin_utama@test.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'is_active' => true,
        ]);
    }

    public function test_can_swap_jersey_numbers_without_unique_constraint_violation()
    {
        $team = Team::create([
            'name' => 'Tim Harimau',
            'region' => 'Bandung',
            'coach_id' => $this->coach->id,
        ]);

        $athlete1 = Athlete::create([
            'team_id' => $team->id,
            'name' => 'Athlete Satu',
            'jersey_number' => 3,
            'position' => 'Tekong',
        ]);

        $athlete2 = Athlete::create([
            'team_id' => $team->id,
            'name' => 'Muhammad Nevry Joliansyah',
            'jersey_number' => 4,
            'position' => 'Killer',
        ]);

        // Swap: Athlete 2 gets 3, Athlete 1 gets 4
        $response = $this->actingAs($this->coach)
            ->patch(route('teams.update', $team->id), [
                'name' => 'Tim Harimau',
                'region' => 'Bandung',
                'athletes' => [
                    [
                        'id' => $athlete2->id,
                        'name' => 'Muhammad Nevry Joliansyah',
                        'jersey_number' => 3,
                        'position' => 'Killer',
                    ],
                    [
                        'id' => $athlete1->id,
                        'name' => 'Athlete Satu',
                        'jersey_number' => 4,
                        'position' => 'Tekong',
                    ],
                ],
            ]);

        $response->assertRedirect(route('teams.show', $team->id));
        $this->assertDatabaseHas('athletes', [
            'id' => $athlete2->id,
            'jersey_number' => 3,
            'name' => 'Muhammad Nevry Joliansyah',
        ]);
        $this->assertDatabaseHas('athletes', [
            'id' => $athlete1->id,
            'jersey_number' => 4,
            'name' => 'Athlete Satu',
        ]);
    }

    public function test_can_delete_athlete_and_assign_same_jersey_number_to_another_athlete()
    {
        $team = Team::create([
            'name' => 'Tim Elang',
            'region' => 'Jakarta',
            'coach_id' => $this->coach->id,
        ]);

        $oldAthlete = Athlete::create([
            'team_id' => $team->id,
            'name' => 'Pemain Lama',
            'jersey_number' => 3,
            'position' => 'Tekong',
        ]);

        $activeAthlete = Athlete::create([
            'team_id' => $team->id,
            'name' => 'Pemain Tetap',
            'jersey_number' => 10,
            'position' => 'Feeder',
        ]);

        // Submit without $oldAthlete, and change $activeAthlete to 3, plus a new athlete with 10
        $response = $this->actingAs($this->coach)
            ->patch(route('teams.update', $team->id), [
                'name' => 'Tim Elang',
                'region' => 'Jakarta',
                'athletes' => [
                    [
                        'id' => $activeAthlete->id,
                        'name' => 'Pemain Tetap',
                        'jersey_number' => 3,
                        'position' => 'Tekong',
                    ],
                    [
                        'id' => null,
                        'name' => 'Pemain Baru',
                        'jersey_number' => 10,
                        'position' => 'Feeder',
                    ],
                ],
            ]);

        $response->assertRedirect(route('teams.show', $team->id));
        $this->assertDatabaseMissing('athletes', ['id' => $oldAthlete->id]);
        $this->assertDatabaseHas('athletes', [
            'id' => $activeAthlete->id,
            'jersey_number' => 3,
        ]);
        $this->assertDatabaseHas('athletes', [
            'team_id' => $team->id,
            'name' => 'Pemain Baru',
            'jersey_number' => 10,
        ]);
    }

    public function test_cannot_submit_duplicate_jersey_numbers_in_team_update()
    {
        $team = Team::create([
            'name' => 'Tim Banteng',
            'region' => 'Surabaya',
            'coach_id' => $this->coach->id,
        ]);

        $athlete = Athlete::create([
            'team_id' => $team->id,
            'name' => 'Pemain 1',
            'jersey_number' => 1,
            'position' => 'Tekong',
        ]);

        $response = $this->actingAs($this->coach)
            ->patch(route('teams.update', $team->id), [
                'name' => 'Tim Banteng',
                'region' => 'Surabaya',
                'athletes' => [
                    ['id' => $athlete->id, 'name' => 'Pemain 1', 'jersey_number' => 7, 'position' => 'Tekong'],
                    ['id' => null, 'name' => 'Pemain 2', 'jersey_number' => 7, 'position' => 'Killer'],
                ],
            ]);

        $response->assertSessionHasErrors(['athletes.0.jersey_number']);
    }

    public function test_cannot_submit_duplicate_jersey_numbers_in_team_create()
    {
        $response = $this->actingAs($this->coach)
            ->post(route('teams.store'), [
                'name' => 'Tim Baru',
                'region' => 'Medan',
                'athletes' => [
                    ['name' => 'Pemain A', 'jersey_number' => 9, 'position' => 'Tekong'],
                    ['name' => 'Pemain B', 'jersey_number' => 9, 'position' => 'Feeder'],
                ],
            ]);

        $response->assertSessionHasErrors(['athletes.0.jersey_number']);
    }
}
