import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import StatusBadge from '@/Components/StatusBadge';
import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';

const ZONE_CONFIG = [
    // Top Row (Ganjil): 1, 3, 5, 7
    { key: 'zone_1', label: '1', color: 'from-blue-500/10 to-blue-600/5 border-blue-500/20 text-blue-300', activeColor: 'from-blue-500/40 to-blue-600/30 border-blue-500/60 text-blue-200 shadow-sm' },
    { key: 'zone_2', label: '3', color: 'from-cyan-400/10 to-teal-500/5 border-cyan-400/20 text-cyan-200', activeColor: 'from-cyan-400/40 to-teal-500/30 border-cyan-400/50 text-cyan-100 shadow-sm' },
    { key: 'zone_3', label: '5', color: 'from-yellow-400/10 to-amber-500/5 border-yellow-400/20 text-yellow-200', activeColor: 'from-yellow-400/40 to-amber-500/30 border-yellow-400/50 text-yellow-100 shadow-sm' },
    { key: 'zone_4', label: '7', color: 'from-orange-500/10 to-red-500/5 border-orange-500/20 text-orange-300', activeColor: 'from-orange-500/40 to-red-500/30 border-orange-500/60 text-orange-200 shadow-sm' },

    // Bottom Row (Genap): 2, 4, 6
    { key: 'zone_5', label: '2', color: 'from-blue-400/10 to-cyan-500/5 border-blue-400/20 text-blue-200', activeColor: 'from-blue-400/40 to-cyan-500/30 border-blue-400/50 text-blue-100 shadow-sm' },
    { key: 'zone_6', label: '4', color: 'from-emerald-400/10 to-green-500/5 border-emerald-400/20 text-emerald-200', activeColor: 'from-emerald-400/40 to-green-500/30 border-emerald-400/50 text-emerald-100 shadow-sm' },
    { key: 'zone_7', label: '6', color: 'from-orange-400/10 to-amber-500/5 border-orange-400/20 text-orange-200', activeColor: 'from-orange-400/40 to-amber-500/30 border-orange-400/50 text-orange-100 shadow-sm' },
];

function PlayerCourtMiniature({ stats }) {
    const zones = [
        { key: 'zone_1', label: 'ZONA 1', desc: 'Sudut Atas', style: { top: '6%', left: '48%', width: '24%', height: '22%' } },
        { key: 'zone_2', label: 'ZONA 2', desc: '0.00 - 1.22m', style: { top: '6%', right: '2%', width: '22%', height: '16%' } },
        { key: 'zone_3', label: 'ZONA 3', desc: '1.22 - 2.44m', style: { top: '23%', right: '2%', width: '22%', height: '16%' } },
        { key: 'zone_4', label: 'ZONA 4', desc: '2.44 - 3.66m', style: { top: '40%', right: '2%', width: '22%', height: '16%' } },
        { key: 'zone_5', label: 'ZONA 5', desc: '3.66 - 4.88m', style: { top: '57%', right: '2%', width: '22%', height: '16%' } },
        { key: 'zone_6', label: 'ZONA 6', desc: '4.88 - 6.10m', style: { top: '74%', right: '2%', width: '22%', height: '16%' } },
        { key: 'zone_7', label: 'ZONA 7', desc: 'Sudut Bawah', style: { top: '72%', left: '48%', width: '24%', height: '22%' } },
    ];

    return (
        <div className="w-full max-w-[500px] mx-auto bg-surface-900 border border-surface-700/50 rounded-2xl p-3 shadow-xl">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                    🎯 PETA ZONA JATUH BOLA (ZONA 1 - 7)
                </span>
                <span className="text-[9px] text-surface-400 font-mono">13.40m x 6.10m</span>
            </div>

            {/* Graphic Court Container */}
            <div className="relative w-full aspect-[2.1/1] rounded-xl border-2 border-emerald-500/50 bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950 overflow-hidden shadow-inner select-none">
                
                {/* SVG Court Background Lines */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 190">
                    <rect x="10" y="10" width="380" height="170" fill="none" stroke="#34d399" strokeWidth="2.5" strokeOpacity="0.8" />
                    <line x1="190" y1="10" x2="190" y2="180" stroke="#ffffff" strokeWidth="3" strokeDasharray="5 3" />
                    <text x="190" y="8" fill="#a7f3d0" fontSize="7" textAnchor="middle" fontWeight="bold">NET</text>

                    <circle cx="85" cy="95" r="20" fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="3 2" />
                    <circle cx="85" cy="95" r="5" fill="#fbbf24" />
                    <text x="85" y="125" fill="#fef08a" fontSize="7" textAnchor="middle" fontWeight="bold">TEKONG</text>

                    <line x1="85" y1="95" x2="390" y2="10" stroke="#fbbf24" strokeWidth="1" strokeOpacity="0.6" strokeDasharray="3 3" />
                    <line x1="85" y1="95" x2="390" y2="44" stroke="#60a5fa" strokeWidth="1" strokeOpacity="0.6" strokeDasharray="3 3" />
                    <line x1="85" y1="95" x2="390" y2="78" stroke="#60a5fa" strokeWidth="1" strokeOpacity="0.6" strokeDasharray="3 3" />
                    <line x1="85" y1="95" x2="390" y2="112" stroke="#60a5fa" strokeWidth="1" strokeOpacity="0.6" strokeDasharray="3 3" />
                    <line x1="85" y1="95" x2="390" y2="146" stroke="#60a5fa" strokeWidth="1" strokeOpacity="0.6" strokeDasharray="3 3" />
                    <line x1="85" y1="95" x2="390" y2="180" stroke="#fbbf24" strokeWidth="1" strokeOpacity="0.6" strokeDasharray="3 3" />
                </svg>

                {/* Zone Badges Overlay */}
                {zones.map((z) => {
                    const value = stats[z.key] || 0;
                    const hasValue = value > 0;

                    return (
                        <div
                            key={z.key}
                            style={z.style}
                            className={`
                                absolute rounded-lg border flex flex-col items-center justify-center transition-all duration-150 shadow-md backdrop-blur-xs
                                ${hasValue ? 'bg-emerald-600/90 border-amber-400 ring-2 ring-amber-400/50 shadow-lg' : 'bg-surface-900/60 border-surface-700/50 opacity-60'}
                            `}
                        >
                            <span className="text-[9px] md:text-xs font-black text-emerald-200 leading-tight">
                                {z.label}
                            </span>
                            {hasValue && (
                                <span className="absolute -top-1 -right-1 min-w-[18px] h-4.5 px-1 rounded-full bg-amber-400 text-surface-950 text-[10px] font-black flex items-center justify-center shadow-lg border border-amber-300 animate-bounce">
                                    {value}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function AthleteStatCard({ athlete, stats, color }) {
    const c = color === 'primary'
        ? { text: 'text-primary-300', border: 'border-primary-500/20' }
        : { text: 'text-accent-300', border: 'border-accent-500/20' };

    const totalActions = Object.values(stats).reduce((a, b) => a + b, 0);

    return (
        <div className="rounded-xl border p-3 bg-surface-800/10 border-surface-700/30 flex flex-col sm:flex-row gap-3 items-center sm:items-start">
            <div className="flex-1 w-full">
                <div className="flex items-center gap-2 mb-2">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black bg-surface-800 border border-surface-700 ${c.text}`}>
                        {athlete.jersey_number}
                    </span>
                    <div>
                        <h4 className="text-xs font-bold text-surface-100 leading-tight">{athlete.name}</h4>
                        <p className="text-[9px] text-surface-500 font-medium uppercase tracking-wider leading-none mt-0.5">{athlete.position || 'Pemain'}</p>
                    </div>
                </div>

                {totalActions === 0 ? (
                    <p className="text-[10px] text-surface-500 italic mt-1">Tidak ada data statistik pada set ini.</p>
                ) : (
                    <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                        <div className="bg-surface-900/40 rounded-lg p-1.5 border border-surface-800/40">
                            <span className="text-[8px] text-surface-500 block uppercase font-bold tracking-wider leading-none">🏐 Servis</span>
                            <div className="text-[10px] font-semibold text-surface-300 mt-1 flex gap-1">
                                <span className="text-primary-400">In:{stats.service_in}</span>
                                <span className="text-accent-400">Ace:{stats.service_ace}</span>
                                <span className="text-red-400">Err:{stats.service_error}</span>
                            </div>
                        </div>

                        <div className="bg-surface-900/40 rounded-lg p-1.5 border border-surface-800/40">
                            <span className="text-[8px] text-surface-500 block uppercase font-bold tracking-wider leading-none">⚡ Strike</span>
                            <div className="text-[10px] font-semibold text-surface-300 mt-1 flex gap-1">
                                <span className="text-primary-400">✓:{stats.strike_success}</span>
                                <span className="text-red-400">✗:{stats.strike_fail}</span>
                            </div>
                        </div>

                        <div className="bg-surface-900/40 rounded-lg p-1.5 border border-surface-800/40">
                            <span className="text-[8px] text-surface-500 block uppercase font-bold tracking-wider leading-none">🤲 Receive</span>
                            <div className="text-[10px] font-semibold text-surface-300 mt-1 flex gap-1">
                                <span className="text-primary-400">✓:{stats.receive_success}</span>
                                <span className="text-red-400">✗:{stats.receive_fail}</span>
                            </div>
                        </div>

                        <div className="bg-surface-900/40 rounded-lg p-1.5 border border-surface-800/40">
                            <span className="text-[8px] text-surface-500 block uppercase font-bold tracking-wider leading-none">🎯 Feeding</span>
                            <div className="text-[10px] font-semibold text-surface-300 mt-1 flex gap-1">
                                <span className="text-primary-400">✓:{stats.feeding_success}</span>
                                <span className="text-red-400">✗:{stats.feeding_fail}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {totalActions > 0 && (
                <div className="flex-shrink-0 w-full sm:w-auto">
                    <PlayerCourtMiniature stats={stats} />
                </div>
            )}
        </div>
    );
}

export default function MatchShow({ match: m }) {
    const [setFilter, setSetFilter] = useState('all');

    const homeName = m.home_display_name || m.home_team?.name || m.home_super_team?.name || 'TBD';
    const awayName = m.away_display_name || m.away_team?.name || m.away_super_team?.name || 'TBD';

    const finishedSets = m.sets?.filter(s => s.status === 'finished') || [];
    const setsWonHome = finishedSets.filter(s => s.winner_team_id === m.home_team_id || s.winner_team_id === m.home_super_team_id).length;
    const setsWonAway = finishedSets.filter(s => s.winner_team_id === m.away_team_id || s.winner_team_id === m.away_super_team_id).length;

    const allAthletes = [
        ...(m.home_team?.athletes || []),
        ...(m.away_team?.athletes || []),
        ...(m.home_super_team?.members?.flatMap(mem => mem.athletes || []) || []),
        ...(m.away_super_team?.members?.flatMap(mem => mem.athletes || []) || []),
    ];
    const [selectedAthleteId, setSelectedAthleteId] = useState(allAthletes[0]?.id || null);

    const getTeamStats = (teamId, setId = null) => {
        let stats = [];
        if (setId === 'all') {
            m.sets?.forEach(s => {
                s.stats?.forEach(st => {
                    if (st.team_id === teamId) stats.push(st);
                });
            });
        } else {
            const set = m.sets?.find(s => s.id === setId);
            stats = set?.stats?.filter(st => st.team_id === teamId) || [];
        }
        return stats;
    };

    const aggregateStats = (stats) => {
        const agg = {
            service_in: 0, service_ace: 0, service_error: 0,
            receive_success: 0, receive_fail: 0,
            feeding_success: 0, feeding_fail: 0,
            strike_success: 0, strike_fail: 0,
            block_success: 0, block_fail: 0,
        };
        stats.forEach(s => {
            Object.keys(agg).forEach(k => { agg[k] += s[k] || 0; });
        });
        return agg;
    };

    const getAthleteStats = (athleteId, setId = null) => {
        let stats = [];
        if (setId === 'all') {
            m.sets?.forEach(s => {
                s.stats?.forEach(st => {
                    if (st.athlete_id === athleteId) stats.push(st);
                });
            });
        } else {
            const set = m.sets?.find(s => s.id === setId);
            stats = set?.stats?.filter(st => st.athlete_id === athleteId) || [];
        }

        const agg = {
            service_in: 0, service_ace: 0, service_error: 0,
            receive_success: 0, receive_fail: 0,
            feeding_success: 0, feeding_fail: 0,
            strike_success: 0, strike_fail: 0,
            block_success: 0, block_fail: 0,
            zone_1: 0, zone_2: 0, zone_3: 0, zone_4: 0, zone_5: 0, zone_6: 0, zone_7: 0,
        };

        stats.forEach(s => {
            Object.keys(agg).forEach(k => {
                agg[k] += s[k] || 0;
            });
        });

        return agg;
    };

    const currentFilter = setFilter === 'all' ? 'all' : parseInt(setFilter);
    const homeStats = aggregateStats(getTeamStats(m.home_team_id || m.home_super_team_id, currentFilter === 'all' ? 'all' : m.sets?.find(s => s.set_number === currentFilter)?.id));
    const awayStats = aggregateStats(getTeamStats(m.away_team_id || m.away_super_team_id, currentFilter === 'all' ? 'all' : m.sets?.find(s => s.set_number === currentFilter)?.id));

    const statRows = [
        { label: 'Servis In', key: 'service_in' },
        { label: 'Servis Ace', key: 'service_ace' },
        { label: 'Servis Error', key: 'service_error' },
        { label: 'Receive ✓', key: 'receive_success' },
        { label: 'Receive ✗', key: 'receive_fail' },
        { label: 'Feeding ✓', key: 'feeding_success' },
        { label: 'Feeding ✗', key: 'feeding_fail' },
        { label: 'Strike ✓', key: 'strike_success' },
        { label: 'Strike ✗', key: 'strike_fail' },
        { label: 'Block ✓', key: 'block_success' },
        { label: 'Block ✗', key: 'block_fail' },
    ];

    return (
        <AuthenticatedLayout header="Detail Pertandingan">
            <Head title={`${homeName} vs ${awayName}`} />

            <div className="mb-4">
                <Link href={route('matches.index')} className="text-sm text-surface-500 hover:text-surface-300 transition-colors flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    Kembali
                </Link>
            </div>

            {/* Scoreboard */}
            <div className="rounded-2xl border border-surface-700/50 bg-gradient-to-b from-surface-900 to-surface-800 p-6 mb-6 text-center">
                <div className="flex items-center gap-2 justify-center mb-4">
                    <StatusBadge status={m.status} size="md" />
                    <StatusBadge status={m.stage} size="md" />
                </div>
                <p className="text-xs text-surface-500 mb-4">{m.tournament?.name}</p>

                <div className="flex items-center justify-center gap-8 sm:gap-16">
                    <div className="text-center">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500/30 to-primary-600/20 flex items-center justify-center text-2xl font-bold text-primary-300 mx-auto mb-2">
                            {homeName.charAt(0)}
                        </div>
                        <p className="text-sm font-semibold text-surface-200">{homeName}</p>
                        <p className="text-4xl font-black text-primary-400 mt-2">{setsWonHome}</p>
                    </div>
                    <div className="text-surface-600 text-2xl font-black">VS</div>
                    <div className="text-center">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-500/30 to-accent-600/20 flex items-center justify-center text-2xl font-bold text-accent-300 mx-auto mb-2">
                            {awayName.charAt(0)}
                        </div>
                        <p className="text-sm font-semibold text-surface-200">{awayName}</p>
                        <p className="text-4xl font-black text-accent-400 mt-2">{setsWonAway}</p>
                    </div>
                </div>

                {/* Set Scores */}
                {finishedSets.length > 0 && (
                    <div className="flex justify-center gap-3 mt-6">
                        {m.sets?.map((set) => (
                            <div key={set.id} className={`px-4 py-2 rounded-xl border text-center ${set.status === 'finished' ? 'border-surface-600/50 bg-surface-800/50' : 'border-surface-700/30 bg-surface-900/30'}`}>
                                <p className="text-[10px] text-surface-500 mb-1">Set {set.set_number}</p>
                                <p className="text-sm font-bold">
                                    <span className={set.winner_team_id === m.home_team_id ? 'text-primary-400' : 'text-surface-400'}>{set.home_score}</span>
                                    <span className="text-surface-600 mx-1">-</span>
                                    <span className={set.winner_team_id === m.away_team_id ? 'text-accent-400' : 'text-surface-400'}>{set.away_score}</span>
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex justify-center gap-4 mt-4 text-xs text-surface-500">
                    {m.referee && <span>🧑‍⚖️ {m.referee.name}</span>}
                    {m.court_number && <span>📍 Lapangan {m.court_number}</span>}
                </div>
            </div>

            {/* Stats Comparison */}
            <div className="rounded-xl border border-surface-700/50 bg-surface-900/50 overflow-hidden">
                <div className="px-5 py-4 border-b border-surface-700/50 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-surface-100">📊 Statistik Performa</h2>
                    <div className="flex gap-1">
                        <button
                            onClick={() => setSetFilter('all')}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${setFilter === 'all' ? 'bg-primary-600/20 text-primary-300 border border-primary-500/30' : 'text-surface-400 hover:bg-surface-800'}`}
                        >
                            All Sets
                        </button>
                        {m.sets?.map((s) => (
                            <button
                                key={s.set_number}
                                onClick={() => setSetFilter(s.set_number)}
                                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${setFilter === s.set_number ? 'bg-primary-600/20 text-primary-300 border border-primary-500/30' : 'text-surface-400 hover:bg-surface-800'}`}
                            >
                                Set {s.set_number}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-surface-700/30">
                                <th className="px-5 py-3 text-right text-xs font-semibold text-primary-400 w-1/3">{m.home_team?.name}</th>
                                <th className="px-5 py-3 text-center text-xs font-semibold text-surface-400">Statistik</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-accent-400 w-1/3">{m.away_team?.name}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-700/20">
                            {statRows.map((row) => {
                                const hv = homeStats[row.key];
                                const av = awayStats[row.key];
                                const total = hv + av;
                                const hp = total > 0 ? (hv / total) * 100 : 50;
                                return (
                                    <tr key={row.key} className="hover:bg-surface-800/30 transition-colors">
                                        <td className="px-5 py-3 text-right">
                                            <span className="text-sm font-semibold text-surface-200">{hv}</span>
                                        </td>
                                        <td className="px-5 py-3 text-center">
                                            <p className="text-xs text-surface-400 mb-1.5">{row.label}</p>
                                            <div className="flex h-1.5 rounded-full overflow-hidden bg-surface-700">
                                                <div className="bg-primary-500 transition-all duration-500" style={{ width: `${hp}%` }} />
                                                <div className="bg-accent-500 transition-all duration-500" style={{ width: `${100 - hp}%` }} />
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-left">
                                            <span className="text-sm font-semibold text-surface-200">{av}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Individual Performance & Zone Distribution */}
            <div className="rounded-xl border border-surface-700/50 bg-surface-900/50 p-5 mt-6">
                <h2 className="text-lg font-semibold text-surface-100 mb-4 flex items-center gap-2">
                    👤 Detail Performa Pemain
                </h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Home Team Player List - 3 cols */}
                    <div className="lg:col-span-3 space-y-2">
                        <h3 className="text-xs font-black text-primary-400 border-b border-surface-700/50 pb-1.5 mb-2">
                            🟢 {m.home_team?.name}
                        </h3>
                        <div className="space-y-1">
                            {m.home_team?.athletes?.map(athlete => {
                                const stats = getAthleteStats(athlete.id, currentFilter === 'all' ? 'all' : m.sets?.find(s => s.set_number === currentFilter)?.id);
                                const totalActions = Object.values(stats).reduce((a, b) => a + b, 0);
                                return (
                                    <button
                                        key={athlete.id}
                                        onClick={() => setSelectedAthleteId(athlete.id)}
                                        className={`w-full text-left px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all duration-200 active:scale-95 ${selectedAthleteId === athlete.id ? 'bg-primary-500/10 border-primary-500/40 text-primary-300' : 'bg-surface-800/10 border-surface-800/20 hover:bg-surface-800/30 text-surface-300'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="opacity-60">#{athlete.jersey_number}</span>
                                            <span className="truncate max-w-[120px]">{athlete.name}</span>
                                        </div>
                                        {totalActions > 0 && (
                                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-surface-800 border border-surface-700 text-surface-400 font-bold">
                                                {totalActions}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Central Display: Map & detailed stats - 6 cols */}
                    <div className="lg:col-span-6 bg-surface-950/20 border border-surface-800/40 rounded-2xl p-5 flex flex-col gap-6 items-center min-h-[300px]">
                        {selectedAthleteId ? (() => {
                            const athlete = allAthletes.find(a => a.id === selectedAthleteId);
                            const stats = getAthleteStats(selectedAthleteId, currentFilter === 'all' ? 'all' : m.sets?.find(s => s.set_number === currentFilter)?.id);
                            const totalActions = Object.values(stats).reduce((a, b) => a + b, 0);
                            const isHome = m.home_team?.athletes?.some(a => a.id === selectedAthleteId);

                            return (
                                <>
                                    {/* Stats info */}
                                    <div className="flex-1 w-full">
                                        <div className="mb-4">
                                            <span className={`inline-block text-[9px] font-extrabold px-2.5 py-0.5 rounded-full mb-1 border uppercase tracking-wider ${isHome ? 'bg-primary-500/10 text-primary-400 border-primary-500/20' : 'bg-accent-500/10 text-accent-400 border-accent-500/20'}`}>
                                                {isHome ? m.home_team?.name : m.away_team?.name}
                                            </span>
                                            <h3 className="text-base font-black text-surface-100 flex items-center gap-2">
                                                <span className="text-surface-400">#{athlete?.jersey_number}</span>
                                                {athlete?.name}
                                            </h3>
                                            <p className="text-[10px] text-surface-500 font-bold uppercase tracking-wider mt-0.5">
                                                {athlete?.position || 'Pemain'}
                                            </p>
                                        </div>

                                        {totalActions === 0 ? (
                                            <div className="h-[180px] flex items-center justify-center border border-dashed border-surface-800 rounded-xl">
                                                <p className="text-xs text-surface-500 italic text-center px-4">
                                                    Tidak ada data statistik untuk pemain ini pada set ini.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="bg-surface-900/50 rounded-xl p-2.5 border border-surface-800/40">
                                                    <span className="text-[9px] text-surface-500 block uppercase font-bold tracking-wider leading-none">🏐 Servis</span>
                                                    <div className="text-[11px] font-semibold text-surface-300 mt-2 flex flex-col gap-0.5">
                                                        <span className="text-primary-400">Masuk: {stats.service_in}</span>
                                                        <span className="text-accent-400">Ace: {stats.service_ace}</span>
                                                        <span className="text-red-400">Error: {stats.service_error}</span>
                                                    </div>
                                                </div>

                                                <div className="bg-surface-900/50 rounded-xl p-2.5 border border-surface-800/40">
                                                    <span className="text-[9px] text-surface-500 block uppercase font-bold tracking-wider leading-none">⚡ Strike / Smash</span>
                                                    <div className="text-[11px] font-semibold text-surface-300 mt-2 flex flex-col gap-0.5">
                                                        <span className="text-primary-400">Sukses (✓): {stats.strike_success}</span>
                                                        <span className="text-red-400">Gagal (✗): {stats.strike_fail}</span>
                                                    </div>
                                                </div>

                                                <div className="bg-surface-900/50 rounded-xl p-2.5 border border-surface-800/40">
                                                    <span className="text-[9px] text-surface-500 block uppercase font-bold tracking-wider leading-none">🤲 Receive</span>
                                                    <div className="text-[11px] font-semibold text-surface-300 mt-2 flex flex-col gap-0.5">
                                                        <span className="text-primary-400">Sukses (✓): {stats.receive_success}</span>
                                                        <span className="text-red-400">Gagal (✗): {stats.receive_fail}</span>
                                                    </div>
                                                </div>

                                                <div className="bg-surface-900/50 rounded-xl p-2.5 border border-surface-800/40">
                                                    <span className="text-[9px] text-surface-500 block uppercase font-bold tracking-wider leading-none">🎯 Feeding</span>
                                                    <div className="text-[11px] font-semibold text-surface-300 mt-2 flex flex-col gap-0.5">
                                                        <span className="text-primary-400">Sukses (✓): {stats.feeding_success}</span>
                                                        <span className="text-red-400">Gagal (✗): {stats.feeding_fail}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Court Map Miniature */}
                                    <div className="w-full md:w-full flex-1 flex items-center justify-center p-1">
                                        <PlayerCourtMiniature stats={stats} />
                                    </div>
                                </>
                            );
                        })() : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-surface-500 text-xs italic">
                                Pilih salah satu pemain untuk melihat peta zona jatuh bola
                            </div>
                        )}
                    </div>

                    {/* Away Team Player List - 3 cols */}
                    <div className="lg:col-span-3 space-y-2">
                        <h3 className="text-sm font-bold text-accent-400 border-b border-surface-700/50 pb-1.5 mb-2">
                            🟡 {m.away_team?.name}
                        </h3>
                        <div className="space-y-1">
                            {m.away_team?.athletes?.map(athlete => {
                                const stats = getAthleteStats(athlete.id, currentFilter === 'all' ? 'all' : m.sets?.find(s => s.set_number === currentFilter)?.id);
                                const totalActions = Object.values(stats).reduce((a, b) => a + b, 0);
                                return (
                                    <button
                                        key={athlete.id}
                                        onClick={() => setSelectedAthleteId(athlete.id)}
                                        className={`w-full text-left px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all duration-200 active:scale-95 ${selectedAthleteId === athlete.id ? 'bg-accent-500/10 border-accent-500/40 text-accent-300' : 'bg-surface-800/10 border-surface-800/20 hover:bg-surface-800/30 text-surface-300'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="opacity-60">#{athlete.jersey_number}</span>
                                            <span className="truncate max-w-[120px]">{athlete.name}</span>
                                        </div>
                                        {totalActions > 0 && (
                                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-surface-800 border border-surface-700 text-surface-400 font-bold">
                                                {totalActions}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
