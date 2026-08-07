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
    const modeLabels = {
        regu:        'Regu (3v3)',
        double:      'Double (2v2)',
        quadrant:    'Quadrant (4v4)',
        team_regu:   'Team Regu (Super Team 3x3)',
        team_double: 'Team Double (Super Team 3x2)',
    };

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
                    <div className="flex items-center flex-wrap gap-2">
                        <Link
                            href={route('tournaments.master-schedule.index', tournament.id)}
                            className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md transition-colors flex items-center gap-1.5"
                        >
                            🗓️ Master Schedule
                        </Link>
                        <Link
                            href={route('tournaments.super-teams.index', tournament.id)}
                            className="px-4 py-2 rounded-xl text-sm font-medium text-amber-300 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-colors flex items-center gap-1.5"
                        >
                            🏆 Super Team
                        </Link>
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

function computePoolStandings(pool, tournamentMatches = []) {
    const isTeamMode = pool.match_mode === 'team_regu' || pool.match_mode === 'team_double';
    const teams = isTeamMode
        ? (pool.super_teams || pool.superTeams || [])
        : (pool.teams || []);

    const poolMatches = (tournamentMatches || []).filter(
        m => m.pool_id === pool.id || (m.stage === 'pool' && m.match_mode === pool.match_mode && (
            isTeamMode
                ? teams.some(t => t.id === m.home_super_team_id || t.id === m.away_super_team_id)
                : teams.some(t => t.id === m.home_team_id || t.id === m.away_team_id)
        ))
    );

    const standingsMap = {};

    teams.forEach(t => {
        standingsMap[t.id] = {
            id: t.id,
            name: t.name,
            members: t.members || [],
            matches_played: 0,
            matches_won: 0,
            matches_lost: 0,
            matches_diff: 0,
            game_won: 0,
            game_lost: 0,
            game_diff: 0,
            set_won: 0,
            set_lost: 0,
            set_diff: 0,
            pts_won: 0,
            pts_lost: 0,
            pts_diff: 0,
            score: 0,
        };
    });

    poolMatches.forEach(m => {
        if (m.status !== 'finished') return;

        const homeId = isTeamMode ? m.home_super_team_id : m.home_team_id;
        const awayId = isTeamMode ? m.away_super_team_id : m.away_team_id;

        const homeEntry = standingsMap[homeId];
        const awayEntry = standingsMap[awayId];

        if (!homeEntry || !awayEntry) return;

        homeEntry.matches_played += 1;
        awayEntry.matches_played += 1;

        let homeSetsWon = 0;
        let awaySetsWon = 0;

        (m.sets || []).forEach(s => {
            if (s.status !== 'finished') return;
            const hScore = s.home_score || 0;
            const aScore = s.away_score || 0;

            homeEntry.pts_won += hScore;
            homeEntry.pts_lost += aScore;
            awayEntry.pts_won += aScore;
            awayEntry.pts_lost += hScore;

            // Check set winner matching team or super team
            if (s.winner_team_id === homeId || (isTeamMode && (s.winner_team_id === m.home_super_team_id || s.winner_team_id === m.home_team_id))) {
                homeSetsWon += 1;
            } else if (s.winner_team_id === awayId || (isTeamMode && (s.winner_team_id === m.away_super_team_id || s.winner_team_id === m.away_team_id))) {
                awaySetsWon += 1;
            }
        });

        homeEntry.set_won += homeSetsWon;
        homeEntry.set_lost += awaySetsWon;
        awayEntry.set_won += awaySetsWon;
        awayEntry.set_lost += homeSetsWon;

        const winnerId = m.winner_team_id || (homeSetsWon > awaySetsWon ? homeId : awayId);

        if (winnerId === homeId) {
            homeEntry.matches_won += 1;
            awayEntry.matches_lost += 1;
            homeEntry.score += 3;
            awayEntry.score += 0;
        } else if (winnerId === awayId) {
            awayEntry.matches_won += 1;
            homeEntry.matches_lost += 1;
            awayEntry.score += 3;
            homeEntry.score += 0;
        }

        if (isTeamMode) {
            homeEntry.game_won += homeSetsWon;
            homeEntry.game_lost += awaySetsWon;
            awayEntry.game_won += awaySetsWon;
            awayEntry.game_lost += homeSetsWon;
        }
    });

    const standingsList = Object.values(standingsMap).map(st => {
        st.matches_diff = st.matches_won - st.matches_lost;
        st.game_diff = st.game_won - st.game_lost;
        st.set_diff = st.set_won - st.set_lost;
        st.pts_diff = st.pts_won - st.pts_lost;
        return st;
    });

    standingsList.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.matches_diff !== a.matches_diff) return b.matches_diff - a.matches_diff;
        if (b.set_diff !== a.set_diff) return b.set_diff - a.set_diff;
        return b.pts_diff - a.pts_diff;
    });

    return standingsList;
}

function OverviewTab({ tournament }) {
    const poolsByMode = (tournament.pools || []).reduce((acc, pool) => {
        const mode = pool.match_mode || tournament.mode || 'regu';
        if (!acc[mode]) acc[mode] = [];
        acc[mode].push(pool);
        return acc;
    }, {});

    const modeConfig = {
        regu:        { label: 'Mode Regu',        badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30', icon: '🏐' },
        double:      { label: 'Mode Double',      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', icon: '👥' },
        quadrant:    { label: 'Mode Quadrant',    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30', icon: '⬡' },
        team_regu:   { label: 'Mode Team Regu',   badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30', icon: '🏆' },
        team_double: { label: 'Mode Team Double', badge: 'bg-red-500/20 text-red-300 border-red-500/30', icon: '🥇' },
    };

    if (!tournament.pools || tournament.pools.length === 0) {
        return (
            <div className="text-center py-12 rounded-xl border border-dashed border-surface-700/50">
                <p className="text-surface-500 text-sm">Belum ada pool dibuat</p>
                <Link href={route('pools.index', tournament.id)} className="text-primary-400 text-sm hover:text-primary-300 mt-2 inline-block">
                    Buat Pool →
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {Object.entries(poolsByMode).map(([modeKey, pools]) => {
                const cfg = modeConfig[modeKey] || { label: modeKey, badge: 'bg-surface-800 text-surface-300', icon: '⚽' };
                return (
                    <div key={modeKey} className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-surface-800">
                            <span className="text-lg">{cfg.icon}</span>
                            <h3 className="text-base font-bold text-surface-100">{cfg.label}</h3>
                            <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${cfg.badge}`}>
                                {pools.length} Pool
                            </span>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {pools.map((pool) => {
                                const isTeamMode = pool.match_mode === 'team_regu' || pool.match_mode === 'team_double';
                                const standings = computePoolStandings(pool, tournament.matches);

                                return (
                                    <div key={pool.id} className="rounded-xl border border-surface-700/50 bg-surface-900/50 overflow-hidden shadow-md">
                                        <div className="px-5 py-3 border-b border-surface-700/50 bg-surface-800/40 flex items-center justify-between">
                                            <h4 className="text-sm font-bold text-surface-100 flex items-center gap-2">
                                                <span>🏊 Pool {pool.name}</span>
                                            </h4>
                                            <span className="text-[10px] text-surface-400 font-mono uppercase bg-surface-950 px-2 py-0.5 rounded border border-surface-800">
                                                {cfg.label}
                                            </span>
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse font-sans text-xs">
                                                <thead>
                                                    {/* Header Row 1 */}
                                                    <tr className="bg-surface-950 text-surface-400 border-b border-surface-700/60 uppercase tracking-wider text-[10px] font-bold">
                                                        <th className="px-3 py-2 text-center w-8 border-r border-surface-800">#</th>
                                                        <th className="px-4 py-2 border-r border-surface-800">Tim / Kontingen</th>
                                                        <th colSpan="4" className="px-2 py-1.5 text-center border-r border-surface-800 bg-surface-900/80">Matches</th>
                                                        {isTeamMode && (
                                                            <th colSpan="3" className="px-2 py-1.5 text-center border-r border-surface-800 bg-amber-500/10 text-amber-300">Game</th>
                                                        )}
                                                        <th colSpan="3" className="px-2 py-1.5 text-center border-r border-surface-800 bg-blue-500/10 text-blue-300">Sets</th>
                                                        <th colSpan="3" className="px-2 py-1.5 text-center border-r border-surface-800 bg-emerald-500/10 text-emerald-300">Points</th>
                                                        <th className="px-3 py-2 text-center bg-amber-500/20 text-amber-300 font-black">Score</th>
                                                    </tr>

                                                    {/* Header Row 2 */}
                                                    <tr className="bg-surface-900/90 text-surface-400 border-b border-surface-700/60 text-[9px] font-semibold text-center">
                                                        <th className="border-r border-surface-800"></th>
                                                        <th className="border-r border-surface-800"></th>
                                                        {/* Matches */}
                                                        <th className="px-2 py-1 border-r border-surface-800/50">Played</th>
                                                        <th className="px-2 py-1 border-r border-surface-800/50 text-primary-400">Won</th>
                                                        <th className="px-2 py-1 border-r border-surface-800/50 text-red-400">Lost</th>
                                                        <th className="px-2 py-1 border-r border-surface-800">Diff</th>

                                                        {/* Game */}
                                                        {isTeamMode && (
                                                            <>
                                                                <th className="px-2 py-1 border-r border-surface-800/50 text-amber-300">Won</th>
                                                                <th className="px-2 py-1 border-r border-surface-800/50 text-red-400">Lost</th>
                                                                <th className="px-2 py-1 border-r border-surface-800">Diff</th>
                                                            </>
                                                        )}

                                                        {/* Sets */}
                                                        <th className="px-2 py-1 border-r border-surface-800/50 text-blue-300">Won</th>
                                                        <th className="px-2 py-1 border-r border-surface-800/50 text-red-400">Lost</th>
                                                        <th className="px-2 py-1 border-r border-surface-800">Diff</th>

                                                        {/* Points */}
                                                        <th className="px-2 py-1 border-r border-surface-800/50 text-emerald-300">Won</th>
                                                        <th className="px-2 py-1 border-r border-surface-800/50 text-red-400">Lost</th>
                                                        <th className="px-2 py-1 border-r border-surface-800">Diff</th>

                                                        {/* Score */}
                                                        <th className="px-2 py-1 bg-amber-500/10 text-amber-400 font-bold">Pts</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-surface-800/40">
                                                    {standings.map((st, i) => {
                                                        const rankBadgeClass = i === 0
                                                            ? 'bg-emerald-500/15 text-emerald-300 border-l-4 border-emerald-500 font-extrabold'
                                                            : i === 1
                                                            ? 'bg-teal-500/15 text-teal-300 border-l-4 border-teal-400 font-extrabold'
                                                            : 'text-surface-300 hover:bg-surface-800/30';

                                                        return (
                                                            <tr key={st.id} className={`transition-colors text-xs ${rankBadgeClass}`}>
                                                                <td className="px-3 py-2.5 text-center font-mono font-bold">
                                                                    {i === 0 ? '🥇 1' : i === 1 ? '🥈 2' : (i + 1)}
                                                                </td>
                                                                <td className="px-4 py-2.5 font-semibold text-surface-100">
                                                                    <div>
                                                                        {st.name}
                                                                        {st.members && st.members.length > 0 && (
                                                                            <div className="text-[9px] text-surface-400 font-normal truncate max-w-[150px]">
                                                                                {st.members.map(m => m.name).join(' • ')}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </td>

                                                                {/* Matches */}
                                                                <td className="px-2 py-2.5 text-center font-mono text-surface-300">{st.matches_played}</td>
                                                                <td className="px-2 py-2.5 text-center font-mono text-primary-400 font-bold">{st.matches_won}</td>
                                                                <td className="px-2 py-2.5 text-center font-mono text-red-400">{st.matches_lost}</td>
                                                                <td className="px-2 py-2.5 text-center font-mono text-surface-400">{st.matches_diff > 0 ? `+${st.matches_diff}` : st.matches_diff}</td>

                                                                {/* Game */}
                                                                {isTeamMode && (
                                                                    <>
                                                                        <td className="px-2 py-2.5 text-center font-mono text-amber-300 font-bold">{st.game_won}</td>
                                                                        <td className="px-2 py-2.5 text-center font-mono text-red-400">{st.game_lost}</td>
                                                                        <td className="px-2 py-2.5 text-center font-mono text-surface-400">{st.game_diff > 0 ? `+${st.game_diff}` : st.game_diff}</td>
                                                                    </>
                                                                )}

                                                                {/* Sets */}
                                                                <td className="px-2 py-2.5 text-center font-mono text-blue-300 font-bold">{st.set_won}</td>
                                                                <td className="px-2 py-2.5 text-center font-mono text-red-400">{st.set_lost}</td>
                                                                <td className="px-2 py-2.5 text-center font-mono text-surface-400">{st.set_diff > 0 ? `+${st.set_diff}` : st.set_diff}</td>

                                                                {/* Points */}
                                                                <td className="px-2 py-2.5 text-center font-mono text-emerald-300 font-bold">{st.pts_won}</td>
                                                                <td className="px-2 py-2.5 text-center font-mono text-red-400">{st.pts_lost}</td>
                                                                <td className="px-2 py-2.5 text-center font-mono text-surface-400">{st.pts_diff > 0 ? `+${st.pts_diff}` : st.pts_diff}</td>

                                                                {/* Score */}
                                                                <td className="px-3 py-2.5 text-center font-mono font-black text-amber-400 bg-amber-500/10">
                                                                    {st.score}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
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
    const poolsByMode = (pools || []).reduce((acc, pool) => {
        const mode = pool.match_mode || 'regu';
        if (!acc[mode]) acc[mode] = [];
        acc[mode].push(pool);
        return acc;
    }, {});

    const modeLabels = {
        regu:        { label: 'Mode Regu',        icon: '🏐', color: 'text-blue-400' },
        double:      { label: 'Mode Double',      icon: '👥', color: 'text-emerald-400' },
        quadrant:    { label: 'Mode Quadrant',    icon: '⬡', color: 'text-purple-400' },
        team_regu:   { label: 'Mode Team Regu',   icon: '🏆', color: 'text-amber-400' },
        team_double: { label: 'Mode Team Double', icon: '🥇', color: 'text-red-400' },
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-end mb-4">
                <Link
                    href={route('pools.index', tournamentId)}
                    className="px-4 py-2 rounded-xl text-sm font-medium text-primary-300 bg-primary-500/10 border border-primary-500/30 hover:bg-primary-500/20 transition-colors"
                >
                    ⚙️ Kelola Pool
                </Link>
            </div>

            {Object.keys(poolsByMode).length === 0 ? (
                <div className="text-center py-12 rounded-xl border border-dashed border-surface-700/50">
                    <p className="text-surface-500 text-sm">Belum ada pool dibuat</p>
                </div>
            ) : (
                Object.entries(poolsByMode).map(([modeKey, modePools]) => {
                    const cfg = modeLabels[modeKey] || { label: modeKey, icon: '⚽', color: 'text-surface-300' };
                    return (
                        <div key={modeKey} className="space-y-3">
                            <h3 className={`text-sm font-bold flex items-center gap-2 ${cfg.color}`}>
                                <span>{cfg.icon}</span>
                                {cfg.label} ({modePools.length} Pool)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {modePools.map((pool) => (
                                    <div key={pool.id} className="rounded-xl border border-surface-700/50 bg-surface-900/50 p-5">
                                        <h4 className="text-sm font-semibold text-accent-300 mb-3">Pool {pool.name}</h4>
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
                })
            )}
        </div>
    );
}

function MatchesTab({ matches }) {
    const [selectedMode, setSelectedMode] = useState('all');

    const availableModes = Array.from(new Set((matches || []).map(m => m.match_mode).filter(Boolean)));

    const filteredMatches = selectedMode === 'all'
        ? matches
        : (matches || []).filter(m => m.match_mode === selectedMode);

    return (
        <div className="space-y-4">
            {availableModes.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                    <button
                        onClick={() => setSelectedMode('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            selectedMode === 'all' ? 'bg-primary-600 text-white' : 'bg-surface-800 text-surface-400 hover:text-surface-200'
                        }`}
                    >
                        Semua Mode ({matches?.length || 0})
                    </button>
                    {availableModes.map(m => (
                        <button
                            key={m}
                            onClick={() => setSelectedMode(m)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium uppercase tracking-wider transition-colors ${
                                selectedMode === m ? 'bg-primary-600 text-white' : 'bg-surface-800 text-surface-400 hover:text-surface-200'
                            }`}
                        >
                            {m.replace('_', ' ')}
                        </button>
                    ))}
                </div>
            )}

            {(!filteredMatches || filteredMatches.length === 0) ? (
                <div className="text-center py-12 rounded-xl border border-dashed border-surface-700/50">
                    <p className="text-surface-500 text-sm">Belum ada pertandingan</p>
                </div>
            ) : (
                filteredMatches.map((match) => (
                    <Link
                        key={match.id}
                        href={route('matches.show', match.id)}
                        className="block p-4 rounded-xl bg-surface-900/50 border border-surface-700/50 hover:border-primary-500/30 transition-all duration-200"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <StatusBadge status={match.status} size="xs" />
                                <StatusBadge status={match.stage} size="xs" />
                                {match.match_mode && (
                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-surface-800 text-primary-300">
                                        {match.match_mode.replace('_', ' ')}
                                    </span>
                                )}
                            </div>
                            {match.referee && <span className="text-xs text-surface-500">🧑‍⚖️ {match.referee.name}</span>}
                        </div>
                        <div className="flex items-center justify-center gap-4">
                            <span className="text-sm font-medium text-surface-200 text-right flex-1">
                                {match.home_display_name || match.home_team?.name || 'TBD'}
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
                                {match.away_display_name || match.away_team?.name || 'TBD'}
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
    const activeModes = (tournament.modes || []).filter(m => m.is_active).map(m => m.match_mode);
    const availableModes = activeModes.length > 0
        ? activeModes
        : Array.from(new Set((tournament.matches || []).map(m => m.match_mode).filter(Boolean)));

    const [selectedMode, setSelectedMode] = useState(availableModes[0] || 'regu');

    const modeLabels = {
        regu:        { label: 'Bagan Regu',        icon: '🏐', color: 'bg-blue-600/20 text-blue-300 border-blue-500/30' },
        double:      { label: 'Bagan Double',      icon: '👥', color: 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30' },
        quadrant:    { label: 'Bagan Quadrant',    icon: '⬡', color: 'bg-purple-600/20 text-purple-300 border-purple-500/30' },
        team_regu:   { label: 'Bagan Team Regu',   icon: '🏆', color: 'bg-amber-600/20 text-amber-300 border-amber-500/30' },
        team_double: { label: 'Bagan Team Double', icon: '🥇', color: 'bg-red-600/20 text-red-300 border-red-500/30' },
    };

    // Filter match bracket berdasarkan mode yang terpilih
    const bracketMatches = (tournament.matches || []).filter(
        m => m.stage !== 'pool' && (m.match_mode === selectedMode || !m.match_mode)
    );

    const qfMatches = bracketMatches.filter(m => m.stage === 'quarterfinal' || m.stage === 'round_of_8').sort((a, b) => a.bracket_position - b.bracket_position);
    const sfMatches = bracketMatches.filter(m => m.stage === 'semifinal').sort((a, b) => a.bracket_position - b.bracket_position);
    const finalMatch = bracketMatches.find(m => m.stage === 'final');
    const thirdMatch = bracketMatches.find(m => m.stage === 'third_place');

    return (
        <div className="space-y-4">
            {/* Sub-tabs Per Mode Tanding */}
            {availableModes.length > 1 && (
                <div className="flex gap-2 border-b border-surface-800 pb-3 overflow-x-auto">
                    {availableModes.map(mode => {
                        const cfg = modeLabels[mode] || { label: mode, icon: '⚽', color: '' };
                        const isActive = selectedMode === mode;
                        return (
                            <button
                                key={mode}
                                onClick={() => setSelectedMode(mode)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                                    isActive
                                        ? cfg.color
                                        : 'bg-surface-800/50 text-surface-400 border-surface-700 hover:border-surface-600'
                                }`}
                            >
                                <span>{cfg.icon}</span>
                                {cfg.label}
                            </button>
                        );
                    })}
                </div>
            )}

            <div className="rounded-xl border border-surface-700/50 bg-surface-900/40 p-6 overflow-x-auto">
                <div className="min-w-[800px] flex flex-col md:flex-row gap-6 md:gap-12 justify-center items-center py-6">
                    {/* Column 1: Quarterfinals / R8 */}
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
                        {finalMatch ? (
                            <div className="space-y-2">
                                <p className="text-[10px] font-extrabold text-amber-400 uppercase tracking-widest text-center border-b border-amber-500/20 pb-2">🏆 Final ({selectedMode})</p>
                                <BracketMatchCard match={finalMatch} />
                            </div>
                        ) : (
                            <div className="text-center py-8 text-surface-500 text-xs italic">
                                Belum ada bagan final untuk mode ini
                            </div>
                        )}
                    </div>
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

    const homeName = match.home_display_name
        || match.home_super_team?.name
        || match.home_team?.name
        || match.home_placeholder
        || 'TBD';

    const awayName = match.away_display_name
        || match.away_super_team?.name
        || match.away_team?.name
        || match.away_placeholder
        || 'TBD';

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
                        }`} title={homeName}>
                            {homeName}
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
                        }`} title={awayName}>
                            {awayName}
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

