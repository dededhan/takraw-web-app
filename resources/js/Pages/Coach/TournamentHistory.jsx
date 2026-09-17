import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import StatusBadge from '@/Components/StatusBadge';
import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import { exportTeamTournamentPdf } from '@/Utils/teamTournamentPdfExport';

export default function TournamentHistory({ tournaments = [], athleteAwards = [] }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // all, completed, active

    const formatTournamentMode = (mode) => {
        switch (mode) {
            case 'regu': return 'Regu (3 vs 3)';
            case 'double': return 'Double (2 vs 2)';
            case 'quadrant': return 'Quadrant (4 vs 4)';
            case 'team_regu': return 'Team Regu (Super Team)';
            case 'team_double': return 'Team Double (Super Team)';
            default: return mode;
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const filteredTournaments = tournaments.filter((t) => {
        const matchSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchSearch) return false;

        if (statusFilter === 'completed') return t.status === 'completed';
        if (statusFilter === 'active') return t.status !== 'completed';
        return true;
    });

    return (
        <AuthenticatedLayout header="Riwayat Turnamen">
            <Head title="Riwayat Turnamen" />

            {/* Header Banner */}
            <div className="mb-6 p-6 rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-surface-900/40 to-transparent">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-surface-100 flex items-center gap-2">
                            <span>📜 Riwayat Turnamen & Hasil Pertandingan</span>
                        </h2>
                        <p className="text-xs text-surface-400 mt-1 max-w-2xl">
                            Daftar seluruh kejuaraan yang pernah dan sedang diikuti oleh tim-tim binaan Anda beserta status penilaian skor pertandingannya.
                        </p>
                    </div>
                    <Link
                        href={route('coach.tournaments.index')}
                        className="px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold transition-all shadow-md shadow-primary-600/20 flex items-center gap-2 shrink-0 cursor-pointer"
                    >
                        <span>🏆 Ikuti Turnamen Baru</span>
                    </Link>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="w-full sm:w-80 relative">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Cari nama turnamen..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-900/70 border border-surface-700/60 text-surface-100 placeholder-surface-500 text-xs focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
                    />
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-500 text-xs">🔍</span>
                </div>

                {/* Status Tabs */}
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-900/60 border border-surface-700/50 w-full sm:w-auto">
                    <button
                        onClick={() => setStatusFilter('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            statusFilter === 'all'
                                ? 'bg-primary-600 text-white shadow-sm'
                                : 'text-surface-400 hover:text-surface-200'
                        }`}
                    >
                        Semua ({tournaments.length})
                    </button>
                    <button
                        onClick={() => setStatusFilter('active')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            statusFilter === 'active'
                                ? 'bg-primary-600 text-white shadow-sm'
                                : 'text-surface-400 hover:text-surface-200'
                        }`}
                    >
                        Sedang Berjalan ({tournaments.filter(t => t.status !== 'completed').length})
                    </button>
                    <button
                        onClick={() => setStatusFilter('completed')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            statusFilter === 'completed'
                                ? 'bg-primary-600 text-white shadow-sm'
                                : 'text-surface-400 hover:text-surface-200'
                        }`}
                    >
                        Selesai ({tournaments.filter(t => t.status === 'completed').length})
                    </button>
                </div>
            </div>

            {/* Tournament List */}
            {filteredTournaments.length === 0 ? (
                <div className="rounded-2xl border border-surface-700/50 bg-surface-900/40 p-12 text-center">
                    <div className="text-4xl mb-3">📜</div>
                    <h3 className="text-base font-bold text-surface-200">Tidak Ada Riwayat Turnamen</h3>
                    <p className="text-xs text-surface-500 mt-1 max-w-sm mx-auto">
                        {searchTerm ? 'Tidak ada turnamen yang cocok dengan pencarian Anda.' : 'Belum ada data keikutsertaan turnamen yang tercatat.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {filteredTournaments.map((tournament) => (
                        <TournamentCard
                            key={tournament.id}
                            tournament={tournament}
                            formatTournamentMode={formatTournamentMode}
                            formatDate={formatDate}
                        />
                    ))}
                </div>
            )}
        </AuthenticatedLayout>
    );
}

function TournamentCard({ tournament, formatTournamentMode, formatDate }) {
    const [teamScoreFilter, setTeamScoreFilter] = useState('all'); // all, scored, unscored
    const [selectedTeamFilter, setSelectedTeamFilter] = useState('all'); // 'all' or teamKey

    const isSchedulePublished = tournament.is_schedule_published || tournament.schedule_status === 'published';
    const matches = tournament.matches || [];

    // Compile all coach teams (regular & super teams)
    const regularTeams = (tournament.teams || []).map(t => ({ ...t, is_super: false }));
    const superTeams = (tournament.super_teams || tournament.superTeams || []).map(st => ({ ...st, is_super: true }));
    
    // Strict de-duplication by unique type and id
    const uniqueTeamsMap = new Map();
    [...regularTeams, ...superTeams].forEach(t => {
        const key = `${t.is_super ? 'super' : 'reg'}-${t.id}`;
        if (!uniqueTeamsMap.has(key)) {
            uniqueTeamsMap.set(key, t);
        }
    });
    const rawTeams = Array.from(uniqueTeamsMap.values());

    // Enrich each team with match assessment data & overall performance
    const evaluatedTeams = rawTeams.map(team => {
        const teamKey = `${team.is_super ? 'super' : 'reg'}-${team.id}`;
        const teamMatches = matches.filter(m =>
            team.is_super
                ? (m.home_super_team_id === team.id || m.away_super_team_id === team.id)
                : (m.home_team_id === team.id || m.away_team_id === team.id)
        );

        const finishedMatches = teamMatches.filter(m => m.status === 'finished');
        const liveMatches = teamMatches.filter(m => m.status === 'live');

        // Only finished matches count as "Sudah Dinilai"
        const isScored = finishedMatches.length > 0;
        const isLive = !isScored && liveMatches.length > 0;

        // Detail hasil per laga
        const detailedResults = finishedMatches.map(m => {
            const isHome = team.is_super ? m.home_super_team_id === team.id : m.home_team_id === team.id;
            const opponentName = isHome
                ? (team.is_super ? (m.away_super_team?.name || 'Lawan') : (m.away_team?.name || 'Lawan'))
                : (team.is_super ? (m.home_super_team?.name || 'Lawan') : (m.home_team?.name || 'Lawan'));

            const sets = m.sets || [];
            let mySetsWon = 0;
            let oppSetsWon = 0;
            const setScores = sets.map(s => {
                const myScore = isHome ? Number(s.home_score) || 0 : Number(s.away_score) || 0;
                const oppScore = isHome ? Number(s.away_score) || 0 : Number(s.home_score) || 0;
                if (myScore > oppScore) mySetsWon++;
                else if (oppScore > myScore) oppSetsWon++;
                return `${myScore}-${oppScore}`;
            });

            const isWinner = team.is_super ? m.winner_super_team_id === team.id : m.winner_team_id === team.id;

            return {
                matchId: m.id,
                stage: m.stage,
                matchMode: m.match_mode,
                opponentName,
                setScores,
                mySetsWon,
                oppSetsWon,
                status: m.status,
                isFinished: true,
                isWinner,
            };
        });

        // ─────────────────────────────────────────────────────────────
        // CALCULATE ALL PERFORMANCE ACROSS ALL MATCHES IN TOURNAMENT
        // ─────────────────────────────────────────────────────────────
        const athleteIds = team.is_super
            ? (team.members || []).flatMap(mem => (mem.athletes || []).map(a => a.id))
            : (team.athletes || []).map(a => a.id);

        const athleteMap = new Map();
        if (team.is_super) {
            (team.members || []).forEach(mem => {
                (mem.athletes || []).forEach(a => {
                    if (!athleteMap.has(a.id)) {
                        athleteMap.set(a.id, { ...a, stats: {} });
                    }
                });
            });
        } else {
            (team.athletes || []).forEach(a => {
                if (!athleteMap.has(a.id)) {
                    athleteMap.set(a.id, { ...a, stats: {} });
                }
            });
        }

        const agg = {
            service_in: 0, service_ace: 0, service_error: 0,
            strike_in: 0, strike_ace: 0, strike_error: 0,
            freeball_in: 0, freeball_ace: 0, freeball_error: 0,
            firstball_in: 0, firstball_ace: 0, firstball_error: 0,
            feeding_in: 0, feeding_ace: 0, feeding_error: 0,
            blocking_in: 0, blocking_ace: 0, blocking_error: 0,
            opponent_mistake: 0,
            strike_success: 0, strike_fail: 0,
            receive_success: 0, receive_fail: 0,
            feeding_success: 0, feeding_fail: 0,
            block_success: 0, block_fail: 0,
        };

        const athletePlayedMatches = new Map();
        const athletePlayedSets = new Map();

        finishedMatches.forEach(m => {
            const isHome = team.is_super ? m.home_super_team_id === team.id : m.home_team_id === team.id;
            const myTeamIds = team.is_super
                ? [m.home_super_team_id, ...(m.home_super_team?.members?.map(mem => mem.id) || [])]
                : [team.id];

            (m.sets || []).forEach(s => {
                const sStats = s.stats || s.setStats || s.set_stats || [];
                sStats.forEach(st => {
                    const isMyStat = (st.athlete_id && athleteIds.includes(st.athlete_id))
                        || (st.team_id && (team.is_super ? myTeamIds.includes(st.team_id) : st.team_id === team.id));

                    if (isMyStat) {
                        Object.keys(agg).forEach(k => {
                            agg[k] += Number(st[k]) || 0;
                        });

                        if (st.athlete_id) {
                            if (!athleteMap.has(st.athlete_id)) {
                                athleteMap.set(st.athlete_id, {
                                    id: st.athlete_id,
                                    name: st.athlete?.name || 'Atlet',
                                    jersey_number: st.athlete?.jersey_number || '-',
                                    position: st.athlete?.position || 'All-Round',
                                    stats: {},
                                });
                            }
                            const athObj = athleteMap.get(st.athlete_id);
                            if (!athObj.stats) athObj.stats = {};
                            Object.keys(agg).forEach(k => {
                                athObj.stats[k] = (athObj.stats[k] || 0) + (Number(st[k]) || 0);
                            });

                            if (!athletePlayedMatches.has(st.athlete_id)) athletePlayedMatches.set(st.athlete_id, new Set());
                            athletePlayedMatches.get(st.athlete_id).add(m.id);

                            if (!athletePlayedSets.has(st.athlete_id)) athletePlayedSets.set(st.athlete_id, new Set());
                            athletePlayedSets.get(st.athlete_id).add(s.id);
                        }
                    }
                });
            });
        });

        const athleteLeaderboard = Array.from(athleteMap.values()).map(ath => {
            const mCount = athletePlayedMatches.has(ath.id) ? athletePlayedMatches.get(ath.id).size : 0;
            const sCount = athletePlayedSets.has(ath.id) ? athletePlayedSets.get(ath.id).size : 0;
            const s = ath.stats || {};
            const sIn = (s.service_in || 0) + (s.strike_in || s.strike_success || 0) + (s.freeball_in || 0) + (s.firstball_in || s.receive_success || 0) + (s.feeding_in || s.feeding_success || 0) + (s.blocking_in || s.block_success || 0);
            const sAce = (s.service_ace || 0) + (s.strike_ace || 0) + (s.freeball_ace || 0) + (s.firstball_ace || 0) + (s.feeding_ace || 0) + (s.blocking_ace || 0);
            const sErr = (s.service_error || 0) + (s.strike_error || s.strike_fail || 0) + (s.freeball_error || 0) + (s.firstball_error || s.receive_fail || 0) + (s.feeding_error || s.feeding_fail || 0) + (s.blocking_error || s.block_fail || 0);
            const success = sIn + sAce;
            const total = success + sErr;
            const pct = total > 0 ? Math.round((success / total) * 100) : 0;

            return {
                ...ath,
                matches_played: mCount,
                sets_played: sCount,
                total_success: success,
                total_attempts: total,
                pct,
                formatted_pct: `${pct}% (${success}/${total})`,
            };
        }).sort((a, b) => b.total_success - a.total_success);

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

        const servPerf = formatActionPerf(agg.service_in, agg.service_ace, agg.service_error);
        const strikePerf = formatActionPerf(agg.strike_in || agg.strike_success, agg.strike_ace, agg.strike_error || agg.strike_fail);
        const freePerf = formatActionPerf(agg.freeball_in, agg.freeball_ace, agg.freeball_error);
        const firstPerf = formatActionPerf(agg.firstball_in || agg.receive_success, agg.firstball_ace, agg.firstball_error || agg.receive_fail);
        const feedPerf = formatActionPerf(agg.feeding_in || agg.feeding_success, agg.feeding_ace, agg.feeding_error || agg.feeding_fail);
        const blockPerf = formatActionPerf(agg.blocking_in || agg.block_success, agg.blocking_ace, agg.blocking_error || agg.block_fail);

        const actionsList = [
            { in: agg.service_in || 0, ace: agg.service_ace || 0, err: agg.service_error || 0 },
            { in: agg.strike_in || agg.strike_success || 0, ace: agg.strike_ace || 0, err: agg.strike_error || agg.strike_fail || 0 },
            { in: agg.freeball_in || 0, ace: agg.freeball_ace || 0, err: agg.freeball_error || 0 },
            { in: agg.firstball_in || agg.receive_success || 0, ace: agg.firstball_ace || 0, err: agg.firstball_error || agg.receive_fail || 0 },
            { in: agg.feeding_in || agg.feeding_success || 0, ace: agg.feeding_ace || 0, err: agg.feeding_error || agg.feeding_fail || 0 },
            { in: agg.blocking_in || agg.block_success || 0, ace: agg.blocking_ace || 0, err: agg.blocking_error || agg.block_fail || 0 },
        ];

        let totalIn = 0, totalAce = 0, totalErr = 0;
        actionsList.forEach(a => {
            totalIn += Number(a.in) || 0;
            totalAce += Number(a.ace) || 0;
            totalErr += Number(a.err) || 0;
        });
        const totalSuccess = totalIn + totalAce;
        const totalAttempts = totalSuccess + totalErr;
        const overallPct = totalAttempts > 0 ? Math.round((totalSuccess / totalAttempts) * 100) : 0;
        const overallPerf = {
            totalIn, totalAce, totalErr, totalSuccess, totalAttempts, pct: overallPct,
            formatted: `${overallPct}% (${totalSuccess}/${totalAttempts})`,
        };

        let winsCount = 0;
        let lossesCount = 0;
        detailedResults.forEach(r => {
            if (r.isWinner) winsCount++;
            else lossesCount++;
        });
        const winRate = finishedMatches.length > 0 ? Math.round((winsCount / finishedMatches.length) * 100) : 0;

        return {
            ...team,
            teamKey,
            teamMatches,
            finishedMatches,
            liveMatches,
            isScored,
            isLive,
            detailedResults,
            agg,
            athleteLeaderboard,
            servPerf,
            strikePerf,
            freePerf,
            firstPerf,
            feedPerf,
            blockPerf,
            overallPerf,
            winsCount,
            lossesCount,
            winRate,
        };
    });

    const scoredCount = evaluatedTeams.filter(t => t.isScored).length;
    const unscoredCount = evaluatedTeams.filter(t => !t.isScored).length;

    const displayedTeams = evaluatedTeams.filter(t => {
        if (selectedTeamFilter !== 'all' && t.teamKey !== selectedTeamFilter) return false;
        if (teamScoreFilter === 'scored') return t.isScored;
        if (teamScoreFilter === 'unscored') return !t.isScored;
        return true;
    });

    const stageLabels = {
        pool: 'Babak Pool',
        round_of_16: 'Babak 16 Besar',
        quarterfinal: 'Perempat Final',
        semifinal: 'Semifinal',
        third_place: 'Juara 3',
        final: 'Final',
    };

    return (
        <div className="rounded-2xl border border-surface-700/60 bg-surface-900/60 backdrop-blur-md p-6 shadow-xl space-y-5">
            {/* Top Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-surface-800">
                <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-lg font-bold text-surface-100">
                            {tournament.name}
                        </h3>
                        <StatusBadge status={tournament.status} size="sm" />
                        {(tournament.modes || []).filter(m => m.is_active).map(m => (
                            <span key={m.match_mode} className="text-xs px-2.5 py-0.5 rounded-lg bg-surface-800 text-surface-300 border border-surface-700 font-medium">
                                {formatTournamentMode(m.match_mode)}
                            </span>
                        ))}
                    </div>
                    <p className="text-xs text-surface-400 mt-1">
                        📅 Periode Pelaksanaan: {formatDate(tournament.start_date)} — {formatDate(tournament.end_date)}
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Button 1: Lihat Bagan */}
                    <Link
                        href={`${route('tournaments.show', tournament.id)}?tab=bracket`}
                        className="px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-bold transition-all border border-purple-500/30 flex items-center gap-1.5 shadow-sm hover:scale-[1.02] cursor-pointer"
                        title="Lihat bagan turnamen dan bracket fase gugur"
                    >
                        <span>👑 Lihat Bagan</span>
                    </Link>

                    {/* Button 2: Lihat Jadwal */}
                    {isSchedulePublished ? (
                        <Link
                            href={route('tournaments.master-schedule.index', tournament.id)}
                            className="px-3.5 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs font-bold transition-all border border-blue-500/30 flex items-center gap-1.5 shadow-sm hover:scale-[1.02] cursor-pointer"
                            title="Lihat Master Schedule resmi turnamen"
                        >
                            <span>🗓️ Lihat Jadwal</span>
                        </Link>
                    ) : (
                        <span
                            className="px-3.5 py-2 rounded-xl bg-surface-800/80 text-surface-500 text-xs font-medium border border-surface-700/60 flex items-center gap-1.5 cursor-not-allowed select-none"
                            title="Jadwal pertandingan resmi belum dipublikasikan oleh panitia pelaksana"
                        >
                            <span>🔒 Jadwal Belum Dipublish</span>
                        </span>
                    )}
                </div>
            </div>

            {/* Summary Score Assessment Bar */}
            <div className="p-3.5 rounded-xl bg-surface-950/60 border border-surface-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-bold text-surface-300 flex items-center gap-1.5">
                        <span>📊 Status Penilaian Tim:</span>
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-surface-850 text-surface-200 border border-surface-700 font-semibold">
                        Total: <strong>{evaluatedTeams.length}</strong> Tim
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1">
                        <span>✓</span> Sudah Dinilai: <strong>{scoredCount}</strong> Tim
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold flex items-center gap-1">
                        <span>⏳</span> Belum Dinilai: <strong>{unscoredCount}</strong> Tim
                    </span>
                </div>

                <div className="flex items-center gap-1 text-[11px]">
                    <span className="text-surface-500 mr-1">Filter Tim:</span>
                    <button
                        onClick={() => setTeamScoreFilter('all')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                            teamScoreFilter === 'all'
                                ? 'bg-primary-600 text-white'
                                : 'bg-surface-800 text-surface-400 hover:text-surface-200'
                        }`}
                    >
                        Semua ({evaluatedTeams.length})
                    </button>
                    <button
                        onClick={() => setTeamScoreFilter('scored')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                            teamScoreFilter === 'scored'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-surface-800 text-surface-400 hover:text-surface-200'
                        }`}
                    >
                        ✓ Sudah Dinilai ({scoredCount})
                    </button>
                    <button
                        onClick={() => setTeamScoreFilter('unscored')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                            teamScoreFilter === 'unscored'
                                ? 'bg-amber-600 text-white'
                                : 'bg-surface-800 text-surface-400 hover:text-surface-200'
                        }`}
                    >
                        ⏳ Belum ({unscoredCount})
                    </button>
                </div>
            </div>

            {/* Teams and Matches Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Column 1: Daftar Tim Binaan & Status Skor (7 Cols) */}
                <div className="lg:col-span-7 p-4 rounded-xl bg-surface-950/40 border border-surface-800 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-surface-300 flex items-center gap-1.5">
                            <span>👥</span> Tim Binaan & Hasil Penilaian Skor ({displayedTeams.length})
                        </h4>
                        
                        <div className="flex items-center gap-2">
                            {selectedTeamFilter !== 'all' && (
                                <button
                                    onClick={() => setSelectedTeamFilter('all')}
                                    className="text-[10px] text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer"
                                >
                                    Tampilkan Semua Tim
                                </button>
                            )}
                            {teamScoreFilter !== 'all' && (
                                <button
                                    onClick={() => setTeamScoreFilter('all')}
                                    className="text-[10px] text-primary-400 hover:text-primary-300 font-semibold lowercase cursor-pointer"
                                >
                                    reset filter
                                </button>
                            )}
                        </div>
                    </div>

                    {/* 1-Team Focus Selector Pills */}
                    {evaluatedTeams.length > 1 && (
                        <div className="p-2 rounded-xl bg-surface-900/50 border border-surface-800/80 flex items-center gap-1.5 overflow-x-auto text-xs pb-2">
                            <span className="text-[10px] font-bold text-surface-400 shrink-0 mr-1 flex items-center gap-1">
                                <span>🎯</span> Fokus Tim:
                            </span>
                            <button
                                onClick={() => setSelectedTeamFilter('all')}
                                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all shrink-0 cursor-pointer ${
                                    selectedTeamFilter === 'all'
                                        ? 'bg-primary-600 text-white shadow-sm'
                                        : 'bg-surface-800/70 text-surface-400 hover:text-surface-200'
                                }`}
                            >
                                Semua Tim ({evaluatedTeams.length})
                            </button>
                            {evaluatedTeams.map(t => (
                                <button
                                    key={t.teamKey}
                                    onClick={() => setSelectedTeamFilter(t.teamKey)}
                                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                                        selectedTeamFilter === t.teamKey
                                            ? 'bg-amber-500 text-surface-950 font-black shadow-sm'
                                            : 'bg-surface-800/70 text-surface-400 hover:text-surface-200'
                                    }`}
                                >
                                    <span>{t.is_super ? '🏆' : '👥'}</span>
                                    <span className="truncate max-w-[120px]">{t.name}</span>
                                    {t.isScored && (
                                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                                            selectedTeamFilter === t.teamKey
                                                ? 'bg-black/30 text-surface-950'
                                                : 'bg-emerald-500/20 text-emerald-300'
                                        }`}>
                                            {t.overallPerf.pct}%
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}

                    {displayedTeams.length === 0 ? (
                        <div className="p-6 text-center text-xs text-surface-500 italic bg-surface-900/30 rounded-xl border border-surface-850">
                            Tidak ada tim binaan pada filter ini.
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
                            {displayedTeams.map((team) => (
                                <TeamAssessmentCard
                                    key={team.teamKey}
                                    team={team}
                                    tournament={tournament}
                                    stageLabels={stageLabels}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Column 2: Ringkasan Riwayat Laga Turnamen (5 Cols) */}
                <div className="lg:col-span-5 p-4 rounded-xl bg-surface-950/40 border border-surface-800 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-surface-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                            <span>⚔️</span> Semua Laga Binaan ({matches.length} Laga)
                        </span>
                        {isSchedulePublished ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/20">
                                Jadwal Terbit
                            </span>
                        ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/20">
                                Draft Jadwal
                            </span>
                        )}
                    </h4>

                    {!isSchedulePublished ? (
                        <div className="p-8 text-center text-xs text-surface-400 bg-surface-900/40 rounded-xl border border-dashed border-surface-800 space-y-2">
                            <div className="text-2xl">🔒</div>
                            <p className="font-bold text-surface-200">Jadwal Belum Dipublikasikan</p>
                            <p className="text-[11px] text-surface-500 max-w-xs mx-auto">
                                Rincian laga dan jadwal resmi turnamen ini belum dipublikasikan oleh panitia pelaksana.
                            </p>
                        </div>
                    ) : matches.length === 0 ? (
                        <p className="text-xs text-surface-500 italic py-6 text-center">Belum ada pertandingan yang dijadwalkan.</p>
                    ) : (
                        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                            {matches.map((m) => {
                                const homeName = m.home_team?.name || m.home_super_team?.name || 'Home';
                                const awayName = m.away_team?.name || m.away_super_team?.name || 'Away';
                                const isFinished = m.status === 'finished';

                                if (isFinished) {
                                    return (
                                        <Link
                                            key={m.id}
                                            href={route('matches.show', m.id)}
                                            className="p-2.5 rounded-lg bg-surface-900/60 hover:bg-surface-900 border border-surface-850 hover:border-primary-500/30 text-xs transition-colors block cursor-pointer"
                                        >
                                            <div className="flex items-center justify-between gap-2 font-medium">
                                                <span className="truncate flex-1 font-bold text-surface-200">{homeName}</span>
                                                <div className="font-mono px-2 py-0.5 rounded bg-black/50 text-primary-300 text-[11px] shrink-0 border border-surface-800">
                                                    {m.sets && m.sets.length > 0 ? (
                                                        m.sets.map((s, i) => `${i > 0 ? ', ' : ''}${s.home_score}-${s.away_score}`)
                                                    ) : (
                                                        <span>Selesai</span>
                                                    )}
                                                </div>
                                                <span className="truncate flex-1 text-right font-bold text-surface-200">{awayName}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-[10px] text-surface-500 mt-1 pt-1 border-t border-surface-850">
                                                <span>{stageLabels[m.stage] || m.stage}</span>
                                                <span className="text-emerald-400 font-semibold">✓ Selesai • Lihat Detail →</span>
                                            </div>
                                        </Link>
                                    );
                                }

                                return (
                                    <div
                                        key={m.id}
                                        className="p-2.5 rounded-lg bg-surface-900/40 border border-surface-850 text-xs select-none"
                                    >
                                        <div className="flex items-center justify-between gap-2 font-medium">
                                            <span className="truncate flex-1 font-semibold text-surface-300">{homeName}</span>
                                            <div className="px-2 py-0.5 rounded bg-surface-950 text-amber-300 text-[11px] shrink-0 border border-surface-800 font-semibold">
                                                {m.status === 'live' ? '⚡ Sedang Berjalan' : 'Terjadwal'}
                                            </div>
                                            <span className="truncate flex-1 text-right font-semibold text-surface-300">{awayName}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[10px] text-surface-500 mt-1 pt-1 border-t border-surface-850">
                                            <span>{stageLabels[m.stage] || m.stage}</span>
                                            <span className="text-amber-400/80">
                                                {m.status === 'live' ? '⚡ Laga sedang berlangsung' : 'Menunggu pertandingan'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function TeamAssessmentCard({ team, tournament, stageLabels }) {
    const [activeTab, setActiveTab] = useState(team.isScored ? 'performance' : 'matches');

    const handleDownloadPdf = () => {
        exportTeamTournamentPdf({
            tournament,
            team,
            teamAggStats: team.agg,
            athleteLeaderboard: team.athleteLeaderboard,
            teamMatches: team.teamMatches,
        });
    };

    return (
        <div
            className={`p-4 rounded-xl border transition-all text-xs space-y-3.5 ${
                team.isScored
                    ? 'bg-surface-900/80 border-emerald-500/30 shadow-md'
                    : 'bg-surface-900/40 border-surface-800'
            }`}
        >
            {/* Header Tim & Top KPI Badges */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-surface-800/80">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-surface-100 text-sm truncate">
                            {team.is_super ? '🏆' : '👥'} {team.name}
                        </span>
                        {team.is_super && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                Super Team
                            </span>
                        )}
                        {team.isScored && (
                            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono flex items-center gap-1">
                                <span>📊 All Performance:</span>
                                <strong className="text-amber-400">{team.overallPerf.formatted}</strong>
                            </span>
                        )}
                    </div>
                    <p className="text-[11px] text-surface-400 mt-1">
                        {team.region || 'Tanpa Wilayah'} • {team.is_super ? `${team.members?.length || 0}/3 Sub-Tim` : `${team.athletes?.length || 0} Atlet`} • {team.finishedMatches.length} Laga Selesai Dinilai
                    </p>
                </div>

                {/* Status Penilaian Badge & PDF Export Button */}
                <div className="flex items-center gap-2 shrink-0">
                    {team.isScored ? (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold text-[11px] flex items-center gap-1 shrink-0 shadow-sm">
                            <span>✓</span> Sudah Dinilai
                        </span>
                    ) : team.isLive ? (
                        <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold text-[11px] flex items-center gap-1 shrink-0">
                            <span>⚡</span> Sedang Berjalan
                        </span>
                    ) : (
                        <span className="px-2.5 py-1 rounded-lg bg-surface-800 text-surface-400 border border-surface-700 font-bold text-[11px] flex items-center gap-1 shrink-0">
                            <span>⏳</span> Belum Dinilai
                        </span>
                    )}

                    {team.isScored && (
                        <button
                            onClick={handleDownloadPdf}
                            className="px-2.5 py-1 rounded-lg bg-primary-600/20 hover:bg-primary-600/30 text-primary-300 border border-primary-500/30 font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
                            title="Unduh Laporan Performa Tim (Semua Laga) dalam format PDF"
                        >
                            <span>📥 Download PDF</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Sub-tabs Navigation inside Card */}
            {team.isScored && (
                <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-950/70 border border-surface-800">
                    <button
                        onClick={() => setActiveTab('performance')}
                        className={`flex-1 py-1.5 px-2.5 rounded-md text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            activeTab === 'performance'
                                ? 'bg-amber-500 text-surface-950 shadow-sm'
                                : 'text-surface-400 hover:text-surface-200'
                        }`}
                    >
                        <span>📊 All Performance (Semua Laga)</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('athletes')}
                        className={`flex-1 py-1.5 px-2.5 rounded-md text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            activeTab === 'athletes'
                                ? 'bg-amber-500 text-surface-950 shadow-sm'
                                : 'text-surface-400 hover:text-surface-200'
                        }`}
                    >
                        <span>👤 Performa Atlet ({team.athleteLeaderboard.length})</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('matches')}
                        className={`flex-1 py-1.5 px-2.5 rounded-md text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            activeTab === 'matches'
                                ? 'bg-amber-500 text-surface-950 shadow-sm'
                                : 'text-surface-400 hover:text-surface-200'
                        }`}
                    >
                        <span>🎯 Rincian Per Laga ({team.detailedResults.length})</span>
                    </button>
                </div>
            )}

            {/* TAB 1: ALL PERFORMANCE (SEMUA LAGA TURNAMEN) */}
            {team.isScored && activeTab === 'performance' && (
                <div className="space-y-3 pt-1">
                    {/* 4 Mini KPI Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                        <div className="p-2 rounded-lg bg-surface-950/60 border border-surface-800">
                            <span className="text-[10px] text-surface-400 block">🏆 Rekor Hasil</span>
                            <span className="text-xs font-black text-emerald-400 font-mono">
                                {team.winsCount}M - {team.lossesCount}K
                            </span>
                            <span className="text-[9px] text-surface-500 block font-mono">
                                Win Rate: {team.winRate}%
                            </span>
                        </div>
                        <div className="p-2 rounded-lg bg-surface-950/60 border border-surface-800">
                            <span className="text-[10px] text-surface-400 block">⚔️ Laga Dinilai</span>
                            <span className="text-xs font-black text-surface-100 font-mono">
                                {team.finishedMatches.length} Laga
                            </span>
                            <span className="text-[9px] text-surface-500 block">Selesai dinilai</span>
                        </div>
                        <div className="p-2 rounded-lg bg-surface-950/60 border border-surface-800">
                            <span className="text-[10px] text-surface-400 block">🎯 Poin Sukses</span>
                            <span className="text-xs font-black text-primary-300 font-mono">
                                {team.overallPerf.totalSuccess} Bola
                            </span>
                            <span className="text-[9px] text-surface-500 block font-mono">
                                dari {team.overallPerf.totalAttempts} bola
                            </span>
                        </div>
                        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
                            <span className="text-[10px] text-amber-300 block font-bold">📊 All Performance</span>
                            <span className="text-sm font-black text-amber-400 font-mono">
                                {team.overallPerf.pct}%
                            </span>
                            <span className={`text-[9px] font-bold block ${team.overallPerf.pct >= 70 ? 'text-emerald-400' : team.overallPerf.pct >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                                {team.overallPerf.pct >= 70 ? '★ Sangat Baik' : team.overallPerf.pct >= 50 ? '● Cukup Baik' : '▼ Perlu Evaluasi'}
                            </span>
                        </div>
                    </div>

                    {/* Table of Parameter Statistik Performa */}
                    <div className="overflow-x-auto rounded-xl border border-surface-800 bg-surface-950/60">
                        <table className="w-full text-left text-[11px]">
                            <thead className="bg-surface-900/90 border-b border-surface-800 text-surface-400 uppercase text-[9px] tracking-wider">
                                <tr>
                                    <th className="py-2 px-3">Parameter Statistik</th>
                                    <th className="py-2 px-2 text-center">Bola In</th>
                                    <th className="py-2 px-2 text-center text-amber-300">Poin (Ace)</th>
                                    <th className="py-2 px-2 text-center text-red-300">Error</th>
                                    <th className="py-2 px-2 text-center font-bold text-surface-200">Sukses</th>
                                    <th className="py-2 px-3 text-right font-bold text-amber-400">Performa</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-850/60 text-surface-300 font-medium">
                                <tr className="hover:bg-surface-800/20">
                                    <td className="py-1.5 px-3 font-semibold text-surface-200">🏐 Servis</td>
                                    <td className="py-1.5 px-2 text-center font-mono text-primary-400">{team.servPerf.inVal}</td>
                                    <td className="py-1.5 px-2 text-center font-mono text-amber-400 font-bold">{team.servPerf.aceVal}</td>
                                    <td className="py-1.5 px-2 text-center font-mono text-red-400">{team.servPerf.errVal}</td>
                                    <td className="py-1.5 px-2 text-center font-mono font-bold text-surface-100">{team.servPerf.success}</td>
                                    <td className="py-1.5 px-3 text-right font-mono font-bold">
                                        <span className={`px-2 py-0.5 rounded text-[10px] ${team.servPerf.total > 0 ? (team.servPerf.pct >= 70 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400') : 'bg-surface-800/40 text-surface-500'}`}>
                                            {team.servPerf.formatted}
                                        </span>
                                    </td>
                                </tr>
                                <tr className="hover:bg-surface-800/20">
                                    <td className="py-1.5 px-3 font-semibold text-surface-200">⚡ Strike / Smash</td>
                                    <td className="py-1.5 px-2 text-center font-mono text-primary-400">{team.strikePerf.inVal}</td>
                                    <td className="py-1.5 px-2 text-center font-mono text-amber-400 font-bold">{team.strikePerf.aceVal}</td>
                                    <td className="py-1.5 px-2 text-center font-mono text-red-400">{team.strikePerf.errVal}</td>
                                    <td className="py-1.5 px-2 text-center font-mono font-bold text-surface-100">{team.strikePerf.success}</td>
                                    <td className="py-1.5 px-3 text-right font-mono font-bold">
                                        <span className={`px-2 py-0.5 rounded text-[10px] ${team.strikePerf.total > 0 ? (team.strikePerf.pct >= 70 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400') : 'bg-surface-800/40 text-surface-500'}`}>
                                            {team.strikePerf.formatted}
                                        </span>
                                    </td>
                                </tr>
                                <tr className="hover:bg-surface-800/20">
                                    <td className="py-1.5 px-3 font-semibold text-surface-200">🔄 Freeball</td>
                                    <td className="py-1.5 px-2 text-center font-mono text-primary-400">{team.freePerf.inVal}</td>
                                    <td className="py-1.5 px-2 text-center font-mono text-amber-400 font-bold">{team.freePerf.aceVal}</td>
                                    <td className="py-1.5 px-2 text-center font-mono text-red-400">{team.freePerf.errVal}</td>
                                    <td className="py-1.5 px-2 text-center font-mono font-bold text-surface-100">{team.freePerf.success}</td>
                                    <td className="py-1.5 px-3 text-right font-mono font-bold">
                                        <span className={`px-2 py-0.5 rounded text-[10px] ${team.freePerf.total > 0 ? (team.freePerf.pct >= 70 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400') : 'bg-surface-800/40 text-surface-500'}`}>
                                            {team.freePerf.formatted}
                                        </span>
                                    </td>
                                </tr>
                                <tr className="hover:bg-surface-800/20">
                                    <td className="py-1.5 px-3 font-semibold text-surface-200">🤲 Firstball / Receive</td>
                                    <td className="py-1.5 px-2 text-center font-mono text-primary-400">{team.firstPerf.inVal}</td>
                                    <td className="py-1.5 px-2 text-center font-mono text-amber-400 font-bold">{team.firstPerf.aceVal}</td>
                                    <td className="py-1.5 px-2 text-center font-mono text-red-400">{team.firstPerf.errVal}</td>
                                    <td className="py-1.5 px-2 text-center font-mono font-bold text-surface-100">{team.firstPerf.success}</td>
                                    <td className="py-1.5 px-3 text-right font-mono font-bold">
                                        <span className={`px-2 py-0.5 rounded text-[10px] ${team.firstPerf.total > 0 ? (team.firstPerf.pct >= 70 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400') : 'bg-surface-800/40 text-surface-500'}`}>
                                            {team.firstPerf.formatted}
                                        </span>
                                    </td>
                                </tr>
                                <tr className="hover:bg-surface-800/20">
                                    <td className="py-1.5 px-3 font-semibold text-surface-200">🎯 Feeding / Umpan</td>
                                    <td className="py-1.5 px-2 text-center font-mono text-primary-400">{team.feedPerf.inVal}</td>
                                    <td className="py-1.5 px-2 text-center font-mono text-amber-400 font-bold">{team.feedPerf.aceVal}</td>
                                    <td className="py-1.5 px-2 text-center font-mono text-red-400">{team.feedPerf.errVal}</td>
                                    <td className="py-1.5 px-2 text-center font-mono font-bold text-surface-100">{team.feedPerf.success}</td>
                                    <td className="py-1.5 px-3 text-right font-mono font-bold">
                                        <span className={`px-2 py-0.5 rounded text-[10px] ${team.feedPerf.total > 0 ? (team.feedPerf.pct >= 70 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400') : 'bg-surface-800/40 text-surface-500'}`}>
                                            {team.feedPerf.formatted}
                                        </span>
                                    </td>
                                </tr>
                                <tr className="hover:bg-surface-800/20">
                                    <td className="py-1.5 px-3 font-semibold text-surface-200">🛡️ Blocking / Blok</td>
                                    <td className="py-1.5 px-2 text-center font-mono text-primary-400">{team.blockPerf.inVal}</td>
                                    <td className="py-1.5 px-2 text-center font-mono text-amber-400 font-bold">{team.blockPerf.aceVal}</td>
                                    <td className="py-1.5 px-2 text-center font-mono text-red-400">{team.blockPerf.errVal}</td>
                                    <td className="py-1.5 px-2 text-center font-mono font-bold text-surface-100">{team.blockPerf.success}</td>
                                    <td className="py-1.5 px-3 text-right font-mono font-bold">
                                        <span className={`px-2 py-0.5 rounded text-[10px] ${team.blockPerf.total > 0 ? (team.blockPerf.pct >= 70 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400') : 'bg-surface-800/40 text-surface-500'}`}>
                                            {team.blockPerf.formatted}
                                        </span>
                                    </td>
                                </tr>

                                {/* BARIS ALL PERFORMANCE (TOTAL AKUMULASI) */}
                                <tr className="bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border-t-2 border-amber-500/30">
                                    <td className="py-2.5 px-3 font-bold text-amber-300 flex items-center gap-1.5">
                                        <span>📊 TOTAL ALL PERFORMANCE</span>
                                    </td>
                                    <td className="py-2.5 px-2 text-center font-mono font-black text-surface-200">{team.overallPerf.totalIn}</td>
                                    <td className="py-2.5 px-2 text-center font-mono font-black text-amber-400">{team.overallPerf.totalAce}</td>
                                    <td className="py-2.5 px-2 text-center font-mono font-black text-red-400">{team.overallPerf.totalErr}</td>
                                    <td className="py-2.5 px-2 text-center font-mono font-black text-white">{team.overallPerf.totalSuccess}</td>
                                    <td className="py-2.5 px-3 text-right font-mono font-black">
                                        <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs shadow-xs">
                                            {team.overallPerf.formatted}
                                        </span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-surface-400">
                            * Data statistik diakumulasi dari seluruh ({team.finishedMatches.length}) laga resmi yang telah dinilai wasit.
                        </span>
                        <button
                            onClick={handleDownloadPdf}
                            className="text-[11px] font-bold text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                            <span>📥 Unduh Laporan PDF</span>
                        </button>
                    </div>
                </div>
            )}

            {/* TAB 2: PERFORMA ATLET (SEMUA LAGA TURNAMEN) */}
            {team.isScored && activeTab === 'athletes' && (
                <div className="space-y-2 pt-1">
                    <p className="text-[10px] text-surface-400">
                        Daftar kontribusi statistik seluruh atlet binaan pada pertandingan yang telah dimainkan:
                    </p>
                    <div className="overflow-x-auto rounded-xl border border-surface-800 bg-surface-950/60 max-h-[260px] overflow-y-auto">
                        <table className="w-full text-left text-[11px]">
                            <thead className="bg-surface-900/90 sticky top-0 border-b border-surface-800 text-surface-400 uppercase text-[9px] tracking-wider">
                                <tr>
                                    <th className="py-2 px-2.5 text-center">#</th>
                                    <th className="py-2 px-3">Nama Atlet</th>
                                    <th className="py-2 px-2 text-center">Posisi</th>
                                    <th className="py-2 px-2 text-center">Laga/Set</th>
                                    <th className="py-2 px-2 text-center text-surface-200">Sukses</th>
                                    <th className="py-2 px-3 text-right text-amber-400">Performa</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-850/60 text-surface-300 font-medium">
                                {team.athleteLeaderboard.map((ath, aIdx) => (
                                    <tr key={ath.id || aIdx} className="hover:bg-surface-800/20">
                                        <td className="py-1.5 px-2.5 text-center font-mono text-surface-400 font-bold">
                                            #{ath.jersey_number || '-'}
                                        </td>
                                        <td className="py-1.5 px-3 font-semibold text-surface-100">
                                            {ath.name}
                                        </td>
                                        <td className="py-1.5 px-2 text-center text-surface-400 text-[10px]">
                                            {ath.position || 'All-Round'}
                                        </td>
                                        <td className="py-1.5 px-2 text-center font-mono text-surface-300 text-[10px]">
                                            {ath.matches_played}L / {ath.sets_played}S
                                        </td>
                                        <td className="py-1.5 px-2 text-center font-mono font-bold text-surface-100">
                                            {ath.total_success}
                                        </td>
                                        <td className="py-1.5 px-3 text-right font-mono font-bold">
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${ath.total_attempts > 0 ? (ath.pct >= 70 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400') : 'bg-surface-800/40 text-surface-500'}`}>
                                                {ath.formatted_pct}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 3: RINCIAN PER LAGA (OR DEFAULT VIEW IF NOT SCORED) */}
            {(!team.isScored || activeTab === 'matches') && (
                <div className="space-y-1.5 pt-1">
                    {team.isScored ? (
                        <div className="space-y-1.5">
                            <p className="text-[10px] uppercase font-bold tracking-wider text-surface-400 flex items-center justify-between">
                                <span>🎯 Rincian Laga yang Telah Selesai ({team.detailedResults.length} Laga):</span>
                            </p>
                            <div className="space-y-1.5">
                                {team.detailedResults.map((res, rIdx) => (
                                    <div
                                        key={rIdx}
                                        className="p-2 rounded-lg bg-surface-950/70 border border-surface-800 flex items-center justify-between gap-2 flex-wrap"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface-800 text-surface-300 font-semibold">
                                                    {stageLabels[res.stage] || res.stage}
                                                </span>
                                                <span className="text-surface-200 font-medium truncate">
                                                    vs <strong className="text-surface-100">{res.opponentName}</strong>
                                                </span>
                                            </div>
                                            {res.setScores && res.setScores.length > 0 && (
                                                <p className="text-[11px] text-surface-400 mt-1 font-mono">
                                                    Skor: <span className="text-primary-300 font-bold">{res.setScores.join(', ')}</span>
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            {res.isWinner ? (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                    🏆 Menang ({res.mySetsWon}-{res.oppSetsWon})
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                                                    Kalah ({res.mySetsWon}-{res.oppSetsWon})
                                                </span>
                                            )}
                                            <Link
                                                href={route('matches.show', res.matchId)}
                                                className="text-[11px] font-bold text-primary-400 hover:text-primary-300 underline cursor-pointer"
                                            >
                                                Detail
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : team.isLive ? (
                        <div className="p-2.5 rounded-lg bg-surface-950/40 border border-amber-500/20 text-[11px] text-amber-300/90 flex items-center gap-2">
                            <span>⚡</span>
                            <span>Pertandingan sedang berjalan. Skor dan hasil detail akan ditampilkan setelah pertandingan selesai dinilai wasit.</span>
                        </div>
                    ) : (
                        <div className="p-2.5 rounded-lg bg-surface-950/40 border border-surface-800/80 text-[11px] text-surface-400 flex items-center gap-2">
                            <span>ℹ️</span>
                            <span>
                                Tim ini belum memiliki catatan nilai skor dari wasit. Menunggu pertandingan dimainkan dan dinilai oleh wasit pertandingan.
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
