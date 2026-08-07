<?php

namespace App\Observers;

use App\Jobs\ResolvePlaceholderJob;
use App\Models\Match_;
use Illuminate\Support\Facades\Log;

/**
 * MatchObserver
 *
 * Memantau perubahan pada model Match_.
 * Trigger: saat status berubah ke 'finished' pada pool stage match
 * → dispatch ResolvePlaceholderJob ke queue.
 */
class MatchObserver
{
    /**
     * Handle the Match_ "updated" event.
     */
    public function updated(Match_ $match): void
    {
        // Hanya trigger untuk pool stage match yang baru selesai
        if (
            $match->isDirty('status') &&
            $match->status === 'finished' &&
            $match->stage === 'pool'
        ) {
            Log::info("MatchObserver: Pool match #{$match->id} selesai. Dispatch ResolvePlaceholderJob.");
            ResolvePlaceholderJob::dispatch($match);
        }
    }
}
