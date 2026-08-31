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

/**
 * Grid — Kalender Grid Master Schedule dengan Pencarian Tim (Max 2 Tim),
 * Pewarnaan Khusus Duel / Clash, Panel Insight Lawan & Waktu,
 * serta Pengeditan Ulang Jadwal Published dengan Alert Konfirmasi.
 */
export default function Grid({
    tournament,
    matches,
    timeSlots,
    courts,
    referees = [],
    totalDays,
}) {
    const [draggingItem,       setDraggingItem]       = useState(null);
    const [isLoading,          setIsLoading]          = useState(false);
    const [localMatches,       setLocalMatches]       = useState(matches);
    const [showRefereeModal,   setShowRefereeModal]   = useState(false);
    const [showReEditModal,    setShowReEditModal]    = useState(false);
    const [isEditUnlocked,     setIsEditUnlocked]     = useState(tournament.schedule_status !== 'published');

    // Pencarian Tim (Maksimal 2 Tim)
    const [searchedTeam1,      setSearchedTeam1]      = useState(null);
    const [searchedTeam2,      setSearchedTeam2]      = useState(null);
    const [focusedMatchId,     setFocusedMatchId]     = useState(null);
    const [showInsightPanel,   setShowInsightPanel]   = useState(true);

    const matchRefs = useRef({});

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    );

    // Kumpulkan seluruh daftar tim unik yang berpartisipasi (Reguler & Super Team)
    const allContenders = useMemo(() => {
        const list = [];
        const seen = new Set();

        const addContender = (id, name, type = 'team', region = '') => {
            if (!name || name === 'TBD') return;
            const key = `${type}-${id || name.trim().toLowerCase()}`;
            if (seen.has(key)) return;
            seen.add(key);
            list.push({ id, name: name.trim(), type, region });
        };

        // Dari data turnamen
        (tournament.teams || []).forEach(t => addContender(t.id, t.name, 'team', t.region));
        (tournament.super_teams || tournament.superTeams || []).forEach(st => {
            addContender(st.id, st.name, 'super_team');
            (st.members || []).forEach(m => addContender(m.id, m.name, 'team', m.region));
        });

        // Dari matches
        matches.forEach(m => {
            if (m.home_team) addContender(m.home_team.id, m.home_team.name, 'team', m.home_team.region);
            if (m.away_team) addContender(m.away_team.id, m.away_team.name, 'team', m.away_team.region);
            if (m.home_super_team) addContender(m.home_super_team.id, m.home_super_team.name, 'super_team');
            if (m.away_super_team) addContender(m.away_super_team.id, m.away_super_team.name, 'super_team');
            if (m.home_display_name && m.home_display_name !== 'TBD') addContender(null, m.home_display_name, 'team');
            if (m.away_display_name && m.away_display_name !== 'TBD') addContender(null, m.away_display_name, 'team');
        });

        return list.sort((a, b) => a.name.localeCompare(b.name));
    }, [tournament, matches]);

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
                        {/* Team Search Selectors */}
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-surface-300">
                                <span>🔍</span>
                                <span>Cari Tim (Maks 2):</span>
                            </div>

                            {/* Dropdown Tim 1 (Sky Blue / Cyan) */}
                            <TeamSearchDropdown
                                label="Pilih Tim 1"
                                badgeColor="sky"
                                colorTheme="bg-sky-950/80 text-sky-200 border-sky-500/80"
                                contenders={allContenders}
                                selectedContender={searchedTeam1}
                                onSelect={setSearchedTeam1}
                                onClear={() => setSearchedTeam1(null)}
                                placeholder="Ketik nama Tim 1..."
                            />

                            {/* Dropdown Tim 2 (Vibrant Amber / Orange) */}
                            <TeamSearchDropdown
                                label="Pilih Tim 2"
                                badgeColor="amber"
                                colorTheme="bg-amber-950/80 text-amber-200 border-amber-500/80"
                                contenders={allContenders}
                                selectedContender={searchedTeam2}
                                onSelect={setSearchedTeam2}
                                onClear={() => setSearchedTeam2(null)}
                                placeholder="Ketik nama Tim 2..."
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
                                    ✕ Reset Pencarian
                                </button>
                            )}
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
                                            key={`${c.type}-${c.id || c.name}`}
                                            type="button"
                                            onClick={() => {
                                                onSelect(c);
                                                setIsOpen(false);
                                                setSearchQuery('');
                                            }}
                                            className="w-full text-left px-3 py-2 text-xs font-medium text-surface-200 hover:bg-surface-800 hover:text-primary-300 rounded-lg transition-colors flex items-center justify-between"
                                        >
                                            <span className="truncate">{c.name}</span>
                                            {c.type === 'super_team' && (
                                                <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 shrink-0">
                                                    Super
                                                </span>
                                            )}
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
 * RefereeAssignModal — Modal Penugasan Wasit Massal per Ceklis Pertandingan.
 */
function RefereeAssignModal({ tournament, matches, referees, onClose }) {
    const [selectedRefereeId, setSelectedRefereeId] = useState(referees[0]?.id || '');
    const [selectedMatchIds,  setSelectedMatchIds]  = useState([]);
    const [filterMode,        setFilterMode]        = useState('all');
    const [isSaving,          setIsSaving]          = useState(false);

    const filteredMatches = matches.filter(m => filterMode === 'all' || m.match_mode === filterMode);

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

    return (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                <div className="px-6 py-4 bg-surface-800 border-b border-surface-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">🧑‍⚖️</span>
                        <div>
                            <h3 className="text-base font-bold text-surface-100">Penugasan Wasit Massal</h3>
                            <p className="text-xs text-surface-400">Pilih akun wasit lalu centang nomor pertandingan yang ingin ditugaskan.</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-surface-400 hover:text-surface-200 text-lg font-bold p-1"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6 flex-1">
                    <div className="bg-surface-800/80 p-4 rounded-xl border border-surface-700 space-y-3">
                        <label className="block text-xs font-bold text-surface-300 uppercase tracking-wider">
                            1. Pilih Akun Wasit:
                        </label>
                        <div className="flex items-center gap-3 flex-wrap">
                            <select
                                value={selectedRefereeId}
                                onChange={e => {
                                    const id = Number(e.target.value);
                                    selectMatchesForReferee(id);
                                }}
                                className="flex-1 bg-surface-900 border border-surface-600 rounded-xl px-3 py-2 text-sm font-semibold text-surface-100 focus:ring-2 focus:ring-primary-500"
                            >
                                {referees.map(r => (
                                    <option key={r.id} value={r.id}>
                                        🧑‍⚖️ {r.name} ({r.email}) [{r.role}]
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-surface-400">Filter Mode:</span>
                            {['all', 'regu', 'double', 'team_regu'].map(mode => (
                                <button
                                    key={mode}
                                    onClick={() => setFilterMode(mode)}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-colors ${
                                        filterMode === mode ? 'bg-primary-600 text-white' : 'bg-surface-800 text-surface-400 hover:text-surface-200'
                                    }`}
                                >
                                    {mode.replace('_', ' ')}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={toggleSelectAll}
                                className="px-3 py-1 bg-surface-800 hover:bg-surface-700 text-surface-200 rounded-lg text-xs font-bold border border-surface-700"
                            >
                                {selectedMatchIds.length === filteredMatches.length ? '⬜ Batal Centang Semua' : '☑️ Centang Semua Match'}
                            </button>
                        </div>
                    </div>

                    <div className="border border-surface-700 rounded-xl overflow-hidden bg-surface-950/40">
                        <div className="max-h-72 overflow-y-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-surface-800 text-surface-400 sticky top-0 border-b border-surface-700">
                                    <tr>
                                        <th className="p-3 text-center w-10">Ceklis</th>
                                        <th className="p-3">#Match</th>
                                        <th className="p-3">Mode</th>
                                        <th className="p-3">Hari & Jam</th>
                                        <th className="p-3">Pertandingan</th>
                                        <th className="p-3">Wasit Saat Ini</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-surface-800">
                                    {filteredMatches.map(match => {
                                        const isChecked = selectedMatchIds.includes(match.id);
                                        const home = match.home_display_name || match.home_team?.name || match.home_placeholder || 'TBD';
                                        const away = match.away_display_name || match.away_team?.name || match.away_placeholder || 'TBD';

                                        return (
                                            <tr
                                                key={match.id}
                                                onClick={() => toggleMatch(match.id)}
                                                className={`cursor-pointer transition-colors ${
                                                    isChecked ? 'bg-primary-500/15' : 'hover:bg-surface-800/50'
                                                }`}
                                            >
                                                <td className="p-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => {}}
                                                        className="rounded border-surface-600 text-primary-600 focus:ring-primary-500"
                                                    />
                                                </td>
                                                <td className="p-3 font-bold font-mono text-primary-300">#{match.match_number || match.id}</td>
                                                <td className="p-3 uppercase font-semibold text-surface-400">{match.match_mode}</td>
                                                <td className="p-3 font-mono text-surface-300">
                                                    Hari {match.day_number} ({match.time_slot?.label?.split(' - ')[0] || '—'})
                                                </td>
                                                <td className="p-3 font-medium text-surface-200">
                                                    {home} <span className="text-surface-500 font-normal">vs</span> {away}
                                                </td>
                                                <td className="p-3">
                                                    {match.referee?.name ? (
                                                        <span className="text-emerald-400 font-semibold">🧑‍⚖️ {match.referee.name}</span>
                                                    ) : (
                                                        <span className="text-surface-500 italic">Belum ada</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 bg-surface-800 border-t border-surface-700 flex items-center justify-between">
                    <span className="text-xs text-surface-300 font-bold">
                        {selectedMatchIds.length} pertandingan terpilih
                    </span>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-xs font-bold bg-surface-700 hover:bg-surface-600 text-surface-300"
                        >
                            Batal
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving || selectedMatchIds.length === 0}
                            className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 transition-colors shadow-md flex items-center gap-1.5"
                        >
                            {isSaving ? 'Menyimpan...' : `💾 Simpan Penugasan Wasit (${selectedMatchIds.length})`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
