import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Pagination from '@/Components/Pagination';
import ConfirmDialog from '@/Components/ConfirmDialog';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

export default function TeamIndex({ teams }) {
    const [deleting, setDeleting] = useState(null);

    const handleDelete = () => {
        router.delete(route('teams.destroy', deleting), {
            onFinish: () => setDeleting(null),
        });
    };

    return (
        <AuthenticatedLayout header="Manajemen Tim">
            <Head title="Tim" />

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-surface-100">👥 Daftar Tim</h2>
                    <p className="text-sm text-surface-500 mt-1">Kelola tim dan atlet sepak takraw</p>
                </div>
                <Link
                    href={route('teams.create')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors shadow-glow-primary"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Daftarkan Tim
                </Link>
            </div>

            {/* Team Cards Grid */}
            {teams.data.length === 0 ? (
                <div className="text-center py-16 rounded-xl border border-dashed border-surface-700/50">
                    <div className="text-5xl mb-4">👥</div>
                    <p className="text-surface-400 text-sm">Belum ada tim terdaftar</p>
                    <Link href={route('teams.create')} className="inline-block mt-4 text-sm text-primary-400 hover:text-primary-300">
                        Daftarkan tim pertama →
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
                    {teams.data.map((team) => (
                        <div
                            key={team.id}
                            className="rounded-xl border border-surface-700/50 bg-surface-900/50 backdrop-blur-sm overflow-hidden hover:border-primary-500/30 transition-all duration-200 group"
                        >
                            {/* Card Header */}
                            <div className="p-5">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/30 to-primary-600/20 flex items-center justify-center text-lg font-bold text-primary-300 shrink-0">
                                            {team.name.charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                            <Link href={route('teams.show', team.id)} className="text-base font-semibold text-surface-200 hover:text-primary-400 transition-colors truncate block">
                                                {team.name}
                                            </Link>
                                            <p className="text-xs text-surface-500">📍 {team.region}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <Link
                                            href={route('teams.edit', team.id)}
                                            className="p-1.5 rounded-lg text-surface-500 hover:text-accent-400 hover:bg-surface-800 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </Link>
                                        <button
                                            onClick={() => setDeleting(team.id)}
                                            className="p-1.5 rounded-lg text-surface-500 hover:text-red-400 hover:bg-surface-800 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {/* Coach */}
                                {team.coach && (
                                    <div className="mt-3 flex items-center gap-2 text-xs text-surface-500">
                                        <span>🧑‍🏫</span>
                                        <span>{team.coach.name}</span>
                                    </div>
                                )}
                            </div>

                            {/* Athletes Preview */}
                            <div className="px-5 py-3 bg-surface-800/30 border-t border-surface-700/30">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs text-surface-500">Atlet:</span>
                                        <div className="flex -space-x-1">
                                            {(team.athletes || []).slice(0, 4).map((a) => (
                                                <div key={a.id} className="w-6 h-6 rounded-full bg-surface-700 border border-surface-600 flex items-center justify-center text-[10px] font-bold text-surface-300" title={a.name}>
                                                    {a.jersey_number}
                                                </div>
                                            ))}
                                            {(team.athletes_count || team.athletes?.length || 0) > 4 && (
                                                <div className="w-6 h-6 rounded-full bg-surface-700 border border-surface-600 flex items-center justify-center text-[10px] text-surface-400">
                                                    +{(team.athletes_count || team.athletes?.length || 0) - 4}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-xs font-medium text-surface-400">
                                        {team.athletes_count || team.athletes?.length || 0} pemain
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Pagination links={teams.links} />

            <ConfirmDialog
                isOpen={deleting !== null}
                onClose={() => setDeleting(null)}
                onConfirm={handleDelete}
                title="Hapus Tim"
                message="Tim beserta seluruh data atlet akan dihapus secara permanen."
            />
        </AuthenticatedLayout>
    );
}
