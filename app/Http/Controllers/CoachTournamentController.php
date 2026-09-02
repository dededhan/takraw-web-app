<?php

namespace App\Http\Controllers;

use App\Models\Tournament;
use App\Models\Team;
use App\Models\SuperTeam;
use App\Models\Match_;
use App\Models\Athlete;
use App\Models\Pool;
use App\Models\PoolStanding;
use App\Services\AthletePerformanceService;
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
                    $q->where(function ($sq) use ($user) {
                        $sq->where('coach_id', $user->id)
                           ->orWhere('created_by', $user->id);
                    })->with('members.athletes');
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

        // Get all super teams coached or created by this coach
        $mySuperTeams = SuperTeam::where(function ($q) use ($user) {
                $q->where('coach_id', $user->id)
                  ->orWhere('created_by', $user->id);
            })
            ->with(['members.athletes', 'tournaments'])
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
    public function history(Request $request, AthletePerformanceService $performanceService): Response
    {
        $user = $request->user();
        $teamIds = Team::where('coach_id', $user->id)->pluck('id');
        $superTeamIds = SuperTeam::where('coach_id', $user->id)->pluck('id');

        $tournamentIds = \DB::table('tournament_teams')
            ->whereIn('team_id', $teamIds)
            ->pluck('tournament_id')
            ->merge(
                \DB::table('tournament_super_teams')
                    ->whereIn('super_team_id', $superTeamIds)
                    ->pluck('tournament_id')
            )
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

        $athleteAwards = $performanceService->getCoachAthleteAwards($user->id);

        return Inertia::render('Coach/TournamentHistory', [
            'tournaments'   => $tournaments,
            'athleteAwards' => $athleteAwards,
        ]);
    }

    /**
     * Register multiple teams (or a single team) to a tournament.
     */
    public function register(Request $request, Tournament $tournament)
    {
        $request->validate([
            'team_id'           => 'nullable|exists:teams,id',
            'team_ids'          => 'nullable|array',
            'team_ids.*'        => 'exists:teams,id',
            'match_mode'        => 'required|in:regu,double,quadrant',
            'registration_code' => 'nullable|string',
        ]);

        $matchMode = $request->input('match_mode');
        $user = $request->user();

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

        $teamIds = $request->input('team_ids', []);
        if ($request->filled('team_id')) {
            $teamIds[] = $request->input('team_id');
        }
        $teamIds = array_values(array_unique(array_filter($teamIds)));

        if (empty($teamIds)) {
            return back()->with('error', 'Pilih setidaknya satu tim untuk didaftarkan.');
        }

        $addedCount = 0;
        foreach ($teamIds as $tId) {
            $team = Team::find($tId);
            if (!$team || $team->coach_id !== $user->id) {
                continue;
            }

            // Check if already registered to this specific mode
            $exists = \DB::table('tournament_teams')
                ->where('tournament_id', $tournament->id)
                ->where('team_id', $tId)
                ->where('match_mode', $matchMode)
                ->exists();

            if (!$exists) {
                $tournament->teams()->attach($tId, ['match_mode' => $matchMode]);
                $addedCount++;
            }
        }

        if ($addedCount === 0) {
            return back()->with('error', 'Semua tim yang dipilih sudah terdaftar pada mode tersebut di turnamen ini.');
        }

        return back()->with('success', "{$addedCount} tim berhasil didaftarkan ke turnamen!");
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
     * Register one or more Super Teams to a tournament.
     */
    public function registerSuperTeam(Request $request, Tournament $tournament)
    {
        $request->validate([
            'super_team_id'     => 'nullable|exists:super_teams,id',
            'super_team_ids'    => 'nullable|array',
            'super_team_ids.*'  => 'exists:super_teams,id',
            'registration_code' => 'nullable|string',
        ]);

        $user = $request->user();

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

        $stIds = $request->input('super_team_ids', []);
        if ($request->filled('super_team_id')) {
            $stIds[] = $request->input('super_team_id');
        }
        $stIds = array_values(array_unique(array_filter($stIds)));

        if (empty($stIds)) {
            return back()->with('error', 'Pilih setidaknya satu Super Team untuk didaftarkan.');
        }

        $addedCount = 0;
        foreach ($stIds as $stId) {
            $superTeam = SuperTeam::with('members')->find($stId);
            if (!$superTeam || ($superTeam->coach_id !== $user->id && $superTeam->created_by !== $user->id)) {
                continue;
            }

            if ($superTeam->members->count() !== 3) {
                continue;
            }

            $exists = DB::table('tournament_super_teams')
                ->where('tournament_id', $tournament->id)
                ->where('super_team_id', $stId)
                ->exists();

            if (!$exists) {
                $tournament->superTeams()->attach($stId, [
                    'match_mode'    => $superTeam->match_mode ?? 'team_regu',
                    'registered_at' => now(),
                ]);

                if (!$superTeam->tournament_id) {
                    $superTeam->update(['tournament_id' => $tournament->id]);
                }
                $addedCount++;
            }
        }

        if ($addedCount === 0) {
            return back()->with('error', 'Semua Super Team yang dipilih sudah terdaftar di turnamen ini atau belum memiliki tepat 3 Sub-Tim.');
        }

        return back()->with('success', "{$addedCount} Super Team berhasil didaftarkan ke turnamen!");
    }

    /**
     * Unregister a Super Team from a tournament.
     */
    public function unregisterSuperTeam(Request $request, Tournament $tournament, SuperTeam $superTeam)
    {
        if ($superTeam->coach_id !== $request->user()->id && $superTeam->created_by !== $request->user()->id) {
            return back()->with('error', 'Anda tidak memiliki wewenang untuk Super Team ini.');
        }

        if ($tournament->status !== 'registration') {
            return back()->with('error', 'Tidak dapat membatalkan karena turnamen sudah berjalan.');
        }

        $tournament->superTeams()->detach($superTeam->id);

        // Hapus juga standing di turnamen ini jika ada
        $poolIds = Pool::where('tournament_id', $tournament->id)->pluck('id');
        if ($poolIds->isNotEmpty()) {
            PoolStanding::whereIn('pool_id', $poolIds)->where('super_team_id', $superTeam->id)->delete();
        }

        if ($superTeam->tournament_id === $tournament->id) {
            $nextTourn = $superTeam->tournaments()->first();
            $superTeam->update([
                'tournament_id' => $nextTourn ? $nextTourn->id : null,
                'pool_id'       => null,
            ]);
        }

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
            'sub_teams.*.athletes.*.jersey_number' => 'required|integer|min:1|max:999',
            'sub_teams.*.athletes.*.position'      => 'nullable|string|max:50',
            'sub_teams.*.athletes.*.photo'         => 'nullable|image|max:2048',
        ], [
            'sub_teams.size'                       => 'Super Team harus terdiri dari tepat 3 Sub-Tim.',
            'sub_teams.*.name.required'            => 'Nama setiap Sub-Tim wajib diisi.',
            'sub_teams.*.region.required'          => 'Daerah setiap Sub-Tim wajib diisi.',
            'sub_teams.*.athletes.min'             => 'Setiap Sub-Tim harus memiliki minimal 1 atlet.',
            'sub_teams.*.athletes.*.name.required' => 'Nama atlet wajib diisi.',
            'sub_teams.*.athletes.*.jersey_number.required' => 'Nomor punggung atlet wajib diisi.',
            'sub_teams.*.athletes.*.jersey_number.min'      => 'Nomor punggung minimal 1.',
            'sub_teams.*.athletes.*.jersey_number.max'      => 'Nomor punggung maksimal 999.',
        ]);

        // Ensure jersey numbers within each sub-team are unique
        foreach ($validated['sub_teams'] as $subIdx => $subData) {
            $jerseys = array_map('intval', array_column($subData['athletes'], 'jersey_number'));
            if (count($jerseys) !== count(array_unique($jerseys))) {
                return back()->withErrors([
                    "sub_teams.{$subIdx}.athletes" => "Nomor punggung atlet di Sub-Tim " . ($subIdx + 1) . " tidak boleh ada yang kembar.",
                ])->with('error', "Nomor punggung atlet di Sub-Tim " . ($subIdx + 1) . " tidak boleh ada yang kembar.");
            }
        }

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

        return back()->with('success', "Super Team \"{$superTeam->name}\" dan 3 Sub-Tim anggotanya berhasil dihapus.");
    }
}
