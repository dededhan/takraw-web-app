import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const MODE_LABELS = {
    regu:        { label: 'Regu',        icon: '🏐', color: 'from-blue-600 to-blue-800', border: 'border-blue-500/40', badge: 'bg-blue-500/20 text-blue-300' },
    double:      { label: 'Double',      icon: '👥', color: 'from-emerald-600 to-emerald-800', border: 'border-emerald-500/40', badge: 'bg-emerald-500/20 text-emerald-300' },
    quadrant:    { label: 'Quadrant',    icon: '⬡',  color: 'from-purple-600 to-purple-800', border: 'border-purple-500/40', badge: 'bg-purple-500/20 text-purple-300' },
    team_regu:   { label: 'Team Regu',   icon: '🏆', color: 'from-amber-600 to-amber-800', border: 'border-amber-500/40', badge: 'bg-amber-500/20 text-amber-300' },
    team_double: { label: 'Team Double', icon: '🥇', color: 'from-red-600 to-red-800', border: 'border-red-500/40', badge: 'bg-red-500/20 text-red-300' },
};

const STAGE_OPTIONS = [
    { value: 'final',        label: '🏆 Final / Grand Final' },
    { value: 'third_place',  label: '🥉 Perebutan Juara 3' },
    { value: 'semifinal',    label: '⚔️ Semifinal' },
    { value: 'round_of_8',   label: '🥊 8 Besar (Quarterfinal)' },
    { value: 'round_of_16',  label: '🛡️ 16 Besar (Round of 16)' },
];

export default function BracketMatrix({
    tournament,
    activeModes = [],
    modeBrackets = {},
}) {
    const [activeTab, setActiveTab] = useState(activeModes[0]?.match_mode || 'regu');
    const [saving, setSaving] = useState(false);
    const [flash, setFlash] = useState(null);

    // Inisialisasi formData: keyed by [mode][bracketName] => Array of stages
    const [formData, setFormData] = useState(() => {
        const initial = {};
        activeModes.forEach(mode => {
            const mKey = mode.match_mode;
            initial[mKey] = {};
            const brackets = modeBrackets[mKey] || [];
            brackets.forEach(b => {
                initial[mKey][b.bracket_name] = (b.stages || []).map(s => ({
                    bracket_stage:    s.bracket_stage || 'final',
                    bracket_position: Number(s.bracket_position || 1),
                    home_source:      s.home_source || 'pool_A_rank_1',
                    away_source:      s.away_source || 'pool_B_rank_1',
                }));
            });
        });
        return initial;
    });

    const activeBrackets = modeBrackets[activeTab] || [];

    // Helper: update stage row untuk braket tertentu
    const updateBracketRow = (bracketName, stageIdx, field, value) => {
        setFormData(prev => ({
            ...prev,
            [activeTab]: {
                ...(prev[activeTab] || {}),
                [bracketName]: (prev[activeTab]?.[bracketName] || []).map((row, i) =>
                    i === stageIdx ? { ...row, [field]: value } : row
                ),
            },
        }));
    };

    // Helper: tambah baris babak untuk braket tertentu
    const addBracketRow = (bracketName, defaultStage = 'final') => {
        const currentRows = formData[activeTab]?.[bracketName] || [];
        const nextPos = currentRows.filter(r => r.bracket_stage === defaultStage).length + 1;
        const newRow = {
            bracket_stage:    defaultStage,
            bracket_position: nextPos,
            home_source:      'pool_A_rank_1',
            away_source:      'pool_B_rank_1',
        };
        setFormData(prev => ({
            ...prev,
            [activeTab]: {
                ...(prev[activeTab] || {}),
                [bracketName]: [...currentRows, newRow],
            },
        }));
    };

    // Helper: hapus baris babak untuk braket tertentu
    const deleteBracketRow = (bracketName, stageIdx) => {
        setFormData(prev => ({
            ...prev,
            [activeTab]: {
                ...(prev[activeTab] || {}),
                [bracketName]: (prev[activeTab]?.[bracketName] || []).filter((_, i) => i !== stageIdx),
            },
        }));
    };

    // Helper: terapkan preset ke braket tertentu
    const applyBracketPreset = (bracketName, poolCount, presetType) => {
        let newStages = [];

        if (presetType === 'empty') {
            newStages = [];
        } else if (presetType === '2pool_semifinal') {
            newStages = [
                { bracket_stage: 'semifinal', bracket_position: 1, home_source: 'pool_A_rank_1', away_source: 'pool_B_rank_2' },
                { bracket_stage: 'semifinal', bracket_position: 2, home_source: 'pool_B_rank_1', away_source: 'pool_A_rank_2' },
                { bracket_stage: 'final', bracket_position: 1, home_source: 'winner_sf_1', away_source: 'winner_sf_2' },
            ];
        } else if (presetType === '2pool_direct_final') {
            newStages = [
                { bracket_stage: 'final', bracket_position: 1, home_source: 'pool_A_rank_1', away_source: 'pool_B_rank_1' },
            ];
        } else if (presetType === '2pool_two_finals') {
            newStages = [
                { bracket_stage: 'final', bracket_position: 1, home_source: 'pool_A_rank_1', away_source: 'pool_A_rank_2' },
                { bracket_stage: 'final', bracket_position: 2, home_source: 'pool_B_rank_1', away_source: 'pool_B_rank_2' },
            ];
        } else if (presetType === '3pool_wildcard') {
            newStages = [
                { bracket_stage: 'round_of_8', bracket_position: 1, home_source: 'pool_A_rank_1', away_source: 'bye' },
                { bracket_stage: 'round_of_8', bracket_position: 2, home_source: 'pool_B_rank_1', away_source: 'wildcard_1' },
                { bracket_stage: 'round_of_8', bracket_position: 3, home_source: 'pool_C_rank_1', away_source: 'wildcard_2' },
                { bracket_stage: 'semifinal', bracket_position: 1, home_source: 'winner_qf_1', away_source: 'winner_qf_2' },
                { bracket_stage: 'semifinal', bracket_position: 2, home_source: 'winner_qf_3', away_source: 'best_runner_up' },
                { bracket_stage: 'final', bracket_position: 1, home_source: 'winner_sf_1', away_source: 'winner_sf_2' },
            ];
        } else if (presetType === '3pool_semifinal') {
            newStages = [
                { bracket_stage: 'semifinal', bracket_position: 1, home_source: 'pool_A_rank_1', away_source: 'pool_B_rank_1' },
                { bracket_stage: 'semifinal', bracket_position: 2, home_source: 'pool_C_rank_1', away_source: 'wildcard_1' },
                { bracket_stage: 'final', bracket_position: 1, home_source: 'winner_sf_1', away_source: 'winner_sf_2' },
            ];
        } else if (presetType === '4pool_qf') {
            newStages = [
                { bracket_stage: 'round_of_8', bracket_position: 1, home_source: 'pool_A_rank_1', away_source: 'pool_B_rank_2' },
                { bracket_stage: 'round_of_8', bracket_position: 2, home_source: 'pool_C_rank_1', away_source: 'pool_D_rank_2' },
                { bracket_stage: 'round_of_8', bracket_position: 3, home_source: 'pool_B_rank_1', away_source: 'pool_A_rank_2' },
                { bracket_stage: 'round_of_8', bracket_position: 4, home_source: 'pool_D_rank_1', away_source: 'pool_C_rank_2' },
                { bracket_stage: 'semifinal', bracket_position: 1, home_source: 'winner_qf_1', away_source: 'winner_qf_2' },
                { bracket_stage: 'semifinal', bracket_position: 2, home_source: 'winner_qf_3', away_source: 'winner_qf_4' },
                { bracket_stage: 'final', bracket_position: 1, home_source: 'winner_sf_1', away_source: 'winner_sf_2' },
            ];
        }

        setFormData(prev => ({
            ...prev,
            [activeTab]: {
                ...(prev[activeTab] || {}),
                [bracketName]: newStages,
            },
        }));
    };

    // Sumber dropdown per braket
    const getBracketSourceOptions = (bracket) => {
        const options = [];
        const pools = bracket.pools || [];

        if (pools.length > 0) {
            pools.forEach(p => {
                options.push({ value: `pool_${p.name}_rank_1`, label: `🥇 Juara Pool ${p.name}` });
                options.push({ value: `pool_${p.name}_rank_2`, label: `🥈 Runner-up Pool ${p.name}` });
                options.push({ value: `pool_${p.name}_rank_3`, label: `🥉 Peringkat 3 Pool ${p.name}` });
            });
        } else {
            const count = bracket.pool_count || 2;
            const letters = Array.from({ length: Math.max(1, count) }, (_, i) => String.fromCharCode(65 + i));
            letters.forEach(p => {
                options.push({ value: `pool_${p}_rank_1`, label: `🥇 Juara Pool ${p}` });
                options.push({ value: `pool_${p}_rank_2`, label: `🥈 Runner-up Pool ${p}` });
                options.push({ value: `pool_${p}_rank_3`, label: `🥉 Peringkat 3 Pool ${p}` });
            });
        }

        // Babak Gugur Lanjutan
        options.push({ value: 'winner_sf_1', label: '🏆 Pemenang Semifinal #1' });
        options.push({ value: 'winner_sf_2', label: '🏆 Pemenang Semifinal #2' });
        options.push({ value: 'loser_sf_1', label: '🥉 Kalah Semifinal #1 (Juara 3)' });
        options.push({ value: 'loser_sf_2', label: '🥉 Kalah Semifinal #2 (Juara 3)' });

        options.push({ value: 'winner_qf_1', label: '🥊 Pemenang QF #1' });
        options.push({ value: 'winner_qf_2', label: '🥊 Pemenang QF #2' });
        options.push({ value: 'winner_qf_3', label: '🥊 Pemenang QF #3' });
        options.push({ value: 'winner_qf_4', label: '🥊 Pemenang QF #4' });

        // Special: BYE & Wildcard
        options.push({ value: 'bye', label: '⬛ BYE (Langsung Lolos)' });
        options.push({ value: 'wildcard_1', label: '🃏 Wildcard #1' });
        options.push({ value: 'wildcard_2', label: '🃏 Wildcard #2' });
        options.push({ value: 'best_runner_up', label: '🌟 Runner-up Terbaik' });

        return options;
    };

    const handleSave = () => {
        setSaving(true);
        const allMatrices = [];

        Object.entries(formData).forEach(([modeKey, bracketMap]) => {
            Object.entries(bracketMap || {}).forEach(([bracketName, stages]) => {
                (stages || []).forEach((s, idx) => {
                    allMatrices.push({
                        match_mode:       modeKey,
                        bracket_name:     bracketName,
                        bracket_stage:    s.bracket_stage,
                        bracket_position: Number(s.bracket_position || (idx + 1)),
                        home_source:      s.home_source,
                        away_source:      s.away_source,
                    });
                });
            });
        });

        router.post(
            route('tournaments.master-schedule.bracket-matrix.store', tournament.id),
            { matrices: allMatrices },
            {
                onSuccess: () => {
                    setFlash({ type: 'success', msg: 'Konfigurasi Bracket Matrix berhasil disimpan!' });
                    setSaving(false);
                },
                onError: () => {
                    setFlash({ type: 'error', msg: 'Gagal menyimpan Bracket Matrix. Periksa kembali form.' });
                    setSaving(false);
                },
            }
        );
    };

    return (
        <AuthenticatedLayout header={
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link
                        href={route('tournaments.master-schedule.config', tournament.id)}
                        className="text-surface-400 hover:text-surface-200 text-sm font-semibold transition-colors"
                    >
                        ← Konfigurasi
                    </Link>
                    <span className="text-surface-600">/</span>
                    <h2 className="text-lg font-bold text-surface-100 flex items-center gap-2">
                        <span>⚔️</span>
                        <span>Konfigurasi Bracket Matrix Per Braket</span>
                        <span className="text-surface-400 font-normal text-sm">({tournament.name})</span>
                    </h2>
                </div>
                <Link
                    href={route('pools.index', tournament.id)}
                    target="_blank"
                    className="px-3 py-1.5 rounded-xl bg-surface-800 hover:bg-surface-700 border border-surface-700 text-xs font-bold text-primary-300 flex items-center gap-1.5 transition-colors"
                >
                    <span>⚙️ Atur Bagan & Pool</span>
                    <span>↗</span>
                </Link>
            </div>
        }>
            <Head title={`Bracket Matrix — ${tournament.name}`} />

            <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-6">
                {flash && (
                    <div className={`p-4 rounded-2xl text-sm font-bold border flex items-center gap-2 animate-fade-in ${
                        flash.type === 'success'
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                            : 'bg-red-500/10 border-red-500/20 text-red-300'
                    }`}>
                        <span>{flash.type === 'success' ? '✅' : '⚠️'}</span>
                        <span>{flash.msg}</span>
                    </div>
                )}

                {/* Banner Panduan */}
                <div className="rounded-3xl border border-surface-700/60 bg-surface-900/90 backdrop-blur-md p-6 shadow-xl space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h3 className="text-base font-bold text-surface-100 flex items-center gap-2">
                                <span>🧭</span>
                                <span>Alur Pembacaan Sistem: Mode ➔ Braket ➔ Jumlah Pool ➔ Custom Babak Gugur</span>
                            </h3>
                            <p className="text-xs text-surface-400 mt-1 leading-relaxed max-w-3xl">
                                Setiap mode membaca braket dan pool yang ada. Jika suatu braket <strong>1 Pool</strong>, maka otomatis <strong>tidak ada babak gugur</strong> (juara dari klasemen). Jika <strong>2 Pool</strong> ada Semifinal/Final, dan jika <strong>3 Pool</strong> ada sistem BYE/Wildcard.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Mode Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {activeModes.map(mode => {
                        const mKey = mode.match_mode;
                        const cfg = MODE_LABELS[mKey] || { label: mKey, icon: '🏆', color: 'from-gray-600 to-gray-800', border: 'border-surface-700', badge: 'bg-surface-800 text-surface-300' };
                        const bList = modeBrackets[mKey] || [];
                        const totalPools = bList.reduce((acc, b) => acc + (b.pool_count || 0), 0);
                        const isCurrent = activeTab === mKey;

                        return (
                            <button
                                key={mKey}
                                type="button"
                                onClick={() => setActiveTab(mKey)}
                                className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl font-bold text-xs transition-all whitespace-nowrap border-2 ${
                                    isCurrent
                                        ? `bg-gradient-to-r ${cfg.color} text-white shadow-lg ring-1 ring-white/20 border-white/30 scale-[1.02]`
                                        : 'bg-surface-900/80 border-surface-800 text-surface-400 hover:text-surface-200 hover:border-surface-700'
                                }`}
                            >
                                <span className="text-lg">{cfg.icon}</span>
                                <span>{cfg.label}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${cfg.badge}`}>
                                    {bList.length} Braket ({totalPools} Pool)
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* List Braket Cards di dalam Mode Aktif */}
                <div className="space-y-6">
                    {activeBrackets.map((b, bIdx) => {
                        const bracketRows = formData[activeTab]?.[b.bracket_name] || [];
                        const sourceOptions = getBracketSourceOptions(b);

                        return (
                            <div
                                key={b.bracket_name || bIdx}
                                className="rounded-3xl border border-surface-700/60 bg-surface-900/90 backdrop-blur-md p-6 sm:p-7 space-y-5 shadow-xl transition-all"
                            >
                                {/* Header Braket */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-surface-800">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2.5">
                                            <span className="text-lg">🏷️</span>
                                            <h3 className="text-base font-bold text-surface-100">
                                                {b.bracket_name}
                                            </h3>
                                            <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-surface-800 text-primary-300 border border-surface-700">
                                                {b.pool_count} Pool
                                            </span>
                                            {b.is_single_pool ? (
                                                <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                    🏆 1 Pool (Round Robin Murni)
                                                </span>
                                            ) : (
                                                <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                    ⚔️ Babak Gugur / Playoff
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 text-xs text-surface-400">
                                            <span>Daftar Pool:</span>
                                            {(b.pools || []).map(p => (
                                                <span key={p.id} className="px-2 py-0.5 rounded bg-surface-950 text-surface-300 border border-surface-800 font-medium">
                                                    Pool {p.name} ({p.teams_count} Tim)
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Preset Cepat Khusus Braket Ini */}
                                    {!b.is_single_pool && (
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-[11px] font-bold text-surface-400 uppercase">Preset:</span>
                                            {b.pool_count === 2 && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => applyBracketPreset(b.bracket_name, 2, '2pool_semifinal')}
                                                        className="px-2.5 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-semibold transition-colors"
                                                    >
                                                        ⚔️ Semifinal Silang + Final
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => applyBracketPreset(b.bracket_name, 2, '2pool_direct_final')}
                                                        className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold transition-colors"
                                                    >
                                                        🥇 Grand Final (Juara A vs B)
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => applyBracketPreset(b.bracket_name, 2, '2pool_two_finals')}
                                                        className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-colors"
                                                    >
                                                        🏆 2 Final Terpisah
                                                    </button>
                                                </>
                                            )}

                                            {b.pool_count === 3 && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => applyBracketPreset(b.bracket_name, 3, '3pool_wildcard')}
                                                        className="px-2.5 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-semibold transition-colors"
                                                    >
                                                        🥊 Wildcard / BYE + SF + Final
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => applyBracketPreset(b.bracket_name, 3, '3pool_semifinal')}
                                                        className="px-2.5 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-semibold transition-colors"
                                                    >
                                                        ⚔️ Semifinal Langsung (A vs B, C vs Wildcard)
                                                    </button>
                                                </>
                                            )}

                                            {b.pool_count >= 4 && (
                                                <button
                                                    type="button"
                                                    onClick={() => applyBracketPreset(b.bracket_name, b.pool_count, '4pool_qf')}
                                                    className="px-2.5 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-semibold transition-colors"
                                                >
                                                    🥊 QF (8 Besar) + SF + Final
                                                </button>
                                            )}

                                            <button
                                                type="button"
                                                onClick={() => applyBracketPreset(b.bracket_name, b.pool_count, 'empty')}
                                                className="px-2.5 py-1.5 rounded-xl bg-surface-800 hover:bg-surface-700 border border-surface-700 text-surface-400 text-xs font-semibold transition-colors"
                                            >
                                                Kosongkan
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Body Braket: 1 Pool vs Multi Pool */}
                                {b.is_single_pool ? (
                                    <div className="p-6 text-center bg-emerald-500/5 border border-emerald-500/20 rounded-2xl space-y-2">
                                        <div className="text-3xl">🏆</div>
                                        <h4 className="font-bold text-emerald-300 text-sm">
                                            Format 1 Pool (Full Round Robin — Tanpa Babak Gugur)
                                        </h4>
                                        <p className="text-surface-300 text-xs max-w-xl mx-auto leading-relaxed">
                                            Braket <strong>"{b.bracket_name}"</strong> hanya terdiri dari 1 Pool. Seluruh tim saling bertanding setengah kompetisi di babak pool. <strong>Pemenang dan Juara 1, 2, 3 ditentukan langsung berdasarkan perolehan poin klasemen tertinggi akhir pool</strong> tanpa ada babak gugur lanjutan.
                                        </p>
                                        <div className="pt-1">
                                            <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-semibold border border-emerald-500/20">
                                                ✨ Otomatis Tanpa Pertandingan Gugur
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {bracketRows.length === 0 ? (
                                            <div className="p-6 text-center bg-surface-950/70 rounded-2xl border border-dashed border-surface-800 space-y-2.5">
                                                <div className="text-3xl">🥊</div>
                                                <p className="text-surface-300 text-xs font-semibold">
                                                    Belum ada jadwal babak gugur untuk braket "{b.bracket_name}".
                                                </p>
                                                <p className="text-surface-400 text-xs max-w-md mx-auto">
                                                    Pilih preset cepat di atas atau klik tombol di bawah untuk menyusun babak gugur.
                                                </p>
                                                <div className="pt-1 flex justify-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => addBracketRow(b.bracket_name, 'final')}
                                                        className="px-3.5 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold transition-all shadow-md"
                                                    >
                                                        ➕ Tambah Laga Babak Gugur
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto space-y-3">
                                                <table className="w-full text-left text-xs border-collapse">
                                                    <thead>
                                                        <tr className="border-b border-surface-800 text-surface-400 uppercase tracking-wider text-[10.5px]">
                                                            <th className="py-2.5 px-3 w-44">Babak</th>
                                                            <th className="py-2.5 px-2 w-14 text-center">Posisi #</th>
                                                            <th className="py-2.5 px-3">Tim Home (Sudut Merah)</th>
                                                            <th className="py-2.5 px-2 w-8 text-center">vs</th>
                                                            <th className="py-2.5 px-3">Tim Away (Sudut Biru)</th>
                                                            <th className="py-2.5 px-2 w-14 text-center">Aksi</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-surface-800/60">
                                                        {bracketRows.map((row, rIdx) => (
                                                            <tr key={rIdx} className="hover:bg-surface-950/40 transition-colors">
                                                                {/* Babak */}
                                                                <td className="py-2.5 px-3">
                                                                    <select
                                                                        value={row.bracket_stage}
                                                                        onChange={e => updateBracketRow(b.bracket_name, rIdx, 'bracket_stage', e.target.value)}
                                                                        className="w-full rounded-xl bg-surface-950 border border-surface-700 px-3 py-1.5 text-xs font-bold text-surface-100 focus:border-primary-500"
                                                                    >
                                                                        {STAGE_OPTIONS.map(opt => (
                                                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                                        ))}
                                                                    </select>
                                                                </td>

                                                                {/* Posisi */}
                                                                <td className="py-2.5 px-2 text-center">
                                                                    <input
                                                                        type="number"
                                                                        min="1"
                                                                        max="16"
                                                                        value={row.bracket_position}
                                                                        onChange={e => updateBracketRow(b.bracket_name, rIdx, 'bracket_position', +e.target.value)}
                                                                        className="w-12 text-center rounded-xl bg-surface-950 border border-surface-700 px-1 py-1.5 text-xs font-mono font-bold text-surface-200"
                                                                    />
                                                                </td>

                                                                {/* Tim Home */}
                                                                <td className="py-2.5 px-3">
                                                                    <select
                                                                        value={row.home_source}
                                                                        onChange={e => updateBracketRow(b.bracket_name, rIdx, 'home_source', e.target.value)}
                                                                        className="w-full rounded-xl bg-surface-950 border border-surface-700 px-3 py-1.5 text-xs font-semibold text-surface-200 focus:border-primary-500"
                                                                    >
                                                                        {sourceOptions.map(opt => (
                                                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                                        ))}
                                                                    </select>
                                                                </td>

                                                                {/* vs */}
                                                                <td className="py-2.5 px-2 text-center font-bold text-surface-500 text-xs">
                                                                    vs
                                                                </td>

                                                                {/* Tim Away */}
                                                                <td className="py-2.5 px-3">
                                                                    <select
                                                                        value={row.away_source}
                                                                        onChange={e => updateBracketRow(b.bracket_name, rIdx, 'away_source', e.target.value)}
                                                                        className="w-full rounded-xl bg-surface-950 border border-surface-700 px-3 py-1.5 text-xs font-semibold text-surface-200 focus:border-primary-500"
                                                                    >
                                                                        {sourceOptions.map(opt => (
                                                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                                        ))}
                                                                    </select>
                                                                </td>

                                                                {/* Hapus Baris */}
                                                                <td className="py-2.5 px-2 text-center">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => deleteBracketRow(b.bracket_name, rIdx)}
                                                                        className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
                                                                        title="Hapus baris ini"
                                                                    >
                                                                        🗑️
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>

                                                <div className="pt-2 flex justify-start">
                                                    <button
                                                        type="button"
                                                        onClick={() => addBracketRow(b.bracket_name, 'final')}
                                                        className="px-3 py-1.5 rounded-xl bg-surface-800 hover:bg-surface-700 border border-surface-700 text-xs font-bold text-primary-300 flex items-center gap-1.5 transition-colors"
                                                    >
                                                        <span>➕</span>
                                                        <span>Tambah Pertandingan di {b.bracket_name}</span>
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Bottom Sticky Action Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-surface-800">
                    <Link
                        href={route('tournaments.master-schedule.config', tournament.id)}
                        className="px-5 py-3 rounded-2xl bg-surface-900 hover:bg-surface-800 border border-surface-700 text-surface-300 text-xs font-bold transition-all w-full sm:w-auto text-center"
                    >
                        ← Kembali ke Konfigurasi Jadwal
                    </Link>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6 py-3 rounded-2xl bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white text-xs font-bold shadow-xl shadow-primary-600/30 flex items-center justify-center gap-2 transition-all w-full sm:w-auto"
                        >
                            {saving ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>Menyimpan Bracket Matrix...</span>
                                </>
                            ) : (
                                <>
                                    <span>💾</span>
                                    <span>Simpan Bracket Matrix & Lanjut Generate Jadwal →</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
