import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import StatusBadge from '@/Components/StatusBadge';
import ConfirmDialog from '@/Components/ConfirmDialog';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { useState } from 'react';

export default function PoolIndex({ tournament }) {
    const [showGenerate, setShowGenerate] = useState(false);
    const [confirmGenMatches, setConfirmGenMatches] = useState(false);
    const generateForm = useForm({ pool_count: 2 });
    const assignForm = useForm({ team_id: '' });
    const genMatchesForm = useForm({});

    const assignedTeamIds = new Set();
    tournament.pools?.forEach(pool => {
        pool.teams?.forEach(team => assignedTeamIds.add(team.id));
    });
    const unassignedTeams = tournament.teams?.filter(t => !assignedTeamIds.has(t.id)) || [];

    // Check if pools have at least 2 teams (for generate matches button)
    const hasPoolsWithTeams = tournament.pools?.some(p => (p.teams?.length || 0) >= 2);

    const handleGenerate = (e) => {
        e.preventDefault();
        generateForm.post(route('pools.generate-random', tournament.id), {
            onSuccess: () => setShowGenerate(false),
        });
    };

    const handleAssign = (poolId) => {
        if (!assignForm.data.team_id) return;
        assignForm.post(route('pools.assign-team', poolId), {
            onSuccess: () => assignForm.reset('team_id'),
        });
    };

    const handleRemove = (poolId, teamId) => {
        router.delete(route('pools.remove-team', { pool: poolId, team: teamId }));
    };

    const handleGenerateMatches = () => {
        genMatchesForm.post(route('pools.generate-matches', tournament.id), {
            onSuccess: () => setConfirmGenMatches(false),
        });
    };

    return (
        <AuthenticatedLayout header={`Pool — ${tournament.name}`}>
            <Head title={`Pool — ${tournament.name}`} />

            <div className="mb-4">
                <Link href={route('tournaments.show', tournament.id)} className="text-sm text-surface-500 hover:text-surface-300 transition-colors flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    Kembali ke Turnamen
                </Link>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-surface-100">🏊 Manajemen Pool</h2>
                    <p className="text-sm text-surface-500 mt-1">{tournament.teams?.length || 0} tim terdaftar • {tournament.pools?.length || 0} pool</p>
                </div>
                <div className="flex items-center gap-2 self-start">
                    {hasPoolsWithTeams && (
                        <button
                            onClick={() => setConfirmGenMatches(true)}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors shadow-glow-primary"
                        >
                            ⚔️ Generate Pertandingan
                        </button>
                    )}
                    <button
                        onClick={() => setShowGenerate(!showGenerate)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-600 text-white text-sm font-semibold hover:bg-accent-700 transition-colors shadow-glow-accent"
                    >
                        🎲 Generate Acak
                    </button>
                </div>
            </div>

            {/* Random Generate Panel */}
            {showGenerate && (
                <div className="rounded-xl border border-accent-500/30 bg-accent-500/5 p-5 mb-6 animate-slide-up">
                    <h3 className="text-sm font-semibold text-accent-300 mb-3">🎲 Generate Pool Secara Acak</h3>
                    <p className="text-xs text-surface-400 mb-4">Tim akan diacak dan dibagi rata ke dalam pool. Pool dan match pool sebelumnya akan dihapus.</p>
                    <form onSubmit={handleGenerate} className="flex items-end gap-3">
                        <div>
                            <label className="block text-xs font-medium text-surface-400 mb-1">Jumlah Pool</label>
                            <input
                                type="number"
                                value={generateForm.data.pool_count}
                                onChange={(e) => generateForm.setData('pool_count', parseInt(e.target.value))}
                                min="2"
                                max="8"
                                className="w-24 px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-100 text-sm focus:border-accent-500 focus:ring-1 focus:ring-accent-500"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={generateForm.processing}
                            className="px-4 py-2 rounded-lg bg-accent-600 text-white text-sm font-semibold hover:bg-accent-700 disabled:opacity-50 transition-colors"
                        >
                            {generateForm.processing ? 'Generating...' : '🎲 Generate'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowGenerate(false)}
                            className="px-4 py-2 rounded-lg bg-surface-800 text-surface-400 text-sm hover:bg-surface-700 transition-colors"
                        >
                            Batal
                        </button>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Pools */}
                <div className="lg:col-span-2">
                    {(!tournament.pools || tournament.pools.length === 0) ? (
                        <div className="text-center py-16 rounded-xl border border-dashed border-surface-700/50">
                            <div className="text-5xl mb-4">🏊</div>
                            <p className="text-surface-400 text-sm">Belum ada pool</p>
                            <p className="text-surface-500 text-xs mt-1">Gunakan tombol "Generate Acak" untuk membuat pool otomatis</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {tournament.pools.map((pool) => (
                                <div key={pool.id} className="rounded-xl border border-surface-700/50 bg-surface-900/50 overflow-hidden">
                                    <div className="px-5 py-3 border-b border-surface-700/50 bg-surface-800/30 flex items-center justify-between">
                                        <h3 className="text-sm font-bold text-accent-300">Pool {pool.name}</h3>
                                        <span className="text-xs text-surface-500">{pool.teams?.length || 0} tim</span>
                                    </div>

                                    {/* Teams in pool */}
                                    <div className="p-3 space-y-2">
                                        {pool.teams?.map((team) => (
                                            <div key={team.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-800/50 group">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-lg bg-primary-500/20 flex items-center justify-center text-xs font-bold text-primary-300">
                                                        {team.name.charAt(0)}
                                                    </div>
                                                    <span className="text-sm text-surface-300">{team.name}</span>
                                                </div>
                                                <button
                                                    onClick={() => handleRemove(pool.id, team.id)}
                                                    className="p-1 rounded text-surface-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                                    title="Hapus dari pool"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Add team to pool */}
                                    {unassignedTeams.length > 0 && (
                                        <div className="px-3 pb-3">
                                            <div className="flex gap-2">
                                                <select
                                                    value={assignForm.data.team_id}
                                                    onChange={(e) => assignForm.setData('team_id', e.target.value)}
                                                    className="flex-1 px-2 py-1.5 rounded-lg bg-surface-800 border border-surface-700 text-surface-300 text-xs focus:border-primary-500"
                                                >
                                                    <option value="">+ Tambah tim...</option>
                                                    {unassignedTeams.map((t) => (
                                                        <option key={t.id} value={t.id}>{t.name}</option>
                                                    ))}
                                                </select>
                                                <button
                                                    onClick={() => handleAssign(pool.id)}
                                                    disabled={!assignForm.data.team_id}
                                                    className="px-3 py-1.5 rounded-lg bg-primary-600 text-white text-xs font-semibold hover:bg-primary-700 disabled:opacity-30 transition-colors"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Standings */}
                                    {pool.standings?.length > 0 && (
                                        <div className="border-t border-surface-700/30">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="text-[10px] text-surface-500 uppercase">
                                                        <th className="px-3 py-1.5">#</th>
                                                        <th className="px-3 py-1.5">Tim</th>
                                                        <th className="px-3 py-1.5 text-center">W</th>
                                                        <th className="px-3 py-1.5 text-center">L</th>
                                                        <th className="px-3 py-1.5 text-center">Pts</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-surface-700/20">
                                                    {pool.standings.map((s, i) => (
                                                        <tr key={s.id} className={i < 2 ? 'bg-primary-500/5' : ''}>
                                                            <td className="px-3 py-1.5 text-xs text-surface-400">{s.rank || i + 1}</td>
                                                            <td className="px-3 py-1.5 text-xs text-surface-300 font-medium">{s.team?.name}</td>
                                                            <td className="px-3 py-1.5 text-xs text-primary-400 text-center">{s.won}</td>
                                                            <td className="px-3 py-1.5 text-xs text-red-400 text-center">{s.lost}</td>
                                                            <td className="px-3 py-1.5 text-xs text-surface-300 text-center">{s.points_for}-{s.points_against}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Unassigned Teams Sidebar */}
                <div className="rounded-xl border border-surface-700/50 bg-surface-900/50 overflow-hidden h-fit">
                    <div className="px-5 py-4 border-b border-surface-700/50">
                        <h3 className="text-sm font-semibold text-surface-200">📋 Tim Belum Masuk Pool</h3>
                    </div>
                    <div className="p-4">
                        {unassignedTeams.length === 0 ? (
                            <div className="text-center py-6">
                                <p className="text-xs text-surface-500">Semua tim sudah masuk pool ✅</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {unassignedTeams.map((team) => (
                                    <div key={team.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-800/50 border border-surface-700/30">
                                        <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center text-xs font-bold text-amber-300">
                                            {team.name.charAt(0)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm text-surface-300 truncate">{team.name}</p>
                                            <p className="text-[10px] text-surface-500">{team.region}</p>
                                        </div>
                                    </div>
                                ))}
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
        </AuthenticatedLayout>
    );
}
