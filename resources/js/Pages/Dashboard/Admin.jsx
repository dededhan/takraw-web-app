import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import StatCard from '@/Components/StatCard';
import StatusBadge from '@/Components/StatusBadge';
import { Head, Link } from '@inertiajs/react';

export default function AdminDashboard({ stats, recentTournaments, liveMatches }) {
    return (
        <AuthenticatedLayout header="Dashboard Admin">
            <Head title="Dashboard Admin" />

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
                <StatCard
                    icon="🏆"
                    label="Total Turnamen"
                    value={stats.totalTournaments}
                    color="accent"
                />
                <StatCard
                    icon="🔥"
                    label="Turnamen Aktif"
                    value={stats.activeTournaments}
                    color="primary"
                />
                <StatCard
                    icon="👥"
                    label="Total Tim"
                    value={stats.totalTeams}
                    color="blue"
                />
                <StatCard
                    icon="🧑‍⚖️"
                    label="Total Wasit"
                    value={stats.totalReferees}
                    color="purple"
                />
                <StatCard
                    icon="⚡"
                    label="Match Live"
                    value={stats.liveMatches}
                    color="red"
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Live Matches */}
                <div className="rounded-xl border border-surface-700/50 bg-surface-900/50 backdrop-blur-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-surface-700/50 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-surface-100 flex items-center gap-2">
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            Pertandingan Live
                        </h2>
                    </div>
                    <div className="p-5">
                        {liveMatches.length === 0 ? (
                            <div className="text-center py-8">
                                <div className="text-4xl mb-3">😴</div>
                                <p className="text-surface-500 text-sm">Tidak ada pertandingan live saat ini</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {liveMatches.map((match) => (
                                    <Link
                                        key={match.id}
                                        href={route('matches.show', match.id)}
                                        className="block p-4 rounded-xl bg-surface-800/50 border border-surface-700/30 hover:border-primary-500/30 transition-all duration-200 hover:shadow-glow-primary"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <StatusBadge status="live" size="xs" />
                                            <span className="text-xs text-surface-500">{match.tournament?.name}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-surface-200">{match.home_team?.name}</span>
                                            <span className="text-xs text-surface-500 px-3">VS</span>
                                            <span className="text-sm font-medium text-surface-200">{match.away_team?.name}</span>
                                        </div>
                                        {match.referee && (
                                            <p className="text-xs text-surface-500 mt-2">🧑‍⚖️ {match.referee.name}</p>
                                        )}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Tournaments */}
                <div className="rounded-xl border border-surface-700/50 bg-surface-900/50 backdrop-blur-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-surface-700/50 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-surface-100">🏆 Turnamen Terbaru</h2>
                        <Link
                            href={route('tournaments.index')}
                            className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
                        >
                            Lihat Semua →
                        </Link>
                    </div>
                    <div className="divide-y divide-surface-700/30">
                        {recentTournaments.map((t) => (
                            <Link
                                key={t.id}
                                href={route('tournaments.show', t.id)}
                                className="flex items-center justify-between px-5 py-4 hover:bg-surface-800/50 transition-colors"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-surface-200 truncate">{t.name}</p>
                                    <p className="text-xs text-surface-500 mt-0.5">
                                        {new Date(t.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        {' — '}
                                        {new Date(t.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </p>
                                </div>
                                <StatusBadge status={t.status} size="xs" />
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Link
                    href={route('tournaments.create')}
                    className="group flex items-center gap-4 p-5 rounded-xl border border-surface-700/50 bg-surface-900/50 hover:border-primary-500/30 hover:shadow-glow-primary transition-all duration-300"
                >
                    <div className="w-12 h-12 rounded-xl bg-primary-500/20 text-primary-400 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                        ➕
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-surface-200">Buat Turnamen</p>
                        <p className="text-xs text-surface-500">Turnamen baru</p>
                    </div>
                </Link>
                <Link
                    href={route('teams.index')}
                    className="group flex items-center gap-4 p-5 rounded-xl border border-surface-700/50 bg-surface-900/50 hover:border-blue-500/30 transition-all duration-300"
                >
                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                        👥
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-surface-200">Kelola Tim</p>
                        <p className="text-xs text-surface-500">Daftar & edit tim</p>
                    </div>
                </Link>
                <Link
                    href={route('matches.index')}
                    className="group flex items-center gap-4 p-5 rounded-xl border border-surface-700/50 bg-surface-900/50 hover:border-accent-500/30 hover:shadow-glow-accent transition-all duration-300"
                >
                    <div className="w-12 h-12 rounded-xl bg-accent-500/20 text-accent-400 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                        ⚔️
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-surface-200">Pertandingan</p>
                        <p className="text-xs text-surface-500">Jadwal & wasit</p>
                    </div>
                </Link>
            </div>
        </AuthenticatedLayout>
    );
}
