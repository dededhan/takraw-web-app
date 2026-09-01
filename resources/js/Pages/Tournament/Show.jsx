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
    const [copiedKey, setCopiedKey] = useState(false);
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
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h1 className="text-2xl font-bold text-surface-100">{tournament.name}</h1>
                            <StatusBadge status={tournament.status} size="md" />
                            {tournament.registration_code ? (
                                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                                    <span>🔐 Kunci:</span>
                                    <span className="font-mono font-bold text-amber-200 tracking-wider bg-black/40 px-2 py-0.5 rounded">
                                        {tournament.registration_code}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            navigator.clipboard.writeText(tournament.registration_code);
                                            setCopiedKey(true);
                                            setTimeout(() => setCopiedKey(false), 2000);
                                        }}
                                        className="px-2 py-0.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-medium transition-colors text-[11px] cursor-pointer"
                                        title="Salin Kunci untuk Pelatih"
                                    >
                                        {copiedKey ? '✓ Disalin!' : '📋 Salin'}
                                    </button>
                                </div>
                            ) : (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-surface-800/80 border border-surface-700/50 text-surface-400 text-xs">
                                    <span>🔓 Terbuka Tanpa Kunci</span>
                                </div>
                            )}
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
                        <a
                            href={route('tournaments.master-schedule.print', tournament.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 rounded-xl text-sm font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors flex items-center gap-1.5"
                            title="Cetak format tabel formal untuk panitia dan wasit"
                        >
                            🖨️ Cetak Jadwal Resmi
                        </a>
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
                        <p className="text-2xl font-bold text-surface-100">
                            {(tournament.teams?.length || 0) + (tournament.super_teams?.length || tournament.superTeams?.length || 0)}
                        </p>
                        <p className="text-xs text-surface-500">
                            {(tournament.super_teams?.length || tournament.superTeams?.length) ? 'Kontestan' : 'Tim'}
                        </p>
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
                {activeTab === 'teams' && (
                    <TeamsTab
                        teams={tournament.teams || []}
                        superTeams={tournament.super_teams || tournament.superTeams || []}
                        availableTeams={availableTeams}
                        tournamentId={tournament.id}
                        status={tournament.status}
                        tournament={tournament}
                    />
                )}
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


function TeamsTab({ teams = [], superTeams = [], availableTeams = [], tournamentId, status, tournament }) {
    const { auth } = usePage().props;
    const isAdmin = auth.user?.role === 'admin';
    const isRegPhase = status === 'draft' || status === 'registration';

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [modalSearchQuery, setModalSearchQuery] = useState('');
    const [selectedTeamIds, setSelectedTeamIds] = useState([]);
    const [selectedMode, setSelectedMode] = useState('');
    const [processing, setProcessing] = useState(false);

    const regularModes = (tournament?.modes || []).filter(m => ['regu', 'double', 'quadrant'].includes(m.match_mode));

    // Filter regular teams by team name, region, coach name, or athlete name
    const filteredTeams = teams.filter(team => {
        const query = searchQuery.toLowerCase();
        const matchesTeam = team.name?.toLowerCase().includes(query) || (team.region && team.region.toLowerCase().includes(query));
        const matchesCoach = team.coach?.name?.toLowerCase().includes(query);
        const matchesAthlete = (team.athletes || []).some(a => a.name?.toLowerCase().includes(query));
        return matchesTeam || matchesCoach || matchesAthlete;
    });

    // Filter super teams by super team name, member name, coach name, or athlete name
    const filteredSuperTeams = superTeams.filter(st => {
        const query = searchQuery.toLowerCase();
        const matchesName = st.name?.toLowerCase().includes(query);
        const matchesCoach = st.coach?.name?.toLowerCase().includes(query);
        const matchesMembers = (st.members || []).some(m =>
            m.name?.toLowerCase().includes(query) ||
            m.region?.toLowerCase().includes(query) ||
            (m.athletes || []).some(a => a.name?.toLowerCase().includes(query))
        );
        return matchesName || matchesCoach || matchesMembers;
    });

    const totalContestants = filteredTeams.length + filteredSuperTeams.length;

    const filteredAvailable = availableTeams.filter(team =>
        team.name?.toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
        (team.region && team.region.toLowerCase().includes(modalSearchQuery.toLowerCase())) ||
        (team.coach?.name && team.coach.name.toLowerCase().includes(modalSearchQuery.toLowerCase()))
    );

    const openAddModal = () => {
        setSelectedTeamIds([]);
        setModalSearchQuery('');
        if (regularModes.length > 0) {
            setSelectedMode(regularModes[0].match_mode);
        } else {
            setSelectedMode('regu');
        }
        setIsModalOpen(true);
    };

    const toggleTeamSelection = (teamId) => {
        setSelectedTeamIds(prev =>
            prev.includes(teamId)
                ? prev.filter(id => id !== teamId)
                : [...prev, teamId]
        );
    };

    const handleSelectAll = () => {
        const filteredIds = filteredAvailable.map(t => t.id);
        const allSelected = filteredIds.length > 0 && filteredIds.every(id => selectedTeamIds.includes(id));
        if (allSelected) {
            setSelectedTeamIds(prev => prev.filter(id => !filteredIds.includes(id)));
        } else {
            setSelectedTeamIds(prev => Array.from(new Set([...prev, ...filteredIds])));
        }
    };

    const handleAddTeam = (e) => {
        e.preventDefault();
        if (selectedTeamIds.length === 0) return;

        router.post(route('tournaments.add-team', tournamentId), {
            team_ids: selectedTeamIds,
            match_mode: selectedMode || undefined,
        }, {
            onStart: () => setProcessing(true),
            onFinish: () => {
                setProcessing(false);
                setIsModalOpen(false);
                setSelectedTeamIds([]);
                setModalSearchQuery('');
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

    const positionColors = {
        Tekong: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        Feeder: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        Killer: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        Cadangan: 'bg-surface-700/60 text-surface-300 border-surface-600/50',
    };

    return (
        <div className="space-y-8">
            {/* Top Toolbar: Search & Add Team */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-900/60 border border-surface-700/50 rounded-2xl p-4">
                <div className="flex-1 max-w-md relative">
                    <input
                        type="text"
                        placeholder="🔍 Cari nama tim, super team, pelatih, atau atlet..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-surface-950 border border-surface-700 text-surface-200 rounded-xl px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-2.5 text-surface-500 hover:text-surface-300 text-sm"
                        >
                            ✕
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-surface-400">
                        Total: <strong className="text-primary-300">{totalContestants}</strong> Kontestan Terdaftar
                        {filteredSuperTeams.length > 0 && ` (${filteredSuperTeams.length} Super Team)`}
                    </span>

                    {isAdmin && isRegPhase && (
                        <button
                            onClick={openAddModal}
                            className="px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold text-white bg-primary-600 hover:bg-primary-550 shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                            ➕ Tambah Tim ke Turnamen
                        </button>
                    )}
                </div>
            </div>

            {/* Empty State */}
            {totalContestants === 0 && (
                <div className="text-center py-16 rounded-2xl border border-dashed border-surface-700/60 bg-surface-900/30">
                    <p className="text-4xl mb-3">👥</p>
                    <p className="text-surface-300 font-bold text-base">Belum ada tim atau Super Team yang terdaftar</p>
                    <p className="text-surface-500 text-xs mt-1">Gunakan tombol pendaftaran untuk menambahkan tim ke turnamen ini.</p>
                </div>
            )}

            {/* 1. Super Teams Section */}
            {filteredSuperTeams.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-surface-800">
                        <span className="text-xl">🏆</span>
                        <h3 className="text-base font-bold text-surface-100">Super Teams Terdaftar</h3>
                        <span className="text-xs px-2.5 py-0.5 rounded-full border font-bold bg-amber-500/20 text-amber-300 border-amber-500/30">
                            {filteredSuperTeams.length} Super Team
                        </span>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        {filteredSuperTeams.map((st) => {
                            const totalAthletes = (st.members || []).reduce((sum, m) => sum + (m.athletes?.length || 0), 0);

                            return (
                                <div
                                    key={st.id}
                                    className="rounded-2xl border border-amber-500/40 bg-gradient-to-b from-surface-900/90 to-surface-950/80 shadow-2xl overflow-hidden"
                                >
                                    {/* Super Team Header */}
                                    <div className="p-5 border-b border-surface-800/80 bg-gradient-to-r from-amber-500/10 via-surface-900 to-surface-900">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="flex items-center gap-3.5 flex-1 min-w-0">
                                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/30 via-amber-600/20 to-amber-700/10 border border-amber-500/40 flex items-center justify-center text-2xl font-black text-amber-300 shrink-0 shadow-inner">
                                                    🏆
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h3 className="text-lg font-black text-amber-200 truncate">
                                                            {st.name}
                                                        </h3>
                                                        <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase">
                                                            {st.match_mode === 'team_double' ? 'Team Double (3x2)' : 'Team Regu (3x3)'}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-surface-400 font-bold mt-0.5">
                                                        👥 {st.members?.length || 0} Sub-Tim • {totalAthletes} Total Atlet
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Coach Card Info */}
                                            <div className="rounded-xl bg-surface-950/80 border border-surface-800 p-3 flex items-center gap-3 text-xs shrink-0">
                                                <span className="text-xl">👔</span>
                                                <div>
                                                    <span className="text-[10px] uppercase font-bold text-surface-400 block leading-tight">Pelatih Super Team</span>
                                                    <span className="text-xs font-bold text-surface-200">
                                                        {st.coach?.name || st.creator?.name || (st.members && st.members[0]?.coach?.name) || 'Belum Ditentukan'}
                                                    </span>
                                                    {(st.coach?.phone || st.creator?.phone || (st.members && st.members[0]?.coach?.phone)) && (
                                                        <span className="text-[10px] font-mono text-primary-300 block">
                                                            📞 {st.coach?.phone || st.creator?.phone || st.members[0]?.coach?.phone}
                                                        </span>
                                                    )}
                                                    {(st.coach?.email || st.creator?.email) && (
                                                        <span className="text-[10px] text-surface-400 block truncate max-w-[160px]">
                                                            ✉️ {st.coach?.email || st.creator?.email}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 3 Sub-Teams Breakdown */}
                                    <div className="p-5 bg-surface-950/50">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-surface-400 mb-3 flex items-center gap-1.5">
                                            <span>⚔️</span>
                                            <span>Daftar 3 Sub-Tim & Anggota Atlet:</span>
                                        </h4>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {(st.members || []).map((sub, sIdx) => (
                                                <div
                                                    key={sub.id || sIdx}
                                                    className="rounded-xl border border-surface-800 bg-surface-900/80 p-3.5 space-y-3 flex flex-col justify-between"
                                                >
                                                    <div className="flex items-center justify-between pb-2 border-b border-surface-800">
                                                        <div>
                                                            <h5 className="text-xs font-black text-surface-200 flex items-center gap-1.5">
                                                                <span className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-mono font-black flex items-center justify-center border border-amber-500/30">
                                                                    {sIdx + 1}
                                                                </span>
                                                                <span>{sub.name}</span>
                                                            </h5>
                                                            {sub.region && (
                                                                <span className="text-[10px] text-surface-400 font-semibold block mt-0.5">
                                                                    📍 {sub.region}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] text-emerald-400 font-bold">
                                                            {sub.athletes?.length || 0} Atlet
                                                        </span>
                                                    </div>

                                                    {/* Athletes */}
                                                    <div className="space-y-1.5 flex-1">
                                                        {(!sub.athletes || sub.athletes.length === 0) ? (
                                                            <p className="text-[11px] text-surface-500 italic py-1">Belum ada atlet.</p>
                                                        ) : (
                                                            sub.athletes.map((ath, aIdx) => {
                                                                const jerseyNo = ath.jersey_number || ath.number || (aIdx + 1);
                                                                const posStyle = positionColors[ath.position] || positionColors.Cadangan;

                                                                return (
                                                                    <div
                                                                        key={ath.id || aIdx}
                                                                        className="flex items-center justify-between gap-1.5 p-1.5 rounded-lg bg-surface-950/60 border border-surface-800 text-xs"
                                                                    >
                                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                                            <span className="w-5 h-5 rounded bg-surface-800 text-primary-300 font-mono font-black text-[10px] flex items-center justify-center shrink-0 border border-surface-700">
                                                                                #{jerseyNo}
                                                                            </span>
                                                                            <span className="text-[11px] font-bold text-surface-200 truncate" title={ath.name}>
                                                                                {ath.name}
                                                                            </span>
                                                                        </div>
                                                                        {ath.position && (
                                                                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold border shrink-0 ${posStyle}`}>
                                                                                {ath.position}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* 2. Regular Teams Section */}
            {filteredTeams.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-surface-800">
                        <span className="text-xl">👥</span>
                        <h3 className="text-base font-bold text-surface-100">Tim Reguler Terdaftar</h3>
                        <span className="text-xs px-2.5 py-0.5 rounded-full border font-bold bg-primary-500/20 text-primary-300 border-primary-500/30">
                            {filteredTeams.length} Tim
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filteredTeams.map((team) => (
                            <div
                                key={team.id}
                                className="rounded-2xl border border-surface-700/60 bg-gradient-to-b from-surface-900/90 to-surface-950/80 shadow-xl overflow-hidden hover:border-surface-600/80 transition-all flex flex-col justify-between"
                            >
                                {/* Card Top: Team Header & Coach Info */}
                                <div className="p-5 border-b border-surface-800/80">
                                    <div className="flex items-start justify-between gap-3 mb-4">
                                        <div className="flex items-center gap-3.5 flex-1 min-w-0">
                                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500/30 via-primary-600/20 to-primary-700/10 border border-primary-500/30 flex items-center justify-center text-lg font-black text-primary-300 shrink-0 shadow-inner">
                                                {team.name.charAt(0)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="text-base font-black text-surface-100 truncate">
                                                        {team.name}
                                                    </h3>
                                                    {team.region && (
                                                        <span className="px-2 py-0.5 rounded-md bg-surface-800 border border-surface-700/60 text-surface-300 text-[10px] font-semibold">
                                                            📍 {team.region}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-emerald-400 font-bold mt-0.5">
                                                    👥 {team.athletes?.length || 0} Atlet Terdaftar
                                                </p>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <Link
                                                href={route('teams.show', team.id)}
                                                className="px-3 py-1.5 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-300 hover:text-white text-xs font-bold transition-all border border-surface-700/50 flex items-center gap-1"
                                            >
                                                Detail →
                                            </Link>

                                            {isAdmin && isRegPhase && (
                                                <button
                                                    onClick={() => handleRemoveTeam(team)}
                                                    disabled={processing}
                                                    className="p-1.5 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/20 border border-red-500/30 transition-colors disabled:opacity-50"
                                                    title="Keluarkan tim dari turnamen"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Coach Card / Info */}
                                    <div className="rounded-xl bg-surface-950/60 border border-surface-800 p-3 flex items-center justify-between gap-3 text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="text-base">👔</span>
                                            <div>
                                                <span className="text-[10px] uppercase font-bold text-surface-400 block leading-tight">Pelatih / Official</span>
                                                <span className="text-xs font-bold text-surface-200">
                                                    {team.coach?.name || 'Belum Ditentukan'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right text-[11px] text-surface-400">
                                            {team.coach?.phone && <span className="block font-mono text-primary-300">📞 {team.coach.phone}</span>}
                                            {team.coach?.email && <span className="block truncate max-w-[150px]">{team.coach.email}</span>}
                                        </div>
                                    </div>
                                </div>

                                {/* Card Bottom: Athlete Roster */}
                                <div className="p-4 bg-surface-950/40">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-surface-400 mb-2.5 flex items-center gap-1.5">
                                        <span>🏃</span>
                                        <span>Daftar Atlet & Posisi:</span>
                                    </p>

                                    {(!team.athletes || team.athletes.length === 0) ? (
                                        <p className="text-xs text-surface-500 italic py-2">
                                            Belum ada data atlet yang didaftarkan pada tim ini.
                                        </p>
                                    ) : (
                                        <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
                                            {team.athletes.map((athlete, aIdx) => {
                                                const jerseyNo = athlete.jersey_number || athlete.number || (aIdx + 1);
                                                const posStyle = positionColors[athlete.position] || positionColors.Cadangan;

                                                return (
                                                    <div
                                                        key={athlete.id || aIdx}
                                                        className="flex items-center justify-between gap-2 p-2 rounded-xl bg-surface-900/80 border border-surface-800/80 hover:border-surface-700 transition-colors"
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <span className="w-6 h-6 rounded-lg bg-surface-800 text-primary-300 font-mono font-black text-xs flex items-center justify-center shrink-0 border border-surface-700">
                                                                #{jerseyNo}
                                                            </span>
                                                            <span className="text-xs font-bold text-surface-200 truncate" title={athlete.name}>
                                                                {athlete.name}
                                                            </span>
                                                        </div>

                                                        {athlete.position && (
                                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border shrink-0 ${posStyle}`}>
                                                                {athlete.position}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

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
                                {regularModes.length > 1 && (
                                    <div>
                                        <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wider mb-1.5">
                                            Kategori / Mode Pertandingan
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {regularModes.map(m => (
                                                <button
                                                    key={m.match_mode}
                                                    type="button"
                                                    onClick={() => setSelectedMode(m.match_mode)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${
                                                        selectedMode === m.match_mode
                                                            ? 'bg-primary-600/20 text-primary-300 border-primary-500/50'
                                                            : 'bg-surface-950 text-surface-400 border-surface-700 hover:text-surface-200'
                                                    }`}
                                                >
                                                    {m.match_mode === 'regu' ? 'Regu (3 vs 3)' : m.match_mode === 'double' ? 'Double (2 vs 2)' : 'Quadrant (4 vs 4)'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wider">
                                            Cari & Pilih Tim
                                        </label>
                                        <button
                                            type="button"
                                            onClick={handleSelectAll}
                                            className="text-xs text-primary-400 hover:text-primary-300 font-semibold transition-colors cursor-pointer"
                                        >
                                            {filteredAvailable.length > 0 && filteredAvailable.every(t => selectedTeamIds.includes(t.id))
                                                ? '✕ Batal Pilih Semua'
                                                : '✓ Pilih Semua'}
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Cari berdasarkan nama, daerah, atau pelatih..."
                                        value={modalSearchQuery}
                                        onChange={(e) => setModalSearchQuery(e.target.value)}
                                        className="w-full bg-surface-950 border border-surface-700 text-surface-200 rounded-xl px-4 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors mb-2"
                                    />
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-xs text-surface-400">
                                            Daftar Tim ({filteredAvailable.length} tim)
                                        </span>
                                        <span className="text-xs font-bold text-primary-300 bg-primary-500/10 px-2 py-0.5 rounded-full border border-primary-500/20">
                                            {selectedTeamIds.length} tim dipilih
                                        </span>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto rounded-xl border border-surface-800 bg-surface-950 divide-y divide-surface-900">
                                        {filteredAvailable.length === 0 ? (
                                            <div className="px-4 py-6 text-xs text-surface-500 text-center">
                                                Tidak ada tim yang cocok dengan pencarian.
                                            </div>
                                        ) : (
                                            filteredAvailable.map((team) => {
                                                const isSelected = selectedTeamIds.includes(team.id);
                                                return (
                                                    <div
                                                        key={team.id}
                                                        onClick={() => toggleTeamSelection(team.id)}
                                                        className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors cursor-pointer ${
                                                            isSelected
                                                                ? 'bg-primary-500/15 text-primary-200'
                                                                : 'text-surface-300 hover:bg-surface-900'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => {}}
                                                                className="rounded border-surface-700 text-primary-600 focus:ring-primary-500 h-4 w-4 pointer-events-none"
                                                            />
                                                            <div>
                                                                <p className="font-medium text-sm text-surface-100">{team.name}</p>
                                                                <p className="text-xs text-surface-400">
                                                                    {team.region || 'Tanpa Wilayah'}
                                                                    {team.coach?.name && ` • Pelatih: ${team.coach.name}`}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {isSelected && (
                                                            <span className="text-xs font-bold text-primary-400 bg-primary-500/20 px-2 py-0.5 rounded">
                                                                Dipilih
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>

                                <div className="flex justify-between items-center pt-4 border-t border-surface-800">
                                    <span className="text-xs text-surface-400">
                                        Total: <strong className="text-primary-300">{selectedTeamIds.length}</strong> tim akan didaftarkan
                                    </span>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setIsModalOpen(false)}
                                            className="px-4 py-2 rounded-xl text-sm font-medium text-surface-400 hover:text-surface-200 bg-surface-800 hover:bg-surface-750 transition-colors"
                                        >
                                            Batal
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={selectedTeamIds.length === 0 || processing}
                                            className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-primary-600 hover:bg-primary-550 disabled:opacity-50 transition-colors cursor-pointer shadow-lg shadow-primary-600/20"
                                        >
                                            {processing
                                                ? 'Menambahkan...'
                                                : selectedTeamIds.length > 0
                                                    ? `Tambah (${selectedTeamIds.length}) Tim`
                                                    : 'Pilih Tim'}
                                        </button>
                                    </div>
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

