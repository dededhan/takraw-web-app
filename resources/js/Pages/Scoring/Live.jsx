import { Head, usePage } from '@inertiajs/react';
import { useState, useCallback } from 'react';

const STAT_GROUPS = [
    {
        label: 'Servis',
        icon: '🏐',
        stats: [
            { key: 'service_in', label: 'In', color: 'primary' },
            { key: 'service_ace', label: 'Ace', color: 'accent' },
            { key: 'service_error', label: 'Error', color: 'red' },
        ],
    },
    {
        label: 'First Ball',
        icon: '🤲',
        stats: [
            { key: 'receive_success', label: 'Success', color: 'primary' },
            { key: 'receive_fail', label: 'Fail', color: 'red' },
        ],
    },
    {
        label: 'Feeding',
        icon: '🎯',
        stats: [
            { key: 'feeding_success', label: 'Success', color: 'primary' },
            { key: 'feeding_fail', label: 'Fail', color: 'red' },
        ],
    },
    {
        label: 'Strike',
        icon: '⚡',
        stats: [
            { key: 'strike_success', label: 'Success', color: 'primary' },
            { key: 'strike_fail', label: 'Fail', color: 'red' },
        ],
    },
    {
        label: 'Block',
        icon: '🛡️',
        stats: [
            { key: 'block_success', label: 'Success', color: 'primary' },
            { key: 'block_fail', label: 'Fail', color: 'red' },
        ],
    },
];

export default function LiveScoring({ match: initialMatch }) {
    const [matchData, setMatchData] = useState(initialMatch);
    const [selectedAthlete, setSelectedAthlete] = useState({ home: null, away: null });
    const [scoreAnim, setScoreAnim] = useState({ home: false, away: false });
    const [showSetup, setShowSetup] = useState(matchData.status === 'scheduled' || matchData.status === 'setup');
    const [setupData, setSetupData] = useState({ court_number: matchData.court_number || 1, max_sets: matchData.max_sets || 3 });
    const [processing, setProcessing] = useState(false);
    const [statsCache, setStatsCache] = useState({});

    const currentSet = matchData.sets?.find(s => s.status === 'live') || matchData.sets?.[0];
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

    // Setup match
    const handleSetup = async (e) => {
        e.preventDefault();
        setProcessing(true);
        try {
            await fetchPost(route('scoring.setup', matchData.id), setupData);
            // Reload the page to get fresh data
            window.location.reload();
        } catch (err) {
            console.error('Setup error:', err);
        }
        setProcessing(false);
    };

    // Start match
    const handleStart = async () => {
        setProcessing(true);
        try {
            await fetchPost(route('scoring.start', matchData.id), {});
            window.location.reload();
        } catch (err) {
            console.error('Start error:', err);
        }
        setProcessing(false);
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
                    sets: prev.sets.map(s => s.id === res.set.id ? res.set : s),
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
        <div className="min-h-screen bg-surface-950 flex flex-col">
            <Head title="⚡ LIVE Scoring" />

            {/* Top Bar — Score */}
            <div className="bg-surface-900 border-b border-surface-700/50 px-3 py-2 sticky top-0 z-50">
                <div className="flex items-center justify-between mb-1">
                    <a href={route('dashboard')} className="text-xs text-surface-500 hover:text-surface-300">← Keluar</a>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 animate-pulse">● LIVE</span>
                    <span className="text-xs text-surface-500">Set {currentSet?.set_number}/{matchData.max_sets}</span>
                </div>

                {/* Scoreboard */}
                <div className="flex items-center justify-center gap-3">
                    {/* Home Score */}
                    <div className="flex items-center gap-2 flex-1 justify-end">
                        <span className="text-xs font-medium text-primary-300 truncate max-w-[80px]">{matchData.home_team?.name}</span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => handleScore('home', 'decrement')}
                                className="w-8 h-8 rounded-lg bg-surface-800 text-surface-400 text-sm font-bold hover:bg-surface-700 active:scale-95 transition-all"
                            >
                                −
                            </button>
                            <span className={`text-3xl font-black text-primary-400 min-w-[48px] text-center tabular-nums ${scoreAnim.home ? 'animate-pulse-score' : ''}`}>
                                {currentSet?.home_score ?? 0}
                            </span>
                            <button
                                onClick={() => handleScore('home', 'increment')}
                                className="w-8 h-8 rounded-lg bg-primary-600 text-white text-sm font-bold hover:bg-primary-700 active:scale-95 transition-all"
                            >
                                +
                            </button>
                        </div>
                    </div>

                    <span className="text-surface-600 font-bold text-xs">:</span>

                    {/* Away Score */}
                    <div className="flex items-center gap-2 flex-1">
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => handleScore('away', 'decrement')}
                                className="w-8 h-8 rounded-lg bg-surface-800 text-surface-400 text-sm font-bold hover:bg-surface-700 active:scale-95 transition-all"
                            >
                                −
                            </button>
                            <span className={`text-3xl font-black text-accent-400 min-w-[48px] text-center tabular-nums ${scoreAnim.away ? 'animate-pulse-score' : ''}`}>
                                {currentSet?.away_score ?? 0}
                            </span>
                            <button
                                onClick={() => handleScore('away', 'increment')}
                                className="w-8 h-8 rounded-lg bg-accent-600 text-white text-sm font-bold hover:bg-accent-700 active:scale-95 transition-all"
                            >
                                +
                            </button>
                        </div>
                        <span className="text-xs font-medium text-accent-300 truncate max-w-[80px]">{matchData.away_team?.name}</span>
                    </div>
                </div>

                {/* Set Summary */}
                <div className="flex justify-center gap-2 mt-1">
                    {matchData.sets?.map(s => (
                        <div key={s.id} className={`text-[10px] px-2 py-0.5 rounded ${s.status === 'live' ? 'bg-red-500/20 text-red-300' : s.status === 'finished' ? 'bg-surface-700 text-surface-300' : 'bg-surface-800 text-surface-500'}`}>
                            S{s.set_number}: {s.home_score}-{s.away_score}
                        </div>
                    ))}
                </div>
            </div>

            {/* Two-Side Split */}
            <div className="flex-1 flex flex-col lg:flex-row">
                {/* Home Team Side */}
                <TeamSide
                    team={matchData.home_team}
                    athletes={matchData.home_team?.athletes || []}
                    selectedAthlete={selectedAthlete.home}
                    onSelectAthlete={(a) => setSelectedAthlete(prev => ({ ...prev, home: a }))}
                    onStatChange={(athleteId, stat, action) => handleStat(athleteId, matchData.home_team_id, stat, action)}
                    getStats={getAthleteStats}
                    side="home"
                    color="primary"
                />

                {/* Divider */}
                <div className="hidden lg:block w-px bg-surface-700/50" />
                <div className="lg:hidden h-px bg-surface-700/50" />

                {/* Away Team Side */}
                <TeamSide
                    team={matchData.away_team}
                    athletes={matchData.away_team?.athletes || []}
                    selectedAthlete={selectedAthlete.away}
                    onSelectAthlete={(a) => setSelectedAthlete(prev => ({ ...prev, away: a }))}
                    onStatChange={(athleteId, stat, action) => handleStat(athleteId, matchData.away_team_id, stat, action)}
                    getStats={getAthleteStats}
                    side="away"
                    color="accent"
                />
            </div>

            {/* Bottom: Finish Set */}
            <div className="sticky bottom-0 bg-surface-900 border-t border-surface-700/50 p-3 safe-area-inset-bottom">
                <button
                    onClick={handleFinishSet}
                    disabled={processing}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-red-500 text-white text-base font-bold hover:from-red-700 hover:to-red-600 disabled:opacity-50 transition-all active:scale-[0.98]"
                >
                    {processing ? 'Memproses...' : '🏁 FINISH SET'}
                </button>
            </div>
        </div>
    );
}

function TeamSide({ team, athletes, selectedAthlete, onSelectAthlete, onStatChange, getStats, side, color }) {
    const colorClasses = {
        primary: {
            bg: 'bg-primary-500/10',
            border: 'border-primary-500/30',
            text: 'text-primary-300',
            badge: 'bg-primary-500/20 border-primary-500/30 text-primary-300',
            activeBadge: 'bg-primary-600 text-white border-primary-500',
        },
        accent: {
            bg: 'bg-accent-500/10',
            border: 'border-accent-500/30',
            text: 'text-accent-300',
            badge: 'bg-accent-500/20 border-accent-500/30 text-accent-300',
            activeBadge: 'bg-accent-600 text-white border-accent-500',
        },
    };

    const c = colorClasses[color];
    const stats = selectedAthlete ? getStats(selectedAthlete.id) : {};

    return (
        <div className="flex-1 flex flex-col min-w-0">
            {/* Team Header */}
            <div className={`px-4 py-2 ${c.bg} border-b ${c.border}`}>
                <h3 className={`text-sm font-bold ${c.text} text-center`}>{team?.name}</h3>
            </div>

            {/* Athlete Selector — Jersey Numbers */}
            <div className="px-3 py-2 flex flex-wrap justify-center gap-1.5 border-b border-surface-700/30">
                {athletes.map((a) => (
                    <button
                        key={a.id}
                        onClick={() => onSelectAthlete(a)}
                        className={`
                            w-10 h-10 rounded-xl border text-sm font-bold transition-all duration-200 active:scale-90
                            ${selectedAthlete?.id === a.id ? c.activeBadge : c.badge}
                        `}
                        title={a.name}
                    >
                        {a.jersey_number}
                    </button>
                ))}
            </div>

            {/* Selected Athlete Info */}
            {selectedAthlete ? (
                <div className="flex-1 overflow-y-auto px-3 py-2">
                    <p className="text-xs text-surface-400 text-center mb-2">
                        #{selectedAthlete.jersey_number} {selectedAthlete.name}
                        {selectedAthlete.position && <span className="text-surface-500"> • {selectedAthlete.position}</span>}
                    </p>

                    {/* Stat Groups */}
                    <div className="space-y-2">
                        {STAT_GROUPS.map((group) => (
                            <div key={group.label} className="rounded-xl bg-surface-800/50 border border-surface-700/30 p-2.5">
                                <p className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider mb-2 text-center">
                                    {group.icon} {group.label}
                                </p>
                                <div className="space-y-1.5">
                                    {group.stats.map((stat) => (
                                        <StatRow
                                            key={stat.key}
                                            label={stat.label}
                                            value={stats[stat.key] || 0}
                                            statColor={stat.color}
                                            onIncrement={() => onStatChange(selectedAthlete.id, stat.key, 'increment')}
                                            onDecrement={() => onStatChange(selectedAthlete.id, stat.key, 'decrement')}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="text-center">
                        <p className="text-3xl mb-2">👆</p>
                        <p className="text-sm text-surface-500">Pilih nomor punggung atlet</p>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatRow({ label, value, statColor, onIncrement, onDecrement }) {
    const colorMap = {
        primary: 'text-primary-400',
        accent: 'text-accent-400',
        red: 'text-red-400',
    };

    return (
        <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${colorMap[statColor] || 'text-surface-300'} w-16`}>{label}</span>
            <div className="flex items-center gap-1">
                <button
                    onClick={onDecrement}
                    className="w-9 h-9 rounded-lg bg-surface-700 text-surface-300 text-base font-bold hover:bg-surface-600 active:scale-90 transition-all flex items-center justify-center"
                >
                    −
                </button>
                <span className="text-base font-bold text-surface-100 min-w-[32px] text-center tabular-nums">{value}</span>
                <button
                    onClick={onIncrement}
                    className="w-9 h-9 rounded-lg bg-primary-600/80 text-white text-base font-bold hover:bg-primary-600 active:scale-90 transition-all flex items-center justify-center"
                >
                    +
                </button>
            </div>
        </div>
    );
}
