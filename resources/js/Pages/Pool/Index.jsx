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
    const [showBracketBuilder, setShowBracketBuilder] = useState(false);
    const [isShuffling, setIsShuffling] = useState(false);
    const [confirmGenMatches, setConfirmGenMatches] = useState(false);

    const isTeamMode = selectedMode === 'team_regu' || selectedMode === 'team_double';

    const assignForm    = useForm({ team_id: '', super_team_id: '' });
    const genMatchesForm = useForm({});

    const multiBracketForm = useForm({
        match_mode: selectedMode,
        brackets: [
            { name: 'Bracket 1', pool_count: 2, keyword: '' },
            { name: 'Bracket 2', pool_count: 2, keyword: '' },
        ],
    });

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

    const eligibleContestants = isTeamMode
        ? (tournament.super_teams || []).filter(st => st.match_mode === selectedMode)
        : (tournament.teams || []).filter(t => {
            if (superTeamMemberIds.has(t.id)) return false;
            const nameLower = t.name.toLowerCase();
            if (selectedMode === 'regu' && nameLower.includes('double')) return false;
            if (selectedMode === 'double' && (nameLower.includes('regu') && !nameLower.includes('double'))) return false;
            if (selectedMode === 'quadrant' && (nameLower.includes('regu') || nameLower.includes('double'))) return false;
            return true;
        });

    const lockedSubTeamCount = isTeamMode ? 0 : (tournament.teams || []).filter(t => superTeamMemberIds.has(t.id)).length;

    const handleModeChange = (mode) => {
        setSelectedMode(mode);
        multiBracketForm.setData('match_mode', mode);
        assignForm.reset();
    };

    const addBracket = () => {
        const nextNum = multiBracketForm.data.brackets.length + 1;
        multiBracketForm.setData('brackets', [
            ...multiBracketForm.data.brackets,
            { name: `Bracket ${nextNum}`, pool_count: 2, keyword: '' },
        ]);
    };

    const removeBracket = (idx) => {
        if (multiBracketForm.data.brackets.length <= 1) return;
        multiBracketForm.setData('brackets', multiBracketForm.data.brackets.filter((_, i) => i !== idx));
    };

    const updateBracket = (idx, field, value) => {
        const updated = [...multiBracketForm.data.brackets];
        updated[idx][field] = value;
        multiBracketForm.setData('brackets', updated);
    };

    const countMatchingTeams = (keyword) => {
        if (!keyword || !keyword.trim()) return eligibleContestants.length;
        const kw = keyword.trim().toLowerCase();
        return eligibleContestants.filter(t => t.name.toLowerCase().includes(kw)).length;
    };

    const handleStartShuffleAndGenerate = (e) => {
        e?.preventDefault?.();
        setShowBracketBuilder(false);
        setIsShuffling(true);
    };

    const handleExecuteMultiBracketGenerate = (onDone) => {
        multiBracketForm.post(route('pools.generate-multi-bracket', tournament.id), {
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

    const currentCfg = MODE_LABELS[selectedMode] || { label: selectedMode, icon: '⚽', color: '' };

    // Group pools by bracket_name if any pool has it
    const hasBrackets = modePools.some(p => !!p.bracket_name);
    const poolsByBracket = {};
    if (hasBrackets) {
        modePools.forEach(p => {
            const bName = p.bracket_name || 'Pool Reguler';
            if (!poolsByBracket[bName]) poolsByBracket[bName] = [];
            poolsByBracket[bName].push(p);
        });
    }

    const totalPoolsConfigured = multiBracketForm.data.brackets.reduce((acc, b) => acc + (b.pool_count || 0), 0);

    return (
        <AuthenticatedLayout header={`Pool — ${tournament.name}`}>
            <Head title={`Pool — ${tournament.name}`} />

            <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
                <Link href={route('tournaments.show', tournament.id)} className="text-sm text-surface-500 hover:text-surface-300 transition-colors flex items-center gap-1">
                    ← Kembali ke Detail Turnamen
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

            {/* Header & Main Unified Action */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-surface-100 flex items-center gap-2">
                        <span>🎯</span> Manajemen Bracket & Pool Turnamen
                    </h2>
                    <p className="text-sm text-surface-400 mt-1">
                        Atur pembagian Pool & Multi-Bracket serta undi tim secara acak berdasarkan kata kunci awalan nama tim.
                    </p>
                </div>
                <div className="flex items-center gap-2 self-start flex-wrap">
                    <button
                        onClick={() => setShowBracketBuilder(!showBracketBuilder)}
                        className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg cursor-pointer ${
                            showBracketBuilder
                                ? 'bg-surface-800 text-surface-200 border border-surface-700'
                                : 'bg-gradient-to-r from-purple-600 via-primary-600 to-indigo-600 text-white hover:opacity-95 shadow-purple-600/30 ring-1 ring-white/20'
                        }`}
                    >
                        <span>{showBracketBuilder ? '✕ Tutup Pengaturan' : '🎲 Custom Bracket & Undi Pool'}</span>
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
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border cursor-pointer ${
                                isActive
                                    ? cfg.color + ' shadow-md'
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

            {/* UNIFIED CUSTOM BRACKET & POOL BUILDER WITH KEYWORD FILTER & LIVE RANDOM ANIMATION */}
            {showBracketBuilder && (
                <div className="rounded-2xl border border-purple-500/40 bg-surface-900/90 backdrop-blur-xl p-6 mb-8 animate-in fade-in slide-in-from-top-4 duration-200 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-purple-500/20 mb-5 gap-3">
                            <div>
                                <h3 className="text-base font-extrabold text-purple-200 flex items-center gap-2">
                                    <span>🎯</span> Setup Custom Bracket & Undi Pool — {currentCfg.label}
                                </h3>
                                <p className="text-xs text-surface-400 mt-1">
                                    Tentukan nama bracket, jumlah pool, serta <strong>kata kunci awalan nama tim (opsional)</strong> untuk memfilter tim yang akan diacak ke dalam masing-masing bracket.
                                </p>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <button
                                    type="button"
                                    onClick={addBracket}
                                    className="px-3.5 py-1.5 rounded-xl bg-purple-600/25 border border-purple-400/40 text-purple-200 text-xs font-bold hover:bg-purple-600/40 transition-colors flex items-center gap-1.5 cursor-pointer"
                                >
                                    <span>+ Tambah Bracket</span>
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleStartShuffleAndGenerate} className="space-y-4">
                            {/* Brackets Grid Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {multiBracketForm.data.brackets.map((b, idx) => {
                                    const poolLetters = Array.from({ length: b.pool_count || 1 }, (_, i) => String.fromCharCode(65 + i));
                                    const matchCount = countMatchingTeams(b.keyword);

                                    return (
                                        <div
                                            key={idx}
                                            className="rounded-2xl bg-surface-950/70 border border-purple-500/30 p-4 relative space-y-3 shadow-inner hover:border-purple-500/50 transition-colors flex flex-col justify-between"
                                        >
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between gap-2 pb-2 border-b border-surface-800">
                                                    <span className="text-xs font-bold text-purple-300 uppercase tracking-wide flex items-center gap-1.5">
                                                        <span>🏆</span> Bracket #{idx + 1}
                                                    </span>
                                                    {multiBracketForm.data.brackets.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeBracket(idx)}
                                                            className="w-6 h-6 rounded-lg text-surface-500 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors cursor-pointer text-xs font-bold"
                                                            title="Hapus Bracket"
                                                        >
                                                            ✕
                                                        </button>
                                                    )}
                                                </div>

                                                <div>
                                                    <label className="block text-[11px] font-semibold text-surface-400 mb-1">
                                                        Nama Bracket <span className="text-red-400">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={b.name}
                                                        onChange={e => updateBracket(idx, 'name', e.target.value)}
                                                        placeholder={`Contoh: Bracket ${idx + 1} / Kategori U-18`}
                                                        className="w-full px-3 py-2 rounded-xl bg-surface-900 border border-surface-700 text-surface-100 text-xs font-bold focus:border-purple-500 transition-colors"
                                                        required
                                                    />
                                                </div>

                                                {/* Keyword Filter */}
                                                <div>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <label className="text-[11px] font-semibold text-surface-300">
                                                            Kata Kunci Tim <span className="text-surface-500 font-normal">(Opsional)</span>
                                                        </label>
                                                        {b.keyword && (
                                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                                                                {matchCount} tim cocok
                                                            </span>
                                                        )}
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={b.keyword || ''}
                                                        onChange={e => updateBracket(idx, 'keyword', e.target.value)}
                                                        placeholder="Contoh: TPA U18, TRA U18, dll"
                                                        className="w-full px-3 py-2 rounded-xl bg-surface-900 border border-purple-500/40 text-purple-200 placeholder-surface-600 text-xs font-mono focus:border-purple-400 transition-colors"
                                                    />
                                                    <p className="text-[10px] text-surface-500 mt-1">
                                                        {b.keyword ? (
                                                            <span>Hanya tim yang mengandung <strong>"{b.keyword}"</strong> yang akan diacak ke bracket ini.</span>
                                                        ) : (
                                                            <span>Kosongkan jika bracket ini menerima tim apa saja/sisa tim.</span>
                                                        )}
                                                    </p>
                                                </div>

                                                <div>
                                                    <label className="block text-[11px] font-semibold text-surface-400 mb-1">Jumlah Pool</label>
                                                    <select
                                                        value={b.pool_count}
                                                        onChange={e => updateBracket(idx, 'pool_count', parseInt(e.target.value))}
                                                        className="w-full px-3 py-2 rounded-xl bg-surface-900 border border-surface-700 text-surface-100 text-xs font-bold focus:border-purple-500 transition-colors"
                                                    >
                                                        <option value={1}>1 Pool (Round Robin Murni)</option>
                                                        <option value={2}>2 Pool (Pool A & B — Final Juara A vs B)</option>
                                                        <option value={3}>3 Pool (Pool A, B, C — Babak Gugur)</option>
                                                        <option value={4}>4 Pool (Pool A, B, C, D — QF & Semifinal)</option>
                                                        <option value={5}>5 Pool (Pool A s/d E)</option>
                                                        <option value={6}>6 Pool (Pool A s/d F)</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="pt-2 border-t border-surface-800/80 flex items-center justify-between text-[11px] mt-2">
                                                <span className="text-surface-500 font-medium">Susunan Pool:</span>
                                                {b.pool_count === 1 ? (
                                                    <span className="font-mono text-amber-300 font-bold">
                                                        Pool A (1 Pool)
                                                    </span>
                                                ) : (
                                                    <span className="font-mono text-purple-300 font-bold">
                                                        {poolLetters.map(p => `Pool ${p}`).join(', ')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Summary & Trigger Action */}
                            <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4">
                                <div className="text-xs text-surface-300">
                                    Total Struktur: <strong className="text-purple-300 font-bold">{multiBracketForm.data.brackets.length} Bracket</strong> &{' '}
                                    <strong className="text-purple-300 font-bold">{totalPoolsConfigured} Pool</strong>.{' '}
                                    <span className="text-surface-400 block sm:inline mt-1 sm:mt-0">
                                        (Sebanyak <strong>{eligibleContestants.length}</strong> {isTeamMode ? 'Super Team' : 'tim'} tersedia untuk diundi).
                                    </span>
                                </div>

                                <div className="flex items-center gap-2.5 self-end">
                                    <button
                                        type="button"
                                        onClick={() => setShowBracketBuilder(false)}
                                        className="px-4 py-2.5 rounded-xl bg-surface-800 text-surface-400 text-xs font-semibold hover:bg-surface-700 transition-colors cursor-pointer"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={multiBracketForm.processing || eligibleContestants.length === 0}
                                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-primary-600 to-indigo-600 text-white text-xs font-extrabold hover:opacity-95 transition-all shadow-lg shadow-purple-600/30 disabled:opacity-50 cursor-pointer flex items-center gap-2"
                                    >
                                        <span>🎲 Undi & Generate Pool (Acak Tim)</span>
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MAIN POOLS DISPLAY */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Pools List for Selected Mode */}
                <div className="lg:col-span-2 space-y-6">
                    {modePools.length === 0 ? (
                        <div className="text-center py-16 rounded-2xl border border-dashed border-surface-700/50 bg-surface-900/30">
                            <div className="text-5xl mb-4">{currentCfg.icon}</div>
                            <h3 className="text-base font-bold text-surface-200">Belum Ada Pool untuk {currentCfg.label}</h3>
                            <p className="text-surface-400 text-xs mt-1 max-w-md mx-auto">
                                Klik tombol <strong>"🎲 Custom Bracket & Undi Pool"</strong> di atas untuk mengatur format bracket, kata kunci filter tim, dan mengundi seluruh tim secara otomatis.
                            </p>
                            <button
                                onClick={() => setShowBracketBuilder(true)}
                                className="inline-block mt-4 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                            >
                                🎲 Atur Bracket & Undi Pool Sekarang
                            </button>
                        </div>
                    ) : hasBrackets ? (
                        /* Grouped by Bracket Name */
                        Object.entries(poolsByBracket).map(([bName, bPools]) => (
                            <div key={bName} className="rounded-2xl border border-purple-500/20 bg-surface-900/40 p-5 space-y-4 shadow-sm">
                                <div className="flex items-center justify-between pb-2 border-b border-surface-800">
                                    <h3 className="text-sm font-extrabold text-purple-300 flex items-center gap-2 uppercase tracking-wide">
                                        <span>🏆</span> {bName}
                                    </h3>
                                    <span className="text-xs font-medium text-surface-400 bg-surface-800 px-2.5 py-1 rounded-full">
                                        {bPools.length} Pool
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {bPools.map(pool => {
                                        const contestants = isTeamMode ? (pool.super_teams || []) : (pool.teams || []);
                                        return (
                                            <div key={pool.id} className="rounded-xl border border-surface-700/50 bg-surface-900/70 overflow-hidden shadow-sm flex flex-col justify-between">
                                                <div>
                                                    <div className="px-5 py-3 border-b border-surface-700/50 bg-surface-800/40 flex items-center justify-between">
                                                        <h4 className="text-sm font-bold text-accent-300">{pool.display_name || `Pool ${pool.name}`}</h4>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-surface-500">{contestants.length} {isTeamMode ? 'Super Team' : 'tim'}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeletePool(pool)}
                                                                className="p-1 rounded text-surface-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
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
                                                                        className="p-1 rounded text-surface-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
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
                                                </div>

                                                {/* Add contestant manually */}
                                                {unassignedContestants.length > 0 && (
                                                    <div className="px-3 pb-3 pt-1">
                                                        <div className="flex gap-2">
                                                            <select
                                                                value={isTeamMode ? assignForm.data.super_team_id : assignForm.data.team_id}
                                                                onChange={(e) => assignForm.setData(isTeamMode ? 'super_team_id' : 'team_id', e.target.value)}
                                                                className="flex-1 px-2 py-1.5 rounded-lg bg-surface-950 border border-surface-700 text-surface-300 text-xs focus:border-primary-500"
                                                            >
                                                                <option value="">+ Tambah {isTeamMode ? 'Super Team' : 'tim'}...</option>
                                                                {unassignedContestants.map((c) => (
                                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                                ))}
                                                            </select>
                                                            <button
                                                                onClick={() => handleAssign(pool.id)}
                                                                disabled={isTeamMode ? !assignForm.data.super_team_id : !assignForm.data.team_id}
                                                                className="px-3 py-1.5 rounded-lg bg-primary-600 text-white text-xs font-semibold hover:bg-primary-700 disabled:opacity-30 transition-colors cursor-pointer"
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
                            </div>
                        ))
                    ) : (
                        /* Standard Flat Grid */
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {modePools.map((pool) => {
                                const contestants = isTeamMode ? (pool.super_teams || []) : (pool.teams || []);
                                return (
                                    <div key={pool.id} className="rounded-xl border border-surface-700/50 bg-surface-900/50 overflow-hidden shadow-sm flex flex-col justify-between">
                                        <div>
                                            <div className="px-5 py-3 border-b border-surface-700/50 bg-surface-800/30 flex items-center justify-between">
                                                <h3 className="text-sm font-bold text-accent-300">Pool {pool.name}</h3>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-surface-500">{contestants.length} {isTeamMode ? 'Super Team' : 'tim'}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeletePool(pool)}
                                                        className="p-1 rounded text-surface-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
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
                                                                className="p-1 rounded text-surface-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
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
                                        </div>

                                        {/* Add contestant to pool */}
                                        {unassignedContestants.length > 0 && (
                                            <div className="px-3 pb-3 pt-1">
                                                <div className="flex gap-2">
                                                    <select
                                                        value={isTeamMode ? assignForm.data.super_team_id : assignForm.data.team_id}
                                                        onChange={(e) => assignForm.setData(isTeamMode ? 'super_team_id' : 'team_id', e.target.value)}
                                                        className="flex-1 px-2 py-1.5 rounded-lg bg-surface-950 border border-surface-700 text-surface-300 text-xs focus:border-primary-500"
                                                    >
                                                        <option value="">+ Tambah {isTeamMode ? 'Super Team' : 'tim'}...</option>
                                                        {unassignedContestants.map((c) => (
                                                            <option key={c.id} value={c.id}>{c.name}</option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        onClick={() => handleAssign(pool.id)}
                                                        disabled={isTeamMode ? !assignForm.data.super_team_id : !assignForm.data.team_id}
                                                        className="px-3 py-1.5 rounded-lg bg-primary-600 text-white text-xs font-semibold hover:bg-primary-700 disabled:opacity-30 transition-colors cursor-pointer"
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
                <div className="rounded-2xl border border-surface-700/50 bg-surface-900/60 overflow-hidden h-fit shadow-md">
                    <div className="px-5 py-4 border-b border-surface-700/50 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-surface-200 flex items-center gap-2">
                            <span>📋</span> Belum Masuk Pool ({currentCfg.label})
                        </h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-800 text-surface-300 font-bold">
                            {unassignedContestants.length} Tim
                        </span>
                    </div>
                    <div className="p-4">
                        {unassignedContestants.length === 0 ? (
                            <div className="text-center py-8">
                                <div className="text-3xl mb-2">🎉</div>
                                <p className="text-xs text-emerald-400 font-semibold">Semua {isTeamMode ? 'Super Team' : 'tim'} sudah masuk pool {currentCfg.label}!</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                                {unassignedContestants.map((item) => (
                                    <div key={item.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-surface-800/60 border border-surface-700/40">
                                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-xs font-bold text-amber-300 shrink-0">
                                            {item.name.charAt(0)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs text-surface-200 truncate font-bold">{item.name}</p>
                                            {isTeamMode ? (
                                                <p className="text-[10px] text-amber-400">3 tim anggota terdaftar</p>
                                            ) : (
                                                <p className="text-[10px] text-surface-400">📍 {item.region}</p>
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
                                        Sub-tim ini dikunci dari pool individu karena bertanding sebagai 1 kesatuan Super Team.
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

            {/* Interactive Multi-Bracket Pool Shuffling & Lottery Modal */}
            <ShufflePoolModal
                isOpen={isShuffling}
                bracketsConfig={multiBracketForm.data.brackets}
                matchMode={selectedMode}
                modeConfig={currentCfg}
                isTeamMode={isTeamMode}
                contestants={eligibleContestants}
                onExecute={(onDone) => handleExecuteMultiBracketGenerate(onDone)}
                onClose={() => setIsShuffling(false)}
            />
        </AuthenticatedLayout>
    );
}

function ShufflePoolModal({ isOpen, bracketsConfig = [], matchMode, modeConfig, isTeamMode, contestants = [], onExecute, onClose }) {
    if (!isOpen) return null;

    const [progress, setProgress] = useState(0);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [statusText, setStatusText] = useState('🌀 Mengocok seluruh kontestan turnamen...');
    const [isDone, setIsDone] = useState(false);

    // Sound effect synthesis using Web Audio API
    const playTickSound = () => {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(380 + Math.random() * 280, ctx.currentTime);
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
        { id: 1, name: 'Tim Rajawali', region: 'DKI Jakarta' },
        { id: 2, name: 'Tim Garuda', region: 'Jawa Barat' },
        { id: 3, name: 'Tim Harimau', region: 'Jawa Timur' },
        { id: 4, name: 'Tim Singa', region: 'Jawa Tengah' },
        { id: 5, name: 'Tim Banteng', region: 'DIY' },
        { id: 6, name: 'Tim Elang', region: 'Sumatera Utara' },
    ];

    // Build all target pools list across brackets
    const allTargetPools = [];
    bracketsConfig.forEach((b, bIdx) => {
        const poolCount = b.pool_count || 1;
        for (let i = 0; i < poolCount; i++) {
            const letter = String.fromCharCode(65 + i);
            allTargetPools.push({
                bracketName: b.name || `Bracket ${bIdx + 1}`,
                poolLabel: `Pool ${letter}`,
                keyword: b.keyword,
                key: `${bIdx}-${letter}`,
            });
        }
    });

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

        // Progress step timer (2.8 seconds total)
        const startTime = Date.now();
        const duration = 2800;

        progressTimer = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const pct = Math.min(100, Math.floor((elapsed / duration) * 100));
            setProgress(pct);

            if (pct < 25) {
                setStatusText(`🌀 Mengocok ${effectiveContestants.length} kontestan turnamen...`);
            } else if (pct < 65) {
                setStatusText(`🎲 Mengundi tim sesuai kata kunci ke dalam ${bracketsConfig.length} Bracket & ${allTargetPools.length} Pool...`);
            } else if (pct < 92) {
                setStatusText(`👑 Menghubungkan Bagan Eliminasi & Bracket Matrix...`);
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
            <div className="bg-gradient-to-b from-surface-900 via-surface-950 to-black border-2 border-purple-500/50 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl overflow-hidden flex flex-col items-center text-center relative animate-scale-in">
                
                {/* Ambient glow background */}
                <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 bg-purple-500/25 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-72 h-72 bg-primary-500/20 rounded-full blur-3xl pointer-events-none" />

                {/* Header Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-200 text-xs font-bold uppercase tracking-wider mb-4 shadow-sm">
                    <span className="animate-spin text-sm">🎲</span>
                    <span>Pengundian Multi-Bracket & Pool — {modeConfig.label}</span>
                </div>

                {/* Main 3D Orbiting Sphere Icon */}
                <div className="relative my-2">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-purple-500 via-primary-500 to-amber-400 p-1 shadow-xl shadow-purple-500/40 flex items-center justify-center animate-pulse">
                        <div className="w-full h-full rounded-full bg-surface-950 flex items-center justify-center">
                            <span className="text-3xl animate-bounce">
                                {isDone ? '🏆' : '🎲'}
                            </span>
                        </div>
                    </div>
                    {/* Rotating Dashed Orbit Ring */}
                    <div className="absolute inset-0 -m-2 border-2 border-dashed border-purple-400/60 rounded-full animate-spin" style={{ animationDuration: '4s' }} />
                </div>

                {/* Slot Machine Card Display */}
                <div className="w-full my-4 p-5 rounded-2xl bg-surface-900/90 border-2 border-purple-400/60 shadow-inner flex flex-col items-center justify-center transition-all duration-100 min-h-[115px]">
                    <span className="text-[10px] uppercase font-bold text-purple-400/90 tracking-widest mb-1">
                        {isDone ? '★ PENGUNDIAN BERHASIL' : '⚡ SEDANG DIUNDI & DIACAK...'}
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-wide truncate max-w-full scale-105 transition-transform duration-75">
                        {activeTeam.name}
                    </h3>
                    {activeTeam.region && (
                        <p className="text-xs text-purple-300 font-semibold mt-1">
                            📍 {activeTeam.region}
                        </p>
                    )}
                </div>

                {/* Target Brackets & Pools Preview Grid */}
                <div className="w-full my-2 max-h-36 overflow-y-auto pr-1">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {allTargetPools.map((item) => {
                            const isPulsing = Math.random() > 0.35;
                            return (
                                <div
                                    key={item.key}
                                    className={`
                                        p-2 rounded-xl border text-center transition-all duration-200
                                        ${isPulsing
                                            ? 'bg-purple-500/25 border-purple-400 shadow-md ring-1 ring-purple-400/40'
                                            : 'bg-surface-900/60 border-surface-800'
                                        }
                                    `}
                                >
                                    <span className="text-[10px] text-surface-400 block truncate font-medium">{item.bracketName}</span>
                                    <span className="text-xs font-black text-purple-200 block">{item.poolLabel}</span>
                                    {item.keyword ? (
                                        <span className="text-[9px] text-emerald-400 font-mono block truncate">
                                            🔑 {item.keyword}
                                        </span>
                                    ) : (
                                        <span className="text-[9px] text-surface-400 font-mono mt-0.5 block">
                                            {isDone ? 'Terisi ✓' : 'Mengundi...'}
                                        </span>
                                    )}
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
                        <span className="text-purple-300 font-mono">{progress}%</span>
                    </div>

                    <div className="w-full h-3 rounded-full bg-surface-800 overflow-hidden p-0.5 border border-surface-700">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-purple-500 via-primary-400 to-emerald-400 transition-all duration-100 shadow-lg"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                {/* Completion Banner */}
                {isDone && (
                    <div className="mt-4 p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-black text-xs animate-bounce">
                        🎉 Pengundian selesai! Memperbarui susunan bracket & pool turnamen...
                    </div>
                )}
            </div>
        </div>
    );
}
