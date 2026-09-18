<?php

namespace App\Services;

use App\Models\BracketMatrix;
use App\Models\Court;
use App\Models\Match_;
use App\Models\Pool;
use App\Models\PoolStanding;
use App\Models\SuperTeam;
use App\Models\TimeSlot;
use App\Models\Tournament;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * MasterScheduleGeneratorService
 *
 * "Otak" sistem penjadwalan — mengimplementasikan Priority Queuing Algorithm 4 fase:
 *
 * FASE 1 — Slot ISHOMA/Break sudah terblokir (by TimeSlotGeneratorService)
 * FASE 2 — Plot Mode Team (slot_span = 3, durasi 150 menit)
 * FASE 3 — Plot Pool Matches tunggal (regu, double, quadrant)
 * FASE 4 — Plot Bracket Placeholder Matches (dengan dependency chain)
 *
 * Cross-Mode Rest Time: Tim yang baru bertanding di slot N
 * tidak boleh bermain lagi di slot N atau N+1 (mode apapun).
 *
 * Swap Tim (Drag & Drop): Dihandle oleh MasterScheduleController::reschedule()
 * dengan validasi rest time di ConflictDetectorService.
 */
class MasterScheduleGeneratorService
{
    /**
     * Peta: team_id / super_team_id → [slot_id, slot_id, ...] yang sudah digunakan.
     * Digunakan untuk validasi rest time lintas mode.
     */
    protected array $teamOccupiedSlots = [];

    /**
     * Peta: [court_id][slot_id] → match_id yang sudah terisi.
     */
    protected array $courtSlotMap = [];

    /**
     * Cache semua slot match-able diurutkan per hari.
     */
    protected Collection $matchSlots;

    /**
     * Entry point utama — generate full schedule untuk satu turnamen.
     */
    public function generate(Tournament $tournament): array
    {
        DB::beginTransaction();
        try {
            // 1. Hapus semua jadwal lama (match yang belum/sedang scheduled)
            Match_::where('tournament_id', $tournament->id)
                ->where('status', 'scheduled')
                ->delete();

            // 2. Muat semua slot waktu yang bisa diisi match
            $this->matchSlots = TimeSlot::where('tournament_id', $tournament->id)
                ->where('slot_type', 'match')
                ->orderBy('day_number')
                ->orderBy('slot_number')
                ->get();

            // 3. Muat semua lapangan aktif
            $courts = Court::where('tournament_id', $tournament->id)
                ->where('is_active', true)
                ->orderBy('court_number')
                ->get();

            if ($courts->isEmpty()) {
                throw new \RuntimeException('Tidak ada lapangan aktif. Generate courts terlebih dahulu.');
            }

            if ($this->matchSlots->isEmpty()) {
                throw new \RuntimeException('Tidak ada slot waktu yang tersedia. Generate time slots terlebih dahulu.');
            }

            // 4. Build court-slot map untuk tracking ketersediaan
            $this->buildCourtSlotMap($courts);

            // 5. Jalankan 4 fase penjadwalan
            $stats = [
                'team_matches_scheduled'   => 0,
                'pool_matches_scheduled'   => 0,
                'bracket_matches_created'  => 0,
            ];

            // FASE 2: Mode Team (slot_span = 3)
            $stats['team_matches_scheduled'] = $this->scheduleTeamModeMatches($tournament, $courts);

            // FASE 3: Pool Matches tunggal
            $stats['pool_matches_scheduled'] = $this->scheduleSingleModePoolMatches($tournament, $courts);

            // FASE 4: Bracket Placeholder Matches
            $stats['bracket_matches_created'] = $this->createBracketPlaceholderMatches($tournament, $courts);

            // FASE 5: Pemetaan Presisi Match Number Tag (#1, #2, #13...) ke Label Bracket (Pemenang #13 vs Pemenang #14)
            $allMatches = Match_::where('tournament_id', $tournament->id)
                ->orderBy('day_number')
                ->orderBy('time_slot_id')
                ->orderBy('court_id')
                ->get();

            $stageMap = [];
            foreach ($allMatches as $idx => $m) {
                $matchNum = $idx + 1;
                $bGroup = $m->bracket_group ?: 'default';
                $stageMap[$m->match_mode][$bGroup][$m->stage][$m->bracket_position] = $matchNum;
                $stageMap[$m->match_mode]['default'][$m->stage][$m->bracket_position] = $matchNum;
                if ($m->stage === 'quarterfinal') {
                    $stageMap[$m->match_mode][$bGroup]['round_of_8'][$m->bracket_position] = $matchNum;
                    $stageMap[$m->match_mode]['default']['round_of_8'][$m->bracket_position] = $matchNum;
                }
            }

            $allMatrices = BracketMatrix::where('tournament_id', $tournament->id)->get();
            $matricesByGroup = $allMatrices->groupBy(fn($item) => $item->match_mode . '___' . ($item->bracket_name ?: 'default'));

            foreach ($allMatches as $m) {
                if ($m->stage === 'pool') continue;

                $bGroup = $m->bracket_group ?: 'default';
                $groupKey = $m->match_mode . '___' . $bGroup;
                $groupMatrices = $matricesByGroup->get($groupKey, collect());

                $matrix = $groupMatrices
                    ->where('bracket_stage', $m->stage === 'quarterfinal' ? 'round_of_8' : $m->stage)
                    ->where('bracket_position', $m->bracket_position)
                    ->first();

                if ($matrix) {
                    $effHome = $this->resolveEffectiveSource($matrix->home_source, $groupMatrices);
                    $effAway = $this->resolveEffectiveSource($matrix->away_source, $groupMatrices);

                    $homePlaceholder = $this->formatSourceToLabel($effHome, $m->match_mode, $stageMap, $bGroup);
                    $awayPlaceholder = $this->formatSourceToLabel($effAway, $m->match_mode, $stageMap, $bGroup);
                    $m->update([
                        'home_placeholder' => $homePlaceholder,
                        'away_placeholder' => $awayPlaceholder,
                    ]);
                }
            }

            // Assign default referee (Wasit Utama/Default) ke seluruh match yang belum ada wasitnya
            $defaultReferee = \App\Models\User::where('role', 'referee')->first()
                ?? \App\Models\User::where('role', 'admin')->first();

            if ($defaultReferee) {
                Match_::where('tournament_id', $tournament->id)
                    ->whereNull('referee_id')
                    ->update(['referee_id' => $defaultReferee->id]);
            }

            // Update status jadwal ke draft
            $tournament->update(['schedule_status' => 'draft']);

            DB::commit();

            return $stats;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // FASE 2: MODE TEAM (slot_span = 3 slot berturut-turut = 150 menit)
    // ─────────────────────────────────────────────────────────────────

    protected function scheduleTeamModeMatches(Tournament $tournament, Collection $courts): int
    {
        $count     = 0;
        $teamModes = ['team_regu', 'team_double'];

        foreach ($teamModes as $mode) {
            if (!$tournament->hasActiveMode($mode)) {
                continue;
            }

            // Ambil pools KHUSUS mode ini dengan relasi superTeams
            $pools = Pool::where('tournament_id', $tournament->id)
                ->where('match_mode', $mode)
                ->with('superTeams')
                ->get();

            foreach ($pools as $pool) {
                $superTeams = $pool->superTeams ?? collect();
                $teamCount  = $superTeams->count();

                // Round-robin pool matches: setiap pasangan bertemu 1 kali
                for ($i = 0; $i < $teamCount; $i++) {
                    for ($j = $i + 1; $j < $teamCount; $j++) {
                        $homeId = $superTeams[$i]->id;
                        $awayId = $superTeams[$j]->id;

                        // Cari slot 3 berturut-turut yang tersedia
                        $slot = $this->findNextAvailableSlot($courts, $span = 3, $homeId, $awayId, isSuper: true);

                        if (!$slot) {
                            Match_::create([
                                'tournament_id'      => $tournament->id,
                                'pool_id'            => $pool->id,
                                'match_mode'         => $mode,
                                'stage'              => 'pool',
                                'home_super_team_id' => $homeId,
                                'away_super_team_id' => $awayId,
                                'slot_span'          => 3,
                                'status'             => 'scheduled',
                            ]);
                            $count++;
                            continue;
                        }

                        $match = Match_::create([
                            'tournament_id'      => $tournament->id,
                            'pool_id'            => $pool->id,
                            'match_mode'         => $mode,
                            'stage'              => 'pool',
                            'home_super_team_id' => $homeId,
                            'away_super_team_id' => $awayId,
                            'court_id'           => $slot['court_id'],
                            'time_slot_id'       => $slot['slot_id'],
                            'day_number'         => $slot['day_number'],
                            'slot_span'          => 3,
                            'status'             => 'scheduled',
                            'scheduled_at'       => $slot['start_time'],
                        ]);

                        // Mark slot sebagai occupied
                        $this->markOccupied($slot['court_id'], $slot['slot_ids'], $homeId, $awayId, true);
                        $count++;
                    }
                }
            }
        }

        return $count;
    }

    // ─────────────────────────────────────────────────────────────────
    // FASE 3: POOL MATCHES TUNGGAL (regu, double, quadrant)
    // ─────────────────────────────────────────────────────────────────

    protected function scheduleSingleModePoolMatches(Tournament $tournament, Collection $courts): int
    {
        $count       = 0;
        $singleModes = ['regu', 'double', 'quadrant'];

        // Kumpulkan semua match pool yang perlu dijadwalkan
        $allPoolMatches = collect();

        foreach ($singleModes as $mode) {
            if (!$tournament->hasActiveMode($mode)) {
                continue;
            }

            $pools = Pool::where('tournament_id', $tournament->id)
                ->where('match_mode', $mode)
                ->with('teams')
                ->get();

            foreach ($pools as $pool) {
                $teams     = $pool->teams;
                $teamCount = $teams->count();

                // Generate round-robin pairs
                for ($i = 0; $i < $teamCount; $i++) {
                    for ($j = $i + 1; $j < $teamCount; $j++) {
                        $allPoolMatches->push([
                            'tournament_id' => $tournament->id,
                            'pool_id'       => $pool->id,
                            'match_mode'    => $mode,
                            'home_team_id'  => $teams[$i]->id,
                            'away_team_id'  => $teams[$j]->id,
                        ]);
                    }
                }
            }
        }

        // Distribusikan match ke slot secara round-robin lintas lapangan & hari
        foreach ($allPoolMatches as $matchData) {
            $slot = $this->findNextAvailableSlot(
                $courts,
                span: 1,
                homeId: $matchData['home_team_id'],
                awayId: $matchData['away_team_id'],
                isSuper: false
            );

            if (!$slot) {
                // Jadwal penuh — match tetap dibuat tapi tanpa slot
                Match_::create([
                    ...$matchData,
                    'stage'  => 'pool',
                    'status' => 'scheduled',
                ]);
                continue;
            }

            $match = Match_::create([
                ...$matchData,
                'stage'        => 'pool',
                'court_id'     => $slot['court_id'],
                'time_slot_id' => $slot['slot_id'],
                'day_number'   => $slot['day_number'],
                'slot_span'    => 1,
                'status'       => 'scheduled',
                'scheduled_at' => $slot['start_time'],
            ]);

            $this->markOccupied($slot['court_id'], $slot['slot_ids'], $matchData['home_team_id'], $matchData['away_team_id'], false);
            $count++;
        }

        return $count;
    }

    // ─────────────────────────────────────────────────────────────────
    // FASE 4: BRACKET PLACEHOLDER MATCHES
    // ─────────────────────────────────────────────────────────────────

    protected function createBracketPlaceholderMatches(Tournament $tournament, Collection $courts): int
    {
        $count = 0;

        // Rebuild Bracket Matrix otomatis per mode aktif HANYA jika belum ada konfigurasi sama sekali
        $activeModes = $tournament->modes()->where('is_active', true)->pluck('match_mode');
        foreach ($activeModes as $mode) {
            $existingMatrixCount = BracketMatrix::where('tournament_id', $tournament->id)->where('match_mode', $mode)->count();
            if ($existingMatrixCount === 0) {
                $pools = Pool::where('tournament_id', $tournament->id)->where('match_mode', $mode)->get();
                $bracketsGrouped = $pools->groupBy('bracket_name');
                if ($bracketsGrouped->count() > 1) {
                    $bracketsConfig = [];
                    foreach ($bracketsGrouped as $bName => $bPools) {
                        $bracketsConfig[] = [
                            'name'       => $bName ?: 'Braket',
                            'pool_count' => $bPools->count(),
                        ];
                    }
                    app(\App\Http\Controllers\PoolController::class)->syncMultiBracketMatrix($tournament, $mode, $bracketsConfig);
                } else {
                    $poolCount = $pools->count();
                    if ($poolCount === 0) $poolCount = 1; // fallback
                    app(\App\Http\Controllers\PoolController::class)->syncBracketMatrixForMode($tournament, $mode, $poolCount);
                }
            }
        }

        // Ambil semua konfigurasi bracket matrix per mode yang baru
        $matrices = BracketMatrix::where('tournament_id', $tournament->id)
            ->orderBy('match_mode')
            ->orderByRaw("CASE bracket_stage WHEN 'round_of_32' THEN 1 WHEN 'round_of_16' THEN 2 WHEN 'round_of_8' THEN 3 WHEN 'semifinal' THEN 4 WHEN 'third_place' THEN 5 WHEN 'final' THEN 6 ELSE 7 END")
            ->orderBy('bracket_position')
            ->get();

        // Kelompokkan per grup braket (mode + nama braket) agar multi-braket tidak saling menimpa
        $matrixByGroup = $matrices->groupBy(fn($item) => $item->match_mode . '___' . ($item->bracket_name ?: 'default'));

        foreach ($matrixByGroup as $groupKey => $groupMatrices) {
            $firstMatrix = $groupMatrices->first();
            $mode        = $firstMatrix->match_mode;
            $bracketName = $firstMatrix->bracket_name;

            // Cari slot pool terakhir untuk mode ini (dependency chain)
            $lastPoolSlot = $this->getLastPoolSlotForMode($tournament, $mode);
            $afterSlotId  = $lastPoolSlot?->id;

            // Track next_match_id: final dibuat dulu, lalu semifinal, lalu QF
            $previousStageMatches = [];

            $stageOrder = ['round_of_32', 'round_of_16', 'round_of_8', 'semifinal', 'third_place', 'final'];
            $stageGroups = $groupMatrices->groupBy('bracket_stage');

            // LANGKAH 1: Buat Record Matches dari Final ke Belakang (agar next_match_id terisi)
            $createdMatches = [];
            foreach (array_reverse($stageOrder) as $stage) {
                if (!isset($stageGroups[$stage])) {
                    continue;
                }

                foreach ($stageGroups[$stage] as $matrix) {
                    // JIKA SALAH SATU ATAU KEDUA SISI BYE: JANGAN BUAT MATCH DI DATABASE!
                    // Tim yang mendapat BYE lolos otomatis ke babak berikutnya tanpa tanding di jadwal.
                    $homeIsBye = strtolower(trim($matrix->home_source)) === 'bye';
                    $awayIsBye = strtolower(trim($matrix->away_source)) === 'bye';
                    if ($homeIsBye || $awayIsBye) {
                        continue;
                    }

                    // Resolusi sumber efektif (jika babak sebelumnya adalah BYE, ambil tim yang lolos otomatis)
                    $effHome = $this->resolveEffectiveSource($matrix->home_source, $groupMatrices);
                    $effAway = $this->resolveEffectiveSource($matrix->away_source, $groupMatrices);

                    $nextMatchId     = $this->resolveNextMatchId($stage, $matrix->bracket_position, $previousStageMatches);
                    $homePlaceholder = $this->sourceToBracketLabel($effHome);
                    $awayPlaceholder = $this->sourceToBracketLabel($effAway);
                    $isTeamMode      = in_array($mode, ['team_regu', 'team_double']);
                    $matchStage      = ($stage === 'round_of_8') ? 'quarterfinal' : $stage;

                    $match = Match_::create([
                        'tournament_id'    => $tournament->id,
                        'match_mode'       => $mode,
                        'stage'            => $matchStage,
                        'bracket_position' => $matrix->bracket_position,
                        'bracket_group'    => $matrix->bracket_name,
                        'home_placeholder' => $homePlaceholder,
                        'away_placeholder' => $awayPlaceholder,
                        'next_match_id'    => $nextMatchId,
                        'slot_span'        => $isTeamMode ? 3 : 1,
                        'status'           => 'scheduled',
                    ]);

                    $previousStageMatches[$stage][$matrix->bracket_position] = $match->id;
                    $createdMatches[] = $match;
                    $count++;
                }
            }

            // LANGKAH 2: Plotting Slot Waktu secara Kronologis MAJU (QF -> Semifinal -> Final)
            $forwardStages = ['round_of_32', 'round_of_16', 'quarterfinal', 'semifinal', 'third_place', 'final'];
            $lastStageSlotId = $afterSlotId;

            foreach ($forwardStages as $stage) {
                $stageMatches = Match_::where('tournament_id', $tournament->id)
                    ->where('match_mode', $mode)
                    ->when($bracketName, fn($q) => $q->where('bracket_group', $bracketName))
                    ->where('stage', $stage)
                    ->orderBy('bracket_position')
                    ->get();

                if ($stageMatches->isEmpty()) continue;

                $maxSlotIdInStage = $lastStageSlotId;

                foreach ($stageMatches as $m) {
                    $slot = $this->findNextAvailableSlotAfter($courts, $m->slot_span ?: 1, $lastStageSlotId);
                    if ($slot) {
                        $m->update([
                            'court_id'     => $slot['court_id'],
                            'time_slot_id' => $slot['slot_id'],
                            'day_number'   => $slot['day_number'],
                            'scheduled_at' => $slot['start_time'],
                        ]);
                        $this->markSlotOccupied($slot['court_id'], $slot['slot_ids']);
                        $stageEndSlotId = $slot['slot_ids'][array_key_last($slot['slot_ids'])];
                        if (!$maxSlotIdInStage || $stageEndSlotId > $maxSlotIdInStage) {
                            $maxSlotIdInStage = $stageEndSlotId;
                        }
                    }
                }

                // Stage berikutnya (SF/Final) baru dimulai SETELAH stage ini selesai
                $lastStageSlotId = $maxSlotIdInStage;
            }
        }

        return $count;
    }

    // ─────────────────────────────────────────────────────────────────
    // HELPER: Cari Slot Tersedia
    // ─────────────────────────────────────────────────────────────────

    /**
     * Cari slot berikutnya yang tersedia di lapangan manapun.
     * Mempertimbangkan rest time antar mode (slot N dan N+1 terblokir untuk tim yang sama).
     *
     * @param  Collection $courts
     * @param  int        $span     Berapa slot dibutuhkan (1 atau 3)
     * @param  int        $homeId   ID tim/super tim A
     * @param  int        $awayId   ID tim/super tim B
     * @param  bool       $isSuper  Apakah ini ID super team (bukan team biasa)
     * @return array|null { slot_id, slot_ids, court_id, day_number, start_time }
     */
    protected function findNextAvailableSlot(
        Collection $courts,
        int $span,
        int $homeId,
        int $awayId,
        bool $isSuper
    ): ?array {
        $courtIds = $courts->pluck('id')->toArray();
        $homeKey = ($isSuper ? 'super_' : '') . $homeId;
        $awayKey = ($isSuper ? 'super_' : '') . $awayId;

        // Pass 1: Cari slot dengan rest time yang ideal (1 sesi jeda)
        for ($i = 0; $i < $this->matchSlots->count(); $i++) {
            $slot = $this->matchSlots[$i];

            // Untuk span > 1, kumpulkan slot berturutan
            if ($span > 1) {
                $consecutiveSlots = $this->getConsecutiveSlots($i, $span);
                if (!$consecutiveSlots) {
                    continue;
                }
                $slotIds = $consecutiveSlots->pluck('id')->toArray();
            } else {
                $slotIds = [$slot->id];
            }

            // Cek rest time untuk kedua tim
            if ($this->isRestViolation($homeKey, $slotIds[0]) || $this->isRestViolation($awayKey, $slotIds[0])) {
                continue;
            }

            // Cek slot tersedia di lapangan manapun
            foreach ($courtIds as $courtId) {
                $allClear = true;
                foreach ($slotIds as $slotId) {
                    if (isset($this->courtSlotMap[$courtId][$slotId])) {
                        $allClear = false;
                        break;
                    }
                }

                if ($allClear) {
                    return [
                        'slot_id'    => $slotIds[0],
                        'slot_ids'   => $slotIds,
                        'court_id'   => $courtId,
                        'day_number' => $slot->day_number,
                        'start_time' => $slot->start_time,
                    ];
                }
            }
        }

        // Pass 2: Fallback jika rest time membuat slot kosong tidak terpakai (agar match TIDAK HILANG / UNSCHEDULED)
        for ($i = 0; $i < $this->matchSlots->count(); $i++) {
            $slot = $this->matchSlots[$i];

            if ($span > 1) {
                $consecutiveSlots = $this->getConsecutiveSlots($i, $span);
                if (!$consecutiveSlots) {
                    continue;
                }
                $slotIds = $consecutiveSlots->pluck('id')->toArray();
            } else {
                $slotIds = [$slot->id];
            }

            // Hindari hanya jika tim bertanding di jam yang PERSIS sama di lapangan lain (bentrok waktu langsung)
            if ($this->isSameSlotClash($homeKey, $slotIds) || $this->isSameSlotClash($awayKey, $slotIds)) {
                continue;
            }

            foreach ($courtIds as $courtId) {
                $allClear = true;
                foreach ($slotIds as $slotId) {
                    if (isset($this->courtSlotMap[$courtId][$slotId])) {
                        $allClear = false;
                        break;
                    }
                }

                if ($allClear) {
                    return [
                        'slot_id'    => $slotIds[0],
                        'slot_ids'   => $slotIds,
                        'court_id'   => $courtId,
                        'day_number' => $slot->day_number,
                        'start_time' => $slot->start_time,
                    ];
                }
            }
        }

        return null; // Tidak ada slot tersedia
    }

    /**
     * Cari slot tersedia SETELAH slot tertentu (untuk bracket dependency).
     */
    protected function findNextAvailableSlotAfter(Collection $courts, int $span, ?int $afterSlotId): ?array
    {
        $afterSlotNumber = 0;
        $afterDayNumber  = 0;

        if ($afterSlotId) {
            $afterSlot = $this->matchSlots->firstWhere('id', $afterSlotId);
            if ($afterSlot) {
                $afterSlotNumber = $afterSlot->slot_number;
                $afterDayNumber  = $afterSlot->day_number;
            }
        }

        $courtIds = $courts->pluck('id')->toArray();

        foreach ($this->matchSlots as $i => $slot) {
            // Sisakan satu sesi jeda setelah stage sebelumnya.
            if ($slot->day_number < $afterDayNumber) {
                continue;
            }
            if ($slot->day_number === $afterDayNumber && $slot->slot_number <= $afterSlotNumber + 1) {
                continue;
            }

            $slotIds = $span > 1
                ? ($this->getConsecutiveSlots($i, $span)?->pluck('id')->toArray() ?? [$slot->id])
                : [$slot->id];

            foreach ($courtIds as $courtId) {
                $allClear = true;
                foreach ($slotIds as $slotId) {
                    if (isset($this->courtSlotMap[$courtId][$slotId])) {
                        $allClear = false;
                        break;
                    }
                }
                if ($allClear) {
                    return [
                        'slot_id'    => $slotIds[0],
                        'slot_ids'   => $slotIds,
                        'court_id'   => $courtId,
                        'day_number' => $slot->day_number,
                        'start_time' => $slot->start_time,
                    ];
                }
            }
        }

        // Fallback untuk bracket jika ketat
        foreach ($this->matchSlots as $i => $slot) {
            if ($slot->day_number < $afterDayNumber) continue;
            if ($slot->day_number === $afterDayNumber && $slot->slot_number <= $afterSlotNumber) continue;

            $slotIds = $span > 1
                ? ($this->getConsecutiveSlots($i, $span)?->pluck('id')->toArray() ?? [$slot->id])
                : [$slot->id];

            foreach ($courtIds as $courtId) {
                $allClear = true;
                foreach ($slotIds as $slotId) {
                    if (isset($this->courtSlotMap[$courtId][$slotId])) {
                        $allClear = false;
                        break;
                    }
                }
                if ($allClear) {
                    return [
                        'slot_id'    => $slotIds[0],
                        'slot_ids'   => $slotIds,
                        'court_id'   => $courtId,
                        'day_number' => $slot->day_number,
                        'start_time' => $slot->start_time,
                    ];
                }
            }
        }

        return null;
    }

    /**
     * Cek apakah slot kandidat masih memberi satu sesi jeda.
     * Tim tidak boleh bermain di sesi yang sama atau sesi berikutnya.
     */
    protected function isRestViolation(string $teamKey, int $slotId): bool
    {
        if (!isset($this->teamOccupiedSlots[$teamKey])) {
            return false;
        }

        $occupied = $this->teamOccupiedSlots[$teamKey];
        if (empty($occupied)) {
            return false;
        }

        // Slot yang sama harus diblokir agar tim tidak bermain di lapangan lain.
        if (in_array($slotId, $occupied)) {
            return true;
        }

        // Cari posisi slot ini dalam daftar semua slot
        $slotIndex = $this->matchSlots->search(fn($s) => $s->id === $slotId);
        if ($slotIndex === false || $slotIndex === 0) {
            return false;
        }

        $currSlot = $this->matchSlots[$slotIndex];
        $prevSlot = $this->matchSlots[$slotIndex - 1];

        // Jika slot sebelumnya berada di HARI BERBEDA, ada jeda semalam (bukan pelanggaran)
        if ($prevSlot->day_number !== $currSlot->day_number) {
            return false;
        }

        return in_array($prevSlot->id, $occupied);
    }

    protected function isSameSlotClash(string $teamKey, array $slotIds): bool
    {
        if (!isset($this->teamOccupiedSlots[$teamKey])) {
            return false;
        }

        $occupied = $this->teamOccupiedSlots[$teamKey];
        foreach ($slotIds as $sId) {
            if (in_array($sId, $occupied)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Ambil N slot berurutan mulai dari index i.
     */
    protected function getConsecutiveSlots(int $startIndex, int $span): ?Collection
    {
        $result = collect();
        $slots  = $this->matchSlots;

        for ($k = 0; $k < $span; $k++) {
            $idx = $startIndex + $k;
            if (!isset($slots[$idx])) {
                return null;
            }

            $curr = $slots[$idx];
            if ($curr->slot_type !== 'match') {
                return null;
            }

            // Harus hari yang sama dan slot berurutan
            if ($k > 0) {
                $prev = $slots[$idx - 1];
                if ($prev->day_number !== $curr->day_number || $curr->slot_number !== $prev->slot_number + 1) {
                    return null;
                }
            }

            $result->push($curr);
        }

        return $result;
    }

    // ─────────────────────────────────────────────────────────────────
    // HELPER: Mark Occupied
    // ─────────────────────────────────────────────────────────────────

    protected function markOccupied(int $courtId, array $slotIds, int $homeId, int $awayId, bool $isSuper): void
    {
        $homeKey = ($isSuper ? 'super_' : '') . $homeId;
        $awayKey = ($isSuper ? 'super_' : '') . $awayId;

        foreach ($slotIds as $slotId) {
            $this->courtSlotMap[$courtId][$slotId] = true;
            $this->teamOccupiedSlots[$homeKey][]   = $slotId;
            $this->teamOccupiedSlots[$awayKey][]   = $slotId;
        }
    }

    protected function markSlotOccupied(int $courtId, array $slotIds): void
    {
        foreach ($slotIds as $slotId) {
            $this->courtSlotMap[$courtId][$slotId] = true;
        }
    }

    protected function buildCourtSlotMap(Collection $courts): void
    {
        foreach ($courts as $court) {
            $this->courtSlotMap[$court->id] = [];
        }

        // Isi dengan match yang sudah terjadwal sebelumnya (yang live/finished)
        $existingMatches = Match_::whereIn('court_id', $courts->pluck('id'))
            ->whereNotNull('time_slot_id')
            ->whereIn('status', ['live', 'finished', 'setup'])
            ->get();

        foreach ($existingMatches as $m) {
            $this->courtSlotMap[$m->court_id][$m->time_slot_id] = true;
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // HELPER: Bracket Support
    // ─────────────────────────────────────────────────────────────────

    /**
     * Ambil slot waktu pool match terakhir untuk mode tertentu.
     */
    protected function getLastPoolSlotForMode(Tournament $tournament, string $mode): ?TimeSlot
    {
        $lastMatch = Match_::where('tournament_id', $tournament->id)
            ->where('match_mode', $mode)
            ->where('stage', 'pool')
            ->whereNotNull('time_slot_id')
            ->orderByDesc('day_number')
            ->orderByDesc('time_slot_id')
            ->first();

        if (!$lastMatch?->timeSlot) {
            return null;
        }

        $startIndex = $this->matchSlots->search(fn($slot) => $slot->id === $lastMatch->time_slot_id);
        if ($startIndex === false) {
            return $lastMatch->timeSlot;
        }

        return $this->matchSlots[$startIndex + max(0, ($lastMatch->slot_span ?? 1) - 1)]
            ?? $lastMatch->timeSlot;
    }

    /**
     * Resolve effective source string through any BYE matches.
     * If source points to winner of a match that was a BYE (e.g. winner_r16_1 where R16 #1 had Juara Pool A vs BYE),
     * resolve directly to that advancing team (e.g. 'pool_A_rank_1').
     */
    protected function resolveEffectiveSource(string $source, Collection $bracketMatrices): string
    {
        $parsed = BracketMatrix::parseSource($source);
        if ($parsed['type'] !== 'winner') {
            return $source;
        }

        $stage = match ($parsed['stage'] ?? null) {
            'round_of_32', 'r32' => 'round_of_32',
            'round_of_16', 'r16' => 'round_of_16',
            'quarterfinal', 'qf', 'round_of_8' => 'round_of_8',
            'semifinal', 'sf' => 'semifinal',
            default => null,
        };

        if (!$stage) {
            return $source;
        }

        $pos = (int) ($parsed['position'] ?? 0);
        $targetMatrix = $bracketMatrices->first(function ($m) use ($stage, $pos) {
            return $m->bracket_stage === $stage && (int) $m->bracket_position === $pos;
        });

        if (!$targetMatrix) {
            return $source;
        }

        $homeIsBye = strtolower(trim($targetMatrix->home_source)) === 'bye';
        $awayIsBye = strtolower(trim($targetMatrix->away_source)) === 'bye';

        if ($awayIsBye && !$homeIsBye) {
            return $this->resolveEffectiveSource($targetMatrix->home_source, $bracketMatrices);
        }

        if ($homeIsBye && !$awayIsBye) {
            return $this->resolveEffectiveSource($targetMatrix->away_source, $bracketMatrices);
        }

        return $source;
    }

    protected function resolveNextMatchId(string $stage, int $position, array $previousStageMatches): ?int
    {
        $nextStageMap = [
            'round_of_32' => 'round_of_16',
            'round_of_16' => 'round_of_8',
            'round_of_8'  => 'semifinal',
            'semifinal'   => 'final',
        ];

        if (!isset($nextStageMap[$stage])) {
            return null;
        }

        $nextStage  = $nextStageMap[$stage];
        $nextPos    = (int) ceil($position / 2); // QF1,QF2 → SF1; QF3,QF4 → SF2

        if (isset($previousStageMatches[$nextStage][$nextPos])) {
            return $previousStageMatches[$nextStage][$nextPos];
        }

        return $this->resolveNextMatchId($nextStage, $nextPos, $previousStageMatches);
    }

    /**
     * Konversi source string ke label placeholder yang bisa dibaca manusia.
     * "pool_A_rank_1" → "Juara Pool A"
     * "winner_qf_1"   → "Pemenang #13" (menggunakan nomor match urut #ID)
     */
    protected function sourceToBracketLabel(string $source): string
    {
        $parsed = BracketMatrix::parseSource($source);
        return match ($parsed['type']) {
            'pool'     => match ((int) ($parsed['rank'] ?? 1)) {
                1 => "Juara Pool {$parsed['pool']}",
                2 => "Runner-up Pool {$parsed['pool']}",
                default => "Peringkat {$parsed['rank']} Pool {$parsed['pool']}",
            },
            'bye'      => 'BYE',
            'best_runner_up' => isset($parsed['position']) && $parsed['position'] > 1
                ? "Runner-up Terbaik #{$parsed['position']}"
                : "Runner-up Terbaik",
            'wildcard' => "Wildcard #{$parsed['position']}",
            'winner'   => match ($parsed['stage'] ?? null) {
                'round_of_32'  => "Pemenang R32 #{$parsed['position']}",
                'round_of_16'  => "Pemenang R16 #{$parsed['position']}",
                'quarterfinal' => "Pemenang QF #{$parsed['position']}",
                'semifinal'    => "Pemenang SF #{$parsed['position']}",
                default        => "Pemenang Match #{$parsed['position']}",
            },
            'loser'    => match ($parsed['stage'] ?? null) {
                'semifinal' => "Kalah SF #{$parsed['position']}",
                default     => "Kalah Match #{$parsed['position']}",
            },
            default    => $source,
        };
    }

    protected function formatSourceToLabel(string $source, string $mode, array $stageMap, ?string $bracketGroup = null): string
    {
        $parsed = BracketMatrix::parseSource($source);
        $bGroup = $bracketGroup ?: 'default';

        $getMatchNum = function (string $stageKey, int $pos) use ($stageMap, $mode, $bGroup) {
            return $stageMap[$mode][$bGroup][$stageKey][$pos]
                ?? $stageMap[$mode]['default'][$stageKey][$pos]
                ?? ($stageMap[$mode][$stageKey][$pos] ?? null);
        };

        return match ($parsed['type']) {
            'pool'     => match ((int) ($parsed['rank'] ?? 1)) {
                1 => "Juara Pool {$parsed['pool']}",
                2 => "Runner-up Pool {$parsed['pool']}",
                default => "Peringkat {$parsed['rank']} Pool {$parsed['pool']}",
            },
            'bye'      => 'BYE',
            'best_runner_up' => isset($parsed['position']) && $parsed['position'] > 1
                ? "Runner-up Terbaik #{$parsed['position']}"
                : "Runner-up Terbaik",
            'wildcard' => "Wildcard #{$parsed['position']}",
            'winner'   => match ($parsed['stage'] ?? null) {
                'round_of_32', 'r32' => ($num = $getMatchNum('round_of_32', $parsed['position']))
                    ? "Pemenang Match #{$num}"
                    : "Pemenang R32 #{$parsed['position']}",
                'round_of_16', 'r16' => ($num = $getMatchNum('round_of_16', $parsed['position']))
                    ? "Pemenang Match #{$num}"
                    : "Pemenang R16 #{$parsed['position']}",
                'quarterfinal', 'qf', 'round_of_8' => ($num = ($getMatchNum('quarterfinal', $parsed['position']) ?? $getMatchNum('round_of_8', $parsed['position'])))
                    ? "Pemenang Match #{$num}"
                    : "Pemenang QF #{$parsed['position']}",
                'semifinal', 'sf'  => ($num = $getMatchNum('semifinal', $parsed['position']))
                    ? "Pemenang Match #{$num}"
                    : "Pemenang SF #{$parsed['position']}",
                default => isset($parsed['position']) && ($num = $getMatchNum($parsed['stage'] ?? '', $parsed['position']))
                    ? "Pemenang Match #{$num}"
                    : "Pemenang Match #" . ($parsed['position'] ?? '?'),
            },
            'loser'    => match ($parsed['stage'] ?? null) {
                'semifinal', 'sf' => ($num = $getMatchNum('semifinal', $parsed['position']))
                    ? "Kalah Match #{$num}"
                    : "Kalah SF #{$parsed['position']}",
                default => "Kalah Match #" . ($parsed['position'] ?? '?'),
            },
            default    => $source,
        };
    }
}
