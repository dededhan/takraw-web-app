<?php

namespace Tests\Feature;

use App\Models\Athlete;
use App\Models\Team;
use App\Models\Tournament;
use App\Models\User;
use App\Models\SuperTeam;
use App\Models\Match_;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class CoachDashboardAndRosterLockTest extends TestCase
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

    public function test_coach_can_download_styled_xlsx_athlete_template()
    {
        $response = $this->actingAs($this->coach)
            ->get(route('templates.athletes'));

        $response->assertStatus(200);
        $response->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        $this->assertNotEmpty($response->getContent());
    }

    public function test_coach_dashboard_loads_without_live_matches_and_shows_tournament_stats()
    {
        $team = Team::create([
            'name' => 'Garuda Perkasa',
            'region' => 'DKI Jakarta',
            'coach_id' => $this->coach->id,
        ]);

        Athlete::create([
            'team_id' => $team->id,
            'name' => 'Budi Santoso',
            'jersey_number' => 10,
            'position' => 'Tekong',
        ]);

        $tournament = Tournament::create([
            'name' => 'Kejuaraan DKI 2026',
            'start_date' => '2026-09-01',
            'end_date' => '2026-09-05',
            'status' => 'registration',
            'mode' => 'regu',
            'created_by' => $this->admin->id,
        ]);

        $tournament->teams()->attach($team->id, ['match_mode' => 'regu']);

        $response = $this->actingAs($this->coach)
            ->get(route('dashboard'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Dashboard/Coach')
            ->has('teams')
            ->has('superTeams')
            ->has('participatedTournaments', 1)
            ->has('activeTournaments', 1)
            ->has('stats.totalAthletes')
            ->has('stats.totalTournaments')
            ->where('stats.totalAthletes', 1)
            ->where('stats.totalTournaments', 1)
        );
    }

    public function test_unregistered_team_can_be_edited_and_deleted()
    {
        $team = Team::create([
            'name' => 'Tim Bebas',
            'region' => 'Bandung',
            'coach_id' => $this->coach->id,
        ]);

        $athlete = Athlete::create([
            'team_id' => $team->id,
            'name' => 'Pemain Satu',
            'jersey_number' => 1,
            'position' => 'Tekong',
        ]);

        $this->assertFalse($team->isRosterLocked());

        // Update team name
        $updateResponse = $this->actingAs($this->coach)
            ->put(route('teams.update', $team->id), [
                'name' => 'Tim Bebas Baru',
                'region' => 'Bandung',
                'athletes' => [
                    ['id' => $athlete->id, 'name' => 'Pemain Satu', 'jersey_number' => 1, 'position' => 'Tekong'],
                ]
            ]);

        $updateResponse->assertRedirect();
        $this->assertDatabaseHas('teams', ['id' => $team->id, 'name' => 'Tim Bebas Baru']);

        // Delete team
        $deleteResponse = $this->actingAs($this->coach)
            ->delete(route('teams.destroy', $team->id));

        $deleteResponse->assertRedirect(route('teams.index'));
        $this->assertSoftDeleted('teams', ['id' => $team->id]);
    }

    public function test_registered_team_has_locked_roster_and_blocks_edit_and_delete()
    {
        $team = Team::create([
            'name' => 'Tim Juara',
            'region' => 'Jakarta',
            'coach_id' => $this->coach->id,
        ]);

        $athlete = Athlete::create([
            'team_id' => $team->id,
            'name' => 'Ganti Nama',
            'jersey_number' => 10,
            'position' => 'Killer',
        ]);

        $tournament = Tournament::create([
            'name' => 'Kejuaraan Nasional 2026',
            'start_date' => '2026-09-01',
            'end_date' => '2026-09-05',
            'status' => 'pool_stage',
            'mode' => 'regu',
            'created_by' => $this->admin->id,
        ]);

        $tournament->teams()->attach($team->id, ['match_mode' => 'regu']);

        // Registering to tournament should NOT lock roster yet
        $this->assertFalse($team->fresh()->isRosterLocked());

        // Now simulate match is live/finished (dinilai)
        $match = \App\Models\Match_::create([
            'tournament_id' => $tournament->id,
            'stage' => 'pool',
            'home_team_id' => $team->id,
            'away_team_id' => null,
            'status' => 'live',
        ]);

        // After match is live/finished or evaluated, roster is locked
        $this->assertTrue($team->fresh()->isRosterLocked());

        // Attempt to update name or athletes
        $updateResponse = $this->actingAs($this->coach)
            ->put(route('teams.update', $team->id), [
                'name' => 'Nama Berubah',
                'region' => 'Jakarta',
                'athletes' => [
                    ['id' => $athlete->id, 'name' => 'Ganti Nama', 'jersey_number' => 99, 'position' => 'Killer'],
                ]
            ]);

        $updateResponse->assertSessionHas('error');
        $this->assertDatabaseHas('teams', ['id' => $team->id, 'name' => 'Tim Juara']);

        // Attempt to delete locked team
        $deleteResponse = $this->actingAs($this->coach)
            ->delete(route('teams.destroy', $team->id));

        $deleteResponse->assertSessionHas('error');
        $this->assertDatabaseHas('teams', ['id' => $team->id, 'deleted_at' => null]);
    }

    public function test_coach_can_create_super_team_with_three_subteams()
    {
        $response = $this->actingAs($this->coach)
            ->post(route('coach.super-teams.store'), [
                'name' => 'Super Team Garuda',
                'match_mode' => 'team_regu',
                'sub_teams' => [
                    [
                        'name' => 'Garuda A',
                        'region' => 'Jakarta',
                        'athletes' => [
                            ['name' => 'Player 1', 'jersey_number' => 1, 'position' => 'Tekong'],
                        ]
                    ],
                    [
                        'name' => 'Garuda B',
                        'region' => 'Jakarta',
                        'athletes' => [
                            ['name' => 'Player 2', 'jersey_number' => 2, 'position' => 'Feeder'],
                        ]
                    ],
                    [
                        'name' => 'Garuda C',
                        'region' => 'Jakarta',
                        'athletes' => [
                            ['name' => 'Player 3', 'jersey_number' => 3, 'position' => 'Killer'],
                        ]
                    ],
                ]
            ]);

        $response->assertSessionHas('success');
        $this->assertDatabaseHas('super_teams', [
            'name' => 'Super Team Garuda',
            'coach_id' => $this->coach->id,
            'match_mode' => 'team_regu',
        ]);

        $superTeam = SuperTeam::where('name', 'Super Team Garuda')->first();
        $this->assertCount(3, $superTeam->members);
    }

    public function test_coach_can_view_tournament_history()
    {
        $team = Team::create(['coach_id' => $this->coach->id, 'name' => 'Tim Sejarah', 'region' => 'Surabaya']);
        $tournament = Tournament::create([
            'name' => 'Piala Nasional 2025',
            'start_date' => '2025-10-01',
            'end_date' => '2025-10-05',
            'status' => 'completed',
            'mode' => 'regu',
            'created_by' => $this->admin->id,
        ]);
        $tournament->teams()->attach($team->id, ['match_mode' => 'regu']);

        $response = $this->actingAs($this->coach)
            ->get(route('coach.tournaments.history'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Coach/TournamentHistory')
            ->has('tournaments', 1)
            ->where('tournaments.0.name', 'Piala Nasional 2025')
        );
    }

    public function test_coach_can_import_athletes_via_csv()
    {
        $team = Team::create(['coach_id' => $this->coach->id, 'name' => 'Tim Import', 'region' => 'Semarang']);

        $csvContent = "nama,nomor_punggung,posisi\n" .
            "Bambang,11,Tekong\n" .
            "Suryo,8,Feeder\n" .
            "Doni,5,Killer\n";

        $file = UploadedFile::fake()->createWithContent('atlet.csv', $csvContent);

        $response = $this->actingAs($this->coach)
            ->post(route('teams.import-athletes', $team->id), [
                'file' => $file,
            ]);

        if (session('error')) {
            dump(session('error'));
        }

        $response->assertSessionHas('success');
        $this->assertDatabaseHas('athletes', [
            'team_id' => $team->id,
            'name' => 'Bambang',
            'jersey_number' => 11,
            'position' => 'Tekong',
        ]);
    }
}
