<?php

namespace App\Http\Controllers;

use App\Models\Tournament;
use App\Models\Team;
use App\Models\SuperTeam;
use App\Models\Match_;
use App\Models\Athlete;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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

        // Get all tournaments in registration phase or currently ongoing
        $tournaments = Tournament::whereIn('status', ['registration', 'pool_stage', 'bracket_stage'])
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
            'match_mode' => 'required|in:regu,double,quadrant',
        ]);

        $teamId = $request->input('team_id');
        $matchMode = $request->input('match_mode');
        $team = Team::findOrFail($teamId);

        // Check if the team is coached by this user
        if ($team->coach_id !== $request->user()->id) {
            return back()->with('error', 'Anda tidak memiliki wewenang untuk mendaftarkan tim ini.');
        }

        // Check if tournament is in registration phase
        if ($tournament->status !== 'registration') {
            return back()->with('error', 'Pendaftaran untuk turnamen ini sudah ditutup.');
        }

        // Check if the requested mode is configured/active for this tournament
        if (!$tournament->hasActiveMode($matchMode)) {
            return back()->with('error', 'Mode pertandingan ini tidak tersedia untuk turnamen ini.');
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

        // Check if already registered to this specific mode
        if (\DB::table('tournament_teams')
            ->where('tournament_id', $tournament->id)
            ->where('team_id', $teamId)
            ->where('match_mode', $matchMode)
            ->exists()) {
            return back()->with('error', 'Tim ini sudah terdaftar pada mode tersebut di turnamen ini.');
        }

        $tournament->teams()->attach($teamId, ['match_mode' => $matchMode]);

        return back()->with('success', 'Tim berhasil didaftarkan ke turnamen.');
    }

    /**
     * Unregister a team from a tournament.
     */
    public function unregister(Request $request, Tournament $tournament, Team $team)
    {
        $request->validate([
            'match_mode' => 'required|in:regu,double,quadrant',
        ]);

        // Check if the team is coached by this user
        if ($team->coach_id !== $request->user()->id) {
            return back()->with('error', 'Anda tidak memiliki wewenang untuk membatalkan pendaftaran tim ini.');
        }

        // Check if tournament is in registration phase
        if ($tournament->status !== 'registration') {
            return back()->with('error', 'Tidak dapat membatalkan pendaftaran karena pendaftaran turnamen sudah ditutup.');
        }

        \DB::table('tournament_teams')
            ->where('tournament_id', $tournament->id)
            ->where('team_id', $team->id)
            ->where('match_mode', $request->input('match_mode'))
            ->delete();

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
     * Setiap Sub-Tim dibuat independen (baris teams baru, is_super_sub=true)
     * lengkap dengan daftar atletnya (input manual atau hasil parse CSV).
     */
    public function storeSuperTeam(Request $request)
    {
        $validated = $request->validate([
            'name'                        => 'required|string|max:100',
            'match_mode'                  => 'required|in:team_regu,team_double',
            'sub_teams'                   => 'required|array|size:3',
            'sub_teams.*.name'            => 'required|string|max:100',
            'sub_teams.*.region'          => 'required|string|max:100',
            'sub_teams.*.athletes'        => 'required|array|min:1',
            'sub_teams.*.athletes.*.name' => 'required|string|max:100',
            'sub_teams.*.athletes.*.jersey_number' => 'required|integer|min:1',
            'sub_teams.*.athletes.*.position'      => 'nullable|string|max:50',
            'sub_teams.*.athletes.*.photo'         => 'nullable|image|max:2048',
        ], [
            'sub_teams.size'                       => 'Super Team harus terdiri dari tepat 3 Sub-Tim.',
            'sub_teams.*.name.required'            => 'Nama setiap Sub-Tim wajib diisi.',
            'sub_teams.*.region.required'          => 'Daerah setiap Sub-Tim wajib diisi.',
            'sub_teams.*.athletes.min'             => 'Setiap Sub-Tim harus memiliki minimal 1 atlet.',
            'sub_teams.*.athletes.*.name.required' => 'Nama atlet wajib diisi.',
            'sub_teams.*.athletes.*.jersey_number.required' => 'Nomor punggung atlet wajib diisi.',
        ]);

        $coachId = $request->user()->id;

        $superTeam = DB::transaction(function () use ($validated, $request, $coachId) {
            $superTeam = SuperTeam::create([
                'name'       => $validated['name'],
                'match_mode' => $validated['match_mode'],
                'coach_id'   => $coachId,
                'created_by' => $coachId,
            ]);

            $subTeamIds = [];
            foreach ($validated['sub_teams'] as $subIdx => $subData) {
                $subTeam = Team::create([
                    'name'                 => $subData['name'],
                    'region'               => $subData['region'],
                    'coach_id'             => $coachId,
                    'is_super_sub'         => true,
                    'parent_super_team_id' => $superTeam->id,
                ]);

                foreach ($subData['athletes'] as $athleteIdx => $athleteData) {
                    $photoPath = $request->hasFile("sub_teams.{$subIdx}.athletes.{$athleteIdx}.photo")
                        ? $request->file("sub_teams.{$subIdx}.athletes.{$athleteIdx}.photo")->store('athletes', 'public')
                        : null;

                    Athlete::create([
                        'team_id'       => $subTeam->id,
                        'name'          => $athleteData['name'],
                        'jersey_number' => $athleteData['jersey_number'],
                        'position'      => $athleteData['position'] ?? null,
                        'photo'         => $photoPath,
                    ]);
                }

                $subTeamIds[] = $subTeam->id;
            }

            $superTeam->members()->attach($subTeamIds);

            return $superTeam;
        });

        return back()->with('success', "Super Team \"{$superTeam->name}\" berhasil dibuat dengan 3 Sub-Tim independen baru!");
    }

    /**
     * Coach deletes a Super Team.
     * Sub-tim anggota yang sebelumnya dibuat otomatis akan ikut terhapus.
     */
    public function destroySuperTeam(Request $request, SuperTeam $superTeam)
    {
        if ($superTeam->coach_id !== $request->user()->id) {
            return back()->with('error', 'Anda tidak memiliki wewenang untuk menghapus Super Team ini.');
        }

        if ($superTeam->isRosterLocked()) {
            return back()->with('error', 'Super Team ini terkunci karena pernah/sedang mengikuti turnamen dan tidak dapat dihapus.');
        }

        DB::transaction(function () use ($superTeam) {
            $subTeamIds = $superTeam->members()->pluck('teams.id')->all();
            $superTeam->members()->detach();
            $superTeam->delete();

            if (!empty($subTeamIds)) {
                Team::whereIn('id', $subTeamIds)
                    ->where('is_super_sub', true)
                    ->delete();
            }
        });

        return back()->with('success', "Super Team \"{$superTeam->name}\" dan 3 Sub-Tim anggotanya berhasil dihapus.");
    }
}
