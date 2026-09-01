import { useState, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';

const MODE_LABELS = {
    regu:        'Regu',
    double:      'Double',
    quadrant:    'Quadrant',
    team_regu:   'Team Regu',
    team_double: 'Team Double',
};

const STAGE_LABELS = {
    pool:        'Penyisihan Pool',
    round_robin: 'Round Robin',
    quarter:     'Perempat Final (QF)',
    semi:        'Semi Final (SF)',
    bronze:      'Perebutan Juara 3',
    final:       'Grand Final',
};

export default function PrintSchedule({
    tournament,
    matches = [],
    timeSlots = [],
    courts = [],
    totalDays = 1,
}) {
    const [viewMode, setViewMode] = useState('matrix'); // 'matrix' (Grid Lapangan seperti di web) | 'list' (Tabel Daftar Baris)
    const [selectedDay, setSelectedDay] = useState('all');
    const [selectedMode, setSelectedMode] = useState('all');
    const [selectedCourt, setSelectedCourt] = useState('all');
    const [showSignatures, setShowSignatures] = useState(true);
    const [showNotesCol, setShowNotesCol] = useState(true);
    const [showIshoma, setShowIshoma] = useState(true);

    const daysList = useMemo(() => {
        return Array.from({ length: totalDays || 1 }, (_, i) => i + 1);
    }, [totalDays]);

    const activeModes = useMemo(() => {
        const set = new Set();
        matches.forEach(m => {
            if (m.match_mode) set.add(m.match_mode);
        });
        return Array.from(set);
    }, [matches]);

    // Map timeSlots per day
    const timeSlotsByDay = useMemo(() => {
        const map = {};
        timeSlots.forEach(s => {
            const d = s.day_number || 1;
            if (!map[d]) map[d] = [];
            map[d].push(s);
        });
        Object.keys(map).forEach(d => {
            map[d].sort((a, b) => (a.slot_number || 0) - (b.slot_number || 0));
        });
        return map;
    }, [timeSlots]);

    // Map matches by `${day}_${time_slot_id}_${court_id}` for fast Matrix Grid lookup
    const matchGridMap = useMemo(() => {
        const map = {};
        matches.forEach(m => {
            const day = m.day_number || 1;
            const slotId = m.time_slot_id;
            const courtId = m.court_id;
            if (slotId && courtId) {
                map[`${day}_${slotId}_${courtId}`] = m;
            }
        });
        return map;
    }, [matches]);

    // Filter matches for list view
    const filteredMatches = useMemo(() => {
        return matches.filter(m => {
            if (selectedDay !== 'all' && Number(m.day_number) !== Number(selectedDay)) return false;
            if (selectedMode !== 'all' && m.match_mode !== selectedMode) return false;
            if (selectedCourt !== 'all' && Number(m.court_id) !== Number(selectedCourt)) return false;
            return true;
        });
    }, [matches, selectedDay, selectedMode, selectedCourt]);

    // Group filtered matches by Day for List view
    const matchesByDay = useMemo(() => {
        const map = {};
        daysList.forEach(d => {
            if (selectedDay === 'all' || Number(selectedDay) === d) {
                map[d] = [];
            }
        });

        filteredMatches.forEach(m => {
            const d = m.day_number || 1;
            if (map[d]) {
                map[d].push(m);
            }
        });

        Object.keys(map).forEach(d => {
            map[d].sort((a, b) => {
                const slotA = a.time_slot?.slot_number || a.time_slot_id || 0;
                const slotB = b.time_slot?.slot_number || b.time_slot_id || 0;
                if (slotA !== slotB) return slotA - slotB;
                const courtA = a.court?.court_number || a.court_id || 0;
                const courtB = b.court?.court_number || b.court_id || 0;
                return courtA - courtB;
            });
        });

        return map;
    }, [filteredMatches, daysList, selectedDay]);

    const handlePrint = () => {
        window.print();
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const todayDateFormatted = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    const activeCourts = useMemo(() => {
        if (selectedCourt === 'all') return courts;
        return courts.filter(c => Number(c.id) === Number(selectedCourt));
    }, [courts, selectedCourt]);

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 print:bg-white print:text-black font-sans print:font-serif">
            <Head title={`Jadwal Resmi — ${tournament.name}`} />

            {/* ─── SCREEN ONLY TOOLBAR (Hidden in Print) ─── */}
            <div className="no-print sticky top-0 z-50 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 p-4 shadow-2xl">
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    
                    {/* Title & Back */}
                    <div className="flex items-center gap-3">
                        <Link
                            href={route('tournaments.master-schedule.index', tournament.id)}
                            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors border border-slate-700 flex items-center gap-1.5"
                        >
                            <span>←</span>
                            <span>Kembali ke Grid</span>
                        </Link>
                        <div>
                            <h1 className="text-sm font-bold text-white flex items-center gap-2">
                                <span>📄</span>
                                <span>Cetak Jadwal Formal (Official Match Sheet)</span>
                            </h1>
                            <p className="text-[11px] text-slate-400">
                                Format formal turnamen bersih tanpa kolom wasit
                            </p>
                        </div>
                    </div>

                    {/* View Mode & Filter Controls */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        {/* Toggle Layout Mode */}
                        <div className="inline-flex p-1 rounded-xl bg-slate-900 border border-slate-700">
                            <button
                                type="button"
                                onClick={() => setViewMode('matrix')}
                                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                                    viewMode === 'matrix'
                                        ? 'bg-primary-600 text-white shadow-md'
                                        : 'text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                📊 Matriks Lapangan (Grid)
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('list')}
                                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                                    viewMode === 'list'
                                        ? 'bg-primary-600 text-white shadow-md'
                                        : 'text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                📋 Tabel Kronologis
                            </button>
                        </div>

                        {/* Day Filter */}
                        <select
                            value={selectedDay}
                            onChange={e => setSelectedDay(e.target.value)}
                            className="rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white font-bold focus:border-primary-500"
                        >
                            <option value="all">📅 Semua Hari (1 - {totalDays})</option>
                            {daysList.map(d => (
                                <option key={d} value={d}>Hari {d}</option>
                            ))}
                        </select>

                        {/* Category Filter */}
                        <select
                            value={selectedMode}
                            onChange={e => setSelectedMode(e.target.value)}
                            className="rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white font-bold focus:border-primary-500"
                        >
                            <option value="all">🏆 Semua Kategori</option>
                            {activeModes.map(m => (
                                <option key={m} value={m}>{MODE_LABELS[m] || m}</option>
                            ))}
                        </select>

                        {/* Court Filter (for list view) */}
                        {viewMode === 'list' && (
                            <select
                                value={selectedCourt}
                                onChange={e => setSelectedCourt(e.target.value)}
                                className="rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white font-bold focus:border-primary-500"
                            >
                                <option value="all">🏟️ Semua Lapangan</option>
                                {courts.map(c => (
                                    <option key={c.id} value={c.id}>{c.name || `Lapangan ${c.court_number}`}</option>
                                ))}
                            </select>
                        )}

                        {/* Print Action Button */}
                        <button
                            onClick={handlePrint}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all cursor-pointer"
                        >
                            <span>🖨️</span>
                            <span>Cetak / Simpan PDF</span>
                        </button>
                    </div>
                </div>

                {/* Print Options Checklist */}
                <div className="max-w-7xl mx-auto mt-3 pt-3 border-t border-slate-800/80 flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                    <span className="font-semibold text-slate-300">Opsi Dokumen:</span>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={showSignatures}
                            onChange={e => setShowSignatures(e.target.checked)}
                            className="rounded text-primary-600 bg-slate-900 border-slate-700"
                        />
                        <span>Lembar Pengesahan Panitia & Wasit</span>
                    </label>
                    {viewMode === 'list' && (
                        <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showNotesCol}
                                onChange={e => setShowNotesCol(e.target.checked)}
                                className="rounded text-primary-600 bg-slate-900 border-slate-700"
                            />
                            <span>Kolom Skor & Catatan</span>
                        </label>
                    )}
                    <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={showIshoma}
                            onChange={e => setShowIshoma(e.target.checked)}
                            className="rounded text-primary-600 bg-slate-900 border-slate-700"
                        />
                        <span>Baris Waktu ISHOMA</span>
                    </label>
                </div>
            </div>

            {/* ─── FORMAL DOCUMENT SHEET (White Paper Style) ─── */}
            <div className={`mx-auto my-6 p-6 sm:p-10 bg-white text-black shadow-2xl rounded-sm print:m-0 print:p-0 print:shadow-none print:max-w-full print:rounded-none ${
                viewMode === 'matrix' ? 'max-w-[297mm]' : 'max-w-[210mm]'
            }`}>
                
                {/* KOP SURAT RESMI */}
                <div className="border-b-4 border-double border-black pb-3 mb-5 text-center">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-black">
                        PERSATUAN SEPAK TAKRAW INDONESIA (PSTI)
                    </h2>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-700">
                        PANITIA PELAKSANA TURNAMEN & KOMISI PERTANDINGAN
                    </h3>
                    <h1 className="text-base sm:text-lg font-black uppercase mt-1 text-black tracking-tight">
                        JADWAL RESMI PERTANDINGAN (OFFICIAL MATCH SCHEDULE)
                    </h1>
                    <h2 className="text-sm font-bold uppercase text-blue-900 print:text-black mt-0.5">
                        {tournament.name}
                    </h2>
                </div>

                {/* METADATA TURNAMEN */}
                <div className="grid grid-cols-2 gap-2 text-[11px] mb-5 p-2.5 border border-black bg-gray-50 print:bg-white leading-relaxed">
                    <div>
                        <p><strong>📅 Tanggal:</strong> {tournament.start_date ? `${formatDate(tournament.start_date)} s/d ${formatDate(tournament.end_date)}` : '-'}</p>
                        <p><strong>🏟️ Jumlah Lapangan:</strong> {tournament.courts_count || courts.length} Lapangan Aktif</p>
                    </div>
                    <div className="text-right">
                        <p><strong>⏱️ Format Waktu:</strong> @{tournament.session_duration_minutes || 50} Menit / Sesi</p>
                        <p><strong>📊 Total Pertandingan:</strong> {filteredMatches.length} Match Terjadwal</p>
                    </div>
                </div>

                {/* ─── MODE 1: MATRIKS LAPANGAN (GRID JADWAL SEPERTI DI WEB) ─── */}
                {viewMode === 'matrix' && (
                    daysList
                        .filter(day => selectedDay === 'all' || Number(selectedDay) === day)
                        .map(dayNumber => {
                            const daySlots = timeSlotsByDay[dayNumber] || [];
                            const dayMatches = matches.filter(m => Number(m.day_number) === dayNumber);

                            return (
                                <div key={dayNumber} className="mb-8 page-break-after-auto">
                                    {/* Subheader Hari */}
                                    <div className="bg-gray-800 text-white print:bg-gray-200 print:text-black px-3 py-1.5 font-bold text-xs uppercase flex items-center justify-between border border-black mb-1">
                                        <span>JADWAL PERTANDINGAN — HARI KE-{dayNumber} ({dayMatches.length} Match)</span>
                                        <span className="text-[10px] font-normal">
                                            {tournament.start_date ? formatDate(new Date(new Date(tournament.start_date).getTime() + (dayNumber - 1) * 86400000)) : `Hari ${dayNumber}`}
                                        </span>
                                    </div>

                                    <table className="w-full text-[10px] border-collapse border border-black table-fixed">
                                        <thead>
                                            <tr className="bg-gray-100 print:bg-gray-200 text-black text-center font-bold">
                                                <th className="border border-black p-1.5 w-24">WAKTU / SESI</th>
                                                {activeCourts.map(court => (
                                                    <th key={court.id} className="border border-black p-1.5">
                                                        {court.name || `Lapangan ${court.court_number}`}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {daySlots.map(slot => {
                                                if (slot.slot_type === 'ishoma') {
                                                    if (!showIshoma) return null;
                                                    return (
                                                        <tr key={slot.id} className="bg-amber-50 print:bg-gray-100 text-center font-bold text-[10px]">
                                                            <td className="border border-black p-1.5 font-mono">
                                                                {slot.start_time?.slice(0, 5)} - {slot.end_time?.slice(0, 5)}
                                                            </td>
                                                            <td
                                                                colSpan={activeCourts.length}
                                                                className="border border-black py-1.5 text-amber-900 print:text-black uppercase tracking-wider"
                                                            >
                                                                🕌 ISHOMA (ISTIRAHAT & SHOLAT SIANG) — SELURUH LAPANGAN
                                                            </td>
                                                        </tr>
                                                    );
                                                }

                                                const timeLabel = `${slot.start_time?.slice(0, 5)} - ${slot.end_time?.slice(0, 5)}`;

                                                return (
                                                    <tr key={slot.id} className="align-top">
                                                        {/* Slot Time Column */}
                                                        <td className="border border-black p-2 text-center bg-gray-50 print:bg-white">
                                                            <span className="font-bold block text-[11px]">Sesi {slot.slot_number}</span>
                                                            <span className="font-mono text-[10px] text-gray-700 print:text-black">{timeLabel}</span>
                                                        </td>

                                                        {/* Court Match Cells */}
                                                        {activeCourts.map(court => {
                                                            const match = matchGridMap[`${dayNumber}_${slot.id}_${court.id}`];

                                                            if (!match) {
                                                                return (
                                                                    <td key={court.id} className="border border-black p-2 text-center text-gray-300 italic">
                                                                        - Kosong -
                                                                    </td>
                                                                );
                                                            }

                                                            // Filter mode check
                                                            if (selectedMode !== 'all' && match.match_mode !== selectedMode) {
                                                                return (
                                                                    <td key={court.id} className="border border-black p-2 text-center text-gray-300 italic">
                                                                        - Di Luar Filter -
                                                                    </td>
                                                                );
                                                            }

                                                            const category = MODE_LABELS[match.match_mode] || match.match_mode;
                                                            const stage = STAGE_LABELS[match.stage] || match.stage || (match.pool ? `Pool ${match.pool.name}` : '');

                                                            return (
                                                                <td key={court.id} className="border border-black p-2 bg-white">
                                                                    <div className="flex flex-col h-full justify-between gap-1.5">
                                                                        
                                                                        {/* Match Number & Badges */}
                                                                        <div className="flex items-center justify-between gap-1 text-[9px] pb-1 border-b border-gray-200">
                                                                            <span className="font-mono font-black text-black">
                                                                                {match.match_number ? `M-${String(match.match_number).padStart(2, '0')}` : 'MATCH'}
                                                                            </span>
                                                                            <span className="font-semibold text-gray-700 print:text-black uppercase">
                                                                                {category} {stage && `• ${stage}`}
                                                                            </span>
                                                                        </div>

                                                                        {/* Contestants (Home vs Away) */}
                                                                        <div className="text-[10px] font-bold py-0.5 space-y-0.5">
                                                                            <div className="text-blue-900 print:text-black truncate">
                                                                                {match.home_display_name || 'TBD'}
                                                                            </div>
                                                                            <div className="text-[8px] text-gray-500 font-normal uppercase text-center">
                                                                                VS
                                                                            </div>
                                                                            <div className="text-red-900 print:text-black truncate">
                                                                                {match.away_display_name || 'TBD'}
                                                                            </div>
                                                                        </div>

                                                                        {/* Score or Note line if finished */}
                                                                        {match.status === 'completed' ? (
                                                                            <div className="text-[10px] font-mono font-bold text-center pt-1 border-t border-gray-200">
                                                                                Skor: {match.home_score ?? 0} - {match.away_score ?? 0}
                                                                            </div>
                                                                        ) : null}
                                                                    </div>
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            );
                        })
                )}

                {/* ─── MODE 2: TABEL KRONOLOGIS (LIST VIEW) ─── */}
                {viewMode === 'list' && (
                    Object.keys(matchesByDay).map(dayKey => {
                        const dayNumber = Number(dayKey);
                        const dayMatches = matchesByDay[dayNumber] || [];
                        const daySlots = timeSlotsByDay[dayNumber] || [];
                        const ishomaSlot = daySlots.find(s => s.slot_type === 'ishoma');

                        return (
                            <div key={dayNumber} className="mb-8 page-break-after-auto">
                                
                                {/* Subheader Hari */}
                                <div className="bg-gray-800 text-white print:bg-gray-200 print:text-black px-3 py-1.5 font-bold text-xs uppercase flex items-center justify-between border border-black mb-1">
                                    <span>HARI KE-{dayNumber} ({dayMatches.length} Match)</span>
                                    <span className="text-[10px] font-normal">
                                        {tournament.start_date ? formatDate(new Date(new Date(tournament.start_date).getTime() + (dayNumber - 1) * 86400000)) : `Hari ${dayNumber}`}
                                    </span>
                                </div>

                                {dayMatches.length === 0 ? (
                                    <div className="p-4 border border-black text-center text-xs italic text-gray-500">
                                        Tidak ada jadwal pertandingan pada hari ini atau filter yang dipilih.
                                    </div>
                                ) : (
                                    <table className="w-full text-[10px] border-collapse border border-black">
                                        <thead>
                                            <tr className="bg-gray-100 print:bg-gray-200 text-black text-center font-bold">
                                                <th className="border border-black p-1.5 w-10">NO</th>
                                                <th className="border border-black p-1.5 w-24">WAKTU</th>
                                                <th className="border border-black p-1.5 w-16">LAP.</th>
                                                <th className="border border-black p-1.5 w-24">KATEGORI</th>
                                                <th className="border border-black p-1.5 w-28">BABAK / POOL</th>
                                                <th className="border border-black p-1.5">PERTANDINGAN (HOME vs AWAY)</th>
                                                {showNotesCol && (
                                                    <th className="border border-black p-1.5 w-24">SKOR / CATATAN</th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {dayMatches.map((m, idx) => {
                                                const timeLabel = m.time_slot
                                                    ? `${m.time_slot.start_time?.slice(0, 5)} - ${m.time_slot.end_time?.slice(0, 5)}`
                                                    : '-';
                                                const courtName = m.court?.name || `Lap ${m.court?.court_number || m.court_id || '-'}`;
                                                const category = MODE_LABELS[m.match_mode] || m.match_mode || 'Regu';
                                                const stage = STAGE_LABELS[m.stage] || m.stage || (m.pool ? `Pool ${m.pool.name}` : '-');

                                                const prevMatch = idx > 0 ? dayMatches[idx - 1] : null;
                                                const showIshomaBeforeThis = showIshoma && ishomaSlot && prevMatch &&
                                                    (prevMatch.time_slot?.slot_number || 0) < (ishomaSlot.slot_number || 0) &&
                                                    (m.time_slot?.slot_number || 0) > (ishomaSlot.slot_number || 0);

                                                return (
                                                    <>
                                                        {showIshomaBeforeThis && (
                                                            <tr key={`ishoma-${dayNumber}-${idx}`} className="bg-amber-50 print:bg-gray-100 text-center font-bold text-[10px]">
                                                                <td colSpan={showNotesCol ? 7 : 6} className="border border-black py-1.5 text-amber-900 print:text-black uppercase tracking-wider">
                                                                    🕌 ISHOMA (ISTIRAHAT & SHOLAT) — {ishomaSlot.start_time?.slice(0, 5)} s/d {ishomaSlot.end_time?.slice(0, 5)} (SEMUA LAPANGAN)
                                                                </td>
                                                            </tr>
                                                        )}

                                                        <tr key={m.id} className="hover:bg-gray-50 print:hover:bg-transparent">
                                                            <td className="border border-black p-1.5 text-center font-mono font-bold">
                                                                {m.match_number ? `M-${String(m.match_number).padStart(2, '0')}` : idx + 1}
                                                            </td>
                                                            <td className="border border-black p-1.5 text-center font-mono font-semibold whitespace-nowrap">
                                                                {timeLabel}
                                                            </td>
                                                            <td className="border border-black p-1.5 text-center font-semibold whitespace-nowrap">
                                                                {courtName}
                                                            </td>
                                                            <td className="border border-black p-1.5 text-center font-medium">
                                                                {category}
                                                            </td>
                                                            <td className="border border-black p-1.5 text-center font-medium">
                                                                {m.pool ? `Pool ${m.pool.name}` : stage}
                                                            </td>
                                                            <td className="border border-black p-1.5">
                                                                <div className="flex items-center justify-between gap-1 font-bold">
                                                                    <span className="text-left truncate">{m.home_display_name || 'TBD'}</span>
                                                                    <span className="text-[9px] font-normal text-gray-500 px-1">vs</span>
                                                                    <span className="text-right truncate">{m.away_display_name || 'TBD'}</span>
                                                                </div>
                                                            </td>
                                                            {showNotesCol && (
                                                                <td className="border border-black p-1.5 text-center">
                                                                    {m.status === 'completed' ? (
                                                                        <span className="font-mono font-bold">
                                                                            {m.home_score ?? 0} - {m.away_score ?? 0}
                                                                        </span>
                                                                    ) : (
                                                                        <div className="h-4 border-b border-dotted border-gray-400" />
                                                                    )}
                                                                </td>
                                                            )}
                                                        </tr>
                                                    </>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        );
                    })
                )}

                {/* LEMBAR PENGESAHAN & TANDA TANGAN */}
                {showSignatures && (
                    <div className="mt-8 pt-4 border-t border-black text-xs page-break-inside-avoid">
                        <div className="text-right mb-6">
                            <p>Ditetapkan di: <strong>Jakarta</strong></p>
                            <p>Pada Tanggal: <strong>{todayDateFormatted}</strong></p>
                        </div>

                        <div className="grid grid-cols-2 gap-12 text-center">
                            <div>
                                <p className="font-medium text-gray-700 print:text-black">Mengetahui,</p>
                                <p className="font-bold uppercase mt-0.5">Ketua Panitia Pelaksana / TD</p>
                                <div className="h-16 flex items-end justify-center">
                                    <p className="border-b border-black font-bold uppercase tracking-wider w-48 text-center pb-0.5">
                                        ( ........................................ )
                                    </p>
                                </div>
                                <p className="text-[10px] text-gray-600 print:text-black mt-1">NIP / ID Panitia</p>
                            </div>

                            <div>
                                <p className="font-medium text-gray-700 print:text-black">Menyetujui,</p>
                                <p className="font-bold uppercase mt-0.5">Koordinator Pertandingan</p>
                                <div className="h-16 flex items-end justify-center">
                                    <p className="border-b border-black font-bold uppercase tracking-wider w-48 text-center pb-0.5">
                                        ( ........................................ )
                                    </p>
                                </div>
                                <p className="text-[10px] text-gray-600 print:text-black mt-1">Panitia Pelaksana</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* FOOTER INFORMASI */}
                <div className="mt-8 pt-2 border-t border-gray-300 text-[9px] text-gray-500 print:text-black flex items-center justify-between">
                    <span>Dokumen ini dicetak otomatis melalui Takraw Match Management System</span>
                    <span>Halaman Resmi — {tournament.name}</span>
                </div>
            </div>

            {/* ─── PRINT MEDIA CSS RULES ─── */}
            <style>{`
                @media print {
                    @page {
                        size: A4 ${viewMode === 'matrix' ? 'landscape' : 'portrait'};
                        margin: 8mm 10mm;
                    }
                    body {
                        background: #ffffff !important;
                        color: #000000 !important;
                        font-family: 'Times New Roman', Times, serif;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .page-break-after-auto {
                        page-break-after: auto;
                    }
                    .page-break-inside-avoid {
                        page-break-inside: avoid;
                    }
                    table {
                        border-collapse: collapse !important;
                        width: 100% !important;
                    }
                    th, td {
                        border: 1px solid #000000 !important;
                        color: #000000 !important;
                    }
                }
            `}</style>
        </div>
    );
}
