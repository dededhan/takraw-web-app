import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Pagination from '@/Components/Pagination';
import StatusBadge from '@/Components/StatusBadge';
import ConfirmDialog from '@/Components/ConfirmDialog';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

export default function TournamentIndex({ tournaments }) {
    const [deleting, setDeleting] = useState(null);

    const handleDelete = () => {
        router.delete(route('tournaments.destroy', deleting), {
            onFinish: () => setDeleting(null),
        });
    };

    const modeLabels = { regu: 'Regu (3v3)', double: 'Double (2v2)', quarter: 'Quarter (4v4)' };

    return (
        <AuthenticatedLayout header="Manajemen Turnamen">
            <Head title="Turnamen" />

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-surface-100">🏆 Daftar Turnamen</h2>
                    <p className="text-sm text-surface-500 mt-1">Kelola semua turnamen sepak takraw</p>
                </div>
                <Link
                    href={route('tournaments.create')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors shadow-glow-primary"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Buat Turnamen
                </Link>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-surface-700/50 bg-surface-900/50 backdrop-blur-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-surface-700/50">
                                <th className="px-5 py-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">Nama Turnamen</th>
                                <th className="px-5 py-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">Tanggal</th>
                                <th className="px-5 py-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">Mode</th>
                                <th className="px-5 py-4 text-xs font-semibold text-surface-400 uppercase tracking-wider text-center">Tim</th>
                                <th className="px-5 py-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">Status</th>
                                <th className="px-5 py-4 text-xs font-semibold text-surface-400 uppercase tracking-wider text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-700/30">
                            {tournaments.data.map((t) => (
                                <tr key={t.id} className="hover:bg-surface-800/50 transition-colors">
                                    <td className="px-5 py-4">
                                        <Link href={route('tournaments.show', t.id)} className="text-sm font-medium text-surface-200 hover:text-primary-400 transition-colors">
                                            {t.name}
                                        </Link>
                                        {t.creator && (
                                            <p className="text-xs text-surface-500 mt-0.5">oleh {t.creator.name}</p>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 text-sm text-surface-400 whitespace-nowrap">
                                        {new Date(t.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                        {' – '}
                                        {new Date(t.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className="text-xs px-2 py-1 rounded-lg bg-surface-800 text-surface-300 border border-surface-700">
                                            {modeLabels[t.mode] || t.mode}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-center">
                                        <span className="text-sm font-semibold text-surface-200">{t.teams_count ?? 0}</span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <StatusBadge status={t.status} />
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Link
                                                href={route('tournaments.show', t.id)}
                                                className="p-2 rounded-lg text-surface-400 hover:text-primary-400 hover:bg-surface-800 transition-colors"
                                                title="Lihat"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            </Link>
                                            <Link
                                                href={route('tournaments.edit', t.id)}
                                                className="p-2 rounded-lg text-surface-400 hover:text-accent-400 hover:bg-surface-800 transition-colors"
                                                title="Edit"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </Link>
                                            <button
                                                onClick={() => setDeleting(t.id)}
                                                className="p-2 rounded-lg text-surface-400 hover:text-red-400 hover:bg-surface-800 transition-colors"
                                                title="Hapus"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {tournaments.data.length === 0 && (
                    <div className="text-center py-16">
                        <div className="text-5xl mb-4">🏆</div>
                        <p className="text-surface-400 text-sm">Belum ada turnamen</p>
                        <Link
                            href={route('tournaments.create')}
                            className="inline-block mt-4 text-sm text-primary-400 hover:text-primary-300"
                        >
                            Buat turnamen pertama →
                        </Link>
                    </div>
                )}

                <Pagination links={tournaments.links} className="py-4 border-t border-surface-700/50" />
            </div>

            <ConfirmDialog
                isOpen={deleting !== null}
                onClose={() => setDeleting(null)}
                onConfirm={handleDelete}
                title="Hapus Turnamen"
                message="Data turnamen beserta pool, pertandingan, dan statistik akan dihapus secara permanen."
            />
        </AuthenticatedLayout>
    );
}
