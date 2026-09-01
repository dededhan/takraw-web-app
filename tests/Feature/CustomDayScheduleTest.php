<?php

namespace Tests\Feature;

use App\Models\Tournament;
use App\Models\User;
use App\Models\TimeSlot;
use App\Services\MasterScheduleGeneratorService;
use App\Services\TimeSlotGeneratorService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomDayScheduleTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::create([
            'name'      => 'Admin User',
            'email'     => 'admin_customday@test.com',
            'password'  => bcrypt('password'),
            'role'      => 'admin',
            'is_active' => true,
        ]);
    }

    /**
     * Test saving tournament config with custom per-day schedule overrides.
     */
    public function test_save_config_with_custom_day_overrides(): void
    {
        $tournament = Tournament::create([
            'name'                     => 'Kejurnas Jadwal Kustom',
            'start_date'               => '2026-10-01',
            'end_date'                 => '2026-10-03',
            'mode'                     => 'regu',
            'status'                   => 'pool_stage',
            'total_days'               => 3,
            'courts_count'             => 2,
            'session_start_time'       => '08:00:00',
            'session_end_time'         => '17:00:00',
            'session_duration_minutes' => 50,
            'break_duration_minutes'   => 0,
            'created_by'               => $this->admin->id,
        ]);

        $payload = [
            'total_days'               => 3,
            'courts_count'             => 2,
            'session_start_time'       => '08:00',
            'session_end_time'         => '17:00',
            'session_duration_minutes' => 50,
            'break_duration_minutes'   => 0,
            'ishoma_start_time'        => '12:00',
            'ishoma_end_time'          => '13:00',
            'modes'                    => ['regu'],
            'pool_counts'              => ['regu' => 2],
            'day_overrides'            => [
                '1' => [
                    'session_start_time'       => '09:30', // Day 1 begins later (opening ceremony)
                    'session_end_time'         => '17:00',
                    'session_duration_minutes' => 50,
                    'has_ishoma'               => true,
                    'ishoma_start_time'        => '12:00',
                    'ishoma_end_time'          => '13:00',
                ],
                '3' => [
                    'session_start_time'       => '08:00',
                    'session_end_time'         => '15:00', // Day 3 ends earlier (finals & closing)
                    'session_duration_minutes' => 50,
                    'has_ishoma'               => false,
                    'ishoma_start_time'        => null,
                    'ishoma_end_time'          => null,
                ],
            ],
        ];

        $response = $this->actingAs($this->admin)->post(
            route('tournaments.master-schedule.save-config', $tournament->id),
            $payload
        );

        $response->assertRedirect(route('tournaments.master-schedule.bracket-matrix', $tournament->id));

        $tournament->refresh();
        $this->assertNotNull($tournament->day_overrides);
        $this->assertArrayHasKey('1', $tournament->day_overrides);
        $this->assertEquals('09:30', $tournament->day_overrides['1']['session_start_time']);

        // Check Day 1 slots start at 09:30
        $day1FirstSlot = TimeSlot::where('tournament_id', $tournament->id)
            ->where('day_number', 1)
            ->where('slot_type', 'match')
            ->orderBy('slot_number')
            ->first();

        $this->assertNotNull($day1FirstSlot);
        $this->assertStringContainsString('09:30', (string) $day1FirstSlot->start_time);

        // Check Day 2 slots start at default 08:00
        $day2FirstSlot = TimeSlot::where('tournament_id', $tournament->id)
            ->where('day_number', 2)
            ->where('slot_type', 'match')
            ->orderBy('slot_number')
            ->first();

        $this->assertNotNull($day2FirstSlot);
        $this->assertStringContainsString('08:00', (string) $day2FirstSlot->start_time);

        // Check Day 3 has no Ishoma slot and ends around 15:00
        $day3Ishoma = TimeSlot::where('tournament_id', $tournament->id)
            ->where('day_number', 3)
            ->where('slot_type', 'ishoma')
            ->first();
        $this->assertNull($day3Ishoma);
    }
}
