import { Head, usePage, router } from '@inertiajs/react';
import { useState, useCallback, useEffect, useRef } from 'react';

const STAT_GROUPS = [
    {
        label: 'Serve',
        icon: '🏐',
        stats: [
            { key: 'service_ace', label: 'Ace', type: 'ace' },
            { key: 'service_in', label: 'In', type: 'in' },
            { key: 'service_error', label: 'Err', type: 'err' },
        ],
    },
    {
        label: 'Strike',
        icon: '⚡',
        stats: [
            { key: 'strike_ace', label: 'Ace', type: 'ace' },
            { key: 'strike_in', label: 'In', type: 'in' },
            { key: 'strike_error', label: 'Err', type: 'err' },
        ],
    },
    {
        label: 'Freeball',
        icon: '🔄',
        stats: [
            { key: 'freeball_ace', label: 'Ace', type: 'ace' },
            { key: 'freeball_in', label: 'In', type: 'in' },
            { key: 'freeball_error', label: 'Err', type: 'err' },
        ],
    },
    {
        label: 'Firstball',
        icon: '🤲',
        stats: [
            { key: 'firstball_ace', label: 'Ace', type: 'ace' },
            { key: 'firstball_in', label: 'In', type: 'in' },
            { key: 'firstball_error', label: 'Err', type: 'err' },
        ],
    },
    {
        label: 'Feeding',
        icon: '🎯',
        stats: [
            { key: 'feeding_ace', label: 'Ace', type: 'ace' },
            { key: 'feeding_in', label: 'In', type: 'in' },
            { key: 'feeding_error', label: 'Err', type: 'err' },
        ],
    },
    {
        label: 'Blocking',
        icon: '🛡️',
        stats: [
            { key: 'blocking_ace', label: 'Ace', type: 'ace' },
            { key: 'blocking_in', label: 'In', type: 'in' },
            { key: 'blocking_error', label: 'Err', type: 'err' },
        ],
    },
];

const ZONE_CONFIG = [
    // Right side zones (Zona 1-7)
    { key: 'zone_1', label: '1', position: 'top-right-corner', color: 'from-blue-500/30 to-blue-600/20 border-blue-500/40 text-blue-300' },
    { key: 'zone_2', label: '2', position: 'right-1', color: 'from-blue-400/25 to-cyan-500/20 border-blue-400/35 text-blue-200' },
    { key: 'zone_3', label: '3', position: 'right-2', color: 'from-cyan-400/25 to-teal-500/20 border-cyan-400/35 text-cyan-200' },
    { key: 'zone_4', label: '4', position: 'right-3', color: 'from-emerald-400/25 to-green-500/20 border-emerald-400/35 text-emerald-200' },
    { key: 'zone_5', label: '5', position: 'right-4', color: 'from-yellow-400/25 to-amber-500/20 border-yellow-400/35 text-yellow-200' },
    { key: 'zone_6', label: '6', position: 'right-5', color: 'from-orange-400/25 to-amber-500/20 border-orange-400/35 text-orange-200' },
    { key: 'zone_7', label: '7', position: 'bottom-right-corner', color: 'from-orange-500/30 to-red-500/20 border-orange-500/40 text-orange-300' },
    // Left/Center zones (Zona 8-10)
    { key: 'zone_8', label: '8', position: 'bottom-center', color: 'from-purple-400/25 to-violet-500/20 border-purple-400/35 text-purple-200' },
    { key: 'zone_9', label: '9', position: 'center', color: 'from-pink-400/25 to-rose-500/20 border-pink-400/35 text-pink-200' },
    { key: 'zone_10', label: '10', position: 'top-center', color: 'from-indigo-400/25 to-blue-500/20 border-indigo-400/35 text-indigo-200' },
];

export default function LiveScoring({ match: initialMatch }) {
    const [matchData, setMatchData] = useState(initialMatch);
    const [selectedAthlete, setSelectedAthlete] = useState({ home: null, away: null });
    const [scoreAnim, setScoreAnim] = useState({ home: false, away: false });
    const [showSetup, setShowSetup] = useState(matchData.status === 'scheduled');
    const [setupData, setSetupData] = useState({ court_number: matchData.court_number || 1, max_sets: matchData.max_sets || 3 });
    const [processing, setProcessing] = useState(false);
    const [statsCache, setStatsCache] = useState({});
    const [activeSubRegu, setActiveSubRegu] = useState(0); // 0 = Regu 1, 1 = Regu 2, 2 = Regu 3

    // Modal popup for picking court zone upon clicking Service In or Service Ace
    const [zoneModal, setZoneModal] = useState(null);
    // Structure: { athlete, team, statKey: 'service_in' | 'service_ace', statLabel: string }

    const isTeamMode = matchData.match_mode === 'team_regu' || matchData.match_mode === 'team_double';

    const currentHomeTeam = isTeamMode
        ? matchData.home_super_team?.members?.[activeSubRegu] || matchData.home_team
        : matchData.home_team;

    const currentAwayTeam = isTeamMode
        ? matchData.away_super_team?.members?.[activeSubRegu] || matchData.away_team
        : matchData.away_team;

    const activeSetOffset = isTeamMode ? activeSubRegu * 3 : 0;
    const activeSets = isTeamMode
        ? matchData.sets?.filter(s => s.set_number >= activeSetOffset + 1 && s.set_number <= activeSetOffset + 3)
        : matchData.sets;

    const currentSet = activeSets?.find(s => s.status === 'live') || activeSets?.[0];
    const isLive = matchData.status === 'live';
    const isSetup = matchData.status === 'setup';

    // Get stats for an athlete in current set
    const getAthleteStats = useCallback((athleteId) => {
        if (!currentSet) return {};
        const cacheKey = `${currentSet.id}-${athleteId}`;
        if (statsCache[cacheKey]) return statsCache[cacheKey];

        const stat = currentSet.stats?.find(s => s.athlete_id === athleteId);
        return stat || {};
    }, [currentSet, statsCache]);

    const getCsrfToken = () => {
        const metaTag = document.querySelector('meta[name="csrf-token"]');
        if (metaTag && metaTag.content) return metaTag.content;
        return '';
    };

    const fetchPost = async (url, body = {}) => {
        const token = getCsrfToken();
        const payload = {
            ...body,
            _token: token,
        };

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-CSRF-TOKEN': token,
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error('Fetch post error:', res.status, errText);
            throw new Error(`HTTP Error ${res.status}: ${errText}`);
        }

        return res.json();
    };

    useEffect(() => {
        setMatchData(initialMatch);
        if (initialMatch.status === 'scheduled') {
            setShowSetup(true);
        } else {
            setShowSetup(false);
        }
    }, [initialMatch]);

    const handleSetup = (e) => {
        if (e) e.preventDefault();
        setProcessing(true);
        router.post(route('scoring.setup', matchData.id), setupData, {
            preserveState: false,
            onSuccess: () => {
                setProcessing(false);
                setShowSetup(false);
            },
            onError: () => setProcessing(false)
        });
    };

    const handleStart = () => {
        setProcessing(true);
        router.post(route('scoring.start', matchData.id), {}, {
            preserveState: false,
            onSuccess: () => setProcessing(false),
            onError: () => setProcessing(false)
        });
    };

    const handleSetupAndStart = (e) => {
        if (e) e.preventDefault();
        setProcessing(true);
        router.post(route('scoring.setup', matchData.id), setupData, {
            preserveState: false,
            onSuccess: () => {
                router.post(route('scoring.start', matchData.id), {}, {
                    preserveState: false,
                    onSuccess: () => setProcessing(false),
                    onError: () => setProcessing(false)
                });
            },
            onError: () => setProcessing(false)
        });
    };

    const handleScore = async (side, action) => {
        if (!currentSet) return;
        try {
            const res = await fetchPost(route('scoring.update-score', matchData.id), {
                match_set_id: currentSet.id,
                side,
                action,
            });
            if (res.set) {
                setMatchData(prev => ({
                    ...prev,
                    sets: prev.sets.map(s => s.id === res.set.id ? { ...s, ...res.set } : s),
                }));
            }
            setScoreAnim(prev => ({ ...prev, [side]: true }));
            setTimeout(() => setScoreAnim(prev => ({ ...prev, [side]: false })), 300);
        } catch (err) {
            console.error('Score update error:', err);
        }
    };

    const handleStat = async (athleteId, teamId, stat, action, zone = null) => {
        if (!currentSet) return;
        try {
            const res = await fetchPost(route('scoring.update-stat', matchData.id), {
                match_set_id: currentSet.id,
                athlete_id: athleteId,
                team_id: teamId,
                stat,
            action,
                zone,
            });
            if (res.stat) {
                setStatsCache(prev => ({
                    ...prev,
                    [`${currentSet.id}-${athleteId}`]: res.stat,
                    [`${currentSet.id}-${res.stat.athlete_id}`]: res.stat,
                }));
                setMatchData(prev => ({
                    ...prev,
                    sets: prev.sets.map(s => {
                        if (s.id !== currentSet.id) return s;
                        const existingStats = s.stats || [];
                        const idx = existingStats.findIndex(st => st.athlete_id === athleteId || st.athlete_id === res.stat.athlete_id);
                        const updatedStats = idx >= 0
                            ? existingStats.map((st, i) => i === idx ? res.stat : st)
                            : [...existingStats, res.stat];
                        
                        return res.set ? { ...res.set, stats: updatedStats } : { ...s, stats: updatedStats };
                    }),
                }));
            }
        } catch (err) {
            console.error('Stat update error:', err);
        }
    };

    // Handle Action trigger: If stat ends with _in or _ace, opens Court Zone Modal with exact action (+ or -)
    const handleActionWithZone = (athlete, team, statKey, action = 'increment', statLabel = '') => {
        const targetAthlete = athlete || team?.athletes?.[0] || { id: 1, name: 'Pemain', jersey_number: 1 };
        const targetTeam = team || currentHomeTeam;

        const isZoneTrigger = statKey.endsWith('_in') || statKey.endsWith('_ace');

        if (isZoneTrigger) {
            setZoneModal({
                athlete: targetAthlete,
                team: targetTeam,
                statKey,
                action, // 'increment' (+) or 'decrement' (-) from outside
                statLabel: statLabel || (statKey.endsWith('_ace') ? 'Ace' : 'In'),
            });
        } else {
            handleStat(targetAthlete.id, targetTeam?.id, statKey, action);
        }
    };
    // Callback when a zone is selected / modified in Court Modal (1-click single action: auto-saves and auto-closes)
    const handleZoneSelect = (zoneKey, action = 'increment') => {
        if (!zoneModal) return;
        const targetAthleteId = zoneModal.athlete?.id || currentHomeTeam?.athletes?.[0]?.id;
        const targetTeamId = zoneModal.team?.id || currentHomeTeam?.id;

        if (!targetAthleteId) {
            console.error('No athlete found for zone update');
            return;
        }

        handleStat(targetAthleteId, targetTeamId, zoneModal.statKey, action, zoneKey);
        setZoneModal(null); // 1-click single action: auto-close popup immediately!
    };

    const handleFinishSet = async () => {
        if (!currentSet || !confirm('Yakin ingin mengakhiri set ini?')) return;
        setProcessing(true);
        try {
            const res = await fetchPost(route('scoring.finish-set', matchData.id), {
                match_set_id: currentSet.id,
            });
            if (res.matchFinished) {
                const winnerName = res.winner === matchData.home_team_id 
                    ? (matchData.home_team?.name || 'Tuan Rumah') 
                    : (matchData.away_team?.name || 'Tamu');
                alert(`🎉 Pertandingan telah selesai!\nPemenang: ${winnerName}\n\nMengalihkan ke halaman hasil pertandingan...`);
                window.location.href = res.redirect_url || route('matches.show', matchData.id);
                return;
            }
            window.location.reload();
        } catch (err) {
            console.error('Finish set error:', err);
            setProcessing(false);
        }
    };

    // Tampilan Khusus Jika Pertandingan Sudah Selesai (Finished Match Result Screen)
    if (matchData.status === 'finished') {
        const homeSetsWon = matchData.sets?.filter(s => s.winner_team_id === matchData.home_team_id).length || 0;
        const awaySetsWon = matchData.sets?.filter(s => s.winner_team_id === matchData.away_team_id).length || 0;
        const winnerTeam = matchData.winner_team_id === matchData.home_team_id 
            ? matchData.home_team 
            : (matchData.winner_team_id === matchData.away_team_id ? matchData.away_team : (homeSetsWon > awaySetsWon ? matchData.home_team : matchData.away_team));

        return (
            <div className="min-h-screen bg-surface-950 flex flex-col justify-center items-center p-4 sm:p-6">
                <Head title={`Hasil Selesai: ${matchData.home_team?.name} vs ${matchData.away_team?.name}`} />
                <div className="max-w-lg w-full space-y-6 text-center animate-fade-in">
                    <div className="rounded-3xl border-2 border-emerald-500/40 bg-surface-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
                        <div className="w-20 h-20 rounded-3xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-4xl mx-auto mb-4 shadow-lg shadow-amber-950/40 animate-bounce">
                            🏆
                        </div>
                        <span className="inline-block px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-2">
                            Pertandingan Selesai
                        </span>
                        <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                            Pemenang: <span className="text-emerald-400">{winnerTeam?.name || '—'}</span>
                        </h2>

                        {/* Final Score Board */}
                        <div className="flex items-center justify-center gap-6 my-6 p-4 rounded-2xl bg-surface-950/60 border border-surface-800">
                            <div className="text-center flex-1">
                                <p className="text-xs sm:text-sm font-bold text-primary-300 truncate">{matchData.home_team?.name}</p>
                                <p className="text-3xl sm:text-4xl font-black text-white mt-1 font-mono">{homeSetsWon}</p>
                            </div>
                            <span className="text-lg font-black text-surface-500">VS</span>
                            <div className="text-center flex-1">
                                <p className="text-xs sm:text-sm font-bold text-accent-300 truncate">{matchData.away_team?.name}</p>
                                <p className="text-3xl sm:text-4xl font-black text-white mt-1 font-mono">{awaySetsWon}</p>
                            </div>
                        </div>

                        {/* Set breakdown */}
                        <div className="flex flex-wrap justify-center gap-2 mb-6">
                            {matchData.sets?.filter(s => s.status === 'finished').map(s => (
                                <div key={s.id} className="text-xs px-3 py-1.5 rounded-xl bg-surface-800 border border-surface-700 text-surface-200 font-bold">
                                    Set {s.set_number}: <strong className="text-emerald-300 font-mono">{s.home_score} - {s.away_score}</strong>
                                </div>
                            ))}
                        </div>

                        {/* Navigation Actions */}
                        <div className="space-y-3 pt-2">
                            <a
                                href={route('matches.show', matchData.id)}
                                className="block w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm sm:text-base shadow-xl shadow-emerald-950/40 active:scale-95 transition-all"
                            >
                                📄 Lihat Hasil & Statistik Lengkap Pertandingan
                            </a>
                            <a
                                href={route('dashboard')}
                                className="block w-full py-2.5 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-300 hover:text-white font-bold text-xs sm:text-sm transition-all"
                            >
                                ← Kembali ke Dashboard Wasit
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (showSetup || !isLive) {
        return (
            <div className="min-h-screen bg-surface-950 flex flex-col">
                <Head title="Setup Pertandingan" />
                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="max-w-lg w-full">
                        <div className="rounded-2xl border border-surface-700/50 bg-surface-900/50 p-8 text-center mb-6">
                            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-surface-800 text-surface-300 border border-surface-700 mb-4">
                                {matchData.stage} — Lapangan {matchData.court_number || '-'}
                            </span>
                            <div className="flex items-center justify-center gap-6 my-4">
                                <div className="text-center flex-1">
                                    <div className="w-16 h-16 rounded-2xl bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-xl font-bold text-primary-300 mx-auto mb-2">
                                        {currentHomeTeam?.name?.charAt(0) || 'H'}
                                    </div>
                                    <h3 className="font-bold text-surface-100 text-base">{currentHomeTeam?.name}</h3>
                                </div>
                                <span className="text-2xl font-bold text-surface-600">VS</span>
                                <div className="text-center flex-1">
                                    <div className="w-16 h-16 rounded-2xl bg-accent-500/20 border border-accent-500/30 flex items-center justify-center text-xl font-bold text-accent-300 mx-auto mb-2">
                                        {currentAwayTeam?.name?.charAt(0) || 'A'}
                                    </div>
                                    <h3 className="font-bold text-surface-100 text-base">{currentAwayTeam?.name}</h3>
                                </div>
                            </div>
                        </div>

                        {showSetup ? (
                            <form onSubmit={handleSetupAndStart} className="rounded-2xl border border-surface-700/50 bg-surface-900/50 p-6 space-y-4 shadow-xl">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-surface-100 text-sm">⚙️ Pengaturan Pertandingan</h3>
                                    {isSetup && (
                                        <button
                                            type="button"
                                            onClick={() => setShowSetup(false)}
                                            className="text-xs text-surface-400 hover:text-surface-200"
                                        >
                                            ✕ Tutup
                                        </button>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-surface-400 mb-1">Nomor Lapangan</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={setupData.court_number}
                                        onChange={(e) => setSetupData(prev => ({ ...prev, court_number: parseInt(e.target.value) || 1 }))}
                                        className="w-full rounded-xl bg-surface-800 border-surface-700 text-surface-100 text-sm focus:border-primary-500 focus:ring-primary-500"
                                    />
                                </div>
                                {!isTeamMode && (
                                    <div>
                                        <label className="block text-xs font-medium text-surface-400 mb-1">Maksimal Set</label>
                                        <select
                                            value={setupData.max_sets}
                                            onChange={(e) => setSetupData(prev => ({ ...prev, max_sets: parseInt(e.target.value) }))}
                                            className="w-full rounded-xl bg-surface-800 border-surface-700 text-surface-100 text-sm focus:border-primary-500 focus:ring-primary-500"
                                        >
                                            <option value={3}>3 Set (Best of 3)</option>
                                            <option value={5}>5 Set (Best of 5)</option>
                                        </select>
                                    </div>
                                )}
                                <div className="flex flex-col gap-2 pt-2">
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-sm hover:from-emerald-500 hover:to-teal-500 active:scale-95 transition-all shadow-lg shadow-emerald-950/40 disabled:opacity-50 cursor-pointer"
                                    >
                                        {processing ? 'Memproses...' : '▶ Simpan & Langsung Mulai Pertandingan'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSetup}
                                        disabled={processing}
                                        className="w-full py-2.5 rounded-xl bg-surface-800 text-surface-200 font-bold text-xs hover:bg-surface-700 active:scale-95 transition-all cursor-pointer"
                                    >
                                        💾 Simpan Pengaturan Saja
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleStart}
                                    disabled={processing}
                                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-base hover:from-emerald-500 hover:to-teal-500 active:scale-95 transition-all shadow-xl shadow-emerald-950/50 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <span>▶ MULAI PERTANDINGAN SEKARANG</span>
                                </button>
                                <button
                                    onClick={() => setShowSetup(true)}
                                    className="w-full py-2.5 rounded-xl bg-surface-800 text-surface-300 font-bold text-xs hover:bg-surface-700 active:scale-95 transition-all cursor-pointer"
                                >
                                    ⚙️ Ubah Nomor Lapangan & Set
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-surface-950 flex flex-col overflow-hidden select-none">
            <Head title={`Live Scoring - ${currentHomeTeam?.name} vs ${currentAwayTeam?.name}`} />

            {/* Top Scoreboard Bar */}
            <div className="flex-shrink-0 bg-surface-900 border-b border-surface-700/50 px-3 py-2">
                <div className="flex items-center justify-between gap-2 max-w-5xl mx-auto">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <span className="text-sm md:text-base font-extrabold text-primary-300 truncate max-w-[140px] text-right">{currentHomeTeam?.name}</span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => handleScore('home', 'decrement')}
                                className="w-9 h-9 md:w-11 md:h-11 rounded-xl bg-surface-800 hover:bg-surface-700 active:scale-90 text-surface-300 text-base font-black transition-all flex items-center justify-center cursor-pointer border border-surface-700"
                            >
                                −
                            </button>
                            <button
                                onClick={() => handleScore('home', 'increment')}
                                className="w-9 h-9 md:w-11 md:h-11 rounded-xl bg-primary-600 hover:bg-primary-500 active:scale-90 text-white text-base font-black transition-all flex items-center justify-center cursor-pointer shadow-md shadow-primary-950/40"
                            >
                                +
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col items-center px-2 flex-shrink-0">
                        <span className="text-[10px] uppercase font-bold text-surface-400">Set {currentSet?.set_number || 1}</span>
                        <div className="flex items-center gap-2 text-2xl md:text-4xl font-black font-mono">
                            <span className="text-primary-400">{currentSet?.home_score ?? 0}</span>
                            <span className="text-surface-600">:</span>
                            <span className="text-accent-400">{currentSet?.away_score ?? 0}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => handleScore('away', 'decrement')}
                                className="w-9 h-9 md:w-11 md:h-11 rounded-xl bg-surface-800 hover:bg-surface-700 active:scale-90 text-surface-300 text-base font-black transition-all flex items-center justify-center cursor-pointer border border-surface-700"
                            >
                                −
                            </button>
                            <button
                                onClick={() => handleScore('away', 'increment')}
                                className="w-9 h-9 md:w-11 md:h-11 rounded-xl bg-accent-600 hover:bg-accent-500 active:scale-90 text-white text-base font-black transition-all flex items-center justify-center cursor-pointer shadow-md shadow-accent-950/40"
                            >
                                +
                            </button>
                        </div>
                        <span className="text-sm md:text-base font-extrabold text-accent-300 truncate max-w-[140px] text-left">{currentAwayTeam?.name}</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
                <TeamSide
                    team={currentHomeTeam}
                    athletes={currentHomeTeam?.athletes || []}
                    selectedAthlete={selectedAthlete.home}
                    onSelectAthlete={(a) => setSelectedAthlete(prev => ({ ...prev, home: a }))}
                    onStatChange={(athleteId, stat, action, zone) => handleStat(athleteId, currentHomeTeam?.id, stat, action, zone)}
                    onActionWithZone={(athlete, statKey, action, statLabel) => handleActionWithZone(athlete, currentHomeTeam, statKey, action, statLabel)}
                    getStats={getAthleteStats}
                    side="home"
                    color="primary"
                />

                <div className="hidden lg:block w-px bg-surface-700/50 flex-shrink-0" />
                <div className="lg:hidden h-px bg-surface-700/50 flex-shrink-0" />

                <TeamSide
                    team={currentAwayTeam}
                    athletes={currentAwayTeam?.athletes || []}
                    selectedAthlete={selectedAthlete.away}
                    onSelectAthlete={(a) => setSelectedAthlete(prev => ({ ...prev, away: a }))}
                    onStatChange={(athleteId, stat, action, zone) => handleStat(athleteId, currentAwayTeam?.id, stat, action, zone)}
                    onActionWithZone={(athlete, statKey, action, statLabel) => handleActionWithZone(athlete, currentAwayTeam, statKey, action, statLabel)}
                    getStats={getAthleteStats}
                    side="away"
                    color="accent"
                />
            </div>

            {/* Bottom Bar: Set Management & Finish Set */}
            <div className="flex-shrink-0 bg-surface-900 border-t border-surface-700/50 px-3 py-2">
                <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        {matchData.sets?.map((s) => (
                            <span
                                key={s.id}
                                className={`text-xs px-2.5 py-1 rounded-lg font-bold font-mono ${
                                    s.id === currentSet?.id
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                        : s.status === 'finished'
                                        ? 'bg-surface-800 text-surface-400'
                                        : 'bg-surface-800/40 text-surface-500'
                                }`}
                            >
                                Set {s.set_number}: {s.home_score}-{s.away_score}
                            </span>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleFinishSet}
                            disabled={processing}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-950/40 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                        >
                            {processing ? 'Memproses...' : '🏁 Akhiri Set Ini'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal Pop-up Lapangan 10 Zona untuk Aksi In / Ace */}
            {zoneModal && (
                <CourtZoneModal
                    modalData={zoneModal}
                    athleteStats={getAthleteStats(zoneModal.athlete?.id)}
                    onSelectZone={handleZoneSelect}
                    onClose={() => setZoneModal(null)}
                />
            )}
        </div>
    );
}

function TeamSide({ team, athletes = [], selectedAthlete, onSelectAthlete, onStatChange, onActionWithZone, getStats, side, color }) {
    const colorClasses = {
        primary: {
            bg: 'bg-primary-500/10',
            border: 'border-primary-500/30',
            text: 'text-primary-300',
            badge: 'bg-primary-500/20 border-primary-500/30 text-primary-300 hover:bg-primary-500/30',
            activeBadge: 'bg-primary-600 text-white border-primary-400 shadow-md ring-2 ring-primary-400/40',
        },
        accent: {
            bg: 'bg-accent-500/10',
            border: 'border-accent-500/30',
            text: 'text-accent-300',
            badge: 'bg-accent-500/20 border-accent-500/30 text-accent-300 hover:bg-accent-500/30',
            activeBadge: 'bg-accent-600 text-white border-accent-400 shadow-md ring-2 ring-accent-400/40',
        },
    };

    const c = colorClasses[color];
    const stats = selectedAthlete ? getStats(selectedAthlete.id) : {};

    const effectiveAthletes = (athletes && athletes.length > 0)
        ? athletes
        : [
            { id: `temp-${team?.id || 1}-1`, name: 'Tekong', jersey_number: 1 },
            { id: `temp-${team?.id || 1}-2`, name: 'Feeder', jersey_number: 2 },
            { id: `temp-${team?.id || 1}-3`, name: 'Killer', jersey_number: 3 },
        ];

    useEffect(() => {
        if (!selectedAthlete && effectiveAthletes && effectiveAthletes.length > 0) {
            onSelectAthlete(effectiveAthletes[0]);
        }
    }, [effectiveAthletes, selectedAthlete]);

    return (
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
            <div className={`px-3 py-2 ${c.bg} border-b ${c.border} flex-shrink-0`}>
                <h3 className={`text-xs md:text-sm font-bold ${c.text} text-center mb-1.5`}>{team?.name || 'Tim'}</h3>
                <div className="flex flex-wrap justify-center gap-1.5">
                    {effectiveAthletes.map((a, idx) => {
                        const jerseyNo = a.jersey_number || (idx + 1);
                        const isSelected = selectedAthlete?.id === a.id;
                        return (
                            <button
                                key={a.id || idx}
                                onClick={() => onSelectAthlete(a)}
                                className={`
                                    px-3 py-1.5 rounded-xl border text-xs md:text-sm font-bold transition-all duration-200 active:scale-95 flex items-center gap-1.5 cursor-pointer select-none
                                    ${isSelected ? c.activeBadge : c.badge}
                                `}
                            >
                                <span className="font-mono">#{jerseyNo}</span>
                                <span>{a.name}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {selectedAthlete ? (
                <div className="flex-1 flex flex-col min-h-0 overflow-y-auto px-3 py-2.5 space-y-2">
                    <div className="text-center flex-shrink-0">
                        <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-surface-800 border border-surface-700/60 text-xs md:text-sm font-bold text-surface-200 shadow-sm">
                            <span>👕 No. Punggung <strong className="font-mono text-primary-300">#{selectedAthlete.jersey_number || '—'}</strong></span>
                            <span>•</span>
                            <span className="text-surface-100">{selectedAthlete.name}</span>
                        </span>
                    </div>

                    {/* Opponent Mistake Special Action (+1 Auto Point) */}
                    <div className="flex-shrink-0">
                        <button
                            type="button"
                            onClick={() => onStatChange(selectedAthlete.id, 'opponent_mistake', 'increment')}
                            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-600/30 via-orange-600/30 to-amber-600/30 hover:from-amber-600/40 hover:to-orange-600/40 border border-amber-500/50 text-amber-300 font-black text-xs md:text-sm flex items-center justify-between active:scale-[0.98] transition-all shadow-md cursor-pointer select-none"
                        >
                            <span className="flex items-center gap-1.5">
                                <span>⚠️</span>
                                <span>Opponent Mistake</span>
                            </span>
                            <span className="bg-amber-500 text-black px-2.5 py-0.5 rounded-lg font-black text-xs">
                                +1 POIN
                            </span>
                        </button>
                    </div>

                    <div className="rounded-2xl bg-surface-900/60 border border-surface-700/50 p-2 sm:p-3 space-y-2 shadow-inner">
                        {STAT_GROUPS.map((group) => (
                            <TabletStatRow
                                key={group.label}
                                group={group}
                                stats={stats}
                                onStatChange={(stat, action) => onStatChange(selectedAthlete.id, stat, action)}
                                onActionWithZone={(statKey, action, statLabel) => onActionWithZone(selectedAthlete, statKey, action, statLabel)}
                            />
                        ))}
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center p-6">
                    <p className="text-sm font-semibold text-surface-400">Pilih pemain untuk mencatat statistik.</p>
                </div>
            )}
        </div>
    );
}

function TabletStatRow({ group, stats, onStatChange, onActionWithZone }) {
    const styleMap = {
        ace: {
            container: 'border-amber-500/50 bg-amber-500/10 shadow-xs',
            label: 'text-amber-400 font-bold',
            val: 'text-amber-200',
            btnMinus: 'bg-surface-800 hover:bg-surface-700 text-amber-300 border border-amber-500/30',
            btnPlus: 'bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-surface-950 font-black shadow-md shadow-amber-950/40 border border-amber-400/50',
        },
        in: {
            container: 'border-emerald-500/50 bg-emerald-500/10 shadow-xs',
            label: 'text-emerald-400 font-bold',
            val: 'text-emerald-200',
            btnMinus: 'bg-surface-800 hover:bg-surface-700 text-emerald-300 border border-emerald-500/30',
            btnPlus: 'bg-gradient-to-br from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black shadow-md shadow-emerald-950/40 border border-emerald-400/50',
        },
        err: {
            container: 'border-red-500/50 bg-red-500/10 shadow-xs',
            label: 'text-red-400 font-bold',
            val: 'text-red-200',
            btnMinus: 'bg-surface-800 hover:bg-surface-700 text-red-300 border border-red-500/30',
            btnPlus: 'bg-gradient-to-br from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black shadow-md shadow-red-950/40 border border-red-400/50',
        },
    };

    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 p-1.5 md:p-2 rounded-xl bg-surface-800/40 border border-surface-700/30">
            <div className="flex items-center gap-1.5 sm:w-24 flex-shrink-0">
                <span className="text-base">{group.icon}</span>
                <span className="text-xs md:text-sm font-bold text-surface-200">{group.label}</span>
            </div>

            <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-center gap-1.5 flex-1 justify-end">
                {group.stats.map((stat) => {
                    const value = stats[stat.key] || 0;
                    const isZoneTrigger = stat.key.endsWith('_in') || stat.key.endsWith('_ace');
                    const st = styleMap[stat.type] || styleMap.in;

                    const handlePlusClick = (e) => {
                        e.preventDefault();
                        if (isZoneTrigger && onActionWithZone) {
                            onActionWithZone(stat.key, 'increment', `${group.label} ${stat.label}`);
                        } else {
                            onStatChange(stat.key, 'increment');
                        }
                    };
                    const handleMinusClick = (e) => {
                        e.preventDefault();
                        if (value <= 0) return;
                        if (isZoneTrigger && onActionWithZone) {
                            onActionWithZone(stat.key, 'decrement', `${group.label} ${stat.label}`);
                        } else {
                            onStatChange(stat.key, 'decrement');
                        }
                    };

                    return (
                        <div key={stat.key} className={`flex items-center justify-between gap-1 p-1 rounded-xl border ${st.container} min-w-[86px]`}>
                            <button type="button" onClick={handleMinusClick} className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg ${st.btnMinus} font-black text-sm active:scale-90 flex items-center justify-center transition-all cursor-pointer`}>−</button>
                            <div className="flex flex-col items-center px-1">
                                <span className={`text-[9px] uppercase font-black tracking-wide ${st.label}`}>{stat.label}</span>
                                <span className={`text-sm font-black font-mono ${st.val}`}>{value}</span>
                            </div>
                            <button type="button" onClick={handlePlusClick} className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg ${st.btnPlus} font-black text-sm active:scale-90 flex items-center justify-center transition-all cursor-pointer`}>+</button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function CourtZoneModal({ modalData, athleteStats, onSelectZone, onSkip, onClose }) {
    const isAce = modalData.statKey?.endsWith('_ace');
    const currentAction = modalData.action || 'increment';
    const isDecrement = currentAction === 'decrement';
    const [localStats, setLocalStats] = useState(athleteStats || {});

    // Sync when incoming stats change
    useEffect(() => {
        if (athleteStats) setLocalStats(athleteStats);
    }, [athleteStats]);

    const handleZoneAction = (zoneKey, actionToUse, e) => {
        if (e) e.stopPropagation();
        const act = actionToUse || currentAction;
        // Optimistic local state update
        setLocalStats(prev => ({
            ...prev,
            [zoneKey]: act === 'increment' ? (prev[zoneKey] || 0) + 1 : Math.max(0, (prev[zoneKey] || 0) - 1),
        }));
        onSelectZone(zoneKey, act);
    };

    const zones = [
        // Zona 1: Sudut atas kanan (corner triangle)
        { key: 'zone_1', label: 'Z1', desc: 'Sudut Atas', style: { top: '3%', left: '64%', width: '13%', height: '14%' } },

        // Zona 2-6: Strip kecil di tepi kanan (each 1.22m, stacked vertically)
        { key: 'zone_2', label: 'Z2', desc: '0-1.22m', style: { top: '4%', right: '2%', width: '12%', height: '15%' } },
        { key: 'zone_3', label: 'Z3', desc: '1.22-2.44m', style: { top: '21%', right: '2%', width: '12%', height: '15%' } },
        { key: 'zone_4', label: 'Z4', desc: '2.44-3.66m', style: { top: '38%', right: '2%', width: '12%', height: '15%' } },
        { key: 'zone_5', label: 'Z5', desc: '3.66-4.88m', style: { top: '55%', right: '2%', width: '12%', height: '15%' } },
        { key: 'zone_6', label: 'Z6', desc: '4.88-6.10m', style: { top: '72%', right: '2%', width: '12%', height: '15%' } },

        // Zona 7: Sudut bawah kanan (corner triangle)
        { key: 'zone_7', label: 'Z7', desc: 'Sudut Bawah', style: { top: '83%', left: '64%', width: '13%', height: '14%' } },

        // Zona 8, 9, 10: Area interior, tepat di kanan NET (besar)
        { key: 'zone_8', label: 'Z8', desc: 'Bawah', style: { top: '68%', left: '49%', width: '14%', height: '26%' } },
        { key: 'zone_9', label: 'Z9', desc: 'Tengah', style: { top: '32%', left: '49%', width: '14%', height: '34%' } },
        { key: 'zone_10', label: 'Z10', desc: 'Atas', style: { top: '4%', left: '49%', width: '14%', height: '26%' } },
    ];

    // Compute total service points in this set for this athlete (exact value, avoid double counting)
    const totalSetAce = localStats.service_ace !== undefined 
        ? (localStats.service_ace || 0)
        : zones.reduce((sum, z) => sum + (localStats[`${z.key}_ace`] || 0), 0);

    const totalSetIn = localStats.service_in !== undefined
        ? (localStats.service_in || 0)
        : zones.reduce((sum, z) => sum + (localStats[`${z.key}_in`] || 0), 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
            <div className="bg-surface-900 border-2 border-emerald-500/50 rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
                
                {/* Modal Header — Strict Team & Player Info */}
                <div className="flex items-center justify-between pb-3 border-b border-surface-800 flex-shrink-0">
                    <div className="flex items-center gap-2.5">
                        <span className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                            isDecrement
                                ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                                : isAce
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}>
                            <span>{isDecrement ? '➖' : isAce ? '⚡' : '🏐'}</span>
                            <span>{isDecrement ? `KURANG (−1) ${modalData.statLabel}` : `TAMBAH (+1) ${modalData.statLabel}`}</span>
                        </span>
                        <div className="text-left">
                            <h4 className="text-sm sm:text-base font-black text-surface-100 flex items-center gap-1.5">
                                <span>👕 #{modalData.athlete?.jersey_number || modalData.athlete?.number || '-'}</span>
                                <span>{modalData.athlete?.name}</span>
                            </h4>
                            <p className="text-xs text-primary-400 font-bold">
                                🏆 Tim: {modalData.team?.name || 'Tim'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Live Total Score Pill */}
                        <div className="hidden sm:flex flex-col items-end text-right">
                            <span className="text-[10px] uppercase font-bold text-surface-400">Total Servis Masuk</span>
                            <span className="text-xs font-black text-emerald-300 font-mono">
                                In: {totalSetIn} | Ace: {totalSetAce}
                            </span>
                        </div>

                        <button
                            onClick={onClose}
                            className="w-9 h-9 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-400 hover:text-surface-200 text-base font-bold flex items-center justify-center transition-colors cursor-pointer"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Subtitle & Instructions based on outside action */}
                <div className="text-center py-2 flex-shrink-0">
                    <p className="text-xs sm:text-sm font-bold text-surface-200">
                        {isDecrement ? (
                            <span>👉 Tap kotak zona lapangan untuk <span className="text-red-400 font-black">KURANGI (−1) {modalData.statLabel}</span> di zona tersebut:</span>
                        ) : (
                            <span>👉 Tap kotak zona lapangan untuk <span className="text-emerald-400 font-black">TAMBAH (+1) {modalData.statLabel}</span> di zona tersebut:</span>
                        )}
                    </p>
                </div>

                {/* Graphic Court Container with Background SVG, Net, and Tekong Lines */}
                <div className="relative w-full aspect-[2.1/1] rounded-2xl border-2 border-emerald-500/60 bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950 overflow-hidden shadow-2xl select-none my-1 flex-shrink-0">
                    
                    {/* SVG Court Background Lines */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 190">
                        {/* Court Boundary */}
                        <rect x="10" y="10" width="380" height="170" fill="none" stroke="#34d399" strokeWidth="2.5" strokeOpacity="0.8" />
                        
                        {/* Center Net Line */}
                        <line x1="190" y1="10" x2="190" y2="180" stroke="#ffffff" strokeWidth="3.5" strokeDasharray="5 3" />
                        <text x="190" y="8" fill="#a7f3d0" fontSize="8" textAnchor="middle" fontWeight="bold">NET</text>

                        {/* Tekong Circle & Service Dot (Left Court Half) */}
                        <circle cx="85" cy="95" r="20" fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="3 2" />
                        <circle cx="85" cy="95" r="5" fill="#fbbf24" />
                        <text x="85" y="125" fill="#fef08a" fontSize="8" textAnchor="middle" fontWeight="bold">TEKONG</text>

                        {/* Zone Fan Lines Radiating from Tekong Circle to Right Boundary */}
                        <line x1="85" y1="95" x2="390" y2="10" stroke="#fbbf24" strokeWidth="1.2" strokeOpacity="0.7" strokeDasharray="3 3" />
                        <line x1="85" y1="95" x2="390" y2="34" stroke="#60a5fa" strokeWidth="1.2" strokeOpacity="0.6" strokeDasharray="3 3" />
                        <line x1="85" y1="95" x2="390" y2="58" stroke="#60a5fa" strokeWidth="1.2" strokeOpacity="0.6" strokeDasharray="3 3" />
                        <line x1="85" y1="95" x2="390" y2="82" stroke="#60a5fa" strokeWidth="1.2" strokeOpacity="0.6" strokeDasharray="3 3" />
                        <line x1="85" y1="95" x2="390" y2="106" stroke="#60a5fa" strokeWidth="1.2" strokeOpacity="0.6" strokeDasharray="3 3" />
                        <line x1="85" y1="95" x2="390" y2="130" stroke="#60a5fa" strokeWidth="1.2" strokeOpacity="0.6" strokeDasharray="3 3" />
                        <line x1="85" y1="95" x2="390" y2="154" stroke="#60a5fa" strokeWidth="1.2" strokeOpacity="0.6" strokeDasharray="3 3" />
                        <line x1="85" y1="95" x2="390" y2="180" stroke="#fbbf24" strokeWidth="1.2" strokeOpacity="0.7" strokeDasharray="3 3" />

                        {/* Horizontal dividers between Zona 8/9/10 (right side of net) */}
                        <line x1="190" y1="68" x2="280" y2="42" stroke="#a78bfa" strokeWidth="1.2" strokeOpacity="0.6" strokeDasharray="3 3" />
                        <line x1="190" y1="122" x2="280" y2="148" stroke="#a78bfa" strokeWidth="1.2" strokeOpacity="0.6" strokeDasharray="3 3" />
                    </svg>

                    {/* Zone Clickable Buttons with Action-Aware Selection */}
                    {zones.map((z) => {
                        const ace = localStats[`${z.key}_ace`] || 0;
                        const inC = localStats[`${z.key}_in`] || (ace === 0 ? localStats[z.key] || 0 : 0);
                        const currentStatVal = isAce ? ace : inC;
                        const hasPoints = currentStatVal > 0 || (ace + inC) > 0;

                        return (
                            <div
                                key={z.key}
                                style={z.style}
                                onClick={(e) => handleZoneAction(z.key, currentAction, e)}
                                className={`
                                    absolute rounded-xl border-2 flex flex-col items-center justify-center transition-all duration-150 shadow-xl cursor-pointer select-none p-0.5
                                    ${isDecrement
                                        ? (hasPoints
                                            ? 'bg-red-950/90 border-red-400 ring-2 ring-red-400/50 shadow-red-500/20 hover:bg-red-900/90'
                                            : 'bg-surface-900/80 border-surface-600 hover:border-red-400 opacity-60')
                                        : (hasPoints
                                            ? 'bg-emerald-900/95 border-amber-400 ring-2 ring-amber-400/50 shadow-amber-500/20 hover:bg-emerald-800'
                                            : 'bg-emerald-950/85 hover:bg-emerald-600/90 border-emerald-400/70 hover:border-amber-300')
                                    }
                                    active:scale-95 text-white group
                                `}
                                title={`Tap untuk ${isDecrement ? 'mengurangi (-1)' : 'menambah (+1)'} ${modalData.statLabel} di ${z.label}`}
                            >
                                {/* Zone Label */}
                                <span className="text-[10px] sm:text-xs font-black text-emerald-200 group-hover:text-white leading-tight">
                                    {z.label}
                                </span>

                                {/* Zone Description */}
                                <span className="text-[7px] sm:text-[8px] text-surface-300 group-hover:text-emerald-100 font-mono leading-none hidden sm:inline">
                                    {z.desc}
                                </span>

                                {/* Live Point Counter Badge */}
                                {hasPoints && (
                                    <div className="mt-0.5 flex items-center gap-0.5">
                                        <span className={`px-1.5 py-0.2 rounded-full text-[9px] sm:text-[10px] font-black shadow-md leading-tight ${
                                            isDecrement ? 'bg-red-400 text-surface-950' : 'bg-amber-400 text-surface-950'
                                        }`}>
                                            {currentStatVal} pt
                                        </span>
                                    </div>
                                )}

                                {/* Dedicated Action Modifier Button on Corner */}
                                {currentStatVal > 0 && !isDecrement && (
                                    <button
                                        type="button"
                                        onClick={(e) => handleZoneAction(z.key, 'decrement', e)}
                                        className="absolute -top-1.5 -left-1.5 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-red-600 hover:bg-red-500 active:scale-75 text-white font-black text-xs flex items-center justify-center shadow-lg border border-white/80 cursor-pointer z-30 transition-all"
                                        title={`Kurangi 1 poin di ${z.label}`}
                                    >
                                        −
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-between gap-2.5 pt-3 border-t border-surface-800 mt-2 flex-shrink-0">
                    <button
                        type="button"
                        onClick={onSkip}
                        className="px-4 py-2.5 rounded-xl bg-surface-800 hover:bg-surface-700 active:scale-95 text-surface-300 text-xs sm:text-sm font-bold transition-all cursor-pointer"
                    >
                        ⏭️ Catat Tanpa Zona
                    </button>

                    <button
                        type="button"
                        onClick={onClose}
                        className={`px-6 py-2.5 rounded-xl text-white text-xs sm:text-sm font-black transition-all cursor-pointer shadow-lg active:scale-95 ${
                            isDecrement
                                ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-red-900/40'
                                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-900/40'
                        }`}
                    >
                        ✓ SELESAI / TUTUP
                    </button>
                </div>
            </div>
        </div>
    );
}
