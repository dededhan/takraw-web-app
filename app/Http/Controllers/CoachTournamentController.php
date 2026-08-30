<?php

namespace App\Http\Controllers;

use App\Models\Tournament;
use App\Models\Team;
use App\Models\SuperTeam;
use App\Models\Match_;
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
            ->with([
                'modes',
                'teams' => function ($q) use ($user) {
                    $q->where('coach_id', $user->id);
                },
                'superTeams' => function ($q) use ($user) {
                    $q->where('coach_id', $user->id)->with('members.athletes');
                }
            ])
            ->latest()
            ->get();

        // Sembunyikan plaintext registration_code agar tidak bisa diinspeksi di browser coach
        $tournaments->makeHidden(['registration_code']);

        // Get all teams coached by this coach, with their athletes
        $myTeams = Team::where('coach_id', $user->id)
            ->with(['athletes', 'tournaments'])
            ->get();

        // Get all super teams coached by this coach
        $mySuperTeams = SuperTeam::where('coach_id', $user->id)
            ->with(['members.athletes', 'tournament'])
            ->get();

        return Inertia::render('Coach/TournamentAvailable', [
            'tournaments' => $tournaments,
            'myTeams' => $myTeams,
            'mySuperTeams' => $mySuperTeams,
        ]);
    }

    /**
     * Display tournament history for coach.
     */
    public function history(Request $request): Response
    {
        $user = $request->user();
        $teamIds = Team::where('coach_id', $user->id)->pluck('id');
        $superTeamIds = SuperTeam::where('coach_id', $user->id)->pluck('id');

        $tournamentIds = \DB::table('tournament_teams')
            ->whereIn('team_id', $teamIds)
            ->pluck('tournament_id')
            ->merge(
                SuperTeam::where('coach_id', $user->id)
                    ->whereNotNull('tournament_id')
                    ->pluck('tournament_id')
            )
            ->unique();

        $tournaments = Tournament::whereIn('id', $tournamentIds)
            ->with([
                'modes',
                'teams' => function ($q) use ($user) {
                    $q->where('coach_id', $user->id)->with('athletes');
                },
                'superTeams' => function ($q) use ($user) {
                    $q->where('coach_id', $user->id)->with('members.athletes');
                },
                'matches' => function ($q) use ($teamIds, $superTeamIds) {
                    $q->with(['homeTeam', 'awayTeam', 'homeSuperTeam', 'awaySuperTeam', 'sets', 'court'])
                      ->where(function ($sub) use ($teamIds, $superTeamIds) {
                          $sub->whereIn('home_team_id', $teamIds)
                              ->orWhereIn('away_team_id', $teamIds)
                              ->orWhereIn('home_super_team_id', $superTeamIds)
                              ->orWhereIn('away_super_team_id', $superTeamIds);
                      })
                      ->orderBy('scheduled_at', 'desc');
                }
            ])
            ->latest('start_date')
            ->get();

        return Inertia::render('Coach/TournamentHistory', [
            'tournaments' => $tournaments,
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

        // Validasi Kunci Pertandingan jika turnamen diproteksi
        if ($tournament->hasRegistrationCode()) {
            $request->validate([
                'registration_code' => 'required|string',
            ], [
                'registration_code.required' => 'Kunci pendaftaran wajib diisi untuk turnamen ini.',
            ]);

            if (!$tournament->validateRegistrationCode($request->input('registration_code'))) {
                return back()->withErrors([
                    'registration_code' => 'Kunci pendaftaran salah atau tidak valid.',
                ])->with('error', 'Kunci pendaftaran salah atau tidak valid.');
            }
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

    /**
     * Register a Super Team to a tournament.
     */
    public function registerSuperTeam(Request $request, Tournament $tournament)
    {
        $request->validate([
            'super_team_id' => 'required|exists:super_teams,id',
        ]);

        $superTeam = SuperTeam::with('members')->findOrFail($request->input('super_team_id'));

        if ($superTeam->coach_id !== $request->user()->id) {
            return back()->with('error', 'Anda tidak memiliki wewenang untuk Super Team ini.');
        }

        if ($tournament->status !== 'registration') {
            return back()->with('error', 'Pendaftaran untuk turnamen ini sudah ditutup.');
        }

        if ($superTeam->members->count() !== 3) {
            return back()->with('error', 'Super Team harus memiliki tepat 3 Sub-Tim sebelum didaftarkan ke turnamen.');
        }

        // Validasi Kunci Pertandingan jika turnamen diproteksi
        if ($tournament->hasRegistrationCode()) {
            $request->validate([
                'registration_code' => 'required|string',
            ], [
                'registration_code.required' => 'Kunci pendaftaran wajib diisi untuk turnamen ini.',
            ]);

            if (!$tournament->validateRegistrationCode($request->input('registration_code'))) {
                return back()->withErrors([
                    'registration_code' => 'Kunci pendaftaran salah atau tidak valid.',
                ])->with('error', 'Kunci pendaftaran salah atau tidak valid.');
            }
        }

        // Assign tournament to super team
        $superTeam->update([
            'tournament_id' => $tournament->id,
        ]);

        return back()->with('success', "Super Team \"{$superTeam->name}\" berhasil didaftarkan ke turnamen!");
    }

    /**
     * Unregister a Super Team from a tournament.
     */
    public function unregisterSuperTeam(Request $request, Tournament $tournament, SuperTeam $superTeam)
    {
        if ($superTeam->coach_id !== $request->user()->id) {
            return back()->with('error', 'Anda tidak memiliki wewenang untuk Super Team ini.');
        }

        if ($tournament->status !== 'registration') {
            return back()->with('error', 'Tidak dapat membatalkan karena turnamen sudah berjalan.');
        }

        $superTeam->update([
            'tournament_id' => null,
            'pool_id' => null,
        ]);

        return back()->with('success', "Pendaftaran Super Team \"{$superTeam->name}\" berhasil dibatalkan.");
    }

    /**
     * Coach creates a new Super Team (Team Regu or Team Double).
     */
    public function storeSuperTeam(Request $request)
    {
        $validated = $request->validate([
            'name'       => 'required|string|max:100',
            'match_mode' => 'required|in:team_regu,team_double',
            'team_ids'   => 'required|array|size:3',
            'team_ids.*' => 'required|exists:teams,id',
        ], [
            'team_ids.size' => 'Super Team harus terdiri dari tepat 3 Sub-Tim.',
        ]);

        // Verifikasi semua tim milik coach ini
        $coachTeamsCount = Team::where('coach_id', $request->user()->id)
            ->whereIn('id', $validated['team_ids'])
            ->count();

        if ($coachTeamsCount !== 3) {
            return back()->with('error', 'Ketiga sub-tim harus merupakan tim binaan Anda.');
        }

        // Cek apakah ada duplikasi tim dalam 3 pilihan
        if (count(array_unique($validated['team_ids'])) !== 3) {
            return back()->with('error', 'Ketiga sub-tim harus berbeda (tidak boleh sama).');
        }

        $superTeam = SuperTeam::create([
            'name'       => $validated['name'],
            'match_mode' => $validated['match_mode'],
            'coach_id'   => $request->user()->id,
            'created_by' => $request->user()->id,
        ]);

        $superTeam->members()->attach($validated['team_ids']);

        return back()->with('success', "Super Team \"{$superTeam->name}\" berhasil dibuat dengan 3 Sub-Tim!");
    }

    /**
     * Coach deletes a Super Team.
     */
    public function destroySuperTeam(Request $request, SuperTeam $superTeam)
    {
        if ($superTeam->coach_id !== $request->user()->id) {
            return back()->with('error', 'Anda tidak memiliki wewenang untuk menghapus Super Team ini.');
        }

        if ($superTeam->isRosterLocked()) {
            return back()->with('error', 'Super Team ini terkunci karena pernah/sedang mengikuti turnamen dan tidak dapat dihapus.');
        }

        $superTeam->members()->detach();
        $superTeam->delete();

        return back()->with('success', "Super Team \"{$superTeam->name}\" berhasil dihapus.");
    }
}
