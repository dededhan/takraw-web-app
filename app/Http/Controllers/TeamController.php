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
        $query = Team::with(['coach', 'athletes'])
            ->withCount('athletes');

        // If coach, only show their teams
        if ($request->user()->isCoach()) {
            $query->where('coach_id', $request->user()->id);
        }

        return Inertia::render('Team/Index', [
            'teams' => $query->latest()->paginate(10),
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
        $team->delete();

        return redirect()->route('teams.index')
            ->with('success', 'Tim berhasil dihapus!');
    }

    /**
     * Download the CSV template for athletes.
     */
    public function downloadTemplate()
    {
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="template_atlet.csv"',
        ];
        
        $callback = function () {
            $file = fopen('php://output', 'w');
            // CSV header
            fputcsv($file, ['nama', 'nomor_punggung', 'posisi']);
            // CSV samples
            fputcsv($file, ['Budi Santoso', '10', 'Tekong']);
            fputcsv($file, ['Andi Wijaya', '7', 'Feeder']);
            fputcsv($file, ['Candra Saputra', '3', 'Killer']);
            fputcsv($file, ['Dedi Hermawan', '12', 'Cadangan']);
            fclose($file);
        };
        
        return response()->stream($callback, 200, $headers);
    }

    /**
     * Import athletes from a CSV file.
     */
    public function importAthletes(Request $request, Team $team)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:2048',
        ]);

        $file = $request->file('file');
        $path = $file->getRealPath();
        
        $handle = fopen($path, 'r');
        if ($handle === false) {
            return back()->with('error', 'Gagal membuka file.');
        }

        // Read header
        $header = fgetcsv($handle);
        
        if (!$header || count($header) < 2) {
            fclose($handle);
            return back()->with('error', 'Format file CSV tidak valid. Harus memiliki setidaknya kolom nama dan nomor_punggung.');
        }

        $importedCount = 0;
        $errors = [];
        $rowNum = 1;

        // Read existing jersey numbers to avoid duplicate entries
        $existingJerseys = $team->athletes()->pluck('jersey_number')->toArray();

        while (($row = fgetcsv($handle)) !== null) {
            $rowNum++;
            if (count($row) < 2) {
                $errors[] = "Baris {$rowNum}: Kolom nama atau nomor punggung tidak lengkap.";
                continue;
            }

            $name = trim($row[0]);
            $jerseyNumber = (int) trim($row[1]);
            $position = isset($row[2]) ? trim($row[2]) : null;

            // Validate fields
            if (empty($name)) {
                $errors[] = "Baris {$rowNum}: Nama atlet tidak boleh kosong.";
                continue;
            }

            if ($jerseyNumber <= 0) {
                $errors[] = "Baris {$rowNum}: Nomor punggung harus angka positif.";
                continue;
            }

            // Check duplicate jersey number
            if (in_array($jerseyNumber, $existingJerseys)) {
                $errors[] = "Baris {$rowNum}: Nomor punggung {$jerseyNumber} sudah digunakan di tim ini.";
                continue;
            }

            // Check position is valid
            $validPositions = ['Tekong', 'Feeder', 'Killer', 'Cadangan'];
            if (!empty($position)) {
                $position = ucfirst(strtolower($position));
                if (!in_array($position, $validPositions)) {
                    $position = 'Cadangan'; // default fallback or null
                }
            } else {
                $position = null;
            }

            // Create athlete
            Athlete::create([
                'team_id' => $team->id,
                'name' => $name,
                'jersey_number' => $jerseyNumber,
                'position' => $position,
            ]);

            $existingJerseys[] = $jerseyNumber;
            $importedCount++;
        }

        fclose($handle);

        if ($importedCount === 0) {
            $errorMessage = 'Tidak ada atlet yang diimpor. ' . implode(' ', $errors);
            return back()->with('error', $errorMessage);
        }

        $successMessage = "Berhasil mengimpor {$importedCount} atlet.";
        if (count($errors) > 0) {
            // Concatenate errors for summary but keep it short
            $errorSummary = count($errors) . " baris bermasalah dilewati.";
            return back()->with('success', $successMessage . " " . $errorSummary);
        }

        return back()->with('success', $successMessage);
    }
}
