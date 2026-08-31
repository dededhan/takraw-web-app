<?php

namespace App\Services;

use App\Models\Court;
use App\Models\TimeSlot;
use App\Models\Tournament;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * TimeSlotGeneratorService
 *
 * Bertanggung jawab men-generate semua slot waktu untuk seluruh hari turnamen
 * berdasarkan konfigurasi parameter yang diisi Admin (Tahap 1 - Config Wizard).
 *
 * Juga men-generate tabel courts berdasarkan jumlah lapangan.
 *
 * ISHOMA berlaku serentak untuk SEMUA lapangan (sesuai klarifikasi Q3).
 */
class TimeSlotGeneratorService
{
    /**
     * Generate courts dan time_slots untuk satu turnamen.
     * Hapus data lama sebelum generate ulang.
     *
     * @param  Tournament $tournament
     * @return array { courts: Collection, time_slots: Collection }
     */
    public function generate(Tournament $tournament): array
    {
        DB::beginTransaction();
        try {
            // 1. Hapus courts & time_slots lama
            $tournament->courts()->delete();
            $tournament->timeSlots()->delete();

            // 2. Generate courts
            $courts = $this->generateCourts($tournament);

            // 3. Generate time slots untuk setiap hari
            $allSlots = collect();
            for ($day = 1; $day <= $tournament->total_days; $day++) {
                $daySlots = $this->generateDaySlots($tournament, $day);
                $allSlots = $allSlots->merge($daySlots);
            }

            DB::commit();

            return [
                'courts'     => $courts,
                'time_slots' => $allSlots,
            ];
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Generate entri lapangan di tabel courts.
     */
    protected function generateCourts(Tournament $tournament): Collection
    {
        $courts = collect();
        for ($i = 1; $i <= $tournament->courts_count; $i++) {
            $court = Court::create([
                'tournament_id' => $tournament->id,
                'court_number'  => $i,
                'name'          => "Lapangan {$i}",
                'is_active'     => true,
            ]);
            $courts->push($court);
        }
        return $courts;
    }

    /**
     * Generate semua slot waktu untuk satu hari.
     * Urutan: UPP (hari 1 saja) → Sesi match → ISHOMA (serentak semua lapangan) → lanjut
     *
     * @param  Tournament $tournament
     * @param  int        $dayNumber   Hari ke-N (1-based)
     * @return Collection<TimeSlot>
     */
    protected function generateDaySlots(Tournament $tournament, int $dayNumber): Collection
    {
        $slots    = collect();
        $startDate = Carbon::parse($tournament->start_date)->addDays($dayNumber - 1);

        // Waktu mulai & akhir sesi
        $sessionStart = $startDate->copy()->setTimeFromTimeString($tournament->session_start_time);
        $sessionEnd   = $startDate->copy()->setTimeFromTimeString($tournament->session_end_time);

        // Konfigurasi ISHOMA
        $hasIshoma    = !is_null($tournament->ishoma_start_time);
        $ishomaStart  = $hasIshoma
            ? $startDate->copy()->setTimeFromTimeString($tournament->ishoma_start_time)
            : null;
        $ishomaEnd    = $hasIshoma
            ? $startDate->copy()->setTimeFromTimeString($tournament->ishoma_end_time)
            : null;

        $sessionDuration = (int) $tournament->session_duration_minutes;
        $breakDuration   = (int) $tournament->break_duration_minutes;

        $current    = $sessionStart->copy();
        $slotNumber = 1;
        $ishomaInserted = false;

        while ($current < $sessionEnd) {
            // ─── Cek ISHOMA ──────────────────────────────────
            if ($hasIshoma && !$ishomaInserted && $ishomaStart && $current >= $ishomaStart) {
                // Insert slot ISHOMA (berlaku serentak semua lapangan)
                $ishomaLabel = 'ISHOMA ' . $ishomaStart->format('H:i') . ' - ' . $ishomaEnd->format('H:i');
                $slots->push(TimeSlot::create([
                    'tournament_id' => $tournament->id,
                    'day_number'    => $dayNumber,
                    'slot_number'   => $slotNumber++,
                    'start_time'    => $ishomaStart,
                    'end_time'      => $ishomaEnd,
                    'slot_type'     => 'ishoma',
                    'label'         => $ishomaLabel,
                ]));
                $current = $ishomaEnd->copy();
                $ishomaInserted = true;
                continue;
            }

            // ─── Hitung akhir slot match ──────────────────────
            $slotEnd = $current->copy()->addMinutes($sessionDuration);

            // Jangan melebihi jam akhir sesi
            if ($slotEnd > $sessionEnd) {
                break;
            }

            // Jangan overlap dengan ISHOMA
            if ($hasIshoma && !$ishomaInserted && $ishomaStart && $slotEnd > $ishomaStart) {
                // Maju langsung ke ISHOMA jika slot ini menabrak jam ISHOMA
                $current = $ishomaStart->copy();
                continue;
            }

            // ─── Insert slot match ────────────────────────────
            $label = $current->format('H:i') . ' - ' . $slotEnd->format('H:i');
            $slots->push(TimeSlot::create([
                'tournament_id' => $tournament->id,
                'day_number'    => $dayNumber,
                'slot_number'   => $slotNumber++,
                'start_time'    => $current->copy(),
                'end_time'      => $slotEnd->copy(),
                'slot_type'     => 'match',
                'label'         => $label,
            ]));

            // Geser ke slot berikutnya (slot + break)
            $current->addMinutes($sessionDuration + $breakDuration);
        }

        return $slots;
    }

    /**
     * Preview jumlah slot yang akan dihasilkan tanpa benar-benar menyimpan ke DB.
     * Berguna untuk Step 3 wizard (ringkasan sebelum generate).
     *
     * @return array { slots_per_day: int, match_slots_per_day: int, total_match_slots: int }
     */
    public function preview(Tournament $tournament): array
    {
        $sessionStart = Carbon::today()->setTimeFromTimeString($tournament->session_start_time ?? '08:00');
        $sessionEnd   = Carbon::today()->setTimeFromTimeString($tournament->session_end_time ?? '17:00');
        $hasIshoma    = !is_null($tournament->ishoma_start_time);
        $ishomaStart  = $hasIshoma
            ? Carbon::today()->setTimeFromTimeString($tournament->ishoma_start_time)
            : null;
        $ishomaEnd    = $hasIshoma
            ? Carbon::today()->setTimeFromTimeString($tournament->ishoma_end_time)
            : null;

        $sessionDuration = (int) ($tournament->session_duration_minutes ?? 50);
        $breakDuration   = (int) ($tournament->break_duration_minutes ?? 10);
        $slotInterval    = $sessionDuration + $breakDuration;

        $totalMinutes = $sessionEnd->diffInMinutes($sessionStart);

        // Kurangi ISHOMA
        $ishomaMinutes = 0;
        if ($hasIshoma && $ishomaStart && $ishomaEnd) {
            $ishomaMinutes = $ishomaEnd->diffInMinutes($ishomaStart);
        }

        $netMinutes      = $totalMinutes - $ishomaMinutes;
        $matchSlotsPerDay = (int) floor($netMinutes / $slotInterval);
        $slotsPerDay     = $matchSlotsPerDay + ($hasIshoma ? 1 : 0);
        $totalDays       = (int) ($tournament->total_days ?? 5);

        return [
            'slots_per_day'        => $slotsPerDay,
            'match_slots_per_day'  => $matchSlotsPerDay,
            'total_match_slots'    => $matchSlotsPerDay * $totalDays,
            'courts_count'         => (int) ($tournament->courts_count ?? 4),
            'total_capacity'       => $matchSlotsPerDay * $totalDays * (int) ($tournament->courts_count ?? 4),
        ];
    }
}
