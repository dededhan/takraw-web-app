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
        'Smash': 'bg-red-500/20 text-red-300 border-red-500/30',
        'Killer': 'bg-red-500/20 text-red-300 border-red-500/30',
        'Cadangan': 'bg-surface-600/30 text-surface-300 border-surface-500/30',
    };

    return (
        <AuthenticatedLayout header={team.name}>
            <Head title={team.name} />

            <div className="mb-4">
                <Link href={route('teams.index')} className="text-sm text-surface-400 hover:text-surface-200 transition-colors flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    Kembali ke Daftar Tim
                </Link>
            </div>

            {/* Team Header */}
            <div className="rounded-2xl border border-surface-700/50 bg-gradient-to-r from-surface-900/80 to-surface-800/50 backdrop-blur-sm p-6 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500/30 to-primary-600/20 flex items-center justify-center text-2xl font-bold text-primary-300 shrink-0 border border-primary-500/30">
                            {team.name.charAt(0)}
                        </div>
                        <div>
                            <div className="flex items-center gap-2.5 flex-wrap">
                                <h1 className="text-2xl font-bold text-surface-100">{team.name}</h1>
                            </div>
                            <div className="flex flex-wrap gap-3 text-sm text-surface-400 mt-1.5">
                                <span>📍 {team.region}</span>
                                {team.coach && <span>🧑‍🏫 Pelatih: {team.coach.name}</span>}
                                <span>🏃 {team.athletes?.length || 0} atlet terdaftar</span>
                            </div>
                        </div>
                    </div>

                    <Link
                        href={route('teams.edit', team.id)}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-surface-200 bg-surface-800 border border-surface-700 hover:bg-surface-700 transition-colors self-start flex items-center gap-1.5 shadow-sm"
                    >
                        <span>✏️ Edit Tim</span>
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Athletes Table */}
                <div className="lg:col-span-2 rounded-2xl border border-surface-700/50 bg-surface-900/50 overflow-hidden shadow-lg">
                    <div className="px-5 py-4 border-b border-surface-700/50 flex items-center justify-between bg-surface-950/20">
                        <h2 className="text-base font-bold text-surface-100 flex items-center gap-2">
                            <span>🏃 Daftar Atlet ({team.athletes?.length || 0})</span>
                        </h2>

                        <button
                            onClick={() => setIsImportModalOpen(true)}
                            className="text-xs px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                        >
                            <span>📥 Import Atlet (.xlsx / .csv)</span>
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-surface-700/30 bg-surface-950/30">
                                    <th className="px-5 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">No.</th>
                                    <th className="px-5 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Nama Lengkap</th>
                                    <th className="px-5 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Posisi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-700/20">
                                {team.athletes?.map((athlete) => (
                                    <tr key={athlete.id} className="hover:bg-surface-800/40 transition-colors">
                                        <td className="px-5 py-3">
                                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-500/20 to-accent-600/10 flex items-center justify-center text-sm font-bold text-accent-300 border border-accent-500/20">
                                                {athlete.jersey_number}
                                            </div>
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-surface-700 flex items-center justify-center text-xs font-bold text-surface-400 overflow-hidden border border-surface-600 shrink-0">
                                                    {athlete.photo_url ? (
                                                        <img src={athlete.photo_url} alt={athlete.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span>{athlete.name?.charAt(0)?.toUpperCase() || '?'}</span>
                                                    )}
                                                </div>
                                                <span className="text-sm font-semibold text-surface-200">{athlete.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3">
                                            {athlete.position ? (
                                                <span className={`inline-block text-xs px-2.5 py-0.5 rounded-full border font-medium ${positionColors[athlete.position] || 'bg-surface-600/30 text-surface-300 border-surface-500/30'}`}>
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
                        <div className="text-center py-12 px-4">
                            <p className="text-surface-400 text-sm font-medium">Belum ada atlet terdaftar di tim ini</p>
                            {!team.is_locked && (
                                <button
                                    onClick={() => setIsImportModalOpen(true)}
                                    className="mt-3 text-xs text-primary-400 hover:text-primary-300 font-semibold"
                                >
                                    + Import atlet dari file Excel (.xlsx) →
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Tournaments Participation */}
                <div className="rounded-2xl border border-surface-700/50 bg-surface-900/50 overflow-hidden h-fit shadow-lg">
                    <div className="px-5 py-4 border-b border-surface-700/50 bg-surface-950/20">
                        <h2 className="text-base font-bold text-surface-100 flex items-center gap-2">
                            <span>🏆 Turnamen Diikuti</span>
                        </h2>
                    </div>
                    <div className="p-5">
                        {(!team.tournaments || team.tournaments.length === 0) ? (
                            <div className="text-center py-8 text-surface-400 text-xs">
                                <p className="text-2xl mb-2">📋</p>
                                <p>Belum pernah terdaftar di turnamen manapun.</p>
                                <p className="text-surface-500 mt-1">Roster tim masih dapat diedit secara bebas.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {team.tournaments.map((t) => (
                                    <Link
                                        key={t.id}
                                        href={route('tournaments.show', t.id)}
                                        className="block p-3.5 rounded-xl bg-surface-950/40 border border-surface-800 hover:border-primary-500/40 transition-all group"
                                    >
                                        <p className="text-sm font-bold text-surface-200 group-hover:text-primary-300 transition-colors">
                                            {t.name}
                                        </p>
                                        <p className="text-xs text-surface-500 mt-1">
                                            Terdaftar: {new Date(t.pivot?.registered_at || t.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-md bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl overflow-hidden">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-surface-800 flex items-center justify-between bg-surface-950/30">
                            <h3 className="text-base font-bold text-surface-100 flex items-center gap-2">
                                <span>📥 Import Atlet dari Excel / CSV</span>
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
                            <div className="p-3.5 rounded-xl bg-blue-500/10 text-blue-300 text-xs border border-blue-500/20 leading-relaxed">
                                <p className="font-bold mb-1.5">💡 Gunakan Template Resmi:</p>
                                <div className="flex items-center gap-2 mb-2">
                                    <a
                                        href={route('templates.athletes')}
                                        download="template_import_atlet.xlsx"
                                        className="text-primary-400 hover:underline font-bold text-[11px]"
                                    >
                                        📥 Template .xlsx
                                    </a>
                                    <span className="text-surface-600">•</span>
                                    <a
                                        href={route('templates.athletes-csv')}
                                        download="template_import_atlet.csv"
                                        className="text-primary-400 hover:underline font-bold text-[11px]"
                                    >
                                        📥 Template .csv
                                    </a>
                                </div>
                                <ul className="list-disc list-inside space-y-1 text-[11px] text-surface-400">
                                    <li>Mendukung file Excel <strong>.xlsx, .xls</strong> dan file <strong>.csv</strong></li>
                                    <li>Kolom wajib: <strong>Nama Lengkap</strong> dan <strong>Nomor Punggung</strong></li>
                                    <li>Posisi valid: <strong>Tekong, Feeder, Smash, Cadangan</strong></li>
                                    <li>Untuk CSV, gunakan template CSV di atas — jangan simpan template .xlsx sebagai .csv karena akan merusak format.</li>
                                </ul>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-surface-300 mb-1.5">
                                    Pilih File Excel / CSV
                                </label>
                                <input
                                    type="file"
                                    accept=".xlsx, .xls, .csv"
                                    onChange={(e) => setData('file', e.target.files[0])}
                                    className="w-full text-xs text-surface-300 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-surface-800 file:text-surface-200 hover:file:bg-surface-700 file:cursor-pointer bg-surface-950/60 p-2.5 rounded-xl border border-surface-700"
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
                                    className="px-4 py-2 rounded-xl border border-surface-700 text-surface-400 hover:text-surface-200 text-xs font-semibold"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing || !data.file}
                                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                                >
                                    {processing ? 'Memproses...' : '✨ Mulai Import Data'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
