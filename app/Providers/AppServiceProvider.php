<?php

namespace App\Providers;

use App\Models\Match_;
use App\Observers\MatchObserver;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\URL;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        // Memaksa semua URL menjadi HTTPS di production
        if (config('app.env') !== 'local' || env('FORCE_HTTPS') === 'true') {
            URL::forceScheme('https');
        }

        // Daftarkan Observer untuk model Match_
        // Memantau penyelesaian pool match → trigger PlaceholderResolver
        Match_::observe(MatchObserver::class);
    }
}