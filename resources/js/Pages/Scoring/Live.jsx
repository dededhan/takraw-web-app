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
    const [showSetup, setShowSetup] = useState(matchData.status === 'scheduled' || matchData.status === 'setup');
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
        setShowSetup(initialMatch.status === 'scheduled' || initialMatch.status === 'setup');
    }, [initialMatch]);

    const handleSetup = (e) => {
        e.preventDefault();
        setProcessing(true);
        router.post(route('scoring.setup', matchData.id), setupData, {
            preserveState: false,
            onSuccess: () => setProcessing(false),
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
                const cacheKey = `${currentSet.id}-${athleteId}`;
                setStatsCache(prev => ({ ...prev, [cacheKey]: res.stat }));
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

    const handleServiceAction = (athlete, team, statKey, action) => {
        if (action === 'increment' && (statKey === 'service_in' || statKey === 'service_ace')) {
            setZoneModal({
                athlete,
                team,
                statKey,
                statLabel: statKey === 'service_in' ? 'Servis In' : 'Servis Ace',
            });
        } else {
            handleStat(athlete.id, team.id, statKey, action);
        }
    };

    const handleZoneSelect = (zoneKey) => {
        if (!zoneModal) return;
        handleStat(zoneModal.athlete.id, zoneModal.team.id, zoneModal.statKey, 'increment', zoneKey);
        setZoneModal(null);
    };

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

                        {showSetup && (
                            <form onSubmit={handleSetup} className="rounded-2xl border border-surface-700/50 bg-surface-900/50 p-6 space-y-4">
                                <h3 className="font-bold text-surface-100 text-sm">Pengaturan Pertandingan</h3>
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
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="w-full py-3 rounded-xl bg-primary-600 text-white font-bold text-sm hover:bg-primary-500 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {processing ? 'Menyimpan...' : 'Simpan & Siap Mulai'}
                                </button>
                            </form>
                        )}

                        {isSetup && !showSetup && (
                            <button
                                onClick={handleStart}
                                disabled={processing}
                                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-lg hover:from-emerald-500 hover:to-teal-500 shadow-xl shadow-emerald-900/30 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {processing ? 'Memulai...' : '▶ MULAI PERTANDINGAN'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-surface-950 flex flex-col overflow-hidden select-none">
            <Head title={`Scoring: ${currentHomeTeam?.name} vs ${currentAwayTeam?.name}`} />

            <div className="bg-surface-900 border-b border-surface-700/50 px-3 py-1 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <a href={route('dashboard')} className="text-xs text-surface-400 hover:text-surface-200">
                            ← Keluar
                        </a>
                        <span className="text-xs text-surface-500">|</span>
                        <span className="text-xs font-semibold text-surface-300">
                            Lap {matchData.court_number} • Set {currentSet?.set_number || 1}
                        </span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
                            ● LIVE
                        </span>
                    </div>

                    {isTeamMode && (
                        <div className="flex items-center gap-1 bg-surface-800 p-0.5 rounded-lg border border-surface-700/50">
                            {['Regu 1', 'Regu 2', 'Regu 3'].map((regu, idx) => (
                                <button
                                    key={regu}
                                    onClick={() => setActiveSubRegu(idx)}
                                    className={`
                                        px-2 py-0.5 rounded text-[11px] font-bold transition-all
                                        ${activeSubRegu === idx ? 'bg-primary-600 text-white shadow-sm' : 'text-surface-400 hover:text-surface-200'}
                                    `}
                                >
                                    {regu}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-surface-900/90 border-b border-surface-700/50 px-4 py-2 flex-shrink-0 shadow-lg">
                <div className="flex items-center justify-between max-w-2xl mx-auto gap-4">
                    <div className="flex items-center gap-2 flex-1 justify-end">
                        <span className="text-sm md:text-base font-extrabold text-primary-300 truncate max-w-[140px] text-right">{currentHomeTeam?.name}</span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => handleScore('home', 'decrement')}
                                className="w-9 h-9 md:w-11 md:h-11 rounded-xl bg-surface-800 hover:bg-surface-700 active:scale-90 text-surface-400 hover:text-surface-200 text-base font-bold transition-all flex items-center justify-center cursor-pointer"
                            >
                                −
                            </button>
                            <span className={`text-3xl md:text-4xl font-black text-primary-400 min-w-[48px] text-center tabular-nums ${scoreAnim.home ? 'animate-pulse-score' : ''}`}>
                                {currentSet?.home_score ?? 0}
                            </span>
                            <button
                                onClick={() => handleScore('home', 'increment')}
                                className="w-9 h-9 md:w-11 md:h-11 rounded-xl bg-primary-600 hover:bg-primary-500 active:scale-90 text-white text-base font-black transition-all flex items-center justify-center cursor-pointer shadow-md shadow-primary-900/40"
                            >
                                +
                            </button>
                        </div>
                    </div>

                    <div className="text-center px-2 flex flex-col items-center">
                        <span className="text-[10px] font-bold text-surface-500 uppercase tracking-wider">SET {currentSet?.set_number || 1}</span>
                        <span className="text-xs font-black text-surface-400">VS</span>
                    </div>

                    <div className="flex items-center gap-2 flex-1 justify-start">
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => handleScore('away', 'decrement')}
                                className="w-9 h-9 md:w-11 md:h-11 rounded-xl bg-surface-800 hover:bg-surface-700 active:scale-90 text-surface-400 hover:text-surface-200 text-base font-bold transition-all flex items-center justify-center cursor-pointer"
                            >
                                −
                            </button>
                            <span className={`text-3xl md:text-4xl font-black text-accent-400 min-w-[48px] text-center tabular-nums ${scoreAnim.away ? 'animate-pulse-score' : ''}`}>
                                {currentSet?.away_score ?? 0}
                            </span>
                            <button
                                onClick={() => handleScore('away', 'increment')}
                                className="w-9 h-9 md:w-11 md:h-11 rounded-xl bg-accent-600 hover:bg-accent-500 active:scale-90 text-white text-base font-black transition-all flex items-center justify-center cursor-pointer shadow-md shadow-accent-900/40"
                            >
                                +
                            </button>
                        </div>
                        <span className="text-sm md:text-base font-extrabold text-accent-300 truncate max-w-[140px] text-left">{currentAwayTeam?.name}</span>
                    </div>
                </div>

                <div className="flex justify-center gap-2 mt-1">
                    {activeSets?.map(s => (
                        <div key={s.id} className={`text-[10px] px-2 py-0.5 rounded font-bold ${s.status === 'live' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : s.status === 'finished' ? 'bg-surface-700 text-surface-300' : 'bg-surface-800 text-surface-500'}`}>
                            S{s.set_number}: {s.home_score}-{s.away_score}
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
                <TeamSide
                    team={currentHomeTeam}
                    athletes={currentHomeTeam?.athletes || []}
                    selectedAthlete={selectedAthlete.home}
                    onSelectAthlete={(a) => setSelectedAthlete(prev => ({ ...prev, home: a }))}
                    onStatChange={(athleteId, stat, action, zone) => handleStat(athleteId, currentHomeTeam?.id, stat, action, zone)}
                    onServiceAction={(athlete, statKey, action) => handleServiceAction(athlete, currentHomeTeam, statKey, action)}
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
                    onServiceAction={(athlete, statKey, action) => handleServiceAction(athlete, currentAwayTeam, statKey, action)}
                    getStats={getAthleteStats}
                    side="away"
                    color="accent"
                />
            </div>

            <div className="flex-shrink-0 bg-surface-900 border-t border-surface-700/50 p-2.5 safe-area-inset-bottom">
                <button
                    onClick={handleFinishSet}
                    disabled={processing}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-500 text-white text-sm font-black hover:from-red-700 hover:to-red-600 disabled:opacity-50 transition-all active:scale-[0.98] shadow-lg shadow-red-950/40 cursor-pointer"
                >
                    {processing ? 'Memproses...' : '🏁 SELESAIKAN SET INI'}
                </button>
            </div>

            {zoneModal && (
                <CourtZoneModal
                    modalData={zoneModal}
                    onSelectZone={handleZoneSelect}
                    onSkip={() => {
                        handleStat(zoneModal.athlete.id, zoneModal.team.id, zoneModal.statKey, 'increment', null);
                        setZoneModal(null);
                    }}
                    onClose={() => setZoneModal(null)}
                />
            )}
        </div>
    );
}

function TeamSide({ team, athletes = [], selectedAthlete, onSelectAthlete, onStatChange, onServiceAction, getStats, side, color }) {
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
                        const jerseyNo = a.jersey_number || a.number || (idx + 1);
                        const isSelected = selectedAthlete?.id === a.id;
                        return (
                            <button
                                key={a.id || idx}
                                onClick={() => onSelectAthlete(a)}
                                className={`
                                    px-3 py-1.5 md:py-2 rounded-xl border text-xs md:text-sm font-bold transition-all duration-200 active:scale-95 flex items-center gap-1.5 cursor-pointer select-none
                                    ${isSelected ? c.activeBadge : c.badge}
                                `}
                                title={`${a.name} (#${jerseyNo})`}
                            >
                                <span className="font-mono text-xs md:text-sm font-black">#{jerseyNo}</span>
                                <span className="truncate max-w-[90px] md:max-w-[120px]">{a.name}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {selectedAthlete ? (
                <div className="flex-1 flex flex-col min-h-0 overflow-y-auto px-3 py-2.5">
                    <div className="text-center mb-2.5 flex-shrink-0">
                        <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-surface-800 border border-surface-700/60 text-xs md:text-sm font-bold text-surface-200 shadow-sm">
                            <span>👕 No. Punggung <strong className="font-mono text-primary-300">#{selectedAthlete.jersey_number || selectedAthlete.number || '—'}</strong></span>
                            <span>•</span>
                            <span className="text-surface-100">{selectedAthlete.name}</span>
                            {selectedAthlete.position && (
                                <span className="text-surface-400 text-xs font-normal">({selectedAthlete.position})</span>
                            )}
                        </span>
                    </div>

                    <div className="rounded-2xl bg-surface-900/60 border border-surface-700/50 p-2.5 sm:p-3.5 space-y-2.5 shadow-inner">
                        {STAT_GROUPS.map((group) => (
                            <TabletStatRow
                                key={group.label}
                                group={group}
                                stats={stats}
                                onStatChange={(stat, action) => onStatChange(selectedAthlete.id, stat, action)}
                                onServiceAction={(statKey, action) => onServiceAction(selectedAthlete, statKey, action)}
                            />
                        ))}
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="text-center">
                        <p className="text-4xl mb-2">👆</p>
                        <p className="text-sm font-semibold text-surface-400">Pilih nomor punggung pemain di atas</p>
                    </div>
                </div>
            )}
        </div>
    );
}

function TabletStatRow({ group, stats, onStatChange, onServiceAction }) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 p-2 rounded-xl bg-surface-800/40 border border-surface-700/30">
            <div className="flex items-center gap-1.5 sm:w-28 flex-shrink-0">
                <span className="text-base">{group.icon}</span>
                <span className="text-xs md:text-sm font-bold text-surface-200">{group.label}</span>
            </div>

            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 flex-1 justify-end">
                {group.stats.map((stat) => {
                    const value = stats[stat.key] || 0;
                    const colorMap = {
                        primary: {
                            btn: 'bg-primary-600 hover:bg-primary-500 active:bg-primary-700 text-white shadow-md shadow-primary-950/30',
                            label: 'text-primary-300',
                            bg: 'bg-primary-500/10 border-primary-500/20',
                        },
                        accent: {
                            btn: 'bg-accent-600 hover:bg-accent-500 active:bg-accent-700 text-white shadow-md shadow-accent-950/30',
                            label: 'text-accent-300',
                            bg: 'bg-accent-500/10 border-accent-500/20',
                        },
                        red: {
                            btn: 'bg-red-600 hover:bg-red-500 active:bg-red-700 text-white shadow-md shadow-red-950/30',
                            label: 'text-red-300',
                            bg: 'bg-red-500/10 border-red-500/20',
                        },
                    };
                    const sc = colorMap[stat.color] || colorMap.primary;
                    const isServiceInOrAce = stat.key === 'service_in' || stat.key === 'service_ace';

                    const handlePlusClick = (e) => {
                        e.preventDefault();
                        if (isServiceInOrAce && onServiceAction) {
                            onServiceAction(stat.key, 'increment');
                        } else {
                            onStatChange(stat.key, 'increment');
                        }
                    };

                    return (
                        <div
                            key={stat.key}
                            className={`flex items-center justify-between gap-1 p-1 rounded-xl border ${sc.bg} min-w-[120px]`}
                        >
                            <button
                                type="button"
                                onClick={() => onStatChange(stat.key, 'decrement')}
                                className="w-10 h-10 md:w-11 md:h-11 rounded-lg bg-surface-700/80 hover:bg-surface-600 active:scale-90 text-surface-300 text-lg font-black transition-all flex items-center justify-center cursor-pointer select-none"
                            >
                                −
                            </button>

                            <div className="flex flex-col items-center px-1">
                                <span className={`text-[10px] md:text-xs font-black uppercase tracking-wider ${sc.label}`}>
                                    {stat.label}
                                </span>
                                <span className="text-base md:text-lg font-black text-white tabular-nums leading-none mt-0.5">
                                    {value}
                                </span>
                            </div>

                            <button
                                type="button"
                                onClick={handlePlusClick}
                                className={`w-10 h-10 md:w-11 md:h-11 rounded-lg ${sc.btn} text-lg font-black active:scale-90 transition-all flex items-center justify-center cursor-pointer select-none`}
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

function CourtZoneModal({ modalData, onSelectZone, onSkip, onClose }) {
    const isAce = modalData.statKey === 'service_ace';

    const zones = [
        { key: 'zone_1', label: 'ZONA 1', style: { top: '3%', left: '64%', width: '13%', height: '14%' } },
        { key: 'zone_2', label: 'ZONA 2', style: { top: '4%', right: '2%', width: '12%', height: '15%' } },
        { key: 'zone_3', label: 'ZONA 3', style: { top: '21%', right: '2%', width: '12%', height: '15%' } },
        { key: 'zone_4', label: 'ZONA 4', style: { top: '38%', right: '2%', width: '12%', height: '15%' } },
        { key: 'zone_5', label: 'ZONA 5', style: { top: '55%', right: '2%', width: '12%', height: '15%' } },
        { key: 'zone_6', label: 'ZONA 6', style: { top: '72%', right: '2%', width: '12%', height: '15%' } },
        { key: 'zone_7', label: 'ZONA 7', style: { top: '83%', left: '64%', width: '13%', height: '14%' } },
        { key: 'zone_8', label: 'ZONA 8', style: { top: '68%', left: '49%', width: '14%', height: '26%' } },
        { key: 'zone_9', label: 'ZONA 9', style: { top: '32%', left: '49%', width: '14%', height: '34%' } },
        { key: 'zone_10', label: 'ZONA 10', style: { top: '4%', left: '49%', width: '14%', height: '26%' } },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-surface-900 border border-surface-700/80 rounded-2xl max-w-xl w-full p-4 sm:p-5 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between pb-3 border-b border-surface-800 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1 ${isAce ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'}`}>
                            <span>{isAce ? '⚡' : '🏐'}</span>
                            <span>{modalData.statLabel}</span>
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-400 hover:text-surface-200 text-sm font-bold flex items-center justify-center transition-colors cursor-pointer"
                    >
                        ✕
                    </button>
                </div>

                <div className="flex-1 relative w-full aspect-[2.1/1] rounded-xl border-2 border-emerald-500/60 bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950 overflow-hidden shadow-inner my-3">
                    {zones.map((z) => (
                        <button
                            key={z.key}
                            type="button"
                            style={z.style}
                            onClick={() => onSelectZone(z.key)}
                            className="absolute rounded-xl border flex items-center justify-center transition-all duration-150 shadow-lg bg-emerald-950/80 hover:bg-emerald-600 active:bg-amber-500 border-emerald-400/60 hover:border-amber-300 active:scale-90 text-white cursor-pointer"
                        >
                            <span className="text-[10px] sm:text-xs font-black text-emerald-200">{z.label}</span>
                        </button>
                    ))}
                </div>

                <div className="flex items-center justify-between gap-3 pt-3 border-t border-surface-800 mt-2 flex-shrink-0">
                    <button
                        type="button"
                        onClick={onSkip}
                        className="px-4 py-2.5 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-300 text-xs md:text-sm font-bold transition-all active:scale-95 cursor-pointer"
                    >
                        ⏭️ Catat Tanpa Zona
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl bg-surface-700 hover:bg-surface-600 text-surface-200 text-xs md:text-sm font-bold transition-all active:scale-95 cursor-pointer"
                    >
                        Batal
                    </button>
                </div>
            </div>
        </div>
    );
}
