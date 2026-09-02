import React, { useState, useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import StatusBadge from '@/Components/StatusBadge';
import { exportMatchReportPdf } from '@/Utils/matchPdfExport';

const ZONE_CONFIG = [
    { key: 'zone_1', label: 'Z1', desc: 'Sudut Atas' },
    { key: 'zone_2', label: 'Z2', desc: '0 - 1.22m' },
    { key: 'zone_3', label: 'Z3', desc: '1.22 - 2.44m' },
    { key: 'zone_4', label: 'Z4', desc: '2.44 - 3.66m' },
    { key: 'zone_5', label: 'Z5', desc: '3.66 - 4.88m' },
    { key: 'zone_6', label: 'Z6', desc: '4.88 - 6.10m' },
    { key: 'zone_7', label: 'Z7', desc: 'Sudut Bawah' },
    { key: 'zone_8', label: 'Z8', desc: 'Bawah Tengah' },
    { key: 'zone_9', label: 'Z9', desc: 'Tengah Lapangan' },
    { key: 'zone_10', label: 'Z10', desc: 'Atas Tengah' },
];

function PlayerCourtMiniature({ stats }) {
    const [actionFilter, setActionFilter] = useState('all');

    const actionPills = [
        { key: 'all', label: 'Semua Aksi' },
        { key: 'service', label: '🏐 Servis' },
        { key: 'strike', label: '⚡ Strike' },
        { key: 'blocking', label: '🛡️ Blocking' },
        { key: 'freeball', label: '🔄 Freeball' },
        { key: 'firstball', label: '🤲 Firstball' },
        { key: 'feeding', label: '🎯 Feeding' },
    ];

    const getZoneStats = (zoneKey) => {
        if (actionFilter === 'all') {
            const ace = stats[`${zoneKey}_ace`] || 0;
            const inC = stats[`${zoneKey}_in`] || (ace === 0 ? stats[zoneKey] || 0 : 0);
            return { ace, inC, total: ace + inC };
        }

        const az = stats.action_zones?.[actionFilter];
        const hasSpecificActionData = az && Object.keys(az).length > 0;

        if (hasSpecificActionData) {
            const ace = az[`${zoneKey}_ace`] || 0;
            const inC = az[`${zoneKey}_in`] || (ace === 0 ? az[zoneKey] || 0 : 0);
            return { ace, inC, total: ace + inC };
        }

        // Fallback for legacy match records where action_zones is not yet populated
        if (actionFilter === 'service') {
            const ace = stats[`${zoneKey}_ace`] || 0;
            const inC = stats[`${zoneKey}_in`] || (ace === 0 ? stats[zoneKey] || 0 : 0);
            return { ace, inC, total: ace + inC };
        }

        return { ace: 0, inC: 0, total: 0 };
    };

    const zones = [
        // Zona 1: Sudut atas kanan (corner triangle)
        { key: 'zone_1', label: 'Z1', desc: 'Sudut Atas', style: { top: '3%', left: '62%', width: '13%', height: '16%' } },

        // Zona 2-6: Strip di tepi kanan (5 bagian sama rata @1.22m)
        { key: 'zone_2', label: 'Z2', desc: '0-1.22m', style: { top: '4%', right: '2%', width: '13%', height: '16%' } },
        { key: 'zone_3', label: 'Z3', desc: '1.22-2.44m', style: { top: '22%', right: '2%', width: '13%', height: '16%' } },
        { key: 'zone_4', label: 'Z4', desc: '2.44-3.66m', style: { top: '41%', right: '2%', width: '13%', height: '16%' } },
        { key: 'zone_5', label: 'Z5', desc: '3.66-4.88m', style: { top: '59%', right: '2%', width: '13%', height: '16%' } },
        { key: 'zone_6', label: 'Z6', desc: '4.88-6.10m', style: { top: '78%', right: '2%', width: '13%', height: '16%' } },

        // Zona 7: Sudut bawah kanan (corner triangle)
        { key: 'zone_7', label: 'Z7', desc: 'Sudut Bawah', style: { top: '78%', left: '62%', width: '13%', height: '16%' } },

        // Zona 8, 9, 10: Area interior, tepat di kanan NET
        { key: 'zone_8', label: 'Z8', desc: 'Bawah', style: { top: '68%', left: '49%', width: '12%', height: '26%' } },
        { key: 'zone_9', label: 'Z9', desc: 'Tengah', style: { top: '34%', left: '49%', width: '12%', height: '32%' } },
        { key: 'zone_10', label: 'Z10', desc: 'Atas', style: { top: '4%', left: '49%', width: '12%', height: '26%' } },
    ];

    // Calculate total zone hits for percentage
    const totalZoneHits = zones.reduce((sum, z) => sum + getZoneStats(z.key).total, 0);

    return (
        <div className="w-full bg-surface-950/40 border border-surface-800 rounded-2xl p-3 shadow-inner space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🎯 PETA 10 ZONA TITIK JATUH BOLA</span>
                </span>
                <span className="text-[9px] text-surface-400 font-mono">Format: % (ACE / IN)</span>
            </div>

            {/* Filter Jenis Aksi Lapangan */}
            <div className="flex flex-wrap items-center gap-1 pb-2 border-b border-surface-800/60">
                <span className="text-[9px] text-surface-400 font-bold mr-1">Tampilkan Aksi:</span>
                {actionPills.map(p => (
                    <button
                        key={p.key}
                        type="button"
                        onClick={() => setActionFilter(p.key)}
                        className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                            actionFilter === p.key
                                ? 'bg-emerald-500 text-white shadow-xs scale-105'
                                : 'bg-surface-800/80 text-surface-400 hover:text-surface-200 border border-surface-700/50'
                        }`}
                    >
                        {p.label}
                    </button>
                ))}
            </div>

            {/* Graphic Court Container */}
            <div className="relative w-full aspect-[2.2/1] rounded-xl border-2 border-emerald-500/40 bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950 overflow-hidden shadow-inner select-none">
                
                {/* SVG Court Background Lines */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 190">
                    <rect x="10" y="10" width="380" height="170" fill="none" stroke="#34d399" strokeWidth="2.5" strokeOpacity="0.8" />
                    <line x1="190" y1="10" x2="190" y2="180" stroke="#ffffff" strokeWidth="3" strokeDasharray="5 3" />
                    <text x="190" y="8" fill="#a7f3d0" fontSize="7" textAnchor="middle" fontWeight="bold">NET</text>

                    <circle cx="85" cy="95" r="20" fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="3 2" />
                    <circle cx="85" cy="95" r="5" fill="#fbbf24" />
                    <text x="85" y="125" fill="#fef08a" fontSize="7" textAnchor="middle" fontWeight="bold">POSISI AWAL</text>

                    {/* Exactly 6 Zone Fan Lines Radiating from Circle to Right Boundary */}
                    <line x1="85" y1="95" x2="390" y2="10" stroke="#fbbf24" strokeWidth="1.5" strokeOpacity="0.8" strokeDasharray="3 3" />
                    <line x1="85" y1="95" x2="390" y2="44" stroke="#60a5fa" strokeWidth="1.2" strokeOpacity="0.6" strokeDasharray="3 3" />
                    <line x1="85" y1="95" x2="390" y2="78" stroke="#60a5fa" strokeWidth="1.2" strokeOpacity="0.6" strokeDasharray="3 3" />
                    <line x1="85" y1="95" x2="390" y2="112" stroke="#60a5fa" strokeWidth="1.2" strokeOpacity="0.6" strokeDasharray="3 3" />
                    <line x1="85" y1="95" x2="390" y2="146" stroke="#60a5fa" strokeWidth="1.2" strokeOpacity="0.6" strokeDasharray="3 3" />
                    <line x1="85" y1="95" x2="390" y2="180" stroke="#fbbf24" strokeWidth="1.5" strokeOpacity="0.8" strokeDasharray="3 3" />

                    {/* Horizontal dividers between Zona 8/9/10 (right side of net) */}
                    <line x1="190" y1="68" x2="280" y2="42" stroke="#a78bfa" strokeWidth="1" strokeOpacity="0.5" strokeDasharray="3 3" />
                    <line x1="190" y1="122" x2="280" y2="148" stroke="#a78bfa" strokeWidth="1" strokeOpacity="0.5" strokeDasharray="3 3" />
                </svg>

                {/* Zone Badges Overlay with % and (ACE/IN) */}
                {zones.map((z) => {
                    const { ace, inC, total: hits } = getZoneStats(z.key);
                    const hasValue = hits > 0;
                    const pct = totalZoneHits > 0 ? ((hits / totalZoneHits) * 100).toFixed(1) : '0.0';

                    return (
                        <div
                            key={z.key}
                            style={z.style}
                            title={`${z.label} (${z.desc}): ${pct}% — Ace: ${ace}, In: ${inC}`}
                            className={`
                                absolute rounded-md border flex flex-col items-center justify-center transition-all duration-150 p-0.5
                                ${hasValue 
                                    ? 'bg-emerald-900/95 border-amber-400 ring-1.5 ring-amber-400 shadow-xl z-10 scale-105' 
                                    : 'bg-surface-900/70 border-surface-700/60 opacity-60'}
                            `}
                        >
                            {/* Zone Label & Percentage */}
                            <span className={`text-[7.5px] sm:text-[9px] font-black leading-tight ${hasValue ? 'text-amber-300' : 'text-emerald-200/70'}`}>
                                {pct}%
                            </span>

                            {/* ACE / IN numbers */}
                            <div className="flex items-center gap-0.5 text-[6.5px] sm:text-[7.5px] font-bold font-mono leading-none mt-0.5">
                                <span className={ace > 0 ? 'text-amber-400 font-black' : 'text-surface-400'}>{ace}A</span>
                                <span className="text-surface-500">/</span>
                                <span className={inC > 0 ? 'text-emerald-300 font-black' : 'text-surface-400'}>{inC}In</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between pt-1 border-t border-surface-800 text-[9px] text-surface-400 font-medium">
                <span>Format: <strong className="text-amber-300">% (ACE / IN)</strong></span>
                <span>Total Poin Masuk: <strong className="text-emerald-400 font-bold">{totalZoneHits}</strong></span>
            </div>
        </div>
    );
}

export default function MatchShow({ match: m }) {
    // Individual set filter for Home Team and Away Team
    const [homeSetFilter, setHomeSetFilter] = useState('all');
    const [awaySetFilter, setAwaySetFilter] = useState('all');

    const homeName = m.home_display_name || m.home_team?.name || m.home_super_team?.name || 'Tim Tuan Rumah';
    const awayName = m.away_display_name || m.away_team?.name || m.away_super_team?.name || 'Tim Tamu';

    const homeTeamId = m.home_team_id || m.home_super_team_id;
    const awayTeamId = m.away_team_id || m.away_super_team_id;

    const isTeamMode = m.match_mode === 'team_regu' || m.match_mode === 'team_double';

    const reguSummaries = useMemo(() => {
        if (!isTeamMode || !m.sets) return [];
        return [0, 1, 2].map((rIdx) => {
            const rSets = m.sets.filter(s => s.set_number >= rIdx * 3 + 1 && s.set_number <= rIdx * 3 + 3);
            const fSets = rSets.filter(s => s.status === 'finished');
            const homeWon = fSets.filter(s => s.home_score > s.away_score).length;
            const awayWon = fSets.filter(s => s.away_score > s.home_score).length;
            const isFinished = homeWon >= 2 || awayWon >= 2 || (homeWon + awayWon >= 3);
            const winner = (homeWon >= 2 || (isFinished && homeWon > awayWon)) ? 'home' : ((awayWon >= 2 || (isFinished && awayWon > homeWon)) ? 'away' : null);
            return {
                index: rIdx,
                label: `Regu ${rIdx + 1}`,
                sets: rSets,
                homeWon,
                awayWon,
                winner,
                isFinished,
            };
        });
    }, [isTeamMode, m.sets]);

    const superTeamScore = useMemo(() => {
        if (!isTeamMode) return { home: 0, away: 0 };
        let home = 0;
        let away = 0;
        reguSummaries.forEach(r => {
            if (r.winner === 'home') home++;
            else if (r.winner === 'away') away++;
        });
        return { home, away };
    }, [isTeamMode, reguSummaries]);

    const finishedSets = m.sets?.filter(s => s.status === 'finished') || [];
    const setsWonHome = isTeamMode 
        ? superTeamScore.home 
        : finishedSets.filter(s => s.home_score > s.away_score).length;
    const setsWonAway = isTeamMode 
        ? superTeamScore.away 
        : finishedSets.filter(s => s.away_score > s.home_score).length;

    const homeAthletes = m.home_team?.athletes || m.home_super_team?.members?.flatMap(mem => mem.athletes || []) || [];
    const awayAthletes = m.away_team?.athletes || m.away_super_team?.members?.flatMap(mem => mem.athletes || []) || [];

    const [selectedHomeAthleteId, setSelectedHomeAthleteId] = useState('all');
    const [selectedAwayAthleteId, setSelectedAwayAthleteId] = useState('all');

    // Helpers to retrieve team stats
    const getTeamStats = (teamId, setFilterVal) => {
        let stats = [];
        if (setFilterVal === 'all') {
            m.sets?.forEach(s => {
                s.stats?.forEach(st => {
                    if (st.team_id === teamId) stats.push(st);
                });
            });
        } else {
            const setNum = parseInt(setFilterVal);
            const set = m.sets?.find(s => s.set_number === setNum || s.id === setFilterVal);
            stats = set?.stats?.filter(st => st.team_id === teamId) || [];
        }
        return stats;
    };

    const aggregateStats = (stats) => {
        const agg = {
            service_in: 0, service_ace: 0, service_error: 0,
            strike_in: 0, strike_ace: 0, strike_error: 0,
            freeball_in: 0, freeball_ace: 0, freeball_error: 0,
            firstball_in: 0, firstball_ace: 0, firstball_error: 0,
            feeding_in: 0, feeding_ace: 0, feeding_error: 0,
            blocking_in: 0, blocking_ace: 0, blocking_error: 0,
            opponent_mistake: 0,
            action_zones: {
                service: {}, strike: {}, blocking: {},
                freeball: {}, firstball: {}, feeding: {},
            },
            // Backwards compatibility mappings:
            strike_success: 0, strike_fail: 0,
            receive_success: 0, receive_fail: 0,
            feeding_success: 0, feeding_fail: 0,
            block_success: 0, block_fail: 0,
        };
        for (let i = 1; i <= 10; i++) {
            agg[`zone_${i}`] = 0;
            agg[`zone_${i}_ace`] = 0;
            agg[`zone_${i}_in`] = 0;
        }
        stats.forEach(s => {
            Object.keys(agg).forEach(k => {
                if (k !== 'action_zones') {
                    agg[k] += s[k] || 0;
                }
            });
            if (s.action_zones && typeof s.action_zones === 'object') {
                Object.keys(s.action_zones).forEach(act => {
                    if (!agg.action_zones[act]) agg.action_zones[act] = {};
                    Object.keys(s.action_zones[act]).forEach(zk => {
                        agg.action_zones[act][zk] = (agg.action_zones[act][zk] || 0) + (s.action_zones[act][zk] || 0);
                    });
                });
            }
        });
        return agg;
    };

    const getAthleteStats = (athleteId, setFilterVal) => {
        let stats = [];
        if (setFilterVal === 'all') {
            m.sets?.forEach(s => {
                s.stats?.forEach(st => {
                    if (st.athlete_id === athleteId) stats.push(st);
                });
            });
        } else {
            const setNum = parseInt(setFilterVal);
            const set = m.sets?.find(s => s.set_number === setNum || s.id === setFilterVal);
            stats = set?.stats?.filter(st => st.athlete_id === athleteId) || [];
        }
        return aggregateStats(stats);
    };

    // Calculate aggregated team stats for selected filter
    const homeTeamAggStats = aggregateStats(getTeamStats(homeTeamId, homeSetFilter));
    const awayTeamAggStats = aggregateStats(getTeamStats(awayTeamId, awaySetFilter));

    return (
        <AuthenticatedLayout header="Detail Pertandingan">
            <Head title={`${homeName} vs ${awayName}`} />

            {/* Top Toolbar */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <Link href={route('matches.index')} className="text-sm text-surface-400 hover:text-surface-200 transition-colors flex items-center gap-1 font-semibold">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    Kembali ke Daftar Pertandingan
                </Link>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => exportMatchReportPdf(m, 'home')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-500/20 border border-primary-500/40 text-primary-300 hover:bg-primary-500/30 text-xs font-bold transition-all active:scale-95 shadow-sm"
                        title={`Download Laporan PDF Khusus ${homeName}`}
                    >
                        <span>📄 PDF {homeName}</span>
                    </button>
                    <button
                        onClick={() => exportMatchReportPdf(m, 'away')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 text-xs font-bold transition-all active:scale-95 shadow-sm"
                        title={`Download Laporan PDF Khusus ${awayName}`}
                    >
                        <span>📄 PDF {awayName}</span>
                    </button>
                    <button
                        onClick={() => exportMatchReportPdf(m, 'all')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-800 hover:bg-surface-700 border border-surface-700 text-surface-200 text-xs font-bold transition-all active:scale-95 shadow-sm"
                        title="Download Laporan PDF Lengkap (Kedua Tim)"
                    >
                        <span>📥 PDF Lengkap</span>
                    </button>
                </div>
            </div>

            {/* Scoreboard Header */}
            <div className="rounded-2xl border border-surface-700/50 bg-gradient-to-b from-surface-900 to-surface-800/80 p-5 sm:p-6 mb-6 text-center shadow-xl backdrop-blur-md">
                <div className="flex items-center gap-2 justify-center mb-3">
                    <StatusBadge status={m.status} size="md" />
                    <StatusBadge status={m.stage} size="md" />
                </div>
                <p className="text-xs text-surface-400 font-medium mb-3">{m.tournament?.name}</p>

                <div className="flex items-center justify-center gap-6 sm:gap-16 my-2">
                    {/* Home Side */}
                    <div className="text-center flex-1 max-w-[200px]">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-primary-500/30 to-primary-600/20 border border-primary-500/40 flex items-center justify-center text-xl sm:text-2xl font-black text-primary-300 mx-auto mb-2 shadow-lg">
                            {homeName.charAt(0)}
                        </div>
                        <p className="text-sm font-bold text-surface-100 truncate">{homeName}</p>
                        <p className="text-3xl sm:text-4xl font-black text-primary-400 mt-1 font-mono">{setsWonHome}</p>
                    </div>

                    <div className="text-surface-600 text-xl sm:text-2xl font-black">VS</div>

                    {/* Away Side */}
                    <div className="text-center flex-1 max-w-[200px]">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-500/30 to-amber-600/20 border border-amber-500/40 flex items-center justify-center text-xl sm:text-2xl font-black text-amber-300 mx-auto mb-2 shadow-lg">
                            {awayName.charAt(0)}
                        </div>
                        <p className="text-sm font-bold text-surface-100 truncate">{awayName}</p>
                        <p className="text-3xl sm:text-4xl font-black text-amber-400 mt-1 font-mono">{setsWonAway}</p>
                    </div>
                </div>

                {/* Set Scores breakdown */}
                {isTeamMode ? (
                    <div className="space-y-2 mt-4 pt-3 border-t border-surface-800 text-left max-w-xl mx-auto">
                        <p className="text-[11px] font-black uppercase tracking-wider text-surface-400 text-center mb-1">Rincian Hasil Tiap Sesi Regu</p>
                        {reguSummaries.map((r) => {
                            const finishedSetsInR = r.sets.filter(s => s.status === 'finished');
                            return (
                                <div key={r.index} className="p-2.5 rounded-xl bg-surface-950/70 border border-surface-800/80 flex items-center justify-between gap-2 text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className="font-extrabold text-white">{r.label}:</span>
                                        <div className="text-surface-400 text-[11px] font-mono flex flex-wrap gap-1.5">
                                            {finishedSetsInR.length > 0 ? (
                                                finishedSetsInR.map(s => (
                                                    <span key={s.id} className="bg-surface-900 px-2 py-0.5 rounded-md border border-surface-800">
                                                        Set {s.set_number}: <strong className="text-white">{s.home_score}-{s.away_score}</strong>
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="italic text-surface-500">Belum dimainkan</span>
                                            )}
                                        </div>
                                    </div>
                                    <span className={`px-2.5 py-0.5 rounded-lg font-black text-[11px] shrink-0 ${
                                        r.winner === 'home' ? 'bg-primary-500/20 text-primary-300 border border-primary-500/40' :
                                        r.winner === 'away' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-surface-800 text-surface-400'
                                    }`}>
                                        {r.winner === 'home' ? `Menang ${r.homeWon}-${r.awayWon}` : r.winner === 'away' ? `Kalah ${r.homeWon}-${r.awayWon}` : (r.homeWon + r.awayWon > 0 ? `${r.homeWon}-${r.awayWon}` : '—')}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    finishedSets.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-2 mt-4 pt-3 border-t border-surface-800">
                            {m.sets?.filter(s => s.status === 'finished').map((set) => (
                                <div key={set.id} className="px-3 py-1.5 rounded-xl border border-surface-700/60 bg-surface-900/80 text-center shadow-xs">
                                    <p className="text-[10px] text-surface-400 uppercase font-bold">Set {set.set_number}</p>
                                    <p className="text-xs sm:text-sm font-bold mt-0.5 font-mono">
                                        <span className={set.home_score > set.away_score ? 'text-primary-400 font-black' : 'text-surface-300'}>{set.home_score}</span>
                                        <span className="text-surface-600 mx-1">-</span>
                                        <span className={set.away_score > set.home_score ? 'text-amber-400 font-black' : 'text-surface-300'}>{set.away_score}</span>
                                    </p>
                                </div>
                            ))}
                        </div>
                    )
                )}

                <div className="flex justify-center gap-4 mt-3 text-[11px] text-surface-500 font-medium">
                    {m.referee && <span>🧑‍⚖️ Wasit: {m.referee.name}</span>}
                    {m.court_number && <span>📍 Lapangan {m.court_number}</span>}
                </div>
            </div>

            {/* 2-CARD SIDE-BY-SIDE LAYOUT (Kiri: Home Team, Kanan: Away Team) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* ==================================================== */}
                {/* CARD KIRI: TIM TUAN RUMAH (HOME TEAM)                */}
                {/* ==================================================== */}
                <div className="rounded-2xl border border-primary-500/30 bg-surface-900/60 p-4 sm:p-5 shadow-xl flex flex-col gap-4">
                    
                    {/* Header Tim & Filter Set */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-surface-800">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-primary-500 shadow-sm shadow-primary-500/50"></span>
                            <h3 className="text-base font-black text-primary-400 truncate">
                                🟢 {homeName}
                            </h3>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-500/10 border border-primary-500/30 text-primary-300">
                                {setsWonHome} Set Menang
                            </span>
                        </div>

                        {/* Set Filter Pills for Home */}
                        <div className="flex items-center gap-1 bg-surface-950/60 p-1 rounded-xl border border-surface-800">
                            <button
                                onClick={() => setHomeSetFilter('all')}
                                className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition-all ${
                                    homeSetFilter === 'all'
                                        ? 'bg-primary-500 text-white shadow-xs'
                                        : 'text-surface-400 hover:text-surface-200'
                                }`}
                            >
                                All Sets
                            </button>
                            {m.sets?.map((s) => (
                                <button
                                    key={s.set_number}
                                    onClick={() => setHomeSetFilter(s.set_number)}
                                    className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition-all ${
                                        homeSetFilter === s.set_number
                                            ? 'bg-primary-500 text-white shadow-xs'
                                            : 'text-surface-400 hover:text-surface-200'
                                    }`}
                                >
                                    Set {s.set_number}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Pilihan Pemain (All Pemain & Individu) */}
                    <div>
                        <span className="text-xs font-bold text-surface-400 block mb-1.5">👤 Pilih Pemain {homeName}:</span>
                        <div className="flex flex-wrap gap-1.5">
                            <button
                                onClick={() => setSelectedHomeAthleteId('all')}
                                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
                                    selectedHomeAthleteId === 'all'
                                        ? 'bg-primary-500 text-white border-primary-400 shadow-md shadow-primary-950/40'
                                        : 'bg-surface-800/60 border-surface-700/60 text-surface-300 hover:bg-surface-700/60'
                                }`}
                            >
                                <span>👥 Semua Pemain</span>
                            </button>
                            {homeAthletes.map(athlete => {
                                const stats = getAthleteStats(athlete.id, homeSetFilter);
                                const isSelected = selectedHomeAthleteId === athlete.id;
                                const totalActs = Object.values(stats).reduce((a, b) => (typeof b === 'number' ? a + b : a), 0);

                                return (
                                    <button
                                        key={athlete.id}
                                        onClick={() => setSelectedHomeAthleteId(athlete.id)}
                                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
                                            isSelected
                                                ? 'bg-primary-500 text-white border-primary-400 shadow-md shadow-primary-950/40'
                                                : 'bg-surface-800/60 border-surface-700/60 text-surface-300 hover:bg-surface-700/60'
                                        }`}
                                    >
                                        <span className="opacity-75 font-mono">#{athlete.jersey_number || '-'}</span>
                                        <span className="truncate max-w-[110px]">{athlete.name}</span>
                                        {totalActs > 0 && (
                                            <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${isSelected ? 'bg-black/30 text-white' : 'bg-surface-900 text-primary-400'}`}>
                                                {totalActs}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Tabel Rekap Statistik Tim/Pemain yang Dipilih */}
                    {(() => {
                        const isAll = selectedHomeAthleteId === 'all';
                        const athlete = !isAll ? homeAthletes.find(a => a.id === selectedHomeAthleteId) : null;
                        const stats = isAll ? homeTeamAggStats : getAthleteStats(selectedHomeAthleteId, homeSetFilter);

                        return (
                            <div className="space-y-4">
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-xs font-bold text-surface-300">
                                            📊 Rekapitulasi: <strong className="text-primary-400">{isAll ? `Semua Pemain (${homeName})` : `#${athlete?.jersey_number || '-'} ${athlete?.name}`}</strong> ({homeSetFilter === 'all' ? 'All Sets' : `Set ${homeSetFilter}`})
                                        </span>
                                        <button
                                            onClick={() => exportMatchReportPdf(m, 'home')}
                                            className="text-[10px] font-bold text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-1 cursor-pointer"
                                        >
                                            <span>📥 Download PDF</span>
                                        </button>
                                    </div>

                                    <div className="overflow-hidden rounded-xl border border-surface-800 bg-surface-950/40">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-surface-900 border-b border-surface-800 text-surface-400 text-[10px] uppercase">
                                                <tr>
                                                    <th className="py-1.5 px-3">Parameter Statistik</th>
                                                    <th className="py-1.5 px-3 text-center font-bold text-primary-400">Total</th>
                                                    <th className="py-1.5 px-3 text-right">Rincian</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-surface-800/50 text-surface-300 font-medium">
                                                <tr className="hover:bg-surface-800/20">
                                                    <td className="py-1.5 px-3">🏐 Servis</td>
                                                    <td className="py-1.5 px-3 text-center font-black text-surface-100 font-mono">{stats.service_in + stats.service_ace}</td>
                                                    <td className="py-1.5 px-3 text-right text-[11px] font-mono">
                                                        <span className="text-amber-400 font-bold">Ace: {stats.service_ace}</span> | <span className="text-primary-400 font-bold">In: {stats.service_in}</span> | <span className="text-red-400 font-bold">Err: {stats.service_error}</span>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-surface-800/20">
                                                    <td className="py-1.5 px-3">⚡ Strike</td>
                                                    <td className="py-1.5 px-3 text-center font-black text-surface-100 font-mono">{stats.strike_in + stats.strike_ace || stats.strike_success}</td>
                                                    <td className="py-1.5 px-3 text-right text-[11px] font-mono">
                                                        <span className="text-amber-400 font-bold">Ace: {stats.strike_ace}</span> | <span className="text-primary-400 font-bold">In: {stats.strike_in || stats.strike_success}</span> | <span className="text-red-400 font-bold">Err: {stats.strike_error || stats.strike_fail}</span>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-surface-800/20">
                                                    <td className="py-1.5 px-3">🔄 Freeball</td>
                                                    <td className="py-1.5 px-3 text-center font-black text-surface-100 font-mono">{stats.freeball_in + stats.freeball_ace}</td>
                                                    <td className="py-1.5 px-3 text-right text-[11px] font-mono">
                                                        <span className="text-amber-400 font-bold">Ace: {stats.freeball_ace}</span> | <span className="text-primary-400 font-bold">In: {stats.freeball_in}</span> | <span className="text-red-400 font-bold">Err: {stats.freeball_error}</span>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-surface-800/20">
                                                    <td className="py-1.5 px-3">🤲 Firstball</td>
                                                    <td className="py-1.5 px-3 text-center font-black text-surface-100 font-mono">{stats.firstball_in + stats.firstball_ace || stats.receive_success}</td>
                                                    <td className="py-1.5 px-3 text-right text-[11px] font-mono">
                                                        <span className="text-amber-400 font-bold">Ace: {stats.firstball_ace}</span> | <span className="text-primary-400 font-bold">In: {stats.firstball_in || stats.receive_success}</span> | <span className="text-red-400 font-bold">Err: {stats.firstball_error || stats.receive_fail}</span>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-surface-800/20">
                                                    <td className="py-1.5 px-3">🎯 Feeding</td>
                                                    <td className="py-1.5 px-3 text-center font-black text-surface-100 font-mono">{stats.feeding_in + stats.feeding_ace || stats.feeding_success}</td>
                                                    <td className="py-1.5 px-3 text-right text-[11px] font-mono">
                                                        <span className="text-amber-400 font-bold">Ace: {stats.feeding_ace}</span> | <span className="text-primary-400 font-bold">In: {stats.feeding_in || stats.feeding_success}</span> | <span className="text-red-400 font-bold">Err: {stats.feeding_error || stats.feeding_fail}</span>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-surface-800/20">
                                                    <td className="py-1.5 px-3">🛡️ Blocking</td>
                                                    <td className="py-1.5 px-3 text-center font-black text-surface-100 font-mono">{stats.blocking_in + stats.blocking_ace || stats.block_success}</td>
                                                    <td className="py-1.5 px-3 text-right text-[11px] font-mono">
                                                        <span className="text-amber-400 font-bold">Ace: {stats.blocking_ace}</span> | <span className="text-primary-400 font-bold">In: {stats.blocking_in || stats.block_success}</span> | <span className="text-red-400 font-bold">Err: {stats.blocking_error || stats.block_fail}</span>
                                                    </td>
                                                </tr>
                                                {isAll && stats.opponent_mistake > 0 && (
                                                    <tr className="hover:bg-surface-800/20 bg-primary-500/5">
                                                        <td className="py-1.5 px-3 text-primary-300">⚠️ Kesalahan Lawan</td>
                                                        <td className="py-1.5 px-3 text-center font-black text-primary-400 font-mono">+{stats.opponent_mistake}</td>
                                                        <td className="py-1.5 px-3 text-right text-[11px] font-mono text-primary-300/80">Poin Hadiah</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Peta 10-Zona Lapangan Langsung di Bawah Tabel */}
                                <PlayerCourtMiniature stats={stats} />
                            </div>
                        );
                    })()}
                </div>

                {/* ==================================================== */}
                {/* CARD KANAN: TIM TAMU (AWAY TEAM)                     */}
                {/* ==================================================== */}
                <div className="rounded-2xl border border-amber-500/30 bg-surface-900/60 p-4 sm:p-5 shadow-xl flex flex-col gap-4">
                    
                    {/* Header Tim & Filter Set */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-surface-800">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50"></span>
                            <h3 className="text-base font-black text-amber-400 truncate">
                                🟡 {awayName}
                            </h3>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300">
                                {setsWonAway} Set Menang
                            </span>
                        </div>

                        {/* Set Filter Pills for Away */}
                        <div className="flex items-center gap-1 bg-surface-950/60 p-1 rounded-xl border border-surface-800">
                            <button
                                onClick={() => setAwaySetFilter('all')}
                                className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition-all ${
                                    awaySetFilter === 'all'
                                        ? 'bg-amber-500 text-white shadow-xs'
                                        : 'text-surface-400 hover:text-surface-200'
                                }`}
                            >
                                All Sets
                            </button>
                            {m.sets?.map((s) => (
                                <button
                                    key={s.set_number}
                                    onClick={() => setAwaySetFilter(s.set_number)}
                                    className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition-all ${
                                        awaySetFilter === s.set_number
                                            ? 'bg-amber-500 text-white shadow-xs'
                                            : 'text-surface-400 hover:text-surface-200'
                                    }`}
                                >
                                    Set {s.set_number}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Pilihan Pemain Tim Tamu (All Pemain & Individu) */}
                    <div>
                        <span className="text-xs font-bold text-surface-400 block mb-1.5">👤 Pilih Pemain {awayName}:</span>
                        <div className="flex flex-wrap gap-1.5">
                            <button
                                onClick={() => setSelectedAwayAthleteId('all')}
                                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
                                    selectedAwayAthleteId === 'all'
                                        ? 'bg-amber-500 text-white border-amber-400 shadow-md shadow-amber-950/40'
                                        : 'bg-surface-800/60 border-surface-700/60 text-surface-300 hover:bg-surface-700/60'
                                }`}
                            >
                                <span>👥 Semua Pemain</span>
                            </button>
                            {awayAthletes.map(athlete => {
                                const stats = getAthleteStats(athlete.id, awaySetFilter);
                                const isSelected = selectedAwayAthleteId === athlete.id;
                                const totalActs = Object.values(stats).reduce((a, b) => (typeof b === 'number' ? a + b : a), 0);

                                return (
                                    <button
                                        key={athlete.id}
                                        onClick={() => setSelectedAwayAthleteId(athlete.id)}
                                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
                                            isSelected
                                                ? 'bg-amber-500 text-white border-amber-400 shadow-md shadow-amber-950/40'
                                                : 'bg-surface-800/60 border-surface-700/60 text-surface-300 hover:bg-surface-700/60'
                                        }`}
                                    >
                                        <span className="opacity-75 font-mono">#{athlete.jersey_number || '-'}</span>
                                        <span className="truncate max-w-[110px]">{athlete.name}</span>
                                        {totalActs > 0 && (
                                            <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${isSelected ? 'bg-black/30 text-white' : 'bg-surface-900 text-amber-400'}`}>
                                                {totalActs}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Tabel Rekap Statistik Tim Tamu/Pemain yang Dipilih */}
                    {(() => {
                        const isAll = selectedAwayAthleteId === 'all';
                        const athlete = !isAll ? awayAthletes.find(a => a.id === selectedAwayAthleteId) : null;
                        const stats = isAll ? awayTeamAggStats : getAthleteStats(selectedAwayAthleteId, awaySetFilter);

                        return (
                            <div className="space-y-4">
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-xs font-bold text-surface-300">
                                            📊 Rekapitulasi: <strong className="text-amber-400">{isAll ? `Semua Pemain (${awayName})` : `#${athlete?.jersey_number || '-'} ${athlete?.name}`}</strong> ({awaySetFilter === 'all' ? 'All Sets' : `Set ${awaySetFilter}`})
                                        </span>
                                        <button
                                            onClick={() => exportMatchReportPdf(m, 'away')}
                                            className="text-[10px] font-bold text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1 cursor-pointer"
                                        >
                                            <span>📥 Download PDF</span>
                                        </button>
                                    </div>

                                    <div className="overflow-hidden rounded-xl border border-surface-800 bg-surface-950/40">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-surface-900 border-b border-surface-800 text-surface-400 text-[10px] uppercase">
                                                <tr>
                                                    <th className="py-1.5 px-3">Parameter Statistik</th>
                                                    <th className="py-1.5 px-3 text-center font-bold text-amber-400">Total</th>
                                                    <th className="py-1.5 px-3 text-right">Rincian</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-surface-800/50 text-surface-300 font-medium">
                                                <tr className="hover:bg-surface-800/20">
                                                    <td className="py-1.5 px-3">🏐 Servis</td>
                                                    <td className="py-1.5 px-3 text-center font-black text-surface-100 font-mono">{stats.service_in + stats.service_ace}</td>
                                                    <td className="py-1.5 px-3 text-right text-[11px] font-mono">
                                                        <span className="text-amber-400 font-bold">Ace: {stats.service_ace}</span> | <span className="text-primary-400 font-bold">In: {stats.service_in}</span> | <span className="text-red-400 font-bold">Err: {stats.service_error}</span>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-surface-800/20">
                                                    <td className="py-1.5 px-3">⚡ Strike</td>
                                                    <td className="py-1.5 px-3 text-center font-black text-surface-100 font-mono">{stats.strike_in + stats.strike_ace || stats.strike_success}</td>
                                                    <td className="py-1.5 px-3 text-right text-[11px] font-mono">
                                                        <span className="text-amber-400 font-bold">Ace: {stats.strike_ace}</span> | <span className="text-primary-400 font-bold">In: {stats.strike_in || stats.strike_success}</span> | <span className="text-red-400 font-bold">Err: {stats.strike_error || stats.strike_fail}</span>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-surface-800/20">
                                                    <td className="py-1.5 px-3">🔄 Freeball</td>
                                                    <td className="py-1.5 px-3 text-center font-black text-surface-100 font-mono">{stats.freeball_in + stats.freeball_ace}</td>
                                                    <td className="py-1.5 px-3 text-right text-[11px] font-mono">
                                                        <span className="text-amber-400 font-bold">Ace: {stats.freeball_ace}</span> | <span className="text-primary-400 font-bold">In: {stats.freeball_in}</span> | <span className="text-red-400 font-bold">Err: {stats.freeball_error}</span>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-surface-800/20">
                                                    <td className="py-1.5 px-3">🤲 Firstball</td>
                                                    <td className="py-1.5 px-3 text-center font-black text-surface-100 font-mono">{stats.firstball_in + stats.firstball_ace || stats.receive_success}</td>
                                                    <td className="py-1.5 px-3 text-right text-[11px] font-mono">
                                                        <span className="text-amber-400 font-bold">Ace: {stats.firstball_ace}</span> | <span className="text-primary-400 font-bold">In: {stats.firstball_in || stats.receive_success}</span> | <span className="text-red-400 font-bold">Err: {stats.firstball_error || stats.receive_fail}</span>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-surface-800/20">
                                                    <td className="py-1.5 px-3">🎯 Feeding</td>
                                                    <td className="py-1.5 px-3 text-center font-black text-surface-100 font-mono">{stats.feeding_in + stats.feeding_ace || stats.feeding_success}</td>
                                                    <td className="py-1.5 px-3 text-right text-[11px] font-mono">
                                                        <span className="text-amber-400 font-bold">Ace: {stats.feeding_ace}</span> | <span className="text-primary-400 font-bold">In: {stats.feeding_in || stats.feeding_success}</span> | <span className="text-red-400 font-bold">Err: {stats.feeding_error || stats.feeding_fail}</span>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-surface-800/20">
                                                    <td className="py-1.5 px-3">🛡️ Blocking</td>
                                                    <td className="py-1.5 px-3 text-center font-black text-surface-100 font-mono">{stats.blocking_in + stats.blocking_ace || stats.block_success}</td>
                                                    <td className="py-1.5 px-3 text-right text-[11px] font-mono">
                                                        <span className="text-amber-400 font-bold">Ace: {stats.blocking_ace}</span> | <span className="text-primary-400 font-bold">In: {stats.blocking_in || stats.block_success}</span> | <span className="text-red-400 font-bold">Err: {stats.blocking_error || stats.block_fail}</span>
                                                    </td>
                                                </tr>
                                                {isAll && stats.opponent_mistake > 0 && (
                                                    <tr className="hover:bg-surface-800/20 bg-amber-500/5">
                                                        <td className="py-1.5 px-3 text-amber-300">⚠️ Kesalahan Lawan</td>
                                                        <td className="py-1.5 px-3 text-center font-black text-amber-400 font-mono">+{stats.opponent_mistake}</td>
                                                        <td className="py-1.5 px-3 text-right text-[11px] font-mono text-amber-300/80">Poin Hadiah</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Peta 10-Zona Lapangan Langsung di Bawah Tabel */}
                                <PlayerCourtMiniature stats={stats} />
                            </div>
                        );
                    })()}
                </div>

            </div>
        </AuthenticatedLayout>
    );
}
