import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import StatusBadge from '@/Components/StatusBadge';
import ConfirmDialog from '@/Components/ConfirmDialog';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';

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

    const [isShuffling, setIsShuffling] = useState(false);

    const handleModeChange = (mode) => {
        setSelectedMode(mode);
        generateForm.setData('match_mode', mode);
        createCustomForm.setData('match_mode', mode);
        assignForm.reset();
    };

    const handleGenerate = (e) => {
        e.preventDefault();
        setShowGenerate(false);
        setIsShuffling(true);
    };

    const handleExecuteGenerate = (onDone) => {
        generateForm.post(route('pools.generate-random', tournament.id), {
            preserveScroll: true,
            onSuccess: () => {
                if (onDone) onDone();
            },
            onError: () => {
                setIsShuffling(false);
            },
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

    const handleDeletePool = (pool) => {
        if (!confirm(`Apakah Anda yakin ingin menghapus Pool ${pool.name}? Semua tim di pool ini akan dikeluarkan.`)) {
            return;
        }
        router.delete(route('pools.destroy', pool.id));
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
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-surface-500">{contestants.length} {isTeamMode ? 'Super Team' : 'tim'}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeletePool(pool)}
                                                    className="p-1 rounded text-surface-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                                    title="Hapus Pool Ini"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
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

            {/* Interactive Pool Shuffling / Drawing Modal */}
            <ShufflePoolModal
                isOpen={isShuffling}
                poolCount={generateForm.data.pool_count}
                matchMode={selectedMode}
                modeConfig={currentCfg}
                isTeamMode={isTeamMode}
                contestants={isTeamMode
                    ? (tournament.super_teams || []).filter(st => st.match_mode === selectedMode)
                    : (tournament.teams || []).filter(t => !superTeamMemberIds.has(t.id))
                }
                onExecute={(onDone) => handleExecuteGenerate(onDone)}
                onClose={() => setIsShuffling(false)}
            />
        </AuthenticatedLayout>
    );
}

function ShufflePoolModal({ isOpen, poolCount, matchMode, modeConfig, isTeamMode, contestants = [], onExecute, onClose }) {
    if (!isOpen) return null;

    const [progress, setProgress] = useState(0);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [statusText, setStatusText] = useState('🌀 Mengocok seluruh kontestan...');
    const [isDone, setIsDone] = useState(false);
    const [assignedSlots, setAssignedSlots] = useState({});

    // Sound effect synthesis using Web Audio API
    const playTickSound = () => {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(400 + Math.random() * 260, ctx.currentTime);
            gain.gain.setValueAtTime(0.04, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.06);
        } catch (e) {
            // Ignore audio policy blocks gracefully
        }
    };

    const playFanfare = () => {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.09);
                gain.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.09);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.09 + 0.35);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(ctx.currentTime + i * 0.09);
                osc.stop(ctx.currentTime + i * 0.09 + 0.35);
            });
        } catch (e) {
            // Ignore
        }
    };

    const effectiveContestants = contestants.length > 0 ? contestants : [
        { id: 1, name: 'Elang Jakarta', region: 'DKI Jakarta' },
        { id: 2, name: 'Maung Bandung', region: 'Jawa Barat' },
        { id: 3, name: 'Singa Surabaya', region: 'Jawa Timur' },
        { id: 4, name: 'Garuda Yogya', region: 'DIY' },
        { id: 5, name: 'Banteng Semarang', region: 'Jawa Tengah' },
        { id: 6, name: 'Rajawali Medan', region: 'Sumatera Utara' },
    ];

    const poolLabels = Array.from({ length: poolCount }, (_, i) => String.fromCharCode(65 + i));

    useEffect(() => {
        let intervalTime = 65;
        let cardTimer = null;
        let progressTimer = null;
        let executed = false;

        // Slot machine fast cycling timer
        cardTimer = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % effectiveContestants.length);
            playTickSound();
        }, intervalTime);

        // Progress step timer (2.6 seconds total)
        const startTime = Date.now();
        const duration = 2600;

        progressTimer = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const pct = Math.min(100, Math.floor((elapsed / duration) * 100));
            setProgress(pct);

            // Dynamic simulated pool assignment
            const simulatedPoolIndex = Math.floor((pct / 100) * poolCount) % poolCount;
            const currentPool = poolLabels[simulatedPoolIndex];
            setAssignedSlots(prev => ({
                ...prev,
                [currentPool]: (prev[currentPool] || 0) + 1
            }));

            if (pct < 30) {
                setStatusText(`🌀 Mengocok ${effectiveContestants.length} kontestan turnamen...`);
            } else if (pct < 70) {
                setStatusText(`🎲 Mengundi penempatan Pool A s/d Pool ${poolLabels[poolLabels.length - 1]}...`);
            } else if (pct < 95) {
                setStatusText(`👑 Menyusun Bagan Eliminasi & Bracket Matrix...`);
            } else {
                setStatusText(`✨ Pengundian selesai! Menyimpan ke sistem...`);
            }

            if (pct >= 100 && !executed) {
                executed = true;
                clearInterval(progressTimer);
                clearInterval(cardTimer);

                // Trigger backend generate
                onExecute(() => {
                    playFanfare();
                    setIsDone(true);
                    setTimeout(() => {
                        onClose();
                    }, 800);
                });
            }
        }, 60);

        return () => {
            clearInterval(cardTimer);
            clearInterval(progressTimer);
        };
    }, []);

    const activeTeam = effectiveContestants[currentIndex] || effectiveContestants[0];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/90 backdrop-blur-xl animate-fade-in select-none">
            <div className="bg-gradient-to-b from-surface-900 via-surface-950 to-black border-2 border-primary-500/50 rounded-3xl max-w-lg w-full p-6 shadow-2xl overflow-hidden flex flex-col items-center text-center relative animate-scale-in">
                
                {/* Ambient glow background */}
                <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary-500/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

                {/* Header Badge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/30 text-primary-300 text-xs font-bold uppercase tracking-wider mb-4 shadow-sm">
                    <span className="animate-spin text-sm">🏐</span>
                    <span>Pengundian Acak — {modeConfig.label}</span>
                </div>

                {/* Main 3D Orbiting Sphere Icon */}
                <div className="relative my-2">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 via-primary-500 to-emerald-400 p-1 shadow-xl shadow-primary-500/30 flex items-center justify-center animate-pulse">
                        <div className="w-full h-full rounded-full bg-surface-950 flex items-center justify-center">
                            <span className="text-3xl animate-bounce">
                                {isDone ? '🏆' : '🎲'}
                            </span>
                        </div>
                    </div>
                    {/* Rotating Dashed Orbit Ring */}
                    <div className="absolute inset-0 -m-2 border-2 border-dashed border-primary-400/60 rounded-full animate-spin" style={{ animationDuration: '4s' }} />
                </div>

                {/* Slot Machine Card Display */}
                <div className="w-full my-4 p-4 rounded-2xl bg-surface-900/80 border-2 border-amber-400/60 shadow-inner flex flex-col items-center justify-center transition-all duration-100 min-h-[110px]">
                    <span className="text-[10px] uppercase font-bold text-amber-400/80 tracking-widest mb-1">
                        {isDone ? '★ PENGUNDIAN BERHASIL' : '⚡ SEDANG DIUNDI...'}
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-wide truncate max-w-full scale-105 transition-transform duration-75">
                        {activeTeam.name}
                    </h3>
                    {activeTeam.region && (
                        <p className="text-xs text-surface-400 font-semibold mt-1">
                            📍 {activeTeam.region}
                        </p>
                    )}
                </div>

                {/* Mini Target Pools Preview */}
                <div className="w-full my-2">
                    <div className="grid grid-cols-4 sm:grid-cols-4 gap-2">
                        {poolLabels.map((label) => {
                            const isPulsing = Math.random() > 0.4;
                            return (
                                <div
                                    key={label}
                                    className={`
                                        p-2 rounded-xl border text-center transition-all duration-200
                                        ${isPulsing
                                            ? 'bg-primary-500/20 border-primary-400 shadow-md ring-1 ring-primary-400/40'
                                            : 'bg-surface-900/50 border-surface-800'
                                        }
                                    `}
                                >
                                    <span className="text-xs font-black text-primary-300 block">Pool {label}</span>
                                    <span className="text-[9px] text-surface-400 font-mono">
                                        {isDone ? 'Terisi ✓' : 'Mengundi...'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Progress Bar & Status Text */}
                <div className="w-full mt-4 space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-surface-300 flex items-center gap-1.5">
                            {statusText}
                        </span>
                        <span className="text-amber-300 font-mono">{progress}%</span>
                    </div>

                    <div className="w-full h-3 rounded-full bg-surface-800 overflow-hidden p-0.5 border border-surface-700">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-amber-400 via-primary-400 to-emerald-400 transition-all duration-100 shadow-lg"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                {/* Completion Banner */}
                {isDone && (
                    <div className="mt-4 p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-black text-xs animate-bounce">
                        🎉 Pengundian selesai! Memperbarui susunan pool turnamen...
                    </div>
                )}
            </div>
        </div>
    );
}
