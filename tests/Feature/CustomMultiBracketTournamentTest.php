<?php

namespace Tests\Feature;

use App\Models\BracketMatrix;
use App\Models\Match_;
use App\Models\MatchSet;
use App\Models\Pool;
use App\Models\PoolStanding;
use App\Models\SuperTeam;
use App\Models\Team;
use App\Models\Tournament;
use App\Models\User;
use App\Services\MasterScheduleGeneratorService;
use App\Services\PlaceholderResolverService;
use App\Services\TimeSlotGeneratorService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomMultiBracketTournamentTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::create([
            'name'      => 'Admin User',
            'email'     => 'admin_multibracket@test.com',
            'password'  => bcrypt('password'),
            'role'      => 'admin',
            'is_active' => true,
        ]);
    }

    /**
     * Test creating custom multi-bracket configuration with uneven pool counts:
     * Bracket 1: 2 Pools
     * Bracket 2: 3 Pools
     * Bracket 3: 1 Pool
     */
    public function test_generate_custom_multi_bracket_pools_and_matrix(): void
    {
        $tournament = Tournament::create([
            'name'                     => 'Kejurnas Multi-Bracket Test',
            'start_date'               => now()->toDateString(),
            'end_date'                 => now()->addDays(4)->toDateString(),
            'mode'                     => 'regu',
            'status'                   => 'pool_stage',
            'total_days'               => 4,
            'courts_count'             => 4,
            'session_start_time'       => '08:00:00',
            'session_end_time'         => '18:00:00',
            'session_duration_minutes' => 45,
            'break_duration_minutes'   => 15,
            'created_by'               => $this->admin->id,
        ]);

        $tournament->modes()->create([
            'match_mode' => 'team_regu',
            'pool_count' => 6,
            'is_active'  => true,
        ]);

        // Create 12 Super Teams
        for ($i = 1; $i <= 12; $i++) {
            SuperTeam::create([
                'tournament_id' => $tournament->id,
                'name'          => "Super Team #{$i}",
                'match_mode'    => 'team_regu',
                'created_by'    => $this->admin->id,
            ]);
        }

        // Post to generate-multi-bracket
        $payload = [
            'match_mode' => 'team_regu',
            'brackets'   => [
                ['name' => 'Divisi Utama (Bracket 1)', 'pool_count' => 2], // 2 Pools: A & B
                ['name' => 'Divisi Satu (Bracket 2)',  'pool_count' => 3], // 3 Pools: A, B & C
                ['name' => 'Divisi Dua (Bracket 3)',   'pool_count' => 1], // 1 Pool: A
            ],
        ];

        $response = $this->actingAs($this->admin)->post(
            route('pools.generate-multi-bracket', $tournament->id),
            $payload
        );

        $response->assertRedirect(route('pools.index', $tournament->id));

        // Verify total pools created = 2 + 3 + 1 = 6 pools
        $pools = Pool::where('tournament_id', $tournament->id)->where('match_mode', 'team_regu')->get();
        $this->assertCount(6, $pools);

        // Verify Bracket 1 pools
        $b1Pools = Pool::where('tournament_id', $tournament->id)->where('bracket_name', 'Divisi Utama (Bracket 1)')->get();
        $this->assertCount(2, $b1Pools);
        $this->assertEquals(['A', 'B'], $b1Pools->pluck('name')->toArray());
        $this->assertEquals('Divisi Utama (Bracket 1) - Pool A', $b1Pools[0]->display_name);

        // Verify Bracket 2 pools
        $b2Pools = Pool::where('tournament_id', $tournament->id)->where('bracket_name', 'Divisi Satu (Bracket 2)')->get();
        $this->assertCount(3, $b2Pools);
        $this->assertEquals(['A', 'B', 'C'], $b2Pools->pluck('name')->toArray());

        // Verify Bracket 3 pool
        $b3Pools = Pool::where('tournament_id', $tournament->id)->where('bracket_name', 'Divisi Dua (Bracket 3)')->get();
        $this->assertCount(1, $b3Pools);
        $this->assertEquals(['A'], $b3Pools->pluck('name')->toArray());

        // Verify all 12 super teams have been assigned and standings initialized
        $standingsCount = PoolStanding::whereIn('pool_id', $pools->pluck('id'))->count();
        $this->assertEquals(12, $standingsCount);

        // Verify Bracket Matrix was synced
        $matrices = BracketMatrix::where('tournament_id', $tournament->id)->where('match_mode', 'team_regu')->get();
        $this->assertTrue($matrices->count() >= 3);
    }

    /**
     * Test Master Schedule generation for multi-bracket setup.
     */
    public function test_master_schedule_generation_for_multi_bracket(): void
    {
        $tournament = Tournament::create([
            'name'                     => 'Turnamen 2 Bracket 4 Pool',
            'start_date'               => now()->toDateString(),
            'end_date'                 => now()->addDays(4)->toDateString(),
            'mode'                     => 'regu',
            'status'                   => 'pool_stage',
            'total_days'               => 4,
            'courts_count'             => 4,
            'session_start_time'       => '08:00:00',
            'session_end_time'         => '18:00:00',
            'session_duration_minutes' => 45,
            'break_duration_minutes'   => 15,
            'created_by'               => $this->admin->id,
        ]);

        $tournament->modes()->create([
            'match_mode' => 'regu',
            'pool_count' => 4,
            'is_active'  => true,
        ]);

        // Create 8 regular teams
        for ($i = 1; $i <= 8; $i++) {
            $t = Team::create([
                'tournament_id' => $tournament->id,
                'name'          => "Tim Regu #{$i}",
                'region'        => 'DKI Jakarta',
                'created_by'    => $this->admin->id,
            ]);
            $tournament->teams()->attach($t->id, ['match_mode' => 'regu']);
        }

        $payload = [
            'match_mode' => 'regu',
            'brackets'   => [
                ['name' => 'Bracket A', 'pool_count' => 2], // 2 pools of 2 teams
                ['name' => 'Bracket B', 'pool_count' => 2], // 2 pools of 2 teams
            ],
        ];

        $this->actingAs($this->admin)->post(
            route('pools.generate-multi-bracket', $tournament->id),
            $payload
        );

        app(TimeSlotGeneratorService::class)->generate($tournament);
        $scheduleStats = app(MasterScheduleGeneratorService::class)->generate($tournament);

        $this->assertGreaterThan(0, $scheduleStats['pool_matches_scheduled']);
        $this->assertGreaterThan(0, $scheduleStats['bracket_matches_created']);
    }

    /**
     * Test keyword filtering where only teams matching the bracket's keyword are assigned to that bracket.
     */
    public function test_generate_multi_bracket_pools_with_keyword_filter(): void
    {
        $tournament = Tournament::create([
            'name'                     => 'Kejurnas Usia Dini',
            'start_date'               => now()->toDateString(),
            'end_date'                 => now()->addDays(2)->toDateString(),
            'mode'                     => 'regu',
            'status'                   => 'pool_stage',
            'created_by'               => $this->admin->id,
        ]);

        $tournament->modes()->create([
            'match_mode' => 'regu',
            'pool_count' => 4,
            'is_active'  => true,
        ]);

        // Create 4 teams with 'TPA U18' prefix
        for ($i = 1; $i <= 4; $i++) {
            $t = Team::create([
                'name'       => "TPA U18 Tim-{$i}",
                'region'     => 'Jakarta',
                'created_by' => $this->admin->id,
            ]);
            $tournament->teams()->attach($t->id, ['match_mode' => 'regu']);
        }

        // Create 4 teams with 'TRA U15' prefix
        for ($i = 1; $i <= 4; $i++) {
            $t = Team::create([
                'name'       => "TRA U15 Tim-{$i}",
                'region'     => 'Bandung',
                'created_by' => $this->admin->id,
            ]);
            $tournament->teams()->attach($t->id, ['match_mode' => 'regu']);
        }

        $payload = [
            'match_mode' => 'regu',
            'brackets'   => [
                ['name' => 'Kategori TPA U-18', 'pool_count' => 2, 'keyword' => 'TPA U18'],
                ['name' => 'Kategori TRA U-15', 'pool_count' => 2, 'keyword' => 'TRA U15'],
            ],
        ];

        $response = $this->actingAs($this->admin)->post(
            route('pools.generate-multi-bracket', $tournament->id),
            $payload
        );

        $response->assertRedirect(route('pools.index', $tournament->id));

        // Check Bracket 1 pools: must only contain TPA U18 teams
        $b1Pools = Pool::where('tournament_id', $tournament->id)->where('bracket_name', 'Kategori TPA U-18')->with('teams')->get();
        $this->assertCount(2, $b1Pools);
        foreach ($b1Pools as $pool) {
            foreach ($pool->teams as $team) {
                $this->assertStringContainsString('TPA U18', $team->name);
            }
        }

        // Check Bracket 2 pools: must only contain TRA U15 teams
        $b2Pools = Pool::where('tournament_id', $tournament->id)->where('bracket_name', 'Kategori TRA U-15')->with('teams')->get();
        $this->assertCount(2, $b2Pools);
        foreach ($b2Pools as $pool) {
            foreach ($pool->teams as $team) {
                $this->assertStringContainsString('TRA U15', $team->name);
            }
        }
    }
}
