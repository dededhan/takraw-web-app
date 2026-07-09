<?php

namespace App\Providers;

use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\URL; // <-- 1. Kita tambahkan ini di atas

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

        // 2. Tambahkan baris ini untuk memaksa semua URL rute/Axios menjadi HTTPS di server
        if (config('app.env') !== 'local' || env('FORCE_HTTPS') === 'true') {
            URL::forceScheme('https');
        }
    }
}