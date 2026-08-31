<?php

namespace App\Http\Controllers;

use App\Models\Match_;
use App\Models\Team;
use App\Models\Tournament;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $user = $request->user();

        return match ($user->role) {
            'admin' => $this->adminDashboard(),
            'coach' => $this->coachDashboard($user),
            'referee' => $this->refereeDashboard($user),
        };
    }

    private function adminDashboard(): Response
    {
        return Inertia::render('Dashboard/Admin', [
            'stats' => [
                'totalTournaments' => Tournament::count(),
                'activeTournaments' => Tournament::whereNotIn('status', ['draft', 'completed'])->count(),
                'totalTeams' => Team::count(),
                'totalReferees' => User::where('role', 'referee')->count(),
                'liveMatches' => Match_::where('status', 'live')->count(),
            ],
            'recentTournaments' => Tournament::with('creator')
                ->latest()
                ->take(5)
                ->get(),
            'liveMatches' => Match_::with(['homeTeam', 'awayTeam', 'referee', 'tournament'])
                ->where('status', 'live')
                ->get(),
        ]);
    }

    private function coachDashboard(User $user): Response
    {
        $teams = $user->coachedTeams()->with(['athletes', 'tournaments'])->get();
        $superTeams = $user->coachedSuperTeams()->with(['members.athletes', 'tournament'])->get();
        $teamIds = $teams->pluck('id');
        $superTeamIds = $superTeams->pluck('id');

        // Turnamen yang sedang atau pernah diikuti oleh tim/super team coach
        $tournamentIds = \DB::table('tournament_teams')
            ->whereIn('team_id', $teamIds)
            ->pluck('tournament_id')
            ->merge(
                \App\Models\SuperTeam::where('coach_id', $user->id)
                    ->whereNotNull('tournament_id')
                    ->pluck('tournament_id')
            )
            ->unique();

        $participatedTournaments = Tournament::whereIn('id', $tournamentIds)
            ->with(['modes'])
            ->withCount(['teams', 'matches'])
            ->latest('start_date')
            ->get();

        $activeTournaments = $participatedTournaments->filter(fn($t) => in_array($t->status, ['registration', 'pool_stage', 'bracket_stage']))->values();
        $completedTournaments = $participatedTournaments->filter(fn($t) => $t->status === 'completed')->values();

        // Jadwal Pertandingan Mendatang
        $upcomingMatches = Match_::with(['homeTeam', 'awayTeam', 'homeSuperTeam', 'awaySuperTeam', 'tournament', 'court', 'timeSlot'])
            ->whereIn('status', ['scheduled', 'setup'])
            ->where(function ($q) use ($teamIds, $superTeamIds) {
                $q->whereIn('home_team_id', $teamIds)
                  ->orWhereIn('away_team_id', $teamIds)
                  ->orWhereIn('home_super_team_id', $superTeamIds)
                  ->orWhereIn('away_super_team_id', $superTeamIds);
            })
            ->orderBy('scheduled_at', 'asc')
            ->take(10)
            ->get();

        // Riwayat Pertandingan Selesai
        $recentMatches = Match_::with(['homeTeam', 'awayTeam', 'homeSuperTeam', 'awaySuperTeam', 'tournament', 'sets'])
            ->where('status', 'finished')
            ->where(function ($q) use ($teamIds, $superTeamIds) {
                $q->whereIn('home_team_id', $teamIds)
                  ->orWhereIn('away_team_id', $teamIds)
                  ->orWhereIn('home_super_team_id', $superTeamIds)
                  ->orWhereIn('away_super_team_id', $superTeamIds);
            })
            ->orderBy('finished_at', 'desc')
            ->take(10)
            ->get();

        // Hitung statistik kemenangan tim coach
        $winsCount = 0;
        $lossCount = 0;
        foreach ($recentMatches as $m) {
            $isHome = $teamIds->contains($m->home_team_id) || $superTeamIds->contains($m->home_super_team_id);
            if ($m->winner_team_id || $m->winner_super_team_id) {
                $isWinner = ($isHome && ($teamIds->contains($m->winner_team_id) || $superTeamIds->contains($m->winner_super_team_id)))
                    || (!$isHome && ($teamIds->contains($m->winner_team_id) || $superTeamIds->contains($m->winner_super_team_id)));
                if ($isWinner) {
                    $winsCount++;
                } else {
                    $lossCount++;
                }
            }
        }
        $totalFinished = $winsCount + $lossCount;
        $winRate = $totalFinished > 0 ? round(($winsCount / $totalFinished) * 100) : 0;

        return Inertia::render('Dashboard/Coach', [
            'teams' => $teams,
            'superTeams' => $superTeams,
            'participatedTournaments' => $participatedTournaments,
            'activeTournaments' => $activeTournaments,
            'completedTournaments' => $completedTournaments,
            'upcomingMatches' => $upcomingMatches,
            'recentMatches' => $recentMatches,
            'stats' => [
                'totalTeams' => $teams->count(),
                'totalSuperTeams' => $superTeams->count(),
                'totalAthletes' => $teams->sum(fn($t) => $t->athletes->count()),
                'totalTournaments' => $participatedTournaments->count(),
                'activeTournamentsCount' => $activeTournaments->count(),
                'winsCount' => $winsCount,
                'lossCount' => $lossCount,
                'winRate' => $winRate,
            ],
        ]);
    }

    private function refereeDashboard(User $user): Response
    {
        $matches = Match_::with([
                'homeTeam.athletes', 'awayTeam.athletes',
                'homeSuperTeam', 'awaySuperTeam',
                'tournament', 'court', 'timeSlot', 'sets'
            ])
            ->where('referee_id', $user->id)
            ->whereIn('status', ['scheduled', 'setup', 'live'])
            ->orderByRaw("CASE status WHEN 'live' THEN 1 WHEN 'setup' THEN 2 WHEN 'scheduled' THEN 3 ELSE 4 END")
            ->orderBy('day_number', 'asc')
            ->orderBy('time_slot_id', 'asc')
            ->orderBy('scheduled_at', 'asc')
            ->get();

        // Hitung nomor urut pertandingan per turnamen
        $tournaments = Tournament::whereHas('matches', fn($q) => $q->where('referee_id', $user->id))
            ->get();

        $tournamentMatchNumbers = [];
        foreach ($tournaments as $t) {
            $tMatchIds = Match_::where('tournament_id', $t->id)
                ->orderBy('day_number')
                ->orderBy('time_slot_id')
                ->orderBy('court_id')
                ->pluck('id');
            foreach ($tMatchIds as $idx => $mid) {
                $tournamentMatchNumbers[$mid] = $idx + 1;
            }
        }

        $assignedMatches = $matches->map(function ($m) use ($tournamentMatchNumbers) {
            return [
                ...$m->toArray(),
                'match_number'      => $tournamentMatchNumbers[$m->id] ?? $m->id,
                'home_display_name' => $m->home_display_name,
                'away_display_name' => $m->away_display_name,
            ];
        });

        // Daftar turnamen untuk filter tab di dashboard wasit
        $tournamentsList = $tournaments->map(fn($t) => [
            'id'    => $t->id,
            'name'  => $t->name,
            'count' => $assignedMatches->where('tournament_id', $t->id)->count(),
        ]);

        $completedToday = Match_::with(['homeTeam', 'awayTeam', 'homeSuperTeam', 'awaySuperTeam', 'tournament'])
            ->where('referee_id', $user->id)
            ->where('status', 'finished')
            ->whereDate('finished_at', today())
            ->latest('finished_at')
            ->get()
            ->map(fn($m) => [
                ...$m->toArray(),
                'home_display_name' => $m->home_display_name,
                'away_display_name' => $m->away_display_name,
            ]);

        return Inertia::render('Dashboard/Referee', [
            'assignedMatches' => $assignedMatches,
            'tournaments'     => $tournamentsList,
            'completedToday'  => $completedToday,
        ]);
    }
}
