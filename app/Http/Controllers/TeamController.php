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
        $query = Team::where('is_super_sub', false)
            ->with(['coach', 'athletes', 'tournaments'])
            ->withCount('athletes');

        // If coach, only show their teams
        if ($request->user()->isCoach()) {
            $query->where('coach_id', $request->user()->id);
        }

        $superTeamsQuery = \App\Models\SuperTeam::with(['members.athletes', 'tournaments', 'tournament', 'coach']);
        if ($request->user()->isCoach()) {
            $superTeamsQuery->where('coach_id', $request->user()->id);
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
            'teams' => $query->latest()->paginate(12),
            'superTeams' => $superTeamsQuery->latest()->get(),
            'allCoachTeams' => $allCoachTeams,
            'coaches' => $coaches,
            'tournaments' => $tournaments,
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
        if ($request->user()->isCoach() && !isset($validated['coach_id'])) {
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
                    'position' => $athleteData['position'] ?? null,
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

    public function edit(Team $team): Response
    {
        $team->load('athletes');

        return Inertia::render('Team/Edit', [
            'team' => $team,
            'coaches' => User::where('role', 'coach')->where('is_active', true)->get(['id', 'name']),
        ]);
    }

    public function update(Request $request, Team $team)
    {
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
                                'position' => $athleteData['position'] ?? null,
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
                        'position' => $athleteData['position'] ?? null,
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
     * Download a clean CSV athlete template (header + sample rows only).
     */
    public function downloadCsvTemplate(\App\Services\AthleteExcelService $excelService)
    {
        $fileContent = $excelService->generateCsvTemplate();

        return response($fileContent, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="template_import_atlet.csv"',
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
            $position = trim($row['position'] ?? 'Cadangan');

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
                $posFormatted = 'Cadangan';
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
}
