<?php

namespace Tests\Feature;

use App\Models\Athlete;
use App\Models\Match_;
use App\Models\MatchSet;
use App\Models\Pool;
use App\Models\SetStat;
use App\Models\Team;
use App\Models\Tournament;
use App\Models\User;
use App\Services\AthletePerformanceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AthletePerformanceTest extends TestCase
{
    use RefreshDatabase;

    public function test_athlete_performance_service_calculates_awards_correctly(): void
    {
        $coach = User::factory()->create(['role' => 'coach']);
        $admin = User::factory()->create(['role' => 'admin']);

        $tournament = Tournament::create([
            'name'       => 'Piala Takraw Juara',
            'start_date' => now()->toDateString(),
            'end_date'   => now()->addDays(3)->toDateString(),
            'mode'       => 'regu',
            'status'     => 'pool_stage',
            'created_by' => $admin->id,
        ]);

        $pool = Pool::create([
            'tournament_id'  => $tournament->id,
            'name'           => 'A',
            'match_mode'     => 'regu',
            'bracket_number' => 1,
            'bracket_name'   => 'Bracket 1',
        ]);

        $teamA = Team::create([
            'name'     => 'Tim Elang',
            'region'   => 'Jakarta',
            'coach_id' => $coach->id,
        ]);

        $teamB = Team::create([
            'name'     => 'Tim Rajawali',
            'region'   => 'Bandung',
            'coach_id' => $coach->id,
        ]);

        $athlete1 = Athlete::create([
            'team_id'       => $teamA->id,
            'name'          => 'Budi Server',
            'jersey_number' => '1',
            'position'      => 'tekong',
        ]);

        $athlete2 = Athlete::create([
            'team_id'       => $teamB->id,
            'name'          => 'Andi Smasher',
            'jersey_number' => '7',
            'position'      => 'striker',
        ]);

        $match = Match_::create([
            'tournament_id' => $tournament->id,
            'pool_id'       => $pool->id,
            'stage'         => 'pool',
            'home_team_id'  => $teamA->id,
            'away_team_id'  => $teamB->id,
            'match_mode'    => 'regu',
            'status'        => 'finished',
        ]);

        $set = MatchSet::create([
            'match_id'   => $match->id,
            'set_number' => 1,
            'home_score' => 21,
            'away_score' => 18,
            'is_finished'=> true,
        ]);

        // Stats for Budi: 5 service aces, 10 service in, 1 service error
        SetStat::create([
            'match_set_id'  => $set->id,
            'athlete_id'    => $athlete1->id,
            'team_id'       => $teamA->id,
            'service_ace'   => 5,
            'service_in'    => 10,
            'service_error' => 1,
        ]);

        // Stats for Andi: 8 strike aces, 4 strike successes, 1 strike error
        SetStat::create([
            'match_set_id'   => $set->id,
            'athlete_id'     => $athlete2->id,
            'team_id'        => $teamB->id,
            'strike_ace'     => 8,
            'strike_success' => 4,
            'strike_error'   => 1,
        ]);

        $service = new AthletePerformanceService();
        $results = $service->getTournamentBestPlayers($tournament);

        $this->assertTrue($results['has_data']);
        $this->assertNotEmpty($results['overall']['leaderboard']);

        // Check MVP
        $this->assertNotNull($results['overall']['awards']['mvp']);

        // Check Best Server
        $bestServer = $results['overall']['awards']['best_server'];
        $this->assertEquals($athlete1->id, $bestServer['athlete_id']);
        $this->assertEquals(5, $bestServer['stats']['service_ace']);

        // Check Best Striker
        $bestStriker = $results['overall']['awards']['best_striker'];
        $this->assertEquals($athlete2->id, $bestStriker['athlete_id']);
        $this->assertEquals(8, $bestStriker['stats']['strike_ace']);

        // Check Coach awards
        $coachAwards = $service->getCoachAthleteAwards($coach->id, $tournament->id);
        $this->assertNotEmpty($coachAwards);
    }
}
