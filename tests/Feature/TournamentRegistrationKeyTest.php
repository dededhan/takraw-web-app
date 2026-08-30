<?php

namespace Tests\Feature;

use App\Models\Team;
use App\Models\Tournament;
use App\Models\TournamentMode;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TournamentRegistrationKeyTest extends TestCase
{
    use RefreshDatabase;

    public function test_tournament_creation_sets_default_status_draft_and_stores_registration_code(): void
    {
        $admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin_test@test.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $response = $this->actingAs($admin)->post(route('tournaments.store'), [
            'name' => 'Kejuaraan Nasional 2026',
            'start_date' => '2026-09-01',
            'end_date' => '2026-09-05',
            'modes' => ['regu', 'double'],
            'registration_code' => 'SECRET-PASS-123',
        ]);

        $response->assertRedirect();

        $tournament = Tournament::where('name', 'Kejuaraan Nasional 2026')->first();
        $this->assertNotNull($tournament);
        $this->assertEquals('draft', $tournament->status); // Status default harus draft
        $this->assertEquals('SECRET-PASS-123', $tournament->registration_code);
        $this->assertTrue($tournament->hasRegistrationCode());
    }

    public function test_tournament_update_modifies_status_and_registration_code(): void
    {
        $admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin_update@test.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $tournament = Tournament::create([
            'name' => 'Piala Pelajar 2026',
            'start_date' => '2026-09-10',
            'end_date' => '2026-09-15',
            'mode' => 'regu',
            'status' => 'draft',
            'created_by' => $admin->id,
        ]);

        $response = $this->actingAs($admin)->patch(route('tournaments.update', $tournament->id), [
            'name' => 'Piala Pelajar Se-Jawa 2026',
            'start_date' => '2026-09-10',
            'end_date' => '2026-09-15',
            'modes' => ['regu'],
            'status' => 'registration',
            'registration_code' => 'NEW-KEY-888',
        ]);

        $response->assertRedirect();

        $tournament->refresh();
        $this->assertEquals('Piala Pelajar Se-Jawa 2026', $tournament->name);
        $this->assertEquals('registration', $tournament->status);
        $this->assertEquals('NEW-KEY-888', $tournament->registration_code);
    }

    public function test_coach_can_register_team_to_unprotected_tournament(): void
    {
        $admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin_tp1@test.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $coach = User::create([
            'name' => 'Coach Budi',
            'email' => 'budi_coach@test.com',
            'password' => bcrypt('password'),
            'role' => 'coach',
            'is_active' => true,
        ]);

        $team = Team::create([
            'name' => 'Tim Budi A',
            'region' => 'Jakarta',
            'coach_id' => $coach->id,
        ]);

        $tournament = Tournament::create([
            'name' => 'Turnamen Terbuka',
            'start_date' => '2026-09-01',
            'end_date' => '2026-09-03',
            'mode' => 'regu',
            'status' => 'registration',
            'registration_code' => null, // Tanpa kunci
            'created_by' => $admin->id,
        ]);

        TournamentMode::create([
            'tournament_id' => $tournament->id,
            'match_mode' => 'regu',
            'is_active' => true,
        ]);

        $response = $this->actingAs($coach)->post(route('coach.tournaments.register', $tournament->id), [
            'team_id' => $team->id,
            'match_mode' => 'regu',
        ]);

        $response->assertSessionHas('success');
        $this->assertTrue($tournament->teams()->where('team_id', $team->id)->exists());
    }

    public function test_coach_registration_fails_when_tournament_has_registration_code_and_none_provided(): void
    {
        $admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin_tp2@test.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $coach = User::create([
            'name' => 'Coach Budi',
            'email' => 'budi_coach2@test.com',
            'password' => bcrypt('password'),
            'role' => 'coach',
            'is_active' => true,
        ]);

        $team = Team::create([
            'name' => 'Tim Budi B',
            'region' => 'Jakarta',
            'coach_id' => $coach->id,
        ]);

        $tournament = Tournament::create([
            'name' => 'Turnamen Tertutup',
            'start_date' => '2026-09-01',
            'end_date' => '2026-09-03',
            'mode' => 'regu',
            'status' => 'registration',
            'registration_code' => 'PASSOK-2026',
            'created_by' => $admin->id,
        ]);

        TournamentMode::create([
            'tournament_id' => $tournament->id,
            'match_mode' => 'regu',
            'is_active' => true,
        ]);

        $response = $this->actingAs($coach)->post(route('coach.tournaments.register', $tournament->id), [
            'team_id' => $team->id,
            'match_mode' => 'regu',
        ]);

        $response->assertSessionHasErrors(['registration_code']);
        $this->assertFalse($tournament->teams()->where('team_id', $team->id)->exists());
    }

    public function test_coach_registration_fails_when_wrong_registration_code_provided(): void
    {
        $admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin_tp3@test.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $coach = User::create([
            'name' => 'Coach Budi',
            'email' => 'budi_coach3@test.com',
            'password' => bcrypt('password'),
            'role' => 'coach',
            'is_active' => true,
        ]);

        $team = Team::create([
            'name' => 'Tim Budi C',
            'region' => 'Jakarta',
            'coach_id' => $coach->id,
        ]);

        $tournament = Tournament::create([
            'name' => 'Turnamen Tertutup',
            'start_date' => '2026-09-01',
            'end_date' => '2026-09-03',
            'mode' => 'regu',
            'status' => 'registration',
            'registration_code' => 'PASSOK-2026',
            'created_by' => $admin->id,
        ]);

        TournamentMode::create([
            'tournament_id' => $tournament->id,
            'match_mode' => 'regu',
            'is_active' => true,
        ]);

        $response = $this->actingAs($coach)->post(route('coach.tournaments.register', $tournament->id), [
            'team_id' => $team->id,
            'match_mode' => 'regu',
            'registration_code' => 'SALAH-KEY',
        ]);

        $response->assertSessionHasErrors(['registration_code']);
        $this->assertFalse($tournament->teams()->where('team_id', $team->id)->exists());
    }

    public function test_coach_registration_succeeds_when_correct_registration_code_provided(): void
    {
        $admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin_tp4@test.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $coach = User::create([
            'name' => 'Coach Budi',
            'email' => 'budi_coach4@test.com',
            'password' => bcrypt('password'),
            'role' => 'coach',
            'is_active' => true,
        ]);

        $team = Team::create([
            'name' => 'Tim Budi D',
            'region' => 'Jakarta',
            'coach_id' => $coach->id,
        ]);

        $tournament = Tournament::create([
            'name' => 'Turnamen Tertutup',
            'start_date' => '2026-09-01',
            'end_date' => '2026-09-03',
            'mode' => 'regu',
            'status' => 'registration',
            'registration_code' => 'PASSOK-2026',
            'created_by' => $admin->id,
        ]);

        TournamentMode::create([
            'tournament_id' => $tournament->id,
            'match_mode' => 'regu',
            'is_active' => true,
        ]);

        $response = $this->actingAs($coach)->post(route('coach.tournaments.register', $tournament->id), [
            'team_id' => $team->id,
            'match_mode' => 'regu',
            'registration_code' => 'PASSOK-2026',
        ]);

        $response->assertSessionHas('success');
        $this->assertTrue($tournament->teams()->where('team_id', $team->id)->exists());
    }

    public function test_coach_cannot_register_team_when_tournament_status_is_draft(): void
    {
        $admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin_tp5@test.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $coach = User::create([
            'name' => 'Coach Budi',
            'email' => 'budi_coach5@test.com',
            'password' => bcrypt('password'),
            'role' => 'coach',
            'is_active' => true,
        ]);

        $team = Team::create([
            'name' => 'Tim Budi E',
            'region' => 'Jakarta',
            'coach_id' => $coach->id,
        ]);

        $tournament = Tournament::create([
            'name' => 'Turnamen Draft',
            'start_date' => '2026-09-01',
            'end_date' => '2026-09-03',
            'mode' => 'regu',
            'status' => 'draft', // Status masih draft
            'registration_code' => 'PASSOK-2026',
            'created_by' => $admin->id,
        ]);

        $response = $this->actingAs($coach)->post(route('coach.tournaments.register', $tournament->id), [
            'team_id' => $team->id,
            'match_mode' => 'regu',
            'registration_code' => 'PASSOK-2026',
        ]);

        $response->assertSessionHas('error', 'Pendaftaran untuk turnamen ini sudah ditutup.');
        $this->assertFalse($tournament->teams()->where('team_id', $team->id)->exists());
    }
}
