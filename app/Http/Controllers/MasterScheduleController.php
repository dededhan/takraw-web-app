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
        $tournament->load(['modes', 'courts', 'timeSlots', 'pools.teams', 'pools.superTeams']);

        // Group pools by match_mode and bracket
        $modePools = [];
        foreach ($tournament->modes as $mode) {
            $poolsForMode = $tournament->pools->where('match_mode', $mode->match_mode);
            $realCount = $poolsForMode->count();
            if ($realCount > 0) {
                $mode->pool_count = $realCount;
            }

            // Group by bracket
            $bracketGroups = [];
            foreach ($poolsForMode->groupBy('bracket_name') as $bracketName => $pools) {
                $bName = $bracketName ?: 'Braket Utama';
                $bracketGroups[] = [
                    'bracket_name' => $bName,
                    'pool_count'   => $pools->count(),
                    'pools'        => $pools->values()->map(fn($p) => [
                        'id'           => $p->id,
                        'name'         => $p->name,
                        'bracket_name' => $p->bracket_name,
                        'teams_count'  => in_array($mode->match_mode, ['team_regu', 'team_double'])
                            ? $p->superTeams->count()
                            : $p->teams->count(),
                    ]),
                ];
            }

            $modePools[$mode->match_mode] = [
                'total_pools' => $realCount,
                'brackets'    => $bracketGroups,
            ];
        }

        $preview = null;
        if ($tournament->session_start_time) {
            $preview = $this->slotGenerator->preview($tournament);
        }

        return Inertia::render('Tournament/MasterSchedule/Config', [
            'tournament' => $tournament,
            'modePools'  => $modePools,
            'preview'    => $preview,
        ]);
    }

    /**
     * Simpan konfigurasi parameter + generate courts & time slots.
     */
    public function saveConfig(Request $request, Tournament $tournament)
    {
        if (!$request->input('has_ishoma') || empty($request->input('ishoma_start_time'))) {
            $request->merge([
                'ishoma_start_time' => null,
                'ishoma_end_time'   => null,
            ]);
        }

        // Pastikan pool_counts selalu terisi untuk setiap mode yang aktif
        $modes = $request->input('modes', ['regu']);
        $poolCounts = $request->input('pool_counts', []);
        if (!is_array($poolCounts)) {
            $poolCounts = [];
        }
        foreach ($modes as $m) {
            // Jika sudah ada pool di database untuk mode ini, pertahankan jumlah pool nyatanya
            $realCount = $tournament->pools()->where('match_mode', $m)->count();
            if ($realCount > 0) {
                $poolCounts[$m] = $realCount;
            } elseif (!isset($poolCounts[$m]) || empty($poolCounts[$m])) {
                $poolCounts[$m] = 2;
            } else {
                $poolCounts[$m] = (int) $poolCounts[$m];
            }
        }
        $request->merge(['pool_counts' => $poolCounts]);

        $validated = $request->validate([
            'total_days'               => 'required|integer|min:1|max:14',
            'courts_count'             => 'required|integer|min:1|max:20',
            'session_start_time'       => 'required|date_format:H:i',
            'session_end_time'         => 'required|date_format:H:i|after:session_start_time',
            'session_duration_minutes' => 'required|integer|min:10|max:180',
            'break_duration_minutes'   => 'nullable|integer|min:0|max:60',
            'ishoma_start_time'        => 'nullable|date_format:H:i',
            'ishoma_end_time'          => 'nullable|date_format:H:i|after:ishoma_start_time',
            'modes'                    => 'required|array|min:1',
            'modes.*'                  => 'in:regu,double,quadrant,team_regu,team_double',
            'pool_counts'              => 'required|array',
            'pool_counts.*'            => 'integer|min:1|max:8',
            'day_overrides'            => 'nullable|array',
            'day_overrides.*.session_start_time'       => 'nullable|date_format:H:i',
            'day_overrides.*.session_end_time'         => 'nullable|date_format:H:i',
            'day_overrides.*.has_ishoma'               => 'nullable|boolean',
            'day_overrides.*.ishoma_start_time'        => 'nullable|date_format:H:i',
            'day_overrides.*.ishoma_end_time'          => 'nullable|date_format:H:i',
            'day_overrides.*.session_duration_minutes' => 'nullable|integer|min:10|max:180',
        ]);

        $breakDuration = isset($validated['break_duration_minutes']) ? (int) $validated['break_duration_minutes'] : 0;

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
            'break_duration_minutes'   => $breakDuration,
            'ishoma_start_time'        => $validated['ishoma_start_time'] ? $validated['ishoma_start_time'] . ':00' : null,
            'ishoma_end_time'          => $validated['ishoma_end_time'] ? $validated['ishoma_end_time'] . ':00' : null,
            'ishoma_duration_minutes'  => $ishomaMinutes,
            'day_overrides'            => !empty($validated['day_overrides']) ? $validated['day_overrides'] : null,
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
        $rawMatches = Match_::where('tournament_id', $tournament->id)
            ->with([
                'homeTeam', 'awayTeam', 'referee',
                'homeSuperTeam.members', 'awaySuperTeam.members',
                'court', 'timeSlot',
                'conflicts' => fn($q) => $q->whereNull('resolved_at'),
            ])
            ->orderBy('day_number')
            ->orderBy('time_slot_id')
            ->orderBy('court_id')
            ->get();

        $matches = $this->formatMatchesWithTags($rawMatches);

        $timeSlots = TimeSlot::where('tournament_id', $tournament->id)
            ->orderBy('slot_number')
            ->get();

        $courts = Court::where('tournament_id', $tournament->id)
            ->where('is_active', true)
            ->orderBy('court_number')
            ->get();

        $referees = \App\Models\User::where('role', 'referee')
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'role']);

        $activeConflicts = ScheduleConflict::where('tournament_id', $tournament->id)
            ->whereNull('resolved_at')
            ->with(['match', 'conflictingMatch'])
            ->get();

        $superTeamMemberIds = \Illuminate\Support\Facades\DB::table('super_team_members')
            ->join('super_teams', 'super_teams.id', '=', 'super_team_members.super_team_id')
            ->where('super_teams.tournament_id', $tournament->id)
            ->pluck('super_team_members.team_id')
            ->toArray();

        return Inertia::render('Tournament/MasterSchedule/Grid', [
            'tournament'         => $tournament,
            'matches'            => $matches,
            'timeSlots'          => $timeSlots,
            'courts'             => $courts,
            'referees'           => $referees,
            'activeConflicts'    => $activeConflicts,
            'totalDays'          => $tournament->total_days,
            'superTeamMemberIds' => $superTeamMemberIds,
        ]);
    }

    /**
     * Tampilkan halaman cetak jadwal formal / resmi turnamen (Formal Document Table).
     */
    public function printSchedule(Tournament $tournament): Response
    {
        $tournament->load([
            'modes',
            'courts',
            'teams',
            'superTeams.members',
        ]);

        $rawMatches = Match_::where('tournament_id', $tournament->id)
            ->with([
                'homeTeam', 'awayTeam', 'referee',
                'homeSuperTeam.members', 'awaySuperTeam.members',
                'court', 'timeSlot',
            ])
            ->orderBy('day_number')
            ->orderBy('time_slot_id')
            ->orderBy('court_id')
            ->get();

        $matches = $this->formatMatchesWithTags($rawMatches);

        $timeSlots = TimeSlot::where('tournament_id', $tournament->id)
            ->orderBy('day_number')
            ->orderBy('slot_number')
            ->get();

        $courts = Court::where('tournament_id', $tournament->id)
            ->where('is_active', true)
            ->orderBy('court_number')
            ->get();

        return Inertia::render('Tournament/MasterSchedule/PrintSchedule', [
            'tournament' => $tournament,
            'matches'    => $matches,
            'timeSlots'  => $timeSlots,
            'courts'     => $courts,
            'totalDays'  => $tournament->total_days,
        ]);
    }

    /**
     * Resolve placeholder nama tim bracket ke format nomor partai/match tag presisi (e.g. "Pemenang Match #7").
     */
    protected function formatMatchesWithTags($matchesCollection): array
    {
        // 1. Catat mapping stage & bracket_position ke nomor urut match (#1, #2, #3, ...)
        $stageMap = [];
        foreach ($matchesCollection as $idx => $m) {
            $matchNum = $idx + 1;
            if ($m->stage && $m->bracket_position) {
                $stageMap[$m->match_mode][$m->stage][$m->bracket_position] = $matchNum;
                if ($m->stage === 'quarterfinal') {
                    $stageMap[$m->match_mode]['round_of_8'][$m->bracket_position] = $matchNum;
                }
            }
        }

        // 2. Format display name untuk setiap match
        return $matchesCollection->values()->map(function ($m, $idx) use ($stageMap) {
            $matchNum = $idx + 1;

            $homeDisplay = $this->resolveSideDisplayName($m, 'home', $stageMap);
            $awayDisplay = $this->resolveSideDisplayName($m, 'away', $stageMap);

            return [
                ...$m->toArray(),
                'match_number'      => $matchNum,
                'home_display_name' => $homeDisplay,
                'away_display_name' => $awayDisplay,
                'has_conflicts'     => method_exists($m, 'hasActiveConflicts') ? $m->hasActiveConflicts() : false,
            ];
        })->all();
    }

    protected function resolveSideDisplayName($match, string $side, array $stageMap): string
    {
        if ($match->isTeamMode()) {
            $realSuperTeam = $side === 'home' ? $match->homeSuperTeam : $match->awaySuperTeam;
            if ($realSuperTeam) return $realSuperTeam->name;
        } else {
            $realTeam = $side === 'home' ? $match->homeTeam : $match->awayTeam;
            if ($realTeam) return $realTeam->name;
        }

        $raw = trim((string) ($side === 'home' ? $match->home_placeholder : $match->away_placeholder));
        if (empty($raw)) {
            return 'TBD';
        }

        $mode = $match->match_mode;

        // Cek pola winner / pemenang QF
        if (preg_match('/(?:winner_qf_|winner\s*qf\s*#?|pemenang\s*qf\s*#?)(\d+)/i', $raw, $mat)) {
            $pos = (int) $mat[1];
            if (isset($stageMap[$mode]['quarterfinal'][$pos])) {
                return "Pemenang Match #" . $stageMap[$mode]['quarterfinal'][$pos];
            }
            return "Pemenang QF #{$pos}";
        }

        // Cek pola winner / pemenang SF
        if (preg_match('/(?:winner_sf_|winner\s*sf\s*#?|pemenang\s*sf\s*#?)(\d+)/i', $raw, $mat)) {
            $pos = (int) $mat[1];
            if (isset($stageMap[$mode]['semifinal'][$pos])) {
                return "Pemenang Match #" . $stageMap[$mode]['semifinal'][$pos];
            }
            return "Pemenang SF #{$pos}";
        }

        // Cek pola loser / kalah SF (perebutan juara 3)
        if (preg_match('/(?:loser_sf_|loser\s*sf\s*#?|kalah\s*sf\s*#?)(\d+)/i', $raw, $mat)) {
            $pos = (int) $mat[1];
            if (isset($stageMap[$mode]['semifinal'][$pos])) {
                return "Kalah Match #" . $stageMap[$mode]['semifinal'][$pos];
            }
            return "Kalah SF #{$pos}";
        }

        // Cek pola pool rank (pool_A_rank_1)
        if (preg_match('/pool_([A-Za-z])_rank_(\d+)/i', $raw, $mat)) {
            $poolName = strtoupper($mat[1]);
            $rank = (int) $mat[2];
            return $rank === 1 ? "Juara Pool {$poolName}" : ($rank === 2 ? "Runner-up Pool {$poolName}" : "Peringkat {$rank} Pool {$poolName}");
        }

        return $raw;
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

        $referee = \App\Models\User::findOrFail($validated['referee_id']);
        if (!$referee->isReferee()) {
            return back()->withErrors(['referee_id' => 'Pengguna yang dipilih bukan wasit!']);
        }

        Match_::whereIn('id', $validated['match_ids'])
            ->where('tournament_id', $tournament->id)
            ->update(['referee_id' => $validated['referee_id']]);

        return back()->with('success', "Wasit \"{$referee->name}\" berhasil ditugaskan ke " . count($validated['match_ids']) . " pertandingan!");
    }

    // ─────────────────────────────────────────────────────────────────
    // Drag & Drop Reschedule (+ Swap Tim)
    // ─────────────────────────────────────────────────────────────────

    /**
     * Reschedule / Drag & Drop Match ke Slot Waktu dan Lapangan Baru.
     * Mendukung swap cerdas untuk multi-slot (Team Regu 3 Kotak) dan single slot
     * tanpa menyebabkan laga lain tertimpa atau hilang dari jadwal.
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
        $oldDaySlots = ($oldDayNumber && $oldSlotId)
            ? TimeSlot::where('tournament_id', $match->tournament_id)
                ->where('day_number', $oldDayNumber)
                ->where('slot_type', 'match')
                ->orderBy('slot_number')
                ->get()
                ->values()
            : collect();

        $oldSlotIndex = $oldDaySlots->isNotEmpty() ? $oldDaySlots->search(fn($s) => $s->id == $oldSlotId) : false;
        $oldSpanSlots = ($oldSlotIndex !== false) ? $oldDaySlots->slice($oldSlotIndex, $matchSpan)->values() : collect();

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

        // Cari seluruh slot yang sedang kosong di turnamen hari itu untuk fallback alokasi
        $allCourts = Court::where('tournament_id', $match->tournament_id)->where('is_active', true)->get();

        // Lakukan SWAP cerdas jika ada match lain di area target
        $swappedCount = 0;
        if ($conflictingMatches->isNotEmpty()) {
            // Skenario 1: Sesama match 3-slot (Team Regu ➔ Team Regu)
            if ($matchSpan >= 3 && $conflictingMatches->count() === 1 && ($conflictingMatches->first()->slot_span >= 3 || in_array($conflictingMatches->first()->match_mode, ['team_regu', 'team_double']))) {
                $targetTeamMatch = $conflictingMatches->first();
                if ($oldSlotId && $oldCourtId) {
                    $targetTeamMatch->update([
                        'time_slot_id' => $oldSlotId,
                        'court_id'     => $oldCourtId,
                        'day_number'   => $oldDayNumber,
                        'scheduled_at' => $oldScheduled,
                    ]);
                } else {
                    // Match asal tidak punya slot (dari unscheduled tray)
                    $targetTeamMatch->update([
                        'time_slot_id' => null,
                        'court_id'     => null,
                        'day_number'   => null,
                        'scheduled_at' => null,
                    ]);
                }
                $swappedCount = 1;
            }
            // Skenario 2: Match 3-slot ($match) menimpa 1 atau beberapa single-match (1 slot)
            else if ($matchSpan >= 3) {
                $availableOldSlots = $oldSpanSlots->all();
                foreach ($conflictingMatches->values() as $idx => $cMatch) {
                    if (isset($availableOldSlots[$idx])) {
                        $assignSlot = $availableOldSlots[$idx];
                        $cMatch->update([
                            'time_slot_id' => $assignSlot->id,
                            'court_id'     => $oldCourtId,
                            'day_number'   => $oldDayNumber,
                            'scheduled_at' => $assignSlot->start_time,
                        ]);
                    } else {
                        // Cari slot kosong terdekat di lapangan manapun
                        $freeSlot = $this->findFreeSingleSlot($match->tournament_id, $targetDayNumber, $allCourts, $targetDaySlots);
                        if ($freeSlot) {
                            $cMatch->update([
                                'time_slot_id' => $freeSlot['slot_id'],
                                'court_id'     => $freeSlot['court_id'],
                                'day_number'   => $targetDayNumber,
                                'scheduled_at' => $freeSlot['start_time'],
                            ]);
                        } else {
                            $cMatch->update([
                                'time_slot_id' => null,
                                'court_id'     => null,
                                'day_number'   => null,
                                'scheduled_at' => null,
                            ]);
                        }
                    }
                    $swappedCount++;
                }
            }
            // Skenario 3: Single match ($match span 1) menimpa Team Regu (span 3)
            else if ($conflictingMatches->contains(fn($m) => ($m->slot_span >= 3 || in_array($m->match_mode, ['team_regu', 'team_double'])))) {
                $targetTeamMatch = $conflictingMatches->first(fn($m) => ($m->slot_span >= 3 || in_array($m->match_mode, ['team_regu', 'team_double'])));
                // Cari blok 3 slot kosong untuk menempatkan Team Regu yang tergeser
                $free3Block = $this->findFreeBlockSlots($match->tournament_id, $targetDayNumber, $allCourts, $targetDaySlots, 3);
                if ($free3Block) {
                    $targetTeamMatch->update([
                        'time_slot_id' => $free3Block['slot_id'],
                        'court_id'     => $free3Block['court_id'],
                        'day_number'   => $targetDayNumber,
                        'scheduled_at' => $free3Block['start_time'],
                    ]);
                } else if ($oldSlotId && $oldCourtId) {
                    $targetTeamMatch->update([
                        'time_slot_id' => $oldSlotId,
                        'court_id'     => $oldCourtId,
                        'day_number'   => $oldDayNumber,
                        'scheduled_at' => $oldScheduled,
                    ]);
                } else {
                    $targetTeamMatch->update([
                        'time_slot_id' => null,
                        'court_id'     => null,
                        'day_number'   => null,
                        'scheduled_at' => null,
                    ]);
                }
                $swappedCount++;
            }
            // Skenario 4: Single match menimpa sesama single match
            else {
                foreach ($conflictingMatches->values() as $idx => $cMatch) {
                    if ($oldSlotId && $oldCourtId) {
                        $cMatch->update([
                            'time_slot_id' => $oldSlotId,
                            'court_id'     => $oldCourtId,
                            'day_number'   => $oldDayNumber,
                            'scheduled_at' => $oldScheduled,
                        ]);
                    } else {
                        $freeSlot = $this->findFreeSingleSlot($match->tournament_id, $targetDayNumber, $allCourts, $targetDaySlots);
                        if ($freeSlot) {
                            $cMatch->update([
                                'time_slot_id' => $freeSlot['slot_id'],
                                'court_id'     => $freeSlot['court_id'],
                                'day_number'   => $targetDayNumber,
                                'scheduled_at' => $freeSlot['start_time'],
                            ]);
                        } else {
                            $cMatch->update([
                                'time_slot_id' => null,
                                'court_id'     => null,
                                'day_number'   => null,
                                'scheduled_at' => null,
                            ]);
                        }
                    }
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

        // Auto-scan conflict detection
        $this->conflictDetector->scanAll(Tournament::find($match->tournament_id));

        // Hitung nomor urut match tagar (#1, #2, #3...) dalam turnamen ini
        $allMatches = Match_::where('tournament_id', $match->tournament_id)
            ->orderBy('day_number')
            ->orderBy('time_slot_id')
            ->orderBy('court_id')
            ->pluck('id');

        $matchNum = $allMatches->search($match->id);
        $displayNum = ($matchNum !== false) ? ($matchNum + 1) : $match->id;

        $spanText = $matchSpan > 1 ? " (3 Slot Kotak)" : "";
        $message = $swappedCount > 0
            ? "Jadwal Match #{$displayNum}{$spanText} berhasil dipindahkan dan ditukar posisinya secara aman ({$swappedCount} laga disesuaikan)!"
            : "Jadwal Match #{$displayNum}{$spanText} berhasil dipindahkan!";

        return back()->with('success', $message);
    }

    /**
     * Helper: Cari 1 slot kosong pada hari tertentu di lapangan manapun.
     */
    protected function findFreeSingleSlot(int $tournamentId, int $dayNumber, \Illuminate\Support\Collection $courts, \Illuminate\Support\Collection $daySlots): ?array
    {
        $existingMatches = Match_::where('tournament_id', $tournamentId)
            ->where('day_number', $dayNumber)
            ->whereNotNull('time_slot_id')
            ->get();

        $occupied = [];
        foreach ($existingMatches as $m) {
            $span = $m->slot_span ?: (($m->match_mode === 'team_regu' || $m->match_mode === 'team_double') ? 3 : 1);
            $idx = $daySlots->search(fn($s) => $s->id == $m->time_slot_id);
            if ($idx !== false) {
                foreach ($daySlots->slice($idx, $span) as $s) {
                    $occupied[$m->court_id][$s->id] = true;
                }
            }
        }

        foreach ($daySlots as $slot) {
            foreach ($courts as $court) {
                if (!isset($occupied[$court->id][$slot->id])) {
                    return [
                        'slot_id'    => $slot->id,
                        'court_id'   => $court->id,
                        'start_time' => $slot->start_time,
                    ];
                }
            }
        }

        return null;
    }

    /**
     * Helper: Cari blok N slot berturut-turut yang kosong pada hari tertentu.
     */
    protected function findFreeBlockSlots(int $tournamentId, int $dayNumber, \Illuminate\Support\Collection $courts, \Illuminate\Support\Collection $daySlots, int $span): ?array
    {
        $existingMatches = Match_::where('tournament_id', $tournamentId)
            ->where('day_number', $dayNumber)
            ->whereNotNull('time_slot_id')
            ->get();

        $occupied = [];
        foreach ($existingMatches as $m) {
            $mSpan = $m->slot_span ?: (($m->match_mode === 'team_regu' || $m->match_mode === 'team_double') ? 3 : 1);
            $idx = $daySlots->search(fn($s) => $s->id == $m->time_slot_id);
            if ($idx !== false) {
                foreach ($daySlots->slice($idx, $mSpan) as $s) {
                    $occupied[$m->court_id][$s->id] = true;
                }
            }
        }

        for ($i = 0; $i <= $daySlots->count() - $span; $i++) {
            $blockSlots = $daySlots->slice($i, $span)->values();
            foreach ($courts as $court) {
                $allClear = true;
                foreach ($blockSlots as $s) {
                    if (isset($occupied[$court->id][$s->id])) {
                        $allClear = false;
                        break;
                    }
                }
                if ($allClear) {
                    return [
                        'slot_id'    => $blockSlots->first()->id,
                        'court_id'   => $court->id,
                        'start_time' => $blockSlots->first()->start_time,
                    ];
                }
            }
        }

        return null;
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
            ->orderByRaw("CASE severity WHEN 'error' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END")
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
