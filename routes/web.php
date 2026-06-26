<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\MatchController;
use App\Http\Controllers\PoolController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ScoringController;
use App\Http\Controllers\TeamController;
use App\Http\Controllers\TournamentController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\CoachTournamentController;
use App\Http\Controllers\BracketController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

// ─── Authenticated Routes ───────────────────────────────
Route::middleware(['auth', 'verified'])->group(function () {

    // Dashboard (role-based)
    Route::get('/dashboard', DashboardController::class)->name('dashboard');

    // Profile
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // ─── Admin Routes ───────────────────────────────
    Route::middleware('role:admin')->group(function () {
        // Tournaments
        Route::resource('tournaments', TournamentController::class);
        Route::post('/tournaments/{tournament}/generate-bracket', [BracketController::class, 'generateFromPools'])->name('tournaments.generate-bracket');
        Route::post('/tournaments/{tournament}/add-team', [TournamentController::class, 'addTeam'])->name('tournaments.add-team');
        Route::delete('/tournaments/{tournament}/teams/{team}', [TournamentController::class, 'removeTeam'])->name('tournaments.remove-team');

        // Pool Management
        Route::get('/tournaments/{tournament}/pools', [PoolController::class, 'index'])->name('pools.index');
        Route::post('/tournaments/{tournament}/pools/generate-random', [PoolController::class, 'generateRandom'])->name('pools.generate-random');
        Route::post('/tournaments/{tournament}/pools/generate-matches', [PoolController::class, 'generateMatches'])->name('pools.generate-matches');
        Route::post('/pools/{pool}/assign-team', [PoolController::class, 'assignTeam'])->name('pools.assign-team');
        Route::delete('/pools/{pool}/teams/{team}', [PoolController::class, 'removeTeam'])->name('pools.remove-team');

        // Match Management
        Route::get('/matches', [MatchController::class, 'index'])->name('matches.index');
        Route::post('/matches/{match}/assign-referee', [MatchController::class, 'assignReferee'])->name('matches.assign-referee');
        Route::post('/matches/{match}/schedule', [MatchController::class, 'schedule'])->name('matches.schedule');
        Route::put('/matches/{match}', [MatchController::class, 'update'])->name('matches.update');
        Route::delete('/matches/{match}', [MatchController::class, 'destroy'])->name('matches.destroy');

        // User Management CRUD
        Route::resource('users', UserController::class);
        Route::patch('/users/{user}/toggle-active', [UserController::class, 'toggleActive'])->name('users.toggle-active');
    });

    // ─── Coach Routes ───────────────────────────────
    Route::middleware('role:coach')->group(function () {
        Route::get('/coach/tournaments', [CoachTournamentController::class, 'index'])->name('coach.tournaments.index');
        Route::post('/coach/tournaments/{tournament}/register', [CoachTournamentController::class, 'register'])->name('coach.tournaments.register');
        Route::delete('/coach/tournaments/{tournament}/teams/{team}', [CoachTournamentController::class, 'unregister'])->name('coach.tournaments.unregister');
    });

    // ─── Admin & Coach Routes ───────────────────────
    Route::middleware('role:admin,coach')->group(function () {
        // Teams
        Route::resource('teams', TeamController::class);
        Route::get('/templates/athletes', [TeamController::class, 'downloadTemplate'])->name('templates.athletes');
        Route::post('/teams/{team}/import-athletes', [TeamController::class, 'importAthletes'])->name('teams.import-athletes');
    });

    // ─── Referee Routes ─────────────────────────────
    Route::middleware('role:referee')->group(function () {
        // Scoring
        Route::get('/scoring/{match}', [ScoringController::class, 'show'])->name('scoring.show');
        Route::post('/scoring/{match}/setup', [ScoringController::class, 'setup'])->name('scoring.setup');
        Route::post('/scoring/{match}/start', [ScoringController::class, 'start'])->name('scoring.start');
        Route::post('/scoring/{match}/update-stat', [ScoringController::class, 'updateStat'])->name('scoring.update-stat');
        Route::post('/scoring/{match}/update-score', [ScoringController::class, 'updateScore'])->name('scoring.update-score');
        Route::post('/scoring/{match}/finish-set', [ScoringController::class, 'finishSet'])->name('scoring.finish-set');
    });

    // ─── Shared Read Routes ─────────────────────────
    Route::get('/matches/{match}', [MatchController::class, 'show'])->name('matches.show');
});

require __DIR__.'/auth.php';
