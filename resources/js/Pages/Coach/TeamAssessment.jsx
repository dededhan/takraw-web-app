import React, { useState, useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import StatusBadge from '@/Components/StatusBadge';
import { exportTeamTournamentPdf } from '@/Utils/teamTournamentPdfExport';

const ZONE_CONFIG = [
    { key: 'zone_1', label: 'Z1', desc: 'Sudut Atas', style: { top: '3%', left: '62%', width: '13%', height: '16%' } },
    { key: 'zone_2', label: 'Z2', desc: '0 - 1.22m', style: { top: '4%', right: '2%', width: '13%', height: '16%' } },
    { key: 'zone_3', label: 'Z3', desc: '1.22 - 2.44m', style: { top: '22%', right: '2%', width: '13%', height: '16%' } },
    { key: 'zone_4', label: 'Z4', desc: '2.44 - 3.66m', style: { top: '41%', right: '2%', width: '13%', height: '16%' } },
    { key: 'zone_5', label: 'Z5', desc: '3.66 - 4.88m', style: { top: '59%', right: '2%', width: '13%', height: '16%' } },
    { key: 'zone_6', label: 'Z6', desc: '4.88 - 6.10m', style: { top: '78%', right: '2%', width: '13%', height: '16%' } },
    { key: 'zone_7', label: 'Z7', desc: 'Sudut Bawah', style: { top: '78%', left: '62%', width: '13%', height: '16%' } },
    { key: 'zone_8', label: 'Z8', desc: 'Bawah Tengah', style: { top: '68%', left: '49%', width: '12%', height: '26%' } },
    { key: 'zone_9', label: 'Z9', desc: 'Tengah Lapangan', style: { top: '34%', left: '49%', width: '12%', height: '32%' } },
    { key: 'zone_10', label: 'Z10', desc: 'Atas Tengah', style: { top: '4%', left: '49%', width: '12%', height: '26%' } },
];

function TournamentCourtMiniature({ aggStats }) {
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
        if (!aggStats) return { ace: 0, inC: 0, total: 0 };

        if (actionFilter === 'all') {
            const ace = aggStats[`${zoneKey}_ace`] || 0;
            const inC = aggStats[`${zoneKey}_in`] || (ace === 0 ? aggStats[zoneKey] || 0 : 0);
            return { ace, inC, total: ace + inC };
        }

        let az = aggStats.action_zones?.[actionFilter];
        if (typeof az === 'string') {
            try { az = JSON.parse(az); } catch (e) { az = null; }
        }
        if (az && typeof az === 'object') {
            const ace = az[`${zoneKey}_ace`] || 0;
            const inC = az[`${zoneKey}_in`] || (ace === 0 ? az[zoneKey] || 0 : 0);
            return { ace, inC, total: ace + inC };
        }

        if (actionFilter === 'service') {
            const ace = aggStats[`${zoneKey}_ace`] || 0;
            const inC = aggStats[`${zoneKey}_in`] || (ace === 0 ? aggStats[zoneKey] || 0 : 0);
            return { ace, inC, total: ace + inC };
        }

        return { ace: 0, inC: 0, total: 0 };
    };

    const totalZoneHits = ZONE_CONFIG.reduce((sum, z) => sum + getZoneStats(z.key).total, 0);

    return (
        <div className="w-full bg-surface-950/70 border border-surface-800 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-xs font-black text-emerald-400 uppercase tracking-wider">
                        🎯 PETA SEBARAN 10 ZONA TITIK JATUH BOLA (AKUMULASI TURNAMEN)
                    </span>
                </div>
                <span className="text-[10px] text-surface-400 font-mono">Format: % (ACE / IN)</span>
            </div>

            {/* Filter Jenis Aksi Lapangan */}
            <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-surface-800/80">
                <span className="text-[10px] text-surface-400 font-bold mr-1">Filter Aksi:</span>
                {actionPills.map(p => (
                    <button
                        key={p.key}
                        type="button"
                        onClick={() => setActionFilter(p.key)}
                        className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                            actionFilter === p.key
                                ? 'bg-emerald-500 text-white shadow-sm scale-105'
                                : 'bg-surface-800/80 text-surface-400 hover:text-surface-200 border border-surface-700/60'
                        }`}
                    >
                        {p.label}
                    </button>
                ))}
            </div>

            {/* Graphic Court Container */}
            <div className="relative w-full aspect-[2.1/1] sm:aspect-[2.3/1] rounded-xl border-2 border-emerald-500/40 bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950 overflow-hidden shadow-inner select-none">
                {/* SVG Court Background Lines */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 190">
                    <rect x="10" y="10" width="380" height="170" fill="none" stroke="#34d399" strokeWidth="2.5" strokeOpacity="0.8" />
                    <line x1="190" y1="10" x2="190" y2="180" stroke="#ffffff" strokeWidth="3" strokeDasharray="5 3" />
                    <text x="190" y="8" fill="#a7f3d0" fontSize="7" textAnchor="middle" fontWeight="bold">NET</text>

                    <circle cx="85" cy="95" r="20" fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="3 2" />
                    <circle cx="85" cy="95" r="5" fill="#fbbf24" />
                    <text x="85" y="125" fill="#fef08a" fontSize="7" textAnchor="middle" fontWeight="bold">POSISI AWAL</text>

                    {/* Zone Fan Lines Radiating from Circle to Right Boundary */}
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
                {ZONE_CONFIG.map((z) => {
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
                            <span className={`text-[8px] sm:text-[9.5px] font-black leading-tight ${hasValue ? 'text-amber-300' : 'text-emerald-200/70'}`}>
                                {pct}%
                            </span>
                            <div className="flex items-center gap-0.5 text-[7px] sm:text-[8px] font-bold font-mono leading-none mt-0.5">
                                <span className={ace > 0 ? 'text-amber-400 font-black' : 'text-surface-400'}>{ace}A</span>
                                <span className="text-surface-500">/</span>
                                <span className={inC > 0 ? 'text-emerald-300 font-black' : 'text-surface-400'}>{inC}In</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Legend & Stats */}
            <div className="flex items-center justify-between pt-1 border-t border-surface-800 text-[10px] text-surface-400 font-medium">
                <span>Format: <strong className="text-amber-300">% (ACE / IN)</strong></span>
                <span>Total Titik Bola Masuk: <strong className="text-emerald-400 font-bold">{totalZoneHits} Bola</strong></span>
            </div>
        </div>
    );
}

export default function TeamAssessment({ tournament, team, isSuperTeam, matches = [] }) {
    // Match filter: 'all' or match.id
    const [selectedMatchFilter, setSelectedMatchFilter] = useState('all');

    const teamName = team.name || 'Tim Sepak Takraw';

    // List of athletes
    const athletes = useMemo(() => {
        if (!isSuperTeam) {
            return team.athletes || [];
        }
        const all = team.members?.flatMap(m => m.athletes || []) || [];
        const map = new Map();
        all.forEach(a => {
            if (a && a.id && !map.has(a.id)) {
                map.set(a.id, a);
            }
        });
        return Array.from(map.values()).sort((a, b) => (a.jersey_number || 0) - (b.jersey_number || 0));
    }, [isSuperTeam, team]);

    const athleteIds = useMemo(() => athletes.map(a => a.id), [athletes]);

    const teamMemberIds = useMemo(() => {
        if (!isSuperTeam) return [team.id];
        return [team.id, ...(team.members?.map(m => m.id) || [])];
    }, [isSuperTeam, team]);

    // Separate matches
    const finishedMatches = useMemo(() => matches.filter(m => m.status === 'finished'), [matches]);
    const liveMatches = useMemo(() => matches.filter(m => m.status === 'live'), [matches]);
    const scheduledMatches = useMemo(() => matches.filter(m => m.status !== 'finished' && m.status !== 'live'), [matches]);

    // Active matches to evaluate based on selectedMatchFilter
    const activeEvalMatches = useMemo(() => {
        if (selectedMatchFilter === 'all') {
            return finishedMatches;
        }
        return finishedMatches.filter(m => m.id === Number(selectedMatchFilter));
    }, [finishedMatches, selectedMatchFilter]);

    // Aggregate stats calculation
    const aggregatedStats = useMemo(() => {
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
        };

        for (let i = 1; i <= 10; i++) {
            agg[`zone_${i}`] = 0;
            agg[`zone_${i}_ace`] = 0;
            agg[`zone_${i}_in`] = 0;
        }

        activeEvalMatches.forEach(m => {
            (m.sets || []).forEach(s => {
                (s.stats || []).forEach(st => {
                    const isOurTeamStat = (st.athlete_id && athleteIds.includes(st.athlete_id)) ||
                                          (st.team_id && teamMemberIds.includes(st.team_id));
                    if (!isOurTeamStat) return;

                    Object.keys(agg).forEach(k => {
                        if (k !== 'action_zones') {
                            agg[k] += Number(st[k]) || 0;
                        }
                    });

                    let az = st.action_zones;
                    if (typeof az === 'string') {
                        try { az = JSON.parse(az); } catch (e) { az = null; }
                    }
                    if (az && typeof az === 'object') {
                        Object.keys(az).forEach(act => {
                            if (!agg.action_zones[act]) agg.action_zones[act] = {};
                            let actObj = az[act];
                            if (typeof actObj === 'string') {
                                try { actObj = JSON.parse(actObj); } catch (e) { actObj = null; }
                            }
                            if (actObj && typeof actObj === 'object') {
                                Object.keys(actObj).forEach(zk => {
                                    agg.action_zones[act][zk] = (agg.action_zones[act][zk] || 0) + (Number(actObj[zk]) || 0);
                                });
                            }
                        });
                    }
                });
            });
        });

        return agg;
    }, [activeEvalMatches, athleteIds, teamMemberIds]);

    // Format action performance helper
    const formatActionPerf = (inC = 0, aceC = 0, errC = 0) => {
        const inVal = Number(inC) || 0;
        const aceVal = Number(aceC) || 0;
        const errVal = Number(errC) || 0;
        const success = inVal + aceVal;
        const total = success + errVal;
        if (total === 0) return { inVal, aceVal, errVal, success: 0, total: 0, pct: 0, formatted: '0% (0/0)' };
        const pct = Math.round((success / total) * 100);
        return { inVal, aceVal, errVal, success, total, pct, formatted: `${pct}% (${success}/${total})` };
    };

    const servPerf = formatActionPerf(aggregatedStats.service_in, aggregatedStats.service_ace, aggregatedStats.service_error);
    const strikePerf = formatActionPerf(aggregatedStats.strike_in, aggregatedStats.strike_ace, aggregatedStats.strike_error);
    const freePerf = formatActionPerf(aggregatedStats.freeball_in, aggregatedStats.freeball_ace, aggregatedStats.freeball_error);
    const firstPerf = formatActionPerf(aggregatedStats.firstball_in, aggregatedStats.firstball_ace, aggregatedStats.firstball_error);
    const feedPerf = formatActionPerf(aggregatedStats.feeding_in, aggregatedStats.feeding_ace, aggregatedStats.feeding_error);
    const blockPerf = formatActionPerf(aggregatedStats.blocking_in, aggregatedStats.blocking_ace, aggregatedStats.blocking_error);

    const overallPerf = useMemo(() => {
        const actionsList = [
            { in: aggregatedStats.service_in || 0, ace: aggregatedStats.service_ace || 0, err: aggregatedStats.service_error || 0 },
            { in: aggregatedStats.strike_in || 0, ace: aggregatedStats.strike_ace || 0, err: aggregatedStats.strike_error || 0 },
            { in: aggregatedStats.freeball_in || 0, ace: aggregatedStats.freeball_ace || 0, err: aggregatedStats.freeball_error || 0 },
            { in: aggregatedStats.firstball_in || 0, ace: aggregatedStats.firstball_ace || 0, err: aggregatedStats.firstball_error || 0 },
            { in: aggregatedStats.feeding_in || 0, ace: aggregatedStats.feeding_ace || 0, err: aggregatedStats.feeding_error || 0 },
            { in: aggregatedStats.blocking_in || 0, ace: aggregatedStats.blocking_ace || 0, err: aggregatedStats.blocking_error || 0 },
        ];

        let totalIn = 0, totalAce = 0, totalErr = 0;
        actionsList.forEach(a => {
            totalIn += Number(a.in) || 0;
            totalAce += Number(a.ace) || 0;
            totalErr += Number(a.err) || 0;
        });

        const totalSuccess = totalIn + totalAce;
        const totalAttempts = totalSuccess + totalErr;
        const pct = totalAttempts > 0 ? Math.round((totalSuccess / totalAttempts) * 100) : 0;
        return {
            totalIn, totalAce, totalErr, totalSuccess, totalAttempts, pct,
            formatted: `${pct}% (${totalSuccess}/${totalAttempts})`,
        };
    }, [aggregatedStats]);

    // Match Details and W/L breakdown
    const detailedMatches = useMemo(() => {
        return matches.map(m => {
            const isHome = isSuperTeam
                ? m.home_super_team_id === team.id
                : (m.home_team_id === team.id || teamMemberIds.includes(m.home_team_id));

            const oppName = isHome
                ? (m.away_super_team?.name || m.away_team?.name || m.away_display_name || 'Lawan')
                : (m.home_super_team?.name || m.home_team?.name || m.home_display_name || 'Lawan');

            const isTeamMatch = m.match_mode === 'team_regu' || m.match_mode === 'team_double';

            let mySetsWon = 0;
            let oppSetsWon = 0;
            const setScores = [];

            if (isTeamMatch && (m.sets || []).length > 3) {
                let myRegus = 0;
                let oppRegus = 0;
                [0, 1, 2].forEach(rIdx => {
                    const rSets = (m.sets || []).filter(s => s.set_number >= rIdx * 3 + 1 && s.set_number <= rIdx * 3 + 3 && s.status === 'finished');
                    const myW = rSets.filter(s => isHome ? s.home_score > s.away_score : s.away_score > s.home_score).length;
                    const oppW = rSets.filter(s => isHome ? s.away_score > s.home_score : s.home_score > s.away_score).length;
                    if (myW >= 2 || (rSets.length >= 3 && myW > oppW)) myRegus++;
                    else if (oppW >= 2 || (rSets.length >= 3 && oppW > myW)) oppRegus++;
                });
                mySetsWon = myRegus;
                oppSetsWon = oppRegus;
            } else {
                (m.sets || []).filter(s => s.status === 'finished').forEach(s => {
                    const myScore = isHome ? s.home_score : s.away_score;
                    const oppScore = isHome ? s.away_score : s.home_score;
                    setScores.push(`S${s.set_number}: ${myScore}-${oppScore}`);
                    if (myScore > oppScore) mySetsWon++;
                    else if (oppScore > myScore) oppSetsWon++;
                });
            }

            const isWinner = isSuperTeam
                ? m.winner_super_team_id === team.id
                : (m.winner_team_id === team.id || (mySetsWon > oppSetsWon));

            return {
                ...m,
                isHome,
                oppName,
                mySetsWon,
                oppSetsWon,
                setScores,
                isWinner,
                isFinished: m.status === 'finished',
            };
        });
    }, [isSuperTeam, matches, team.id, teamMemberIds]);

    const winsCount = useMemo(() => detailedMatches.filter(m => m.isFinished && m.isWinner).length, [detailedMatches]);
    const lossesCount = useMemo(() => detailedMatches.filter(m => m.isFinished && !m.isWinner).length, [detailedMatches]);
    const winRate = finishedMatches.length > 0 ? Math.round((winsCount / finishedMatches.length) * 100) : 0;

    // Athlete leaderboard across active matches
    const athleteLeaderboard = useMemo(() => {
        return athletes.map(ath => {
            let sIn = 0, sAce = 0, sErr = 0;
            let mCount = 0;
            let sCount = 0;

            activeEvalMatches.forEach(m => {
                let playedInMatch = false;
                (m.sets || []).forEach(s => {
                    const st = s.stats?.find(x => x.athlete_id === ath.id);
                    if (st) {
                        playedInMatch = true;
                        sCount++;
                        sIn += (st.service_in || 0) + (st.strike_in || 0) + (st.freeball_in || 0) + (st.firstball_in || 0) + (st.feeding_in || 0) + (st.blocking_in || 0);
                        sAce += (st.service_ace || 0) + (st.strike_ace || 0) + (st.freeball_ace || 0) + (st.firstball_ace || 0) + (st.feeding_ace || 0) + (st.blocking_ace || 0);
                        sErr += (st.service_error || 0) + (st.strike_error || 0) + (st.freeball_error || 0) + (st.firstball_error || 0) + (st.feeding_error || 0) + (st.blocking_error || 0);
                    }
                });
                if (playedInMatch) mCount++;
            });

            const success = sIn + sAce;
            const total = success + sErr;
            const pct = total > 0 ? Math.round((success / total) * 100) : 0;

            return {
                ...ath,
                matches_played: mCount,
                sets_played: sCount,
                sIn, sAce, sErr,
                total_success: success,
                total_attempts: total,
                pct,
                formatted_pct: `${pct}% (${success}/${total})`,
            };
        }).sort((a, b) => b.total_success - a.total_success);
    }, [activeEvalMatches, athletes]);

    // Handle PDF Export
    const handleDownloadPdf = () => {
        exportTeamTournamentPdf({
            tournament,
            team,
            teamAggStats: aggregatedStats,
            athleteLeaderboard,
            teamMatches: matches,
        });
    };

    const stageLabels = {
        pool: 'Babak Pool',
        round_of_16: 'Babak 16 Besar',
        quarterfinal: 'Perempat Final',
        semifinal: 'Semifinal',
        third_place: 'Perebutan Juara 3',
        final: 'Babak Final',
    };

    return (
        <AuthenticatedLayout header={`Hasil Penilaian Skor: ${teamName}`}>
            <Head title={`Hasil Penilaian Skor: ${teamName} - ${tournament.name}`} />

            <div className="max-w-7xl mx-auto space-y-6 pb-12">
                {/* ─── Top Navigation Bar ─── */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-surface-800">
                    <div className="flex items-center gap-3">
                        <Link
                            href={route('coach.tournaments.history')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-800/80 hover:bg-surface-700 text-surface-300 hover:text-white text-xs font-bold transition-all border border-surface-700/60 shadow-xs"
                        >
                            <span>←</span> Kembali ke Riwayat Turnamen
                        </Link>
                        <span className="text-surface-600 hidden sm:inline">|</span>
                        <span className="text-xs text-surface-400 truncate max-w-[280px] hidden sm:inline">
                            🏆 {tournament.name}
                        </span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-200 text-xs font-bold border border-surface-700 shadow-sm transition-all cursor-pointer"
                            title="Cetak tampilan halaman ini"
                        >
                            <span>🖨️</span> Cetak
                        </button>
                        <button
                            type="button"
                            onClick={handleDownloadPdf}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-surface-950 text-xs font-black shadow-md shadow-amber-950/40 transition-all active:scale-95 cursor-pointer"
                            title="Unduh laporan performa tim lengkap dalam format PDF resmi"
                        >
                            <span>📥</span> Unduh Laporan PDF (Semua Laga)
                        </button>
                    </div>
                </div>

                {/* ─── HERO SCOREBOARD & REKOR TURNAMEN (MATCH RESULT STYLE) ─── */}
                <div className="rounded-3xl border-2 border-amber-500/30 bg-gradient-to-b from-surface-900 via-surface-900/95 to-surface-950 p-6 sm:p-8 shadow-2xl backdrop-blur-md relative overflow-hidden">
                    {/* Background Glow */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                        {/* Team Info */}
                        <div className="flex items-start sm:items-center gap-4">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-500/30 to-amber-600/10 border-2 border-amber-500/40 flex items-center justify-center text-3xl sm:text-4xl font-black text-amber-300 shadow-lg shadow-amber-950/40 shrink-0">
                                {isSuperTeam ? '🏆' : '👥'}
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                        Hasil Penilaian Resmi Wasit
                                    </span>
                                    {isSuperTeam && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                            Super Team
                                        </span>
                                    )}
                                    <StatusBadge status={tournament.status} size="xs" />
                                </div>
                                <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight">
                                    {teamName}
                                </h1>
                                <p className="text-xs sm:text-sm text-surface-400 mt-1 flex items-center gap-2 flex-wrap">
                                    <span>🏆 {tournament.name}</span>
                                    <span>•</span>
                                    <span>📍 {team.region || 'Tanpa Wilayah'}</span>
                                    <span>•</span>
                                    <span>👤 Pelatih: {team.coach?.name || '—'}</span>
                                </p>
                            </div>
                        </div>

                        {/* Tournament Overall Score Highlight Badge */}
                        <div className="flex items-center gap-3 self-start lg:self-center bg-surface-950/80 border border-amber-500/40 rounded-2xl p-3.5 sm:p-4 shadow-xl">
                            <div className="text-right">
                                <span className="text-[10px] uppercase font-bold tracking-wider text-surface-400 block">
                                    Total All Performance
                                </span>
                                <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
                                    {overallPerf.pct}%
                                </span>
                                <span className={`text-[10px] font-bold block ${overallPerf.pct >= 70 ? 'text-emerald-400' : overallPerf.pct >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                                    {overallPerf.pct >= 70 ? '★ Sangat Baik' : overallPerf.pct >= 50 ? '● Cukup Baik' : '▼ Perlu Evaluasi'}
                                </span>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl">
                                📊
                            </div>
                        </div>
                    </div>

                    {/* 4 Hero KPI Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-surface-800/80">
                        <div className="p-3.5 rounded-2xl bg-surface-950/60 border border-surface-800 text-center">
                            <span className="text-[10px] uppercase font-bold text-surface-400 block">🏆 Rekor Pertandingan</span>
                            <span className="text-lg sm:text-xl font-black text-emerald-400 font-mono mt-0.5 block">
                                {winsCount}M - {lossesCount}K
                            </span>
                            <span className="text-[10px] text-surface-500 block font-mono mt-0.5">
                                Win Rate: <strong>{winRate}%</strong>
                            </span>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-surface-950/60 border border-surface-800 text-center">
                            <span className="text-[10px] uppercase font-bold text-surface-400 block">⚔️ Laga Selesai Dinilai</span>
                            <span className="text-lg sm:text-xl font-black text-surface-100 font-mono mt-0.5 block">
                                {finishedMatches.length} Laga
                            </span>
                            <span className="text-[10px] text-surface-500 block mt-0.5">
                                dari total {matches.length} laga terdaftar
                            </span>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-surface-950/60 border border-surface-800 text-center">
                            <span className="text-[10px] uppercase font-bold text-surface-400 block">🎯 Poin Sukses</span>
                            <span className="text-lg sm:text-xl font-black text-primary-400 font-mono mt-0.5 block">
                                {overallPerf.totalSuccess} Bola
                            </span>
                            <span className="text-[10px] text-surface-500 block font-mono mt-0.5">
                                dari {overallPerf.totalAttempts} total percobaan
                            </span>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center">
                            <span className="text-[10px] uppercase font-bold text-amber-300 block">👥 Atlet Terdaftar</span>
                            <span className="text-lg sm:text-xl font-black text-amber-400 font-mono mt-0.5 block">
                                {athletes.length} Atlet
                            </span>
                            <span className="text-[10px] text-surface-400 block mt-0.5">
                                {isSuperTeam ? `${team.members?.length || 0} Sub-Tim` : 'Roster Resmi'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ─── MATCH FILTER PILLS SELECTOR ─── */}
                <div className="p-3 rounded-2xl bg-surface-900/70 border border-surface-800 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-surface-300 flex items-center gap-1.5">
                            <span>🔍</span> Tampilkan Statistik:
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 sm:pb-0">
                        <button
                            type="button"
                            onClick={() => setSelectedMatchFilter('all')}
                            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
                                selectedMatchFilter === 'all'
                                    ? 'bg-amber-500 text-surface-950 font-black shadow-md'
                                    : 'bg-surface-800/80 text-surface-400 hover:text-surface-200 border border-surface-700/60'
                            }`}
                        >
                            Akumulasi Semua Laga ({finishedMatches.length})
                        </button>

                        {detailedMatches.filter(m => m.isFinished).map((m, idx) => (
                            <button
                                key={m.id}
                                type="button"
                                onClick={() => setSelectedMatchFilter(m.id.toString())}
                                className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                                    selectedMatchFilter === m.id.toString()
                                        ? 'bg-amber-500 text-surface-950 font-black shadow-md'
                                        : 'bg-surface-800/80 text-surface-400 hover:text-surface-200 border border-surface-700/60'
                                }`}
                            >
                                <span>vs {m.oppName}</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                                    m.isWinner ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                                }`}>
                                    {m.mySetsWon}-{m.oppSetsWon}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ─── GRID: COURT HEATMAP & STATISTIK AKSI ─── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Court Heatmap (5 Cols) */}
                    <div className="lg:col-span-5">
                        <TournamentCourtMiniature aggStats={aggregatedStats} />
                    </div>

                    {/* Table of Technical Parameters (7 Cols) */}
                    <div className="lg:col-span-7 rounded-2xl border border-surface-800 bg-surface-950/60 p-5 shadow-xl space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-surface-800">
                            <div>
                                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                                    <span>📋</span> Parameter Statistik Performa Tim
                                </h3>
                                <p className="text-[11px] text-surface-400 mt-0.5">
                                    {selectedMatchFilter === 'all'
                                        ? `Akumulasi seluruh ${finishedMatches.length} laga resmi yang telah dinilai wasit`
                                        : `Data evaluasi khusus untuk laga terpilih`}
                                </p>
                            </div>
                            <span className="text-xs font-mono font-bold text-amber-400 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                {overallPerf.formatted}
                            </span>
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-surface-800 bg-surface-900/40">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-surface-900 border-b border-surface-800 text-surface-400 uppercase text-[10px] tracking-wider">
                                    <tr>
                                        <th className="py-2.5 px-3.5">Parameter Aksi</th>
                                        <th className="py-2.5 px-2.5 text-center">Bola In</th>
                                        <th className="py-2.5 px-2.5 text-center text-amber-300">Ace (Poin)</th>
                                        <th className="py-2.5 px-2.5 text-center text-red-300">Error</th>
                                        <th className="py-2.5 px-2.5 text-center font-bold text-surface-200">Sukses</th>
                                        <th className="py-2.5 px-3.5 text-right font-bold text-amber-400">Efektivitas</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-surface-850 text-surface-300 font-medium">
                                    <tr className="hover:bg-surface-800/30">
                                        <td className="py-2 px-3.5 font-bold text-surface-200">🏐 Servis (Tekong)</td>
                                        <td className="py-2 px-2.5 text-center font-mono text-primary-400">{servPerf.inVal}</td>
                                        <td className="py-2 px-2.5 text-center font-mono text-amber-400 font-bold">{servPerf.aceVal}</td>
                                        <td className="py-2 px-2.5 text-center font-mono text-red-400">{servPerf.errVal}</td>
                                        <td className="py-2 px-2.5 text-center font-mono font-bold text-white">{servPerf.success}</td>
                                        <td className="py-2 px-3.5 text-right font-mono font-bold">
                                            <span className={`px-2 py-0.5 rounded text-[11px] ${servPerf.total > 0 ? (servPerf.pct >= 70 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400') : 'bg-surface-800/50 text-surface-500'}`}>
                                                {servPerf.formatted}
                                            </span>
                                        </td>
                                    </tr>
                                    <tr className="hover:bg-surface-800/30">
                                        <td className="py-2 px-3.5 font-bold text-surface-200">⚡ Strike / Smash</td>
                                        <td className="py-2 px-2.5 text-center font-mono text-primary-400">{strikePerf.inVal}</td>
                                        <td className="py-2 px-2.5 text-center font-mono text-amber-400 font-bold">{strikePerf.aceVal}</td>
                                        <td className="py-2 px-2.5 text-center font-mono text-red-400">{strikePerf.errVal}</td>
                                        <td className="py-2 px-2.5 text-center font-mono font-bold text-white">{strikePerf.success}</td>
                                        <td className="py-2 px-3.5 text-right font-mono font-bold">
                                            <span className={`px-2 py-0.5 rounded text-[11px] ${strikePerf.total > 0 ? (strikePerf.pct >= 70 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400') : 'bg-surface-800/50 text-surface-500'}`}>
                                                {strikePerf.formatted}
                                            </span>
                                        </td>
                                    </tr>
                                    <tr className="hover:bg-surface-800/30">
                                        <td className="py-2 px-3.5 font-bold text-surface-200">🔄 Freeball</td>
                                        <td className="py-2 px-2.5 text-center font-mono text-primary-400">{freePerf.inVal}</td>
                                        <td className="py-2 px-2.5 text-center font-mono text-amber-400 font-bold">{freePerf.aceVal}</td>
                                        <td className="py-2 px-2.5 text-center font-mono text-red-400">{freePerf.errVal}</td>
                                        <td className="py-2 px-2.5 text-center font-mono font-bold text-white">{freePerf.success}</td>
                                        <td className="py-2 px-3.5 text-right font-mono font-bold">
                                            <span className={`px-2 py-0.5 rounded text-[11px] ${freePerf.total > 0 ? (freePerf.pct >= 70 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400') : 'bg-surface-800/50 text-surface-500'}`}>
                                                {freePerf.formatted}
                                            </span>
                                        </td>
                                    </tr>
                                    <tr className="hover:bg-surface-800/30">
                                        <td className="py-2 px-3.5 font-bold text-surface-200">🤲 Firstball / Receive</td>
                                        <td className="py-2 px-2.5 text-center font-mono text-primary-400">{firstPerf.inVal}</td>
                                        <td className="py-2 px-2.5 text-center font-mono text-amber-400 font-bold">{firstPerf.aceVal}</td>
                                        <td className="py-2 px-2.5 text-center font-mono text-red-400">{firstPerf.errVal}</td>
                                        <td className="py-2 px-2.5 text-center font-mono font-bold text-white">{firstPerf.success}</td>
                                        <td className="py-2 px-3.5 text-right font-mono font-bold">
                                            <span className={`px-2 py-0.5 rounded text-[11px] ${firstPerf.total > 0 ? (firstPerf.pct >= 70 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400') : 'bg-surface-800/50 text-surface-500'}`}>
                                                {firstPerf.formatted}
                                            </span>
                                        </td>
                                    </tr>
                                    <tr className="hover:bg-surface-800/30">
                                        <td className="py-2 px-3.5 font-bold text-surface-200">🎯 Feeding / Umpan</td>
                                        <td className="py-2 px-2.5 text-center font-mono text-primary-400">{feedPerf.inVal}</td>
                                        <td className="py-2 px-2.5 text-center font-mono text-amber-400 font-bold">{feedPerf.aceVal}</td>
                                        <td className="py-2 px-2.5 text-center font-mono text-red-400">{feedPerf.errVal}</td>
                                        <td className="py-2 px-2.5 text-center font-mono font-bold text-white">{feedPerf.success}</td>
                                        <td className="py-2 px-3.5 text-right font-mono font-bold">
                                            <span className={`px-2 py-0.5 rounded text-[11px] ${feedPerf.total > 0 ? (feedPerf.pct >= 70 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400') : 'bg-surface-800/50 text-surface-500'}`}>
                                                {feedPerf.formatted}
                                            </span>
                                        </td>
                                    </tr>
                                    <tr className="hover:bg-surface-800/30">
                                        <td className="py-2 px-3.5 font-bold text-surface-200">🛡️ Blocking / Blok</td>
                                        <td className="py-2 px-2.5 text-center font-mono text-primary-400">{blockPerf.inVal}</td>
                                        <td className="py-2 px-2.5 text-center font-mono text-amber-400 font-bold">{blockPerf.aceVal}</td>
                                        <td className="py-2 px-2.5 text-center font-mono text-red-400">{blockPerf.errVal}</td>
                                        <td className="py-2 px-2.5 text-center font-mono font-bold text-white">{blockPerf.success}</td>
                                        <td className="py-2 px-3.5 text-right font-mono font-bold">
                                            <span className={`px-2 py-0.5 rounded text-[11px] ${blockPerf.total > 0 ? (blockPerf.pct >= 70 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400') : 'bg-surface-800/50 text-surface-500'}`}>
                                                {blockPerf.formatted}
                                            </span>
                                        </td>
                                    </tr>

                                    {/* BARIS TOTAL ALL PERFORMANCE HIGHLIGHT */}
                                    <tr className="bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border-t-2 border-amber-500/40">
                                        <td className="py-3 px-3.5 font-black text-amber-300 flex items-center gap-2">
                                            <span>📊</span> TOTAL ALL PERFORMANCE
                                        </td>
                                        <td className="py-3 px-2.5 text-center font-mono font-black text-surface-100">{overallPerf.totalIn}</td>
                                        <td className="py-3 px-2.5 text-center font-mono font-black text-amber-400">{overallPerf.totalAce}</td>
                                        <td className="py-3 px-2.5 text-center font-mono font-black text-red-400">{overallPerf.totalErr}</td>
                                        <td className="py-3 px-2.5 text-center font-mono font-black text-white">{overallPerf.totalSuccess}</td>
                                        <td className="py-3 px-3.5 text-right font-mono font-black">
                                            <span className="px-3 py-1 rounded-xl bg-amber-500/30 border border-amber-500/50 text-amber-300 text-xs shadow-sm">
                                                {overallPerf.formatted}
                                            </span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="flex items-center justify-between pt-1 text-[11px] text-surface-400">
                            <span>* Rumus: (Total Bola In + Total Ace) / (Total Bola Masuk + Total Error) × 100%</span>
                            <span className="font-mono text-amber-300 font-bold">Total Evaluasi: {overallPerf.totalAttempts} Bola</span>
                        </div>
                    </div>
                </div>

                {/* ─── DAFTAR RINCIAN LAGA & SKOR WASIT (MATCH-BY-MATCH CARDS) ─── */}
                <div className="rounded-2xl border border-surface-800 bg-surface-900/60 p-5 sm:p-6 shadow-xl space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-surface-800">
                        <div>
                            <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                                <span>⚔️</span> Riwayat Seluruh Laga Tim di Turnamen ({matches.length} Laga)
                            </h2>
                            <p className="text-xs text-surface-400 mt-0.5">
                                Daftar seluruh laga yang dimainkan tim ini beserta skor resmi hasil penilaian wasit
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                                {winsCount} Menang
                            </span>
                            <span className="px-2.5 py-1 rounded-lg bg-red-500/15 text-red-300 border border-red-500/30 text-xs font-bold">
                                {lossesCount} Kalah
                            </span>
                        </div>
                    </div>

                    {detailedMatches.length === 0 ? (
                        <p className="text-xs text-surface-500 italic text-center py-6">
                            Belum ada jadwal pertandingan untuk tim ini.
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {detailedMatches.map((m) => (
                                <div
                                    key={m.id}
                                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                                        m.isFinished
                                            ? (m.isWinner ? 'bg-surface-950/70 border-emerald-500/30 hover:border-emerald-500/50' : 'bg-surface-950/70 border-surface-800 hover:border-surface-700')
                                            : 'bg-surface-950/40 border-surface-800/80 opacity-80'
                                    }`}
                                >
                                    <div>
                                        {/* Match Header Badges */}
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="px-2 py-0.5 rounded-md bg-surface-800 text-surface-300 text-[10px] font-bold border border-surface-700">
                                                    {stageLabels[m.stage] || m.stage?.toUpperCase()}
                                                </span>
                                                <span className="text-[10px] font-mono text-surface-400">
                                                    Match #{m.match_number || m.id}
                                                </span>
                                            </div>
                                            <StatusBadge status={m.status} size="xs" />
                                        </div>

                                        {/* Score Match Header */}
                                        <div className="flex items-center justify-between gap-3 my-2">
                                            <div className="flex-1 min-w-0">
                                                <span className="text-xs font-black text-white truncate block">
                                                    {teamName}
                                                </span>
                                                <span className="text-[10px] text-surface-400 block">
                                                    {m.isHome ? 'Tuan Rumah' : 'Tamu'}
                                                </span>
                                            </div>

                                            {m.isFinished ? (
                                                <div className="px-3 py-1 rounded-xl bg-surface-900 border border-surface-750 font-mono text-base font-black text-amber-400 text-center shrink-0 shadow-inner">
                                                    {m.mySetsWon} - {m.oppSetsWon}
                                                </div>
                                            ) : (
                                                <span className="text-xs font-bold text-surface-500 italic">VS</span>
                                            )}

                                            <div className="flex-1 min-w-0 text-right">
                                                <span className="text-xs font-black text-surface-200 truncate block">
                                                    {m.oppName}
                                                </span>
                                                <span className="text-[10px] text-surface-400 block">
                                                    {m.isHome ? 'Tamu' : 'Tuan Rumah'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Sets Scores */}
                                        {m.setScores.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-surface-850 text-[11px] font-mono">
                                                {m.setScores.map((score, sIdx) => (
                                                    <span key={sIdx} className="px-2 py-0.5 rounded-md bg-surface-900 text-surface-300 border border-surface-800">
                                                        {score}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer Details & Action Button */}
                                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-surface-850/80">
                                        <div className="text-[10px] text-surface-400 flex items-center gap-2">
                                            <span>🏟️ {m.court?.name || (m.court_number ? `Lap. ${m.court_number}` : '—')}</span>
                                            {m.referee && <span>• ⚖️ {m.referee.name}</span>}
                                        </div>

                                        <Link
                                            href={route('matches.show', m.id)}
                                            className="px-3 py-1.5 rounded-xl bg-primary-600/20 hover:bg-primary-600/30 text-primary-300 font-bold text-xs border border-primary-500/30 transition-all flex items-center gap-1 active:scale-95 cursor-pointer shadow-xs"
                                            title="Buka Lembar Skor Wasit Resmi"
                                        >
                                            <span>📄 Skor Wasit</span>
                                            <span>→</span>
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ─── TABEL LEADERBOARD & STATISTIK ATLET TIM ─── */}
                <div className="rounded-2xl border border-surface-800 bg-surface-900/60 p-5 sm:p-6 shadow-xl space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-surface-800">
                        <div>
                            <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                                <span>👤</span> Peringkat & Kontribusi Statistik Atlet ({athletes.length} Atlet)
                            </h2>
                            <p className="text-xs text-surface-400 mt-0.5">
                                Akumulasi total sentuhan, poin sukses, dan persentase efektivitas tiap atlet di turnamen
                            </p>
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-surface-800 bg-surface-950/60">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-surface-900 border-b border-surface-800 text-surface-400 uppercase text-[10px] tracking-wider">
                                <tr>
                                    <th className="py-2.5 px-3 text-center">#No</th>
                                    <th className="py-2.5 px-3">Nama Atlet</th>
                                    <th className="py-2.5 px-3 text-center">Posisi</th>
                                    <th className="py-2.5 px-2.5 text-center">Laga / Set</th>
                                    <th className="py-2.5 px-2 text-center text-primary-400 font-bold">Bola In</th>
                                    <th className="py-2.5 px-2 text-center text-amber-400 font-bold">Ace</th>
                                    <th className="py-2.5 px-2 text-center text-red-400 font-bold">Error</th>
                                    <th className="py-2.5 px-2.5 text-center font-bold text-white">Sukses</th>
                                    <th className="py-2.5 px-3.5 text-right font-bold text-amber-400">All Performance %</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-850 text-surface-300 font-medium">
                                {athleteLeaderboard.map((ath, idx) => (
                                    <tr key={ath.id || idx} className="hover:bg-surface-800/30">
                                        <td className="py-2 px-3 text-center font-mono text-surface-400 font-black">
                                            #{ath.jersey_number || '-'}
                                        </td>
                                        <td className="py-2 px-3 font-bold text-white">
                                            {ath.name}
                                        </td>
                                        <td className="py-2 px-3 text-center text-surface-400 text-[11px]">
                                            {ath.position || 'All-Round'}
                                        </td>
                                        <td className="py-2 px-2.5 text-center font-mono text-surface-300 text-[11px]">
                                            {ath.matches_played}L / {ath.sets_played}S
                                        </td>
                                        <td className="py-2 px-2 text-center font-mono text-primary-400">
                                            {ath.sIn}
                                        </td>
                                        <td className="py-2 px-2 text-center font-mono text-amber-400 font-bold">
                                            {ath.sAce}
                                        </td>
                                        <td className="py-2 px-2 text-center font-mono text-red-400">
                                            {ath.sErr}
                                        </td>
                                        <td className="py-2 px-2.5 text-center font-mono font-black text-white">
                                            {ath.total_success}
                                        </td>
                                        <td className="py-2 px-3.5 text-right font-mono font-bold">
                                            <span className={`px-2 py-0.5 rounded text-[11px] ${
                                                ath.total_attempts > 0
                                                    ? (ath.pct >= 70 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400')
                                                    : 'bg-surface-800/50 text-surface-500'
                                            }`}>
                                                {ath.formatted_pct}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
