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
    const { data: stData, setData: setStData, post: postSt, processing: stProcessing, errors: stErrors, reset: resetSt } = useForm({
        name: '',
        match_mode: 'team_regu',
        team_ids: ['', '', ''],
    });

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
                                                        title="Tim terkunci karena pernah/sedang mengikuti turnamen. Riwayat roster dilindungi."
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
                                                    🔒 Roster Terkunci ({team.tournaments_count || team.tournaments?.length || 1} Turnamen)
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
                    <div className="w-full max-w-lg bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl overflow-hidden">
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

                        <form onSubmit={handleCreateSuperTeam} className="p-6 space-y-4">
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

                            {/* 3 Sub-Teams Pickers */}
                            <div className="pt-2 border-t border-surface-800 space-y-3">
                                <label className="block text-xs font-bold uppercase tracking-wider text-purple-300">
                                    Pilih 3 Sub-Tim Binaan Anda:
                                </label>

                                {allCoachTeams.length < 3 ? (
                                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                                        ⚠️ Anda memerlukan minimal 3 tim binaan untuk membentuk 1 Super Team. Silakan daftarkan tim baru terlebih dahulu.
                                    </div>
                                ) : (
                                    [0, 1, 2].map((idx) => (
                                        <div key={idx}>
                                            <label className="block text-[11px] font-semibold text-surface-400 mb-1">
                                                Sub-Tim #{idx + 1} (Regu {idx + 1}) <span className="text-red-400">*</span>
                                            </label>
                                            <select
                                                value={stData.team_ids[idx] || ''}
                                                onChange={(e) => {
                                                    const updated = [...stData.team_ids];
                                                    updated[idx] = e.target.value;
                                                    setStData('team_ids', updated);
                                                }}
                                                className="w-full px-3 py-2 rounded-xl bg-surface-950/60 border border-surface-700 text-surface-200 text-xs focus:border-purple-500"
                                                required
                                            >
                                                <option value="">-- Pilih Sub-Tim {idx + 1} --</option>
                                                {allCoachTeams.map((t) => (
                                                    <option key={t.id} value={t.id}>
                                                        {t.name} ({t.region})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    ))
                                )}
                                {stErrors.team_ids && <p className="text-red-400 text-xs mt-1">{stErrors.team_ids}</p>}
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
                                    disabled={stProcessing || allCoachTeams.length < 3}
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
                message="Super Team ini akan dihapus. Ketiga sub-tim anggota tetap aman dan tidak akan terhapus."
            />
        </AuthenticatedLayout>
    );
}
