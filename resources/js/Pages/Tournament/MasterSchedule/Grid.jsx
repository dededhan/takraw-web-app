import { useState, useRef, useCallback, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import {
    DndContext, DragOverlay, PointerSensor,
    useSensor, useSensors, closestCenter,
} from '@dnd-kit/core';
import { useDroppable } from '@dnd-kit/core';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import MatchCard, { isSideMatchingTeam } from '@/Components/Schedule/MatchCard';

const SLOT_HEIGHT = 68; // px per slot waktu

const MODE_ICONS = {
    regu:        { label: 'Regu',        icon: '🏐' },
    double:      { label: 'Double',      icon: '👥' },
    quadrant:    { label: 'Quadrant',    icon: '⬡'  },
    team_regu:   { label: 'Team Regu',   icon: '🏆' },
    team_double: { label: 'Team Double', icon: '🥇' },
};

/**
 * Grid — Kalender Grid Master Schedule dengan Pencarian Tim (Max 2 Tim),
 * Mode Filter / Lock, Pewarnaan Khusus Duel / Clash, Panel Insight Lawan & Waktu,
 * serta Pengeditan Ulang Jadwal Published dengan Alert Konfirmasi.
 */
export default function Grid({
    tournament,
    matches,
    timeSlots,
    courts,
    referees = [],
    totalDays,
    superTeamMemberIds = [],
}) {
    const [draggingItem,       setDraggingItem]       = useState(null);
    const [isLoading,          setIsLoading]          = useState(false);
    const [localMatches,       setLocalMatches]       = useState(matches);
    const [showRefereeModal,   setShowRefereeModal]   = useState(false);
    const [showReEditModal,    setShowReEditModal]    = useState(false);
    const [isEditUnlocked,     setIsEditUnlocked]     = useState(tournament.schedule_status !== 'published');

    // Filter Mode Kategori untuk Pencarian Tim
    const [selectedSearchMode, setSelectedSearchMode] = useState('all');

    // Pencarian Tim (Maksimal 2 Tim)
    const [searchedTeam1,      setSearchedTeam1]      = useState(null);
    const [searchedTeam2,      setSearchedTeam2]      = useState(null);
    const [focusedMatchId,     setFocusedMatchId]     = useState(null);
    const [showInsightPanel,   setShowInsightPanel]   = useState(true);

    const matchRefs = useRef({});

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    );

    // Kategori Mode yang tersedia pada turnamen
    const availableModes = useMemo(() => {
        const list = [{ key: 'all', label: 'Semua Mode', icon: '🌐' }];
        (tournament.modes || []).filter(m => m.is_active).forEach(m => {
            const info = MODE_ICONS[m.match_mode] || { label: m.match_mode, icon: '🏆' };
            list.push({ key: m.match_mode, label: info.label, icon: info.icon });
        });
        return list;
    }, [tournament.modes]);

    // Kumpulkan seluruh daftar tim unik yang berpartisipasi (HANYA Tim Utama / Super Team, TANPA Sub-Tim)
    const allContenders = useMemo(() => {
        const list = [];
        const seen = new Set();
        const subIds = new Set((superTeamMemberIds || []).map(Number));

        // Tambah juga ID sub-tim dari tournament.super_teams
        (tournament.super_teams || tournament.superTeams || []).forEach(st => {
            (st.members || []).forEach(m => subIds.add(Number(m.id)));
        });

        const addContender = (id, name, type = 'team', mode = 'all', region = '') => {
            if (!name || name === 'TBD') return;
            // JANGAN MASUKKAN SUB-TIM!
            if (type === 'team' && id && subIds.has(Number(id))) return;

            const key = `${type}-${id || name.trim().toLowerCase()}-${mode}`;
            if (seen.has(key)) return;
            seen.add(key);
            list.push({ id, name: name.trim(), type, mode, region });
        };

        // 1. Dari Super Teams (Mode: team_regu / team_double)
        (tournament.super_teams || tournament.superTeams || []).forEach(st => {
            const stMode = st.match_mode || 'team_regu';
            addContender(st.id, st.name, 'super_team', stMode);
        });

        // 2. Dari Regular Teams (Tunggal: regu / double / quadrant)
        (tournament.teams || []).forEach(t => {
            if (subIds.has(Number(t.id))) return; // Lewati sub-tim!
            const tMode = t.match_mode || 'regu';
            addContender(t.id, t.name, 'team', tMode, t.region);
        });

        // 3. Dari Matches yang sudah ada
        matches.forEach(m => {
            if (m.home_super_team) {
                addContender(m.home_super_team.id, m.home_super_team.name, 'super_team', m.match_mode || 'team_regu');
            } else if (m.home_super_team_id && m.home_display_name && m.home_display_name !== 'TBD') {
                addContender(m.home_super_team_id, m.home_display_name, 'super_team', m.match_mode || 'team_regu');
            }

            if (m.away_super_team) {
                addContender(m.away_super_team.id, m.away_super_team.name, 'super_team', m.match_mode || 'team_regu');
            } else if (m.away_super_team_id && m.away_display_name && m.away_display_name !== 'TBD') {
                addContender(m.away_super_team_id, m.away_display_name, 'super_team', m.match_mode || 'team_regu');
            }

            if (m.home_team && !subIds.has(Number(m.home_team.id))) {
                addContender(m.home_team.id, m.home_team.name, 'team', m.match_mode || 'regu', m.home_team.region);
            } else if (m.home_team_id && m.home_display_name && m.home_display_name !== 'TBD' && !subIds.has(Number(m.home_team_id))) {
                addContender(m.home_team_id, m.home_display_name, 'team', m.match_mode || 'regu');
            }

            if (m.away_team && !subIds.has(Number(m.away_team.id))) {
                addContender(m.away_team.id, m.away_team.name, 'team', m.match_mode || 'regu', m.away_team.region);
            } else if (m.away_team_id && m.away_display_name && m.away_display_name !== 'TBD' && !subIds.has(Number(m.away_team_id))) {
                addContender(m.away_team_id, m.away_display_name, 'team', m.match_mode || 'regu');
            }
        });

        return list.sort((a, b) => a.name.localeCompare(b.name));
    }, [tournament, matches, superTeamMemberIds]);

    // Tim yang sudah difilter berdasarkan mode pencarian aktif
    const filteredContenders = useMemo(() => {
        if (selectedSearchMode === 'all') {
            const unique = [];
            const seen = new Set();
            allContenders.forEach(c => {
                const k = `${c.type}-${c.id || c.name}`;
                if (!seen.has(k)) {
                    seen.add(k);
                    unique.push(c);
                }
            });
            return unique;
        }
        return allContenders.filter(c => c.mode === selectedSearchMode || c.mode === 'all');
    }, [allContenders, selectedSearchMode]);

    // Helper untuk mengecek apakah match melibatkan tim tertentu secara tepat (EXACT)
    const isMatchInvolvingTeam = useCallback((match, searchedTeam) => {
        if (!searchedTeam) return false;
        return isSideMatchingTeam(match, 'home', searchedTeam) || isSideMatchingTeam(match, 'away', searchedTeam);
    }, []);

    // Ekstrak match yang cocok untuk Tim 1, Tim 2, dan Bentrok Langsung (Clash)
    const team1Matches = useMemo(() => {
        if (!searchedTeam1) return [];
        return localMatches.filter(m => isMatchInvolvingTeam(m, searchedTeam1));
    }, [localMatches, searchedTeam1, isMatchInvolvingTeam]);

    const team2Matches = useMemo(() => {
        if (!searchedTeam2) return [];
        return localMatches.filter(m => isMatchInvolvingTeam(m, searchedTeam2));
    }, [localMatches, searchedTeam2, isMatchInvolvingTeam]);

    const clashMatches = useMemo(() => {
        if (!searchedTeam1 || !searchedTeam2) return [];
        return localMatches.filter(m => isMatchInvolvingTeam(m, searchedTeam1) && isMatchInvolvingTeam(m, searchedTeam2));
    }, [localMatches, searchedTeam1, searchedTeam2, isMatchInvolvingTeam]);

    // Scroll halus dan fokus ke match tertentu
    const focusAndScrollToMatch = (matchId, dayNum) => {
        setFocusedMatchId(matchId);
        const dayEl = document.getElementById(`day-section-${dayNum}`);
        if (dayEl) {
            dayEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        setTimeout(() => {
            const cardEl = document.getElementById(`match-card-${matchId}`);
            if (cardEl) {
                cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 200);

        setTimeout(() => {
            setFocusedMatchId(null);
        }, 3000);
    };

    // Scroll halus ke section Hari tertentu
    const scrollToDaySection = (dayNum) => {
        const el = document.getElementById(`day-section-${dayNum}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // Drag & Drop handlers
    const handleDragStart = ({ active }) => {
        if (tournament.schedule_status === 'published' && !isEditUnlocked) {
            setShowReEditModal(true);
            return;
        }
        const match = localMatches.find(m => `match-${m.id}` === active.id);
        setDraggingItem(match || null);
    };

    const handleDragEnd = useCallback(({ active, over }) => {
        setDraggingItem(null);
        if (!over || !active) return;

        if (tournament.schedule_status === 'published' && !isEditUnlocked) {
            setShowReEditModal(true);
            return;
        }

        const matchId = active.id.replace('match-', '');
        const [slotId, courtId] = over.id.split('_').map(Number);

        if (!slotId || !courtId) return;

        setIsLoading(true);
        router.patch(
            route('matches.reschedule', matchId),
            { time_slot_id: slotId, court_id: courtId },
            {
                preserveScroll: true,
                onSuccess: () => setIsLoading(false),
                onError: () => setIsLoading(false),
            }
        );
    }, [localMatches, tournament.schedule_status, isEditUnlocked]);

    // Group matches & timeSlots per day
    const timeSlotsByDay = useMemo(() => {
        const map = {};
        timeSlots.forEach(slot => {
            const d = slot.day_number || 1;
            if (!map[d]) map[d] = [];
            map[d].push(slot);
        });
        return map;
    }, [timeSlots]);

    // Pemetaan Status Sel Grid (Root vs Covered oleh 3-slot match)
    const cellStateMap = useMemo(() => {
        const map = {};

        localMatches.forEach(m => {
            if (!m.time_slot_id || !m.court_id) return;
            const span = m.slot_span || (m.match_mode === 'team_regu' || m.match_mode === 'team_double' ? 3 : 1);
            const rootKey = `${m.time_slot_id}_${m.court_id}`;

            const daySlots = timeSlotsByDay[m.day_number || 1] || [];
            const rootIdx = daySlots.findIndex(s => s.id === m.time_slot_id);

            map[rootKey] = {
                type: 'root',
                match: m,
                span,
            };

            // Tandai slot-slot lanjutan (Covered) jika span > 1 (seperti Team Regu 3 Kotak)
            if (span > 1 && rootIdx !== -1) {
                for (let offset = 1; offset < span; offset++) {
                    const coveredSlot = daySlots[rootIdx + offset];
                    if (coveredSlot) {
                        const coveredKey = `${coveredSlot.id}_${m.court_id}`;
                        map[coveredKey] = {
                            type: 'covered',
                            rootMatch: m,
                            rootSlotId: m.time_slot_id,
                            offset,
                            span,
                        };
                    }
                }
            }
        });

        return map;
    }, [localMatches, timeSlotsByDay]);

    const daysList = Array.from({ length: totalDays || 1 }, (_, i) => i + 1);
    const isPublished = tournament.schedule_status === 'published';

    return (
        <AuthenticatedLayout header={
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                    <a href={route('tournaments.show', tournament.id)}
                        className="text-gray-400 hover:text-gray-600 text-sm">
                        ← {tournament.name}
                    </a>
                    <span className="text-gray-300">/</span>
                    <h2 className="text-xl font-bold text-gray-900">Master Schedule Terpadu</h2>
                    <StatusBadge status={tournament.schedule_status} />
                    {isPublished && isEditUnlocked && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                            ✏️ Mode Edit Aktif
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Tombol Cetak Jadwal Formal */}
                    <a
                        href={route('tournaments.master-schedule.print', tournament.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
                        title="Cetak format tabel formal untuk panitia dan wasit"
                    >
                        <span>🖨️</span> Cetak Jadwal Resmi
                    </a>

                    {/* Tombol Modal Penugasan Wasit */}
                    <button
                        onClick={() => setShowRefereeModal(true)}
                        className="bg-purple-600 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold hover:bg-purple-700 transition-colors shadow-xs flex items-center gap-1.5"
                    >
                        <span>🧑‍⚖️</span> Penugasan Wasit
                    </button>

                    {/* Tombol Buka Kunci Edit jika Published */}
                    {isPublished && !isEditUnlocked && (
                        <button
                            onClick={() => setShowReEditModal(true)}
                            className="bg-amber-600 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold hover:bg-amber-700 transition-colors shadow-sm flex items-center gap-1.5"
                            title="Edit ulang jadwal yang sudah dipublikasi"
                        >
                            <span>🔓</span> Edit Ulang Jadwal
                        </button>
                    )}

                    {/* Tombol Kunci Kembali atau Publish */}
                    {isPublished && isEditUnlocked && (
                        <>
                            <button
                                onClick={() => setIsEditUnlocked(false)}
                                className="bg-surface-700 text-surface-200 px-3.5 py-1.5 rounded-xl text-xs font-bold hover:bg-surface-600 transition-colors shadow-sm"
                            >
                                🔒 Kunci Jadwal
                            </button>
                            <button
                                onClick={() => {
                                    router.post(route('tournaments.master-schedule.publish', tournament.id), {}, {
                                        preserveScroll: true,
                                        onSuccess: () => setIsEditUnlocked(false),
                                    });
                                }}
                                className="bg-emerald-600 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-1.5"
                            >
                                <span>🚀</span> Simpan & Publikasikan Ulang
                            </button>
                        </>
                    )}

                    {!isPublished && (
                        <button
                            onClick={() => {
                                router.post(route('tournaments.master-schedule.publish', tournament.id), {}, {
                                    preserveScroll: true,
                                });
                            }}
                            className="bg-emerald-600 text-white px-4 py-1.5 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-1.5"
                        >
                            <span>🚀</span> Publikasikan Jadwal
                        </button>
                    )}
                </div>
            </div>
        }>
            <Head title={`Master Schedule — ${tournament.name}`} />

            <div className="max-w-full mx-auto px-4 py-4 space-y-4">
                {/* ─── TOOLBAR PENCARIAN TIM (MAX 2 TIM) & KONTROL ─── */}
                <div className="bg-surface-900 border border-surface-700/80 rounded-2xl p-4 shadow-xl space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        {/* Team Search Selectors & Mode Lock */}
                        <div className="flex items-center gap-3 flex-wrap">
                            {/* Mode Lock Selector */}
                            <div className="flex items-center gap-1 bg-surface-950/80 p-1 rounded-xl border border-surface-750">
                                <span className="text-[11px] font-bold text-surface-400 px-2 flex items-center gap-1">
                                    <span>🔒</span>
                                    <span>Mode:</span>
                                </span>
                                {availableModes.map(m => (
                                    <button
                                        key={m.key}
                                        type="button"
                                        onClick={() => {
                                            setSelectedSearchMode(m.key);
                                            if (searchedTeam1 && m.key !== 'all' && searchedTeam1.mode !== 'all' && searchedTeam1.mode !== m.key) {
                                                setSearchedTeam1(null);
                                            }
                                            if (searchedTeam2 && m.key !== 'all' && searchedTeam2.mode !== 'all' && searchedTeam2.mode !== m.key) {
                                                setSearchedTeam2(null);
                                            }
                                        }}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                            selectedSearchMode === m.key
                                                ? 'bg-primary-600 text-white shadow-sm'
                                                : 'text-surface-400 hover:text-surface-200 hover:bg-surface-850'
                                        }`}
                                    >
                                        <span>{m.icon}</span>
                                        <span>{m.label}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 text-xs font-bold text-surface-300">
                                    <span>🔍</span>
                                    <span>Tim:</span>
                                </div>

                                {/* Dropdown Tim 1 (Sky Blue / Cyan) */}
                                <TeamSearchDropdown
                                    label="Pilih Tim 1"
                                    badgeColor="sky"
                                    colorTheme="bg-sky-950/80 text-sky-200 border-sky-500/80"
                                    contenders={filteredContenders}
                                    selectedContender={searchedTeam1}
                                    onSelect={setSearchedTeam1}
                                    onClear={() => setSearchedTeam1(null)}
                                    placeholder={selectedSearchMode === 'all' ? "Ketik nama Tim 1..." : `Ketik Tim 1 (${MODE_ICONS[selectedSearchMode]?.label || selectedSearchMode})...`}
                                />

                                {/* Dropdown Tim 2 (Vibrant Amber / Orange) */}
                                <TeamSearchDropdown
                                    label="Pilih Tim 2"
                                    badgeColor="amber"
                                    colorTheme="bg-amber-950/80 text-amber-200 border-amber-500/80"
                                    contenders={filteredContenders}
                                    selectedContender={searchedTeam2}
                                    onSelect={setSearchedTeam2}
                                    onClear={() => setSearchedTeam2(null)}
                                    placeholder={selectedSearchMode === 'all' ? "Ketik nama Tim 2..." : `Ketik Tim 2 (${MODE_ICONS[selectedSearchMode]?.label || selectedSearchMode})...`}
                                />

                                {/* Reset Button */}
                                {(searchedTeam1 || searchedTeam2) && (
                                    <button
                                        onClick={() => {
                                            setSearchedTeam1(null);
                                            setSearchedTeam2(null);
                                        }}
                                        className="text-xs font-semibold text-surface-400 hover:text-surface-200 px-2.5 py-1 rounded-lg bg-surface-800 border border-surface-700 hover:bg-surface-750 transition-colors"
                                    >
                                        ✕ Reset
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Mode Legend & Toggle Insight */}
                        <div className="flex items-center gap-4 flex-wrap">
                            <ModeLegend />
                            {(searchedTeam1 || searchedTeam2) && (
                                <button
                                    onClick={() => setShowInsightPanel(!showInsightPanel)}
                                    className="text-xs font-bold text-primary-300 hover:text-primary-200 flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary-900/30 border border-primary-500/30"
                                >
                                    <span>📋</span>
                                    <span>{showInsightPanel ? 'Sembunyikan Info Lawan' : 'Tampilkan Info Lawan'}</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Clash Alert Notice */}
                    {clashMatches.length > 0 && (
                        <div className="p-3 rounded-xl bg-gradient-to-r from-purple-950/80 via-fuchsia-950/80 to-rose-950/80 border border-fuchsia-500/60 flex items-center justify-between gap-3 animate-pulse">
                            <div className="flex items-center gap-2.5 text-xs text-fuchsia-200">
                                <span className="text-base">⚔️</span>
                                <div>
                                    <span className="font-extrabold text-white">BENTROK LANGSUNG DITEMUKAN! </span>
                                    <span>
                                        <strong>{searchedTeam1?.name}</strong> akan berhadapan dengan <strong>{searchedTeam2?.name}</strong> pada {clashMatches.length} pertandingan di jadwal.
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => focusAndScrollToMatch(clashMatches[0].id, clashMatches[0].day_number || 1)}
                                className="px-3 py-1 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold text-xs shadow-md shrink-0"
                            >
                                🎯 Lihat Duel
                            </button>
                        </div>
                    )}
                </div>

                {/* ─── PANEL INSIGHT: LAWAN & WAKTU TANDING (SIAPA & KAPAN) ─── */}
                {(searchedTeam1 || searchedTeam2) && showInsightPanel && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-down">
                        {searchedTeam1 && (
                            <TeamMatchSummaryCard
                                team={searchedTeam1}
                                matches={team1Matches}
                                courts={courts}
                                timeSlots={timeSlots}
                                badgeColor="sky"
                                accentBorder="border-sky-500/50"
                                accentBg="bg-sky-950/30"
                                accentText="text-sky-300"
                                badgeTitle="🔵 TIM 1"
                                onFocusMatch={focusAndScrollToMatch}
                            />
                        )}

                        {searchedTeam2 && (
                            <TeamMatchSummaryCard
                                team={searchedTeam2}
                                matches={team2Matches}
                                courts={courts}
                                timeSlots={timeSlots}
                                badgeColor="amber"
                                accentBorder="border-amber-500/50"
                                accentBg="bg-amber-950/30"
                                accentText="text-amber-300"
                                badgeTitle="🟠 TIM 2"
                                onFocusMatch={focusAndScrollToMatch}
                            />
                        )}
                    </div>
                )}

                {/* ─── QUICK DAY JUMP NAVIGATION ─── */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    <span className="text-xs font-bold text-surface-400 shrink-0">Lompat ke Hari:</span>
                    {daysList.map(dayNum => (
                        <button
                            key={dayNum}
                            onClick={() => scrollToDaySection(dayNum)}
                            className="px-3 py-1 rounded-xl text-xs font-bold bg-surface-800 hover:bg-surface-700 text-surface-200 border border-surface-700/60 transition-colors shrink-0"
                        >
                            📅 Hari ke-{dayNum}
                        </button>
                    ))}
                </div>

                {/* ─── DRAG & DROP SCHEDULE GRID CONTAINER ─── */}
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <div className="space-y-6">
                        {daysList.map(dayNum => {
                            const slots = timeSlotsByDay[dayNum] || [];
                            if (slots.length === 0) return null;

                            return (
                                <div
                                    key={dayNum}
                                    id={`day-section-${dayNum}`}
                                    className="bg-surface-900 border border-surface-700/80 rounded-2xl overflow-hidden shadow-2xl"
                                >
                                    {/* Day Section Header */}
                                    <div className="px-5 py-3 bg-surface-800/90 border-b border-surface-700 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="w-3 h-3 rounded-full bg-primary-500 ring-4 ring-primary-500/20" />
                                            <h3 className="text-sm font-extrabold text-surface-100 tracking-wide uppercase">
                                                Jadwal Hari ke-{dayNum}
                                            </h3>
                                            <span className="text-xs text-surface-400 font-mono">
                                                ({slots.length} Slot Waktu)
                                            </span>
                                        </div>
                                    </div>

                                    {/* Grid Table Container */}
                                    <div className="overflow-x-auto">
                                        <div className="min-w-[800px]">
                                            {/* Column Header: Lapangan */}
                                            <div className="flex bg-surface-950/70 border-b border-surface-700/60 sticky top-0 z-20">
                                                <div className="w-24 shrink-0 p-2.5 text-center text-[11px] font-bold text-surface-400 border-r border-surface-700/50">
                                                    WAKTU
                                                </div>
                                                {courts.map(court => (
                                                    <div
                                                        key={court.id}
                                                        className="flex-1 min-w-[150px] p-2.5 text-center text-xs font-extrabold text-surface-200 border-r border-surface-700/50 last:border-r-0 uppercase tracking-wider"
                                                    >
                                                        🏟️ {court.name}
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Rows: Slot Waktu */}
                                            {slots.map(slot => (
                                                <SlotRow
                                                    key={slot.id}
                                                    slot={slot}
                                                    courts={courts}
                                                    cellStateMap={cellStateMap}
                                                    matchRefs={matchRefs}
                                                    slotHeight={SLOT_HEIGHT}
                                                    searchedTeam1={searchedTeam1}
                                                    searchedTeam2={searchedTeam2}
                                                    focusedMatchId={focusedMatchId}
                                                    isDraggable={isPublished ? isEditUnlocked : true}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Drag Overlay Preview */}
                    <DragOverlay>
                        {draggingItem && (
                            <div style={{ width: '250px' }}>
                                <MatchCard
                                    match={draggingItem}
                                    slotHeight={SLOT_HEIGHT}
                                    isDraggable={false}
                                />
                            </div>
                        )}
                    </DragOverlay>
                </DndContext>
            </div>

            {/* ─── Modal Alert Konfirmasi Edit Ulang Published ─── */}
            {showReEditModal && (
                <ReEditScheduleModal
                    tournament={tournament}
                    onClose={() => setShowReEditModal(false)}
                    onUnlock={() => {
                        setIsEditUnlocked(true);
                        setShowReEditModal(false);
                    }}
                    onUnpublish={() => {
                        router.post(route('tournaments.master-schedule.unpublish', tournament.id), {}, {
                            preserveScroll: true,
                            onSuccess: () => {
                                setIsEditUnlocked(true);
                                setShowReEditModal(false);
                            },
                        });
                    }}
                />
            )}

            {/* ─── Modal Penugasan Wasit Massal ─── */}
            {showRefereeModal && (
                <RefereeAssignModal
                    tournament={tournament}
                    matches={localMatches}
                    referees={referees}
                    onClose={() => setShowRefereeModal(false)}
                />
            )}
        </AuthenticatedLayout>
    );
}

/**
 * TeamSearchDropdown — Dropdown & Search Input untuk memilih Tim yang ingin disorot.
 */
function TeamSearchDropdown({
    label,
    badgeColor,
    colorTheme,
    contenders,
    selectedContender,
    onSelect,
    onClear,
    placeholder,
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef(null);

    const filtered = useMemo(() => {
        if (!searchQuery.trim()) return contenders;
        const q = searchQuery.toLowerCase();
        return contenders.filter(c => c.name.toLowerCase().includes(q) || (c.region && c.region.toLowerCase().includes(q)));
    }, [contenders, searchQuery]);

    return (
        <div className="relative" ref={dropdownRef}>
            {selectedContender ? (
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${colorTheme} shadow-sm`}>
                    <span className="truncate max-w-[170px]">{selectedContender.name}</span>
                    <button
                        onClick={onClear}
                        className="text-surface-400 hover:text-white transition-colors text-xs font-black p-0.5"
                        title="Hapus filter tim"
                    >
                        ✕
                    </button>
                </div>
            ) : (
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setIsOpen(!isOpen)}
                        className="px-3.5 py-1.5 rounded-xl bg-surface-800 hover:bg-surface-750 border border-surface-700 text-surface-300 text-xs font-semibold flex items-center gap-2 transition-colors"
                    >
                        <span className={`w-2 h-2 rounded-full ${badgeColor === 'sky' ? 'bg-sky-400' : 'bg-amber-400'}`} />
                        <span>{label}</span>
                        <span className="text-[10px] text-surface-500">▼</span>
                    </button>

                    {isOpen && (
                        <div className="absolute left-0 mt-2 w-64 bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl z-50 p-2 space-y-2">
                            <input
                                type="text"
                                autoFocus
                                placeholder={placeholder}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full px-3 py-1.5 rounded-xl bg-surface-950 border border-surface-700 text-surface-100 text-xs focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                            />
                            <div className="max-h-56 overflow-y-auto divide-y divide-surface-800/50">
                                {filtered.length === 0 ? (
                                    <p className="text-center py-4 text-xs text-surface-500">Tidak ada tim cocok</p>
                                ) : (
                                    filtered.map(c => (
                                        <button
                                            key={`${c.type}-${c.id || c.name}-${c.mode}`}
                                            type="button"
                                            onClick={() => {
                                                onSelect(c);
                                                setIsOpen(false);
                                                setSearchQuery('');
                                            }}
                                            className="w-full text-left px-3 py-2 text-xs font-medium text-surface-200 hover:bg-surface-800 hover:text-primary-300 rounded-lg transition-colors flex items-center justify-between gap-2"
                                        >
                                            <span className="truncate">{c.name}</span>
                                            <div className="flex items-center gap-1 shrink-0">
                                                {c.type === 'super_team' ? (
                                                    <span className="text-[9.5px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                                        🏆 Super Team
                                                    </span>
                                                ) : (
                                                    c.mode && c.mode !== 'all' && (
                                                        <span className="text-[9.5px] font-bold uppercase px-1.5 py-0.5 rounded bg-surface-800 text-surface-400 border border-surface-700">
                                                            {MODE_ICONS[c.mode]?.icon} {MODE_ICONS[c.mode]?.label || c.mode}
                                                        </span>
                                                    )
                                                )}
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/**
 * TeamMatchSummaryCard — Kartu ringkasan jadwal tanding tim (Kapan & Lawan siapa).
 */
function TeamMatchSummaryCard({
    team,
    matches,
    courts,
    timeSlots,
    badgeColor,
    accentBorder,
    accentBg,
    accentText,
    badgeTitle,
    onFocusMatch,
}) {
    const courtsMap = useMemo(() => {
        const m = {};
        (courts || []).forEach(c => { m[c.id] = c.name; });
        return m;
    }, [courts]);

    const slotsMap = useMemo(() => {
        const m = {};
        (timeSlots || []).forEach(s => { m[s.id] = s.label; });
        return m;
    }, [timeSlots]);

    return (
        <div className={`p-4 rounded-2xl border ${accentBorder} ${accentBg} space-y-3`}>
            <div className="flex items-center justify-between pb-2 border-b border-surface-700/50">
                <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        badgeColor === 'sky' ? 'bg-sky-500 text-white' : 'bg-amber-500 text-white'
                    }`}>
                        {badgeTitle}
                    </span>
                    <h4 className={`text-sm font-extrabold ${accentText} truncate max-w-[220px]`}>
                        {team.name}
                    </h4>
                </div>
                <span className="text-xs font-semibold text-surface-400">
                    {matches.length} Pertandingan Terjadwal
                </span>
            </div>

            {matches.length === 0 ? (
                <p className="text-xs text-surface-400 italic py-2">
                    Belum ada pertandingan terjadwal untuk tim ini.
                </p>
            ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {matches.map((m) => {
                        const isHome = isSideMatchingTeam(m, 'home', team);
                        const opponent = isHome
                            ? (m.away_display_name || m.away_super_team?.name || m.away_team?.name || m.away_placeholder || 'TBD')
                            : (m.home_display_name || m.home_super_team?.name || m.home_team?.name || m.home_placeholder || 'TBD');

                        const courtName = courtsMap[m.court_id] || `Lap. ${m.court_number || '—'}`;
                        const slotTime = slotsMap[m.time_slot_id] || (m.time_slot?.label) || '—';

                        return (
                            <div
                                key={m.id}
                                className="p-2.5 rounded-xl bg-surface-900/90 border border-surface-700 flex items-center justify-between gap-3 text-xs hover:border-surface-600 transition-all shadow-xs"
                            >
                                <div className="flex-1 min-w-0 space-y-0.5">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono font-bold text-primary-300">#{m.match_number || m.id}</span>
                                        <span className="text-surface-400 uppercase text-[10px] font-semibold">({m.match_mode})</span>
                                        <span className="text-[11px] font-bold text-surface-200 truncate">
                                            ⚔️ Lawan: <strong className="text-white">{opponent}</strong>
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-surface-400 font-mono">
                                        📅 Hari {m.day_number || 1} • ⏰ {slotTime} • 📍 {courtName}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onFocusMatch(m.id, m.day_number || 1)}
                                    className="px-2.5 py-1 rounded-lg bg-surface-800 hover:bg-primary-600 text-surface-300 hover:text-white font-bold text-xs transition-colors shrink-0 flex items-center gap-1 border border-surface-700"
                                >
                                    <span>🎯</span> Lihat
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

/**
 * ReEditScheduleModal — Alert Peringatan Konfirmasi Pengeditan Ulang Jadwal Published.
 */
function ReEditScheduleModal({ tournament, onClose, onUnlock, onUnpublish }) {
    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-surface-900 border border-surface-700 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-in">
                <div className="p-6 bg-gradient-to-b from-amber-500/10 to-transparent border-b border-surface-800 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-2xl">
                        ⚠️
                    </div>
                    <h3 className="text-lg font-extrabold text-surface-100">
                        Konfirmasi Pengeditan Jadwal yang Telah Dipublikasikan
                    </h3>
                    <p className="text-xs text-surface-300 leading-relaxed">
                        Jadwal Master turnamen ini saat ini berstatus <strong>DIPUBLIKASIKAN (PUBLISHED)</strong>.
                        Mengubah susunan, menggeser slot waktu, atau memindahkan lapangan akan mengubah jam pertandingan
                        dan lawan tanding yang mungkin sudah dilihat oleh tim peserta dan wasit.
                    </p>
                </div>

                <div className="p-6 space-y-4">
                    <div className="p-4 rounded-xl bg-surface-950/60 border border-surface-800 space-y-2 text-xs text-surface-400">
                        <p className="font-semibold text-surface-200">Pilihan Tindakan:</p>
                        <ul className="list-disc pl-4 space-y-1">
                            <li><strong>Buka Kunci Mode Edit:</strong> Mengizinkan pengeditan langsung pada kalender grid. Setelah selesai, Anda dapat mempublikasikannya kembali.</li>
                            <li><strong>Kembalikan ke Draft:</strong> Mengubah status turnamen kembali ke Draft secara formal.</li>
                        </ul>
                    </div>

                    <div className="flex flex-col gap-2.5 pt-2">
                        <button
                            type="button"
                            onClick={onUnlock}
                            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white transition-colors shadow-md flex items-center justify-center gap-2"
                        >
                            <span>🔓</span> Buka Kunci Mode Edit Sekarang
                        </button>
                        <button
                            type="button"
                            onClick={onUnpublish}
                            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-surface-800 hover:bg-surface-700 text-surface-200 border border-surface-700 transition-colors flex items-center justify-center gap-2"
                        >
                            <span>🔄</span> Kembalikan Status ke Draft (Unpublish)
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full py-2 px-4 rounded-xl text-xs font-semibold text-surface-400 hover:text-surface-200 transition-colors"
                        >
                            Batal
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * SlotRow — Satu baris slot waktu di grid.
 */
function SlotRow({
    slot,
    courts,
    cellStateMap,
    matchRefs,
    slotHeight,
    searchedTeam1,
    searchedTeam2,
    focusedMatchId,
    isDraggable,
}) {
    const isIshoma = slot.slot_type === 'ishoma';

    if (isIshoma) {
        return (
            <div className="flex border-b border-surface-700/40" style={{ height: slotHeight }}>
                <div className="w-24 shrink-0 bg-amber-500/10 border-r border-amber-500/20 flex items-center justify-center">
                    <span className="text-xs text-amber-300 font-bold">🕌 ISHOMA</span>
                </div>
                <div className="flex-1 bg-amber-500/10 border-amber-500/20 flex items-center justify-center gap-3">
                    <span className="text-xs font-bold text-amber-300 uppercase tracking-widest">ISHOMA</span>
                    <span className="text-xs text-amber-400 font-mono">({slot.label})</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex border-b border-surface-700/30" style={{ height: slotHeight }}>
            {/* Time label */}
            <div className="w-24 shrink-0 bg-surface-900 border-r border-surface-700/50 flex flex-col items-center justify-center px-1">
                <span className="text-[11px] text-surface-300 font-mono text-center font-bold">
                    {slot.label?.split(' - ')[0]}
                </span>
                <span className="text-[9px] text-surface-500 font-mono">
                    {slot.label?.split(' - ')[1]}
                </span>
            </div>

            {/* Court columns */}
            {courts.map(court => {
                const key       = `${slot.id}_${court.id}`;
                const cellState = cellStateMap[key];

                return (
                    <DroppableCell
                        key={court.id}
                        slotId={slot.id}
                        courtId={court.id}
                        cellState={cellState}
                        matchRefs={matchRefs}
                        slotHeight={slotHeight}
                        searchedTeam1={searchedTeam1}
                        searchedTeam2={searchedTeam2}
                        focusedMatchId={focusedMatchId}
                        isDraggable={isDraggable}
                    />
                );
            })}
        </div>
    );
}

/**
 * DroppableCell — Satu sel dalam grid (slot × lapangan) yang bisa di-drop.
 * Mendukung sel root match, sel tertutup 3-slot match, dan sel kosong.
 */
function DroppableCell({
    slotId,
    courtId,
    cellState,
    matchRefs,
    slotHeight,
    searchedTeam1,
    searchedTeam2,
    focusedMatchId,
    isDraggable = true,
}) {
    const { setNodeRef, isOver } = useDroppable({ id: `${slotId}_${courtId}` });

    const isRoot = cellState?.type === 'root';
    const isCovered = cellState?.type === 'covered';
    const match = cellState?.match;

    return (
        <div
            ref={setNodeRef}
            className={`flex-1 min-w-[150px] border-r border-surface-700/30 last:border-r-0 p-1 relative transition-colors ${
                isOver ? 'bg-primary-500/20 ring-2 ring-primary-500 z-30' : ''
            } ${isCovered ? 'bg-amber-500/[0.03]' : ''}`}
        >
            {/* Jika slot ini adalah slot awal match (Root) */}
            {isRoot && match && (
                <div
                    ref={el => { if (el) matchRefs.current[match.id] = el; }}
                    className="absolute inset-x-1 top-1 z-20"
                >
                    <MatchCard
                        match={match}
                        slotHeight={slotHeight}
                        searchedTeam1={searchedTeam1}
                        searchedTeam2={searchedTeam2}
                        isFocused={focusedMatchId === match.id}
                        isDraggable={isDraggable}
                    />
                </div>
            )}

            {/* Jika slot ini tertutup oleh span match di atasnya */}
            {isCovered && (
                <div className="h-full select-none pointer-events-none" />
            )}
        </div>
    );
}

function StatusBadge({ status }) {
    const config = {
        not_generated: { label: 'Belum Generate', color: 'bg-surface-800 text-surface-400' },
        draft:         { label: 'Draft Master Schedule', color: 'bg-amber-500/20 text-amber-300 border border-amber-500/30' },
        published:     { label: 'Published', color: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' },
    };
    const c = config[status] || config.not_generated;
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${c.color}`}>
            {c.label}
        </span>
    );
}

function ModeLegend() {
    const items = [
        { color: '#1d4ed8', label: 'Regu' },
        { color: '#059669', label: 'Double' },
        { color: '#d97706', label: 'Team Regu' },
    ];
    return (
        <div className="flex items-center gap-3">
            {items.map(item => (
                <div key={item.label} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-[11px] text-surface-300 font-medium">{item.label}</span>
                </div>
            ))}
        </div>
    );
}

/**
 * RefereeAssignModal — Modal Penugasan Wasit Massal Dikelompokkan per Lapangan.
 * Admin dapat mencentang satu Lapangan untuk langsung memilih semua laga di lapangan tersebut.
 */
function RefereeAssignModal({ tournament, matches, referees, onClose }) {
    const [selectedRefereeId, setSelectedRefereeId] = useState(referees[0]?.id || '');
    const [selectedMatchIds,  setSelectedMatchIds]  = useState([]);
    const [filterMode,        setFilterMode]        = useState('all');
    const [filterDay,         setFilterDay]         = useState('all');
    const [isSaving,          setIsSaving]          = useState(false);

    // Kumpulkan seluruh nomor hari yang ada pada matches
    const availableDays = useMemo(() => {
        const days = Array.from(new Set(matches.map(m => m.day_number).filter(Boolean))).sort((a, b) => a - b);
        return days;
    }, [matches]);

    // Filter matches berdasarkan mode dan hari
    const filteredMatches = useMemo(() => {
        return matches.filter(m => {
            const matchModeOk = filterMode === 'all' || m.match_mode === filterMode;
            const matchDayOk  = filterDay === 'all' || String(m.day_number) === String(filterDay);
            return matchModeOk && matchDayOk;
        });
    }, [matches, filterMode, filterDay]);

    // Kelompokkan pertandingan per Lapangan (Court)
    const matchesByCourt = useMemo(() => {
        const map = {};
        filteredMatches.forEach(m => {
            const courtName = m.court?.name || (m.court_number ? `Lapangan ${m.court_number}` : 'Lapangan Belum Ditentukan');
            const courtOrder = m.court?.court_number || m.court_number || 999;
            if (!map[courtName]) {
                map[courtName] = {
                    name: courtName,
                    courtNumber: courtOrder,
                    matches: [],
                };
            }
            map[courtName].matches.push(m);
        });

        return Object.values(map).sort((a, b) => a.courtNumber - b.courtNumber);
    }, [filteredMatches]);

    const toggleMatch = (id) => {
        setSelectedMatchIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedMatchIds.length === filteredMatches.length) {
            setSelectedMatchIds([]);
        } else {
            setSelectedMatchIds(filteredMatches.map(m => m.id));
        }
    };

    const toggleCourt = (courtMatches) => {
        const courtIds = courtMatches.map(m => m.id);
        const allSelected = courtIds.every(id => selectedMatchIds.includes(id));
        if (allSelected) {
            setSelectedMatchIds(prev => prev.filter(id => !courtIds.includes(id)));
        } else {
            setSelectedMatchIds(prev => Array.from(new Set([...prev, ...courtIds])));
        }
    };

    const selectMatchesForReferee = (refId) => {
        setSelectedRefereeId(refId);
        const ids = matches.filter(m => m.referee_id === refId).map(m => m.id);
        setSelectedMatchIds(ids);
    };

    const handleSave = (e) => {
        e.preventDefault();
        if (!selectedRefereeId || selectedMatchIds.length === 0) return;

        setIsSaving(true);
        router.post(
            route('tournaments.master-schedule.assign-referee-bulk', tournament.id),
            {
                referee_id: selectedRefereeId,
                match_ids:  selectedMatchIds,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsSaving(false);
                    onClose();
                },
                onError: () => setIsSaving(false),
            }
        );
    };

    const selectedReferee = referees.find(r => r.id === Number(selectedRefereeId)) || referees[0];

    return (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface-900 border border-surface-700 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                {/* Modal Header */}
                <div className="px-6 py-4 bg-surface-850 border-b border-surface-700/80 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-lg">
                            🧑‍⚖️
                        </div>
                        <div>
                            <h3 className="text-base font-extrabold text-surface-100 flex items-center gap-2">
                                Penugasan Wasit per Lapangan
                            </h3>
                            <p className="text-xs text-surface-400">
                                Pilih wasit lalu centang Lapangan untuk menugaskan wasit ke seluruh pertandingan di lapangan tersebut.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-surface-400 hover:text-surface-200 text-sm font-bold p-2 rounded-xl hover:bg-surface-800 transition-colors cursor-pointer"
                    >
                        ✕
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto space-y-5 flex-1 pr-3">
                    {/* Step 1: Select Referee */}
                    <div className="bg-surface-800/90 p-4 rounded-2xl border border-surface-700/80 space-y-2.5">
                        <label className="block text-xs font-bold text-surface-300 uppercase tracking-wider">
                            1. Pilih Akun Wasit yang Ditugaskan:
                        </label>
                        <div className="flex items-center gap-3 flex-wrap">
                            <select
                                value={selectedRefereeId}
                                onChange={e => {
                                    const id = Number(e.target.value);
                                    selectMatchesForReferee(id);
                                }}
                                className="flex-1 bg-surface-950 border border-surface-600 rounded-xl px-4 py-2.5 text-xs font-bold text-surface-100 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                            >
                                {referees.length === 0 && (
                                    <option value="">— Belum ada akun wasit aktif terdaftar —</option>
                                )}
                                {referees.map(r => (
                                    <option key={r.id} value={r.id}>
                                        🧑‍⚖️ {r.name} ({r.email})
                                    </option>
                                ))}
                            </select>
                            {selectedReferee && (
                                <span className="text-xs font-semibold px-3 py-2 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/30">
                                    Saat ini memimpin: <strong>{matches.filter(m => m.referee_id === selectedReferee.id).length} laga</strong>
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Step 2: Filters & Select All Toolbar */}
                    <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-surface-400">Filter Mode:</span>
                            {['all', 'regu', 'double', 'quadrant', 'team_regu', 'team_double'].map(mode => (
                                <button
                                    key={mode}
                                    type="button"
                                    onClick={() => setFilterMode(mode)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors cursor-pointer border ${
                                        filterMode === mode
                                            ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                                            : 'bg-surface-800/80 text-surface-400 border-surface-700 hover:text-surface-200'
                                    }`}
                                >
                                    {mode.replace('_', ' ')}
                                </button>
                            ))}

                            {availableDays.length > 1 && (
                                <div className="flex items-center gap-1.5 ml-2">
                                    <span className="text-xs font-bold text-surface-400">Hari:</span>
                                    <button
                                        type="button"
                                        onClick={() => setFilterDay('all')}
                                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
                                            filterDay === 'all'
                                                ? 'bg-primary-600 text-white border-primary-500'
                                                : 'bg-surface-800 text-surface-400 border-surface-700 hover:text-surface-200'
                                        }`}
                                    >
                                        Semua
                                    </button>
                                    {availableDays.map(day => (
                                        <button
                                            key={day}
                                            type="button"
                                            onClick={() => setFilterDay(String(day))}
                                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
                                                String(filterDay) === String(day)
                                                    ? 'bg-primary-600 text-white border-primary-500'
                                                    : 'bg-surface-800 text-surface-400 border-surface-700 hover:text-surface-200'
                                            }`}
                                        >
                                            H-{day}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={toggleSelectAll}
                            className="px-3.5 py-1.5 bg-surface-800 hover:bg-surface-700 text-surface-200 rounded-xl text-xs font-bold border border-surface-700 transition-colors cursor-pointer"
                        >
                            {selectedMatchIds.length === filteredMatches.length && filteredMatches.length > 0
                                ? '⬜ Batal Pilih Semua'
                                : '☑️ Pilih Seluruh Match'}
                        </button>
                    </div>

                    {/* Step 3: Courts Groups */}
                    <div className="space-y-4">
                        {matchesByCourt.length === 0 ? (
                            <div className="text-center py-12 rounded-2xl border border-dashed border-surface-700/60 bg-surface-950/40">
                                <p className="text-surface-400 text-xs font-medium">Tidak ada pertandingan yang sesuai dengan filter saat ini.</p>
                            </div>
                        ) : (
                            matchesByCourt.map(group => {
                                const courtMatchIds = group.matches.map(m => m.id);
                                const selectedInCourt = courtMatchIds.filter(id => selectedMatchIds.includes(id));
                                const isAllCourtSelected = courtMatchIds.length > 0 && selectedInCourt.length === courtMatchIds.length;
                                const isPartialSelected = selectedInCourt.length > 0 && selectedInCourt.length < courtMatchIds.length;

                                return (
                                    <div
                                        key={group.name}
                                        className={`rounded-2xl border transition-all duration-200 overflow-hidden shadow-sm ${
                                            isAllCourtSelected
                                                ? 'border-purple-500/60 bg-purple-950/15 ring-1 ring-purple-500/30'
                                                : 'border-surface-700/60 bg-surface-950/40 hover:border-surface-600'
                                        }`}
                                    >
                                        {/* Court Group Header with Master Checkbox */}
                                        <div
                                            onClick={() => toggleCourt(group.matches)}
                                            className={`px-5 py-3.5 border-b flex items-center justify-between cursor-pointer select-none transition-colors ${
                                                isAllCourtSelected
                                                    ? 'bg-purple-600/20 border-purple-500/40 text-purple-100'
                                                    : 'bg-surface-800/60 border-surface-700/60 text-surface-200 hover:bg-surface-800/90'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center justify-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={isAllCourtSelected}
                                                        ref={el => {
                                                            if (el) el.indeterminate = isPartialSelected;
                                                        }}
                                                        onChange={() => {}} // Handled by container onClick
                                                        className="w-4 h-4 rounded border-surface-600 text-purple-600 focus:ring-purple-500 cursor-pointer"
                                                    />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-extrabold flex items-center gap-2">
                                                        <span>🏟️</span> {group.name}
                                                    </h4>
                                                    <p className="text-[11px] text-surface-400 mt-0.5">
                                                        Klik untuk <strong>pilih/batal semua match</strong> di lapangan ini
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2.5">
                                                <span className={`text-xs px-3 py-1 rounded-xl font-bold font-mono ${
                                                    isAllCourtSelected
                                                        ? 'bg-purple-600 text-white'
                                                        : selectedInCourt.length > 0
                                                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                                        : 'bg-surface-900 text-surface-400 border border-surface-700'
                                                }`}>
                                                    {selectedInCourt.length} / {group.matches.length} Laga Dipilih
                                                </span>
                                            </div>
                                        </div>

                                        {/* Matches List in Court */}
                                        <div className="divide-y divide-surface-800/80">
                                            {group.matches.map(match => {
                                                const isChecked = selectedMatchIds.includes(match.id);
                                                const home = match.home_display_name || match.home_team?.name || match.home_placeholder || 'TBD';
                                                const away = match.away_display_name || match.away_team?.name || match.away_placeholder || 'TBD';

                                                return (
                                                    <div
                                                        key={match.id}
                                                        onClick={() => toggleMatch(match.id)}
                                                        className={`px-5 py-3 flex items-center justify-between gap-4 cursor-pointer transition-colors ${
                                                            isChecked
                                                                ? 'bg-purple-500/15 hover:bg-purple-500/20'
                                                                : 'hover:bg-surface-800/40'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                                            <input
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                onChange={() => {}} // Handled by row onClick
                                                                className="w-4 h-4 rounded border-surface-600 text-purple-600 focus:ring-purple-500 cursor-pointer shrink-0"
                                                            />
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <span className="font-bold font-mono text-purple-300 text-xs bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded">
                                                                    #{match.match_number || match.id}
                                                                </span>
                                                                <span className="text-[10px] uppercase font-bold text-surface-400 bg-surface-800 px-2 py-0.5 rounded">
                                                                    {match.match_mode?.replace('_', ' ')}
                                                                </span>
                                                            </div>

                                                            <div className="font-medium text-surface-100 text-xs truncate min-w-0">
                                                                <span className="font-bold">{home}</span>
                                                                <span className="text-surface-500 mx-1.5 font-normal">vs</span>
                                                                <span className="font-bold">{away}</span>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-4 shrink-0 text-right">
                                                            <span className="text-[11px] font-mono text-surface-300">
                                                                Hari {match.day_number} ({match.time_slot?.label?.split(' - ')[0] || '—'})
                                                            </span>

                                                            <div className="w-36 text-right">
                                                                {match.referee?.name ? (
                                                                    <span className={`text-[11px] font-semibold truncate block ${
                                                                        match.referee.id === Number(selectedRefereeId)
                                                                            ? 'text-purple-300 font-bold'
                                                                            : 'text-emerald-400'
                                                                    }`}>
                                                                        🧑‍⚖️ {match.referee.name}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[11px] text-surface-500 italic">Belum ada wasit</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 bg-surface-850 border-t border-surface-700/80 flex items-center justify-between flex-wrap gap-3">
                    <div className="text-xs text-surface-300">
                        Total: <strong className="text-purple-300 font-bold text-sm">{selectedMatchIds.length}</strong> pertandingan dipilih untuk{' '}
                        <strong className="text-white">{selectedReferee?.name || 'Wasit'}</strong>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-surface-800 hover:bg-surface-700 text-surface-300 transition-colors cursor-pointer"
                        >
                            Batal
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving || selectedMatchIds.length === 0}
                            className="px-6 py-2.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white disabled:opacity-50 transition-all shadow-lg shadow-purple-600/30 flex items-center gap-2 cursor-pointer"
                        >
                            <span>{isSaving ? 'Menyimpan...' : `💾 Simpan Penugasan Wasit (${selectedMatchIds.length} Laga)`}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
