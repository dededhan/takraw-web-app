<?php

namespace App\Http\Controllers;

use App\Models\Tournament;
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
            'name' => 'required|string|max:150',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'mode' => 'required|in:regu,double,quarter',
        ]);

        $tournament = Tournament::create([
            ...$validated,
            'created_by' => $request->user()->id,
        ]);

        return redirect()->route('tournaments.show', $tournament)
            ->with('success', 'Turnamen berhasil dibuat!');
    }

    public function show(Tournament $tournament): Response
    {
        $tournament->load([
            'creator',
            'teams.athletes',
            'pools.teams',
            'pools.standings' => fn($q) => $q->orderBy('rank'),
            'matches' => fn($q) => $q->with(['homeTeam', 'awayTeam', 'referee', 'sets'])->orderBy('scheduled_at'),
        ]);

        return Inertia::render('Tournament/Show', [
            'tournament' => $tournament,
        ]);
    }

    public function edit(Tournament $tournament): Response
    {
        return Inertia::render('Tournament/Edit', [
            'tournament' => $tournament,
        ]);
    }

    public function update(Request $request, Tournament $tournament)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:150',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'mode' => 'required|in:regu,double,quarter',
            'status' => 'sometimes|in:draft,registration,pool_stage,bracket_stage,completed',
        ]);

        $tournament->update($validated);

        return redirect()->route('tournaments.show', $tournament)
            ->with('success', 'Turnamen berhasil diupdate!');
    }

    public function destroy(Tournament $tournament)
    {
        $tournament->delete();

        return redirect()->route('tournaments.index')
            ->with('success', 'Turnamen berhasil dihapus!');
    }
}
