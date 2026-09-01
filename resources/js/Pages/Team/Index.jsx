import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Pagination from '@/Components/Pagination';
import ConfirmDialog from '@/Components/ConfirmDialog';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

export default function TeamIndex({ teams, superTeams = [], allCoachTeams = [], coaches = [], tournaments = [] }) {
    const { auth } = usePage().props;
    const isCoach = auth.user?.role === 'coach';
    const isAdmin = auth.user?.role === 'admin';
    const canManageSuperTeams = isAdmin || isCoach;

    const [activeTab, setActiveTab] = useState('single'); // single, super
    const [deletingTeamId, setDeletingTeamId] = useState(null);
    const [deletingSuperTeamId, setDeletingSuperTeamId] = useState(null);
    const [isSuperTeamModalOpen, setIsSuperTeamModalOpen] = useState(false);

    // Initial athletes roster template (same clean format as regular team)
    const emptyAthlete = () => ({ name: '', jersey_number: '', position: 'Cadangan', photo: null });

    const { data: stData, setData: setStData, post: postSt, processing: stProcessing, errors: stErrors, reset: resetSt } = useForm({
        name: '',
        region: '',
        coach_id: '',
        tournament_id: '',
        athletes: [emptyAthlete()],
    });

    const addAthlete = () => {
        const nextJersey = stData.athletes.length + 1;
        setStData('athletes', [
            ...stData.athletes,
            { name: '', jersey_number: String(nextJersey), position: 'Cadangan', photo: null },
        ]);
    };

    const removeAthlete = (index) => {
        if (stData.athletes.length <= 1) return;
        setStData('athletes', stData.athletes.filter((_, i) => i !== index));
    };

    const updateAthlete = (index, field, value) => {
        const updated = [...stData.athletes];
        updated[index] = { ...updated[index], [field]: value };
        setStData('athletes', updated);
    };

    const parseCsvForAthletes = (text) => {
        const lines = text.split(/\r?\n/);
        if (lines.length <= 1) return [];
        const out = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const cols = line.split(',').map((c) => c.replace(/^["']|["']$/g, '').trim());
            if (cols.length < 2) continue;
            const name = cols[0];
            const jersey = parseInt(cols[1], 10);
            const position = cols[2] || 'Cadangan';
            if (name && !isNaN(jersey)) {
                out.push({ name, jersey_number: jersey, position, photo: null });
            }
        }
        return out;
    };

    const handleCsvUpload = (file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const imported = parseCsvForAthletes(event.target.result);
            if (imported.length === 0) {
                alert('File CSV kosong atau format tidak valid. Pastikan format CSV: name,jersey_number,position');
                return;
            }

            setStData('athletes', imported);
            alert(`✅ Berhasil membaca ${imported.length} atlet dari CSV!`);
        };
        reader.readAsText(file);
    };

    const handleDeleteTeam = () => {
        if (!deletingTeamId) return;
        router.delete(route('teams.destroy', deletingTeamId), {
            onFinish: () => setDeletingTeamId(null),
        });
    };

    const handleDeleteSuperTeam = () => {
        if (!deletingSuperTeamId) return;
        router.delete(route('super-teams.destroy', deletingSuperTeamId), {
            onFinish: () => setDeletingSuperTeamId(null),
        });
    };

    const handleCreateSuperTeam = (e) => {
        e.preventDefault();

        // Check for duplicate jersey numbers
        const jerseys = stData.athletes
            .map(a => (a.jersey_number !== '' && a.jersey_number !== null && a.jersey_number !== undefined) ? parseInt(a.jersey_number, 10) : null)
            .filter(n => n !== null && !isNaN(n));
        const dups = jerseys.filter((n, idx) => jerseys.indexOf(n) !== idx);
        if (dups.length > 0) {
            alert(`Terdapat nomor punggung duplikat (#${Array.from(new Set(dups)).join(', #')}). Pastikan seluruh nomor punggung unik dalam satu tim.`);
            return;
        }

        postSt(route('super-teams.store-unified'), {
            onSuccess: () => {
                setIsSuperTeamModalOpen(false);
                resetSt();
            },
        });
    };

    return (
        <AuthenticatedLayout header="Manajemen Tim">
            <Head title="Manajemen Tim & Super Team" />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-surface-100 flex items-center gap-2">
                        <span>👥 Tim & Super Team</span>
                    </h2>
                    <p className="text-sm text-surface-400 mt-1">
                        Kelola tim reguler serta Super Team untuk turnamen.
                    </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    <Link
                        href={route('teams.create')}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 text-white text-xs font-bold hover:bg-primary-500 transition-colors shadow-glow-primary cursor-pointer"
                    >
                        <span>+ Daftarkan Tim Reguler</span>
                    </Link>

                    {canManageSuperTeams && (
                        <button
                            onClick={() => setIsSuperTeamModalOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/20 cursor-pointer"
                        >
                            <span>🏆 + Buat Super Team</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-2 mb-6 border-b border-surface-800 pb-3">
                <button
                    onClick={() => setActiveTab('single')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        activeTab === 'single'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-surface-900 text-surface-400 hover:text-surface-200 border border-surface-800'
                    }`}
                >
                    <span>👥 Tim Reguler (Regu / Double / Quadrant)</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                        activeTab === 'single' ? 'bg-black/30 text-white' : 'bg-surface-800 text-surface-400'
                    }`}>
                        {teams.total ?? teams.data?.length ?? 0}
                    </span>
                </button>

                <button
                    onClick={() => setActiveTab('super')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        activeTab === 'super'
                            ? 'bg-purple-600 text-white shadow-md'
                            : 'bg-surface-900 text-surface-400 hover:text-surface-200 border border-surface-800'
                    }`}
                >
                    <span>🏆 Super Team</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                        activeTab === 'super' ? 'bg-black/30 text-white' : 'bg-surface-800 text-surface-400'
                    }`}>
                        {superTeams.length}
                    </span>
                </button>
            </div>

            {/* TAB 1: REGULAR TEAMS */}
            {activeTab === 'single' && (
                <div>
                    {teams.data.length === 0 ? (
                        <div className="text-center py-16 rounded-2xl border border-dashed border-surface-700/50 bg-surface-900/30">
                            <div className="text-5xl mb-4">👥</div>
                            <h3 className="text-base font-bold text-surface-200">Belum Ada Tim Terdaftar</h3>
                            <p className="text-surface-400 text-xs mt-1 max-w-sm mx-auto">
                                Daftarkan tim binaan Anda terlebih dahulu untuk mengelola daftar atlet dan mengikuti turnamen.
                            </p>
                            <Link
                                href={route('teams.create')}
                                className="inline-block mt-4 px-4 py-2 rounded-xl bg-primary-600 text-white text-xs font-bold hover:bg-primary-500 shadow-md"
                            >
                                + Daftarkan Tim Pertama
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
                            {teams.data.map((team) => (
                                <div
                                    key={team.id}
                                    className="rounded-2xl border border-surface-700/50 bg-surface-900/60 backdrop-blur-sm overflow-hidden hover:border-primary-500/30 transition-all duration-200 group flex flex-col justify-between shadow-md"
                                >
                                    <div className="p-5">
                                        {/* Header Card */}
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500/20 to-blue-600/10 flex items-center justify-center text-lg font-bold text-primary-300 shrink-0 border border-primary-500/20">
                                                    {team.name.charAt(0)}
                                                </div>
                                                <div className="min-w-0">
                                                    <Link
                                                        href={route('teams.show', team.id)}
                                                        className="text-base font-bold text-surface-100 hover:text-primary-300 transition-colors truncate block"
                                                    >
                                                        {team.name}
                                                    </Link>
                                                    <p className="text-xs text-surface-400">📍 {team.region}</p>
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex items-center gap-1 shrink-0">
                                                {!team.is_locked ? (
                                                    <>
                                                        <Link
                                                            href={route('teams.edit', team.id)}
                                                            className="p-1.5 rounded-lg text-surface-400 hover:text-accent-300 hover:bg-surface-800 transition-colors"
                                                            title="Edit Tim"
                                                        >
                                                            ✏️
                                                        </Link>
                                                        <button
                                                            onClick={() => setDeletingTeamId(team.id)}
                                                            className="p-1.5 rounded-lg text-surface-400 hover:text-red-400 hover:bg-surface-800 transition-colors cursor-pointer"
                                                            title="Hapus Tim"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </>
                                                ) : (
                                                    <span
                                                        className="text-xs text-surface-500 p-1.5 cursor-help"
                                                        title="Tim terkunci karena sudah memiliki riwayat penilaian pertandingan. Riwayat roster dilindungi."
                                                    >
                                                        🔒
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Status Roster Lock Badge */}
                                        <div className="mt-3.5 flex items-center gap-2 flex-wrap">
                                            {team.is_locked ? (
                                                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold flex items-center gap-1">
                                                    🔒 Roster Terkunci (Sudah Bertanding)
                                                </span>
                                            ) : (
                                                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center gap-1">
                                                    🔓 Roster Terbuka (Dapat Diedit)
                                                </span>
                                            )}

                                            {team.coach && (
                                                <span className="text-[11px] text-surface-500">
                                                    🧑‍🏫 {team.coach.name}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Athletes Preview Footer */}
                                    <div className="px-5 py-3 bg-surface-950/40 border-t border-surface-800 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-surface-500">Atlet:</span>
                                            <div className="flex -space-x-1">
                                                {(team.athletes || []).slice(0, 4).map((a) => (
                                                    <div
                                                        key={a.id}
                                                        className="w-6 h-6 rounded-full bg-surface-800 border border-surface-700 flex items-center justify-center text-[10px] font-bold text-surface-300 shadow-sm"
                                                        title={`${a.name} (#${a.jersey_number} - ${a.position || 'Pemain'})`}
                                                    >
                                                        {a.jersey_number}
                                                    </div>
                                                ))}
                                                {(team.athletes_count || team.athletes?.length || 0) > 4 && (
                                                    <div className="w-6 h-6 rounded-full bg-surface-800 border border-surface-700 flex items-center justify-center text-[10px] text-surface-400">
                                                        +{(team.athletes_count || team.athletes?.length || 0) - 4}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <Link
                                            href={route('teams.show', team.id)}
                                            className="text-xs font-semibold text-primary-400 hover:text-primary-300 transition-colors"
                                        >
                                            {team.athletes_count || team.athletes?.length || 0} atlet →
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <Pagination links={teams.links} />
                </div>
            )}

            {/* TAB 2: SUPER TEAMS */}
            {activeTab === 'super' && (
                <div>
                    <div className="mb-4 p-4 rounded-2xl border border-purple-500/20 bg-purple-500/10 text-xs text-purple-200 flex items-start gap-2.5">
                        <span className="text-base shrink-0">💡</span>
                        <div>
                            <p className="font-bold text-purple-100">Super Team:</p>
                            <p className="text-purple-300/80 mt-0.5">
                                Super Team diinput sebagai <strong>1 kesatuan tim</strong> persis seperti tim reguler. Pada jadwal turnamen (Master Schedule), setiap pertandingan Super Team otomatis dialokasikan <strong>3 kotak waktu (3 sesi)</strong>.
                            </p>
                        </div>
                    </div>

                    {superTeams.length === 0 ? (
                        <div className="text-center py-16 rounded-2xl border border-dashed border-surface-700/50 bg-surface-900/30">
                            <div className="text-5xl mb-4">🏆</div>
                            <h3 className="text-base font-bold text-surface-200">Belum Ada Super Team</h3>
                            <p className="text-surface-400 text-xs mt-1 max-w-md mx-auto">
                                Daftarkan Super Team untuk turnamen kategori Super Team (3 sesi pertandingan).
                            </p>
                            {canManageSuperTeams && (
                                <button
                                    onClick={() => setIsSuperTeamModalOpen(true)}
                                    className="inline-block mt-4 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                                >
                                    + Buat Super Team Pertama
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
                            {superTeams.map((st) => {
                                const allAthletes = (st.members || []).flatMap((m) => m.athletes || []);
                                const region = st.members?.[0]?.region || 'Daerah Tim';

                                return (
                                    <div
                                        key={st.id}
                                        className="rounded-2xl border border-purple-500/30 bg-surface-900/60 backdrop-blur-sm overflow-hidden hover:border-purple-500/50 transition-all duration-200 flex flex-col justify-between shadow-md"
                                    >
                                        <div className="p-5">
                                            {/* Top Header */}
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/25 to-indigo-600/15 flex items-center justify-center text-lg font-bold text-purple-300 shrink-0 border border-purple-500/30">
                                                        {st.name.charAt(0)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3 className="text-base font-bold text-purple-100 truncate">
                                                            {st.name}
                                                        </h3>
                                                        <p className="text-xs text-surface-400">📍 {region}</p>
                                                    </div>
                                                </div>

                                                {/* Action Delete */}
                                                {!st.is_locked && canManageSuperTeams && (
                                                    <button
                                                        onClick={() => setDeletingSuperTeamId(st.id)}
                                                        className="p-1.5 rounded-lg text-surface-400 hover:text-red-400 hover:bg-surface-800 transition-colors cursor-pointer shrink-0"
                                                        title="Hapus Super Team"
                                                    >
                                                        🗑️
                                                    </button>
                                                )}
                                            </div>

                                            {/* Badge & Coach */}
                                            <div className="mt-3.5 flex items-center gap-2 flex-wrap">
                                                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold uppercase">
                                                    🏆 Super Team
                                                </span>

                                                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-semibold">
                                                    ⏱️ 3 Sesi / Match
                                                </span>

                                                {st.coach && (
                                                    <span className="text-[11px] text-surface-400">
                                                        🧑‍🏫 {st.coach.name}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Tournament Status */}
                                            <div className="mt-2.5 text-xs">
                                                {st.tournament ? (
                                                    <span className="text-blue-300 font-medium">
                                                        🏆 Terdaftar di Turnamen: <strong>{st.tournament.name}</strong>
                                                    </span>
                                                ) : (
                                                    <span className="text-surface-500">
                                                        🔓 Belum didaftarkan ke turnamen
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Athletes Preview Footer */}
                                        <div className="px-5 py-3 bg-surface-950/40 border-t border-surface-800 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-surface-500">Atlet:</span>
                                                <div className="flex -space-x-1">
                                                    {allAthletes.slice(0, 4).map((a) => (
                                                        <div
                                                            key={a.id}
                                                            className="w-6 h-6 rounded-full bg-surface-800 border border-surface-700 flex items-center justify-center text-[10px] font-bold text-surface-300 shadow-sm"
                                                            title={`${a.name} (#${a.jersey_number} - ${a.position || 'Pemain'})`}
                                                        >
                                                            {a.jersey_number}
                                                        </div>
                                                    ))}
                                                    {allAthletes.length > 4 && (
                                                        <div className="w-6 h-6 rounded-full bg-surface-800 border border-surface-700 flex items-center justify-center text-[10px] text-surface-400">
                                                            +{allAthletes.length - 4}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <span className="text-xs font-semibold text-purple-400">
                                                {allAthletes.length} total atlet
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Modal Create Super Team (Clean Single Form) */}
            {isSuperTeamModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-3xl bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
                        <div className="px-6 py-4 border-b border-surface-800 flex items-center justify-between bg-surface-950/40">
                            <div>
                                <h3 className="text-base font-bold text-surface-100 flex items-center gap-2">
                                    <span>🏆 Buat Super Team Baru</span>
                                </h3>
                                <p className="text-xs text-surface-400 mt-0.5">
                                    Input data tim dan daftar atlet sebagai 1 kesatuan (otomatis dialokasikan 3 sesi di jadwal).
                                </p>
                            </div>
                            <button
                                onClick={() => setIsSuperTeamModalOpen(false)}
                                className="text-surface-400 hover:text-surface-200 p-1.5 rounded-lg hover:bg-surface-800 transition-colors cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateSuperTeam} className="p-6 space-y-4 flex flex-col flex-1 overflow-hidden" encType="multipart/form-data">
                            {/* General Details */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-surface-300 mb-1.5">
                                        Nama Super Team <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={stData.name}
                                        onChange={(e) => setStData('name', e.target.value)}
                                        placeholder="Contoh: Tim Harimau Perkasa"
                                        className="w-full px-4 py-2.5 rounded-xl bg-surface-950/60 border border-surface-700 text-surface-100 text-xs focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                                        required
                                    />
                                    {stErrors.name && <p className="text-red-400 text-xs mt-1">{stErrors.name}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-surface-300 mb-1.5">
                                        Daerah <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={stData.region}
                                        onChange={(e) => setStData('region', e.target.value)}
                                        placeholder="Contoh: Jakarta"
                                        className="w-full px-4 py-2.5 rounded-xl bg-surface-950/60 border border-surface-700 text-surface-100 text-xs focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                                        required
                                    />
                                    {stErrors.region && <p className="text-red-400 text-xs mt-1">{stErrors.region}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-surface-300 mb-1.5">
                                        Daftarkan ke Turnamen (Opsional)
                                    </label>
                                    <select
                                        value={stData.tournament_id}
                                        onChange={(e) => setStData('tournament_id', e.target.value)}
                                        className="w-full px-3 py-2.5 rounded-xl bg-surface-950/60 border border-surface-700 text-surface-100 text-xs focus:border-purple-500 transition-colors"
                                    >
                                        <option value="">— Tidak didaftarkan sekarang —</option>
                                        {tournaments.map((t) => (
                                            <option key={t.id} value={t.id}>
                                                🏆 {t.name}
                                            </option>
                                        ))}
                                    </select>
                                    {stErrors.tournament_id && <p className="text-red-400 text-xs mt-1">{stErrors.tournament_id}</p>}
                                </div>

                                {isAdmin ? (
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-surface-300 mb-1.5">
                                            Pelatih Penanggung Jawab
                                        </label>
                                        <select
                                            value={stData.coach_id}
                                            onChange={(e) => setStData('coach_id', e.target.value)}
                                            className="w-full px-3 py-2.5 rounded-xl bg-surface-950/60 border border-surface-700 text-surface-100 text-xs focus:border-purple-500 transition-colors"
                                        >
                                            <option value="">— Pilih Pelatih (Opsional) —</option>
                                            {coaches.map((c) => (
                                                <option key={c.id} value={c.id}>
                                                    🧑‍🏫 {c.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                ) : (
                                    <div className="flex items-center text-xs text-purple-300/80 p-2.5 rounded-xl bg-purple-950/20 border border-purple-900/30 self-end">
                                        <span>🧑‍🏫 Pelatih: <strong>{auth.user?.name}</strong></span>
                                    </div>
                                )}
                            </div>

                            {/* Athletes Section Header */}
                            <div className="pt-2 border-t border-surface-800 flex items-center justify-between">
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider text-surface-300">
                                        Daftar Atlet <span className="text-red-400">*</span>
                                    </label>
                                    <p className="text-[11px] text-surface-500">
                                        Minimal 1 atlet. Nomor punggung harus unik dalam satu tim.
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => document.getElementById('unified-csv-upload').click()}
                                        className="text-xs px-3 py-1.5 rounded-xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 transition-all font-semibold flex items-center gap-1.5 cursor-pointer"
                                        title="Import daftar atlet dari file CSV"
                                    >
                                        <span>📥 Import CSV</span>
                                    </button>
                                    <input
                                        type="file"
                                        id="unified-csv-upload"
                                        accept=".csv,text/csv"
                                        onChange={(e) => {
                                            handleCsvUpload(e.target.files[0]);
                                            e.target.value = '';
                                        }}
                                        className="hidden"
                                    />

                                    <button
                                        type="button"
                                        onClick={addAthlete}
                                        className="text-xs px-3 py-1.5 rounded-xl bg-primary-600/20 text-primary-300 border border-primary-500/30 hover:bg-primary-600/30 transition-all font-semibold flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <span>+ Tambah Atlet</span>
                                    </button>
                                </div>
                            </div>

                            {stErrors.athletes && (
                                <p className="text-red-400 text-xs">{stErrors.athletes}</p>
                            )}

                            {/* Athletes Table / List */}
                            <div className="space-y-2 overflow-y-auto pr-1 flex-1 max-h-[38vh]">
                                {stData.athletes.map((athlete, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center gap-2.5 p-2 rounded-xl border border-surface-700 bg-surface-950/50"
                                    >
                                        {/* Photo Upload */}
                                        <div className="relative shrink-0">
                                            <input
                                                type="file"
                                                id={`ath-photo-${idx}`}
                                                accept="image/*"
                                                onChange={(e) => updateAthlete(idx, 'photo', e.target.files[0] || null)}
                                                className="hidden"
                                            />
                                            <label
                                                htmlFor={`ath-photo-${idx}`}
                                                className="w-9 h-9 rounded-lg bg-surface-800 flex items-center justify-center text-xs font-bold text-surface-400 cursor-pointer overflow-hidden border border-surface-700 hover:border-purple-500 transition-colors block"
                                                title="Unggah foto atlet (opsional)"
                                            >
                                                {athlete.photo ? (
                                                    <img
                                                        src={URL.createObjectURL(athlete.photo)}
                                                        alt="Preview"
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <span>#{athlete.jersey_number || idx + 1}</span>
                                                )}
                                            </label>
                                        </div>

                                        {/* Name */}
                                        <input
                                            type="text"
                                            value={athlete.name}
                                            onChange={(e) => updateAthlete(idx, 'name', e.target.value)}
                                            placeholder="Nama Atlet"
                                            className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-surface-900 border border-surface-700 text-surface-100 text-xs focus:border-purple-500 transition-colors"
                                            required
                                        />

                                        {/* Jersey Number */}
                                        <input
                                            type="number"
                                            value={athlete.jersey_number}
                                            onChange={(e) => updateAthlete(idx, 'jersey_number', e.target.value)}
                                            placeholder="No"
                                            min="1"
                                            max="999"
                                            className="w-16 px-2 py-2 rounded-xl bg-surface-900 border border-surface-700 text-surface-100 text-xs text-center font-bold focus:border-purple-500 transition-colors"
                                            required
                                            title="Nomor Punggung"
                                        />

                                        {/* Position */}
                                        <select
                                            value={athlete.position || 'Cadangan'}
                                            onChange={(e) => updateAthlete(idx, 'position', e.target.value)}
                                            className="w-28 px-2 py-2 rounded-xl bg-surface-900 border border-surface-700 text-surface-200 text-xs focus:border-purple-500 transition-colors"
                                        >
                                            <option value="Tekong">Tekong</option>
                                            <option value="Feeder">Feeder</option>
                                            <option value="Smash">Smash</option>
                                            <option value="Cadangan">Cadangan</option>
                                        </select>

                                        {/* Remove Button */}
                                        {stData.athletes.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeAthlete(idx)}
                                                className="shrink-0 w-8 h-8 rounded-lg bg-red-500/10 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-colors cursor-pointer"
                                                title="Hapus atlet"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Modal Footer */}
                            <div className="pt-4 border-t border-surface-800 flex items-center justify-between">
                                <div className="text-xs text-surface-400 font-mono">
                                    Total: <strong>{stData.athletes.length}</strong> Atlet
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsSuperTeamModalOpen(false)}
                                        className="px-4 py-2 rounded-xl border border-surface-700 text-surface-400 text-xs font-semibold hover:bg-surface-800 transition-colors cursor-pointer"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={stProcessing}
                                        className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/20 disabled:opacity-50 cursor-pointer"
                                    >
                                        {stProcessing ? 'Menyimpan...' : '✓ Daftarkan Super Team'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirm Dialogs */}
            <ConfirmDialog
                isOpen={deletingTeamId !== null}
                onClose={() => setDeletingTeamId(null)}
                onConfirm={handleDeleteTeam}
                title="Hapus Tim Reguler"
                message="Tim beserta seluruh data atletnya akan dihapus permanen. Aksi ini hanya dapat dilakukan jika tim belum pernah mengikuti turnamen."
            />

            <ConfirmDialog
                isOpen={deletingSuperTeamId !== null}
                onClose={() => setDeletingSuperTeamId(null)}
                onConfirm={handleDeleteSuperTeam}
                title="Hapus Super Team"
                message="Super Team beserta seluruh data atletnya akan dihapus permanen. Aksi ini hanya dapat dilakukan jika Super Team belum pernah mengikuti turnamen."
            />
        </AuthenticatedLayout>
    );
}
