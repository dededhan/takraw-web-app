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
        $query = Team::with(['coach', 'athletes', 'tournaments'])
            ->withCount('athletes');

        // If coach, only show their teams
        if ($request->user()->isCoach()) {
            $query->where('coach_id', $request->user()->id);
        }

        $superTeamsQuery = \App\Models\SuperTeam::with(['members.athletes', 'tournament']);
        if ($request->user()->isCoach()) {
            $superTeamsQuery->where('coach_id', $request->user()->id);
        }

        $allCoachTeams = $request->user()->isCoach()
            ? Team::where('coach_id', $request->user()->id)->get(['id', 'name', 'region'])
            : Team::get(['id', 'name', 'region']);

        return Inertia::render('Team/Index', [
            'teams' => $query->latest()->paginate(12),
            'superTeams' => $superTeamsQuery->latest()->get(),
            'allCoachTeams' => $allCoachTeams,
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
            'athletes.*.jersey_number' => 'required|integer|min:1',
            'athletes.*.position' => 'nullable|string|max:50',
        ]);

        // Auto-assign coach if user is a coach
        if ($request->user()->isCoach() && !isset($validated['coach_id'])) {
            $validated['coach_id'] = $request->user()->id;
        }

        $team = Team::create([
            'name' => $validated['name'],
            'region' => $validated['region'],
            'coach_id' => $validated['coach_id'] ?? null,
        ]);

        foreach ($validated['athletes'] as $athleteData) {
            Athlete::create([
                'team_id' => $team->id,
                ...$athleteData,
            ]);
        }

        // Register team to tournament if specified
        if (!empty($validated['tournament_id'])) {
            $tournament = Tournament::findOrFail($validated['tournament_id']);
            $tournament->teams()->attach($team->id);
        }

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
        if ($team->isRosterLocked()) {
            return back()->with('error', 'Roster tim ini terkunci karena pernah/sedang mengikuti turnamen. Riwayat tim tidak dapat diubah.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'region' => 'required|string|max:100',
            'coach_id' => 'nullable|exists:users,id',
            'athletes' => 'sometimes|array',
            'athletes.*.id' => 'nullable|exists:athletes,id',
            'athletes.*.name' => 'required|string|max:100',
            'athletes.*.jersey_number' => 'required|integer|min:1',
            'athletes.*.position' => 'nullable|string|max:50',
        ]);

        $team->update([
            'name' => $validated['name'],
            'region' => $validated['region'],
            'coach_id' => $validated['coach_id'] ?? $team->coach_id,
        ]);

        // Sync athletes if provided
        if (isset($validated['athletes'])) {
            $existingIds = [];
            foreach ($validated['athletes'] as $athleteData) {
                if (!empty($athleteData['id'])) {
                    $athlete = Athlete::findOrFail($athleteData['id']);
                    $athlete->update($athleteData);
                    $existingIds[] = $athlete->id;
                } else {
                    $athlete = Athlete::create([
                        'team_id' => $team->id,
                        ...$athleteData,
                    ]);
                    $existingIds[] = $athlete->id;
                }
            }

            // Remove athletes not in the updated list
            $team->athletes()->whereNotIn('id', $existingIds)->delete();
        }

        return redirect()->route('teams.show', $team)
            ->with('success', 'Tim berhasil diupdate!');
    }

    public function destroy(Team $team)
    {
        if ($team->isRosterLocked()) {
            return back()->with('error', 'Tim ini tidak dapat dihapus karena memiliki riwayat keikutsertaan turnamen.');
        }

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
        if ($team->isRosterLocked()) {
            return back()->with('error', 'Roster tim ini terkunci karena pernah/sedang mengikuti turnamen. Import atlet tidak diizinkan.');
        }

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

            $validPositions = ['Tekong', 'Feeder', 'Killer', 'Cadangan'];
            $posFormatted = ucfirst(strtolower($position));
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
