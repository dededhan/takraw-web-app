import React, { useState, useMemo, useRef } from 'react';
import { router } from '@inertiajs/react';
import axios from 'axios';

export default function BulkImportAthletesModal({ isOpen, onClose, allDbTeams = [] }) {
    if (!isOpen) return null;

    const [file, setFile] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analyzeError, setAnalyzeError] = useState(null);
    const [analyzeData, setAnalyzeData] = useState(null);

    // Filter & selection states
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTeamKeys, setSelectedTeamKeys] = useState({}); // key -> boolean
    const [teamMapping, setTeamMapping] = useState({}); // key -> dbTeamId
    const [replaceExisting, setReplaceExisting] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [expandedTeams, setExpandedTeams] = useState({});

    const fileInputRef = useRef(null);

    // Handle File Selection and auto-analyze
    const handleFileChange = async (e) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setIsAnalyzing(true);
        setAnalyzeError(null);
        setAnalyzeData(null);
        setSelectedTeamKeys({});
        setTeamMapping({});

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const res = await axios.post(route('teams.analyze-bulk-file'), formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (res.data?.success) {
                setAnalyzeData(res.data);

                if (res.data.has_teams) {
                    // Pre-select all detected teams and their auto-matched database team
                    const initialSelected = {};
                    const initialMapping = {};
                    res.data.teams.forEach((t, idx) => {
                        const key = `t_${idx}`;
                        initialSelected[key] = true;
                        if (t.matched_team_id) {
                            initialMapping[key] = String(t.matched_team_id);
                        }
                    });
                    setSelectedTeamKeys(initialSelected);
                    setTeamMapping(initialMapping);
                } else {
                    // Single roster: nothing pre-selected
                    setSelectedTeamKeys({});
                }
            } else {
                setAnalyzeError(res.data?.message || 'Gagal membaca isi file.');
            }
        } catch (err) {
            console.error('Analyze file error:', err);
            const msg = err.response?.data?.message || err.message || 'Terjadi kesalahan saat memproses file.';
            setAnalyzeError(msg);
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Database teams options list
    const dbTeamsList = useMemo(() => {
        if (analyzeData?.all_db_teams && analyzeData.all_db_teams.length > 0) {
            return analyzeData.all_db_teams;
        }
        return allDbTeams;
    }, [analyzeData, allDbTeams]);

    // Filter teams based on search input
    const filteredTeams = useMemo(() => {
        if (!analyzeData) return [];

        if (analyzeData.has_teams) {
            if (!searchTerm.trim()) return analyzeData.teams.map((t, idx) => ({ ...t, key: `t_${idx}` }));

            const s = searchTerm.toLowerCase();
            return analyzeData.teams
                .map((t, idx) => ({ ...t, key: `t_${idx}` }))
                .filter((t) => {
                    return (
                        t.team_name.toLowerCase().includes(s) ||
                        (t.coach_name && t.coach_name.toLowerCase().includes(s)) ||
                        t.athletes.some((a) => a.name.toLowerCase().includes(s))
                    );
                });
        } else {
            // Single list: filter database teams
            if (!searchTerm.trim()) return dbTeamsList.map((t) => ({ ...t, key: `db_${t.id}` }));

            const s = searchTerm.toLowerCase();
            return dbTeamsList
                .filter((t) => t.name.toLowerCase().includes(s) || (t.region && t.region.toLowerCase().includes(s)))
                .map((t) => ({ ...t, key: `db_${t.id}` }));
        }
    }, [analyzeData, searchTerm, dbTeamsList]);

    // Count selected
    const selectedCount = useMemo(() => {
        return Object.values(selectedTeamKeys).filter(Boolean).length;
    }, [selectedTeamKeys]);

    // Toggle single team checkbox
    const handleToggleTeam = (key) => {
        setSelectedTeamKeys((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    // Toggle select all in current filtered view
    const handleSelectAllFiltered = (selectAll) => {
        const updated = { ...selectedTeamKeys };
        filteredTeams.forEach((item) => {
            updated[item.key] = selectAll;
        });
        setSelectedTeamKeys(updated);
    };

    // Change target database team mapping
    const handleMappingChange = (key, dbTeamId) => {
        setTeamMapping((prev) => ({
            ...prev,
            [key]: dbTeamId,
        }));
    };

    const toggleExpandTeam = (key) => {
        setExpandedTeams((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    // Reset whole form
    const handleReset = () => {
        setFile(null);
        setAnalyzeData(null);
        setAnalyzeError(null);
        setSelectedTeamKeys({});
        setTeamMapping({});
        setSearchTerm('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Submit bulk replace
    const handleSubmit = () => {
        if (!analyzeData) return;

        const targets = [];

        if (analyzeData.has_teams) {
            // Check each selected team
            for (let i = 0; i < analyzeData.teams.length; i++) {
                const key = `t_${i}`;
                if (!selectedTeamKeys[key]) continue;

                const teamData = analyzeData.teams[i];
                const targetDbId = teamMapping[key];

                if (!targetDbId) {
                    alert(`Pilih tim di database untuk "${teamData.team_name}" sebelum melanjutkan.`);
                    return;
                }

                targets.push({
                    team_id: parseInt(targetDbId, 10),
                    athletes: teamData.athletes,
                });
            }
        } else {
            // Single roster applied to all checked db teams
            const singleAthletes = analyzeData.athletes;
            dbTeamsList.forEach((dbTeam) => {
                const key = `db_${dbTeam.id}`;
                if (selectedTeamKeys[key]) {
                    targets.push({
                        team_id: dbTeam.id,
                        athletes: singleAthletes,
                    });
                }
            });
        }

        if (targets.length === 0) {
            alert('Silakan ceklis minimal satu tim untuk diimpor.');
            return;
        }

        // Confirmation dialog if replace existing is checked
        if (replaceExisting) {
            const confirmed = window.confirm(
                `Peringatan: Seluruh anggota lama dari ${targets.length} tim terpilih akan DIHAPUS dan DIGANTIKAN dengan atlet baru dari file Excel ini.\n\nApakah Anda yakin ingin melanjutkan?`
            );
            if (!confirmed) return;
        }

        setIsSubmitting(true);
        router.post(
            route('teams.bulk-replace-athletes'),
            {
                targets,
                replace_existing: replaceExisting,
            },
            {
                onSuccess: () => {
                    setIsSubmitting(false);
                    onClose();
                    handleReset();
                },
                onError: (errors) => {
                    setIsSubmitting(false);
                    console.error('Bulk import error:', errors);
                    alert('Gagal mengimpor data: ' + Object.values(errors).join(', '));
                },
            }
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-surface-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-surface-900 border border-surface-700/80 rounded-2xl shadow-2xl overflow-hidden">
                {/* Modal Header */}
                <div className="px-5 py-4 border-b border-surface-800 flex items-center justify-between bg-surface-950/40">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-lg shadow-sm">
                            📥
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-surface-100 flex items-center gap-2">
                                <span>Import & Ganti Anggota Tim via Excel</span>
                                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 uppercase tracking-wider">
                                    Admin
                                </span>
                            </h3>
                            <p className="text-xs text-surface-400 mt-0.5">
                                Unggah Excel, cari tim, dan ceklis tim yang ingin diupdate atau diganti anggotanya.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-surface-400 hover:text-surface-200 p-1.5 rounded-lg hover:bg-surface-800 transition-colors"
                        title="Tutup"
                    >
                        ✕
                    </button>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {/* Step 1: Upload Box */}
                    {!analyzeData && (
                        <div className="space-y-3">
                            <div className="border-2 border-dashed border-surface-700 hover:border-emerald-500/60 transition-colors rounded-2xl p-6 sm:p-8 text-center bg-surface-950/30">
                                <div className="text-4xl mb-3">📊</div>
                                <h4 className="text-sm font-bold text-surface-200 mb-1">
                                    Pilih File Excel / CSV Turnamen
                                </h4>
                                <p className="text-xs text-surface-400 max-w-md mx-auto mb-4">
                                    Mendukung file multi-tim (kolom <strong>Kontingen/Tim</strong>, <strong>Nama</strong>, <strong>Posisi</strong> seperti file UNJ Open) maupun template resmi sepak takraw.
                                </p>

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xlsx, .xls, .csv"
                                    onChange={handleFileChange}
                                    disabled={isAnalyzing}
                                    className="hidden"
                                    id="bulk-excel-input"
                                />
                                <label
                                    htmlFor="bulk-excel-input"
                                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
                                        isAnalyzing
                                            ? 'bg-surface-800 text-surface-400 cursor-not-allowed'
                                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                                    }`}
                                >
                                    {isAnalyzing ? (
                                        <>
                                            <span className="animate-spin inline-block">⏳</span>
                                            <span>Menganalisis file Excel...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>📂 Pilih File Excel (.xlsx / .xls)</span>
                                        </>
                                    )}
                                </label>
                            </div>

                            {/* Help Box */}
                            <div className="p-3.5 rounded-xl bg-blue-500/10 text-blue-300 text-xs border border-blue-500/20 leading-relaxed space-y-1">
                                <p className="font-bold flex items-center gap-1.5 text-blue-200">
                                    <span>💡 Informasi Format:</span>
                                </p>
                                <p className="text-[11.5px] text-surface-400">
                                    File multi-tim (seperti <em>DAFTAR NAMA PEMAIN UNJ OPEN</em>) akan otomatis dikelompokkan berdasarkan nama kontingen/tim. Posisi official (Coach, Manager) otomatis dipisahkan dari pemain, dan nomor punggung unik akan diatur secara otomatis.
                                </p>
                            </div>

                            {analyzeError && (
                                <div className="p-3.5 rounded-xl bg-red-500/10 text-red-300 text-xs border border-red-500/20 flex items-start gap-2">
                                    <span className="text-base">⚠️</span>
                                    <div>
                                        <p className="font-bold">Gagal Menganalisis File:</p>
                                        <p className="mt-0.5 text-surface-400">{analyzeError}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 2: Search, Preview & Selection */}
                    {analyzeData && (
                        <div className="space-y-4">
                            {/* File Info Bar */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-surface-950/50 border border-surface-800 text-xs">
                                <div className="flex items-center gap-2">
                                    <span className="text-emerald-400 font-bold">📄 {file?.name}</span>
                                    <span className="text-surface-500">•</span>
                                    <span className="px-2 py-0.5 rounded bg-surface-800 text-surface-300 font-mono text-[11px]">
                                        {analyzeData.total_athletes} Total Atlet
                                    </span>
                                    {analyzeData.has_teams && (
                                        <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono text-[11px] border border-purple-500/30">
                                            {analyzeData.teams.length} Tim Terdeteksi
                                        </span>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={handleReset}
                                    className="text-xs text-surface-400 hover:text-surface-200 underline cursor-pointer self-start sm:self-auto"
                                >
                                    Ganti File Lain
                                </button>
                            </div>

                            {/* Search & Bulk Selection Bar */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                                {/* Search input */}
                                <div className="relative flex-1">
                                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-surface-400 text-sm">
                                        🔍
                                    </span>
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder={
                                            analyzeData.has_teams
                                                ? 'Cari nama tim, kontingen, pelatih, atau pemain...'
                                                : 'Cari tim di database...'
                                        }
                                        className="w-full pl-9 pr-8 py-2 bg-surface-950/70 border border-surface-700/80 rounded-xl text-xs text-surface-100 placeholder-surface-500 focus:outline-none focus:border-emerald-500 transition-colors"
                                    />
                                    {searchTerm && (
                                        <button
                                            type="button"
                                            onClick={() => setSearchTerm('')}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-surface-400 hover:text-surface-200 text-xs"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>

                                {/* Quick selection actions */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    <button
                                        type="button"
                                        onClick={() => handleSelectAllFiltered(true)}
                                        className="px-2.5 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-300 text-[11px] font-semibold border border-surface-750 transition-colors"
                                    >
                                        ✓ Pilih Semua ({filteredTeams.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleSelectAllFiltered(false)}
                                        className="px-2.5 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-300 text-[11px] font-semibold border border-surface-750 transition-colors"
                                    >
                                        Batal Pilih
                                    </button>
                                    <span className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-[11px] font-bold border border-emerald-500/20">
                                        {selectedCount} Terpilih
                                    </span>
                                </div>
                            </div>

                            {/* Teams Listing */}
                            <div className="border border-surface-700/70 rounded-xl bg-surface-950/40 divide-y divide-surface-800/80 max-h-[380px] overflow-y-auto">
                                {filteredTeams.length === 0 ? (
                                    <div className="p-8 text-center text-surface-400 text-xs">
                                        <p className="text-xl mb-1">🔍</p>
                                        <p>Tidak ada tim yang cocok dengan pencarian "{searchTerm}".</p>
                                    </div>
                                ) : (
                                    filteredTeams.map((item) => {
                                        const isSelected = !!selectedTeamKeys[item.key];
                                        const isExpanded = !!expandedTeams[item.key];

                                        if (analyzeData.has_teams) {
                                            const currentMappedDbId = teamMapping[item.key] || '';
                                            const isMapped = Boolean(currentMappedDbId);

                                            return (
                                                <div
                                                    key={item.key}
                                                    className={`p-3 sm:p-3.5 transition-colors ${
                                                        isSelected ? 'bg-emerald-950/15' : 'hover:bg-surface-900/40 opacity-70'
                                                    }`}
                                                >
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                                        {/* Checkbox and Team Title */}
                                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                                            <input
                                                                type="checkbox"
                                                                id={`check_${item.key}`}
                                                                checked={isSelected}
                                                                onChange={() => handleToggleTeam(item.key)}
                                                                className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-surface-700 bg-surface-900 cursor-pointer"
                                                            />
                                                            <label
                                                                htmlFor={`check_${item.key}`}
                                                                className="flex-1 min-w-0 cursor-pointer select-none"
                                                            >
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className="font-bold text-xs text-surface-100">
                                                                        {item.team_name}
                                                                    </span>
                                                                    <span className="px-2 py-0.5 rounded-full bg-surface-800 text-surface-300 text-[10.5px] font-mono">
                                                                        {item.athletes.length} atlet
                                                                    </span>
                                                                    {item.coach_name && (
                                                                        <span className="text-[11px] text-surface-400 flex items-center gap-1">
                                                                            <span>👨‍💼 Pelatih:</span>
                                                                            <strong className="text-surface-300">
                                                                                {item.coach_name}
                                                                            </strong>
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {/* Athlete Names Preview Pill */}
                                                                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                                                    {item.athletes.slice(0, 3).map((a, aIdx) => (
                                                                        <span
                                                                            key={aIdx}
                                                                            className="px-1.5 py-0.5 rounded bg-surface-900 border border-surface-800 text-[10px] text-surface-400"
                                                                        >
                                                                            #{a.jersey_number} {a.name} ({a.position})
                                                                        </span>
                                                                    ))}
                                                                    {item.athletes.length > 3 && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.preventDefault();
                                                                                toggleExpandTeam(item.key);
                                                                            }}
                                                                            className="text-[10px] text-emerald-400 hover:underline"
                                                                        >
                                                                            {isExpanded
                                                                                ? 'Tutup'
                                                                                : `+${item.athletes.length - 3} lainnya`}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </label>
                                                        </div>

                                                        {/* Database Target Team Mapping Dropdown */}
                                                        <div className="sm:w-64 shrink-0 pl-7 sm:pl-0">
                                                            <label className="block text-[10px] font-semibold text-surface-400 uppercase tracking-wider mb-1">
                                                                Target Tim di Web:
                                                            </label>
                                                            <select
                                                                value={currentMappedDbId}
                                                                onChange={(e) => handleMappingChange(item.key, e.target.value)}
                                                                disabled={!isSelected}
                                                                className={`w-full py-1.5 px-2 text-xs rounded-xl bg-surface-900 border text-surface-200 focus:outline-none focus:border-emerald-500 ${
                                                                    !isMapped && isSelected
                                                                        ? 'border-amber-500/80 bg-amber-500/10 text-amber-200'
                                                                        : 'border-surface-700'
                                                                }`}
                                                            >
                                                                <option value="">-- Pilih Tim di Database --</option>
                                                                {dbTeamsList.map((dt) => (
                                                                    <option key={dt.id} value={dt.id}>
                                                                        {dt.name} {dt.region ? `(${dt.region})` : ''}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>

                                                    {/* Expanded Athlete Roster */}
                                                    {isExpanded && (
                                                        <div className="mt-3 pt-2.5 border-t border-surface-800/80 pl-7 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                                            {item.athletes.map((a, aIdx) => (
                                                                <div
                                                                    key={aIdx}
                                                                    className="flex items-center justify-between p-1.5 rounded bg-surface-900/80 border border-surface-800 text-[11px]"
                                                                >
                                                                    <span className="text-surface-200 font-medium">
                                                                        <strong className="text-emerald-400">#{a.jersey_number}</strong> {a.name}
                                                                    </span>
                                                                    <span className="px-1.5 py-0.5 rounded bg-surface-800 text-[9.5px] text-surface-400">
                                                                        {a.position}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        } else {
                                            // Single list: item is a DB team
                                            return (
                                                <div
                                                    key={item.key}
                                                    className={`p-3 flex items-center justify-between transition-colors ${
                                                        isSelected ? 'bg-emerald-950/15' : 'hover:bg-surface-900/40 opacity-70'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="checkbox"
                                                            id={`check_${item.key}`}
                                                            checked={isSelected}
                                                            onChange={() => handleToggleTeam(item.key)}
                                                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-surface-700 bg-surface-900 cursor-pointer"
                                                        />
                                                        <label
                                                            htmlFor={`check_${item.key}`}
                                                            className="cursor-pointer select-none"
                                                        >
                                                            <p className="font-bold text-xs text-surface-100">
                                                                {item.name}
                                                            </p>
                                                            {item.region && (
                                                                <p className="text-[11px] text-surface-400">
                                                                    📍 {item.region}
                                                                </p>
                                                            )}
                                                        </label>
                                                    </div>
                                                    <span className="text-[11px] text-surface-400">
                                                        {item.athletes_count ?? ''} atlet saat ini
                                                    </span>
                                                </div>
                                            );
                                        }
                                    })
                                )}
                            </div>

                            {/* Replacement Option */}
                            <div className="p-3 rounded-xl bg-surface-950/50 border border-surface-800 flex items-center justify-between">
                                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={replaceExisting}
                                        onChange={(e) => setReplaceExisting(e.target.checked)}
                                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-surface-700 bg-surface-900 cursor-pointer"
                                    />
                                    <div>
                                        <p className="text-xs font-bold text-surface-200">
                                            🔄 Ganti / Timpa seluruh anggota tim saat ini
                                        </p>
                                        <p className="text-[11px] text-surface-400">
                                            Hapus daftar atlet lama dari tim yang diceklis dan gantikan bersih dengan data atlet dari file Excel.
                                        </p>
                                    </div>
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer Actions */}
                <div className="px-5 py-3.5 border-t border-surface-800 flex items-center justify-between bg-surface-950/40">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-4 py-2 rounded-xl border border-surface-700 text-surface-400 hover:text-surface-200 text-xs font-semibold transition-colors"
                    >
                        Batal
                    </button>

                    {analyzeData && (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting || selectedCount === 0}
                            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer transition-all"
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="animate-spin inline-block">⏳</span>
                                    <span>Menyimpan & Mengganti Anggota...</span>
                                </>
                            ) : (
                                <>
                                    <span>🚀 Ganti Anggota {selectedCount} Tim Terpilih</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
