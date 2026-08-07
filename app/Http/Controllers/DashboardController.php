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
        $teamIds = $teams->pluck('id');

        $liveMatches = Match_::with(['homeTeam', 'awayTeam', 'tournament', 'sets'])
            ->whereIn('status', ['live', 'setup'])
            ->where(function ($q) use ($teamIds) {
                $q->whereIn('home_team_id', $teamIds)
                  ->orWhereIn('away_team_id', $teamIds);
            })
            ->orderBy('started_at', 'desc')
            ->get();

        $upcomingMatches = Match_::with(['homeTeam', 'awayTeam', 'tournament'])
            ->where('status', 'scheduled')
            ->where(function ($q) use ($teamIds) {
                $q->whereIn('home_team_id', $teamIds)
                  ->orWhereIn('away_team_id', $teamIds);
            })
            ->orderBy('scheduled_at', 'asc')
            ->get();

        $pastMatches = Match_::with(['homeTeam', 'awayTeam', 'tournament', 'sets'])
            ->where('status', 'finished')
            ->where(function ($q) use ($teamIds) {
                $q->whereIn('home_team_id', $teamIds)
                  ->orWhereIn('away_team_id', $teamIds);
            })
            ->orderBy('finished_at', 'desc')
            ->get();

        return Inertia::render('Dashboard/Coach', [
            'teams' => $teams,
            'liveMatches' => $liveMatches,
            'upcomingMatches' => $upcomingMatches,
            'pastMatches' => $pastMatches,
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
            ->orderByRaw("FIELD(status, 'live', 'setup', 'scheduled')")
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
