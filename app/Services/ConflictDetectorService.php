<?php

namespace App\Services;

use App\Models\Match_;
use App\Models\ScheduleConflict;
use App\Models\TimeSlot;
use App\Models\Tournament;
use Illuminate\Support\Collection;

/**
 * ConflictDetectorService
 *
 * Mendeteksi 4 jenis konflik jadwal:
 * 1. time_overlap        — 2 match di lapangan & slot yang sama
 * 2. rest_violation      — Tim bermain di slot N dan N+1 tanpa jeda (lintas mode)
 * 3. bracket_dependency  — Bracket match lebih awal dari pool penyuplainya
 * 4. ishoma_overlap      — Match menimpa slot ISHOMA
 *
 * Dipanggil setelah auto-generate dan setelah setiap drag & drop.
 */
class ConflictDetectorService
{
    /**
     * Scan SELURUH jadwal turnamen dan simpan semua konflik.
     * Hapus konflik lama (resolved atau tidak) sebelum scan ulang.
     *
     * @return array{ errors: int, warnings: int, conflicts: Collection }
     */
    public function scanAll(Tournament $tournament): array
    {
        // Hapus semua konflik sebelumnya untuk turnamen ini
        ScheduleConflict::where('tournament_id', $tournament->id)->delete();

        $matches = Match_::where('tournament_id', $tournament->id)
            ->whereNotNull('time_slot_id')
            ->whereNotNull('court_id')
            ->with(['timeSlot', 'homeTeam', 'awayTeam', 'homeSuperTeam', 'awaySuperTeam'])
            ->get();

        $conflicts = collect();
        $conflicts = $conflicts
            ->merge($this->detectTimeOverlaps($tournament, $matches))
            ->merge($this->detectRestViolations($tournament, $matches))
            ->merge($this->detectBracketDependencies($tournament, $matches))
            ->merge($this->detectIshomaOverlaps($tournament, $matches));

        return [
            'errors'    => $conflicts->where('severity', 'error')->count(),
            'warnings'  => $conflicts->where('severity', 'warning')->count(),
            'conflicts' => $conflicts,
        ];
    }

    /**
     * Scan area lokal setelah drag & drop (hanya match yang berubah + tetangganya).
     * Lebih efisien daripada scan full.
     *
     * @return array{ errors: int, warnings: int, conflicts: Collection }
     */
    public function scanLocalArea(Match_ $changedMatch): array
    {
        $tournament = $changedMatch->tournament;

        // Hapus konflik lama hanya untuk match ini
        ScheduleConflict::where('match_id', $changedMatch->id)->delete();
        ScheduleConflict::where('conflicting_match_id', $changedMatch->id)->delete();

        // Ambil match di lapangan & hari yang sama untuk deteksi time_overlap
        $nearbyMatches = Match_::where('tournament_id', $tournament->id)
            ->where(function ($q) use ($changedMatch) {
                $q->where('court_id', $changedMatch->court_id)
                  ->orWhere('time_slot_id', $changedMatch->time_slot_id);
            })
            ->whereNotNull('time_slot_id')
            ->with(['timeSlot', 'homeTeam', 'awayTeam', 'homeSuperTeam', 'awaySuperTeam'])
            ->get();

        $allMatches = Match_::where('tournament_id', $tournament->id)
            ->whereNotNull('time_slot_id')
            ->with(['timeSlot', 'homeTeam', 'awayTeam', 'homeSuperTeam', 'awaySuperTeam'])
            ->get();

        $conflicts = collect();
        $conflicts = $conflicts
            ->merge($this->detectTimeOverlaps($tournament, $nearbyMatches))
            ->merge($this->detectRestViolations($tournament, $allMatches))
            ->merge($this->detectBracketDependencies($tournament, $allMatches))
            ->merge($this->detectIshomaOverlaps($tournament, collect([$changedMatch])));

        return [
            'errors'    => $conflicts->where('severity', 'error')->count(),
            'warnings'  => $conflicts->where('severity', 'warning')->count(),
            'conflicts' => $conflicts,
        ];
    }

    // ─────────────────────────────────────────────────────────────────
    // DETECTOR 1: Time Overlap
    // ─────────────────────────────────────────────────────────────────

    /**
     * Deteksi 2 match di lapangan & slot yang sama.
     */
    protected function detectTimeOverlaps(Tournament $tournament, Collection $matches): Collection
    {
        $conflicts = collect();

        // Kelompokkan per court × slot
        $grouped = $matches->groupBy(fn($m) => $m->court_id . '_' . $m->time_slot_id);

        foreach ($grouped as $key => $group) {
            if ($group->count() < 2) {
                continue;
            }

            // Setiap pasangan yang overlap
            $list = $group->values();
            for ($i = 0; $i < $list->count(); $i++) {
                for ($j = $i + 1; $j < $list->count(); $j++) {
                    $matchA = $list[$i];
                    $matchB = $list[$j];

                    $courtName = $matchA->court?->name ?? "Court #{$matchA->court_id}";
                    $slotLabel = $matchA->timeSlot?->label ?? "Slot #{$matchA->time_slot_id}";

                    $conflicts->push(ScheduleConflict::create([
                        'tournament_id'       => $tournament->id,
                        'match_id'            => $matchA->id,
                        'conflicting_match_id' => $matchB->id,
                        'conflict_type'       => 'time_overlap',
                        'severity'            => 'error',
                        'description'         => "Match #{$matchA->id} ({$matchA->home_display_name} vs {$matchA->away_display_name}) dan Match #{$matchB->id} ({$matchB->home_display_name} vs {$matchB->away_display_name}) dijadwalkan di {$courtName} pada slot yang sama ({$slotLabel}).",
                    ]));
                }
            }
        }

        return $conflicts;
    }

    // ─────────────────────────────────────────────────────────────────
    // DETECTOR 2: Rest Violation
    // ─────────────────────────────────────────────────────────────────

    /**
     * Deteksi tim yang bertanding di slot N dan slot N+1 tanpa jeda (lintas mode).
     * Sesuai klarifikasi Q4: ini adalah constraint utama yang diprioritaskan.
     */
    protected function detectRestViolations(Tournament $tournament, Collection $matches): Collection
    {
        $conflicts = collect();

        // Ambil semua slot match terurut
        $allSlots = TimeSlot::where('tournament_id', $tournament->id)
            ->where('slot_type', 'match')
            ->orderBy('day_number')
            ->orderBy('slot_number')
            ->get()
            ->keyBy('id');

        // Build: team_id → [slot_number (global) → match_id]
        $teamSlotMap = [];

        foreach ($matches as $match) {
            $slotId = $match->time_slot_id;
            if (!isset($allSlots[$slotId])) {
                continue;
            }

            $slot        = $allSlots[$slotId];
            $globalOrder = ($slot->day_number * 1000) + $slot->slot_number;

            // Daftar team IDs yang terlibat dalam match ini
            $teamIds = $this->getTeamIdsFromMatch($match);

            foreach ($teamIds as $teamKey) {
                $teamSlotMap[$teamKey][$globalOrder] = [
                    'match_id' => $match->id,
                    'slot'     => $slot,
                    'span'     => $match->slot_span ?? 1,
                ];
            }
        }

        // Cek konsekutif slot untuk setiap tim
        foreach ($teamSlotMap as $teamKey => $slotEntries) {
            ksort($slotEntries);
            $orders  = array_keys($slotEntries);
            $entries = array_values($slotEntries);

            for ($i = 0; $i < count($orders) - 1; $i++) {
                $currEntry = $entries[$i];
                $nextEntry = $entries[$i + 1];
                $currSpan  = $currEntry['span'];

                // Hitung slot akhir match saat ini
                $currEndOrder = $orders[$i] + ($currSpan - 1);

                // Jika slot berikutnya adalah tepat setelah match selesai → rest violation
                if ($orders[$i + 1] === $currEndOrder + 1) {
                    $matchA = $currEntry['match_id'];
                    $matchB = $nextEntry['match_id'];
                    $teamLabel = str_starts_with($teamKey, 'super_')
                        ? "Super Team #{$teamKey}"
                        : "Tim #{$teamKey}";

                    $conflicts->push(ScheduleConflict::create([
                        'tournament_id'        => $tournament->id,
                        'match_id'             => $matchA,
                        'conflicting_match_id' => $matchB,
                        'conflict_type'        => 'rest_violation',
                        'severity'             => 'error',
                        'description'          => "{$teamLabel} dijadwalkan bertanding di Match #{$matchA} lalu langsung di Match #{$matchB} pada slot berikutnya tanpa jeda. Minimal 1 slot jeda diperlukan.",
                    ]));
                }
            }
        }

        return $conflicts;
    }

    // ─────────────────────────────────────────────────────────────────
    // DETECTOR 3: Bracket Dependency
    // ─────────────────────────────────────────────────────────────────

    /**
     * Bracket match tidak boleh dijadwalkan sebelum pool penyuplainya selesai.
     */
    protected function detectBracketDependencies(Tournament $tournament, Collection $matches): Collection
    {
        $conflicts = collect();

        $bracketMatches = $matches->filter(fn($m) => $m->stage !== 'pool' && !is_null($m->time_slot_id));
        $poolMatches    = $matches->filter(fn($m) => $m->stage === 'pool' && !is_null($m->time_slot_id));

        if ($bracketMatches->isEmpty() || $poolMatches->isEmpty()) {
            return $conflicts;
        }

        // Ambil slot terakhir dari pool matches per mode
        $lastPoolSlotPerMode = $poolMatches->groupBy('match_mode')->map(function ($modeMatches) {
            return $modeMatches->max(fn($m) => ($m->timeSlot->day_number * 1000) + $m->timeSlot->slot_number);
        });

        foreach ($bracketMatches as $bracketMatch) {
            $mode = $bracketMatch->match_mode;
            if (!isset($lastPoolSlotPerMode[$mode])) {
                continue;
            }

            $bracketSlot  = $bracketMatch->timeSlot;
            $bracketOrder = ($bracketSlot->day_number * 1000) + $bracketSlot->slot_number;
            $lastPoolOrder = $lastPoolSlotPerMode[$mode];

            if ($bracketOrder <= $lastPoolOrder) {
                $conflicts->push(ScheduleConflict::create([
                    'tournament_id' => $tournament->id,
                    'match_id'      => $bracketMatch->id,
                    'conflict_type' => 'bracket_dependency',
                    'severity'      => 'error',
                    'description'   => "Bracket match #{$bracketMatch->id} (Mode: {$mode}, {$bracketMatch->stage}) dijadwalkan di Hari {$bracketSlot->day_number} Slot {$bracketSlot->slot_number}, namun pool penyuplainya baru selesai di urutan slot yang lebih akhir. Pindahkan ke slot yang lebih late.",
                ]));
            }
        }

        return $conflicts;
    }

    // ─────────────────────────────────────────────────────────────────
    // DETECTOR 4: ISHOMA Overlap
    // ─────────────────────────────────────────────────────────────────

    /**
     * Match yang ditaruh di atas slot ISHOMA.
     */
    protected function detectIshomaOverlaps(Tournament $tournament, Collection $matches): Collection
    {
        $conflicts = collect();

        // Ambil semua slot ISHOMA
        $ishomaSlots = TimeSlot::where('tournament_id', $tournament->id)
            ->where('slot_type', 'ishoma')
            ->get()
            ->keyBy('id');

        foreach ($matches as $match) {
            if (isset($ishomaSlots[$match->time_slot_id])) {
                $ishomaLabel = $ishomaSlots[$match->time_slot_id]->label ?? 'ISHOMA';
                $conflicts->push(ScheduleConflict::create([
                    'tournament_id' => $tournament->id,
                    'match_id'      => $match->id,
                    'conflict_type' => 'ishoma_overlap',
                    'severity'      => 'error',
                    'description'   => "Match #{$match->id} ({$match->home_display_name} vs {$match->away_display_name}) dijadwalkan di slot {$ishomaLabel} yang seharusnya diblokir untuk ISHOMA/istirahat.",
                ]));
            }
        }

        return $conflicts;
    }

    // ─────────────────────────────────────────────────────────────────
    // HELPER
    // ─────────────────────────────────────────────────────────────────

    /**
     * Ambil semua team/super-team keys yang terlibat dalam match ini.
     * Format key: "123" untuk tim biasa, "super_456" untuk super team.
     */
    protected function getTeamIdsFromMatch(Match_ $match): array
    {
        $ids = [];

        if ($match->home_team_id) {
            $ids[] = (string) $match->home_team_id;
        }
        if ($match->away_team_id) {
            $ids[] = (string) $match->away_team_id;
        }
        if ($match->home_super_team_id) {
            $ids[] = 'super_' . $match->home_super_team_id;
        }
        if ($match->away_super_team_id) {
            $ids[] = 'super_' . $match->away_super_team_id;
        }

        return $ids;
    }
}
