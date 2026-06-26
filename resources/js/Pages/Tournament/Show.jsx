import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import StatusBadge from '@/Components/StatusBadge';
import { Head, Link, usePage, router } from '@inertiajs/react';
import { useState } from 'react';

const TABS = [
    { key: 'overview', label: 'Ringkasan', icon: '📊' },
    { key: 'teams', label: 'Tim', icon: '👥' },
    { key: 'pools', label: 'Pool', icon: '🏊' },
    { key: 'matches', label: 'Pertandingan', icon: '⚔️' },
    { key: 'bracket', label: 'Bagan Bracket', icon: '👑' },
];

export default function TournamentShow({ tournament, availableTeams = [] }) {
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
                {activeTab === 'teams' && <TeamsTab teams={tournament.teams} availableTeams={availableTeams} tournamentId={tournament.id} status={tournament.status} />}
                {activeTab === 'pools' && <PoolsTab pools={tournament.pools} tournamentId={tournament.id} />}
                {activeTab === 'matches' && <MatchesTab matches={tournament.matches} />}
                {activeTab === 'bracket' && <BracketTab tournament={tournament} />}
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

function TeamsTab({ teams, availableTeams, tournamentId, status }) {
    const { auth } = usePage().props;
    const isAdmin = auth.user?.role === 'admin';
    const isRegPhase = status === 'draft' || status === 'registration';

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTeamId, setSelectedTeamId] = useState('');
    const [processing, setProcessing] = useState(false);

    const filteredAvailable = availableTeams.filter(team =>
        team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (team.region && team.region.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleAddTeam = (e) => {
        e.preventDefault();
        if (!selectedTeamId) return;

        router.post(route('tournaments.add-team', tournamentId), {
            team_id: selectedTeamId
        }, {
            onStart: () => setProcessing(true),
            onFinish: () => {
                setProcessing(false);
                setIsModalOpen(false);
                setSelectedTeamId('');
                setSearchQuery('');
            }
        });
    };

    const handleRemoveTeam = (team) => {
        if (!confirm(`Apakah Anda yakin ingin mengeluarkan tim "${team.name}" dari turnamen ini?`)) {
            return;
        }

        router.delete(route('tournaments.remove-team', [tournamentId, team.id]), {
            onStart: () => setProcessing(true),
            onFinish: () => setProcessing(false)
        });
    };

    return (
        <div className="space-y-4">
            {/* Header & Add button */}
            {isAdmin && isRegPhase && (
                <div className="flex justify-end">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="px-4 py-2 rounded-xl text-sm font-medium text-primary-300 bg-primary-500/10 border border-primary-500/30 hover:bg-primary-500/20 transition-colors flex items-center gap-1.5"
                    >
                        ➕ Tambah Tim ke Turnamen
                    </button>
                </div>
            )}

            {/* Teams List */}
            <div className="rounded-xl border border-surface-700/50 bg-surface-900/50 overflow-hidden">
                {(!teams || teams.length === 0) ? (
                    <div className="text-center py-12">
                        <p className="text-surface-500 text-sm">Belum ada tim terdaftar</p>
                    </div>
                ) : (
                    <div className="divide-y divide-surface-700/30">
                        {teams.map((team) => (
                            <div key={team.id} className="flex items-center justify-between px-5 py-4 hover:bg-surface-800/50 transition-colors">
                                <Link
                                    href={route('teams.show', team.id)}
                                    className="flex items-center gap-3 flex-1 min-w-0"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500/30 to-primary-600/20 flex items-center justify-center text-sm font-bold text-primary-300 shrink-0">
                                        {team.name.charAt(0)}
                                    </div>
                                    <div className="truncate">
                                        <p className="text-sm font-medium text-surface-200 truncate">{team.name}</p>
                                        <p className="text-xs text-surface-500 truncate">{team.region} • {team.athletes?.length || 0} atlet</p>
                                    </div>
                                </Link>
                                <div className="flex items-center gap-2 shrink-0">
                                    {isAdmin && isRegPhase && (
                                        <button
                                            onClick={() => handleRemoveTeam(team)}
                                            disabled={processing}
                                            className="p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                                            title="Keluarkan tim dari turnamen"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    )}
                                    <Link
                                        href={route('teams.show', team.id)}
                                        className="p-2 rounded-lg text-surface-450 hover:text-surface-300 hover:bg-surface-800 transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                        </svg>
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Team Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-md rounded-2xl border border-surface-700/80 bg-surface-900 p-6 shadow-2xl relative animate-scale-in">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-surface-200">Tambah Tim ke Turnamen</h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-1 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {availableTeams.length === 0 ? (
                            <div className="text-center py-6 text-surface-500 text-sm">
                                Semua tim yang ada di database telah terdaftar di turnamen ini.
                            </div>
                        ) : (
                            <form onSubmit={handleAddTeam} className="space-y-4">
                                {/* Search filter */}
                                <div>
                                    <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">
                                        Cari Tim
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Cari berdasarkan nama atau daerah..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-surface-950 border border-surface-700 text-surface-200 rounded-xl px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
                                    />
                                </div>

                                {/* Team select */}
                                <div>
                                    <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">
                                        Pilih Tim
                                    </label>
                                    <div className="max-h-60 overflow-y-auto rounded-xl border border-surface-800 bg-surface-950 divide-y divide-surface-900">
                                        {filteredAvailable.length === 0 ? (
                                            <div className="px-4 py-3 text-xs text-surface-500 text-center">
                                                Tidak ada tim yang cocok.
                                            </div>
                                        ) : (
                                            filteredAvailable.map((team) => (
                                                <button
                                                    key={team.id}
                                                    type="button"
                                                    onClick={() => setSelectedTeamId(team.id.toString())}
                                                    className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between transition-colors ${
                                                        selectedTeamId === team.id.toString()
                                                            ? 'bg-primary-500/10 text-primary-300 font-semibold'
                                                            : 'text-surface-300 hover:bg-surface-900'
                                                    }`}
                                                >
                                                    <div>
                                                        <p className="font-medium">{team.name}</p>
                                                        <p className="text-xs text-surface-500">{team.region || 'Tidak ada wilayah'}</p>
                                                    </div>
                                                    {selectedTeamId === team.id.toString() && (
                                                        <span className="text-xs text-primary-400">Selected</span>
                                                    )}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex justify-end gap-3 pt-4 border-t border-surface-800">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-4 py-2 rounded-xl text-sm font-medium text-surface-400 hover:text-surface-250 bg-surface-800 hover:bg-surface-750 transition-colors"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!selectedTeamId || processing}
                                        className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-primary-600 hover:bg-primary-550 disabled:opacity-50 transition-colors"
                                    >
                                        {processing ? 'Menambahkan...' : 'Tambah Tim'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
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

function BracketTab({ tournament }) {
    const { auth } = usePage().props;
    const isAdmin = auth.user?.role === 'admin';
    const isPoolStage = tournament.status === 'pool_stage' || tournament.status === 'draft' || tournament.status === 'registration';

    const poolMatches = tournament.matches?.filter(m => m.stage === 'pool') || [];
    const unfinishedPoolMatches = poolMatches.filter(m => m.status !== 'finished');
    const allPoolFinished = poolMatches.length > 0 && unfinishedPoolMatches.length === 0;

    const [processing, setProcessing] = useState(false);

    const handleGenerateBracket = () => {
        if (!confirm('Apakah Anda yakin ingin mengunci babak penyisihan pool dan mengeluarkan bagan bracket gugur? Tindakan ini akan secara otomatis membuat jadwal pertandingan babak gugur berdasarkan klasemen akhir pool.')) {
            return;
        }

        router.post(route('tournaments.generate-bracket', tournament.id), {}, {
            onStart: () => setProcessing(true),
            onFinish: () => setProcessing(false),
        });
    };

    if (isPoolStage) {
        return (
            <div className="rounded-xl border border-surface-700/50 bg-surface-900/50 p-6 text-center max-w-2xl mx-auto my-4">
                <div className="text-5xl mb-4">🏆</div>
                <h3 className="text-lg font-bold text-surface-200">Bagan Bracket Belum Terbentuk</h3>
                
                <p className="text-sm text-surface-400 mt-2 leading-relaxed">
                    Bagan pertandingan babak gugur (semifinal dan final) akan dibuat secara otomatis setelah babak penyisihan pool selesai. Sistem akan memasangkan **Juara 1 vs Runner-up 2 secara silang** antar pool.
                </p>

                {poolMatches.length === 0 ? (
                    <div className="mt-6 p-4 rounded-xl bg-surface-950/40 border border-surface-800 text-sm text-surface-500">
                        Belum ada pertandingan pool yang dibuat untuk turnamen ini.
                    </div>
                ) : !allPoolFinished ? (
                    <div className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-400 text-left">
                        <p className="font-semibold flex items-center gap-1.5 mb-1">
                            ⚠️ Masih Ada Laga Penyisihan Berjalan
                        </p>
                        <p className="text-xs text-surface-450">
                            Terdapat <strong>{unfinishedPoolMatches.length}</strong> pertandingan pool yang belum selesai. Selesaikan semua pertandingan pool terlebih dahulu agar klasemen akhir terbentuk dan bracket dapat dikunci.
                        </p>
                    </div>
                ) : (
                    <div className="mt-6 space-y-4">
                        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-450 text-left font-medium">
                            <p className="font-bold text-emerald-400 flex items-center gap-1.5 mb-1">
                                ✅ Penyisihan Pool Selesai!
                            </p>
                            <p className="text-xs text-surface-400">
                                Semua pertandingan pool telah selesai dimainkan dan klasemen akhir telah dikalkulasi secara otomatis. Bagan bracket babak gugur siap untuk dikeluarkan.
                            </p>
                        </div>

                        {isAdmin && (
                            <button
                                onClick={handleGenerateBracket}
                                disabled={processing}
                                className="px-6 py-3 rounded-xl bg-primary-600 hover:bg-primary-550 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-primary-600/25 hover:shadow-primary-600/35 transition-all duration-250 flex items-center justify-center gap-2 mx-auto"
                            >
                                {processing ? 'Memproses...' : '⚔️ Kunci Pool & Keluarkan Bracket'}
                            </button>
                        )}
                    </div>
                )}

                {!isAdmin && (
                    <p className="text-xs text-surface-500 mt-6 italic">
                        *Menunggu Admin untuk mengunci pool dan mengeluarkan bagan pertandingan babak gugur.
                    </p>
                )}
            </div>
        );
    }

    // Bracket Stage
    const bracketMatches = tournament.matches?.filter(m => m.stage !== 'pool') || [];
    const qfMatches = bracketMatches.filter(m => m.stage === 'quarterfinal').sort((a, b) => a.bracket_position - b.bracket_position);
    const sfMatches = bracketMatches.filter(m => m.stage === 'semifinal').sort((a, b) => a.bracket_position - b.bracket_position);
    const finalMatch = bracketMatches.find(m => m.stage === 'final');
    const thirdMatch = bracketMatches.find(m => m.stage === 'third_place');

    return (
        <div className="rounded-xl border border-surface-700/50 bg-surface-900/40 p-6 overflow-x-auto">
            <div className="min-w-[800px] flex flex-col md:flex-row gap-6 md:gap-12 justify-center items-center py-6">
                
                {/* Column 1: Quarterfinals */}
                {qfMatches.length > 0 && (
                    <div className="flex flex-col justify-around gap-6 h-[480px] flex-1 max-w-[240px]">
                        <p className="text-[10px] font-bold text-surface-500 uppercase tracking-widest text-center border-b border-surface-800 pb-2">Perempat Final</p>
                        {qfMatches.map(match => (
                            <BracketMatchCard key={match.id} match={match} />
                        ))}
                    </div>
                )}

                {/* Column 2: Semifinals */}
                {sfMatches.length > 0 && (
                    <div className="flex flex-col justify-around gap-12 h-[480px] flex-1 max-w-[240px]">
                        <p className="text-[10px] font-bold text-surface-500 uppercase tracking-widest text-center border-b border-surface-800 pb-2">Semifinal</p>
                        {sfMatches.map(match => (
                            <BracketMatchCard key={match.id} match={match} />
                        ))}
                    </div>
                )}

                {/* Column 3: Final & 3rd Place */}
                <div className="flex flex-col justify-center gap-10 h-[480px] flex-1 max-w-[240px]">
                    {finalMatch && (
                        <div className="space-y-2">
                            <p className="text-[10px] font-extrabold text-amber-400 uppercase tracking-widest text-center border-b border-amber-500/20 pb-2">🏆 Perebutan Juara 1 🏆</p>
                            <BracketMatchCard match={finalMatch} />
                        </div>
                    )}
                    {thirdMatch && (
                        <div className="space-y-2">
                            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest text-center border-b border-blue-500/20 pb-2">🥉 Perebutan Juara 3</p>
                            <BracketMatchCard match={thirdMatch} />
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}

function BracketMatchCard({ match }) {
    const isFinished = match.status === 'finished';
    
    // Calculate sets won
    const homeSets = match.sets?.filter(s => s.winner_team_id === match.home_team_id).length || 0;
    const awaySets = match.sets?.filter(s => s.winner_team_id === match.away_team_id).length || 0;

    const isHomeWinner = isFinished && match.winner_team_id === match.home_team_id;
    const isAwayWinner = isFinished && match.winner_team_id === match.away_team_id;

    return (
        <Link 
            href={route('matches.show', match.id)}
            className={`w-full rounded-xl border p-3.5 transition-all duration-250 block ${
                match.status === 'live' 
                    ? 'bg-red-500/5 border-red-500/30 shadow-lg shadow-red-500/5'
                    : 'bg-surface-900/60 border-surface-700/50 hover:border-primary-500/30'
            }`}
        >
            <div className="space-y-2.5">
                {/* Home Team */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                        {isHomeWinner && <span className="text-xs text-amber-400 shrink-0" title="Winner">🏆</span>}
                        <span className={`text-xs font-semibold truncate ${
                            isHomeWinner 
                                ? 'text-emerald-400 font-bold' 
                                : (isFinished && match.winner_team_id ? 'text-surface-500 line-through' : 'text-surface-200')
                        }`}>
                            {match.home_team?.name || 'TBD'}
                        </span>
                    </div>
                    <span className={`text-xs font-mono px-2 py-0.5 rounded font-bold ${
                        isHomeWinner 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-surface-950/50 text-surface-400'
                    }`}>
                        {isFinished ? homeSets : (match.status === 'live' ? homeSets : '—')}
                    </span>
                </div>

                {/* Away Team */}
                <div className="flex items-center justify-between gap-2 border-t border-surface-800/40 pt-2.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                        {isAwayWinner && <span className="text-xs text-amber-400 shrink-0" title="Winner">🏆</span>}
                        <span className={`text-xs font-semibold truncate ${
                            isAwayWinner 
                                ? 'text-emerald-400 font-bold' 
                                : (isFinished && match.winner_team_id ? 'text-surface-500 line-through' : 'text-surface-200')
                        }`}>
                            {match.away_team?.name || 'TBD'}
                        </span>
                    </div>
                    <span className={`text-xs font-mono px-2 py-0.5 rounded font-bold ${
                        isAwayWinner 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-surface-950/50 text-surface-400'
                    }`}>
                        {isFinished ? awaySets : (match.status === 'live' ? awaySets : '—')}
                    </span>
                </div>
            </div>
            
            {/* Footer */}
            <div className="mt-2.5 pt-2 border-t border-surface-800/20 flex items-center justify-between text-[9px] text-surface-500 font-medium">
                <span className="flex items-center gap-0.5">🏟️ Lap {match.court_number || '—'}</span>
                <span>
                    {match.status === 'live' && <span className="text-red-400 animate-pulse font-bold">● LIVE</span>}
                    {match.status === 'finished' && <span className="text-surface-500">✓ Selesai</span>}
                    {match.status === 'scheduled' && <span className="text-surface-500">⏳ Terjadwal</span>}
                </span>
            </div>
        </Link>
    );
}

