<?php

namespace App\Http\Controllers;

use App\Models\Match_;
use App\Models\Tournament;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MatchController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Match_::with(['homeTeam', 'awayTeam', 'referee', 'tournament', 'sets']);

        if ($request->has('tournament_id')) {
            $query->where('tournament_id', $request->tournament_id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        return Inertia::render('Match/Index', [
            'matches' => $query->latest('scheduled_at')->paginate(15),
            'tournaments' => Tournament::all(['id', 'name']),
            'referees' => User::where('role', 'referee')
                ->where('is_active', true)
                ->get(['id', 'name']),
        ]);
    }

    public function show(Match_ $match): Response
    {
        $match->load([
            'homeTeam.athletes',
            'awayTeam.athletes',
            'homeSuperTeam.members.athletes',
            'awaySuperTeam.members.athletes',
            'referee',
            'tournament',
            'pool',
            'court',
            'timeSlot',
            'sets.stats.athlete',
        ]);

        return Inertia::render('Match/Show', [
            'match' => $match,
        ]);
    }

    /**
     * Assign a referee to a match.
     */
    public function assignReferee(Request $request, Match_ $match)
    {
        $validated = $request->validate([
            'referee_id' => 'required|exists:users,id',
        ]);

        // Verify the user is actually an active referee
        $referee = User::findOrFail($validated['referee_id']);
        if (!$referee->isReferee()) {
            return back()->withErrors(['referee_id' => 'User bukan wasit!']);
        }
        if (!$referee->is_active) {
            return back()->withErrors(['referee_id' => 'Wasit tidak aktif!']);
        }

        $match->update(['referee_id' => $validated['referee_id']]);

        return back()->with('success', 'Wasit berhasil ditugaskan!');
    }

    /**
     * Schedule a match.
     */
    public function schedule(Request $request, Match_ $match)
    {
        $validated = $request->validate([
            'scheduled_at' => 'required|date',
        ]);

        $match->update($validated);

        return back()->with('success', 'Jadwal pertandingan berhasil diatur!');
    }

    /**
     * Update a scheduled match (datetime, court_number, referee).
     * Only allowed when match status is 'scheduled'.
     */
    public function update(Request $request, Match_ $match)
    {
        if ($match->status !== 'scheduled') {
            return back()->withErrors(['status' => 'Hanya pertandingan berstatus "scheduled" yang dapat diedit.']);
        }

        $validated = $request->validate([
            'scheduled_at' => 'nullable|date',
            'court_number' => 'nullable|integer|min:1',
            'referee_id' => 'nullable|exists:users,id',
        ]);

        // Verify referee is active if provided
        if (!empty($validated['referee_id'])) {
            $referee = User::findOrFail($validated['referee_id']);
            if (!$referee->isReferee()) {
                return back()->withErrors(['referee_id' => 'User bukan wasit!']);
            }
            if (!$referee->is_active) {
                return back()->withErrors(['referee_id' => 'Wasit tidak aktif!']);
            }
        }

        $match->update($validated);

        return back()->with('success', 'Pertandingan berhasil diperbarui!');
    }

    /**
     * Delete a scheduled match.
     * Only allowed when match status is 'scheduled'.
     */
    public function destroy(Match_ $match)
    {
        if ($match->status !== 'scheduled') {
            return back()->withErrors(['status' => 'Hanya pertandingan berstatus "scheduled" yang dapat dihapus.']);
        }

        $match->delete();

        return back()->with('success', 'Pertandingan berhasil dihapus!');
    }
}
