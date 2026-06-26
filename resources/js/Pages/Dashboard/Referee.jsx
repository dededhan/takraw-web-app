import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import StatusBadge from '@/Components/StatusBadge';
import { Head, Link } from '@inertiajs/react';

export default function RefereeDashboard({ assignedMatches, completedToday }) {
    const liveMatches = assignedMatches.filter(m => m.status === 'live');
    const pendingMatches = assignedMatches.filter(m => m.status !== 'live');

    return (
        <AuthenticatedLayout header="Dashboard Wasit">
            <Head title="Dashboard Wasit" />

            {/* Live Match Alert */}
            {liveMatches.length > 0 && (
                <div className="mb-6">
                    {liveMatches.map((match) => (
                        <Link
                            key={match.id}
                            href={route('scoring.show', match.id)}
                            className="block p-5 rounded-xl border-2 border-red-500/50 bg-gradient-to-r from-red-500/10 to-red-600/5 hover:from-red-500/20 hover:to-red-600/10 transition-all duration-300 animate-pulse-score"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <StatusBadge status="live" size="md" />
                                <span className="text-sm text-surface-400">{match.tournament?.name}</span>
                            </div>
                            <div className="flex items-center justify-center gap-6">
                                <div className="text-center">
                                    <p className="text-lg font-bold text-surface-100">{match.home_team?.name}</p>
                                    <p className="text-3xl font-black text-primary-400 mt-1">
                                        {match.sets?.filter(s => s.winner_team_id === match.home_team_id).length || 0}
                                    </p>
                                </div>
                                <span className="text-2xl text-surface-600 font-black">VS</span>
                                <div className="text-center">
                                    <p className="text-lg font-bold text-surface-100">{match.away_team?.name}</p>
                                    <p className="text-3xl font-black text-accent-400 mt-1">
                                        {match.sets?.filter(s => s.winner_team_id === match.away_team_id).length || 0}
                                    </p>
                                </div>
                            </div>
                            <div className="text-center mt-4">
                                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold shadow-lg">
                                    ⚡ Lanjutkan Scoring
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="rounded-xl border border-red-500/30 bg-gradient-to-br from-red-500/20 to-red-600/10 p-5">
                    <p className="text-sm font-medium text-surface-400">Live</p>
                    <p className="text-3xl font-bold text-surface-100 mt-1">{liveMatches.length}</p>
                </div>
                <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/20 to-amber-600/10 p-5">
                    <p className="text-sm font-medium text-surface-400">Ditugaskan</p>
                    <p className="text-3xl font-bold text-surface-100 mt-1">{pendingMatches.length}</p>
                </div>
                <div className="rounded-xl border border-primary-500/30 bg-gradient-to-br from-primary-500/20 to-primary-600/10 p-5">
                    <p className="text-sm font-medium text-surface-400">Selesai Hari Ini</p>
                    <p className="text-3xl font-bold text-surface-100 mt-1">{completedToday.length}</p>
                </div>
            </div>

            {/* Assigned Matches */}
            <div className="rounded-xl border border-surface-700/50 bg-surface-900/50 backdrop-blur-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-surface-700/50">
                    <h2 className="text-lg font-semibold text-surface-100">📋 Pertandingan Ditugaskan</h2>
                </div>
                <div className="p-5">
                    {pendingMatches.length === 0 ? (
                        <div className="text-center py-10">
                            <div className="text-4xl mb-3">✅</div>
                            <p className="text-surface-500 text-sm">Semua pertandingan sudah selesai</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {pendingMatches.map((match) => (
                                <Link
                                    key={match.id}
                                    href={route('scoring.show', match.id)}
                                    className="block p-4 rounded-xl bg-surface-800/50 border border-surface-700/30 hover:border-primary-500/30 transition-all duration-200"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <StatusBadge status={match.status} size="sm" />
                                        <StatusBadge status={match.stage} size="xs" />
                                    </div>
                                    <div className="flex items-center justify-center gap-4 mb-3">
                                        <span className="text-sm font-medium text-surface-200 text-right flex-1">
                                            {match.home_team?.name || 'TBD'}
                                        </span>
                                        <span className="text-xs text-surface-600 font-bold px-3 py-1 bg-surface-800 rounded-lg">VS</span>
                                        <span className="text-sm font-medium text-surface-200 text-left flex-1">
                                            {match.away_team?.name || 'TBD'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-surface-500">
                                        <span>🏆 {match.tournament?.name}</span>
                                        {match.court_number && <span>📍 Lapangan {match.court_number}</span>}
                                    </div>
                                    <div className="mt-3 text-center">
                                        <span className="inline-block px-4 py-2 rounded-lg bg-primary-600/20 text-primary-300 text-sm font-medium border border-primary-500/30">
                                            {match.status === 'setup' ? '▶️ Mulai Pertandingan' : '⚙️ Setup & Mulai'}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Completed Today */}
            {completedToday.length > 0 && (
                <div className="mt-6 rounded-xl border border-surface-700/50 bg-surface-900/50 backdrop-blur-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-surface-700/50">
                        <h2 className="text-lg font-semibold text-surface-100">✅ Selesai Hari Ini</h2>
                    </div>
                    <div className="divide-y divide-surface-700/30">
                        {completedToday.map((match) => (
                            <div key={match.id} className="flex items-center justify-between px-5 py-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="text-sm text-surface-300 truncate">
                                        {match.home_team?.name} vs {match.away_team?.name}
                                    </span>
                                </div>
                                <StatusBadge status="finished" size="xs" />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
