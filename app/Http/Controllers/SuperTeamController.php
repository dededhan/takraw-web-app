<?php

namespace App\Http\Controllers;

use App\Models\Athlete;
use App\Models\SuperTeam;
use App\Models\Team;
use App\Models\Tournament;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class SuperTeamController extends Controller
{
    /**
     * List super teams untuk turnamen ini, dikelompokkan per mode.
     */
    public function index(Tournament $tournament): Response
    {
        $tournament->load(['modes']);

        $superTeams = SuperTeam::where('tournament_id', $tournament->id)
            ->with(['members.athletes', 'creator', 'coach'])
            ->withCount('members')
            ->get()
            ->groupBy('match_mode');

        // Tim yang bisa ditambahkan sebagai anggota (sudah terdaftar di turnamen)
        $availableTeams = $tournament->teams()->with('athletes')->get();

        // Tim yang sudah menjadi anggota super team mana pun
        $usedTeamIds = SuperTeam::where('tournament_id', $tournament->id)
            ->with('members')
            ->get()
            ->flatMap(fn($st) => $st->members->pluck('id'))
            ->unique()
            ->values();

        return Inertia::render('Tournament/SuperTeam/Index', [
            'tournament'      => $tournament,
            'superTeams'      => $superTeams,
            'availableTeams'  => $availableTeams,
            'usedTeamIds'     => $usedTeamIds,
        ]);
    }

    /**
     * Buat Super Team baru (1 kesatuan dengan roster atlet tunggal, otomatis dibuatkan 3 sub-tim).
     * Dapat dipanggil oleh Admin maupun Coach di halaman Manajemen Tim.
     */
    public function storeUnified(Request $request)
    {
        $validated = $request->validate([
            'name'                     => 'required|string|max:100',
            'region'                   => 'required|string|max:100',
            'match_mode'               => 'nullable|string|max:50',
            'tournament_id'            => 'nullable|exists:tournaments,id',
            'coach_id'                 => 'nullable|exists:users,id',
            'athletes'                 => 'required|array|min:1',
            'athletes.*.name'          => 'required|string|max:100',
            'athletes.*.jersey_number' => 'required|integer|min:1|max:999',
            'athletes.*.position'      => 'nullable|string|max:50',
            'athletes.*.photo'         => 'nullable|image|max:2048',
            'athletes.*.sub_regu'      => 'nullable|integer|min:1|max:3',
        ], [
            'name.required'                     => 'Nama Super Team wajib diisi.',
            'region.required'                   => 'Daerah / asal tim wajib diisi.',
            'athletes.required'                 => 'Daftar atlet wajib diisi.',
            'athletes.min'                      => 'Super Team harus memiliki minimal 1 atlet.',
            'athletes.*.name.required'          => 'Nama setiap atlet wajib diisi.',
            'athletes.*.jersey_number.required' => 'Nomor punggung setiap atlet wajib diisi.',
            'athletes.*.jersey_number.min'      => 'Nomor punggung minimal 1.',
            'athletes.*.jersey_number.max'      => 'Nomor punggung maksimal 999.',
        ]);

        // Cek duplikasi nomor punggung di seluruh Super Team (sebagai 1 kesatuan tim)
        $jerseys = array_map('intval', array_column($validated['athletes'], 'jersey_number'));
        if (count($jerseys) !== count(array_unique($jerseys))) {
            $duplicates = array_diff_assoc($jerseys, array_unique($jerseys));
            $dupStr = implode(', #', array_unique($duplicates));
            return back()->withErrors([
                'athletes' => "Nomor punggung atlet tidak boleh ada yang kembar dalam satu Super Team (duplikat: #{$dupStr}).",
            ])->with('error', "Nomor punggung atlet tidak boleh ada yang kembar (#{$dupStr}).");
        }

        // Tentukan coach_id: jika user coach, wajib id dirinya; jika admin, ambil dari input
        $coachId = $request->user()->isCoach() ? $request->user()->id : ($validated['coach_id'] ?? null);
        $matchMode = !empty($validated['match_mode']) ? $validated['match_mode'] : 'team_regu';
        $tournamentId = !empty($validated['tournament_id']) ? $validated['tournament_id'] : null;

        $superTeam = DB::transaction(function () use ($validated, $request, $coachId, $matchMode, $tournamentId) {
            $superTeam = SuperTeam::create([
                'tournament_id' => $tournamentId,
                'name'          => $validated['name'],
                'match_mode'    => $matchMode,
                'coach_id'      => $coachId,
                'created_by'    => $request->user()->id,
            ]);

            // Buat 3 Sub-Tim otomatis: [Nama]-1, [Nama]-2, [Nama]-3
            $subTeams = [];
            for ($i = 1; $i <= 3; $i++) {
                $subTeams[$i] = Team::create([
                    'name'                 => "{$validated['name']}-{$i}",
                    'region'               => $validated['region'],
                    'coach_id'             => $coachId,
                    'is_super_sub'         => true,
                    'parent_super_team_id' => $superTeam->id,
                ]);
            }

            $superTeam->members()->attach([$subTeams[1]->id, $subTeams[2]->id, $subTeams[3]->id]);

            // Distribusikan atlet ke 3 sub-tim
            $totalAthletes = count($validated['athletes']);
            $perRegu = (int) ceil($totalAthletes / 3);

            foreach ($validated['athletes'] as $index => $athleteData) {
                // Tentukan target sub-team (1, 2, atau 3)
                $targetRegu = !empty($athleteData['sub_regu'])
                    ? (int) $athleteData['sub_regu']
                    : min(3, intdiv($index, max(1, $perRegu)) + 1);

                if (!isset($subTeams[$targetRegu])) {
                    $targetRegu = 1;
                }

                $photoPath = $request->hasFile("athletes.{$index}.photo")
                    ? $request->file("athletes.{$index}.photo")->store('athletes', 'public')
                    : null;

                $validPositions = ['Tekong', 'Feeder', 'Smash', 'Killer', 'Cadangan'];
                $position = !empty($athleteData['position']) ? ucfirst(strtolower(trim($athleteData['position']))) : 'Cadangan';
                if ($position === 'Killer') {
                    $position = 'Smash';
                }
                if (!in_array($position, $validPositions)) {
                    $position = 'Cadangan';
                }

                Athlete::create([
                    'team_id'       => $subTeams[$targetRegu]->id,
                    'name'          => trim($athleteData['name']),
                    'jersey_number' => (int) $athleteData['jersey_number'],
                    'position'      => $position,
                    'photo'         => $photoPath,
                ]);
            }

            if (!empty($tournamentId)) {
                $superTeam->tournaments()->attach($tournamentId, [
                    'match_mode'    => $matchMode,
                    'registered_at' => now(),
                ]);
            }

            return $superTeam;
        });

        return back()->with('success', "Super Team \"{$superTeam->name}\" berhasil dibuat sebagai 1 kesatuan (3 Sub-Tim otomatis dibuat)!");
    }

    /**
     * Buat Super Team baru (legacy per-tournament).
     */
    public function store(Request $request, Tournament $tournament)
    {
        $validated = $request->validate([
            'name'       => 'required|string|max:100',
            'match_mode' => 'required|in:team_regu,team_double',
        ]);

        // Pastikan mode ini aktif dalam turnamen
        if (!$tournament->hasActiveMode($validated['match_mode'])) {
            return back()->with('error', "Mode {$validated['match_mode']} tidak aktif dalam turnamen ini.");
        }

        $superTeam = SuperTeam::create([
            'tournament_id' => $tournament->id,
            'name'          => $validated['name'],
            'match_mode'    => $validated['match_mode'],
            'created_by'    => $request->user()->id,
        ]);

        return back()->with('success', "Super Team \"{$superTeam->name}\" berhasil dibuat!");
    }

    /**
     * Update nama Super Team.
     */
    public function update(Request $request, SuperTeam $superTeam)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
        ]);

        $superTeam->update($validated);

        return back()->with('success', 'Nama Super Team berhasil diubah!');
    }

    /**
     * Update Super Team (1 kesatuan dengan roster atlet tunggal).
     */
    public function updateUnified(Request $request, SuperTeam $superTeam)
    {
        $user = $request->user();
        if (!$user->isAdmin() && $superTeam->coach_id !== $user->id && $superTeam->created_by !== $user->id) {
            return back()->with('error', 'Anda tidak memiliki wewenang untuk mengubah Super Team ini.');
        }

        $validated = $request->validate([
            'name'                     => 'required|string|max:100',
            'region'                   => 'required|string|max:100',
            'match_mode'               => 'nullable|string|max:50',
            'tournament_id'            => 'nullable|exists:tournaments,id',
            'coach_id'                 => 'nullable|exists:users,id',
            'athletes'                 => 'required|array|min:1',
            'athletes.*.id'            => 'nullable|exists:athletes,id',
            'athletes.*.name'          => 'required|string|max:100',
            'athletes.*.jersey_number' => 'required|integer|min:1|max:999',
            'athletes.*.position'      => 'nullable|string|max:50',
            'athletes.*.photo'         => 'nullable|image|max:2048',
            'athletes.*.sub_regu'      => 'nullable|integer|min:1|max:3',
        ], [
            'name.required'                     => 'Nama Super Team wajib diisi.',
            'region.required'                   => 'Daerah / asal tim wajib diisi.',
            'athletes.required'                 => 'Daftar atlet wajib diisi.',
            'athletes.min'                      => 'Super Team harus memiliki minimal 1 atlet.',
            'athletes.*.name.required'          => 'Nama setiap atlet wajib diisi.',
            'athletes.*.jersey_number.required' => 'Nomor punggung setiap atlet wajib diisi.',
            'athletes.*.jersey_number.min'      => 'Nomor punggung minimal 1.',
            'athletes.*.jersey_number.max'      => 'Nomor punggung maksimal 999.',
        ]);

        // Cek duplikasi nomor punggung
        $jerseys = array_map('intval', array_column($validated['athletes'], 'jersey_number'));
        if (count($jerseys) !== count(array_unique($jerseys))) {
            $duplicates = array_diff_assoc($jerseys, array_unique($jerseys));
            $dupStr = implode(', #', array_unique($duplicates));
            return back()->withErrors([
                'athletes' => "Nomor punggung atlet tidak boleh ada yang kembar dalam satu Super Team (duplikat: #{$dupStr}).",
            ])->with('error', "Nomor punggung atlet tidak boleh ada yang kembar (#{$dupStr}).");
        }

        $coachId = $user->isCoach() ? $user->id : ($validated['coach_id'] ?? $superTeam->coach_id);
        $tournamentId = !empty($validated['tournament_id']) ? $validated['tournament_id'] : null;

        DB::transaction(function () use ($validated, $request, $superTeam, $coachId, $tournamentId) {
            $superTeam->update([
                'name'          => $validated['name'],
                'coach_id'      => $coachId,
                'tournament_id' => $tournamentId,
            ]);

            // Ambil atau buat 3 sub-teams
            $subTeams = $superTeam->members()->orderBy('teams.id')->get();
            $subTeamMap = [];

            for ($i = 1; $i <= 3; $i++) {
                if (isset($subTeams[$i - 1])) {
                    $sub = $subTeams[$i - 1];
                    $sub->update([
                        'name'     => "{$validated['name']}-{$i}",
                        'region'   => $validated['region'],
                        'coach_id' => $coachId,
                    ]);
                    $subTeamMap[$i] = $sub;
                } else {
                    $sub = Team::create([
                        'name'                 => "{$validated['name']}-{$i}",
                        'region'               => $validated['region'],
                        'coach_id'             => $coachId,
                        'is_super_sub'         => true,
                        'parent_super_team_id' => $superTeam->id,
                    ]);
                    $superTeam->members()->attach($sub->id);
                    $subTeamMap[$i] = $sub;
                }
            }

            // Sync athletes
            $totalAthletes = count($validated['athletes']);
            $perRegu = (int) ceil($totalAthletes / 3);

            $submittedIds = array_values(array_filter(
                array_column($validated['athletes'], 'id'),
                fn($id) => !empty($id)
            ));

            // Hapus atlet yang tidak ada di form lagi dari seluruh 3 sub-tim
            foreach ($subTeamMap as $subTeam) {
                $subTeam->athletes()->whereNotIn('id', $submittedIds)->delete();
            }

            // Park jersey numbers temporarily to avoid unique constraints collision
            if (!empty($submittedIds)) {
                $existingAthletes = Athlete::whereIn('id', $submittedIds)->get();
                foreach ($existingAthletes as $existingAth) {
                    $existingAth->update([
                        'jersey_number' => 50000 + ($existingAth->id % 10000),
                    ]);
                }
            }

            $validPositions = ['Tekong', 'Feeder', 'Smash', 'Killer', 'Cadangan'];

            foreach ($validated['athletes'] as $index => $athleteData) {
                $targetRegu = !empty($athleteData['sub_regu'])
                    ? (int) $athleteData['sub_regu']
                    : min(3, intdiv($index, max(1, $perRegu)) + 1);

                if (!isset($subTeamMap[$targetRegu])) {
                    $targetRegu = 1;
                }

                $targetTeam = $subTeamMap[$targetRegu];

                $photoPath = $request->hasFile("athletes.{$index}.photo")
                    ? $request->file("athletes.{$index}.photo")->store('athletes', 'public')
                    : null;

                $position = !empty($athleteData['position']) ? ucfirst(strtolower(trim($athleteData['position']))) : 'Cadangan';
                if ($position === 'Killer') {
                    $position = 'Smash';
                }
                if (!in_array($position, $validPositions)) {
                    $position = 'Cadangan';
                }

                if (!empty($athleteData['id'])) {
                    $athlete = Athlete::find($athleteData['id']);
                    if ($athlete) {
                        $updateData = [
                            'team_id'       => $targetTeam->id,
                            'name'          => trim($athleteData['name']),
                            'jersey_number' => (int) $athleteData['jersey_number'],
                            'position'      => $position,
                        ];
                        if ($photoPath) {
                            $updateData['photo'] = $photoPath;
                        }
                        $athlete->update($updateData);
                        continue;
                    }
                }

                Athlete::create([
                    'team_id'       => $targetTeam->id,
                    'name'          => trim($athleteData['name']),
                    'jersey_number' => (int) $athleteData['jersey_number'],
                    'position'      => $position,
                    'photo'         => $photoPath,
                ]);
            }
        });

        return back()->with('success', "Super Team \"{$superTeam->name}\" berhasil diperbarui.");
    }

    /**
     * Hapus Super Team.
     */
    public function destroy(Request $request, SuperTeam $superTeam)
    {
        $user = $request->user();
        if (!$user->isAdmin() && $superTeam->coach_id !== $user->id && $superTeam->created_by !== $user->id) {
            return back()->with('error', 'Anda tidak memiliki wewenang untuk menghapus Super Team ini.');
        }

        DB::transaction(function () use ($superTeam) {
            $subTeamIds = $superTeam->members()->pluck('teams.id')->all();
            $superTeam->tournaments()->detach();
            $superTeam->members()->detach();
            $superTeam->delete();

            if (!empty($subTeamIds)) {
                Team::whereIn('id', $subTeamIds)
                    ->where('is_super_sub', true)
                    ->delete();
            }
        });

        return back()->with('success', "Super Team \"{$superTeam->name}\" berhasil dihapus.");
    }

    /**
     * Tambah tim regu sebagai anggota Super Team.
     * Setiap Super Team maksimal 3 tim anggota.
     */
    public function addMember(Request $request, SuperTeam $superTeam)
    {
        $validated = $request->validate([
            'team_id' => 'required|exists:teams,id',
        ]);

        // Cek batas 3 anggota
        if ($superTeam->members()->count() >= 3) {
            return back()->with('error', 'Super Team sudah memiliki 3 anggota (maksimal).');
        }

        $team = Team::findOrFail($validated['team_id']);

        // Cek tim sudah terdaftar di turnamen
        $isRegistered = $superTeam->tournament->teams()->where('team_id', $team->id)->exists();
        if (!$isRegistered) {
            return back()->with('error', 'Tim belum terdaftar dalam turnamen ini.');
        }

        // Cek tim belum menjadi anggota Super Team lain dalam turnamen ini
        $alreadyMember = SuperTeam::where('tournament_id', $superTeam->tournament_id)
            ->whereHas('members', fn($q) => $q->where('team_id', $team->id))
            ->exists();

        if ($alreadyMember) {
            return back()->with('error', "Tim \"{$team->name}\" sudah menjadi anggota Super Team lain dalam turnamen ini.");
        }

        $superTeam->members()->attach($team->id);

        return back()->with('success', "Tim \"{$team->name}\" berhasil ditambahkan ke Super Team \"{$superTeam->name}\"!");
    }

    /**
     * Hapus tim dari anggota Super Team.
     */
    public function removeMember(SuperTeam $superTeam, Team $team)
    {
        $superTeam->members()->detach($team->id);

        return back()->with('success', "Tim \"{$team->name}\" berhasil dihapus dari Super Team.");
    }
}
