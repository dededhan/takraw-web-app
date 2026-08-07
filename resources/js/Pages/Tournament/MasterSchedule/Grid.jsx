import { useState, useRef, useCallback } from 'react';
import { Head, router } from '@inertiajs/react';
import {
    DndContext, DragOverlay, PointerSensor,
    useSensor, useSensors, closestCenter,
} from '@dnd-kit/core';
import { useDroppable } from '@dnd-kit/core';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import MatchCard from '@/Components/Schedule/MatchCard';

const SLOT_HEIGHT = 68; // px per slot waktu

/**
 * Grid — Kalender Grid Master Schedule dengan Drag & Drop bebas tanpa hambatan + Penugasan Wasit.
 */
export default function Grid({
    tournament,
    matches,
    timeSlots,
    courts,
    referees = [],
    totalDays,
}) {
    const [draggingItem,     setDraggingItem]     = useState(null);
    const [isLoading,        setIsLoading]        = useState(false);
    const [localMatches,     setLocalMatches]     = useState(matches);
    const [showRefereeModal, setShowRefereeModal] = useState(false);
    const matchRefs = useRef({});

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    );

    // Scroll halus ke section Hari tertentu
    const scrollToDaySection = (dayNum) => {
        const el = document.getElementById(`day-section-${dayNum}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // Drag & Drop handlers (Bebas dipindah ke slot/hari manapun tanpa error)
    const handleDragStart = ({ active }) => {
        const match = localMatches.find(m => `match-${m.id}` === active.id);
        setDraggingItem(match || null);
    };

    const handleDragEnd = useCallback(({ active, over }) => {
        setDraggingItem(null);
        if (!over || !active) return;

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
    }, [localMatches]);

    // Group matches & timeSlots per day
    const timeSlotsByDay = {};
    timeSlots.forEach(slot => {
        const d = slot.day_number || 1;
        if (!timeSlotsByDay[d]) timeSlotsByDay[d] = [];
        timeSlotsByDay[d].push(slot);
    });

    const matchesBySlotCourt = {};
    localMatches.forEach(m => {
        if (m.time_slot_id && m.court_id) {
            const key = `${m.time_slot_id}_${m.court_id}`;
            if (!matchesBySlotCourt[key]) matchesBySlotCourt[key] = [];
            matchesBySlotCourt[key].push(m);
        }
    });

    const daysList = Array.from({ length: totalDays || 1 }, (_, i) => i + 1);

    return (
        <AuthenticatedLayout header={
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <a href={route('tournaments.show', tournament.id)}
                        className="text-gray-400 hover:text-gray-600 text-sm">
                        ← {tournament.name}
                    </a>
                    <span className="text-gray-300">/</span>
                    <h2 className="text-xl font-bold text-gray-900">Master Schedule Terpadu</h2>
                    <StatusBadge status={tournament.schedule_status} />
                </div>
                <div className="flex items-center gap-2">
                    {/* Tombol Modal Penugasan Wasit */}
                    <button
                        onClick={() => setShowRefereeModal(true)}
                        className="bg-purple-600 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold hover:bg-purple-700 transition-colors shadow-xs flex items-center gap-1.5"
                    >
                        <span>🧑‍⚖️</span> Penugasan Wasit
                    </button>

                    {tournament.schedule_status === 'draft' && (
                        <button
                            onClick={() => router.post(route('tournaments.master-schedule.publish', tournament.id))}
                            className="bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-green-700 transition-colors shadow-sm"
                        >
                            🚀 Publish Jadwal
                        </button>
                    )}
                </div>
            </div>
        }>
            <Head title={`Master Schedule — ${tournament.name}`} />

            <div className="flex flex-col h-[calc(100vh-8rem)] w-full">
                {/* ─── Main Schedule Grid (Full Width) ─── */}
                <div className="flex-1 flex flex-col overflow-hidden w-full">
                    {/* Day Jump Shortcuts Header */}
                    <div className="flex items-center gap-2 px-4 py-3 bg-surface-900 border-b border-surface-700/60 overflow-x-auto shrink-0 shadow-sm">
                        <span className="text-xs font-bold text-surface-400 uppercase tracking-wider shrink-0 mr-1">
                            📍 Pintasan Hari:
                        </span>
                        {daysList.map(d => (
                            <button
                                key={d}
                                onClick={() => scrollToDaySection(d)}
                                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-surface-800 text-primary-300 hover:bg-surface-700 transition-all border border-surface-700 shrink-0 shadow-xs flex items-center gap-1"
                            >
                                <span>📅</span> Hari {d}
                            </button>
                        ))}
                        <div className="ml-auto shrink-0">
                            <ModeLegend />
                        </div>
                    </div>

                    {/* Scrollable Container for All Days */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-8 bg-surface-950/20">
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                        >
                            {daysList.map(dayNum => {
                                const daySlots = timeSlotsByDay[dayNum] || [];
                                return (
                                    <div
                                        key={dayNum}
                                        id={`day-section-${dayNum}`}
                                        className="rounded-2xl border border-surface-700/60 bg-surface-900/60 overflow-hidden shadow-lg"
                                    >
                                        {/* Day Banner */}
                                        <div className="bg-gradient-to-r from-surface-800 to-surface-850 px-5 py-3 border-b border-surface-700 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">📅</span>
                                                <h3 className="text-sm font-bold text-surface-100 uppercase tracking-wider">
                                                    HARI KE-{dayNum}
                                                </h3>
                                                <span className="text-xs text-surface-400 font-normal">
                                                    ({daySlots.length} Slot Waktu)
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                                                className="text-[11px] text-surface-400 hover:text-surface-200 transition-colors"
                                            >
                                                ↑ Kembali ke atas
                                            </button>
                                        </div>

                                        {/* Grid Table for this day */}
                                        <div className="inline-block min-w-full overflow-x-auto">
                                            {/* Header Lapangan */}
                                            <div className="flex sticky top-0 z-10 bg-surface-800/95 backdrop-blur-sm border-b border-surface-700">
                                                <div className="w-24 shrink-0 bg-surface-900 border-r border-surface-700 px-2 py-2 flex items-center justify-center">
                                                    <span className="text-[10px] font-bold text-surface-400 uppercase">Jam Sesi</span>
                                                </div>
                                                {courts.map(court => (
                                                    <div
                                                        key={court.id}
                                                        className="flex-1 min-w-[150px] px-3 py-2 text-center border-r border-surface-700/50 last:border-r-0"
                                                    >
                                                        <p className="text-xs font-bold text-surface-100">{court.name}</p>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Rows: Time Slots */}
                                            {daySlots.map(slot => (
                                                <SlotRow
                                                    key={slot.id}
                                                    slot={slot}
                                                    courts={courts}
                                                    matchesBySlotCourt={matchesBySlotCourt}
                                                    matchRefs={matchRefs}
                                                    slotHeight={SLOT_HEIGHT}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Drag Overlay */}
                            <DragOverlay>
                                {draggingItem && (
                                    <div className="w-44 opacity-95 rotate-1 shadow-2xl z-50">
                                        <MatchCard match={draggingItem} slotHeight={SLOT_HEIGHT} isDraggable={false} />
                                    </div>
                                )}
                            </DragOverlay>
                        </DndContext>
                    </div>
                </div>
            </div>

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
 * RefereeAssignModal — Modal Penugasan Wasit Massal per Ceklis Pertandingan.
 */
function RefereeAssignModal({ tournament, matches, referees, onClose }) {
    const [selectedRefereeId, setSelectedRefereeId] = useState(referees[0]?.id || '');
    const [selectedMatchIds,  setSelectedMatchIds]  = useState([]);
    const [filterMode,        setFilterMode]        = useState('all');
    const [isSaving,          setIsSaving]          = useState(false);

    // Matches filtered by mode
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
                {/* Modal Header */}
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

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1">
                    {/* Select Referee Account */}
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

                    {/* Filter & Selection Controls */}
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

                    {/* Matches Table with Checkboxes */}
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

                {/* Modal Footer */}
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

/**
 * SlotRow — Satu baris slot waktu di grid.
 */
function SlotRow({ slot, courts, matchesBySlotCourt, matchRefs, slotHeight }) {
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
                const key     = `${slot.id}_${court.id}`;
                const matches = matchesBySlotCourt[key] || [];
                const match   = matches[0];

                return (
                    <DroppableCell
                        key={court.id}
                        slotId={slot.id}
                        courtId={court.id}
                        match={match}
                        matchRefs={matchRefs}
                        slotHeight={slotHeight}
                    />
                );
            })}
        </div>
    );
}

/**
 * DroppableCell — Satu sel dalam grid (slot × lapangan) yang bisa di-drop.
 */
function DroppableCell({ slotId, courtId, match, matchRefs, slotHeight }) {
    const { setNodeRef, isOver } = useDroppable({ id: `${slotId}_${courtId}` });

    return (
        <div
            ref={setNodeRef}
            className={`flex-1 min-w-[150px] border-r border-surface-700/30 last:border-r-0 p-1 relative transition-colors ${
                isOver ? 'bg-primary-500/20 ring-2 ring-primary-500' : ''
            }`}
        >
            {match && (
                <div
                    ref={el => { if (el) matchRefs.current[match.id] = el; }}
                    className="absolute inset-x-1 top-1 z-10"
                >
                    <MatchCard match={match} slotHeight={slotHeight} />
                </div>
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
        { color: '#1d4ed8', label: 'Regu (1 Sesi)' },
        { color: '#059669', label: 'Double (1 Sesi)' },
        { color: '#d97706', label: 'Team Regu (3 Sesi)' },
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
