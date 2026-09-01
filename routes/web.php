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
use App\Http\Controllers\MasterScheduleController;
use App\Http\Controllers\BracketMatrixController;
use App\Http\Controllers\SuperTeamController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware(['auth', 'verified'])->get('/', function () {
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
        Route::post('/tournaments/{tournament}/pools/create-custom', [PoolController::class, 'createCustom'])->name('pools.create-custom');
        Route::post('/tournaments/{tournament}/pools/generate-random', [PoolController::class, 'generateRandom'])->name('pools.generate-random');
        Route::post('/tournaments/{tournament}/pools/generate-multi-bracket', [PoolController::class, 'generateMultiBracket'])->name('pools.generate-multi-bracket');
        Route::post('/tournaments/{tournament}/pools/generate-matches', [PoolController::class, 'generateMatches'])->name('pools.generate-matches');
        Route::post('/pools/{pool}/assign-team', [PoolController::class, 'assignTeam'])->name('pools.assign-team');
        Route::delete('/pools/{pool}/teams/{team}', [PoolController::class, 'removeTeam'])->name('pools.remove-team');
        Route::delete('/pools/{pool}', [PoolController::class, 'destroy'])->name('pools.destroy');

        // ─── Master Schedule ──────────────────────────────
        Route::prefix('tournaments/{tournament}')->name('tournaments.')->group(function () {
            // Step 1: Konfigurasi Parameter
            Route::get('master-schedule/config', [MasterScheduleController::class, 'config'])
                ->name('master-schedule.config');
            Route::post('master-schedule/config', [MasterScheduleController::class, 'saveConfig'])
                ->name('master-schedule.save-config');

            // Step 2: Bracket Matrix
            Route::get('master-schedule/bracket-matrix', [BracketMatrixController::class, 'index'])
                ->name('master-schedule.bracket-matrix');
            Route::post('master-schedule/bracket-matrix', [BracketMatrixController::class, 'store'])
                ->name('master-schedule.bracket-matrix.store');
            Route::put('master-schedule/bracket-matrix/{matrix}', [BracketMatrixController::class, 'update'])
                ->name('master-schedule.bracket-matrix.update');

            // Step 3: Generate
            Route::get('master-schedule/generate', fn(\App\Models\Tournament $tournament) =>
                \Inertia\Inertia::render('Tournament/MasterSchedule/GenerateConfirm', ['tournament' => $tournament])
            )->name('master-schedule.generate-form');
            Route::post('master-schedule/generate', [MasterScheduleController::class, 'generate'])
                ->name('master-schedule.generate');

            // Step 4: Grid (Interactive)
            Route::get('master-schedule', [MasterScheduleController::class, 'index'])
                ->name('master-schedule.index');
            Route::get('master-schedule/print', [MasterScheduleController::class, 'printSchedule'])
                ->name('master-schedule.print');
            Route::post('master-schedule/publish', [MasterScheduleController::class, 'publish'])
                ->name('master-schedule.publish');
            Route::post('master-schedule/unpublish', [MasterScheduleController::class, 'unpublish'])
                ->name('master-schedule.unpublish');
            Route::get('master-schedule/conflicts', [MasterScheduleController::class, 'conflicts'])
                ->name('master-schedule.conflicts');
            Route::post('master-schedule/assign-referee-bulk', [MasterScheduleController::class, 'bulkAssignReferee'])
                ->name('master-schedule.assign-referee-bulk');

            // Super Teams (mode team_regu / team_double)
            Route::get('super-teams', [SuperTeamController::class, 'index'])
                ->name('super-teams.index');
            Route::post('super-teams', [SuperTeamController::class, 'store'])
                ->name('super-teams.store');
        });

        // Super Team: update, member management (tanpa prefix tournament)
        Route::put('super-teams/{superTeam}', [SuperTeamController::class, 'update'])
            ->name('super-teams.update');
        Route::post('super-teams/{superTeam}/members', [SuperTeamController::class, 'addMember'])
            ->name('super-teams.members.add');
        Route::delete('super-teams/{superTeam}/members/{team}', [SuperTeamController::class, 'removeMember'])
            ->name('super-teams.members.remove');

        // Drag & Drop Reschedule
        Route::patch('matches/{match}/reschedule', [MasterScheduleController::class, 'reschedule'])
            ->name('matches.reschedule');

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
        Route::get('/coach/tournaments/history', [CoachTournamentController::class, 'history'])->name('coach.tournaments.history');
        Route::post('/coach/tournaments/{tournament}/register', [CoachTournamentController::class, 'register'])->name('coach.tournaments.register');
        Route::delete('/coach/tournaments/{tournament}/teams/{team}', [CoachTournamentController::class, 'unregister'])->name('coach.tournaments.unregister');
        
        // Coach Super Teams
        Route::post('/coach/super-teams', [CoachTournamentController::class, 'storeSuperTeam'])->name('coach.super-teams.store');
        Route::delete('/coach/super-teams/{superTeam}', [CoachTournamentController::class, 'destroySuperTeam'])->name('coach.super-teams.destroy');
        Route::post('/coach/tournaments/{tournament}/register-super-team', [CoachTournamentController::class, 'registerSuperTeam'])->name('coach.tournaments.register-super-team');
        Route::delete('/coach/tournaments/{tournament}/super-teams/{superTeam}', [CoachTournamentController::class, 'unregisterSuperTeam'])->name('coach.tournaments.unregister-super-team');
    });

    // ─── Admin & Coach Routes ───────────────────────
    Route::middleware('role:admin,coach')->group(function () {
        // Teams
        Route::resource('teams', TeamController::class);
        Route::get('/templates/athletes', [TeamController::class, 'downloadTemplate'])->name('templates.athletes');
        Route::get('/templates/athletes-csv', [TeamController::class, 'downloadCsvTemplate'])->name('templates.athletes-csv');
        Route::post('/teams/{team}/import-athletes', [TeamController::class, 'importAthletes'])->name('teams.import-athletes');

        // Super Teams (Unified Creation, Update & Deletion)
        Route::post('/super-teams/unified', [SuperTeamController::class, 'storeUnified'])->name('super-teams.store-unified');
        Route::match(['put', 'post'], '/super-teams/{superTeam}/unified', [SuperTeamController::class, 'updateUnified'])->name('super-teams.update-unified');
        Route::delete('/super-teams/{superTeam}', [SuperTeamController::class, 'destroy'])->name('super-teams.destroy');
    });

    // ─── Referee & Admin Routes ─────────────────────
    Route::middleware('role:admin,referee')->group(function () {
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
