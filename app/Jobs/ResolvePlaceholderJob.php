<?php

namespace App\Jobs;

use App\Models\Match_;
use App\Services\PlaceholderResolverService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * ResolvePlaceholderJob
 *
 * Queue job yang di-dispatch oleh MatchObserver saat pool match selesai.
 * Memanggil PlaceholderResolverService untuk mengganti placeholder
 * bracket match dengan ID tim nyata.
 *
 * Dijalankan di background agar tidak memblokir response wasit.
 */
class ResolvePlaceholderJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Jumlah retry jika job gagal.
     */
    public int $tries = 3;

    /**
     * Timeout dalam detik.
     */
    public int $timeout = 60;

    public function __construct(
        protected Match_ $match
    ) {}

    /**
     * Execute the job.
     */
    public function handle(PlaceholderResolverService $resolver): void
    {
        Log::info("ResolvePlaceholderJob: Processing Match #{$this->match->id} (Pool #{$this->match->pool_id})");

        try {
            $resolved = $resolver->resolve($this->match);
            Log::info("ResolvePlaceholderJob: {$resolved} placeholder(s) resolved untuk Match #{$this->match->id}");
        } catch (\Exception $e) {
            Log::error("ResolvePlaceholderJob FAILED for Match #{$this->match->id}: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Handle job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error("ResolvePlaceholderJob PERMANENTLY FAILED for Match #{$this->match->id}: " . $exception->getMessage());
    }
}
