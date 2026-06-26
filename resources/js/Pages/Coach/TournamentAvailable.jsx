import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { useState } from 'react';

export default function TournamentAvailable({ tournaments, myTeams }) {
    const [selectedTournament, setSelectedTournament] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        team_id: '',
    });

    const openRegisterModal = (tournament) => {
        clearErrors();
        setSelectedTournament(tournament);
        
        // Find teams that are NOT registered yet in this tournament
        const registeredIds = tournament.teams.map(t => t.id);
        const available = myTeams.filter(t => !registeredIds.includes(t.id));
        
        // Auto-select the first available team if any
        setData('team_id', available.length > 0 ? available[0].id.toString() : '');
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedTournament(null);
        reset();
    };

    const handleRegister = (e) => {
        e.preventDefault();
        if (!data.team_id) return;
        
        post(route('coach.tournaments.register', selectedTournament.id), {
            onSuccess: () => {
                closeModal();
            },
        });
    };

    const handleUnregister = (tournamentId, teamId, teamName) => {
        if (confirm(`Apakah Anda yakin ingin membatalkan pendaftaran tim "${teamName}" dari turnamen ini?`)) {
            router.delete(route('coach.tournaments.unregister', [tournamentId, teamId]), {
                preserveScroll: true,
            });
        }
    };

    // Helper to filter available teams for the modal
    const getAvailableTeamsForSelected = () => {
        if (!selectedTournament) return [];
        const registeredIds = selectedTournament.teams.map(t => t.id);
        return myTeams.filter(t => !registeredIds.includes(t.id));
    };

    const formatTournamentMode = (mode) => {
        switch (mode) {
            case 'regu': return 'Regu (3 vs 3)';
            case 'double': return 'Double (2 vs 2)';
            case 'quarter': return 'Quarter (4 vs 4)';
            default: return mode;
        }
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        <AuthenticatedLayout header="Turnamen Yang Tersedia">
            <Head title="Turnamen Tersedia" />

            {/* Header Description */}
            <div className="mb-8 p-5 rounded-2xl border border-blue-500/20 bg-gradient-to-r from-blue-500/10 to-transparent">
                <h2 className="text-base font-semibold text-blue-300 flex items-center gap-2">
                    📢 Informasi Pendaftaran Turnamen
                </h2>
                <p className="text-sm text-surface-400 mt-1 max-w-3xl">
                    Berikut adalah daftar turnamen yang sedang dalam masa pendaftaran (*Registration*). Anda dapat mendaftarkan tim binaan Anda atau membatalkan keikutsertaan sebelum masa pendaftaran ditutup oleh Admin.
                </p>
            </div>

            {tournaments.length === 0 ? (
                <div className="rounded-xl border border-surface-700/50 bg-surface-900/30 p-12 text-center">
                    <div className="text-5xl mb-4">🏆</div>
                    <h3 className="text-lg font-semibold text-surface-200">Tidak Ada Turnamen Tersedia</h3>
                    <p className="text-sm text-surface-500 mt-1">
                        Saat ini tidak ada turnamen dengan status registrasi yang aktif. Hubungi Admin jika ada pertanyaan.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tournaments.map((tournament) => {
                        const registeredIds = tournament.teams.map(t => t.id);
                        const hasAvailableTeams = myTeams.some(t => !registeredIds.includes(t.id));
                        const isFullyRegistered = myTeams.length > 0 && registeredIds.length === myTeams.length;

                        return (
                            <div 
                                key={tournament.id} 
                                className="rounded-2xl border border-surface-700/50 bg-surface-900/50 backdrop-blur-sm p-5 flex flex-col justify-between hover:border-primary-500/30 transition-all duration-300 hover:shadow-glow-primary hover:-translate-y-1 group"
                            >
                                <div>
                                    {/* Card Header */}
                                    <div className="flex items-start justify-between gap-2 mb-4">
                                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                            📝 Registrasi
                                        </span>
                                        <span className="text-[11px] font-medium text-surface-400 bg-surface-800 px-2.5 py-1 rounded-lg">
                                            {formatTournamentMode(tournament.mode)}
                                        </span>
                                    </div>

                                    {/* Tournament Title */}
                                    <h3 className="text-lg font-bold text-surface-100 group-hover:text-primary-300 transition-colors line-clamp-2">
                                        {tournament.name}
                                    </h3>

                                    {/* Dates */}
                                    <div className="mt-3 text-xs text-surface-400 flex flex-col gap-1 font-mono bg-surface-950/20 p-2.5 rounded-xl border border-surface-850">
                                        <div className="flex justify-between">
                                            <span className="text-surface-500">Mulai:</span>
                                            <span>📅 {formatDate(tournament.start_date)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-surface-500">Selesai:</span>
                                            <span>🏁 {formatDate(tournament.end_date)}</span>
                                        </div>
                                    </div>

                                    {/* Registered Teams List */}
                                    <div className="mt-5 pt-4 border-t border-surface-800">
                                        <h4 className="text-xs font-semibold uppercase tracking-wider text-surface-500 mb-3 flex items-center gap-1.5">
                                            👥 Tim Anda Yang Terdaftar ({tournament.teams.length})
                                        </h4>
                                        {tournament.teams.length === 0 ? (
                                            <p className="text-xs text-surface-650 italic py-1">Belum ada tim Anda yang terdaftar.</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {tournament.teams.map((team) => (
                                                    <div 
                                                        key={team.id} 
                                                        className="flex items-center justify-between p-2.5 rounded-xl bg-surface-950/30 border border-surface-850 text-xs"
                                                    >
                                                        <div className="min-w-0">
                                                            <p className="font-semibold text-surface-200 truncate">{team.name}</p>
                                                            <p className="text-[10px] text-surface-500">{team.region}</p>
                                                        </div>
                                                        <button
                                                            onClick={() => handleUnregister(tournament.id, team.id, team.name)}
                                                            className="px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 font-medium transition-all text-[10px] flex items-center gap-0.5"
                                                            title="Batalkan Pendaftaran"
                                                        >
                                                            ✕ Batalkan
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Bottom Registration Action */}
                                <div className="mt-6">
                                    {myTeams.length === 0 ? (
                                        <div className="text-center p-3 rounded-xl bg-surface-950/40 text-xs text-surface-500">
                                            Silakan buat tim terlebih dahulu untuk berpartisipasi.
                                        </div>
                                    ) : isFullyRegistered ? (
                                        <div className="w-full py-2.5 rounded-xl bg-surface-800/40 text-surface-500 border border-surface-700/30 font-medium text-xs text-center flex items-center justify-center gap-1.5">
                                            ✓ Semua Tim Anda Terdaftar
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => openRegisterModal(tournament)}
                                            disabled={!hasAvailableTeams}
                                            className="w-full py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-medium text-xs transition-all duration-200 shadow-md shadow-primary-600/10 hover:shadow-primary-600/20 flex items-center justify-center gap-1.5"
                                        >
                                            🏆 Ikuti Turnamen
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Registration Modal */}
            {isModalOpen && selectedTournament && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-surface-900 border border-surface-700/60 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-surface-800 flex items-center justify-between bg-surface-950/20">
                            <h3 className="text-base font-semibold text-surface-100">
                                🏆 Daftarkan Tim Ikuti Turnamen
                            </h3>
                            <button
                                onClick={closeModal}
                                className="text-surface-500 hover:text-surface-300 p-1 rounded-lg hover:bg-surface-800 transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleRegister} className="p-6 space-y-4">
                            <div>
                                <h4 className="text-sm font-semibold text-surface-200 mb-1">{selectedTournament.name}</h4>
                                <p className="text-xs text-surface-500">Mode turnamen: {formatTournamentMode(selectedTournament.mode)}</p>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-surface-400 mb-1.5">
                                    Pilih Tim Anda
                                </label>
                                {getAvailableTeamsForSelected().length === 0 ? (
                                    <div className="p-3 rounded-xl bg-red-500/10 text-red-400 text-xs border border-red-500/20">
                                        Semua tim Anda sudah terdaftar di turnamen ini.
                                    </div>
                                ) : (
                                    <select
                                        value={data.team_id}
                                        onChange={(e) => setData('team_id', e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-surface-700/60 bg-surface-950/50 text-surface-200 focus:outline-none focus:border-primary-500 transition-colors text-sm"
                                        required
                                    >
                                        {getAvailableTeamsForSelected().map((team) => (
                                            <option key={team.id} value={team.id} className="bg-surface-900 text-surface-200">
                                                {team.name} ({team.region} • {team.athletes?.length || 0} atlet)
                                            </option>
                                        ))}
                                    </select>
                                )}
                                {errors.team_id && <p className="text-red-400 text-xs mt-1">{errors.team_id}</p>}
                            </div>

                            {/* Modal Footer Actions */}
                            <div className="pt-4 border-t border-surface-800 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2.5 rounded-xl border border-surface-700 text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-all text-sm font-medium"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing || getAvailableTeamsForSelected().length === 0}
                                    className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-medium text-sm shadow-lg shadow-primary-600/20 hover:shadow-primary-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {processing ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            Mendaftarkan...
                                        </>
                                    ) : (
                                        'Daftarkan Sekarang'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
