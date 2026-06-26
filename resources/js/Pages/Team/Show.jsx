import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';

export default function TeamShow({ team }) {
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    
    const { data, setData, post, processing, errors, reset } = useForm({
        file: null,
    });

    const handleImportSubmit = (e) => {
        e.preventDefault();
        if (!data.file) return;

        post(route('teams.import-athletes', team.id), {
            onSuccess: () => {
                setIsImportModalOpen(false);
                reset();
            },
            preserveScroll: true
        });
    };

    const positionColors = {
        'Tekong': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        'Feeder': 'bg-primary-500/20 text-primary-300 border-primary-500/30',
        'Killer': 'bg-red-500/20 text-red-300 border-red-500/30',
        'Cadangan': 'bg-surface-600/30 text-surface-300 border-surface-500/30',
    };

    return (
        <AuthenticatedLayout header={team.name}>
            <Head title={team.name} />

            <div className="mb-4">
                <Link href={route('teams.index')} className="text-sm text-surface-500 hover:text-surface-300 transition-colors flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    Kembali
                </Link>
            </div>

            {/* Team Header */}
            <div className="rounded-xl border border-surface-700/50 bg-gradient-to-r from-surface-900/80 to-surface-800/50 backdrop-blur-sm p-6 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500/30 to-primary-600/20 flex items-center justify-center text-2xl font-bold text-primary-300 shrink-0">
                            {team.name.charAt(0)}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-surface-100">{team.name}</h1>
                            <div className="flex flex-wrap gap-3 text-sm text-surface-400 mt-1">
                                <span>📍 {team.region}</span>
                                {team.coach && <span>🧑‍🏫 {team.coach.name}</span>}
                                <span>🏃 {team.athletes?.length || 0} atlet</span>
                            </div>
                        </div>
                    </div>
                    <Link
                        href={route('teams.edit', team.id)}
                        className="px-4 py-2 rounded-xl text-sm font-medium text-surface-300 bg-surface-800 border border-surface-700 hover:bg-surface-700 transition-colors self-start"
                    >
                        ✏️ Edit Tim
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Athletes Table */}
                <div className="lg:col-span-2 rounded-xl border border-surface-700/50 bg-surface-900/50 overflow-hidden">
                    <div className="px-5 py-4 border-b border-surface-700/50 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-surface-100">🏃 Daftar Atlet</h2>
                        <button
                            onClick={() => setIsImportModalOpen(true)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-emerald-650 hover:bg-emerald-600 border border-emerald-500/20 text-white transition-all flex items-center gap-1 font-semibold"
                        >
                            📥 Import Atlet (CSV)
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-surface-700/30">
                                    <th className="px-5 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">No.</th>
                                    <th className="px-5 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Nama</th>
                                    <th className="px-5 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Posisi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-700/20">
                                {team.athletes?.map((athlete) => (
                                    <tr key={athlete.id} className="hover:bg-surface-800/50 transition-colors">
                                        <td className="px-5 py-3">
                                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent-500/30 to-accent-600/20 flex items-center justify-center text-sm font-bold text-accent-300">
                                                {athlete.jersey_number}
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-sm font-medium text-surface-200">{athlete.name}</td>
                                        <td className="px-5 py-3">
                                            {athlete.position ? (
                                                <span className={`inline-block text-xs px-2 py-0.5 rounded-full border ${positionColors[athlete.position] || 'bg-surface-600/30 text-surface-300 border-surface-500/30'}`}>
                                                    {athlete.position}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-surface-600">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {(!team.athletes || team.athletes.length === 0) && (
                        <div className="text-center py-10">
                            <p className="text-surface-500 text-sm">Belum ada atlet</p>
                        </div>
                    )}
                </div>

                {/* Tournaments */}
                <div className="rounded-xl border border-surface-700/50 bg-surface-900/50 overflow-hidden h-fit">
                    <div className="px-5 py-4 border-b border-surface-700/50">
                        <h2 className="text-lg font-semibold text-surface-100">🏆 Turnamen</h2>
                    </div>
                    <div className="p-5">
                        {(!team.tournaments || team.tournaments.length === 0) ? (
                            <p className="text-sm text-surface-500 text-center py-4">Belum terdaftar di turnamen</p>
                        ) : (
                            <div className="space-y-2">
                                {team.tournaments.map((t) => (
                                    <Link
                                        key={t.id}
                                        href={route('tournaments.show', t.id)}
                                        className="block px-3 py-2.5 rounded-lg bg-surface-800/50 border border-surface-700/30 hover:border-primary-500/30 transition-colors"
                                    >
                                        <p className="text-sm font-medium text-surface-200">{t.name}</p>
                                        <p className="text-xs text-surface-500 mt-0.5">
                                            Terdaftar {new Date(t.pivot?.registered_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </p>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* Import Modal */}
            {isImportModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-surface-900 border border-surface-700/60 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-surface-800 flex items-center justify-between bg-surface-950/20">
                            <h3 className="text-base font-semibold text-surface-100">
                                📥 Import Atlet dari CSV
                            </h3>
                            <button
                                onClick={() => setIsImportModalOpen(false)}
                                className="text-surface-500 hover:text-surface-300 p-1 rounded-lg hover:bg-surface-800 transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleImportSubmit} className="p-6 space-y-4">
                            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 text-xs border border-blue-500/20 leading-relaxed">
                                <p className="font-bold mb-1">💡 Petunjuk Format CSV:</p>
                                <ul className="list-disc list-inside space-y-1 text-[11px]">
                                    <li>Format file harus berakhiran <strong>.csv</strong></li>
                                    <li>Gunakan template resmi dari Dashboard Pelatih.</li>
                                    <li>Baris pertama wajib header: <strong>nama, nomor_punggung, posisi</strong>.</li>
                                    <li>Pilihan posisi: Tekong, Feeder, Killer, Cadangan.</li>
                                </ul>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-surface-400 mb-1.5">
                                    Pilih File CSV
                                </label>
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={(e) => setData('file', e.target.files[0])}
                                    className="w-full text-sm text-surface-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-surface-800 file:text-surface-200 hover:file:bg-surface-700 file:cursor-pointer bg-surface-950/40 p-2.5 rounded-xl border border-surface-700/60"
                                    required
                                />
                                {errors.file && <p className="text-red-400 text-xs mt-1">{errors.file}</p>}
                            </div>

                            {/* Modal Footer Actions */}
                            <div className="pt-4 border-t border-surface-800 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsImportModalOpen(false);
                                        reset();
                                    }}
                                    className="px-4 py-2.5 rounded-xl border border-surface-700 text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-all text-sm font-medium"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing || !data.file}
                                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {processing ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            Mengimpor...
                                        </>
                                    ) : (
                                        'Mulai Import'
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
