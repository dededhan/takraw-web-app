<?php

namespace App\Http\Controllers;

use App\Models\Court;
use App\Models\Match_;
use App\Models\Pool;
use App\Models\ScheduleConflict;
use App\Models\TimeSlot;
use App\Models\Tournament;
use App\Services\ConflictDetectorService;
use App\Services\MasterScheduleGeneratorService;
use App\Services\TimeSlotGeneratorService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MasterScheduleController extends Controller
{
    public function __construct(
        protected TimeSlotGeneratorService $slotGenerator,
        protected MasterScheduleGeneratorService $scheduleGenerator,
        protected ConflictDetectorService $conflictDetector,
    ) {}

    // ─────────────────────────────────────────────────────────────────
    // STEP 1: Konfigurasi Parameter
    // ─────────────────────────────────────────────────────────────────

    /**
     * Tampilkan form konfigurasi parameter Master Schedule (Wizard 3 Step).
     */
    public function config(Tournament $tournament): Response
    {
        $tournament->load(['modes', 'courts', 'timeSlots', 'pools']);

        // Sync mode pool_count dengan jumlah pool nyata di DB jika sudah ada
        $tournament->modes->transform(function ($m) use ($tournament) {
            $realCount = $tournament->pools->where('match_mode', $m->match_mode)->count();
            if ($realCount > 0) {
                $m->pool_count = $realCount;
            }
            return $m;
        });

        $preview = null;
        if ($tournament->session_start_time) {
            $preview = $this->slotGenerator->preview($tournament);
        }

        return Inertia::render('Tournament/MasterSchedule/Config', [
            'tournament' => $tournament,
            'preview'    => $preview,
        ]);
    }

    /**
     * Simpan konfigurasi parameter + generate courts & time slots.
     */
    public function saveConfig(Request $request, Tournament $tournament)
    {
        $validated = $request->validate([
            'total_days'               => 'required|integer|min:1|max:14',
            'courts_count'             => 'required|integer|min:1|max:20',
            'session_start_time'       => 'required|date_format:H:i',
            'session_end_time'         => 'required|date_format:H:i|after:session_start_time',
            'session_duration_minutes' => 'required|integer|min:10|max:180',
            'break_duration_minutes'   => 'required|integer|min:0|max:60',
            'ishoma_start_time'        => 'nullable|date_format:H:i',
            'ishoma_end_time'          => 'nullable|date_format:H:i|after:ishoma_start_time',
            'modes'                    => 'required|array|min:1',
            'modes.*'                  => 'in:regu,double,quadrant,team_regu,team_double',
            'pool_counts'              => 'required|array',
            'pool_counts.*'            => 'integer|min:2|max:8',
        ]);

        // Hitung durasi ISHOMA
        $ishomaMinutes = null;
        if ($validated['ishoma_start_time'] && $validated['ishoma_end_time']) {
            [$sh, $sm] = explode(':', $validated['ishoma_start_time']);
            [$eh, $em] = explode(':', $validated['ishoma_end_time']);
            $ishomaMinutes = ((int)$eh * 60 + (int)$em) - ((int)$sh * 60 + (int)$sm);
        }

        // Update konfigurasi turnamen
        $tournament->update([
            'total_days'               => $validated['total_days'],
            'courts_count'             => $validated['courts_count'],
            'session_start_time'       => $validated['session_start_time'] . ':00',
            'session_end_time'         => $validated['session_end_time'] . ':00',
            'session_duration_minutes' => $validated['session_duration_minutes'],
            'break_duration_minutes'   => $validated['break_duration_minutes'],
            'ishoma_start_time'        => $validated['ishoma_start_time'] ? $validated['ishoma_start_time'] . ':00' : null,
            'ishoma_end_time'          => $validated['ishoma_end_time'] ? $validated['ishoma_end_time'] . ':00' : null,
            'ishoma_duration_minutes'  => $ishomaMinutes,
        ]);

        // Sync tournament modes
        $tournament->modes()->delete();
        foreach ($validated['modes'] as $mode) {
            $tournament->modes()->create([
                'match_mode'  => $mode,
                'pool_count'  => $validated['pool_counts'][$mode] ?? 2,
                'is_active'   => true,
            ]);
        }

        // Generate courts & time slots
        $this->slotGenerator->generate($tournament);

        return redirect()
            ->route('tournaments.master-schedule.bracket-matrix', $tournament)
            ->with('success', 'Konfigurasi disimpan! Silakan atur Bracket Matrix untuk setiap mode.');
    }

    // ─────────────────────────────────────────────────────────────────
    // STEP 2: Konfigurasi Bracket Matrix
    // (Di-handle oleh BracketMatrixController)
    // ─────────────────────────────────────────────────────────────────

    // ─────────────────────────────────────────────────────────────────
    // STEP 3: Auto-Generate Full Schedule
    // ─────────────────────────────────────────────────────────────────

    /**
     * Full auto-generate Master Schedule (1 klik = semua hari terisi).
     */
    public function generate(Request $request, Tournament $tournament)
    {
        // Validasi pre-conditions
        if (!$tournament->session_start_time) {
            return back()->with('error', 'Konfigurasi parameter belum dilengkapi. Isi terlebih dahulu di halaman Konfigurasi.');
        }

        if ($tournament->courts()->count() === 0) {
            return back()->with('error', 'Belum ada lapangan. Simpan konfigurasi terlebih dahulu untuk generate lapangan.');
        }

        if ($tournament->timeSlots()->where('slot_type', 'match')->count() === 0) {
            return back()->with('error', 'Belum ada slot waktu. Simpan konfigurasi terlebih dahulu.');
        }

        try {
            // Generate seluruh jadwal
            $stats = $this->scheduleGenerator->generate($tournament);

            // Scan konflik setelah generate
            $conflictResult = $this->conflictDetector->scanAll($tournament);

            $message = "Jadwal berhasil di-generate! "
                . "{$stats['pool_matches_scheduled']} match pool, "
                . "{$stats['team_matches_scheduled']} match team, "
                . "{$stats['bracket_matches_created']} match braket.";

            if ($conflictResult['errors'] > 0) {
                $message .= " ⚠️ {$conflictResult['errors']} konflik terdeteksi — periksa panel konflik.";
            }

            return redirect()
                ->route('tournaments.master-schedule.index', $tournament)
                ->with('success', $message);
        } catch (\Exception $e) {
            return back()->with('error', 'Gagal generate jadwal: ' . $e->getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // STEP 4 (Interactive): Grid View + Drag & Drop
    // ─────────────────────────────────────────────────────────────────

    /**
     * Tampilkan Grid Calendar Master Schedule.
     */
    public function index(Tournament $tournament): Response
    {
        $tournament->load([
            'modes',
            'courts',
            'scheduleConflicts',
            'teams',
            'superTeams.members',
        ]);

        // Load SELURUH matches untuk semua hari (diurutkan kronologis dengan nomor match start dari 1)
        $matches = Match_::where('tournament_id', $tournament->id)
            ->with([
                'homeTeam', 'awayTeam', 'referee',
                'homeSuperTeam.members', 'awaySuperTeam.members',
                'court', 'timeSlot',
                'conflicts' => fn($q) => $q->whereNull('resolved_at'),
            ])
            ->orderBy('day_number')
            ->orderBy('time_slot_id')
            ->orderBy('court_id')
            ->get()
            ->values()
            ->map(fn($m, $idx) => [
                ...$m->toArray(),
                'match_number'      => $idx + 1,
                'home_display_name' => $m->home_display_name,
                'away_display_name' => $m->away_display_name,
                'has_conflicts'     => $m->hasActiveConflicts(),
            ]);

        $timeSlots = TimeSlot::where('tournament_id', $tournament->id)
            ->orderBy('slot_number')
            ->get();

        $courts = Court::where('tournament_id', $tournament->id)
            ->where('is_active', true)
            ->orderBy('court_number')
            ->get();

        $referees = \App\Models\User::whereIn('role', ['referee', 'admin'])
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'role']);

        $activeConflicts = ScheduleConflict::where('tournament_id', $tournament->id)
            ->whereNull('resolved_at')
            ->with(['match', 'conflictingMatch'])
            ->get();

        return Inertia::render('Tournament/MasterSchedule/Grid', [
            'tournament'      => $tournament,
            'matches'         => $matches,
            'timeSlots'       => $timeSlots,
            'courts'          => $courts,
            'referees'        => $referees,
            'activeConflicts' => $activeConflicts,
            'totalDays'       => $tournament->total_days,
        ]);
    }

    /**
     * Penugasan Wasit Massal (Bulk Assign Referee per Ceklis Match ID).
     */
    public function bulkAssignReferee(Request $request, Tournament $tournament)
    {
        $validated = $request->validate([
            'referee_id'  => 'required|exists:users,id',
            'match_ids'   => 'required|array|min:1',
            'match_ids.*' => 'exists:matches,id',
        ]);

        Match_::whereIn('id', $validated['match_ids'])
            ->where('tournament_id', $tournament->id)
            ->update(['referee_id' => $validated['referee_id']]);

        $referee = \App\Models\User::find($validated['referee_id']);

        return back()->with('success', "Wasit \"{$referee->name}\" berhasil ditugaskan ke " . count($validated['match_ids']) . " pertandingan!");
    }

    // ─────────────────────────────────────────────────────────────────
    // Drag & Drop Reschedule (+ Swap Tim)
    // ─────────────────────────────────────────────────────────────────

    /**
     * Update posisi match setelah drag & drop.
     * Mendukung: geser waktu/lapangan + swap tim (single match & team_regu 3-slot span).
     * Constraint utama: rest time validation (tidak boleh back-to-back).
     */
    public function reschedule(Request $request, Match_ $match)
    {
        $validated = $request->validate([
            'time_slot_id'       => 'nullable|exists:time_slots,id',
            'court_id'           => 'nullable|exists:courts,id',
            'home_team_id'       => 'nullable|exists:teams,id',
            'away_team_id'       => 'nullable|exists:teams,id',
            'home_super_team_id' => 'nullable|exists:super_teams,id',
            'away_super_team_id' => 'nullable|exists:super_teams,id',
        ]);

        $matchSpan = $match->slot_span ?: (($match->match_mode === 'team_regu' || $match->match_mode === 'team_double') ? 3 : 1);

        $oldSlotId     = $match->time_slot_id;
        $oldCourtId    = $match->court_id;
        $oldDayNumber  = $match->day_number;
        $oldScheduled  = $match->scheduled_at;

        $targetSlotId  = $validated['time_slot_id'] ?? $oldSlotId;
        $targetCourtId = $validated['court_id'] ?? $oldCourtId;

        $targetSlot    = $targetSlotId ? TimeSlot::find($targetSlotId) : null;
        if (!$targetSlot) {
            return back()->with('error', 'Slot target tidak valid.');
        }

        $targetDayNumber = $targetSlot->day_number;
        $targetScheduled = $targetSlot->start_time;

        // Ambil semua time slots pada hari target
        $targetDaySlots = TimeSlot::where('tournament_id', $match->tournament_id)
            ->where('day_number', $targetDayNumber)
            ->where('slot_type', 'match')
            ->orderBy('slot_number')
            ->get()
            ->values();

        $targetSlotIndex = $targetDaySlots->search(fn($s) => $s->id == $targetSlotId);
        if ($targetSlotIndex === false) {
            $targetSlotIndex = 0;
        }

        // Jika matchSpan > 1 (misal 3 slot untuk team_regu):
        // Pastikan targetSlotIndex muat dalam sisa slot hari itu.
        if ($matchSpan > 1 && $targetSlotIndex + $matchSpan > $targetDaySlots->count()) {
            $targetSlotIndex = max(0, $targetDaySlots->count() - $matchSpan);
            $targetSlot = $targetDaySlots[$targetSlotIndex];
            $targetSlotId = $targetSlot->id;
            $targetScheduled = $targetSlot->start_time;
        }

        // Kumpulan slot IDs target yang akan ditempati oleh $match
        $targetSpanSlots = $targetDaySlots->slice($targetSlotIndex, $matchSpan)->values();
        $targetSpanSlotIds = $targetSpanSlots->pluck('id')->all();

        // Ambil semua time slots pada hari asal untuk alokasi slot yang ditinggalkan
        $oldDaySlots = TimeSlot::where('tournament_id', $match->tournament_id)
            ->where('day_number', $oldDayNumber)
            ->where('slot_type', 'match')
            ->orderBy('slot_number')
            ->get()
            ->values();

        $oldSlotIndex = $oldDaySlots->search(fn($s) => $s->id == $oldSlotId);
        if ($oldSlotIndex === false) $oldSlotIndex = 0;
        $oldSpanSlots = $oldDaySlots->slice($oldSlotIndex, $matchSpan)->values();

        // Cari semua matches yang saat ini menempati area target di lapangan target (selain $match sendiri)
        $allTargetCourtMatches = Match_::where('tournament_id', $match->tournament_id)
            ->where('court_id', $targetCourtId)
            ->where('day_number', $targetDayNumber)
            ->where('id', '!=', $match->id)
            ->whereNotNull('time_slot_id')
            ->get();

        $conflictingMatches = collect();
        foreach ($allTargetCourtMatches as $other) {
            $otherSpan = $other->slot_span ?: (($other->match_mode === 'team_regu' || $other->match_mode === 'team_double') ? 3 : 1);
            $otherSlotIdx = $targetDaySlots->search(fn($s) => $s->id == $other->time_slot_id);
            if ($otherSlotIdx !== false) {
                $otherSlotIds = $targetDaySlots->slice($otherSlotIdx, $otherSpan)->pluck('id')->all();
                if (!empty(array_intersect($targetSpanSlotIds, $otherSlotIds))) {
                    $conflictingMatches->push($other);
                }
            }
        }

        // Lakukan SWAP jika ada match lain di area target
        $swappedCount = 0;
        if ($conflictingMatches->isNotEmpty()) {
            // Jika match di target adalah sesama team_regu (span 3):
            if ($conflictingMatches->count() === 1 && ($conflictingMatches->first()->slot_span > 1 || $conflictingMatches->first()->match_mode === 'team_regu' || $conflictingMatches->first()->match_mode === 'team_double')) {
                $targetTeamMatch = $conflictingMatches->first();
                $targetTeamMatch->update([
                    'time_slot_id' => $oldSlotId,
                    'court_id'     => $oldCourtId,
                    'day_number'   => $oldDayNumber,
                    'scheduled_at' => $oldScheduled,
                ]);
                $swappedCount = 1;
            } else {
                // Jika match tunggal / multiple matches:
                // Pindahkan ke slot-slot yang ditinggalkan oleh $match di lapangan asal
                foreach ($conflictingMatches->values() as $idx => $cMatch) {
                    $assignOldSlot = $oldSpanSlots->get($idx) ?? $oldSpanSlots->first();
                    $cMatch->update([
                        'time_slot_id' => $assignOldSlot?->id ?? $oldSlotId,
                        'court_id'     => $oldCourtId,
                        'day_number'   => $oldDayNumber,
                        'scheduled_at' => $assignOldSlot?->start_time ?? $oldScheduled,
                    ]);
                    $swappedCount++;
                }
            }
        }

        // Update match utama ke posisi target
        $match->update([
            'time_slot_id' => $targetSlotId,
            'court_id'     => $targetCourtId,
            'day_number'   => $targetDayNumber,
            'scheduled_at' => $targetScheduled,
            'slot_span'    => $matchSpan,
        ]);

        // Hitung nomor urut match tagar (#1, #2, #3...) dalam turnamen ini
        $allMatches = Match_::where('tournament_id', $match->tournament_id)
            ->orderBy('day_number')
            ->orderBy('time_slot_id')
            ->orderBy('court_id')
            ->pluck('id');

        $matchNum = $allMatches->search($match->id);
        $displayNum = ($matchNum !== false) ? ($matchNum + 1) : $match->id;

        $spanText = $matchSpan > 1 ? " (3 Slot / Kotak)" : "";
        $message = $swappedCount > 0
            ? "Jadwal Match #{$displayNum}{$spanText} berhasil ditukar posisinya (Swap {$swappedCount} match)!"
            : "Jadwal Match #{$displayNum}{$spanText} berhasil dipindahkan!";

        return back()->with('success', $message);
    }

    // ─────────────────────────────────────────────────────────────────
    // Publish & Konflik
    // ─────────────────────────────────────────────────────────────────

    /**
     * Publish jadwal (hanya jika tidak ada konflik error).
     */
    public function publish(Tournament $tournament)
    {
        $errorCount = ScheduleConflict::where('tournament_id', $tournament->id)
            ->whereNull('resolved_at')
            ->where('severity', 'error')
            ->count();

        if ($errorCount > 0) {
            return back()->with('error', "Tidak dapat publish — masih ada {$errorCount} konflik error yang harus diselesaikan terlebih dahulu.");
        }

        $tournament->update(['schedule_status' => 'published']);

        return back()->with('success', 'Jadwal Master berhasil dipublikasi! 🎉');
    }

    /**
     * Kembalikan status jadwal ke Draft untuk mengedit ulang (Reopen Edit).
     */
    public function unpublish(Tournament $tournament)
    {
        $tournament->update(['schedule_status' => 'draft']);

        return back()->with('success', 'Status jadwal berhasil dikembalikan ke Draft. Anda dapat mengedit kembali jadwal dan susunan pertandingan! ✏️');
    }

    /**
     * Kembalikan list konflik aktif (untuk AJAX refresh panel konflik).
     */
    public function conflicts(Tournament $tournament)
    {
        $conflicts = ScheduleConflict::where('tournament_id', $tournament->id)
            ->whereNull('resolved_at')
            ->with(['match.court', 'match.timeSlot', 'conflictingMatch'])
            ->orderByRaw("FIELD(severity, 'error', 'warning')")
            ->orderBy('conflict_type')
            ->get();

        return response()->json([
            'conflicts' => $conflicts,
            'count'     => $conflicts->count(),
            'errors'    => $conflicts->where('severity', 'error')->count(),
            'warnings'  => $conflicts->where('severity', 'warning')->count(),
        ]);
    }
}
