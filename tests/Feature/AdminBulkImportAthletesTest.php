<?php

namespace Tests\Feature;

use App\Models\Athlete;
use App\Models\Team;
use App\Models\User;
use App\Services\AthleteExcelService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class AdminBulkImportAthletesTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $coach;
    private AthleteExcelService $excelService;

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
        $this->excelService = new AthleteExcelService();
    }

    public function test_multi_team_parser_groups_by_kontingen_and_separates_officials(): void
    {
        $csvContent = "Nama,Kontingen,Posisi\n" .
                      "Anton Oktafiansyah,PPLM A,Coach\n" .
                      "Aldi Pratama,PPLM A,Asisten Coach\n" .
                      "Rahmad Hidayat,PPLM A,Tekong\n" .
                      "Hendy Loren,PPLM A,Smash\n" .
                      "Firly Adhyaksa,PPLM A,Feeder\n" .
                      "Budi Hartono,UNJ B,Coach\n" .
                      "Kamel Ramdhani,UNJ B,Tekong\n" .
                      "Risky Rifaldi,UNJ B,Killer\n";

        $tempFile = tempnam(sys_get_temp_dir(), 'takraw_multi_');
        file_put_contents($tempFile, $csvContent);

        $result = $this->excelService->parseMultiTeamFile($tempFile, 'csv');
        unlink($tempFile);

        $this->assertTrue($result['has_teams']);
        $this->assertEquals(5, $result['total_athletes']);
        $this->assertCount(2, $result['teams']);

        // Check Team 1 (PPLM A)
        $pplm = $result['teams'][0];
        $this->assertEquals('PPLM A', $pplm['team_name']);
        $this->assertEquals('Anton Oktafiansyah', $pplm['coach_name']);
        $this->assertCount(3, $pplm['athletes']);
        $this->assertEquals('Rahmad Hidayat', $pplm['athletes'][0]['name']);
        $this->assertEquals('Tekong', $pplm['athletes'][0]['position']);
        $this->assertEquals(1, $pplm['athletes'][0]['jersey_number']);
        $this->assertEquals('Hendy Loren', $pplm['athletes'][1]['name']);
        $this->assertEquals('Smash', $pplm['athletes'][1]['position']);
        $this->assertEquals(2, $pplm['athletes'][1]['jersey_number']);

        // Check Team 2 (UNJ B)
        $unj = $result['teams'][1];
        $this->assertEquals('UNJ B', $unj['team_name']);
        $this->assertEquals('Budi Hartono', $unj['coach_name']);
        $this->assertCount(2, $unj['athletes']);
        $this->assertEquals('Smash', $unj['athletes'][1]['position']); // Killer converted to Smash
    }

    public function test_coach_cannot_access_bulk_import_routes(): void
    {
        $csvContent = "Nama,Kontingen,Posisi\nRahmad,PPLM A,Tekong\n";
        $file = UploadedFile::fake()->createWithContent('players.csv', $csvContent);

        $response = $this->actingAs($this->coach)
            ->post(route('teams.analyze-bulk-file'), ['file' => $file]);

        $response->assertStatus(403);
    }

    public function test_admin_can_analyze_bulk_file_and_bulk_replace_athletes(): void
    {
        $team1 = Team::create([
            'name'     => 'PPLM A',
            'region'   => 'DKI Jakarta',
            'coach_id' => $this->coach->id,
        ]);

        $team2 = Team::create([
            'name'     => 'UNJ B',
            'region'   => 'Jakarta Timur',
            'coach_id' => $this->coach->id,
        ]);

        // Seed old athletes that should be replaced
        Athlete::create(['team_id' => $team1->id, 'name' => 'Old Athlete 1', 'jersey_number' => 99, 'position' => 'Tekong']);
        Athlete::create(['team_id' => $team2->id, 'name' => 'Old Athlete 2', 'jersey_number' => 88, 'position' => 'Feeder']);

        $this->assertEquals(1, $team1->athletes()->count());
        $this->assertEquals(1, $team2->athletes()->count());

        $csvContent = "Nama,Kontingen,Posisi\n" .
                      "Rahmad Hidayat,PPLM A,Tekong\n" .
                      "Hendy Loren,PPLM A,Smash\n" .
                      "Kamel Ramdhani,UNJ B,Tekong\n";

        $file = UploadedFile::fake()->createWithContent('daftar_pemain.csv', $csvContent);

        // 1. Analyze endpoint
        $analyzeRes = $this->actingAs($this->admin)
            ->post(route('teams.analyze-bulk-file'), ['file' => $file]);

        $analyzeRes->assertOk();
        $analyzeRes->assertJsonPath('success', true);
        $analyzeRes->assertJsonPath('has_teams', true);
        $analyzeRes->assertJsonPath('total_athletes', 3);

        // 2. Bulk Replace endpoint
        $replaceRes = $this->actingAs($this->admin)
            ->post(route('teams.bulk-replace-athletes'), [
                'replace_existing' => true,
                'targets' => [
                    [
                        'team_id' => $team1->id,
                        'athletes' => [
                            ['name' => 'Rahmad Hidayat', 'jersey_number' => 1, 'position' => 'Tekong'],
                            ['name' => 'Hendy Loren', 'jersey_number' => 2, 'position' => 'Smash'],
                        ],
                    ],
                    [
                        'team_id' => $team2->id,
                        'athletes' => [
                            ['name' => 'Kamel Ramdhani', 'jersey_number' => 1, 'position' => 'Tekong'],
                        ],
                    ],
                ],
            ]);

        $replaceRes->assertRedirect(route('teams.index'));
        $replaceRes->assertSessionHas('success');

        // Verify team 1 old athletes are gone, new athletes are present
        $this->assertEquals(2, $team1->fresh()->athletes()->count());
        $this->assertFalse($team1->fresh()->athletes()->where('name', 'Old Athlete 1')->exists());
        $this->assertTrue($team1->fresh()->athletes()->where('name', 'Rahmad Hidayat')->exists());
        $this->assertTrue($team1->fresh()->athletes()->where('name', 'Hendy Loren')->exists());

        // Verify team 2 old athletes are gone, new athletes are present
        $this->assertEquals(1, $team2->fresh()->athletes()->count());
        $this->assertFalse($team2->fresh()->athletes()->where('name', 'Old Athlete 2')->exists());
        $this->assertTrue($team2->fresh()->athletes()->where('name', 'Kamel Ramdhani')->exists());
    }
}
