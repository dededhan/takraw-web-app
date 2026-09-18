<?php

namespace App\Http\Controllers;

use App\Models\Athlete;
use App\Models\Team;
use App\Models\Tournament;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TeamController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim($request->input('search', ''));
        $coachId = $request->input('coach_id');

        $query = Team::where('is_super_sub', false)
            ->with(['coach', 'athletes', 'tournaments'])
            ->withCount('athletes');

        // If coach, only show their teams. If admin, allow filtering by coach_id if specified.
        if ($request->user()->isCoach()) {
            $query->where('coach_id', $request->user()->id);
        } elseif ($coachId) {
            $query->where('coach_id', $coachId);
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('region', 'like', "%{$search}%")
                  ->orWhereHas('coach', function ($cq) use ($search) {
                      $cq->where('name', 'like', "%{$search}%");
                  })
                  ->orWhereHas('athletes', function ($aq) use ($search) {
                      $aq->where('name', 'like', "%{$search}%");
                  });
            });
        }

        $superTeamsQuery = \App\Models\SuperTeam::with(['members.athletes', 'tournaments', 'tournament', 'coach']);
        if ($request->user()->isCoach()) {
            $superTeamsQuery->where('coach_id', $request->user()->id);
        } elseif ($coachId) {
            $superTeamsQuery->where('coach_id', $coachId);
        }

        if ($search !== '') {
            $superTeamsQuery->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhereHas('coach', function ($cq) use ($search) {
                      $cq->where('name', 'like', "%{$search}%");
                  })
                  ->orWhereHas('members', function ($mq) use ($search) {
                      $mq->where('name', 'like', "%{$search}%")
                         ->orWhere('region', 'like', "%{$search}%")
                         ->orWhereHas('athletes', function ($maq) use ($search) {
                             $maq->where('name', 'like', "%{$search}%");
                         });
                  });
            });
        }

        $allCoachTeams = $request->user()->isCoach()
            ? Team::where('coach_id', $request->user()->id)->get(['id', 'name', 'region'])
            : Team::get(['id', 'name', 'region']);

        $coaches = $request->user()->isAdmin()
            ? User::where('role', 'coach')->where('is_active', true)->get(['id', 'name'])
            : [];

        $tournaments = Tournament::whereIn('status', ['draft', 'registration', 'pool_stage'])
            ->get(['id', 'name', 'status']);

        return Inertia::render('Team/Index', [
            'teams' => $query->latest()->paginate(12)->withQueryString(),
            'superTeams' => $superTeamsQuery->latest()->get(),
            'allCoachTeams' => $allCoachTeams,
            'coaches' => $coaches,
            'tournaments' => $tournaments,
            'filters' => [
                'search'   => $search,
                'coach_id' => $coachId ? (string) $coachId : '',
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Team/Create', [
            'coaches' => User::where('role', 'coach')->where('is_active', true)->get(['id', 'name']),
            'tournaments' => Tournament::whereIn('status', ['draft', 'registration'])->get(['id', 'name']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'region' => 'required|string|max:100',
            'coach_id' => 'nullable|exists:users,id',
            'tournament_id' => 'nullable|exists:tournaments,id',
            'athletes' => 'required|array|min:1',
            'athletes.*.name' => 'required|string|max:100',
            'athletes.*.jersey_number' => 'required|integer|min:1|max:999|distinct',
            'athletes.*.position' => 'nullable|string|max:50',
            'athletes.*.photo' => 'nullable|image|max:2048',
        ], [
            'athletes.required' => 'Daftar atlet wajib diisi.',
            'athletes.min' => 'Tim harus memiliki minimal 1 atlet.',
            'athletes.*.name.required' => 'Nama atlet wajib diisi.',
            'athletes.*.jersey_number.required' => 'Nomor punggung wajib diisi.',
            'athletes.*.jersey_number.min' => 'Nomor punggung minimal 1.',
            'athletes.*.jersey_number.max' => 'Nomor punggung maksimal 999.',
            'athletes.*.jersey_number.distinct' => 'Nomor punggung tidak boleh sama dalam satu tim.',
        ]);

        // Auto-assign coach if user is a coach
        if ($request->user()->isCoach()) {
            $validated['coach_id'] = $request->user()->id;
        }

        $team = \DB::transaction(function () use ($request, $validated) {
            $team = Team::create([
                'name' => $validated['name'],
                'region' => $validated['region'],
                'coach_id' => $validated['coach_id'] ?? null,
            ]);

            foreach ($validated['athletes'] as $index => $athleteData) {
                $photoPath = $request->hasFile("athletes.{$index}.photo")
                    ? $request->file("athletes.{$index}.photo")->store('athletes', 'public')
                    : null;

                Athlete::create([
                    'team_id' => $team->id,
                    'name' => $athleteData['name'],
                    'jersey_number' => (int) $athleteData['jersey_number'],
                    'position' => !empty($athleteData['position']) ? $athleteData['position'] : 'Tekong',
                    'photo' => $photoPath,
                ]);
            }

            // Register team to tournament if specified
            if (!empty($validated['tournament_id'])) {
                $tournament = Tournament::findOrFail($validated['tournament_id']);
                $tournament->teams()->attach($team->id);
            }

            return $team;
        });

        return redirect()->route('teams.show', $team)
            ->with('success', 'Tim berhasil didaftarkan!');
    }

    public function show(Team $team): Response
    {
        $team->load(['coach', 'athletes', 'tournaments']);

        return Inertia::render('Team/Show', [
            'team' => $team,
        ]);
    }

    public function edit(Request $request, Team $team)
    {
        // Khusus role pelatih: tidak bisa edit jika tim sudah memiliki nilai pertandingan
        if ($request->user()->isCoach() && $team->hasMatchScores()) {
            return redirect()->route('teams.show', $team)
                ->with('error', 'Tim ini tidak dapat diedit karena sudah memiliki nilai pertandingan yang berjalan.');
        }

        $team->load('athletes');

        return Inertia::render('Team/Edit', [
            'team' => $team,
            'coaches' => User::where('role', 'coach')->where('is_active', true)->get(['id', 'name']),
        ]);
    }

    public function update(Request $request, Team $team)
    {
        // Khusus role pelatih: tidak bisa edit jika tim sudah memiliki nilai pertandingan
        if ($request->user()->isCoach() && $team->hasMatchScores()) {
            return redirect()->route('teams.show', $team)
                ->with('error', 'Tim ini tidak dapat diedit karena sudah memiliki nilai pertandingan yang berjalan.');
        }
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'region' => 'required|string|max:100',
            'coach_id' => 'nullable|exists:users,id',
            'athletes' => 'sometimes|array|min:1',
            'athletes.*.id' => 'nullable|exists:athletes,id',
            'athletes.*.name' => 'required|string|max:100',
            'athletes.*.jersey_number' => 'required|integer|min:1|max:999|distinct',
            'athletes.*.position' => 'nullable|string|max:50',
            'athletes.*.photo' => 'nullable|image|max:2048',
        ], [
            'athletes.min' => 'Tim harus memiliki minimal 1 atlet.',
            'athletes.*.name.required' => 'Nama atlet wajib diisi.',
            'athletes.*.jersey_number.required' => 'Nomor punggung wajib diisi.',
            'athletes.*.jersey_number.min' => 'Nomor punggung minimal 1.',
            'athletes.*.jersey_number.max' => 'Nomor punggung maksimal 999.',
            'athletes.*.jersey_number.distinct' => 'Nomor punggung tidak boleh sama dalam satu tim.',
        ]);

        \DB::transaction(function () use ($request, $team, $validated) {
            $team->update([
                'name' => $validated['name'],
                'region' => $validated['region'],
                'coach_id' => $validated['coach_id'] ?? $team->coach_id,
            ]);

            // Sync athletes if provided
            if (isset($validated['athletes'])) {
                $submittedIds = array_values(array_filter(
                    array_column($validated['athletes'], 'id'),
                    fn($id) => !empty($id)
                ));

                // 1. Delete removed athletes first so their jersey numbers and records are freed immediately
                $team->athletes()->whereNotIn('id', $submittedIds)->delete();

                // 2. Temporarily park existing athletes' jersey numbers with a unique offset (50000 + id % 10000)
                // This eliminates UNIQUE constraint violation on (team_id, jersey_number) when swapping or reordering numbers
                if (!empty($submittedIds)) {
                    $existingAthletes = $team->athletes()->whereIn('id', $submittedIds)->get();
                    foreach ($existingAthletes as $existingAth) {
                        $existingAth->update([
                            'jersey_number' => 50000 + ($existingAth->id % 10000),
                        ]);
                    }
                }

                // 3. Update existing athletes or create new ones
                foreach ($validated['athletes'] as $index => $athleteData) {
                    $photoPath = $request->hasFile("athletes.{$index}.photo")
                        ? $request->file("athletes.{$index}.photo")->store('athletes', 'public')
                        : null;

                    if (!empty($athleteData['id'])) {
                        $athlete = Athlete::where('team_id', $team->id)->find($athleteData['id']);
                        if ($athlete) {
                            $athlete->update([
                                'name' => $athleteData['name'],
                                'jersey_number' => (int) $athleteData['jersey_number'],
                                'position' => !empty($athleteData['position']) ? $athleteData['position'] : 'Tekong',
                                'photo' => $photoPath ?? $athlete->photo,
                            ]);
                            continue;
                        }
                    }

                    // If id is null or does not exist in this team, create new athlete
                    Athlete::create([
                        'team_id' => $team->id,
                        'name' => $athleteData['name'],
                        'jersey_number' => (int) $athleteData['jersey_number'],
                        'position' => !empty($athleteData['position']) ? $athleteData['position'] : 'Tekong',
                        'photo' => $photoPath,
                    ]);
                }
            }
        });

        return redirect()->route('teams.show', $team)
            ->with('success', 'Tim berhasil diupdate!');
    }

    public function destroy(Team $team)
    {
        $team->delete();

        return redirect()->route('teams.index')
            ->with('success', 'Tim berhasil dihapus!');
    }

    /**
     * Download the styled XLSX Excel template for athletes.
     */
    public function downloadTemplate(\App\Services\AthleteExcelService $excelService)
    {
        $fileContent = $excelService->generateTemplate();

        return response($fileContent, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="template_import_atlet.xlsx"',
            'Cache-Control' => 'max-age=0',
        ]);
    }

    /**
     * Import athletes from an XLSX, XLS, or CSV file.
     */
    public function importAthletes(Request $request, Team $team, \App\Services\AthleteExcelService $excelService)
    {
        $request->validate([
            'file' => 'required|file|max:5120',
        ]);

        $file = $request->file('file');
        $path = $file->getRealPath();
        $ext = strtolower($file->getClientOriginalExtension() ?: pathinfo($file->getClientOriginalName(), PATHINFO_EXTENSION));

        if (!in_array($ext, ['xlsx', 'xls', 'csv', 'txt'])) {
            return back()->with('error', 'Format file tidak didukung. Harap unggah file .xlsx, .xls, atau .csv');
        }

        try {
            $parsedAthletes = $excelService->parseAthletesFile($path, $ext);
        } catch (\Throwable $e) {
            return back()->with('error', 'Gagal memproses file: ' . $e->getMessage());
        }

        if (empty($parsedAthletes)) {
            return back()->with('error', 'Tidak ditemukan data atlet yang valid dalam file yang diunggah.');
        }

        $importedCount = 0;
        $errors = [];
        $existingJerseys = $team->athletes()->pluck('jersey_number')->toArray();

        foreach ($parsedAthletes as $index => $row) {
            $rowNum = $index + 1;
            $name = trim($row['name'] ?? '');
            $jerseyNumber = (int)($row['jersey_number'] ?? 0);
            $rawPos = trim($row['position'] ?? '');
            $position = !empty($rawPos) ? $rawPos : 'Tekong';
            if (strcasecmp($position, 'killer') === 0) {
                $position = 'Smash';
            }

            if (empty($name)) {
                $errors[] = "Data #{$rowNum}: Nama atlet kosong.";
                continue;
            }

            if ($jerseyNumber <= 0) {
                $errors[] = "Data #{$rowNum} ({$name}): Nomor punggung tidak valid.";
                continue;
            }

            if (in_array($jerseyNumber, $existingJerseys)) {
                $errors[] = "Data #{$rowNum} ({$name}): Nomor punggung {$jerseyNumber} sudah digunakan.";
                continue;
            }

            $validPositions = ['Tekong', 'Feeder', 'Smash', 'Killer', 'Cadangan'];
            $posFormatted = ucfirst(strtolower($position));
            if ($posFormatted === 'Killer') {
                $posFormatted = 'Smash';
            }
            if (!in_array($posFormatted, $validPositions)) {
                $posFormatted = 'Tekong';
            }

            Athlete::create([
                'team_id' => $team->id,
                'name' => $name,
                'jersey_number' => $jerseyNumber,
                'position' => $posFormatted,
            ]);

            $existingJerseys[] = $jerseyNumber;
            $importedCount++;
        }

        if ($importedCount === 0) {
            return back()->with('error', 'Tidak ada atlet yang berhasil diimpor. ' . implode(' ', $errors));
        }

        $msg = "Berhasil mengimpor {$importedCount} atlet dari file Excel!";
        if (count($errors) > 0) {
            $msg .= " (" . count($errors) . " baris dilewati karena duplikat/tidak valid).";
        }

        return back()->with('success', $msg);
    }

    /**
     * Parse an uploaded athletes Excel (XLSX, XLS) or CSV file and return JSON athletes array.
     */
    public function parseAthletesFile(Request $request, \App\Services\AthleteExcelService $excelService)
    {
        $request->validate([
            'file' => 'required|file|max:5120',
        ]);

        $file = $request->file('file');
        $path = $file->getRealPath();
        $ext = strtolower($file->getClientOriginalExtension() ?: pathinfo($file->getClientOriginalName(), PATHINFO_EXTENSION));

        if (!in_array($ext, ['xlsx', 'xls', 'csv', 'txt'])) {
            return response()->json([
                'success' => false,
                'message' => 'Format file tidak didukung. Harap unggah file .xlsx, .xls, atau .csv',
            ], 422);
        }

        try {
            $athletes = $excelService->parseAthletesFile($path, $ext);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal membaca file: ' . $e->getMessage(),
            ], 422);
        }

        if (empty($athletes)) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak ditemukan data atlet valid di dalam file. Pastikan kolom Nama dan Nomor Punggung terisi dengan benar.',
            ], 422);
        }

        // Check for duplicates in the file
        $seenJerseys = [];
        $duplicates = [];
        foreach ($athletes as $athlete) {
            $j = (int)$athlete['jersey_number'];
            if (in_array($j, $seenJerseys)) {
                $duplicates[] = $j;
            } else {
                $seenJerseys[] = $j;
            }
        }

        return response()->json([
            'success' => true,
            'athletes' => $athletes,
            'count' => count($athletes),
            'duplicate_jerseys' => array_values(array_unique($duplicates)),
            'message' => "Berhasil membaca " . count($athletes) . " atlet dari file Excel.",
        ]);
    }

    /**
     * Analyze uploaded Excel/CSV file for admin bulk team import.
     */
    public function analyzeBulkFile(Request $request, \App\Services\AthleteExcelService $excelService)
    {
        if (!$request->user()->isAdmin()) {
            abort(403, 'Akses terbatas untuk Admin.');
        }

        $request->validate([
            'file' => 'required|file|max:10240', // 10MB
        ]);

        $file = $request->file('file');
        $path = $file->getRealPath();
        $ext = strtolower($file->getClientOriginalExtension() ?: pathinfo($file->getClientOriginalName(), PATHINFO_EXTENSION));

        if (!in_array($ext, ['xlsx', 'xls', 'csv', 'txt'])) {
            return response()->json([
                'success' => false,
                'message' => 'Format file tidak didukung. Harap unggah file .xlsx, .xls, atau .csv',
            ], 422);
        }

        try {
            $result = $excelService->parseMultiTeamFile($path, $ext);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal membaca file: ' . $e->getMessage(),
            ], 422);
        }

        $dbTeams = Team::where('is_super_sub', false)->get(['id', 'name', 'region'])->map(function ($t) {
            return [
                'id' => $t->id,
                'name' => $t->name,
                'region' => $t->region,
                'clean_name' => strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $t->name)),
            ];
        });

        if ($result['has_teams']) {
            foreach ($result['teams'] as &$pTeam) {
                $parsedClean = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $pTeam['team_name']));
                $matched = $dbTeams->first(function ($d) use ($parsedClean) {
                    return $d['clean_name'] === $parsedClean ||
                        str_contains($d['clean_name'], $parsedClean) ||
                        str_contains($parsedClean, $d['clean_name']);
                });

                $pTeam['matched_team_id'] = $matched ? $matched['id'] : null;
                $pTeam['matched_team_name'] = $matched ? $matched['name'] : null;
            }
            unset($pTeam);
        }

        return response()->json([
            'success' => true,
            'has_teams' => $result['has_teams'],
            'total_athletes' => $result['total_athletes'],
            'teams' => $result['teams'] ?? [],
            'athletes' => $result['athletes'] ?? [],
            'all_db_teams' => Team::where('is_super_sub', false)->orderBy('name')->get(['id', 'name', 'region']),
        ]);
    }

    /**
     * Execute bulk replacement of athletes for selected teams (Admin only).
     */
    public function bulkReplaceAthletes(Request $request)
    {
        if (!$request->user()->isAdmin()) {
            abort(403, 'Akses terbatas untuk Admin.');
        }

        $request->validate([
            'targets' => 'required|array|min:1',
            'targets.*.team_id' => 'required|exists:teams,id',
            'targets.*.athletes' => 'required|array|min:1',
            'targets.*.athletes.*.name' => 'required|string|max:255',
            'targets.*.athletes.*.jersey_number' => 'required|integer',
            'targets.*.athletes.*.position' => 'nullable|string',
            'replace_existing' => 'nullable|boolean',
        ]);

        $targets = $request->input('targets');
        $replaceExisting = $request->boolean('replace_existing', true);

        $updatedTeamsCount = 0;
        $totalAthletesCount = 0;
        $teamNamesUpdated = [];

        \DB::transaction(function () use ($targets, $replaceExisting, &$updatedTeamsCount, &$totalAthletesCount, &$teamNamesUpdated) {
            foreach ($targets as $target) {
                $teamId = $target['team_id'];
                $athletesData = $target['athletes'];

                $team = Team::find($teamId);
                if (!$team) continue;

                if ($replaceExisting) {
                    foreach ($team->athletes as $oldAthlete) {
                        if ($oldAthlete->photo) {
                            \Storage::disk('public')->delete($oldAthlete->photo);
                        }
                    }
                    $team->athletes()->delete();
                    $existingJerseys = [];
                } else {
                    $existingJerseys = $team->athletes()->pluck('jersey_number')->toArray();
                }

                $currentJersey = 1;
                foreach ($athletesData as $a) {
                    $name = trim($a['name'] ?? '');
                    if (empty($name)) continue;

                    $jersey = (int)($a['jersey_number'] ?? 0);
                    if ($jersey <= 0 || in_array($jersey, $existingJerseys)) {
                        while (in_array($currentJersey, $existingJerseys)) {
                            $currentJersey++;
                        }
                        $jersey = $currentJersey;
                        $currentJersey++;
                    }

                    $pos = trim($a['position'] ?? 'Tekong');
                    $posFormatted = ucfirst(strtolower($pos));
                    if (strcasecmp($posFormatted, 'Killer') === 0 || strcasecmp($posFormatted, 'Spiker') === 0) {
                        $posFormatted = 'Smash';
                    }
                    if (strcasecmp($posFormatted, 'Toss') === 0 || strcasecmp($posFormatted, 'Pengumpan') === 0) {
                        $posFormatted = 'Feeder';
                    }
                    if (!in_array($posFormatted, ['Tekong', 'Feeder', 'Smash', 'Cadangan'])) {
                        $posFormatted = 'Tekong';
                    }

                    Athlete::create([
                        'team_id' => $team->id,
                        'name' => $name,
                        'jersey_number' => $jersey,
                        'position' => $posFormatted,
                    ]);

                    $existingJerseys[] = $jersey;
                    $totalAthletesCount++;
                }

                $updatedTeamsCount++;
                $teamNamesUpdated[] = $team->name;
            }
        });

        $teamsListStr = count($teamNamesUpdated) <= 3
            ? implode(', ', $teamNamesUpdated)
            : implode(', ', array_slice($teamNamesUpdated, 0, 3)) . " dan " . (count($teamNamesUpdated) - 3) . " tim lainnya";

        $actionMsg = $replaceExisting ? "seluruh anggotanya berhasil diganti dengan" : "berhasil ditambahkan";

        return redirect()->route('teams.index')->with(
            'success',
            "Berhasil! {$updatedTeamsCount} tim ({$teamsListStr}) {$actionMsg} total {$totalAthletesCount} atlet baru dari file Excel."
        );
    }
}

