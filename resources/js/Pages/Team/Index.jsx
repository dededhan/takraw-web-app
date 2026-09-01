import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Pagination from '@/Components/Pagination';
import ConfirmDialog from '@/Components/ConfirmDialog';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

export default function TeamIndex({ teams, superTeams = [], allCoachTeams = [] }) {
    const { auth } = usePage().props;
    const isCoach = auth.user?.role === 'coach';

    const [activeTab, setActiveTab] = useState('single'); // single, super
    const [deletingTeamId, setDeletingTeamId] = useState(null);
    const [deletingSuperTeamId, setDeletingSuperTeamId] = useState(null);
    const [isSuperTeamModalOpen, setIsSuperTeamModalOpen] = useState(false);

    // Form for creating Super Team
    const emptyAthlete = () => ({ name: '', jersey_number: '', position: '', photo: null });
    const emptySubTeam = () => ({ name: '', region: '', athletes: [emptyAthlete()] });

    const { data: stData, setData: setStData, post: postSt, processing: stProcessing, errors: stErrors, reset: resetSt } = useForm({
        name: '',
        match_mode: 'team_regu',
        sub_teams: [emptySubTeam(), emptySubTeam(), emptySubTeam()],
    });

    const updateSubTeam = (subIdx, field, value) => {
        const updated = [...stData.sub_teams];
        updated[subIdx] = { ...updated[subIdx], [field]: value };
        setStData('sub_teams', updated);
    };

    const addSubTeamAthlete = (subIdx) => {
        const updated = [...stData.sub_teams];
        updated[subIdx] = { ...updated[subIdx], athletes: [...updated[subIdx].athletes, emptyAthlete()] };
        setStData('sub_teams', updated);
    };

    const removeSubTeamAthlete = (subIdx, athleteIdx) => {
        const updated = [...stData.sub_teams];
        if (updated[subIdx].athletes.length <= 1) return;
        updated[subIdx] = {
            ...updated[subIdx],
            athletes: updated[subIdx].athletes.filter((_, i) => i !== athleteIdx),
        };
        setStData('sub_teams', updated);
    };

    const updateSubTeamAthlete = (subIdx, athleteIdx, field, value) => {
        const updated = [...stData.sub_teams];
        const athletes = [...updated[subIdx].athletes];
        athletes[athleteIdx] = { ...athletes[athleteIdx], [field]: value };
        updated[subIdx] = { ...updated[subIdx], athletes };
        setStData('sub_teams', updated);
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
            const position = cols[2] || '';
            if (name && !isNaN(jersey)) {
                out.push({ name, jersey_number: jersey, position, photo: null });
            }
        }
        return out;
    };

    const handleSubTeamCsvUpload = (subIdx, file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const imported = parseCsvForAthletes(event.target.result);
            if (imported.length === 0) {
                alert('File CSV kosong atau format tidak valid. Pastikan header: name,jersey_number,position');
                return;
            }
            const updated = [...stData.sub_teams];
            updated[subIdx] = { ...updated[subIdx], athletes: [...updated[subIdx].athletes, ...imported] };
            setStData('sub_teams', updated);
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
        router.delete(route('coach.super-teams.destroy', deletingSuperTeamId), {
            onFinish: () => setDeletingSuperTeamId(null),
        });
    };

    const handleCreateSuperTeam = (e) => {
        e.preventDefault();

        // Check for duplicate jersey numbers in each sub-team
        for (let i = 0; i < stData.sub_teams.length; i++) {
            const jerseys = stData.sub_teams[i].athletes
                .map(a => (a.jersey_number !== '' && a.jersey_number !== null && a.jersey_number !== undefined) ? parseInt(a.jersey_number, 10) : null)
                .filter(n => n !== null && !isNaN(n));
            const dups = jerseys.filter((n, idx) => jerseys.indexOf(n) !== idx);
            if (dups.length > 0) {
                alert(`Sub-Tim ${i + 1} (${stData.sub_teams[i].name || 'Sub-Tim ' + (i + 1)}) memiliki nomor punggung duplikat (#${dups.join(', #')}). Pastikan semua nomor punggung unik dalam satu sub-tim.`);
                return;
            }
        }

        postSt(route('coach.super-teams.store'), {
            onSuccess: () => {
                setIsSuperTeamModalOpen(false);
                resetSt();
            },
        });
    };

    const formatTournamentMode = (mode) => {
        switch (mode) {
            case 'regu': return 'Regu (3v3)';
            case 'double': return 'Double (2v2)';
            case 'quadrant': return 'Quadrant (4v4)';
            case 'team_regu': return 'Team Regu (Super Team 3x3)';
            case 'team_double': return 'Team Double (Super Team 3x2)';
            default: return mode;
        }
    };

    return (
        <AuthenticatedLayout header="Manajemen Tim">
            <Head title="Tim Saya" />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-surface-100 flex items-center gap-2">
                        <span>👥 Tim & Super Team</span>
                    </h2>
                    <p className="text-sm text-surface-400 mt-1">
                        Kelola tim reguler dan bentuk Super Team (Team Regu / Team Double) untuk turnamen.
                    </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    <Link
                        href={route('teams.create')}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 text-white text-xs font-bold hover:bg-primary-500 transition-colors shadow-glow-primary cursor-pointer"
                    >
                        <span>+ Daftarkan Tim Reguler</span>
                    </Link>

                    {isCoach && (
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
                    <span>🏆 Super Team (Team Regu / Team Double)</span>
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

            {/* TAB 2: SUPER TEAMS (TEAM REGU / TEAM DOUBLE) */}
            {activeTab === 'super' && (
                <div>
                    <div className="mb-4 p-4 rounded-2xl border border-purple-500/20 bg-purple-500/10 text-xs text-purple-200 flex items-start gap-2.5">
                        <span className="text-base shrink-0">💡</span>
                        <div>
                            <p className="font-bold text-purple-100">Informasi Super Team (Team Regu & Team Double):</p>
                            <p className="text-purple-300/80 mt-0.5">
                                Mode Team Regu dan Team Double mewajibkan penggabungan <strong>3 Sub-Tim binaan</strong> (Regu 1, Regu 2, Regu 3) dalam 1 bendera Super Team. Setiap pertandingan Team Regu berdurasi 3 sesi (3 slot lapangan) sekaligus.
                            </p>
                        </div>
                    </div>

                    {superTeams.length === 0 ? (
                        <div className="text-center py-16 rounded-2xl border border-dashed border-surface-700/50 bg-surface-900/30">
                            <div className="text-5xl mb-4">🏆</div>
                            <h3 className="text-base font-bold text-surface-200">Belum Ada Super Team</h3>
                            <p className="text-surface-400 text-xs mt-1 max-w-md mx-auto">
                                Buat Super Team dengan menggabungkan 3 Sub-Tim binaan Anda untuk didaftarkan ke turnamen kategori Team Regu atau Team Double.
                            </p>
                            {isCoach && (
                                <button
                                    onClick={() => setIsSuperTeamModalOpen(true)}
                                    className="inline-block mt-4 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                                >
                                    + Buat Super Team Pertama
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                            {superTeams.map((st) => (
                                <div
                                    key={st.id}
                                    className="rounded-2xl border border-purple-500/30 bg-surface-900/60 backdrop-blur-sm p-5 shadow-lg flex flex-col justify-between"
                                >
                                    <div>
                                        {/* Top Header */}
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="text-base font-bold text-purple-200">
                                                        {st.name}
                                                    </h3>
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-black uppercase border border-purple-500/30">
                                                        {formatTournamentMode(st.match_mode)}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-surface-400 mt-1">
                                                    {st.tournament ? (
                                                        <span className="text-blue-300 font-medium">
                                                            🏆 Terdaftar di Turnamen: <strong>{st.tournament.name}</strong>
                                                        </span>
                                                    ) : (
                                                        <span className="text-surface-500">
                                                            🔓 Belum terdaftar di turnamen (Siap Didaftarkan)
                                                        </span>
                                                    )}
                                                </p>
                                            </div>

                                            {/* Action Delete */}
                                            {!st.is_locked && isCoach && (
                                                <button
                                                    onClick={() => setDeletingSuperTeamId(st.id)}
                                                    className="p-1.5 rounded-lg text-surface-400 hover:text-red-400 hover:bg-surface-800 transition-colors cursor-pointer"
                                                    title="Hapus Super Team"
                                                >
                                                    🗑️
                                                </button>
                                            )}
                                        </div>

                                        {/* 3 Sub-Teams List */}
                                        <div className="mt-4 pt-3 border-t border-surface-800">
                                            <p className="text-xs font-bold uppercase tracking-wider text-surface-400 mb-2.5 flex items-center gap-1.5">
                                                <span>👥 3 Sub-Tim Anggota:</span>
                                            </p>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                {(st.members || []).map((subTeam, idx) => (
                                                    <div
                                                        key={subTeam.id}
                                                        className="p-2.5 rounded-xl bg-surface-950/50 border border-surface-850 text-xs text-center"
                                                    >
                                                        <span className="text-[10px] uppercase font-extrabold text-purple-400 block mb-0.5">
                                                            Regu {idx + 1}
                                                        </span>
                                                        <p className="font-bold text-surface-200 truncate">{subTeam.name}</p>
                                                        <p className="text-[10px] text-surface-500">{subTeam.athletes?.length || 0} Atlet</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bottom Footer */}
                                    <div className="mt-4 pt-3 border-t border-surface-800/80 flex items-center justify-between text-xs">
                                        <span className="text-surface-500 font-mono text-[11px]">
                                            Total {st.members?.reduce((acc, m) => acc + (m.athletes?.length || 0), 0) || 0} Atlet Terdaftar
                                        </span>
                                        {st.is_locked ? (
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium">
                                                🔒 Roster Terkunci
                                            </span>
                                        ) : (
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium">
                                                ✓ Siap Tanding
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Modal Create Super Team */}
            {isSuperTeamModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-3xl bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="px-6 py-4 border-b border-surface-800 flex items-center justify-between bg-surface-950/30">
                            <h3 className="text-base font-bold text-surface-100 flex items-center gap-2">
                                <span>🏆 Buat Super Team Baru</span>
                            </h3>
                            <button
                                onClick={() => setIsSuperTeamModalOpen(false)}
                                className="text-surface-400 hover:text-surface-200 p-1 rounded-lg hover:bg-surface-800 transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateSuperTeam} className="p-6 space-y-4 flex flex-col flex-1 overflow-hidden" encType="multipart/form-data">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-surface-300 mb-1.5">
                                    Nama Super Team <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={stData.name}
                                    onChange={(e) => setStData('name', e.target.value)}
                                    placeholder="Contoh: PSTG Garuda Perkasa"
                                    className="w-full px-4 py-2.5 rounded-xl bg-surface-950/60 border border-surface-700 text-surface-100 text-xs focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                                    required
                                />
                                {stErrors.name && <p className="text-red-400 text-xs mt-1">{stErrors.name}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-surface-300 mb-1.5">
                                    Kategori Mode Pertandingan <span className="text-red-400">*</span>
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setStData('match_mode', 'team_regu')}
                                        className={`p-3 rounded-xl border text-left transition-all ${
                                            stData.match_mode === 'team_regu'
                                                ? 'border-purple-500 bg-purple-500/15 text-purple-200 shadow-md'
                                                : 'border-surface-700 bg-surface-950/40 text-surface-400 hover:border-surface-600'
                                        }`}
                                    >
                                        <p className="text-xs font-bold">Team Regu (3x3)</p>
                                        <p className="text-[10px] text-surface-500 mt-0.5">3 Regu x 3 Pemain</p>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setStData('match_mode', 'team_double')}
                                        className={`p-3 rounded-xl border text-left transition-all ${
                                            stData.match_mode === 'team_double'
                                                ? 'border-purple-500 bg-purple-500/15 text-purple-200 shadow-md'
                                                : 'border-surface-700 bg-surface-950/40 text-surface-400 hover:border-surface-600'
                                        }`}
                                    >
                                        <p className="text-xs font-bold">Team Double (3x2)</p>
                                        <p className="text-[10px] text-surface-500 mt-0.5">3 Regu x 2 Pemain</p>
                                    </button>
                                </div>
                            </div>

                            {/* 3 Sub-Teams independen (buat sendiri + atlet) */}
                            <div className="space-y-4 overflow-y-auto pr-1">
                                <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 text-[11px] text-purple-200/90">
                                    💡 Setiap Sub-Tim dibuat <strong>independen</strong> (bukan memakai tim reguler yang sudah ada).
                                    Isi nama, daerah, dan daftar atlet masing-masing — bisa lewat <strong>input manual</strong> atau <strong>Import CSV</strong>.
                                </div>

                                {stData.sub_teams.map((sub, subIdx) => (
                                    <div key={subIdx} className="rounded-xl border border-surface-700 bg-surface-950/40 p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="block text-xs font-bold uppercase tracking-wider text-purple-300">
                                                Sub-Tim #{subIdx + 1} (Regu {subIdx + 1}) <span className="text-red-400">*</span>
                                            </label>
                                            {stErrors[`sub_teams.${subIdx}.name`] && (
                                                <p className="text-red-400 text-[11px]">{stErrors[`sub_teams.${subIdx}.name`]}</p>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[11px] font-semibold text-surface-400 mb-1">Nama Sub-Tim</label>
                                                <input
                                                    type="text"
                                                    value={sub.name}
                                                    onChange={(e) => updateSubTeam(subIdx, 'name', e.target.value)}
                                                    placeholder={`Contoh: ${stData.name || 'Super Team'} - Regu ${subIdx + 1}`}
                                                    className="w-full px-3 py-2 rounded-xl bg-surface-950/60 border border-surface-700 text-surface-100 text-xs focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-semibold text-surface-400 mb-1">Daerah</label>
                                                <input
                                                    type="text"
                                                    value={sub.region}
                                                    onChange={(e) => updateSubTeam(subIdx, 'region', e.target.value)}
                                                    placeholder="Contoh: Kab. Bandung"
                                                    className="w-full px-3 py-2 rounded-xl bg-surface-950/60 border border-surface-700 text-surface-100 text-xs focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        {/* Athletes of this sub-team */}
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="text-[11px] font-semibold text-surface-400">
                                                    Daftar Atlet <span className="text-red-400">*</span>
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => document.getElementById(`sub-csv-${subIdx}`).click()}
                                                        className="text-[11px] px-2.5 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 transition-all font-semibold"
                                                        title="Import daftar atlet dari file CSV"
                                                    >
                                                        📥 Import CSV
                                                    </button>
                                                    <input
                                                        type="file"
                                                        id={`sub-csv-${subIdx}`}
                                                        accept=".csv,text/csv"
                                                        onChange={(e) => {
                                                            handleSubTeamCsvUpload(subIdx, e.target.files[0]);
                                                            e.target.value = '';
                                                        }}
                                                        className="hidden"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => addSubTeamAthlete(subIdx)}
                                                        className="text-[11px] px-2.5 py-1.5 rounded-lg bg-primary-600/20 text-primary-300 border border-primary-500/30 hover:bg-primary-600/30 transition-all font-semibold"
                                                    >
                                                        + Tambah Atlet
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                {sub.athletes.map((athlete, athleteIdx) => (
                                                    <div key={athleteIdx} className="flex items-center gap-2">
                                                        {/* Photo */}
                                                        <div className="relative shrink-0 mt-1">
                                                            <input
                                                                type="file"
                                                                id={`sub-photo-${subIdx}-${athleteIdx}`}
                                                                accept="image/*"
                                                                onChange={(e) => updateSubTeamAthlete(subIdx, athleteIdx, 'photo', e.target.files[0] || null)}
                                                                className="hidden"
                                                            />
                                                            <label
                                                                htmlFor={`sub-photo-${subIdx}-${athleteIdx}`}
                                                                className="w-9 h-9 rounded-lg bg-surface-800 flex items-center justify-center text-xs font-bold text-surface-400 cursor-pointer overflow-hidden border border-surface-600 hover:border-purple-500 transition-colors block"
                                                                title="Unggah foto atlet"
                                                            >
                                                                {athlete.photo ? (
                                                                    <img
                                                                        src={URL.createObjectURL(athlete.photo)}
                                                                        alt="Preview"
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                ) : (
                                                                    <span>{athleteIdx + 1}</span>
                                                                )}
                                                            </label>
                                                        </div>

                                                        <input
                                                            type="text"
                                                            value={athlete.name}
                                                            onChange={(e) => updateSubTeamAthlete(subIdx, athleteIdx, 'name', e.target.value)}
                                                            placeholder="Nama atlet"
                                                            className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-surface-950/60 border border-surface-700 text-surface-100 text-xs focus:border-purple-500 transition-colors"
                                                            required
                                                        />
                                                        <input
                                                            type="number"
                                                            value={athlete.jersey_number}
                                                            onChange={(e) => updateSubTeamAthlete(subIdx, athleteIdx, 'jersey_number', e.target.value)}
                                                            placeholder="No"
                                                            min="1"
                                                            className="w-16 px-2 py-2 rounded-xl bg-surface-950/60 border border-surface-700 text-surface-100 text-xs text-center focus:border-purple-500 transition-colors"
                                                            required
                                                        />
                                                        <input
                                                            type="text"
                                                            value={athlete.position}
                                                            onChange={(e) => updateSubTeamAthlete(subIdx, athleteIdx, 'position', e.target.value)}
                                                            placeholder="Posisi"
                                                            className="w-24 min-w-0 px-3 py-2 rounded-xl bg-surface-950/60 border border-surface-700 text-surface-100 text-xs focus:border-purple-500 transition-colors"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => removeSubTeamAthlete(subIdx, athleteIdx)}
                                                            disabled={sub.athletes.length <= 1}
                                                            className="shrink-0 w-8 h-8 rounded-lg bg-red-500/10 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                            title="Hapus atlet"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                            {stErrors[`sub_teams.${subIdx}.athletes`] && (
                                                <p className="text-red-400 text-[11px] mt-1">{stErrors[`sub_teams.${subIdx}.athletes`]}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-4 border-t border-surface-800 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsSuperTeamModalOpen(false)}
                                    className="px-4 py-2 rounded-xl border border-surface-700 text-surface-400 text-xs font-semibold hover:bg-surface-800 transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={stProcessing}
                                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md disabled:opacity-50 cursor-pointer"
                                >
                                    {stProcessing ? 'Menyimpan...' : '✨ Buat Super Team'}
                                </button>
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
                message="Super Team beserta ketiga Sub-Tim anggotanya dan seluruh data atletnya akan dihapus. Aksi ini hanya dapat dilakukan jika Super Team belum pernah mengikuti turnamen."
            />
        </AuthenticatedLayout>
    );
}
