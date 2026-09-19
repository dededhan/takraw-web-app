<?php

namespace App\Observers;

use App\Jobs\ResolvePlaceholderJob;
use App\Models\Match_;
use App\Services\PlaceholderResolverService;
use Illuminate\Support\Facades\Log;

/**
 * MatchObserver
 *
 * Memantau perubahan pada model Match_.
 * Trigger: saat status berubah ke 'finished' pada match
 * → langsung eksekusi PlaceholderResolverService secara sinkron (agar tidak bergantung antrean queue)
 * → dan dispatch ResolvePlaceholderJob sebagai fallback.
 */
class MatchObserver
{
    /**
     * Handle the Match_ "updated" event.
     */
    public function updated(Match_ $match): void
    {
        if ($match->isDirty('status') && $match->status === 'finished') {
            Log::info("MatchObserver: Match #{$match->id} (stage: {$match->stage}) selesai. Menjalankan PlaceholderResolverService sinkron...");
            
            try {
                app(PlaceholderResolverService::class)->resolve($match);
            } catch (\Throwable $e) {
                Log::error("MatchObserver synchronous resolve failed for Match #{$match->id}: " . $e->getMessage());
            }

            // Tetap dispatch job jika queue aktif
            try {
                if ($match->stage === 'pool') {
                    ResolvePlaceholderJob::dispatch($match);
                }
            } catch (\Throwable $e) {
                // Ignore queue dispatch error if sync already ran
            }
        }
    }
}
