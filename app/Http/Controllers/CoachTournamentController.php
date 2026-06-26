<?php

namespace App\Http\Controllers;

use App\Models\Tournament;
use App\Models\Team;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CoachTournamentController extends Controller
{
    /**
     * Display a listing of available tournaments.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        // Get all tournaments in registration phase
        $tournaments = Tournament::where('status', 'registration')
            ->with(['teams' => function ($q) use ($user) {
                // Only load the teams belonging to this coach
                $q->where('coach_id', $user->id);
            }])
            ->latest()
            ->get();

        // Get all teams coached by this coach, with their athletes
        $myTeams = Team::where('coach_id', $user->id)
            ->with('athletes')
            ->get();

        return Inertia::render('Coach/TournamentAvailable', [
            'tournaments' => $tournaments,
            'myTeams' => $myTeams,
        ]);
    }

    /**
     * Register a team to a tournament.
     */
    public function register(Request $request, Tournament $tournament)
    {
        $request->validate([
            'team_id' => 'required|exists:teams,id',
        ]);

        $teamId = $request->input('team_id');
        $team = Team::findOrFail($teamId);

        // Check if the team is coached by this user
        if ($team->coach_id !== $request->user()->id) {
            return back()->with('error', 'Anda tidak memiliki wewenang untuk mendaftarkan tim ini.');
        }

        // Check if tournament is in registration phase
        if ($tournament->status !== 'registration') {
            return back()->with('error', 'Pendaftaran untuk turnamen ini sudah ditutup.');
        }

        // Check if already registered
        if ($tournament->teams()->where('team_id', $teamId)->exists()) {
            return back()->with('error', 'Tim ini sudah terdaftar dalam turnamen.');
        }

        $tournament->teams()->attach($teamId);

        return back()->with('success', 'Tim berhasil didaftarkan ke turnamen.');
    }

    /**
     * Unregister a team from a tournament.
     */
    public function unregister(Request $request, Tournament $tournament, Team $team)
    {
        // Check if the team is coached by this user
        if ($team->coach_id !== $request->user()->id) {
            return back()->with('error', 'Anda tidak memiliki wewenang untuk membatalkan pendaftaran tim ini.');
        }

        // Check if tournament is in registration phase
        if ($tournament->status !== 'registration') {
            return back()->with('error', 'Tidak dapat membatalkan pendaftaran karena pendaftaran turnamen sudah ditutup.');
        }

        $tournament->teams()->detach($team->id);

        return back()->with('success', 'Pendaftaran tim berhasil dibatalkan.');
    }
}
