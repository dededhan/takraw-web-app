<?php

namespace App\Http\Controllers;

use App\Models\SuperTeam;
use App\Models\Team;
use App\Models\Tournament;
use Illuminate\Http\Request;
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
            ->with(['members.athletes', 'creator'])
            ->withCount('members')
            ->get()
            ->groupBy('match_mode');

        // Tim yang bisa ditambahkan sebagai anggota (sudah terdaftar di turnamen)
        $availableTeams = $tournament->teams()->with('athletes')->get();

        // Tim yang sudah menjadi anggota super team mana pun
        $usedTeamIds = \App\Models\SuperTeam::where('tournament_id', $tournament->id)
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
     * Buat Super Team baru.
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
     * Hapus Super Team.
     */
    public function destroy(SuperTeam $superTeam)
    {
        // Cek apakah sudah ada match yang menggunakan super team ini
        $hasMatches = \App\Models\Match_::where('home_super_team_id', $superTeam->id)
            ->orWhere('away_super_team_id', $superTeam->id)
            ->where('status', '!=', 'scheduled')
            ->exists();

        if ($hasMatches) {
            return back()->with('error', 'Super Team tidak bisa dihapus karena sudah ada pertandingan yang berjalan.');
        }

        $superTeam->delete();

        return back()->with('success', 'Super Team berhasil dihapus.');
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
