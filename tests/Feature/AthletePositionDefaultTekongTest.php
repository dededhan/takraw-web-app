<?php

namespace Tests\Feature;

use App\Models\Athlete;
use App\Models\SuperTeam;
use App\Models\Team;
use App\Models\Tournament;
use App\Models\User;
use App\Services\AthleteExcelService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class AthletePositionDefaultTekongTest extends TestCase
{
    use RefreshDatabase;

    private User $coach;
    private AthleteExcelService $excelService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->coach = User::factory()->create([
            'role'      => 'coach',
            'is_active' => true,
        ]);
        $this->excelService = new AthleteExcelService();
    }

    public function test_csv_parser_defaults_empty_position_to_tekong(): void
    {
        $csvContent = "Nama,Nomor Punggung,Posisi\n" .
                      "Budi,1,\n" .
                      "Andi,2,Feeder\n" .
                      "Candra,3,\n";

        $tempFile = tempnam(sys_get_temp_dir(), 'csv_test');
        file_put_contents($tempFile, $csvContent);

        $parsed = $this->excelService->parseAthletesFile($tempFile, 'csv');
        unlink($tempFile);

        $this->assertCount(3, $parsed);
        $this->assertEquals('Tekong', $parsed[0]['position']);
        $this->assertEquals('Feeder', $parsed[1]['position']);
        $this->assertEquals('Tekong', $parsed[2]['position']);
    }

    public function test_import_athletes_defaults_empty_position_to_tekong(): void
    {
        $team = Team::create([
            'name'     => 'Tim Test Posisi',
            'region'   => 'Jakarta',
            'coach_id' => $this->coach->id,
        ]);

        $csvContent = "Nama,Nomor Punggung,Posisi\n" .
                      "Pemain A,10,\n" .
                      "Pemain B,11,Smash\n";

        $file = UploadedFile::fake()->createWithContent('athletes.csv', $csvContent);

        $response = $this->actingAs($this->coach)
            ->post(route('teams.import-athletes', $team->id), [
                'file' => $file,
            ]);

        $response->assertSessionHas('success');

        $athleteA = Athlete::where('team_id', $team->id)->where('jersey_number', 10)->first();
        $athleteB = Athlete::where('team_id', $team->id)->where('jersey_number', 11)->first();

        $this->assertNotNull($athleteA);
        $this->assertEquals('Tekong', $athleteA->position);

        $this->assertNotNull($athleteB);
        $this->assertEquals('Smash', $athleteB->position);
    }

    public function test_super_team_store_unified_defaults_empty_position_to_tekong(): void
    {
        $athletes = [];
        for ($i = 1; $i <= 6; $i++) {
            $athletes[] = [
                'name'          => "Atlet #{$i}",
                'jersey_number' => $i,
                'position'      => '', // empty position
            ];
        }

        $response = $this->actingAs($this->coach)
            ->post(route('super-teams.store-unified'), [
                'name'       => 'Super Team Default Posisi',
                'region'     => 'Jakarta',
                'match_mode' => 'team_regu',
                'athletes'   => $athletes,
            ]);

        $response->assertSessionHas('success');

        $superTeam = SuperTeam::where('name', 'Super Team Default Posisi')->first();
        $this->assertNotNull($superTeam);

        $allAthletes = $superTeam->members->flatMap->athletes;
        $this->assertCount(6, $allAthletes);
        foreach ($allAthletes as $ath) {
            $this->assertEquals('Tekong', $ath->position);
        }
    }

    public function test_regular_team_store_defaults_empty_position_to_tekong(): void
    {
        $response = $this->actingAs($this->coach)
            ->post(route('teams.store'), [
                'name'     => 'Tim Reguler Default Posisi',
                'region'   => 'Jakarta',
                'athletes' => [
                    ['name' => 'Atlet Reguler 1', 'jersey_number' => 7, 'position' => ''],
                    ['name' => 'Atlet Reguler 2', 'jersey_number' => 8, 'position' => 'Feeder'],
                ],
            ]);

        $response->assertSessionHas('success');

        $team = Team::where('name', 'Tim Reguler Default Posisi')->first();
        $this->assertNotNull($team);

        $ath1 = $team->athletes()->where('jersey_number', 7)->first();
        $ath2 = $team->athletes()->where('jersey_number', 8)->first();

        $this->assertEquals('Tekong', $ath1->position);
        $this->assertEquals('Feeder', $ath2->position);
    }
}
