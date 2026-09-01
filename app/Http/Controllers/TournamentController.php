<?php

namespace App\Http\Controllers;

use App\Models\Tournament;
use App\Models\Team;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TournamentController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Tournament/Index', [
            'tournaments' => Tournament::with('creator')
                ->withCount('teams')
                ->latest()
                ->paginate(10),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Tournament/Create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'              => 'required|string|max:150',
            'start_date'        => 'required|date',
            'end_date'          => 'required|date|after_or_equal:start_date',
            'modes'             => 'required|array|min:1',
            'modes.*'           => 'in:regu,double,quadrant,team_regu,team_double',
            'registration_code' => 'nullable|string|max:100',
        ]);

        $tournament = Tournament::create([
            'name'              => $validated['name'],
            'start_date'        => $validated['start_date'],
            'end_date'          => $validated['end_date'],
            'mode'              => in_array($validated['modes'][0], ['regu', 'double', 'quarter']) ? $validated['modes'][0] : 'regu',
            'status'            => 'draft', // Default selalu draft saat pembuatan
            'registration_code' => !empty($validated['registration_code']) ? trim($validated['registration_code']) : null,
            'created_by'        => $request->user()->id,
        ]);

        // Simpan semua mode yang dipilih ke tabel tournament_modes
        foreach ($validated['modes'] as $modeKey) {
            $tournament->modes()->create([
                'match_mode' => $modeKey,
                'pool_count' => 2,
                'is_active'  => true,
            ]);
        }

        return redirect()->route('tournaments.show', $tournament)
            ->with('success', 'Turnamen berhasil dibuat dengan ' . count($validated['modes']) . ' mode tanding! Silakan kelola Master Schedule.');
    }

    public function show(Tournament $tournament): Response
    {
        $tournament->load([
            'creator',
            'modes',
            'teams.coach',
            'teams.athletes',
            'superTeams.coach',
            'superTeams.creator',
            'superTeams.members.coach',
            'superTeams.members.athletes',
            'pools.teams',
            'pools.superTeams.members',
            'pools.standings' => fn($q) => $q->with('team')->orderBy('rank'),
            'matches' => fn($q) => $q->with(['homeTeam', 'awayTeam', 'homeSuperTeam', 'awaySuperTeam', 'referee', 'sets'])->orderBy('scheduled_at'),
        ]);

        // Get all teams in the system that are NOT registered in this tournament
        $registeredTeamIds = $tournament->teams->pluck('id');
        $availableTeams = Team::where('is_super_sub', false)
            ->whereNotIn('id', $registeredTeamIds)
            ->orderBy('name')
            ->get();

        return Inertia::render('Tournament/Show', [
            'tournament' => $tournament,
            'availableTeams' => $availableTeams,
        ]);
    }

    public function edit(Tournament $tournament): Response
    {
        $tournament->load('modes');

        return Inertia::render('Tournament/Edit', [
            'tournament' => $tournament,
        ]);
    }

    public function update(Request $request, Tournament $tournament)
    {
        $validated = $request->validate([
            'name'              => 'required|string|max:150',
            'start_date'        => 'required|date',
            'end_date'          => 'required|date|after_or_equal:start_date',
            'modes'             => 'required|array|min:1',
            'modes.*'           => 'in:regu,double,quadrant,team_regu,team_double',
            'status'            => 'sometimes|in:draft,registration,pool_stage,bracket_stage,completed',
            'registration_code' => 'nullable|string|max:100',
        ]);

        $tournament->update([
            'name'              => $validated['name'],
            'start_date'        => $validated['start_date'],
            'end_date'          => $validated['end_date'],
            'mode'              => in_array($validated['modes'][0], ['regu', 'double', 'quarter']) ? $validated['modes'][0] : 'regu',
            'status'            => $validated['status'] ?? $tournament->status,
            'registration_code' => !empty($validated['registration_code']) ? trim($validated['registration_code']) : null,
        ]);

        // Re-sync tournament_modes
        $tournament->modes()->delete();
        foreach ($validated['modes'] as $modeKey) {
            $tournament->modes()->create([
                'match_mode' => $modeKey,
                'pool_count' => 2,
                'is_active'  => true,
            ]);
        }

        return redirect()->route('tournaments.show', $tournament)
            ->with('success', 'Turnamen berhasil diupdate!');
    }

    public function destroy(Tournament $tournament)
    {
        $tournament->delete();

        return redirect()->route('tournaments.index')
            ->with('success', 'Turnamen berhasil dihapus!');
    }

    /**
     * Add multiple teams (or a single team) to the tournament (Admin only).
     */
    public function addTeam(Request $request, Tournament $tournament)
    {
        $request->validate([
            'team_id'    => 'nullable|exists:teams,id',
            'team_ids'   => 'nullable|array',
            'team_ids.*' => 'exists:teams,id',
            'match_mode' => 'nullable|in:regu,double,quadrant',
        ]);

        // Allow adding if tournament is in draft or registration status
        if (!in_array($tournament->status, ['draft', 'registration'])) {
            return back()->with('error', 'Tidak dapat menambahkan tim karena turnamen tidak dalam fase pendaftaran.');
        }

        $teamIds = $request->input('team_ids', []);
        if ($request->filled('team_id')) {
            $teamIds[] = $request->input('team_id');
        }
        $teamIds = array_values(array_unique(array_filter($teamIds)));

        if (empty($teamIds)) {
            return back()->with('error', 'Pilih setidaknya satu tim untuk ditambahkan.');
        }

        // Tentukan mode: jika match_mode diberikan, gunakan itu; jika tidak, ambil mode reguler aktif pertama
        $mode = $request->input('match_mode');
        if (!$mode) {
            $firstMode = $tournament->modes()
                ->whereIn('match_mode', ['regu', 'double', 'quadrant'])
                ->where('is_active', true)
                ->value('match_mode');
            $mode = $firstMode ?? 'regu';
        }

        $addedCount = 0;
        foreach ($teamIds as $tId) {
            $exists = \Illuminate\Support\Facades\DB::table('tournament_teams')
                ->where('tournament_id', $tournament->id)
                ->where('team_id', $tId)
                ->where('match_mode', $mode)
                ->exists();

            if (!$exists) {
                $tournament->teams()->attach($tId, ['match_mode' => $mode]);
                $addedCount++;
            }
        }

        if ($addedCount === 0) {
            return back()->with('error', 'Semua tim yang dipilih sudah terdaftar pada mode tersebut di turnamen ini.');
        }

        $modeLabel = ucfirst($mode);
        return back()->with('success', "{$addedCount} tim berhasil ditambahkan ke turnamen (Mode: {$modeLabel})!");
    }

    /**
     * Remove a team from the tournament (Admin only).
     */
    public function removeTeam(Request $request, Tournament $tournament, Team $team)
    {
        // Allow removing if tournament is in draft or registration status
        if (!in_array($tournament->status, ['draft', 'registration'])) {
            return back()->with('error', 'Tidak dapat menghapus tim karena turnamen tidak dalam fase pendaftaran.');
        }

        // Check if team is assigned to any pool in this tournament
        $isAssignedToPool = \App\Models\Pool::where('tournament_id', $tournament->id)
            ->whereHas('teams', fn($q) => $q->where('team_id', $team->id))
            ->exists();

        if ($isAssignedToPool) {
            return back()->with('error', 'Tidak dapat menghapus tim karena tim sudah dimasukkan ke dalam Pool. Hapus tim dari Pool terlebih dahulu.');
        }

        $tournament->teams()->detach($team->id);

        return back()->with('success', 'Tim berhasil dihapus dari turnamen!');
    }
}
