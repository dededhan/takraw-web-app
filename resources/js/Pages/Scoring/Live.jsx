import { Head, usePage, router } from '@inertiajs/react';
import { useState, useCallback, useEffect, useRef } from 'react';

const STAT_GROUPS = [
    {
        label: 'Servis',
        icon: '🏐',
        stats: [
            { key: 'service_in', label: 'In', color: 'primary' },
            { key: 'service_ace', label: 'Ace', color: 'accent' },
            { key: 'service_error', label: 'Err', color: 'red' },
        ],
    },
    {
        label: 'Receive',
        icon: '🤲',
        stats: [
            { key: 'receive_success', label: '✓', color: 'primary' },
            { key: 'receive_fail', label: '✗', color: 'red' },
        ],
    },
    {
        label: 'Feed',
        icon: '🎯',
        stats: [
            { key: 'feeding_success', label: '✓', color: 'primary' },
            { key: 'feeding_fail', label: '✗', color: 'red' },
        ],
    },
    {
        label: 'Strike',
        icon: '⚡',
        stats: [
            { key: 'strike_success', label: '✓', color: 'primary' },
            { key: 'strike_fail', label: '✗', color: 'red' },
        ],
    },
    {
        label: 'Block',
        icon: '🛡️',
        stats: [
            { key: 'block_success', label: '✓', color: 'primary' },
            { key: 'block_fail', label: '✗', color: 'red' },
        ],
    },
];

const ZONE_CONFIG = [
    // Top Row (Ganjil): 1, 3, 5, 7
    { key: 'zone_1', label: '1', position: 'far-left', color: 'from-blue-500/30 to-blue-600/20 border-blue-500/40 text-blue-300' },
    { key: 'zone_2', label: '3', position: 'center-left', color: 'from-cyan-400/25 to-teal-500/20 border-cyan-400/35 text-cyan-200' },
    { key: 'zone_3', label: '5', position: 'center-right', color: 'from-yellow-400/25 to-amber-500/20 border-yellow-400/35 text-yellow-200' },
    { key: 'zone_4', label: '7', position: 'far-right', color: 'from-orange-500/30 to-red-500/20 border-orange-500/40 text-orange-300' },

    // Bottom Row (Genap): 2, 4, 6
    { key: 'zone_5', label: '2', position: 'left', color: 'from-blue-400/25 to-cyan-500/20 border-blue-400/35 text-blue-200' },
    { key: 'zone_6', label: '4', position: 'center', color: 'from-emerald-400/25 to-green-500/20 border-emerald-400/35 text-emerald-200' },
    { key: 'zone_7', label: '6', position: 'right', color: 'from-orange-400/25 to-amber-500/20 border-orange-400/35 text-orange-200' },
];

export default function LiveScoring({ match: initialMatch }) {
    const [matchData, setMatchData] = useState(initialMatch);
    const [selectedAthlete, setSelectedAthlete] = useState({ home: null, away: null });
    const [scoreAnim, setScoreAnim] = useState({ home: false, away: false });
    const [showSetup, setShowSetup] = useState(matchData.status === 'scheduled' || matchData.status === 'setup');
    const [setupData, setSetupData] = useState({ court_number: matchData.court_number || 1, max_sets: matchData.max_sets || 3 });
    const [processing, setProcessing] = useState(false);
    const [statsCache, setStatsCache] = useState({});
    const [activeSubRegu, setActiveSubRegu] = useState(0); // 0 = Regu 1, 1 = Regu 2, 2 = Regu 3

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

    const csrfToken = usePage().props._token || document.querySelector('meta[name="csrf-token"]')?.content;

    const fetchPost = async (url, body) => {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-CSRF-TOKEN': csrfToken,
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify(body),
        });
        return res.json();
    };

    // Sync state with props when Inertia reloads/updates props
    useEffect(() => {
        setMatchData(initialMatch);
        setShowSetup(initialMatch.status === 'scheduled' || initialMatch.status === 'setup');
    }, [initialMatch]);

    // Setup match
    const handleSetup = (e) => {
        e.preventDefault();
        setProcessing(true);
        router.post(route('scoring.setup', matchData.id), setupData, {
            preserveState: false,
            onSuccess: () => {
                setProcessing(false);
            },
            onError: () => {
                setProcessing(false);
            }
        });
    };

    // Start match
    const handleStart = () => {
        setProcessing(true);
        router.post(route('scoring.start', matchData.id), {}, {
            preserveState: false,
            onSuccess: () => {
                setProcessing(false);
            },
            onError: () => {
                setProcessing(false);
            }
        });
    };

    // Update score
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
            // Trigger animation
            setScoreAnim(prev => ({ ...prev, [side]: true }));
            setTimeout(() => setScoreAnim(prev => ({ ...prev, [side]: false })), 300);
        } catch (err) {
            console.error('Score update error:', err);
        }
    };

    // Update stat
    const handleStat = async (athleteId, teamId, stat, action) => {
        if (!currentSet) return;
        try {
            const res = await fetchPost(route('scoring.update-stat', matchData.id), {
                match_set_id: currentSet.id,
                athlete_id: athleteId,
                team_id: teamId,
                stat,
                action,
            });
            if (res.stat) {
                const cacheKey = `${currentSet.id}-${athleteId}`;
                setStatsCache(prev => ({ ...prev, [cacheKey]: res.stat }));
                // Also update matchData sets
                setMatchData(prev => ({
                    ...prev,
                    sets: prev.sets.map(s => {
                        if (s.id !== currentSet.id) return s;
                        const existingStats = s.stats || [];
                        const idx = existingStats.findIndex(st => st.athlete_id === athleteId);
                        if (idx >= 0) {
                            const newStats = [...existingStats];
                            newStats[idx] = res.stat;
                            return { ...s, stats: newStats };
                        }
                        return { ...s, stats: [...existingStats, res.stat] };
                    }),
                }));
            }
        } catch (err) {
            console.error('Stat update error:', err);
        }
    };

    // Finish set
    const handleFinishSet = async () => {
        if (!currentSet || !confirm('Yakin ingin mengakhiri set ini?')) return;
        setProcessing(true);
        try {
            const res = await fetchPost(route('scoring.finish-set', matchData.id), {
                match_set_id: currentSet.id,
            });
            if (res.matchFinished) {
                alert(`Pertandingan selesai! Pemenang: ${res.winner === matchData.home_team_id ? matchData.home_team?.name : matchData.away_team?.name}`);
            }
            window.location.reload();
        } catch (err) {
            console.error('Finish set error:', err);
        }
        setProcessing(false);
    };

    // ─── Render ─────────────────────────────────────

    // Setup/Start screen
    if (showSetup || !isLive) {
        return (
            <div className="min-h-screen bg-surface-950 flex flex-col">
                <Head title="Setup Pertandingan" />

                {/* Header */}
                <div className="bg-surface-900 border-b border-surface-700/50 px-4 py-3">
                    <div className="flex items-center justify-between">
                        <a href={route('dashboard')} className="text-sm text-surface-400 hover:text-surface-200 flex items-center gap-1">
                            ← Dashboard
                        </a>
                        <span className="text-sm font-medium text-surface-300">{matchData.tournament?.name}</span>
                    </div>
                </div>

                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="max-w-lg w-full">
                        {/* Match Card */}
                        <div className="rounded-2xl border border-surface-700/50 bg-surface-900/50 p-8 text-center mb-6">
                            <div className="flex items-center justify-center gap-8 mb-6">
                                <div>
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500/30 to-primary-600/20 flex items-center justify-center text-2xl font-bold text-primary-300 mx-auto mb-2">
                                        {matchData.home_team?.name?.charAt(0)}
                                    </div>
                                    <p className="text-sm font-semibold text-surface-200">{matchData.home_team?.name}</p>
                                </div>
                                <span className="text-2xl font-black text-surface-600">VS</span>
                                <div>
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-500/30 to-accent-600/20 flex items-center justify-center text-2xl font-bold text-accent-300 mx-auto mb-2">
                                        {matchData.away_team?.name?.charAt(0)}
                                    </div>
                                    <p className="text-sm font-semibold text-surface-200">{matchData.away_team?.name}</p>
                                </div>
                            </div>

                            {matchData.status === 'scheduled' && (
                                <form onSubmit={handleSetup} className="space-y-4 text-left">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-surface-300 mb-2">Nomor Lapangan</label>
                                            <input
                                                type="number"
                                                value={setupData.court_number}
                                                onChange={(e) => setSetupData(d => ({ ...d, court_number: parseInt(e.target.value) }))}
                                                min="1"
                                                className="w-full px-4 py-3 rounded-xl bg-surface-800 border border-surface-700 text-surface-100 text-center text-lg font-bold focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-surface-300 mb-2">Jumlah Set (Best of)</label>
                                            <select
                                                value={setupData.max_sets}
                                                onChange={(e) => setSetupData(d => ({ ...d, max_sets: parseInt(e.target.value) }))}
                                                className="w-full px-4 py-3 rounded-xl bg-surface-800 border border-surface-700 text-surface-100 text-center text-lg font-bold focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                                            >
                                                <option value="1">1 Set</option>
                                                <option value="3">Best of 3</option>
                                                <option value="5">Best of 5</option>
                                            </select>
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="w-full py-4 rounded-xl bg-primary-600 text-white text-lg font-bold hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-glow-primary"
                                    >
                                        {processing ? 'Menyiapkan...' : '⚙️ Setup Pertandingan'}
                                    </button>
                                </form>
                            )}

                            {matchData.status === 'setup' && (
                                <div className="space-y-4">
                                    <div className="flex justify-center gap-6 text-sm text-surface-400">
                                        <span>📍 Lapangan {matchData.court_number}</span>
                                        <span>🔢 Best of {matchData.max_sets}</span>
                                    </div>
                                    <button
                                        onClick={handleStart}
                                        disabled={processing}
                                        className="w-full py-4 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white text-xl font-bold hover:from-primary-700 hover:to-primary-600 disabled:opacity-50 transition-all shadow-glow-primary animate-pulse"
                                    >
                                        {processing ? 'Memulai...' : '▶️ MULAI PERTANDINGAN'}
                                    </button>
                                </div>
                            )}

                            {matchData.status === 'finished' && (
                                <div className="space-y-3">
                                    <p className="text-lg font-bold text-primary-300">✅ Pertandingan Selesai</p>
                                    <a href={route('matches.show', matchData.id)} className="inline-block text-sm text-primary-400 hover:text-primary-300">
                                        Lihat Detail →
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ─── Live Scoring Interface ─────────────────────

    return (
        <div className="h-screen bg-surface-950 flex flex-col overflow-hidden">
            <Head title="⚡ LIVE Scoring" />

            {/* Top Bar — Score */}
            <div className="bg-surface-900 border-b border-surface-700/50 px-3 py-1.5 flex-shrink-0 z-50">
                <div className="flex items-center justify-between mb-0.5">
                    <a href={route('dashboard')} className="text-[10px] text-surface-500 hover:text-surface-300">← Keluar</a>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 animate-pulse">● LIVE</span>
                    <span className="text-[10px] text-surface-500">Set {currentSet?.set_number}/{matchData.max_sets}</span>
                </div>

                {isTeamMode && (
                    <div className="flex justify-center gap-2 mb-2">
                        {[0, 1, 2].map((idx) => {
                            const subSets = matchData.sets?.filter(s => s.set_number >= idx * 3 + 1 && s.set_number <= (idx + 1) * 3) || [];
                            const homeWins = subSets.filter(s => s.winner_team_id === matchData.home_super_team?.members?.[idx]?.id).length;
                            const awayWins = subSets.filter(s => s.winner_team_id === matchData.away_super_team?.members?.[idx]?.id).length;

                            return (
                                <button
                                    key={idx}
                                    onClick={() => setActiveSubRegu(idx)}
                                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                                        activeSubRegu === idx
                                            ? 'bg-amber-500 text-surface-950 border-amber-400 shadow-md'
                                            : 'bg-surface-800 text-surface-400 border-surface-700 hover:border-surface-600'
                                    }`}
                                >
                                    <span>Laga #{idx + 1}</span>
                                    {(homeWins > 0 || awayWins > 0) && (
                                        <span className="text-[10px] px-1.5 py-0.2 bg-black/30 rounded font-mono">
                                            {homeWins}-{awayWins}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Scoreboard */}
                <div className="flex items-center justify-center gap-2">
                    {/* Home Score */}
                    <div className="flex items-center gap-1.5 flex-1 justify-end">
                        <span className="text-[11px] font-bold text-primary-300 truncate max-w-[120px]">{currentHomeTeam?.name}</span>
                        <div className="flex items-center gap-0.5">
                            <button
                                onClick={() => handleScore('home', 'decrement')}
                                className="w-7 h-7 rounded-lg bg-surface-800 text-surface-400 text-xs font-bold hover:bg-surface-700 active:scale-95 transition-all"
                            >
                                −
                            </button>
                            <span className={`text-2xl font-black text-primary-400 min-w-[36px] text-center tabular-nums ${scoreAnim.home ? 'animate-pulse-score' : ''}`}>
                                {currentSet?.home_score ?? 0}
                            </span>
                            <button
                                onClick={() => handleScore('home', 'increment')}
                                className="w-7 h-7 rounded-lg bg-primary-600 text-white text-xs font-bold hover:bg-primary-700 active:scale-95 transition-all"
                            >
                                +
                            </button>
                        </div>
                    </div>

                    <span className="text-surface-600 font-bold text-[10px]">:</span>

                    {/* Away Score */}
                    <div className="flex items-center gap-1.5 flex-1">
                        <div className="flex items-center gap-0.5">
                            <button
                                onClick={() => handleScore('away', 'decrement')}
                                className="w-7 h-7 rounded-lg bg-surface-800 text-surface-400 text-xs font-bold hover:bg-surface-700 active:scale-95 transition-all"
                            >
                                −
                            </button>
                            <span className={`text-2xl font-black text-accent-400 min-w-[36px] text-center tabular-nums ${scoreAnim.away ? 'animate-pulse-score' : ''}`}>
                                {currentSet?.away_score ?? 0}
                            </span>
                            <button
                                onClick={() => handleScore('away', 'increment')}
                                className="w-7 h-7 rounded-lg bg-accent-600 text-white text-xs font-bold hover:bg-accent-700 active:scale-95 transition-all"
                            >
                                +
                            </button>
                        </div>
                        <span className="text-[11px] font-bold text-accent-300 truncate max-w-[120px]">{currentAwayTeam?.name}</span>
                    </div>
                </div>

                {/* Set Summary */}
                <div className="flex justify-center gap-1.5 mt-0.5">
                    {activeSets?.map(s => (
                        <div key={s.id} className={`text-[9px] px-1.5 py-0.5 rounded ${s.status === 'live' ? 'bg-red-500/20 text-red-300' : s.status === 'finished' ? 'bg-surface-700 text-surface-300' : 'bg-surface-800 text-surface-500'}`}>
                            S{s.set_number}: {s.home_score}-{s.away_score}
                        </div>
                    ))}
                </div>
            </div>

            {/* Two-Side Split — takes remaining height */}
            <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
                {/* Home Team Side */}
                <TeamSide
                    team={currentHomeTeam}
                    athletes={currentHomeTeam?.athletes || []}
                    selectedAthlete={selectedAthlete.home}
                    onSelectAthlete={(a) => setSelectedAthlete(prev => ({ ...prev, home: a }))}
                    onStatChange={(athleteId, stat, action) => handleStat(athleteId, currentHomeTeam?.id, stat, action)}
                    getStats={getAthleteStats}
                    side="home"
                    color="primary"
                />

                {/* Divider */}
                <div className="hidden lg:block w-px bg-surface-700/50 flex-shrink-0" />
                <div className="lg:hidden h-px bg-surface-700/50 flex-shrink-0" />

                {/* Away Team Side */}
                <TeamSide
                    team={currentAwayTeam}
                    athletes={currentAwayTeam?.athletes || []}
                    selectedAthlete={selectedAthlete.away}
                    onSelectAthlete={(a) => setSelectedAthlete(prev => ({ ...prev, away: a }))}
                    onStatChange={(athleteId, stat, action) => handleStat(athleteId, currentAwayTeam?.id, stat, action)}
                    getStats={getAthleteStats}
                    side="away"
                    color="accent"
                />
            </div>

            {/* Bottom: Finish Set */}
            <div className="flex-shrink-0 bg-surface-900 border-t border-surface-700/50 p-2 safe-area-inset-bottom">
                <button
                    onClick={handleFinishSet}
                    disabled={processing}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-500 text-white text-sm font-bold hover:from-red-700 hover:to-red-600 disabled:opacity-50 transition-all active:scale-[0.98]"
                >
                    {processing ? 'Memproses...' : '🏁 FINISH SET'}
                </button>
            </div>
        </div>
    );
}

function TeamSide({ team, athletes = [], selectedAthlete, onSelectAthlete, onStatChange, getStats, side, color }) {
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
            { id: `temp-${team?.id || 1}-1`, name: 'Tekong', jersey_number: 1, position: 'Tekong' },
            { id: `temp-${team?.id || 1}-2`, name: 'Feeder', jersey_number: 2, position: 'Feeder' },
            { id: `temp-${team?.id || 1}-3`, name: 'Killer', jersey_number: 3, position: 'Killer' },
            { id: `temp-${team?.id || 1}-4`, name: 'Cadangan', jersey_number: 4, position: 'Cadangan' },
        ];

    // Auto select 1st athlete if none selected
    useEffect(() => {
        if (!selectedAthlete && effectiveAthletes && effectiveAthletes.length > 0) {
            onSelectAthlete(effectiveAthletes[0]);
        }
    }, [effectiveAthletes, selectedAthlete]);

    return (
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
            {/* Team Header + Athlete Selector combined */}
            <div className={`px-3 py-2 ${c.bg} border-b ${c.border} flex-shrink-0`}>
                <h3 className={`text-xs font-bold ${c.text} text-center mb-1.5`}>{team?.name || 'Tim'}</h3>
                {/* Athlete Selector — Jersey Numbers & Names */}
                <div className="flex flex-wrap justify-center gap-1.5">
                    {effectiveAthletes.map((a, idx) => {
                        const jerseyNo = a.jersey_number || a.number || (idx + 1);
                        const isSelected = selectedAthlete?.id === a.id;
                        return (
                            <button
                                key={a.id || idx}
                                onClick={() => onSelectAthlete(a)}
                                className={`
                                    px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all duration-200 active:scale-95 flex items-center gap-1.5
                                    ${isSelected ? c.activeBadge : c.badge}
                                `}
                                title={`${a.name} (#${jerseyNo})`}
                            >
                                <span className="font-mono text-xs font-black">#{jerseyNo}</span>
                                <span className="truncate max-w-[80px] text-[11px]">{a.name}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Selected Athlete Content */}
            {selectedAthlete ? (
                <div className="flex-1 flex flex-col min-h-0 overflow-y-auto px-3 py-2">
                    {/* Athlete info header */}
                    <div className="text-center mb-2 flex-shrink-0">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-800 border border-surface-700/60 text-xs font-bold text-surface-200">
                            <span>👕 No. Punggung <strong className="font-mono text-primary-300">#{selectedAthlete.jersey_number || selectedAthlete.number || '—'}</strong></span>
                            <span>—</span>
                            <span className="text-surface-100">{selectedAthlete.name}</span>
                            {selectedAthlete.position && (
                                <span className="text-surface-400 text-[10px] font-normal">({selectedAthlete.position})</span>
                            )}
                        </span>
                    </div>

                    {/* Stats + Zones in a responsive layout */}
                    <div className="flex flex-col md:flex-row gap-2 flex-1 min-h-0">
                        {/* Stats Grid */}
                        <div className="flex-1 min-w-0">
                            <div className="rounded-xl bg-surface-800/50 border border-surface-700/30 p-2.5">
                                <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-2 text-center">
                                    📊 Statistik
                                </p>
                                <div className="space-y-1.5">
                                    {STAT_GROUPS.map((group) => (
                                        <CompactStatRow
                                            key={group.label}
                                            group={group}
                                            stats={stats}
                                            onStatChange={(stat, action) => onStatChange(selectedAthlete.id, stat, action)}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Court Zones */}
                        <div className="flex-1 min-w-0">
                            <CourtZones
                                stats={stats}
                                onZoneChange={(zone, action) => onStatChange(selectedAthlete.id, zone, action)}
                                color={color}
                            />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center p-4">
                    <div className="text-center">
                        <p className="text-3xl mb-2">👆</p>
                        <p className="text-sm text-surface-500">Pilih nomor punggung</p>
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Compact stat row: group label on left, stat buttons in a row on right.
 * Each stat is a small counter with +/- controls.
 */
function CompactStatRow({ group, stats, onStatChange }) {
    return (
        <div className="flex items-center gap-1.5">
            {/* Group label */}
            <span className="text-[11px] font-bold text-surface-400 w-12 truncate flex-shrink-0">
                {group.icon} {group.label}
            </span>

            {/* Stat buttons */}
            <div className="flex gap-1 flex-1 justify-end">
                {group.stats.map((stat) => {
                    const value = stats[stat.key] || 0;
                    const colorMap = {
                        primary: { btn: 'bg-primary-600 hover:bg-primary-500 text-white', label: 'text-primary-400' },
                        accent: { btn: 'bg-accent-600 hover:bg-accent-500 text-white', label: 'text-accent-400' },
                        red: { btn: 'bg-red-600 hover:bg-red-500 text-white', label: 'text-red-400' },
                    };
                    const sc = colorMap[stat.color] || colorMap.primary;

                    return (
                        <div key={stat.key} className="flex items-center gap-0.5">
                            <button
                                onClick={() => onStatChange(stat.key, 'decrement')}
                                className="w-8 h-8 rounded-lg bg-surface-700 text-surface-300 text-sm font-bold hover:bg-surface-600 active:scale-90 transition-all flex items-center justify-center"
                            >
                                −
                            </button>
                            <div className="flex flex-col items-center min-w-[28px]">
                                <span className={`text-[10px] font-semibold ${sc.label} leading-none`}>{stat.label}</span>
                                <span className="text-sm font-black text-surface-100 tabular-nums leading-tight">{value}</span>
                            </div>
                            <button
                                onClick={() => onStatChange(stat.key, 'increment')}
                                className={`w-8 h-8 rounded-lg ${sc.btn} text-sm font-bold active:scale-90 transition-all flex items-center justify-center`}
                            >
                                +
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/**
 * Court Zone Diagram — Visual fan-shaped layout with 7 interactive zones.
 * Tap = increment, long-press = decrement.
 */
function CourtZones({ stats, onZoneChange, color }) {
    const longPressRef = useRef(null);
    const [pressedZone, setPressedZone] = useState(null);

    const handlePointerDown = (zoneKey) => {
        setPressedZone(zoneKey);
        longPressRef.current = setTimeout(() => {
            onZoneChange(zoneKey, 'decrement');
            setPressedZone(null);
            longPressRef.current = 'fired';
        }, 500);
    };

    const handlePointerUp = (zoneKey) => {
        if (longPressRef.current && longPressRef.current !== 'fired') {
            clearTimeout(longPressRef.current);
            onZoneChange(zoneKey, 'increment');
        }
        longPressRef.current = null;
        setPressedZone(null);
    };

    const handlePointerLeave = () => {
        if (longPressRef.current && longPressRef.current !== 'fired') {
            clearTimeout(longPressRef.current);
        }
        longPressRef.current = null;
        setPressedZone(null);
    };

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
        <div className="rounded-xl bg-surface-900 border border-surface-700/50 p-2.5 shadow-xl">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                    🎯 ZONA JATUH BOLA (ZONA 1 - 7)
                </span>
                <span className="text-[9px] text-surface-400 font-mono">13.40m x 6.10m</span>
            </div>

            {/* Graphic Court Container with Background SVG */}
            <div className="relative w-full aspect-[2.1/1] rounded-xl border-2 border-emerald-500/50 bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950 overflow-hidden shadow-inner select-none">
                
                {/* SVG Court Background Lines */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 190">
                    {/* Court Outer Boundary */}
                    <rect x="10" y="10" width="380" height="170" fill="none" stroke="#34d399" strokeWidth="2.5" strokeOpacity="0.8" />
                    
                    {/* Center Net Line */}
                    <line x1="190" y1="10" x2="190" y2="180" stroke="#ffffff" strokeWidth="3" strokeDasharray="5 3" />
                    <text x="190" y="8" fill="#a7f3d0" fontSize="7" textAnchor="middle" fontWeight="bold">NET</text>

                    {/* Tekong Circle & Service Dot (Left Court Half) */}
                    <circle cx="85" cy="95" r="20" fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="3 2" />
                    <circle cx="85" cy="95" r="5" fill="#fbbf24" />
                    <text x="85" y="125" fill="#fef08a" fontSize="7" textAnchor="middle" fontWeight="bold">TEKONG</text>

                    {/* Zone Fan Lines Radiating from Tekong Circle to Right Boundary */}
                    <line x1="85" y1="95" x2="390" y2="10" stroke="#fbbf24" strokeWidth="1" strokeOpacity="0.6" strokeDasharray="3 3" />
                    <line x1="85" y1="95" x2="390" y2="44" stroke="#60a5fa" strokeWidth="1" strokeOpacity="0.6" strokeDasharray="3 3" />
                    <line x1="85" y1="95" x2="390" y2="78" stroke="#60a5fa" strokeWidth="1" strokeOpacity="0.6" strokeDasharray="3 3" />
                    <line x1="85" y1="95" x2="390" y2="112" stroke="#60a5fa" strokeWidth="1" strokeOpacity="0.6" strokeDasharray="3 3" />
                    <line x1="85" y1="95" x2="390" y2="146" stroke="#60a5fa" strokeWidth="1" strokeOpacity="0.6" strokeDasharray="3 3" />
                    <line x1="85" y1="95" x2="390" y2="180" stroke="#fbbf24" strokeWidth="1" strokeOpacity="0.6" strokeDasharray="3 3" />
                </svg>

                {/* Interactive Zone Buttons Overlay (ZONA 1 - ZONA 7) */}
                {zones.map((z) => {
                    const value = stats[z.key] || 0;
                    const isPressed = pressedZone === z.key;

                    return (
                        <button
                            key={z.key}
                            style={z.style}
                            onPointerDown={() => handlePointerDown(z.key)}
                            onPointerUp={() => handlePointerUp(z.key)}
                            onPointerLeave={handlePointerLeave}
                            onContextMenu={(e) => e.preventDefault()}
                            className={`
                                absolute rounded-lg border flex flex-col items-center justify-center transition-all duration-150 shadow-md backdrop-blur-xs
                                ${isPressed ? 'scale-90 bg-amber-500/90 border-amber-300' : 'bg-surface-900/80 hover:bg-emerald-600/70 border-emerald-400/50 hover:border-amber-400'}
                            `}
                        >
                            <span className="text-[9px] md:text-xs font-black text-emerald-200 leading-tight">
                                {z.label}
                            </span>
                            <span className="text-[7px] text-surface-300 font-mono leading-none hidden sm:inline">
                                {z.desc}
                            </span>

                            {/* Hit Count Badge */}
                            {value > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-amber-400 text-surface-950 text-[9px] font-black flex items-center justify-center shadow-lg border border-amber-300 animate-bounce">
                                    {value}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            <p className="text-[9px] text-surface-400 text-center mt-1.5 font-medium">
                💡 Tap zona untuk <span className="text-emerald-400 font-bold">+1</span> · Tahan untuk <span className="text-red-400 font-bold">−1</span>
            </p>
        </div>
    );
}
