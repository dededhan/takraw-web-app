import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import StatusBadge from '@/Components/StatusBadge';
import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';

const TABS = [
    { key: 'overview', label: 'Ringkasan', icon: '📊' },
    { key: 'teams', label: 'Tim', icon: '👥' },
    { key: 'pools', label: 'Pool', icon: '🏊' },
    { key: 'matches', label: 'Pertandingan', icon: '⚔️' },
];

export default function TournamentShow({ tournament }) {
    const [activeTab, setActiveTab] = useState('overview');
    const modeLabels = { regu: 'Regu (3v3)', double: 'Double (2v2)', quarter: 'Quarter (4v4)' };

    return (
        <AuthenticatedLayout header={tournament.name}>
            <Head title={tournament.name} />

            {/* Breadcrumb */}
            <div className="mb-4">
                <Link href={route('tournaments.index')} className="text-sm text-surface-500 hover:text-surface-300 transition-colors flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    Kembali
                </Link>
            </div>

            {/* Tournament Header */}
            <div className="rounded-xl border border-surface-700/50 bg-gradient-to-r from-surface-900/80 to-surface-800/50 backdrop-blur-sm p-6 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-2xl font-bold text-surface-100">{tournament.name}</h1>
                            <StatusBadge status={tournament.status} size="md" />
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-surface-400">
                            <span>📅 {new Date(tournament.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} — {new Date(tournament.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                            <span>🎮 {modeLabels[tournament.mode]}</span>
                            {tournament.creator && <span>👤 {tournament.creator.name}</span>}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link
                            href={route('pools.index', tournament.id)}
                            className="px-4 py-2 rounded-xl text-sm font-medium text-accent-300 bg-accent-500/10 border border-accent-500/30 hover:bg-accent-500/20 transition-colors"
                        >
                            🏊 Kelola Pool
                        </Link>
                        <Link
                            href={route('tournaments.edit', tournament.id)}
                            className="px-4 py-2 rounded-xl text-sm font-medium text-surface-300 bg-surface-800 border border-surface-700 hover:bg-surface-700 transition-colors"
                        >
                            ✏️ Edit
                        </Link>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                    <div className="px-4 py-3 rounded-xl bg-surface-800/50 border border-surface-700/30 text-center">
                        <p className="text-2xl font-bold text-surface-100">{tournament.teams?.length ?? 0}</p>
                        <p className="text-xs text-surface-500">Tim</p>
                    </div>
                    <div className="px-4 py-3 rounded-xl bg-surface-800/50 border border-surface-700/30 text-center">
                        <p className="text-2xl font-bold text-surface-100">{tournament.pools?.length ?? 0}</p>
                        <p className="text-xs text-surface-500">Pool</p>
                    </div>
                    <div className="px-4 py-3 rounded-xl bg-surface-800/50 border border-surface-700/30 text-center">
                        <p className="text-2xl font-bold text-surface-100">{tournament.matches?.length ?? 0}</p>
                        <p className="text-xs text-surface-500">Pertandingan</p>
                    </div>
                    <div className="px-4 py-3 rounded-xl bg-surface-800/50 border border-surface-700/30 text-center">
                        <p className="text-2xl font-bold text-surface-100">
                            {tournament.matches?.filter(m => m.status === 'finished').length ?? 0}
                        </p>
                        <p className="text-xs text-surface-500">Selesai</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
                {TABS.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`
                            flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200
                            ${activeTab === tab.key
                                ? 'bg-primary-600/20 text-primary-300 border border-primary-500/30'
                                : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800 border border-transparent'
                            }
                        `}
                    >
                        <span>{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="animate-fade-in">
                {activeTab === 'overview' && <OverviewTab tournament={tournament} />}
                {activeTab === 'teams' && <TeamsTab teams={tournament.teams} />}
                {activeTab === 'pools' && <PoolsTab pools={tournament.pools} tournamentId={tournament.id} />}
                {activeTab === 'matches' && <MatchesTab matches={tournament.matches} />}
            </div>
        </AuthenticatedLayout>
    );
}

function OverviewTab({ tournament }) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pool Standings */}
            {tournament.pools?.map((pool) => (
                <div key={pool.id} className="rounded-xl border border-surface-700/50 bg-surface-900/50 overflow-hidden">
                    <div className="px-5 py-3 border-b border-surface-700/50 bg-surface-800/30">
                        <h3 className="text-sm font-semibold text-surface-200">Pool {pool.name}</h3>
                    </div>
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-xs text-surface-500 border-b border-surface-700/30">
                                <th className="px-4 py-2">#</th>
                                <th className="px-4 py-2">Tim</th>
                                <th className="px-4 py-2 text-center">M</th>
                                <th className="px-4 py-2 text-center">W</th>
                                <th className="px-4 py-2 text-center">L</th>
                                <th className="px-4 py-2 text-center">PF</th>
                                <th className="px-4 py-2 text-center">PA</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-700/20">
                            {pool.standings?.map((s, i) => (
                                <tr key={s.id} className={i < 2 ? 'bg-primary-500/5' : ''}>
                                    <td className="px-4 py-2.5 text-xs text-surface-400">{s.rank || i + 1}</td>
                                    <td className="px-4 py-2.5 text-sm text-surface-200 font-medium">{s.team?.name || '—'}</td>
                                    <td className="px-4 py-2.5 text-sm text-surface-400 text-center">{s.played}</td>
                                    <td className="px-4 py-2.5 text-sm text-primary-400 text-center font-medium">{s.won}</td>
                                    <td className="px-4 py-2.5 text-sm text-red-400 text-center">{s.lost}</td>
                                    <td className="px-4 py-2.5 text-sm text-surface-400 text-center">{s.points_for}</td>
                                    <td className="px-4 py-2.5 text-sm text-surface-400 text-center">{s.points_against}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ))}

            {(!tournament.pools || tournament.pools.length === 0) && (
                <div className="col-span-full text-center py-12 rounded-xl border border-dashed border-surface-700/50">
                    <p className="text-surface-500 text-sm">Belum ada pool dibuat</p>
                    <Link href={route('pools.index', tournament.id)} className="text-primary-400 text-sm hover:text-primary-300 mt-2 inline-block">
                        Buat Pool →
                    </Link>
                </div>
            )}
        </div>
    );
}

function TeamsTab({ teams }) {
    return (
        <div className="rounded-xl border border-surface-700/50 bg-surface-900/50 overflow-hidden">
            {(!teams || teams.length === 0) ? (
                <div className="text-center py-12">
                    <p className="text-surface-500 text-sm">Belum ada tim terdaftar</p>
                </div>
            ) : (
                <div className="divide-y divide-surface-700/30">
                    {teams.map((team) => (
                        <Link
                            key={team.id}
                            href={route('teams.show', team.id)}
                            className="flex items-center justify-between px-5 py-4 hover:bg-surface-800/50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500/30 to-primary-600/20 flex items-center justify-center text-sm font-bold text-primary-300">
                                    {team.name.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-surface-200">{team.name}</p>
                                    <p className="text-xs text-surface-500">{team.region} • {team.athletes?.length || 0} atlet</p>
                                </div>
                            </div>
                            <svg className="w-4 h-4 text-surface-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                            </svg>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}

function PoolsTab({ pools, tournamentId }) {
    return (
        <div>
            <div className="flex justify-end mb-4">
                <Link
                    href={route('pools.index', tournamentId)}
                    className="px-4 py-2 rounded-xl text-sm font-medium text-primary-300 bg-primary-500/10 border border-primary-500/30 hover:bg-primary-500/20 transition-colors"
                >
                    ⚙️ Kelola Pool
                </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pools?.map((pool) => (
                    <div key={pool.id} className="rounded-xl border border-surface-700/50 bg-surface-900/50 p-5">
                        <h3 className="text-sm font-semibold text-accent-300 mb-3">Pool {pool.name}</h3>
                        <div className="space-y-2">
                            {pool.teams?.map((team) => (
                                <div key={team.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-800/50">
                                    <div className="w-7 h-7 rounded-lg bg-primary-500/20 flex items-center justify-center text-xs font-bold text-primary-300">
                                        {team.name.charAt(0)}
                                    </div>
                                    <span className="text-sm text-surface-300">{team.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function MatchesTab({ matches }) {
    return (
        <div className="space-y-3">
            {(!matches || matches.length === 0) ? (
                <div className="text-center py-12 rounded-xl border border-dashed border-surface-700/50">
                    <p className="text-surface-500 text-sm">Belum ada pertandingan</p>
                </div>
            ) : (
                matches.map((match) => (
                    <Link
                        key={match.id}
                        href={route('matches.show', match.id)}
                        className="block p-4 rounded-xl bg-surface-900/50 border border-surface-700/50 hover:border-primary-500/30 transition-all duration-200"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <StatusBadge status={match.status} size="xs" />
                                <StatusBadge status={match.stage} size="xs" />
                            </div>
                            {match.referee && <span className="text-xs text-surface-500">🧑‍⚖️ {match.referee.name}</span>}
                        </div>
                        <div className="flex items-center justify-center gap-4">
                            <span className="text-sm font-medium text-surface-200 text-right flex-1">
                                {match.home_team?.name || 'TBD'}
                            </span>
                            <div className="text-center">
                                {match.status === 'finished' ? (
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg font-bold text-primary-400">
                                            {match.sets?.filter(s => s.winner_team_id === match.home_team_id).length}
                                        </span>
                                        <span className="text-xs text-surface-600">—</span>
                                        <span className="text-lg font-bold text-accent-400">
                                            {match.sets?.filter(s => s.winner_team_id === match.away_team_id).length}
                                        </span>
                                    </div>
                                ) : (
                                    <span className="text-xs text-surface-600 font-bold px-3 py-1 bg-surface-800 rounded-lg">VS</span>
                                )}
                            </div>
                            <span className="text-sm font-medium text-surface-200 text-left flex-1">
                                {match.away_team?.name || 'TBD'}
                            </span>
                        </div>
                        {match.scheduled_at && (
                            <p className="text-xs text-surface-500 text-center mt-2">
                                📅 {new Date(match.scheduled_at).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                        )}
                    </Link>
                ))
            )}
        </div>
    );
}
