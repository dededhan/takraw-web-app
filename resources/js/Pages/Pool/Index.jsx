import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import StatusBadge from '@/Components/StatusBadge';
import ConfirmDialog from '@/Components/ConfirmDialog';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { useState } from 'react';

const MODE_LABELS = {
    regu:        { label: 'Mode Regu',        icon: '🏐', color: 'bg-blue-600/20 text-blue-300 border-blue-500/30' },
    double:      { label: 'Mode Double',      icon: '👥', color: 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30' },
    quadrant:    { label: 'Mode Quadrant',    icon: '⬡', color: 'bg-purple-600/20 text-purple-300 border-purple-500/30' },
    team_regu:   { label: 'Mode Team Regu',   icon: '🏆', color: 'bg-amber-600/20 text-amber-300 border-amber-500/30' },
    team_double: { label: 'Mode Team Double', icon: '🥇', color: 'bg-red-600/20 text-red-300 border-red-500/30' },
};

export default function PoolIndex({ tournament }) {
    const activeModes = (tournament.modes || []).filter(m => m.is_active).map(m => m.match_mode);
    const availableModes = activeModes.length > 0 ? activeModes : ['regu', 'double', 'team_regu'];

    const [selectedMode, setSelectedMode] = useState(availableModes[0] || 'regu');
    const [showGenerate, setShowGenerate] = useState(false);
    const [confirmGenMatches, setConfirmGenMatches] = useState(false);

    const isTeamMode = selectedMode === 'team_regu' || selectedMode === 'team_double';

    const generateForm  = useForm({ pool_count: 2, match_mode: selectedMode });
    const assignForm    = useForm({ team_id: '', super_team_id: '' });
    const genMatchesForm = useForm({});

    // Filter pools KHUSUS mode yang sedang dipilih
    const modePools = (tournament.pools || []).filter(p => (p.match_mode || 'regu') === selectedMode);

    // Kumpulkan ID tim yang merupakan sub-tim anggota SuperTeam (dikunci dari pool individu)
    const superTeamMemberIds = new Set();
    (tournament.super_teams || []).forEach(st => {
        (st.members || []).forEach(m => superTeamMemberIds.add(m.id));
    });

    // Kumpulkan ID kontestan yang sudah masuk pool mode ini
    const assignedIds = new Set();
    modePools.forEach(pool => {
        if (isTeamMode) {
            (pool.super_teams || []).forEach(st => assignedIds.add(st.id));
        } else {
            (pool.teams || []).forEach(t => assignedIds.add(t.id));
        }
    });

    // Kontestan yang belum masuk pool mode ini (Sub-tim SuperTeam & Tim mode lain dikunci)
    const unassignedContestants = isTeamMode
        ? (tournament.super_teams || []).filter(st => st.match_mode === selectedMode && (!st.pool_id || !assignedIds.has(st.id)))
        : (tournament.teams || []).filter(t => {
            if (assignedIds.has(t.id) || superTeamMemberIds.has(t.id)) return false;

            const nameLower = t.name.toLowerCase();
            if (selectedMode === 'regu' && nameLower.includes('double')) return false;
            if (selectedMode === 'double' && (nameLower.includes('regu') && !nameLower.includes('double'))) return false;
            if (selectedMode === 'quadrant' && (nameLower.includes('regu') || nameLower.includes('double'))) return false;

            return true;
        });

    const lockedSubTeamCount = isTeamMode ? 0 : (tournament.teams || []).filter(t => superTeamMemberIds.has(t.id)).length;

    const [showCreateCustom, setShowCreateCustom] = useState(false);
    const createCustomForm = useForm({ name: '', match_mode: selectedMode });

    const handleCreateCustom = (e) => {
        e.preventDefault();
        createCustomForm.post(route('pools.create-custom', tournament.id), {
            onSuccess: () => {
                setShowCreateCustom(false);
                createCustomForm.reset('name');
            },
        });
    };

    const handleModeChange = (mode) => {
        setSelectedMode(mode);
        generateForm.setData('match_mode', mode);
        createCustomForm.setData('match_mode', mode);
        assignForm.reset();
    };

    const handleGenerate = (e) => {
        e.preventDefault();
        generateForm.post(route('pools.generate-random', tournament.id), {
            onSuccess: () => setShowGenerate(false),
        });
    };

    const handleAssign = (poolId) => {
        const payload = isTeamMode
            ? { super_team_id: assignForm.data.super_team_id }
            : { team_id: assignForm.data.team_id };

        if (!payload.super_team_id && !payload.team_id) return;

        router.post(route('pools.assign-team', poolId), payload, {
            onSuccess: () => assignForm.reset(),
        });
    };

    const handleRemove = (poolId, id) => {
        router.delete(route('pools.remove-team', { pool: poolId, team: id }));
    };

    const handleGenerateMatches = () => {
        genMatchesForm.post(route('pools.generate-matches', tournament.id), {
            onSuccess: () => setConfirmGenMatches(false),
        });
    };

    const currentCfg = MODE_LABELS[selectedMode] || { label: selectedMode, icon: '⚽' };

    return (
        <AuthenticatedLayout header={`Pool — ${tournament.name}`}>
            <Head title={`Pool — ${tournament.name}`} />

            <div className="mb-4 flex items-center justify-between">
                <Link href={route('tournaments.show', tournament.id)} className="text-sm text-surface-500 hover:text-surface-300 transition-colors flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    Kembali ke Turnamen
                </Link>

                <div className="flex items-center gap-2">
                    <Link
                        href={route('tournaments.master-schedule.config', tournament.id)}
                        className="px-3.5 py-2 rounded-xl bg-surface-800 border border-surface-700 text-xs font-semibold text-primary-300 hover:bg-surface-750 transition-colors flex items-center gap-1.5"
                    >
                        ⚙️ Config Master Schedule
                    </Link>
                    <Link
                        href={route('tournaments.master-schedule.index', tournament.id)}
                        className="px-3.5 py-2 rounded-xl bg-primary-600 text-white text-xs font-bold hover:bg-primary-550 transition-colors flex items-center gap-1.5 shadow-glow-primary"
                    >
                        🗓️ Buka Master Schedule Grid →
                    </Link>
                </div>
            </div>

            {/* Header & Mode Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-surface-100 flex items-center gap-2">
                        <span>🏊</span> Manajemen Pool per Mode
                    </h2>
                    <p className="text-sm text-surface-500 mt-1">
                        Atur pool untuk setiap mode tanding. Setelah susunan pool siap, Anda bisa langsung menyusun <strong>Master Schedule</strong>.
                    </p>
                </div>
                <div className="flex items-center gap-2 self-start flex-wrap">
                    <button
                        onClick={() => { setShowCreateCustom(!showCreateCustom); setShowGenerate(false); }}
                        className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-surface-800 border border-surface-700 text-surface-200 text-sm font-semibold hover:bg-surface-700 transition-colors"
                    >
                        ➕ Buat Pool Manual
                    </button>
                    <button
                        onClick={() => { setShowGenerate(!showGenerate); setShowCreateCustom(false); }}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-600 text-white text-sm font-semibold hover:bg-accent-700 transition-colors shadow-glow-accent"
                    >
                        🎲 Generate Acak Pool
                    </button>
                </div>
            </div>

            {/* Sub-tabs Per Mode Tanding */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-1 border-b border-surface-800">
                {availableModes.map(mode => {
                    const cfg = MODE_LABELS[mode] || { label: mode, icon: '⚽', color: '' };
                    const isActive = selectedMode === mode;
                    const modePoolCount = (tournament.pools || []).filter(p => (p.match_mode || 'regu') === mode).length;

                    return (
                        <button
                            key={mode}
                            onClick={() => handleModeChange(mode)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                                isActive
                                    ? cfg.color
                                    : 'bg-surface-900/50 text-surface-400 border-surface-700 hover:border-surface-600'
                            }`}
                        >
                            <span className="text-base">{cfg.icon}</span>
                            {cfg.label}
                            <span className="px-2 py-0.5 rounded-full bg-surface-950/60 text-[10px]">
                                {modePoolCount} Pool
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Create Custom Pool Panel */}
            {showCreateCustom && (
                <div className="rounded-xl border border-primary-500/30 bg-primary-500/5 p-5 mb-6 animate-slide-up">
                    <h3 className="text-sm font-semibold text-primary-300 mb-1">
                        ➕ Buat Pool Manual — {currentCfg.label}
                    </h3>
                    <p className="text-xs text-surface-400 mb-4">
                        Masukkan nama pool baru (misal: "A", "B", "C", "Pool 1", dll) khusus untuk mode {currentCfg.label}.
                    </p>
                    <form onSubmit={handleCreateCustom} className="flex items-start gap-3 flex-wrap">
                        <div>
                            <input
                                type="text"
                                placeholder="Nama Pool (mis: A, B, C...)"
                                value={createCustomForm.data.name}
                                onChange={(e) => createCustomForm.setData('name', e.target.value)}
                                className="w-64 px-4 py-2 rounded-xl bg-surface-800 border border-surface-700 text-surface-100 text-sm focus:border-primary-500"
                                maxLength={10}
                            />
                            {createCustomForm.errors.name && (
                                <p className="text-red-400 text-xs mt-1">{createCustomForm.errors.name}</p>
                            )}
                        </div>
                        <button
                            type="submit"
                            disabled={!createCustomForm.data.name || createCustomForm.processing}
                            className="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-550 disabled:opacity-50 transition-colors"
                        >
                            {createCustomForm.processing ? 'Membuat...' : `+ Buat Pool (${currentCfg.label})`}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowCreateCustom(false)}
                            className="px-4 py-2 rounded-xl bg-surface-800 text-surface-400 text-sm hover:bg-surface-700 transition-colors"
                        >
                            Batal
                        </button>
                    </form>
                </div>
            )}

            {/* Random Generate Panel */}
            {showGenerate && (
                <div className="rounded-xl border border-accent-500/30 bg-accent-500/5 p-5 mb-6 animate-slide-up">
                    <h3 className="text-sm font-semibold text-accent-300 mb-1">
                        🎲 Generate Pool Acak — {currentCfg.label}
                    </h3>
                    <p className="text-xs text-surface-400 mb-4">
                        Kontestan {isTeamMode ? '(Super Teams)' : '(Tim Regu/Double)'} untuk mode ini akan diacak dan dibagi rata ke dalam pool. Pool lama untuk {currentCfg.label} akan diganti.
                    </p>
                    <form onSubmit={handleGenerate} className="flex items-end gap-3">
                        <div>
                            <label className="block text-xs font-medium text-surface-400 mb-1">Jumlah Pool</label>
                            <input
                                type="number"
                                value={generateForm.data.pool_count}
                                onChange={(e) => generateForm.setData('pool_count', parseInt(e.target.value))}
                                min="2"
                                max="8"
                                className="w-24 px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-100 text-sm focus:border-accent-500 focus:ring-1 focus:ring-accent-500"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={generateForm.processing}
                            className="px-4 py-2 rounded-lg bg-accent-600 text-white text-sm font-semibold hover:bg-accent-700 disabled:opacity-50 transition-colors"
                        >
                            {generateForm.processing ? 'Generating...' : `🎲 Generate ${currentCfg.label}`}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowGenerate(false)}
                            className="px-4 py-2 rounded-lg bg-surface-800 text-surface-400 text-sm hover:bg-surface-700 transition-colors"
                        >
                            Batal
                        </button>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Pools List for Selected Mode */}
                <div className="lg:col-span-2">
                    {modePools.length === 0 ? (
                        <div className="text-center py-16 rounded-xl border border-dashed border-surface-700/50">
                            <div className="text-5xl mb-4">{currentCfg.icon}</div>
                            <p className="text-surface-300 font-semibold text-sm">Belum ada pool untuk {currentCfg.label}</p>
                            <p className="text-surface-500 text-xs mt-1">Gunakan tombol "Generate Acak Pool ({currentCfg.label})" di atas untuk membuat pool otomatis.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {modePools.map((pool) => {
                                const contestants = isTeamMode ? (pool.super_teams || []) : (pool.teams || []);
                                return (
                                    <div key={pool.id} className="rounded-xl border border-surface-700/50 bg-surface-900/50 overflow-hidden shadow-sm">
                                        <div className="px-5 py-3 border-b border-surface-700/50 bg-surface-800/30 flex items-center justify-between">
                                            <h3 className="text-sm font-bold text-accent-300">Pool {pool.name} ({selectedMode.replace('_', ' ')})</h3>
                                            <span className="text-xs text-surface-500">{contestants.length} {isTeamMode ? 'Super Team' : 'tim'}</span>
                                        </div>

                                        {/* Contestants in pool */}
                                        <div className="p-3 space-y-2">
                                            {contestants.length === 0 ? (
                                                <p className="text-xs text-surface-600 italic px-2 py-1">Belum ada kontestan di pool ini</p>
                                            ) : (
                                                contestants.map((item) => (
                                                    <div key={item.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-800/50 group">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 rounded-lg bg-primary-500/20 flex items-center justify-center text-xs font-bold text-primary-300">
                                                                {item.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <span className="text-sm text-surface-300 font-medium block">{item.name}</span>
                                                                {isTeamMode && item.members && (
                                                                    <span className="text-[10px] text-surface-500 block">
                                                                        3 tim anggota: {item.members.map(m => m.name).join(', ')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleRemove(pool.id, item.id)}
                                                            className="p-1 rounded text-surface-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                                            title="Hapus dari pool"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        {/* Add contestant to pool */}
                                        {unassignedContestants.length > 0 && (
                                            <div className="px-3 pb-3">
                                                <div className="flex gap-2">
                                                    <select
                                                        value={isTeamMode ? assignForm.data.super_team_id : assignForm.data.team_id}
                                                        onChange={(e) => assignForm.setData(isTeamMode ? 'super_team_id' : 'team_id', e.target.value)}
                                                        className="flex-1 px-2 py-1.5 rounded-lg bg-surface-800 border border-surface-700 text-surface-300 text-xs focus:border-primary-500"
                                                    >
                                                        <option value="">+ Tambah {isTeamMode ? 'Super Team' : 'tim'}...</option>
                                                        {unassignedContestants.map((c) => (
                                                            <option key={c.id} value={c.id}>{c.name}</option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        onClick={() => handleAssign(pool.id)}
                                                        disabled={isTeamMode ? !assignForm.data.super_team_id : !assignForm.data.team_id}
                                                        className="px-3 py-1.5 rounded-lg bg-primary-600 text-white text-xs font-semibold hover:bg-primary-700 disabled:opacity-30 transition-colors"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Unassigned Contestants Sidebar for Selected Mode */}
                <div className="rounded-xl border border-surface-700/50 bg-surface-900/50 overflow-hidden h-fit">
                    <div className="px-5 py-4 border-b border-surface-700/50 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-surface-200">
                            📋 Belum Masuk Pool ({currentCfg.label})
                        </h3>
                    </div>
                    <div className="p-4">
                        {unassignedContestants.length === 0 ? (
                            <div className="text-center py-6">
                                <p className="text-xs text-surface-500">Semua {isTeamMode ? 'Super Team' : 'tim'} sudah masuk pool {currentCfg.label} ✅</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {unassignedContestants.map((item) => (
                                    <div key={item.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-800/50 border border-surface-700/30">
                                        <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center text-xs font-bold text-amber-300">
                                            {item.name.charAt(0)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm text-surface-300 truncate font-medium">{item.name}</p>
                                            {isTeamMode ? (
                                                <p className="text-[10px] text-amber-400">3 tim anggota terdaftar</p>
                                            ) : (
                                                <p className="text-[10px] text-surface-500">{item.region}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {lockedSubTeamCount > 0 && (
                            <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2">
                                <span className="text-base leading-none">🔒</span>
                                <div>
                                    <p className="font-semibold">Sub-Tim Terkunci ({lockedSubTeamCount})</p>
                                    <p className="text-[11px] text-surface-400 mt-0.5">
                                        Sub-tim ini dikunci karena terdaftar sebagai anggota Super Team (Mode Team Regu).
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Confirm Generate Matches Dialog */}
            <ConfirmDialog
                isOpen={confirmGenMatches}
                onClose={() => setConfirmGenMatches(false)}
                onConfirm={handleGenerateMatches}
                title="Generate Pertandingan Round-Robin"
                message="Pertandingan pool-stage berstatus 'scheduled' yang ada akan dihapus dan diganti dengan pertandingan round-robin baru berdasarkan susunan pool saat ini. Lanjutkan?"
            />
        </AuthenticatedLayout>
    );
}
