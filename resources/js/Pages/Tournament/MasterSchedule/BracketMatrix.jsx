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
    matrices = {},
    stageOptions = {}
}) {
    const [activeTab, setActiveTab] = useState(activeModes[0]?.match_mode || 'regu');
    const [saving, setSaving] = useState(false);
    const [flash, setFlash] = useState(null);

    // Inisialisasi formData dari matrices yang sudah ada di database atau stageOptions default
    const [formData, setFormData] = useState(() => {
        const initial = {};
        activeModes.forEach(mode => {
            const modeKey = mode.match_mode;
            const savedList = matrices[modeKey] || [];
            if (savedList.length > 0) {
                initial[modeKey] = savedList.map(m => ({
                    bracket_stage:    m.bracket_stage,
                    bracket_position: Number(m.bracket_position || 1),
                    home_source:      m.home_source,
                    away_source:      m.away_source,
                }));
            } else {
                initial[modeKey] = (stageOptions[modeKey] || []).map(stage => ({
                    bracket_stage:    stage.bracket_stage,
                    bracket_position: Number(stage.bracket_position || 1),
                    home_source:      stage.home_source,
                    away_source:      stage.away_source,
                }));
            }
        });
        return initial;
    });

    const activeBrackets = modeBrackets[activeTab] || [];
    const activeRows = formData[activeTab] || [];
    const isAllSinglePool = activeBrackets.length > 0 && activeBrackets.every(b => b.is_single_pool);

    const updateRow = (stageIdx, field, value) => {
        setFormData(prev => ({
            ...prev,
            [activeTab]: (prev[activeTab] || []).map((row, i) => i === stageIdx ? { ...row, [field]: value } : row),
        }));
    };

    const addRow = (defaultStage = 'final') => {
        const current = formData[activeTab] || [];
        const nextPos = current.filter(r => r.bracket_stage === defaultStage).length + 1;
        const newRow = {
            bracket_stage:    defaultStage,
            bracket_position: nextPos,
            home_source:      'pool_A_rank_1',
            away_source:      'pool_B_rank_1',
        };
        setFormData(prev => ({
            ...prev,
            [activeTab]: [...(prev[activeTab] || []), newRow],
        }));
    };

    const deleteRow = (stageIdx) => {
        setFormData(prev => ({
            ...prev,
            [activeTab]: (prev[activeTab] || []).filter((_, i) => i !== stageIdx),
        }));
    };

    const applyPreset = (presetType) => {
        if (presetType === 'empty') {
            setFormData(prev => ({ ...prev, [activeTab]: [] }));
        } else if (presetType === '2pool_two_finals') {
            setFormData(prev => ({
                ...prev,
                [activeTab]: [
                    { bracket_stage: 'final', bracket_position: 1, home_source: 'pool_A_rank_1', away_source: 'pool_A_rank_2' },
                    { bracket_stage: 'final', bracket_position: 2, home_source: 'pool_B_rank_1', away_source: 'pool_B_rank_2' },
                ],
            }));
        } else if (presetType === '2pool_direct_final') {
            setFormData(prev => ({
                ...prev,
                [activeTab]: [
                    { bracket_stage: 'final', bracket_position: 1, home_source: 'pool_A_rank_1', away_source: 'pool_B_rank_1' },
                ],
            }));
        } else if (presetType === '2pool_semifinal') {
            setFormData(prev => ({
                ...prev,
                [activeTab]: [
                    { bracket_stage: 'semifinal', bracket_position: 1, home_source: 'pool_A_rank_1', away_source: 'pool_B_rank_2' },
                    { bracket_stage: 'semifinal', bracket_position: 2, home_source: 'pool_B_rank_1', away_source: 'pool_A_rank_2' },
                    { bracket_stage: 'final', bracket_position: 1, home_source: 'winner_sf_1', away_source: 'winner_sf_2' },
                ],
            }));
        } else if (presetType === '4pool_qf') {
            setFormData(prev => ({
                ...prev,
                [activeTab]: [
                    { bracket_stage: 'round_of_8', bracket_position: 1, home_source: 'pool_A_rank_1', away_source: 'pool_B_rank_2' },
                    { bracket_stage: 'round_of_8', bracket_position: 2, home_source: 'pool_C_rank_1', away_source: 'pool_D_rank_2' },
                    { bracket_stage: 'round_of_8', bracket_position: 3, home_source: 'pool_B_rank_1', away_source: 'pool_A_rank_2' },
                    { bracket_stage: 'round_of_8', bracket_position: 4, home_source: 'pool_D_rank_1', away_source: 'pool_C_rank_2' },
                    { bracket_stage: 'semifinal', bracket_position: 1, home_source: 'winner_qf_1', away_source: 'winner_qf_2' },
                    { bracket_stage: 'semifinal', bracket_position: 2, home_source: 'winner_qf_3', away_source: 'winner_qf_4' },
                    { bracket_stage: 'final', bracket_position: 1, home_source: 'winner_sf_1', away_source: 'winner_sf_2' },
                ],
            }));
        }
    };

    const handleSave = () => {
        setSaving(true);
        const allMatrices = [];
        Object.entries(formData).forEach(([mode, stages]) => {
            stages.forEach((s, idx) => {
                allMatrices.push({
                    match_mode:       mode,
                    bracket_stage:    s.bracket_stage,
                    bracket_position: Number(s.bracket_position || (idx + 1)),
                    home_source:      s.home_source,
                    away_source:      s.away_source,
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
                onError: (err) => {
                    setFlash({ type: 'error', msg: 'Gagal menyimpan Bracket Matrix. Periksa kembali konfigurasi.' });
                    setSaving(false);
                },
            }
        );
    };

    // Daftar opsi sumber tim pool & progres babak gugur
    const getSourceOptions = () => {
        const options = [];

        // Kumpulkan semua huruf pool yang ada di mode aktif ini
        const poolNames = new Set();
        activeBrackets.forEach(b => {
            (b.pools || []).forEach(p => poolNames.add(p.name));
        });

        if (poolNames.size === 0) {
            ['A', 'B', 'C', 'D'].forEach(p => poolNames.add(p));
        }

        const sortedPools = Array.from(poolNames).sort();

        // Sumber dari klasemen Pool
        sortedPools.forEach(p => {
            options.push({ value: `pool_${p}_rank_1`, label: `🥇 Juara Pool ${p}`, group: 'Babak Pool' });
            options.push({ value: `pool_${p}_rank_2`, label: `🥈 Runner-up Pool ${p}`, group: 'Babak Pool' });
            options.push({ value: `pool_${p}_rank_3`, label: `🥉 Peringkat 3 Pool ${p}`, group: 'Babak Pool' });
        });

        // Sumber dari Pemenang Babak Gugur
        options.push({ value: 'winner_sf_1', label: '🏆 Pemenang Semifinal #1', group: 'Babak Gugur' });
        options.push({ value: 'winner_sf_2', label: '🏆 Pemenang Semifinal #2', group: 'Babak Gugur' });
        options.push({ value: 'loser_sf_1', label: '🥉 Kalah Semifinal #1 (Juara 3)', group: 'Babak Gugur' });
        options.push({ value: 'loser_sf_2', label: '🥉 Kalah Semifinal #2 (Juara 3)', group: 'Babak Gugur' });

        options.push({ value: 'winner_qf_1', label: '🥊 Pemenang QF #1', group: 'Babak Gugur' });
        options.push({ value: 'winner_qf_2', label: '🥊 Pemenang QF #2', group: 'Babak Gugur' });
        options.push({ value: 'winner_qf_3', label: '🥊 Pemenang QF #3', group: 'Babak Gugur' });
        options.push({ value: 'winner_qf_4', label: '🥊 Pemenang QF #4', group: 'Babak Gugur' });

        // Wildcard & Bye
        options.push({ value: 'bye', label: '⬛ BYE (Langsung Lolos)', group: 'Khusus' });
        options.push({ value: 'wildcard_1', label: '🃏 Wildcard #1 (Best Runner-up)', group: 'Khusus' });
        options.push({ value: 'wildcard_2', label: '🃏 Wildcard #2', group: 'Khusus' });

        return options;
    };

    const sourceOptions = getSourceOptions();

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
                        <span>Bracket Matrix Babak Gugur</span>
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

                {/* Banner Informasi Multi-Braket & Aturan 1 Pool */}
                <div className="rounded-3xl border border-surface-700/60 bg-surface-900/90 backdrop-blur-md p-6 shadow-xl space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h3 className="text-base font-bold text-surface-100 flex items-center gap-2">
                                <span>🧭</span>
                                <span>Panduan Konfigurasi Babak Gugur (Bracket Matrix)</span>
                            </h3>
                            <p className="text-xs text-surface-400 mt-1 leading-relaxed max-w-3xl">
                                Halaman ini mengatur alur babak gugur untuk setiap kategori tanding dan braket. Anda dapat menentukan siapa bertemu siapa di Semifinal dan Final.
                            </p>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                            <span className="px-3 py-1.5 rounded-xl bg-surface-950 border border-surface-800 text-[11px] font-bold text-surface-300">
                                Total {activeModes.length} Mode Aktif
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-surface-800 text-xs">
                        <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-300 flex items-start gap-2.5">
                            <span className="text-base shrink-0">🏆</span>
                            <div>
                                <p className="font-bold">Aturan Braket 1 Pool (Full Round Robin):</p>
                                <p className="text-[11px] text-surface-300 mt-0.5">
                                    Jika suatu braket hanya memiliki <strong>1 Pool</strong>, tidak ada pertandingan gugur yang dibuat. Juara langsung ditentukan dari klasemen akhir pool.
                                </p>
                            </div>
                        </div>
                        <div className="p-3 rounded-2xl bg-primary-500/5 border border-primary-500/20 text-primary-300 flex items-start gap-2.5">
                            <span className="text-base shrink-0">⚔️</span>
                            <div>
                                <p className="font-bold">Aturan Multi-Pool (2+ Pool):</p>
                                <p className="text-[11px] text-surface-300 mt-0.5">
                                    Tim terbaik dari masing-masing pool melaju ke babak gugur (Playoff, Semifinal silang, atau Grand Final) sesuai skema di bawah.
                                </p>
                            </div>
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
                                    {bList.length > 1 ? `${bList.length} Braket (${totalPools} Pool)` : `${totalPools || mode.pool_count || 1} Pool`}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Detail Braket & Matriks untuk Mode Terpilih */}
                <div className="space-y-6">
                    {/* Ringkasan Struktur Braket pada Mode Aktif */}
                    <div className="rounded-3xl border border-surface-700/60 bg-surface-900/80 backdrop-blur-md p-6 space-y-4 shadow-xl">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-surface-800">
                            <div>
                                <h3 className="text-base font-bold text-surface-100 flex items-center gap-2">
                                    <span>{MODE_LABELS[activeTab]?.icon}</span>
                                    <span>Struktur Braket: Mode {MODE_LABELS[activeTab]?.label}</span>
                                </h3>
                                <p className="text-xs text-surface-400 mt-0.5">
                                    {activeBrackets.length} Braket terdaftar pada mode ini.
                                </p>
                            </div>

                            {/* Preset Buttons for multi pool */}
                            {!isAllSinglePool && (
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[11px] font-bold text-surface-400 uppercase mr-1">Preset Cepat:</span>
                                    <button
                                        type="button"
                                        onClick={() => applyPreset('2pool_semifinal')}
                                        className="px-2.5 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-semibold transition-colors"
                                    >
                                        ⚔️ Semifinal Silang + Final
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyPreset('2pool_two_finals')}
                                        className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-colors"
                                    >
                                        🏆 2 Final Terpisah (A1 vs A2, B1 vs B2)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyPreset('2pool_direct_final')}
                                        className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold transition-colors"
                                    >
                                        🥇 Grand Final Langsung (Juara A vs Juara B)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyPreset('empty')}
                                        className="px-2.5 py-1.5 rounded-xl bg-surface-800 hover:bg-surface-700 border border-surface-700 text-surface-400 text-xs font-semibold transition-colors"
                                    >
                                        Kosongkan
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* List Cards Braket */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {activeBrackets.map((b, bIdx) => (
                                <div
                                    key={bIdx}
                                    className={`p-4 rounded-2xl border text-xs space-y-2 transition-all ${
                                        b.is_single_pool
                                            ? 'bg-emerald-950/20 border-emerald-500/30 ring-1 ring-emerald-500/10'
                                            : 'bg-surface-950/60 border-surface-800'
                                    }`}
                                >
                                    <div className="flex items-center justify-between font-bold">
                                        <span className="text-surface-100 text-sm truncate">{b.bracket_name}</span>
                                        <span className={`px-2 py-0.5 rounded-lg text-[10.5px] font-mono ${
                                            b.is_single_pool ? 'bg-emerald-500/20 text-emerald-300' : 'bg-surface-800 text-primary-300'
                                        }`}>
                                            {b.pool_count} Pool
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap gap-1 text-[11px]">
                                        {(b.pools || []).map(p => (
                                            <span key={p.id} className="px-2 py-0.5 rounded-md bg-surface-900 border border-surface-800 text-surface-300 font-medium">
                                                Pool {p.name} ({p.teams_count} Tim)
                                            </span>
                                        ))}
                                    </div>

                                    {b.is_single_pool ? (
                                        <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1.5 pt-1">
                                            <span>🏆</span>
                                            <span>1 Pool: Round Robin (Juara dari Klasemen)</span>
                                        </p>
                                    ) : (
                                        <p className="text-[11px] text-primary-300 font-medium flex items-center gap-1.5 pt-1">
                                            <span>⚔️</span>
                                            <span>Babak Gugur (Playoff & Final)</span>
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Konfigurasi Matriks Laga Babak Gugur */}
                    <div className="rounded-3xl border border-surface-700/60 bg-surface-900/80 backdrop-blur-md p-6 space-y-6 shadow-xl">
                        <div className="flex items-center justify-between pb-4 border-b border-surface-800">
                            <div>
                                <h3 className="text-base font-bold text-surface-100 flex items-center gap-2">
                                    <span>🥊</span>
                                    <span>Daftar Pertandingan Babak Gugur ({MODE_LABELS[activeTab]?.label})</span>
                                </h3>
                                <p className="text-xs text-surface-400 mt-0.5">
                                    Tentukan pasangan laga babak gugur. Pertandingan ini akan di-generate setelah babak pool selesai.
                                </p>
                            </div>

                            {!isAllSinglePool && (
                                <button
                                    type="button"
                                    onClick={() => addRow('final')}
                                    className="px-3.5 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-primary-600/20 transition-all"
                                >
                                    <span>➕</span>
                                    <span>Tambah Laga Gugur</span>
                                </button>
                            )}
                        </div>

                        {activeRows.length === 0 ? (
                            <div className="p-8 text-center bg-surface-950/70 rounded-2xl border border-dashed border-surface-800 space-y-3">
                                <div className="text-4xl">🏆</div>
                                <h4 className="font-bold text-surface-200 text-sm">
                                    {isAllSinglePool
                                        ? 'Mode Ini Menggunakan Format 1 Pool (Full Round Robin)'
                                        : 'Belum Ada Pertandingan Babak Gugur yang Dikonfigurasi'}
                                </h4>
                                <p className="text-surface-400 text-xs max-w-md mx-auto leading-relaxed">
                                    {isAllSinglePool
                                        ? 'Seluruh tim bertanding di babak pool setengah kompetisi. Pemenang dan Juara 1 langsung ditentukan dari perolehan poin klasemen tertinggi tanpa babak gugur tambahan.'
                                        : 'Pilih salah satu preset cepat di atas atau klik tombol "Tambah Laga Gugur" untuk menyusun bagan babak gugur.'}
                                </p>
                                {!isAllSinglePool && (
                                    <div className="pt-2 flex justify-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => applyPreset('2pool_semifinal')}
                                            className="btn-primary text-xs"
                                        >
                                            ⚔️ Buat Skema Semifinal & Final Otomatis
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="border-b border-surface-800 text-surface-400 uppercase tracking-wider text-[10.5px]">
                                            <th className="py-3 px-3 w-48">Babak Gugur</th>
                                            <th className="py-3 px-2 w-16 text-center">Posisi #</th>
                                            <th className="py-3 px-3">Tim A (Home / Sudut Merah)</th>
                                            <th className="py-3 px-2 w-10 text-center">vs</th>
                                            <th className="py-3 px-3">Tim B (Away / Sudut Biru)</th>
                                            <th className="py-3 px-2 w-16 text-center">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-surface-800/60">
                                        {activeRows.map((row, i) => (
                                            <tr key={i} className="hover:bg-surface-950/40 transition-colors">
                                                {/* Babak */}
                                                <td className="py-3 px-3">
                                                    <select
                                                        value={row.bracket_stage}
                                                        onChange={e => updateRow(i, 'bracket_stage', e.target.value)}
                                                        className="w-full rounded-xl bg-surface-950 border border-surface-700 px-3 py-2 text-xs font-bold text-surface-100 focus:border-primary-500"
                                                    >
                                                        {STAGE_OPTIONS.map(opt => (
                                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                        ))}
                                                    </select>
                                                </td>

                                                {/* Posisi */}
                                                <td className="py-3 px-2 text-center">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="16"
                                                        value={row.bracket_position}
                                                        onChange={e => updateRow(i, 'bracket_position', +e.target.value)}
                                                        className="w-14 text-center rounded-xl bg-surface-950 border border-surface-700 px-2 py-2 text-xs font-mono font-bold text-surface-200"
                                                    />
                                                </td>

                                                {/* Tim Home */}
                                                <td className="py-3 px-3">
                                                    <select
                                                        value={row.home_source}
                                                        onChange={e => updateRow(i, 'home_source', e.target.value)}
                                                        className="w-full rounded-xl bg-surface-950 border border-surface-700 px-3 py-2 text-xs font-semibold text-surface-200 focus:border-primary-500"
                                                    >
                                                        {sourceOptions.map(opt => (
                                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                        ))}
                                                    </select>
                                                </td>

                                                {/* VS */}
                                                <td className="py-3 px-2 text-center font-bold text-surface-500 text-xs">
                                                    vs
                                                </td>

                                                {/* Tim Away */}
                                                <td className="py-3 px-3">
                                                    <select
                                                        value={row.away_source}
                                                        onChange={e => updateRow(i, 'away_source', e.target.value)}
                                                        className="w-full rounded-xl bg-surface-950 border border-surface-700 px-3 py-2 text-xs font-semibold text-surface-200 focus:border-primary-500"
                                                    >
                                                        {sourceOptions.map(opt => (
                                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                        ))}
                                                    </select>
                                                </td>

                                                {/* Hapus Baris */}
                                                <td className="py-3 px-2 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => deleteRow(i)}
                                                        className="p-2 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
                                                        title="Hapus baris pertandingan ini"
                                                    >
                                                        🗑️
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
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
