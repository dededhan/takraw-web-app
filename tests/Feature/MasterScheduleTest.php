<?php

namespace Tests\Feature;

use App\Models\Court;
use App\Models\Match_;
use App\Models\TimeSlot;
use App\Models\Tournament;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MasterScheduleTest extends TestCase
{
    use RefreshDatabase;

    public function test_master_schedule_index_loads_teams_and_contenders(): void
    {
        $admin = User::create([
            'name' => 'Admin Test',
            'email' => 'admin_sched@test.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $tournament = Tournament::create([
            'name' => 'Takraw Cup 2026',
            'start_date' => now(),
            'end_date' => now()->addDays(3),
            'mode' => 'regu',
            'status' => 'draft',
            'schedule_status' => 'published',
            'created_by' => $admin->id,
            'total_days' => 3,
            'courts_count' => 2,
        ]);

        $team1 = Team::create(['name' => 'PSTG Garuda', 'region' => 'Jakarta']);
        $team2 = Team::create(['name' => 'PSTG Rajawali', 'region' => 'Bandung']);

        $tournament->teams()->attach([$team1->id, $team2->id]);

        $response = $this->actingAs($admin)
            ->get(route('tournaments.master-schedule.index', $tournament));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) =>
            $page->component('Tournament/MasterSchedule/Grid')
                ->has('tournament.teams', 2)
                ->where('tournament.schedule_status', 'published')
        );
    }

    public function test_master_schedule_can_be_unpublished_for_editing(): void
    {
        $admin = User::create([
            'name' => 'Admin Unpublish',
            'email' => 'admin_unpub@test.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $tournament = Tournament::create([
            'name' => 'Takraw Published Cup',
            'start_date' => now(),
            'end_date' => now()->addDays(2),
            'mode' => 'regu',
            'schedule_status' => 'published',
            'created_by' => $admin->id,
        ]);

        $response = $this->actingAs($admin)
            ->post(route('tournaments.master-schedule.unpublish', $tournament));

        $response->assertRedirect();
        $this->assertEquals('draft', $tournament->fresh()->schedule_status);
    }

    public function test_match_can_be_updated_with_new_time_court_and_status(): void
    {
        $admin = User::create([
            'name' => 'Admin Update Match',
            'email' => 'admin_match@test.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $referee = User::create([
            'name' => 'Wasit Resmi',
            'email' => 'wasit_resmi@test.com',
            'password' => bcrypt('password'),
            'role' => 'referee',
            'is_active' => true,
        ]);

        $tournament = Tournament::create([
            'name' => 'Turnamen Edit Match',
            'start_date' => now(),
            'end_date' => now()->addDays(2),
            'mode' => 'regu',
            'created_by' => $admin->id,
        ]);

        $teamA = Team::create(['name' => 'Tim Elang', 'region' => 'Surabaya']);
        $teamB = Team::create(['name' => 'Tim Harimau', 'region' => 'Malang']);

        $match = Match_::create([
            'tournament_id' => $tournament->id,
            'home_team_id' => $teamA->id,
            'away_team_id' => $teamB->id,
            'stage' => 'pool',
            'match_mode' => 'regu',
            'status' => 'scheduled',
            'court_number' => 1,
            'scheduled_at' => now()->addHours(2),
        ]);

        $newTime = now()->addDays(1)->format('Y-m-d H:i:s');

        $response = $this->actingAs($admin)
            ->put(route('matches.update', $match), [
                'scheduled_at' => $newTime,
                'court_number' => 3,
                'referee_id'   => $referee->id,
                'status'       => 'scheduled',
            ]);

        $response->assertRedirect();
        $this->assertEquals(3, $match->fresh()->court_number);
        $this->assertEquals($referee->id, $match->fresh()->referee_id);
    }

    public function test_team_regu_reschedule_occupies_3_slots_and_swaps_properly(): void
    {
        $admin = User::create([
            'name' => 'Admin Team Regu',
            'email' => 'admin_team_regu@test.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $tournament = Tournament::create([
            'name' => 'Takraw Super League',
            'start_date' => now(),
            'end_date' => now()->addDays(2),
            'mode' => 'regu',
            'status' => 'draft',
            'created_by' => $admin->id,
        ]);

        $court1 = Court::create(['tournament_id' => $tournament->id, 'court_number' => 1, 'name' => 'Lapangan 1', 'is_active' => true]);
        $court2 = Court::create(['tournament_id' => $tournament->id, 'court_number' => 2, 'name' => 'Lapangan 2', 'is_active' => true]);

        $slot1 = TimeSlot::create(['tournament_id' => $tournament->id, 'day_number' => 1, 'slot_number' => 1, 'slot_type' => 'match', 'start_time' => '08:00:00', 'end_time' => '08:50:00', 'label' => '08:00 - 08:50']);
        $slot2 = TimeSlot::create(['tournament_id' => $tournament->id, 'day_number' => 1, 'slot_number' => 2, 'slot_type' => 'match', 'start_time' => '08:50:00', 'end_time' => '09:40:00', 'label' => '08:50 - 09:40']);
        $slot3 = TimeSlot::create(['tournament_id' => $tournament->id, 'day_number' => 1, 'slot_number' => 3, 'slot_type' => 'match', 'start_time' => '09:40:00', 'end_time' => '10:30:00', 'label' => '09:40 - 10:30']);

        // Team Regu 1 di Lapangan 1 (Slot 1..3)
        $teamReguMatch1 = Match_::create([
            'tournament_id' => $tournament->id,
            'match_mode'    => 'team_regu',
            'slot_span'     => 3,
            'day_number'    => 1,
            'court_id'      => $court1->id,
            'time_slot_id'  => $slot1->id,
            'stage'         => 'pool',
            'status'        => 'scheduled',
            'scheduled_at'  => now(),
        ]);

        // Single Match di Lapangan 2 (Slot 1)
        $singleMatch = Match_::create([
            'tournament_id' => $tournament->id,
            'match_mode'    => 'regu',
            'slot_span'     => 1,
            'day_number'    => 1,
            'court_id'      => $court2->id,
            'time_slot_id'  => $slot1->id,
            'stage'         => 'pool',
            'status'        => 'scheduled',
            'scheduled_at'  => now(),
        ]);

        // Pindahkan Team Regu 1 ke Lapangan 2 Slot 1 (akan menukar tempat dengan single match)
        $response = $this->actingAs($admin)
            ->patch(route('matches.reschedule', $teamReguMatch1), [
                'time_slot_id' => $slot1->id,
                'court_id'     => $court2->id,
            ]);

        $response->assertRedirect();
        // Team Regu 1 sekarang di Lapangan 2 Slot 1
        $this->assertEquals($court2->id, $teamReguMatch1->fresh()->court_id);
        $this->assertEquals($slot1->id, $teamReguMatch1->fresh()->time_slot_id);
        $this->assertEquals(3, $teamReguMatch1->fresh()->slot_span);

        // Single match tertukar ke Lapangan 1 Slot 1
        $this->assertEquals($court1->id, $singleMatch->fresh()->court_id);
        $this->assertEquals($slot1->id, $singleMatch->fresh()->time_slot_id);
    }
}
