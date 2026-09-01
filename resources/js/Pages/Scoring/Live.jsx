import { Head, usePage, router } from '@inertiajs/react';
import { useState, useCallback, useEffect, useMemo } from 'react';

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

export default function LiveScoring({ match: initialMatch }) {
    const [matchData, setMatchData] = useState(initialMatch);
    const [selectedAthlete, setSelectedAthlete] = useState({ home: null, away: null });
    const [scoreAnim, setScoreAnim] = useState({ home: false, away: false });
    const [showSetup, setShowSetup] = useState(matchData.status === 'scheduled');
    const [setupData, setSetupData] = useState({ court_number: matchData.court_number || 1, max_sets: matchData.max_sets || 3 });
    const [processing, setProcessing] = useState(false);
    const [statsCache, setStatsCache] = useState({});

    // Active on-court lineup per side (stores array of athlete IDs currently active on court)
    const [courtLineup, setCourtLineup] = useState({ home: [], away: [] });

    // Explicitly selected set ID so user can freely click between Set 1, Set 2, Set 3, etc.
    const [selectedSetId, setSelectedSetId] = useState(null);

    // Edit Mode state (when set/match is finished, inputs are locked unless edit mode is enabled)
    const [isEditMode, setIsEditMode] = useState(false);
    const [viewFinishedSummary, setViewFinishedSummary] = useState(matchData.status === 'finished');

    // Modal popup for picking court zone upon clicking Service In or Service Ace
    const [zoneModal, setZoneModal] = useState(null);
    // Modal for Lineup and Quick Add Athlete on-the-fly
    const [lineupModal, setLineupModal] = useState(null); // { side: 'home' | 'away' }
    // Modal for Sub-Regu Transition
    const [reguTransition, setReguTransition] = useState(null);

    const isTeamMode = matchData.match_mode === 'team_regu' || matchData.match_mode === 'team_double';

    // Identify active live set
    const liveSet = useMemo(() => {
        return matchData.sets?.find(s => s.status === 'live') 
            || matchData.sets?.find(s => s.status === 'pending') 
            || matchData.sets?.[0];
    }, [matchData.sets]);

    // Active sub-regu index (0 = Regu 1, 1 = Regu 2, 2 = Regu 3)
    const initialSubRegu = useMemo(() => {
        if (!isTeamMode || !liveSet) return 0;
        return Math.floor(((liveSet.set_number || 1) - 1) / 3);
    }, [isTeamMode, liveSet]);

    const [activeSubRegu, setActiveSubRegu] = useState(initialSubRegu);

    useEffect(() => {
        if (isTeamMode && liveSet && !selectedSetId) {
            const sub = Math.floor(((liveSet.set_number || 1) - 1) / 3);
            setActiveSubRegu(sub);
        }
    }, [isTeamMode, liveSet?.id, selectedSetId]);

    // Clean Team Names
    const homeTeamName = useMemo(() => {
        return isTeamMode 
            ? (matchData.home_super_team?.name || matchData.home_display_name || 'Tim Tuan Rumah')
            : (matchData.home_team?.name || matchData.home_display_name || 'Tim Tuan Rumah');
    }, [isTeamMode, matchData]);

    const awayTeamName = useMemo(() => {
        return isTeamMode 
            ? (matchData.away_super_team?.name || matchData.away_display_name || 'Tim Tamu')
            : (matchData.away_team?.name || matchData.away_display_name || 'Tim Tamu');
    }, [isTeamMode, matchData]);

    // All registered athletes pooled together
    const homeAthletes = useMemo(() => {
        if (!isTeamMode) return matchData.home_team?.athletes || [];
        const all = matchData.home_super_team?.members?.flatMap(m => m.athletes || []) || matchData.home_team?.athletes || [];
        const map = new Map();
        all.forEach(a => {
            if (a && a.id && !map.has(a.id)) {
                map.set(a.id, a);
            }
        });
        return Array.from(map.values()).sort((a, b) => (a.jersey_number || 0) - (b.jersey_number || 0));
    }, [isTeamMode, matchData]);

    const awayAthletes = useMemo(() => {
        if (!isTeamMode) return matchData.away_team?.athletes || [];
        const all = matchData.away_super_team?.members?.flatMap(m => m.athletes || []) || matchData.away_team?.athletes || [];
        const map = new Map();
        all.forEach(a => {
            if (a && a.id && !map.has(a.id)) {
                map.set(a.id, a);
            }
        });
        return Array.from(map.values()).sort((a, b) => (a.jersey_number || 0) - (b.jersey_number || 0));
    }, [isTeamMode, matchData]);

    // Initialize or adapt active court lineup (default 3 starters)
    useEffect(() => {
        if (homeAthletes.length > 0) {
            setCourtLineup(prev => {
                if (prev.home.length > 0) {
                    const valid = prev.home.filter(id => homeAthletes.some(a => a.id === id));
                    if (valid.length > 0) return { ...prev, home: valid };
                }
                const startOffset = isTeamMode ? (activeSubRegu * 3) % Math.max(1, homeAthletes.length) : 0;
                const defaultStarters = homeAthletes.slice(startOffset, startOffset + 3).map(a => a.id);
                const finalStarters = defaultStarters.length > 0 ? defaultStarters : homeAthletes.slice(0, 3).map(a => a.id);
                return { ...prev, home: finalStarters };
            });
        }
    }, [homeAthletes, isTeamMode, activeSubRegu]);

    useEffect(() => {
        if (awayAthletes.length > 0) {
            setCourtLineup(prev => {
                if (prev.away.length > 0) {
                    const valid = prev.away.filter(id => awayAthletes.some(a => a.id === id));
                    if (valid.length > 0) return { ...prev, away: valid };
                }
                const startOffset = isTeamMode ? (activeSubRegu * 3) % Math.max(1, awayAthletes.length) : 0;
                const defaultStarters = awayAthletes.slice(startOffset, startOffset + 3).map(a => a.id);
                const finalStarters = defaultStarters.length > 0 ? defaultStarters : awayAthletes.slice(0, 3).map(a => a.id);
                return { ...prev, away: finalStarters };
            });
        }
    }, [awayAthletes, isTeamMode, activeSubRegu]);

    // Target team IDs for backend quick-athlete endpoint
    const homeTargetTeamId = useMemo(() => {
        if (!isTeamMode) return matchData.home_team?.id || matchData.home_team_id;
        return matchData.home_super_team?.members?.[activeSubRegu]?.id 
            || matchData.home_super_team?.members?.[0]?.id 
            || matchData.home_team_id;
    }, [isTeamMode, matchData, activeSubRegu]);

    const awayTargetTeamId = useMemo(() => {
        if (!isTeamMode) return matchData.away_team?.id || matchData.away_team_id;
        return matchData.away_super_team?.members?.[activeSubRegu]?.id 
            || matchData.away_super_team?.members?.[0]?.id 
            || matchData.away_team_id;
    }, [isTeamMode, matchData, activeSubRegu]);

    const activeSetOffset = isTeamMode ? activeSubRegu * 3 : 0;
    const activeSets = useMemo(() => {
        if (!isTeamMode) return matchData.sets || [];
        return matchData.sets?.filter(s => s.set_number >= activeSetOffset + 1 && s.set_number <= activeSetOffset + 3) || [];
    }, [isTeamMode, matchData.sets, activeSetOffset]);

    // Current selected set (can be chosen by clicking any set in bottom bar)
    const currentSet = useMemo(() => {
        if (selectedSetId) {
            const found = matchData.sets?.find(s => s.id === selectedSetId);
            if (found) return found;
        }
        return activeSets?.find(s => s.status === 'live') 
            || activeSets?.find(s => s.status === 'pending') 
            || activeSets?.[0];
    }, [selectedSetId, matchData.sets, activeSets]);

    const isLive = matchData.status === 'live';
    const isSetup = matchData.status === 'setup';

    // Finished & Lock conditions
    const isSetFinished = currentSet?.status === 'finished';
    const isMatchFinished = matchData.status === 'finished';
    const isLocked = (isSetFinished || isMatchFinished) && !isEditMode;

    // Compute Regu overview statistics for Team Mode (Regu 1, 2, 3)
    const reguSummaries = useMemo(() => {
        if (!isTeamMode || !matchData.sets) return [];

        return [0, 1, 2].map((rIdx) => {
            const rSets = matchData.sets.filter(s => s.set_number >= rIdx * 3 + 1 && s.set_number <= rIdx * 3 + 3);
            const finishedSets = rSets.filter(s => s.status === 'finished');
            const homeWon = finishedSets.filter(s => s.home_score > s.away_score).length;
            const awayWon = finishedSets.filter(s => s.away_score > s.home_score).length;
            const isFinished = homeWon >= 2 || awayWon >= 2 || (homeWon + awayWon >= 3);
            const isCurrent = rIdx === activeSubRegu;
            const winner = (homeWon >= 2 || (isFinished && homeWon > awayWon))
                ? 'home'
                : ((awayWon >= 2 || (isFinished && awayWon > homeWon)) ? 'away' : null);

            return {
                index: rIdx,
                label: `Regu ${rIdx + 1}`,
                sets: rSets,
                homeWon,
                awayWon,
                isFinished,
                isCurrent,
                winner,
            };
        });
    }, [isTeamMode, matchData.sets, activeSubRegu]);

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

    // Switch active regu session
    const handleSwitchRegu = (rIdx) => {
        setActiveSubRegu(rIdx);
        const offset = isTeamMode ? rIdx * 3 : 0;
        const rSets = matchData.sets?.filter(s => s.set_number >= offset + 1 && s.set_number <= offset + 3) || [];
        const target = rSets.find(s => s.status === 'live') || rSets.find(s => s.status === 'pending') || rSets[0];
        if (target) {
            setSelectedSetId(target.id);
        }
    };

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
        if (isLocked) {
            alert('Set/Pertandingan ini telah selesai dan terkunci. Silakan klik "Aktifkan Mode Edit" untuk melakukan koreksi skor.');
            return;
        }
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

    const handleStat = async (athleteId, teamId, stat, action, zone = null, side = null) => {
        if (!currentSet) return;
        if (isLocked) {
            alert('Set/Pertandingan ini telah selesai dan terkunci. Silakan klik "Aktifkan Mode Edit" untuk melakukan koreksi.');
            return;
        }
        try {
            const res = await fetchPost(route('scoring.update-stat', matchData.id), {
                match_set_id: currentSet.id,
                athlete_id: athleteId,
                team_id: teamId,
                stat,
                action,
                zone,
                side,
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

    // Quick Add Athlete (Input Dadakan Nomor Punggung)
    const handleQuickAddAthlete = async ({ teamId, jerseyNumber, position, side }) => {
        try {
            const res = await fetchPost(route('scoring.quick-athlete', matchData.id), {
                team_id: teamId,
                jersey_number: parseInt(jerseyNumber),
                name: `${position || 'Pemain'} #${jerseyNumber}`,
                position: position || 'Pemain',
            });
            if (res.success && res.match) {
                setMatchData(res.match);
                if (res.athlete) {
                    setCourtLineup(prev => ({
                        ...prev,
                        [side]: Array.from(new Set([...prev[side], res.athlete.id])),
                    }));
                    setSelectedAthlete(prev => ({ ...prev, [side]: res.athlete }));
                }
                return res.athlete;
            }
        } catch (err) {
            console.error('Quick add athlete error:', err);
            alert('Gagal menambahkan nomor punggung. Pastikan nomor valid.');
        }
    };

    const handleActionWithZone = (athlete, teamTargetId, statKey, action = 'increment', statLabel = '', side = null) => {
        if (isLocked) {
            alert('Set/Pertandingan ini telah selesai dan terkunci. Silakan klik "Aktifkan Mode Edit" untuk melakukan koreksi.');
            return;
        }
        const isHome = teamTargetId === homeTargetTeamId || side === 'home';
        const targetAthlete = athlete || (isHome ? homeAthletes[0] : awayAthletes[0]) || { id: 1, jersey_number: 1 };
        const isZoneTrigger = statKey.endsWith('_in') || statKey.endsWith('_ace');

        if (isZoneTrigger) {
            setZoneModal({
                athlete: targetAthlete,
                teamName: isHome ? homeTeamName : awayTeamName,
                teamTargetId,
                statKey,
                action,
                side: isHome ? 'home' : 'away',
                statLabel: statLabel || (statKey.endsWith('_ace') ? 'Ace' : 'In'),
            });
        } else {
            handleStat(targetAthlete.id, teamTargetId, statKey, action, null, isHome ? 'home' : 'away');
        }
    };

    const handleZoneSelect = (zoneKey, action = 'increment') => {
        if (!zoneModal) return;
        if (isLocked) {
            alert('Set/Pertandingan ini telah selesai dan terkunci. Silakan klik "Aktifkan Mode Edit" untuk melakukan koreksi.');
            return;
        }
        const targetAthleteId = zoneModal.athlete?.id || homeAthletes[0]?.id;
        const targetTeamId = zoneModal.teamTargetId || homeTargetTeamId;

        if (!targetAthleteId) {
            console.error('No athlete found for zone update');
            return;
        }

        handleStat(targetAthleteId, targetTeamId, zoneModal.statKey, action, zoneKey, zoneModal.side);
        setZoneModal(null);
    };

    const handleFinishSet = async () => {
        if (!currentSet) return;
        const confirmMsg = currentSet.status === 'finished'
            ? `Set ${currentSet.set_number} sudah selesai. Simpan perubahan dan kunci kembali?`
            : `Yakin ingin mengakhiri Set ${currentSet.set_number}?`;

        if (!confirm(confirmMsg)) return;

        if (currentSet.status === 'finished') {
            setIsEditMode(false);
            return;
        }

        setProcessing(true);
        try {
            const res = await fetchPost(route('scoring.finish-set', matchData.id), {
                match_set_id: currentSet.id,
            });

            if (res.match) {
                setMatchData(res.match);
            }

            if (res.matchFinished) {
                const winnerName = res.winner === (matchData.home_super_team_id || matchData.home_team_id)
                    ? homeTeamName 
                    : awayTeamName;
                
                alert(`🎉 Pertandingan telah selesai!\nPemenang: ${winnerName}`);
                setViewFinishedSummary(true);
                setProcessing(false);
                return;
            }

            // If a Regu just finished in Team Mode
            if (res.reguFinished && isTeamMode) {
                const subNum = (res.reguIndex !== undefined ? res.reguIndex : activeSubRegu) + 1;
                const winnerName = res.reguWinner === matchData.home_super_team_id ? homeTeamName : awayTeamName;

                if (res.currentSet) {
                    setSelectedSetId(res.currentSet.id);
                }

                setReguTransition({
                    reguNumber: subNum,
                    winnerName,
                    regusWonHome: res.regusWonHome ?? superTeamScore.home,
                    regusWonAway: res.regusWonAway ?? superTeamScore.away,
                    nextReguIndex: res.nextReguIndex ?? (activeSubRegu + 1),
                });
                setProcessing(false);
                return;
            }

            if (res.currentSet) {
                setSelectedSetId(res.currentSet.id);
            }

            setProcessing(false);
        } catch (err) {
            console.error('Finish set error:', err);
            setProcessing(false);
        }
    };

    // Filter active athletes on court based on courtLineup
    const activeHomeOnCourt = useMemo(() => {
        if (homeAthletes.length === 0) return [];
        const activeIds = new Set(courtLineup.home);
        const filtered = homeAthletes.filter(a => activeIds.has(a.id));
        return filtered.length > 0 ? filtered : homeAthletes.slice(0, 3);
    }, [homeAthletes, courtLineup.home]);

    const activeAwayOnCourt = useMemo(() => {
        if (awayAthletes.length === 0) return [];
        const activeIds = new Set(courtLineup.away);
        const filtered = awayAthletes.filter(a => activeIds.has(a.id));
        return filtered.length > 0 ? filtered : awayAthletes.slice(0, 3);
    }, [awayAthletes, courtLineup.away]);

    // ─── Tampilan Hasil Pertandingan Selesai (Summary Screen) ──
    if (matchData.status === 'finished' && viewFinishedSummary) {
        const winnerId = isTeamMode ? matchData.winner_super_team_id : matchData.winner_team_id;
        const isHomeWinner = winnerId === (isTeamMode ? matchData.home_super_team_id : matchData.home_team_id);
        const winnerName = isHomeWinner ? homeTeamName : awayTeamName;

        return (
            <div className="min-h-screen bg-surface-950 flex flex-col justify-center items-center p-4 sm:p-6">
                <Head title={`Hasil Selesai: ${homeTeamName} vs ${awayTeamName}`} />
                <div className="max-w-xl w-full space-y-6 text-center animate-fade-in">
                    <div className="rounded-3xl border-2 border-emerald-500/40 bg-surface-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
                        <div className="w-20 h-20 rounded-3xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-4xl mx-auto mb-4 shadow-lg shadow-amber-950/40 animate-bounce">
                            🏆
                        </div>
                        <span className="inline-block px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-2">
                            Pertandingan Selesai
                        </span>
                        <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                            Pemenang: <span className="text-emerald-400">{winnerName || '—'}</span>
                        </h2>

                        {/* Final Score Board */}
                        <div className="flex items-center justify-center gap-6 my-6 p-4 rounded-2xl bg-surface-950/60 border border-surface-800">
                            <div className="text-center flex-1">
                                <p className="text-xs sm:text-sm font-bold text-primary-300 truncate">{homeTeamName}</p>
                                <p className="text-3xl sm:text-4xl font-black text-white mt-1 font-mono">
                                    {isTeamMode ? superTeamScore.home : (matchData.sets?.filter(s => s.winner_team_id === matchData.home_team_id).length || 0)}
                                </p>
                            </div>
                            <span className="text-lg font-black text-surface-500">VS</span>
                            <div className="text-center flex-1">
                                <p className="text-xs sm:text-sm font-bold text-accent-300 truncate">{awayTeamName}</p>
                                <p className="text-3xl sm:text-4xl font-black text-white mt-1 font-mono">
                                    {isTeamMode ? superTeamScore.away : (matchData.sets?.filter(s => s.winner_team_id === matchData.away_team_id).length || 0)}
                                </p>
                            </div>
                        </div>

                        {/* Regu breakdown */}
                        {isTeamMode ? (
                            <div className="space-y-2.5 mb-6 text-left">
                                <p className="text-[11px] font-black uppercase tracking-wider text-surface-400 text-center mb-1">Rincian Hasil Tiap Sesi Regu</p>
                                {reguSummaries.map((r) => {
                                    const finishedSetsInR = r.sets.filter(s => s.status === 'finished');
                                    return (
                                        <div key={r.index} className="p-3 rounded-2xl bg-surface-950/80 border border-surface-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                            <div className="flex flex-col gap-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-extrabold text-white text-sm">{r.label}</span>
                                                    <span className="px-2 py-0.5 rounded-md bg-surface-800 text-surface-200 font-mono font-bold text-[11px] border border-surface-700">
                                                        Set: {r.homeWon} - {r.awayWon}
                                                    </span>
                                                </div>
                                                <div className="text-surface-400 text-[11px] font-mono flex flex-wrap gap-1.5 mt-0.5">
                                                    {finishedSetsInR.length > 0 ? (
                                                        finishedSetsInR.map(s => (
                                                            <span key={s.id} className="bg-surface-900/90 px-2 py-0.5 rounded-lg border border-surface-800 text-surface-300">
                                                                Set {s.set_number}: <strong className="text-white">{s.home_score}-{s.away_score}</strong>
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="italic text-surface-500">Belum dimainkan</span>
                                                    )}
                                                </div>
                                            </div>
                                            <span className={`self-start sm:self-center px-3 py-1 rounded-xl font-black text-xs shrink-0 ${
                                                r.winner === 'home' 
                                                    ? 'bg-primary-500/20 text-primary-300 border border-primary-500/40 shadow-xs' 
                                                    : r.winner === 'away' 
                                                    ? 'bg-accent-500/20 text-accent-300 border border-accent-500/40 shadow-xs' 
                                                    : 'bg-surface-800 text-surface-400 border border-surface-700'
                                            }`}>
                                                {r.winner === 'home' ? `Menang ${r.homeWon} - ${r.awayWon}` : r.winner === 'away' ? `Kalah ${r.homeWon} - ${r.awayWon}` : (r.homeWon + r.awayWon > 0 ? `${r.homeWon} - ${r.awayWon}` : '—')}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-wrap justify-center gap-2 mb-6">
                                {matchData.sets?.filter(s => s.status === 'finished').map(s => (
                                    <div key={s.id} className="text-xs px-3 py-1.5 rounded-xl bg-surface-800 border border-surface-700 text-surface-200 font-bold">
                                        Set {s.set_number}: <strong className="text-emerald-300 font-mono">{s.home_score} - {s.away_score}</strong>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="space-y-3 pt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setViewFinishedSummary(false);
                                    setIsEditMode(true);
                                }}
                                className="w-full py-3.5 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border-2 border-amber-500/50 text-amber-300 font-black text-sm active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <span>✏️</span>
                                <span>Buka Layar Scoring & Koreksi Data</span>
                            </button>

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

    // ─── Setup Screen ──────────────────────────────────────────
    if (showSetup || !isLive) {
        return (
            <div className="min-h-screen bg-surface-950 flex flex-col">
                <Head title="Setup Pertandingan" />
                <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
                    <div className="max-w-lg w-full">
                        <div className="rounded-3xl border border-surface-700/50 bg-surface-900/60 p-6 sm:p-8 text-center mb-6 shadow-2xl backdrop-blur-md">
                            <div className="flex items-center justify-center gap-2 mb-3">
                                <span className="inline-block px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-surface-800 text-emerald-400 border border-surface-700">
                                    {matchData.stage?.toUpperCase()} • {isTeamMode ? 'MODE TEAM (3 REGU)' : 'MODE REGULER'}
                                </span>
                                <span className="inline-block px-3 py-1 rounded-full text-[11px] font-extrabold text-surface-300 bg-surface-800 border border-surface-700">
                                    🏟️ Lapangan {matchData.court_number || setupData.court_number || '-'}
                                </span>
                            </div>

                            <div className="flex items-center justify-center gap-4 my-6">
                                <div className="text-center flex-1 min-w-0">
                                    <div className="w-16 h-16 rounded-2xl bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-xl font-black text-primary-300 mx-auto mb-2 shadow-inner">
                                        {homeTeamName?.charAt(0) || 'H'}
                                    </div>
                                    <h3 className="font-extrabold text-surface-100 text-sm sm:text-base truncate">{homeTeamName}</h3>
                                    {isTeamMode && <span className="text-[11px] text-primary-400 font-bold block mt-0.5">3 Sesi Regu (BO3)</span>}
                                </div>

                                <span className="text-xl sm:text-2xl font-black text-surface-600">VS</span>

                                <div className="text-center flex-1 min-w-0">
                                    <div className="w-16 h-16 rounded-2xl bg-accent-500/20 border border-accent-500/30 flex items-center justify-center text-xl font-black text-accent-300 mx-auto mb-2 shadow-inner">
                                        {awayTeamName?.charAt(0) || 'A'}
                                    </div>
                                    <h3 className="font-extrabold text-surface-100 text-sm sm:text-base truncate">{awayTeamName}</h3>
                                    {isTeamMode && <span className="text-[11px] text-accent-400 font-bold block mt-0.5">3 Sesi Regu (BO3)</span>}
                                </div>
                            </div>
                        </div>

                        {showSetup ? (
                            <form onSubmit={handleSetupAndStart} className="rounded-3xl border border-surface-700/50 bg-surface-900/60 p-6 space-y-4 shadow-xl backdrop-blur-md">
                                <div className="flex items-center justify-between pb-2 border-b border-surface-800">
                                    <h3 className="font-black text-surface-100 text-sm flex items-center gap-2">
                                        <span>⚙️</span> Pengaturan Lapangan & Pertandingan
                                    </h3>
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
                                    <label className="block text-xs font-bold text-surface-300 mb-1">Nomor Lapangan</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={setupData.court_number}
                                        onChange={(e) => setSetupData(prev => ({ ...prev, court_number: parseInt(e.target.value) || 1 }))}
                                        className="w-full rounded-xl bg-surface-800/80 border-surface-700 text-surface-100 text-sm font-bold focus:border-emerald-500 focus:ring-emerald-500"
                                    />
                                </div>
                                {!isTeamMode && (
                                    <div>
                                        <label className="block text-xs font-bold text-surface-300 mb-1">Maksimal Set</label>
                                        <select
                                            value={setupData.max_sets}
                                            onChange={(e) => setSetupData(prev => ({ ...prev, max_sets: parseInt(e.target.value) }))}
                                            className="w-full rounded-xl bg-surface-800/80 border-surface-700 text-surface-100 text-sm font-bold focus:border-emerald-500 focus:ring-emerald-500"
                                        >
                                            <option value={3}>3 Set (Best of 3)</option>
                                            <option value={5}>5 Set (Best of 5)</option>
                                        </select>
                                    </div>
                                )}
                                {isTeamMode && (
                                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 font-semibold">
                                        ℹ️ Mode Team menggunakan 3 Sesi Regu (Maks 9 Set). Setiap Regu memainkan format Best of 3.
                                    </div>
                                )}
                                <div className="flex flex-col gap-2 pt-2">
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-sm hover:from-emerald-500 hover:to-teal-500 active:scale-95 transition-all shadow-lg shadow-emerald-950/40 disabled:opacity-50 cursor-pointer"
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
                                    ⚙️ Ubah Nomor Lapangan & Pengaturan
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ─── Live Scoring Screen ──────────────────────────────────
    return (
        <div className="h-screen bg-surface-950 flex flex-col overflow-hidden select-none">
            <Head title={`Live Scoring - ${homeTeamName} vs ${awayTeamName}`} />

            {/* 1. Header Scoring & Tab Sesi Regu */}
            <div className="flex-shrink-0 bg-surface-900 border-b border-surface-700/50 px-2 sm:px-4 py-2">
                {/* Aggregate Header (If Team Mode) */}
                {isTeamMode && (
                    <div className="max-w-5xl mx-auto mb-1.5 pb-1.5 border-b border-surface-800/80 flex items-center justify-between gap-2">
                        {/* Home Score */}
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs sm:text-sm font-black text-primary-300 truncate max-w-[130px] sm:max-w-[200px]">
                                {homeTeamName}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-primary-500/20 text-primary-300 border border-primary-500/40 text-xs font-black font-mono">
                                {superTeamScore.home}
                            </span>
                        </div>

                        {/* Regu Navigation Pills */}
                        <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                            {reguSummaries.map((r) => {
                                const isSelected = r.index === activeSubRegu;
                                return (
                                    <button
                                        key={r.index}
                                        type="button"
                                        onClick={() => handleSwitchRegu(r.index)}
                                        className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                                            isSelected
                                                ? 'bg-emerald-500 text-surface-950 shadow-md shadow-emerald-950/40 ring-1 ring-emerald-300'
                                                : r.isFinished
                                                ? 'bg-surface-800/90 text-surface-300 border border-surface-700 hover:bg-surface-700'
                                                : 'bg-surface-950/60 text-surface-500 border border-surface-800 hover:text-surface-300'
                                        }`}
                                    >
                                        <span>{r.isFinished ? '✅' : isSelected ? '⚡' : '⏳'}</span>
                                        <span>{r.label}</span>
                                        {r.isFinished && <span className="font-mono text-[9px]">({r.homeWon}-{r.awayWon})</span>}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Away Score */}
                        <div className="flex items-center gap-2 min-w-0 justify-end">
                            <span className="px-2 py-0.5 rounded-md bg-accent-500/20 text-accent-300 border border-accent-500/40 text-xs font-black font-mono">
                                {superTeamScore.away}
                            </span>
                            <span className="text-xs sm:text-sm font-black text-accent-300 truncate max-w-[130px] sm:max-w-[200px] text-right">
                                {awayTeamName}
                            </span>
                        </div>
                    </div>
                )}

                {/* Scoreboard Controls Bar (Points Increment/Decrement) */}
                <div className="flex items-center justify-between gap-2 max-w-5xl mx-auto">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <div className="min-w-0 text-right mr-1 hidden xs:block flex-1">
                            <p className="text-xs sm:text-sm font-extrabold text-primary-300 truncate">{homeTeamName}</p>
                            {isTeamMode && <span className="text-[10px] text-primary-400/80 font-bold block leading-none">Regu {activeSubRegu + 1}</span>}
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => handleScore('home', 'decrement')}
                                disabled={isLocked}
                                className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-surface-800 hover:bg-surface-700 active:scale-90 text-surface-300 text-base font-black transition-all flex items-center justify-center border border-surface-700 ${
                                    isLocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                                }`}
                            >
                                −
                            </button>
                            <button
                                onClick={() => handleScore('home', 'increment')}
                                disabled={isLocked}
                                className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-primary-600 hover:bg-primary-500 active:scale-90 text-white text-base font-black transition-all flex items-center justify-center shadow-md shadow-primary-950/40 ${
                                    isLocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                                }`}
                            >
                                +
                            </button>
                        </div>
                    </div>

                    {/* Set Indicator & Large Live Score */}
                    <div className="flex flex-col items-center px-2 flex-shrink-0">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] uppercase font-black tracking-wider text-surface-400">
                                Set {currentSet?.set_number || 1} {isTeamMode && `(Regu ${activeSubRegu + 1})`}
                            </span>
                            {isSetFinished && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-black">
                                    SELESAI
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-2xl sm:text-4xl font-black font-mono">
                            <span className="text-primary-400">{currentSet?.home_score ?? 0}</span>
                            <span className="text-surface-600">:</span>
                            <span className="text-accent-400">{currentSet?.away_score ?? 0}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => handleScore('away', 'decrement')}
                                disabled={isLocked}
                                className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-surface-800 hover:bg-surface-700 active:scale-90 text-surface-300 text-base font-black transition-all flex items-center justify-center border border-surface-700 ${
                                    isLocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                                }`}
                            >
                                −
                            </button>
                            <button
                                onClick={() => handleScore('away', 'increment')}
                                disabled={isLocked}
                                className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-accent-600 hover:bg-accent-500 active:scale-90 text-white text-base font-black transition-all flex items-center justify-center shadow-md shadow-accent-950/40 ${
                                    isLocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                                }`}
                            >
                                +
                            </button>
                        </div>
                        <div className="min-w-0 text-left ml-1 hidden xs:block flex-1">
                            <p className="text-xs sm:text-sm font-extrabold text-accent-300 truncate">{awayTeamName}</p>
                            {isTeamMode && <span className="text-[10px] text-accent-400/80 font-bold block leading-none">Regu {activeSubRegu + 1}</span>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Lock / Edit Mode Indicator Banner */}
            {isLocked && (
                <div className="bg-amber-950/80 border-y border-amber-500/40 px-3 py-1.5 flex items-center justify-between gap-2 text-xs flex-shrink-0 animate-fade-in">
                    <div className="flex items-center gap-2 text-amber-300 font-bold min-w-0">
                        <span className="text-base flex-shrink-0">🔒</span>
                        <span className="truncate">
                            {isMatchFinished ? 'Pertandingan Selesai' : `Set ${currentSet?.set_number} telah selesai`}: Input dikunci agar aman.
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsEditMode(true)}
                        className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-surface-950 font-black text-xs shadow-md active:scale-95 transition-all cursor-pointer flex-shrink-0 flex items-center gap-1"
                    >
                        <span>✏️</span>
                        <span>Aktifkan Mode Edit</span>
                    </button>
                </div>
            )}

            {!isLocked && (isSetFinished || isMatchFinished) && isEditMode && (
                <div className="bg-emerald-950/80 border-y border-emerald-500/40 px-3 py-1.5 flex items-center justify-between gap-2 text-xs flex-shrink-0 animate-fade-in">
                    <div className="flex items-center gap-2 text-emerald-300 font-bold min-w-0">
                        <span className="text-base flex-shrink-0">✏️</span>
                        <span className="truncate">
                            Mode Edit Aktif ({isMatchFinished ? 'Pertandingan Selesai' : `Set ${currentSet?.set_number}`}): Anda dapat mengoreksi skor & statistik.
                        </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {isMatchFinished && (
                            <button
                                type="button"
                                onClick={() => setViewFinishedSummary(true)}
                                className="px-2.5 py-1 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-200 font-bold text-xs active:scale-95 transition-all cursor-pointer"
                            >
                                🏆 Ringkasan Hasil
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => setIsEditMode(false)}
                            className="px-3 py-1 rounded-xl bg-surface-800 hover:bg-surface-700 text-emerald-300 border border-emerald-500/30 font-black text-xs shadow-md active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                        >
                            <span>🔒</span>
                            <span>Kunci Kembali</span>
                        </button>
                    </div>
                </div>
            )}

            {/* 2. Main Pitch / Team Athlete & Action Side Panel */}
            <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
                <TeamSide
                    teamName={homeTeamName}
                    isTeamMode={isTeamMode}
                    subIndex={activeSubRegu}
                    activeAthletes={activeHomeOnCourt}
                    selectedAthlete={selectedAthlete.home}
                    onSelectAthlete={(a) => setSelectedAthlete(prev => ({ ...prev, home: a }))}
                    onOpenLineup={() => setLineupModal({ side: 'home', teamName: homeTeamName, targetTeamId: homeTargetTeamId, subIndex: activeSubRegu, allAthletes: homeAthletes, activeIds: courtLineup.home, isLocked })}
                    onStatChange={(athleteId, stat, action, zone, s) => handleStat(athleteId, homeTargetTeamId, stat, action, zone, s || 'home')}
                    onActionWithZone={(athlete, statKey, action, statLabel) => handleActionWithZone(athlete, homeTargetTeamId, statKey, action, statLabel, 'home')}
                    getStats={getAthleteStats}
                    isLocked={isLocked}
                    side="home"
                    color="primary"
                />

                <div className="hidden lg:block w-px bg-surface-700/50 flex-shrink-0" />
                <div className="lg:hidden h-px bg-surface-700/50 flex-shrink-0" />

                <TeamSide
                    teamName={awayTeamName}
                    isTeamMode={isTeamMode}
                    subIndex={activeSubRegu}
                    activeAthletes={activeAwayOnCourt}
                    selectedAthlete={selectedAthlete.away}
                    onSelectAthlete={(a) => setSelectedAthlete(prev => ({ ...prev, away: a }))}
                    onOpenLineup={() => setLineupModal({ side: 'away', teamName: awayTeamName, targetTeamId: awayTargetTeamId, subIndex: activeSubRegu, allAthletes: awayAthletes, activeIds: courtLineup.away, isLocked })}
                    onStatChange={(athleteId, stat, action, zone, s) => handleStat(athleteId, awayTargetTeamId, stat, action, zone, s || 'away')}
                    onActionWithZone={(athlete, statKey, action, statLabel) => handleActionWithZone(athlete, awayTargetTeamId, statKey, action, statLabel, 'away')}
                    getStats={getAthleteStats}
                    isLocked={isLocked}
                    side="away"
                    color="accent"
                />
            </div>

            {/* 3. Bottom Bar: Set Navigation Buttons & Finish Set */}
            <div className="flex-shrink-0 bg-surface-900 border-t border-surface-700/50 px-3 py-2">
                <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
                    {/* Interactive Set Pills */}
                    <div className="flex items-center gap-2 overflow-x-auto py-0.5">
                        <span className="text-[11px] font-bold text-surface-400 hidden sm:inline flex-shrink-0">
                            Pilih Set:
                        </span>
                        {activeSets.map((s) => {
                            const isCurrent = s.id === currentSet?.id;
                            const isLiveSet = s.status === 'live';
                            const isFinished = s.status === 'finished';

                            return (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedSetId(s.id);
                                        if (isTeamMode) {
                                            const sub = Math.floor(((s.set_number || 1) - 1) / 3);
                                            setActiveSubRegu(sub);
                                        }
                                    }}
                                    className={`text-xs px-3 py-1.5 rounded-xl font-bold font-mono whitespace-nowrap transition-all duration-150 active:scale-95 cursor-pointer flex items-center gap-1.5 border select-none ${
                                        isCurrent
                                            ? 'bg-emerald-500/25 text-emerald-200 border-emerald-400 ring-2 ring-emerald-400/40 shadow-md shadow-emerald-950/40 scale-105'
                                            : isFinished
                                            ? 'bg-surface-800/90 text-surface-300 hover:bg-surface-700 hover:text-white border-surface-700'
                                            : 'bg-surface-900/60 text-surface-400 hover:text-surface-200 border-surface-800'
                                    }`}
                                    title={`Klik untuk membuka & melihat Set ${s.set_number}`}
                                >
                                    <span>{isLiveSet ? '⚡' : isFinished ? '✅' : '⏳'}</span>
                                    <span>Set {s.set_number}:</span>
                                    <strong className={`${isCurrent ? 'text-emerald-300' : 'text-white'} font-mono`}>
                                        {s.home_score}-{s.away_score}
                                    </strong>
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                        {isLocked ? (
                            <button
                                type="button"
                                onClick={() => setIsEditMode(true)}
                                className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-black text-xs shadow-md active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                            >
                                <span>✏️</span>
                                <span>Aktifkan Mode Edit</span>
                            </button>
                        ) : (
                            <button
                                onClick={handleFinishSet}
                                disabled={processing}
                                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-md shadow-emerald-950/40 active:scale-95 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                            >
                                <span>🏁</span>
                                <span>
                                    {processing ? 'Memproses...' : isSetFinished ? 'Simpan / Selesai Edit' : 'Akhiri Set Ini'}
                                </span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* 4. Modal Pop-up Lapangan 10 Zona untuk Aksi In / Ace */}
            {zoneModal && (
                <CourtZoneModal
                    modalData={zoneModal}
                    athleteStats={getAthleteStats(zoneModal.athlete?.id)}
                    onSelectZone={handleZoneSelect}
                    onClose={() => setZoneModal(null)}
                />
            )}

            {/* 5. Modal Quick Lineup Box & Input Dadakan Nomor Punggung */}
            {lineupModal && (
                <QuickLineupBoxModal
                    modalData={lineupModal}
                    isTeamMode={isTeamMode}
                    onClose={() => setLineupModal(null)}
                    onToggleAthleteInCourt={(athleteId, side) => {
                        setCourtLineup(prev => {
                            const current = prev[side] || [];
                            const exists = current.includes(athleteId);
                            const updated = exists ? current.filter(id => id !== athleteId) : [...current, athleteId];
                            return { ...prev, [side]: updated };
                        });
                    }}
                    onQuickAdd={handleQuickAddAthlete}
                />
            )}

            {/* 6. Modal Transisi Antar Sesi Regu */}
            {reguTransition && (
                <ReguTransitionModal
                    transitionData={reguTransition}
                    homeName={homeTeamName}
                    awayName={awayTeamName}
                    onContinue={(nextIndex) => {
                        setActiveSubRegu(nextIndex);
                        setReguTransition(null);
                        setLineupModal({
                            side: 'home',
                            teamName: homeTeamName,
                            targetTeamId: homeTargetTeamId,
                            subIndex: nextIndex,
                            allAthletes: homeAthletes,
                            activeIds: courtLineup.home,
                        });
                    }}
                />
            )}
        </div>
    );
}

// ─── Team Side Scoring Component ─────────────────────────────
function TeamSide({ teamName, isTeamMode, subIndex, activeAthletes = [], selectedAthlete, onSelectAthlete, onOpenLineup, onStatChange, onActionWithZone, getStats, isLocked, side, color }) {
    const colorClasses = {
        primary: {
            bg: 'bg-primary-500/10',
            border: 'border-primary-500/30',
            text: 'text-primary-300',
            badge: 'bg-primary-500/20 border-primary-500/30 text-primary-200 hover:bg-primary-500/30',
            activeBadge: 'bg-primary-600 text-white border-primary-300 shadow-lg ring-2 ring-primary-400/50 scale-105',
        },
        accent: {
            bg: 'bg-accent-500/10',
            border: 'border-accent-500/30',
            text: 'text-accent-300',
            badge: 'bg-accent-500/20 border-accent-500/30 text-accent-200 hover:bg-accent-500/30',
            activeBadge: 'bg-accent-600 text-white border-accent-300 shadow-lg ring-2 ring-accent-400/50 scale-105',
        },
    };

    const c = colorClasses[color];
    const stats = selectedAthlete ? getStats(selectedAthlete.id) : {};

    const effectiveAthletes = (activeAthletes && activeAthletes.length > 0)
        ? activeAthletes
        : [
            { id: `temp-${side}-1`, jersey_number: 1, position: 'Tekong' },
            { id: `temp-${side}-2`, jersey_number: 2, position: 'Feeder' },
            { id: `temp-${side}-3`, jersey_number: 3, position: 'Killer' },
        ];

    useEffect(() => {
        if (!selectedAthlete && effectiveAthletes.length > 0) {
            onSelectAthlete(effectiveAthletes[0]);
        } else if (selectedAthlete && !effectiveAthletes.some(a => a.id === selectedAthlete.id)) {
            onSelectAthlete(effectiveAthletes[0]);
        }
    }, [effectiveAthletes, selectedAthlete]);

    return (
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
            {/* Team Header & Clean Active Jersey Numbers */}
            <div className={`px-2.5 sm:px-3 py-2 ${c.bg} border-b ${c.border} flex-shrink-0`}>
                <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="min-w-0 flex items-center gap-2">
                        <h3 className={`text-xs sm:text-sm font-extrabold ${c.text} truncate`}>
                            {teamName}
                        </h3>
                        {isTeamMode && (
                            <span className="px-2 py-0.5 rounded-md bg-surface-800 text-surface-300 text-[10px] font-black border border-surface-700">
                                Regu {subIndex + 1}
                            </span>
                        )}
                    </div>
                    
                    <button
                        type="button"
                        onClick={onOpenLineup}
                        className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-surface-800 hover:bg-surface-700 border border-surface-600 hover:border-emerald-400 text-surface-200 hover:text-white flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                        title="Pilih atau tambah nomor punggung pemain di lapangan"
                    >
                        <span>➕ / 🔁</span>
                        <span>Ganti Pemain</span>
                    </button>
                </div>

                {/* Clean, Non-Crowded Active Court Jersey Badges */}
                <div className="flex items-center gap-2">
                    {effectiveAthletes.map((a, idx) => {
                        const jerseyNo = a.jersey_number || (idx + 1);
                        const isSelected = selectedAthlete?.id === a.id;
                        const pos = a.position || (idx === 0 ? 'Tekong' : idx === 1 ? 'Feeder' : 'Killer');
                        return (
                            <button
                                key={a.id || idx}
                                onClick={() => onSelectAthlete(a)}
                                className={`
                                    flex-1 py-2 px-2 rounded-xl border text-center transition-all duration-150 active:scale-95 flex flex-col items-center justify-center cursor-pointer select-none
                                    ${isSelected ? c.activeBadge : c.badge}
                                `}
                            >
                                <span className="font-mono font-black text-sm sm:text-base leading-none">
                                    #{jerseyNo}
                                </span>
                                <span className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${isSelected ? 'text-white' : 'text-surface-400'}`}>
                                    {pos}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Athlete Action Stats Panel */}
            {selectedAthlete ? (
                <div className="flex-1 flex flex-col min-h-0 overflow-y-auto px-2.5 sm:px-3 py-2 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-shrink-0">
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-surface-800 border border-surface-700/60 text-xs font-bold text-surface-200 shadow-sm">
                            <span>👕 No. Punggung <strong className="font-mono text-emerald-300 text-sm">#{selectedAthlete.jersey_number || '—'}</strong></span>
                            <span>•</span>
                            <span className="text-surface-300 font-bold">{selectedAthlete.position || 'Pemain'}</span>
                        </span>

                        <button
                            type="button"
                            onClick={onOpenLineup}
                            className="text-[11px] font-bold text-surface-400 hover:text-emerald-300 cursor-pointer flex items-center gap-1"
                        >
                            <span>🔁</span>
                            <span>Ubah Nomor</span>
                        </button>
                    </div>

                    {/* Opponent Mistake Special Action (+1 Auto Point to THIS team) */}
                    <div className="flex-shrink-0">
                        <button
                            type="button"
                            onClick={() => onStatChange(selectedAthlete.id, 'opponent_mistake', 'increment', null, side)}
                            disabled={isLocked}
                            className={`w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-600/30 via-orange-600/30 to-amber-600/30 hover:from-amber-600/40 hover:to-orange-600/40 border border-amber-500/50 text-amber-300 font-black text-xs sm:text-sm flex items-center justify-between active:scale-[0.98] transition-all shadow-md select-none ${
                                isLocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                            }`}
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
                                isLocked={isLocked}
                                onStatChange={(stat, action) => onStatChange(selectedAthlete.id, stat, action, null, side)}
                                onActionWithZone={(statKey, action, statLabel) => onActionWithZone(selectedAthlete, statKey, action, statLabel)}
                            />
                        ))}
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center p-6">
                    <p className="text-sm font-semibold text-surface-400">Pilih nomor punggung di atas untuk mencatat statistik.</p>
                </div>
            )}
        </div>
    );
}

function TabletStatRow({ group, stats, isLocked, onStatChange, onActionWithZone }) {
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
                        if (isLocked) return;
                        if (isZoneTrigger && onActionWithZone) {
                            onActionWithZone(stat.key, 'increment', `${group.label} ${stat.label}`);
                        } else {
                            onStatChange(stat.key, 'increment');
                        }
                    };
                    const handleMinusClick = (e) => {
                        e.preventDefault();
                        if (isLocked || value <= 0) return;
                        if (isZoneTrigger && onActionWithZone) {
                            onActionWithZone(stat.key, 'decrement', `${group.label} ${stat.label}`);
                        } else {
                            onStatChange(stat.key, 'decrement');
                        }
                    };

                    return (
                        <div key={stat.key} className={`flex items-center justify-between gap-1 p-1 rounded-xl border ${st.container} min-w-[86px]`}>
                            <button
                                type="button"
                                onClick={handleMinusClick}
                                disabled={isLocked || value <= 0}
                                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg ${st.btnMinus} font-black text-sm active:scale-90 flex items-center justify-center transition-all ${
                                    isLocked || value <= 0 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
                                }`}
                            >
                                −
                            </button>
                            <div className="flex flex-col items-center px-1">
                                <span className={`text-[9px] uppercase font-black tracking-wide ${st.label}`}>{stat.label}</span>
                                <span className={`text-sm font-black font-mono ${st.val}`}>{value}</span>
                            </div>
                            <button
                                type="button"
                                onClick={handlePlusClick}
                                disabled={isLocked}
                                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg ${st.btnPlus} font-black text-sm active:scale-90 flex items-center justify-center transition-all ${
                                    isLocked ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
                                }`}
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

// ─── Modal Quick Lineup Box & Input Dadakan Nomor Punggung ───
function QuickLineupBoxModal({ modalData, isTeamMode, onClose, onToggleAthleteInCourt, onQuickAdd }) {
    const { teamName, targetTeamId, subIndex, side, allAthletes = [], activeIds = [], isLocked } = modalData;
    const [localActiveIds, setLocalActiveIds] = useState(activeIds);
    const [jerseyNumber, setJerseyNumber] = useState('');
    const [position, setPosition] = useState('Tekong');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        setLocalActiveIds(activeIds);
    }, [activeIds]);

    const handleToggle = (athleteId) => {
        if (isLocked) {
            alert('Lineup dikunci karena set/pertandingan telah selesai. Aktifkan Mode Edit terlebih dahulu.');
            return;
        }
        setLocalActiveIds(prev => {
            const exists = prev.includes(athleteId);
            return exists ? prev.filter(id => id !== athleteId) : [...prev, athleteId];
        });
        onToggleAthleteInCourt(athleteId, side);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!jerseyNumber) return;
        if (isLocked) {
            alert('Lineup dikunci karena set/pertandingan telah selesai. Aktifkan Mode Edit terlebih dahulu.');
            return;
        }
        setSubmitting(true);
        try {
            const created = await onQuickAdd({
                teamId: targetTeamId,
                jerseyNumber: parseInt(jerseyNumber),
                position,
                side,
            });
            if (created && created.id) {
                setLocalActiveIds(prev => Array.from(new Set([...prev, created.id])));
            }
            setJerseyNumber('');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
            <div className="bg-surface-900 border-2 border-emerald-500/40 rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-surface-800 flex-shrink-0">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
                            {isTeamMode ? `Pilih Nomor Punggung • Regu ${subIndex + 1}` : 'Pilih Nomor Punggung'}
                        </span>
                        <h4 className="text-base sm:text-lg font-black text-white">
                            {teamName}
                        </h4>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-400 hover:text-white text-base font-bold flex items-center justify-center transition-colors cursor-pointer"
                    >
                        ✕
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto py-3 space-y-4">
                    
                    {/* Section 1: Kotak Pilihan Nomor Punggung Tersedia (Quick Box Grid) */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[11px] font-black uppercase tracking-wider text-surface-300">
                                Tap Nomor yang Main di Lapangan:
                            </p>
                            <span className="text-[10px] font-bold text-emerald-400">
                                {localActiveIds.length} Terpilih
                            </span>
                        </div>

                        {allAthletes.length === 0 ? (
                            <p className="text-xs text-surface-500 italic text-center py-3">
                                Belum ada nomor punggung terdaftar. Tambahkan di bawah.
                            </p>
                        ) : (
                            <div className="grid grid-cols-4 sm:grid-cols-4 gap-2">
                                {allAthletes.map((a) => {
                                    const isActive = localActiveIds.includes(a.id);
                                    return (
                                        <button
                                            key={a.id}
                                            type="button"
                                            onClick={() => handleToggle(a.id)}
                                            className={`
                                                p-2.5 rounded-2xl border-2 flex flex-col items-center justify-center transition-all duration-75 active:scale-95 cursor-pointer select-none
                                                ${isActive 
                                                    ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-950/50 ring-2 ring-emerald-400/40 scale-105' 
                                                    : 'bg-surface-800/80 hover:bg-surface-800 border-surface-700 text-surface-300 hover:border-surface-500'
                                                }
                                            `}
                                        >
                                            <span className="font-mono font-black text-base sm:text-lg leading-none">
                                                #{a.jersey_number}
                                            </span>
                                            <span className={`text-[9px] font-bold mt-1 uppercase ${isActive ? 'text-emerald-100' : 'text-surface-400'}`}>
                                                {a.position || 'Pemain'}
                                            </span>
                                            {isActive && (
                                                <span className="text-[8px] bg-black/30 px-1 rounded mt-0.5 text-white font-black">
                                                    AKTIF ✓
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Section 2: Input Dadakan Nomor Punggung Baru */}
                    <div className="p-3.5 rounded-2xl bg-surface-950/70 border border-surface-700/60 shadow-inner">
                        <h5 className="text-xs font-black text-emerald-400 mb-2 flex items-center gap-1.5">
                            <span>⚡</span>
                            <span>Input No. Punggung Dadakan Baru</span>
                        </h5>
                        <form onSubmit={handleFormSubmit} className="space-y-2.5">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[10px] font-bold text-surface-300 mb-1">No. Punggung*</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="99"
                                        placeholder="Contoh: 14"
                                        value={jerseyNumber}
                                        onChange={(e) => setJerseyNumber(e.target.value)}
                                        className="w-full rounded-xl bg-surface-800 border-surface-700 text-white text-sm font-mono font-bold focus:border-emerald-500 focus:ring-emerald-500 p-2"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-surface-300 mb-1">Posisi</label>
                                    <select
                                        value={position}
                                        onChange={(e) => setPosition(e.target.value)}
                                        className="w-full rounded-xl bg-surface-800 border-surface-700 text-surface-200 text-xs font-bold focus:border-emerald-500 focus:ring-emerald-500 p-2"
                                    >
                                        <option value="Tekong">Tekong</option>
                                        <option value="Feeder">Feeder</option>
                                        <option value="Killer">Killer</option>
                                        <option value="Cadangan">Cadangan</option>
                                        <option value="Pemain">Pemain</option>
                                    </select>
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={submitting || !jerseyNumber}
                                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-md shadow-emerald-950/40 active:scale-95 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                            >
                                <span>➕</span>
                                <span>{submitting ? 'Menyimpan...' : 'Tambahkan & Masukkan ke Lapangan'}</span>
                            </button>
                        </form>
                    </div>
                </div>

                <div className="pt-3 border-t border-surface-800 flex justify-end flex-shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs cursor-pointer transition-all shadow-lg active:scale-95 text-center"
                    >
                        ✓ Terapkan Lineup ({localActiveIds.length} Pemain Aktif)
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Modal Transisi Antar Sesi Regu ──────────────────────────
function ReguTransitionModal({ transitionData, homeName, awayName, onContinue }) {
    const { reguNumber, winnerName, regusWonHome, regusWonAway, nextReguIndex } = transitionData;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
            <div className="bg-surface-900 border-2 border-emerald-500/60 rounded-3xl max-w-md w-full p-6 sm:p-8 text-center shadow-2xl space-y-5">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-3xl mx-auto shadow-lg shadow-emerald-950/40 animate-bounce">
                    🎉
                </div>

                <div>
                    <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Sesi Regu {reguNumber} Selesai
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-white mt-2">
                        Pemenang Regu {reguNumber}: <span className="text-emerald-400">{winnerName}</span>
                    </h3>
                </div>

                {/* Score Board */}
                <div className="p-4 rounded-2xl bg-surface-950/70 border border-surface-800 flex items-center justify-between text-sm">
                    <div className="text-left flex-1 min-w-0">
                        <p className="font-extrabold text-primary-300 truncate">{homeName}</p>
                        <p className="text-2xl font-black text-white font-mono">{regusWonHome}</p>
                    </div>
                    <span className="text-xs font-black text-surface-500 px-3">SKOR REGU</span>
                    <div className="text-right flex-1 min-w-0">
                        <p className="font-extrabold text-accent-300 truncate">{awayName}</p>
                        <p className="text-2xl font-black text-white font-mono">{regusWonAway}</p>
                    </div>
                </div>

                <div className="pt-2">
                    <button
                        type="button"
                        onClick={() => onContinue(nextReguIndex)}
                        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-xl shadow-emerald-950/50 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                        <span>▶ Siapkan Lineup & Lanjut ke Regu {nextReguIndex + 1}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Modal Lapangan 10 Zona ──────────────────────────────────
function CourtZoneModal({ modalData, athleteStats, onSelectZone, onClose }) {
    const isAce = modalData.statKey?.endsWith('_ace');
    const currentAction = modalData.action || 'increment';
    const isDecrement = currentAction === 'decrement';
    const [localStats, setLocalStats] = useState(athleteStats || {});

    useEffect(() => {
        if (athleteStats) setLocalStats(athleteStats);
    }, [athleteStats]);

    const handleZoneAction = (zoneKey, actionToUse, e) => {
        if (e) e.stopPropagation();
        const act = actionToUse || currentAction;
        setLocalStats(prev => ({
            ...prev,
            [zoneKey]: act === 'increment' ? (prev[zoneKey] || 0) + 1 : Math.max(0, (prev[zoneKey] || 0) - 1),
        }));
        onSelectZone(zoneKey, act);
    };

    const zones = [
        { key: 'zone_1', label: 'Z1', desc: 'Sudut Atas', style: { top: '3%', left: '64%', width: '13%', height: '14%' } },
        { key: 'zone_2', label: 'Z2', desc: '0-1.22m', style: { top: '4%', right: '2%', width: '12%', height: '15%' } },
        { key: 'zone_3', label: 'Z3', desc: '1.22-2.44m', style: { top: '21%', right: '2%', width: '12%', height: '15%' } },
        { key: 'zone_4', label: 'Z4', desc: '2.44-3.66m', style: { top: '38%', right: '2%', width: '12%', height: '15%' } },
        { key: 'zone_5', label: 'Z5', desc: '3.66-4.88m', style: { top: '55%', right: '2%', width: '12%', height: '15%' } },
        { key: 'zone_6', label: 'Z6', desc: '4.88-6.10m', style: { top: '72%', right: '2%', width: '12%', height: '15%' } },
        { key: 'zone_7', label: 'Z7', desc: 'Sudut Bawah', style: { top: '83%', left: '64%', width: '13%', height: '14%' } },
        { key: 'zone_8', label: 'Z8', desc: 'Bawah', style: { top: '68%', left: '49%', width: '14%', height: '26%' } },
        { key: 'zone_9', label: 'Z9', desc: 'Tengah', style: { top: '32%', left: '49%', width: '14%', height: '34%' } },
        { key: 'zone_10', label: 'Z10', desc: 'Atas', style: { top: '4%', left: '49%', width: '14%', height: '26%' } },
    ];

    const totalSetAce = localStats.service_ace !== undefined 
        ? (localStats.service_ace || 0)
        : zones.reduce((sum, z) => sum + (localStats[`${z.key}_ace`] || 0), 0);

    const totalSetIn = localStats.service_in !== undefined
        ? (localStats.service_in || 0)
        : zones.reduce((sum, z) => sum + (localStats[`${z.key}_in`] || 0), 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
            <div className="bg-surface-900 border-2 border-emerald-500/50 rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
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
                                <span>({modalData.athlete?.position || 'Pemain'})</span>
                            </h4>
                            <p className="text-xs text-primary-400 font-bold">
                                🏆 Tim: {modalData.teamName}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex flex-col items-end text-right">
                            <span className="text-[10px] uppercase font-bold text-surface-400">Total Servis Masuk</span>
                            <span className="text-xs font-black text-emerald-300 font-mono">
                                In: {totalSetIn} | Ace: {totalSetAce}
                            </span>
                        </div>

                        <button
                            onClick={onClose}
                            className="w-9 h-9 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-400 hover:text-white text-base font-bold flex items-center justify-center transition-colors cursor-pointer"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                <div className="text-center py-2 flex-shrink-0">
                    <p className="text-xs sm:text-sm font-bold text-surface-200">
                        {isDecrement ? (
                            <span>👉 Tap kotak zona lapangan untuk <span className="text-red-400 font-black">KURANGI (−1) {modalData.statLabel}</span> di zona tersebut:</span>
                        ) : (
                            <span>👉 Tap kotak zona lapangan untuk <span className="text-emerald-400 font-black">TAMBAH (+1) {modalData.statLabel}</span> di zona tersebut:</span>
                        )}
                    </p>
                </div>

                <div className="relative w-full aspect-[2.1/1] rounded-2xl border-2 border-emerald-500/60 bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950 overflow-hidden shadow-2xl select-none my-1 flex-shrink-0">
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 190">
                        <rect x="10" y="10" width="380" height="170" fill="none" stroke="#34d399" strokeWidth="2.5" strokeOpacity="0.8" />
                        <line x1="190" y1="10" x2="190" y2="180" stroke="#ffffff" strokeWidth="3.5" strokeDasharray="5 3" />
                        <text x="190" y="8" fill="#a7f3d0" fontSize="8" textAnchor="middle" fontWeight="bold">NET</text>
                        <circle cx="85" cy="95" r="20" fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="3 2" />
                        <circle cx="85" cy="95" r="5" fill="#fbbf24" />
                        <text x="85" y="125" fill="#fef08a" fontSize="8" textAnchor="middle" fontWeight="bold">TEKONG</text>
                        <line x1="85" y1="95" x2="390" y2="10" stroke="#fbbf24" strokeWidth="1.2" strokeOpacity="0.7" strokeDasharray="3 3" />
                        <line x1="85" y1="95" x2="390" y2="34" stroke="#60a5fa" strokeWidth="1.2" strokeOpacity="0.6" strokeDasharray="3 3" />
                        <line x1="85" y1="95" x2="390" y2="58" stroke="#60a5fa" strokeWidth="1.2" strokeOpacity="0.6" strokeDasharray="3 3" />
                        <line x1="85" y1="95" x2="390" y2="82" stroke="#60a5fa" strokeWidth="1.2" strokeOpacity="0.6" strokeDasharray="3 3" />
                        <line x1="85" y1="95" x2="390" y2="106" stroke="#60a5fa" strokeWidth="1.2" strokeOpacity="0.6" strokeDasharray="3 3" />
                        <line x1="85" y1="95" x2="390" y2="130" stroke="#60a5fa" strokeWidth="1.2" strokeOpacity="0.6" strokeDasharray="3 3" />
                        <line x1="85" y1="95" x2="390" y2="154" stroke="#60a5fa" strokeWidth="1.2" strokeOpacity="0.6" strokeDasharray="3 3" />
                        <line x1="85" y1="95" x2="390" y2="180" stroke="#fbbf24" strokeWidth="1.2" strokeOpacity="0.7" strokeDasharray="3 3" />
                        <line x1="190" y1="68" x2="280" y2="42" stroke="#a78bfa" strokeWidth="1.2" strokeOpacity="0.6" strokeDasharray="3 3" />
                        <line x1="190" y1="122" x2="280" y2="148" stroke="#a78bfa" strokeWidth="1.2" strokeOpacity="0.6" strokeDasharray="3 3" />
                    </svg>

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
                                <span className="text-[10px] sm:text-xs font-black text-emerald-200 group-hover:text-white leading-tight">
                                    {z.label}
                                </span>
                                <span className="text-[7px] sm:text-[8px] text-surface-300 group-hover:text-emerald-100 font-mono leading-none hidden sm:inline">
                                    {z.desc}
                                </span>
                                {hasPoints && (
                                    <div className="mt-0.5 flex items-center gap-0.5">
                                        <span className={`px-1.5 py-0.2 rounded-full text-[9px] sm:text-[10px] font-black shadow-md leading-tight ${
                                            isDecrement ? 'bg-red-400 text-surface-950' : 'bg-amber-400 text-surface-950'
                                        }`}>
                                            {currentStatVal} pt
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-surface-800 mt-2 flex-shrink-0">
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
