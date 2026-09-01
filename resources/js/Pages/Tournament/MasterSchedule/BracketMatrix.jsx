import { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const MODE_LABELS = {
    regu:        { label: 'Regu',        icon: '🏐', color: '#1d4ed8' },
    double:      { label: 'Double',      icon: '👥', color: '#059669' },
    quadrant:    { label: 'Quadrant',    icon: '⬡', color: '#7c3aed' },
    team_regu:   { label: 'Team Regu',   icon: '🏆', color: '#d97706' },
    team_double: { label: 'Team Double', icon: '🥇', color: '#dc2626' },
};

const STAGE_LABELS = {
    round_of_16: '16 Besar',
    round_of_8:  '8 Besar (QF)',
    semifinal:   'Semifinal',
    third_place: 'Perebutan Juara 3',
    final:       'Final',
};

/**
 * BracketMatrix — Konfigurasi pasangan braket per mode tanding.
 * Admin memilih siapa bertemu siapa di setiap babak gugur.
 */
export default function BracketMatrix({ tournament, activeModes, matrices, stageOptions }) {
    const [activeTab, setActiveTab] = useState(activeModes[0]?.match_mode || '');
    const [localMatrices, setLocalMatrices] = useState(matrices);
    const [saving, setSaving] = useState(false);
    const [flash, setFlash] = useState(null);

    // Build matrix state dari stageOptions
    const [formData, setFormData] = useState(() => {
        const initial = {};
        activeModes.forEach(mode => {
            const modeKey = mode.match_mode;
            initial[modeKey] = (stageOptions[modeKey] || []).map(stage => {
                // Cari nilai yang sudah tersimpan
                const saved = (matrices[modeKey] || []).find(
                    m => m.bracket_stage === stage.bracket_stage && m.bracket_position === stage.bracket_position
                );
                return {
                    ...stage,
                    home_source: saved?.home_source || stage.home_source,
                    away_source: saved?.away_source || stage.away_source,
                };
            });
        });
        return initial;
    });

    const updateSource = (mode, stageIdx, field, value) => {
        setFormData(prev => ({
            ...prev,
            [mode]: prev[mode].map((row, i) => i === stageIdx ? { ...row, [field]: value } : row),
        }));
    };

    const handleSave = () => {
        setSaving(true);
        // Flatten semua mode menjadi array
        const allMatrices = [];
        Object.entries(formData).forEach(([mode, stages]) => {
            stages.forEach(s => {
                allMatrices.push({
                    match_mode:       mode,
                    bracket_stage:    s.bracket_stage,
                    bracket_position: s.bracket_position,
                    home_source:      s.home_source,
                    away_source:      s.away_source,
                });
            });
        });

        router.post(
            route('tournaments.master-schedule.bracket-matrix.store', tournament.id),
            { matrices: allMatrices },
            {
                onSuccess: () => { setFlash({ type: 'success', msg: 'Bracket Matrix disimpan!' }); setSaving(false); },
                onError:   () => { setFlash({ type: 'error', msg: 'Gagal menyimpan.' }); setSaving(false); },
            }
        );
    };

    // Build pool source options berdasarkan pool_count mode aktif
    const getPoolSources = (mode) => {
        const modeData = activeModes.find(m => m.match_mode === mode);
        const count    = modeData?.pool_count || 2;
        const pools    = Array.from({ length: Math.max(1, count) }, (_, i) => String.fromCharCode(65 + i));
        const options  = [];

        if (count === 1) {
            options.push({ value: 'pool_A_rank_1', label: '🥇 Juara 1 Pool A (Bracket A)' });
            options.push({ value: 'pool_A_rank_2', label: '🥈 Juara 2 Pool A (Bracket B)' });
            options.push({ value: 'pool_A_rank_3', label: '🥉 Peringkat 3 Pool A' });
            options.push({ value: 'pool_A_rank_4', label: 'Peringkat 4 Pool A' });
        } else {
            pools.forEach(p => {
                options.push({ value: `pool_${p}_rank_1`, label: `🥇 Juara Pool ${p}` });
                options.push({ value: `pool_${p}_rank_2`, label: `🥈 Runner-up Pool ${p}` });
                options.push({ value: `pool_${p}_rank_3`, label: `🥉 Peringkat 3 Pool ${p}` });
            });
        }
        options.push({ value: 'bye', label: '⬛ BYE (Langsung Lolos)' });
        options.push({ value: 'wildcard_1', label: '🃏 Wildcard #1' });
        options.push({ value: 'wildcard_2', label: '🃏 Wildcard #2' });
        return options;
    };

    const applyPreset = (mode, presetType) => {
        if (presetType === '2pool_two_finals') {
            setFormData(prev => ({
                ...prev,
                [mode]: [
                    { bracket_stage: 'final', bracket_position: 1, home_source: 'pool_A_rank_1', away_source: 'pool_A_rank_2' },
                    { bracket_stage: 'final', bracket_position: 2, home_source: 'pool_B_rank_1', away_source: 'pool_B_rank_2' },
                ],
            }));
        } else if (presetType === '2pool_direct_final') {
            setFormData(prev => ({
                ...prev,
                [mode]: [
                    { bracket_stage: 'final', bracket_position: 1, home_source: 'pool_A_rank_1', away_source: 'pool_B_rank_1' },
                ],
            }));
        } else if (presetType === '2pool_semifinal') {
            setFormData(prev => ({
                ...prev,
                [mode]: [
                    { bracket_stage: 'semifinal', bracket_position: 1, home_source: 'pool_A_rank_1', away_source: 'pool_B_rank_2' },
                    { bracket_stage: 'semifinal', bracket_position: 2, home_source: 'pool_B_rank_1', away_source: 'pool_A_rank_2' },
                    { bracket_stage: 'final', bracket_position: 1, home_source: 'winner_sf_1', away_source: 'winner_sf_2' },
                ],
            }));
        } else if (presetType === '1pool_direct_final') {
            setFormData(prev => ({
                ...prev,
                [mode]: [
                    { bracket_stage: 'final', bracket_position: 1, home_source: 'pool_A_rank_1', away_source: 'pool_A_rank_2' },
                ],
            }));
        } else if (presetType === '1pool_semifinal') {
            setFormData(prev => ({
                ...prev,
                [mode]: [
                    { bracket_stage: 'semifinal', bracket_position: 1, home_source: 'pool_A_rank_1', away_source: 'pool_A_rank_4' },
                    { bracket_stage: 'semifinal', bracket_position: 2, home_source: 'pool_A_rank_2', away_source: 'pool_A_rank_3' },
                    { bracket_stage: 'final', bracket_position: 1, home_source: 'winner_sf_1', away_source: 'winner_sf_2' },
                ],
            }));
        }
    };

    return (
        <AuthenticatedLayout header={
            <div className="flex items-center gap-3">
                <a href={route('tournaments.master-schedule.config', tournament.id)}
                    className="text-gray-400 hover:text-gray-600 text-sm">← Konfigurasi</a>
                <span className="text-gray-300">/</span>
                <h2 className="text-xl font-bold text-gray-900">Bracket Matrix — {tournament.name}</h2>
            </div>
        }>
            <Head title={`Bracket Matrix — ${tournament.name}`} />

            <div className="max-w-4xl mx-auto py-8 px-4">
                {flash && (
                    <div className={`mb-4 p-3 rounded-xl text-sm ${flash.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {flash.msg}
                    </div>
                )}

                <p className="text-gray-500 text-sm mb-6">
                    Tentukan pasangan tim untuk setiap babak gugur. Konfigurasi ini akan digunakan saat Generate Jadwal.
                </p>

                {/* Mode Tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    {activeModes.map(mode => {
                        const cfg = MODE_LABELS[mode.match_mode];
                        return (
                            <button key={mode.match_mode}
                                onClick={() => setActiveTab(mode.match_mode)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                                    activeTab === mode.match_mode
                                        ? 'text-white shadow-sm'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                                style={activeTab === mode.match_mode ? { backgroundColor: cfg?.color } : {}}>
                                {cfg?.icon} {cfg?.label}
                                <span className="text-xs opacity-70">({mode.pool_count} pool)</span>
                            </button>
                        );
                    })}
                </div>

                {/* Bracket Table */}
                {activeTab && formData[activeTab] && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                                <h3 className="font-semibold text-gray-800">
                                    {MODE_LABELS[activeTab]?.icon} Mode {MODE_LABELS[activeTab]?.label}
                                </h3>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {activeModes.find(m => m.match_mode === activeTab)?.pool_count} pool
                                    {activeModes.find(m => m.match_mode === activeTab)?.pool_count === 3 && (
                                        <span className="ml-1 text-orange-500">⚠️ Jumlah pool ganjil — ada sistem BYE/Wildcard</span>
                                    )}
                                </p>
                            </div>

                            {/* Preset Buttons */}
                            <div className="flex items-center gap-2 flex-wrap">
                                {activeModes.find(m => m.match_mode === activeTab)?.pool_count === 2 && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => applyPreset(activeTab, '2pool_two_finals')}
                                            className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition-colors flex items-center gap-1"
                                            title="Final Bracket 1 (A1 vs A2) & Final Bracket 2 (B1 vs B2) — Menghasilkan Juara per Bracket dan langsung selesai"
                                        >
                                            🏆 2 Final Terpisah (A1 vs A2, B1 vs B2 — Selesai)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => applyPreset(activeTab, '2pool_direct_final')}
                                            className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold hover:bg-amber-100 transition-colors flex items-center gap-1"
                                            title="1 Juara dari Pool A & 1 Juara dari Pool B langsung bertemu di Grand Final"
                                        >
                                            🏆 Grand Final (Juara A vs Juara B)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => applyPreset(activeTab, '2pool_semifinal')}
                                            className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 text-xs font-semibold hover:bg-blue-100 transition-colors"
                                        >
                                            ⚔️ Semifinal Silang (Top 2 per Pool)
                                        </button>
                                    </>
                                )}

                                {activeModes.find(m => m.match_mode === activeTab)?.pool_count === 1 && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => applyPreset(activeTab, '1pool_direct_final')}
                                            className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold hover:bg-amber-100 transition-colors"
                                        >
                                            🏆 Langsung Final (Top 2 / Bracket A vs B)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => applyPreset(activeTab, '1pool_semifinal')}
                                            className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 text-xs font-semibold hover:bg-blue-100 transition-colors"
                                        >
                                            ⚔️ Semifinal (Top 4 Pool)
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="p-6">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-xs text-gray-500 uppercase tracking-wide">
                                        <th className="text-left pb-3 w-32">Babak</th>
                                        <th className="text-left pb-3 w-8 text-center">#</th>
                                        <th className="text-left pb-3">Tim A (Home)</th>
                                        <th className="text-center pb-3 w-8">vs</th>
                                        <th className="text-left pb-3">Tim B (Away)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {formData[activeTab].map((row, i) => {
                                        const sourceOpts = getPoolSources(activeTab);
                                        const isPoolSelectable = row.home_source.startsWith('pool_') || row.away_source.startsWith('pool_') || row.bracket_stage === 'round_of_8' || (row.bracket_stage === 'semifinal') || (row.bracket_stage === 'final' && (!row.home_source.startsWith('winner_') || !row.away_source.startsWith('winner_')));

                                        const formatSourceLabel = (src) => {
                                            if (!src) return '—';
                                            if (src.startsWith('pool_')) {
                                                const parts = src.split('_');
                                                const poolLetter = parts[1];
                                                const rank = parts[3];
                                                if (rank === '1') return `🥇 Juara Pool ${poolLetter}`;
                                                if (rank === '2') return `🥈 Runner-up Pool ${poolLetter}`;
                                                return `Peringkat ${rank} Pool ${poolLetter}`;
                                            }
                                            if (src.startsWith('winner_qf_')) {
                                                const pos = src.replace('winner_qf_', '');
                                                return `🏆 Pemenang QF #${pos}`;
                                            }
                                            if (src.startsWith('winner_sf_')) {
                                                const pos = src.replace('winner_sf_', '');
                                                return `🏆 Pemenang SF #${pos}`;
                                            }
                                            if (src.startsWith('loser_sf_')) {
                                                const pos = src.replace('loser_sf_', '');
                                                return `🥉 Kalah SF #${pos} (Juara 3)`;
                                            }
                                            if (src === 'bye') return '⬛ BYE (Langsung Lolos)';
                                            return src;
                                        };

                                        return (
                                            <tr key={i} className="py-2">
                                                <td className="py-3 pr-4">
                                                    <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded-lg whitespace-nowrap">
                                                        {STAGE_LABELS[row.bracket_stage] || row.bracket_stage}
                                                    </span>
                                                </td>
                                                <td className="py-3 pr-4 text-center">
                                                    <span className="text-xs text-gray-400 font-mono">#{row.bracket_position}</span>
                                                </td>
                                                <td className="py-3 pr-2">
                                                    {isPoolSelectable ? (
                                                        <select
                                                            value={row.home_source}
                                                            onChange={e => updateSource(activeTab, i, 'home_source', e.target.value)}
                                                            className="w-full text-sm rounded-lg border border-gray-200 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                                        >
                                                            {sourceOpts.map(opt => (
                                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <div className="text-sm font-semibold text-gray-700 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
                                                            {formatSourceLabel(row.home_source)}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-3 px-2 text-center text-gray-400 text-xs font-bold">vs</td>
                                                <td className="py-3 pl-2">
                                                    {isPoolSelectable ? (
                                                        <select
                                                            value={row.away_source}
                                                            onChange={e => updateSource(activeTab, i, 'away_source', e.target.value)}
                                                            className="w-full text-sm rounded-lg border border-gray-200 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                                        >
                                                            {sourceOpts.map(opt => (
                                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <div className="text-sm font-semibold text-gray-700 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
                                                            {formatSourceLabel(row.away_source)}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex justify-between mt-8">
                    <a href={route('tournaments.master-schedule.config', tournament.id)}
                        className="bg-gray-100 text-gray-700 px-5 py-2.5 rounded-xl font-medium hover:bg-gray-200 transition-colors text-sm">
                        ← Kembali
                    </a>
                    <div className="flex gap-3">
                        <button onClick={handleSave} disabled={saving}
                            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors text-sm flex items-center gap-2 disabled:opacity-50">
                            {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                            Simpan Bracket Matrix
                        </button>
                        <a href={route('tournaments.master-schedule.generate-form', tournament.id)}
                            className="bg-green-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-green-700 transition-colors text-sm">
                            Lanjut: Generate Jadwal →
                        </a>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
