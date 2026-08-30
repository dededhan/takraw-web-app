import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { useState } from 'react';

export default function TournamentAvailable({ tournaments = [], myTeams = [], mySuperTeams = [] }) {
    const [selectedTournament, setSelectedTournament] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showKey, setShowKey] = useState(false);

    const isSuperTeamMode = (mode) => ['team_regu', 'team_double'].includes(mode);

    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        team_id: '',
        super_team_id: '',
        registration_code: '',
    });

    const openRegisterModal = (tournament) => {
        clearErrors();
        setSelectedTournament(tournament);

        if (isSuperTeamMode(tournament.mode)) {
            const registeredStIds = (tournament.superTeams || []).map(st => st.id);
            const availableSt = mySuperTeams.filter(st => st.match_mode === tournament.mode && !registeredStIds.includes(st.id));
            setData({
                team_id: '',
                super_team_id: availableSt.length > 0 ? availableSt[0].id.toString() : '',
                registration_code: '',
            });
        } else {
            const registeredIds = (tournament.teams || []).map(t => t.id);
            const available = myTeams.filter(t => !registeredIds.includes(t.id));
            setData({
                team_id: available.length > 0 ? available[0].id.toString() : '',
                super_team_id: '',
                registration_code: '',
            });
        }

        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedTournament(null);
        reset();
    };

    const handleRegister = (e) => {
        e.preventDefault();
        if (!selectedTournament) return;

        if (isSuperTeamMode(selectedTournament.mode)) {
            if (!data.super_team_id) return;
            post(route('coach.tournaments.register-super-team', selectedTournament.id), {
                onSuccess: () => closeModal(),
            });
        } else {
            if (!data.team_id) return;
            post(route('coach.tournaments.register', selectedTournament.id), {
                onSuccess: () => closeModal(),
            });
        }
    };

    const handleUnregisterTeam = (tournamentId, teamId, teamName) => {
        if (confirm(`Apakah Anda yakin ingin membatalkan pendaftaran tim "${teamName}" dari turnamen ini?`)) {
            router.delete(route('coach.tournaments.unregister', [tournamentId, teamId]), {
                preserveScroll: true,
            });
        }
    };

    const handleUnregisterSuperTeam = (tournamentId, superTeamId, superTeamName) => {
        if (confirm(`Apakah Anda yakin ingin membatalkan pendaftaran Super Team "${superTeamName}" dari turnamen ini?`)) {
            router.delete(route('coach.tournaments.unregister-super-team', [tournamentId, superTeamId]), {
                preserveScroll: true,
            });
        }
    };

    const formatTournamentMode = (mode) => {
        switch (mode) {
            case 'regu': return 'Regu (3 vs 3)';
            case 'double': return 'Double (2 vs 2)';
            case 'quadrant': return 'Quadrant (4 vs 4)';
            case 'team_regu': return 'Team Regu (Super Team 3x3)';
            case 'team_double': return 'Team Double (Super Team 3x2)';
            default: return mode;
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        <AuthenticatedLayout header="Turnamen Yang Tersedia">
            <Head title="Turnamen Tersedia" />

            {/* Header Banner */}
            <div className="mb-8 p-6 rounded-2xl border border-blue-500/20 bg-gradient-to-r from-blue-500/10 via-surface-900/40 to-transparent">
                <h2 className="text-base font-bold text-blue-300 flex items-center gap-2">
                    <span>📢 Informasi Pendaftaran Turnamen</span>
                </h2>
                <p className="text-xs text-surface-400 mt-1 max-w-3xl leading-relaxed">
                    Daftar kejuaraan yang sedang membuka pendaftaran (*Registration*). Anda dapat mendaftarkan Tim Reguler atau Super Team binaan Anda sebelum masa pendaftaran ditutup oleh Admin.
                </p>
            </div>

            {tournaments.length === 0 ? (
                <div className="rounded-2xl border border-surface-700/50 bg-surface-900/30 p-14 text-center">
                    <div className="text-5xl mb-4">🏆</div>
                    <h3 className="text-base font-bold text-surface-200">Tidak Ada Turnamen Tersedia</h3>
                    <p className="text-xs text-surface-500 mt-1 max-w-sm mx-auto">
                        Saat ini tidak ada turnamen dengan status registrasi yang aktif. Silakan cek kembali nanti atau hubungi Admin.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tournaments.map((tournament) => {
                        const isSuper = isSuperTeamMode(tournament.mode);
                        const registeredTeams = tournament.teams || [];
                        const registeredSuperTeams = tournament.superTeams || [];

                        const hasAvailable = isSuper
                            ? mySuperTeams.some(st => st.match_mode === tournament.mode && !registeredSuperTeams.some(r => r.id === st.id))
                            : myTeams.some(t => !registeredTeams.some(r => r.id === t.id));

                        return (
                            <div
                                key={tournament.id}
                                className="rounded-2xl border border-surface-700/50 bg-surface-900/60 backdrop-blur-sm p-5 flex flex-col justify-between hover:border-primary-500/40 transition-all duration-200 shadow-lg group"
                            >
                                <div>
                                    {/* Card Header Badges */}
                                    <div className="flex items-start justify-between gap-2 mb-3 flex-wrap">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                📝 Registrasi
                                            </span>
                                            {tournament.has_registration_code ? (
                                                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                                    🔐 Butuh Kunci
                                                </span>
                                            ) : (
                                                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-surface-800 text-surface-400 border border-surface-700">
                                                    🔓 Terbuka
                                                </span>
                                            )}
                                        </div>

                                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-lg border ${
                                            isSuper ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-surface-800 text-surface-300 border-surface-700'
                                        }`}>
                                            {formatTournamentMode(tournament.mode)}
                                        </span>
                                    </div>

                                    {/* Tournament Title */}
                                    <h3 className="text-base font-bold text-surface-100 group-hover:text-primary-300 transition-colors line-clamp-2">
                                        {tournament.name}
                                    </h3>

                                    {/* Dates */}
                                    <div className="mt-3 text-xs text-surface-400 flex flex-col gap-1 bg-surface-950/40 p-2.5 rounded-xl border border-surface-850">
                                        <div className="flex justify-between">
                                            <span className="text-surface-500">Mulai:</span>
                                            <span className="font-semibold text-surface-300">📅 {formatDate(tournament.start_date)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-surface-500">Selesai:</span>
                                            <span className="font-semibold text-surface-300">🏁 {formatDate(tournament.end_date)}</span>
                                        </div>
                                    </div>

                                    {/* Registered Teams / Super Teams List */}
                                    <div className="mt-4 pt-3 border-t border-surface-800">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-surface-400 mb-2 flex items-center justify-between">
                                            <span>👥 Tim Anda Terdaftar:</span>
                                            <span className="text-primary-400 font-mono">
                                                {isSuper ? registeredSuperTeams.length : registeredTeams.length}
                                            </span>
                                        </h4>

                                        {isSuper ? (
                                            registeredSuperTeams.length === 0 ? (
                                                <p className="text-xs text-surface-500 italic py-1">Belum ada Super Team Anda yang terdaftar.</p>
                                            ) : (
                                                <div className="space-y-1.5">
                                                    {registeredSuperTeams.map((st) => (
                                                        <div key={st.id} className="flex items-center justify-between p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs">
                                                            <span className="font-bold text-purple-200 truncate">{st.name}</span>
                                                            <button
                                                                onClick={() => handleUnregisterSuperTeam(tournament.id, st.id, st.name)}
                                                                className="text-[10px] px-2 py-0.5 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 cursor-pointer"
                                                            >
                                                                ✕ Batal
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )
                                        ) : (
                                            registeredTeams.length === 0 ? (
                                                <p className="text-xs text-surface-500 italic py-1">Belum ada tim Anda yang terdaftar.</p>
                                            ) : (
                                                <div className="space-y-1.5">
                                                    {registeredTeams.map((team) => (
                                                        <div key={team.id} className="flex items-center justify-between p-2 rounded-xl bg-surface-950/40 border border-surface-800 text-xs">
                                                            <span className="font-semibold text-surface-200 truncate">{team.name}</span>
                                                            <button
                                                                onClick={() => handleUnregisterTeam(tournament.id, team.id, team.name)}
                                                                className="text-[10px] px-2 py-0.5 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 cursor-pointer"
                                                            >
                                                                ✕ Batal
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>

                                {/* Register Button */}
                                <div className="mt-5 pt-3 border-t border-surface-800">
                                    <button
                                        onClick={() => openRegisterModal(tournament)}
                                        disabled={!hasAvailable}
                                        className="w-full py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer"
                                    >
                                        {hasAvailable ? (
                                            tournament.has_registration_code ? '🔐 Ikuti Turnamen (Perlu Kunci)' : '🏆 Ikuti Turnamen'
                                        ) : (
                                            '✓ Semua Tim Sudah Terdaftar'
                                        )}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Registration Modal */}
            {isModalOpen && selectedTournament && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-md bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-surface-800 flex items-center justify-between bg-surface-950/30">
                            <h3 className="text-base font-bold text-surface-100 flex items-center gap-2">
                                <span>🏆 Pendaftaran Turnamen</span>
                            </h3>
                            <button
                                onClick={closeModal}
                                className="text-surface-400 hover:text-surface-200 p-1 rounded-lg hover:bg-surface-800 transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleRegister} className="p-6 space-y-4">
                            <div>
                                <h4 className="text-sm font-bold text-surface-200">{selectedTournament.name}</h4>
                                <p className="text-xs text-surface-400 mt-0.5">
                                    Kategori: <strong className="text-primary-300">{formatTournamentMode(selectedTournament.mode)}</strong>
                                </p>
                            </div>

                            {/* Pick Team or Super Team */}
                            {isSuperTeamMode(selectedTournament.mode) ? (
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-purple-300 mb-1.5">
                                        Pilih Super Team Anda <span className="text-red-400">*</span>
                                    </label>
                                    <select
                                        value={data.super_team_id}
                                        onChange={(e) => setData('super_team_id', e.target.value)}
                                        className="w-full px-3.5 py-2.5 rounded-xl bg-surface-950/60 border border-surface-700 text-surface-100 text-xs focus:border-purple-500"
                                        required
                                    >
                                        <option value="">-- Pilih Super Team --</option>
                                        {mySuperTeams
                                            .filter(st => st.match_mode === selectedTournament.mode && !(selectedTournament.superTeams || []).some(r => r.id === st.id))
                                            .map((st) => (
                                                <option key={st.id} value={st.id}>
                                                    {st.name} ({st.members?.length || 0}/3 Sub-Tim)
                                                </option>
                                            ))}
                                    </select>
                                    {errors.super_team_id && <p className="text-red-400 text-xs mt-1">{errors.super_team_id}</p>}
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-surface-300 mb-1.5">
                                        Pilih Tim Binaan <span className="text-red-400">*</span>
                                    </label>
                                    <select
                                        value={data.team_id}
                                        onChange={(e) => setData('team_id', e.target.value)}
                                        className="w-full px-3.5 py-2.5 rounded-xl bg-surface-950/60 border border-surface-700 text-surface-100 text-xs focus:border-primary-500"
                                        required
                                    >
                                        <option value="">-- Pilih Tim --</option>
                                        {myTeams
                                            .filter(t => !(selectedTournament.teams || []).some(r => r.id === t.id))
                                            .map((t) => (
                                                <option key={t.id} value={t.id}>
                                                    {t.name} ({t.region})
                                                </option>
                                            ))}
                                    </select>
                                    {errors.team_id && <p className="text-red-400 text-xs mt-1">{errors.team_id}</p>}
                                </div>
                            )}

                            {/* Registration Code Input if Protected */}
                            {selectedTournament.has_registration_code && (
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-amber-300 mb-1.5 flex items-center justify-between">
                                        <span>🔐 Kunci Pendaftaran Turnamen <span className="text-red-400">*</span></span>
                                        <button
                                            type="button"
                                            onClick={() => setShowKey(!showKey)}
                                            className="text-[10px] text-surface-400 hover:text-surface-200 lowercase font-normal"
                                        >
                                            {showKey ? 'sembunyikan' : 'tampilkan'}
                                        </button>
                                    </label>
                                    <input
                                        type={showKey ? 'text' : 'password'}
                                        value={data.registration_code}
                                        onChange={(e) => setData('registration_code', e.target.value)}
                                        placeholder="Masukkan kunci yang diberikan Admin"
                                        className="w-full px-3.5 py-2.5 rounded-xl bg-surface-950/60 border border-amber-500/40 text-amber-200 placeholder-surface-600 text-xs focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                                        required
                                    />
                                    {errors.registration_code && (
                                        <p className="text-red-400 text-xs mt-1">{errors.registration_code}</p>
                                    )}
                                </div>
                            )}

                            <div className="pt-4 border-t border-surface-800 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 rounded-xl border border-surface-700 text-surface-400 text-xs font-semibold hover:bg-surface-800"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold shadow-md disabled:opacity-50 cursor-pointer"
                                >
                                    {processing ? 'Mendaftarkan...' : 'Daftarkan Sekarang'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
