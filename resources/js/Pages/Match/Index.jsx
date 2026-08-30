import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Pagination from '@/Components/Pagination';
import StatusBadge from '@/Components/StatusBadge';
import ConfirmDialog from '@/Components/ConfirmDialog';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';

export default function MatchIndex({ matches, tournaments, referees }) {
    const [filterTournament, setFilterTournament] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [assignModal, setAssignModal] = useState(null);
    const [scheduleModal, setScheduleModal] = useState(null);
    const [editModal, setEditModal] = useState(null);
    const [deleting, setDeleting] = useState(null);

    const applyFilter = () => {
        const params = {};
        if (filterTournament) params.tournament_id = filterTournament;
        if (filterStatus) params.status = filterStatus;
        router.get(route('matches.index'), params, { preserveState: true });
    };

    const handleDelete = () => {
        router.delete(route('matches.destroy', deleting), {
            onFinish: () => setDeleting(null),
        });
    };

    return (
        <AuthenticatedLayout header="Manajemen Pertandingan">
            <Head title="Pertandingan" />

            <div className="mb-6">
                <h2 className="text-2xl font-bold text-surface-100">⚔️ Pertandingan</h2>
                <p className="text-sm text-surface-500 mt-1">Kelola jadwal, wasit, dan status pertandingan</p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-6 p-4 rounded-xl bg-surface-900/50 border border-surface-700/50">
                <select
                    value={filterTournament}
                    onChange={(e) => setFilterTournament(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-300 text-sm focus:border-primary-500"
                >
                    <option value="">Semua Turnamen</option>
                    {tournaments?.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-300 text-sm focus:border-primary-500"
                >
                    <option value="">Semua Status</option>
                    <option value="scheduled">Dijadwalkan</option>
                    <option value="setup">Setup</option>
                    <option value="live">Live</option>
                    <option value="finished">Selesai</option>
                </select>
                <button
                    onClick={applyFilter}
                    className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
                >
                    🔍 Filter
                </button>
            </div>

            {/* Match List */}
            <div className="space-y-3">
                {matches.data.length === 0 ? (
                    <div className="text-center py-16 rounded-xl border border-dashed border-surface-700/50">
                        <div className="text-5xl mb-4">⚔️</div>
                        <p className="text-surface-400 text-sm">Tidak ada pertandingan ditemukan</p>
                    </div>
                ) : (
                    matches.data.map((match) => (
                        <div
                            key={match.id}
                            className="rounded-xl border border-surface-700/50 bg-surface-900/50 p-5 hover:border-surface-600/50 transition-all duration-200"
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                {/* Match Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                        <StatusBadge status={match.status} size="sm" />
                                        <StatusBadge status={match.stage} size="xs" />
                                        <span className="text-xs text-surface-500">{match.tournament?.name}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-sm font-semibold text-surface-200 flex-1 text-right">
                                            {match.home_team?.name || 'TBD'}
                                        </span>
                                        <div className="shrink-0">
                                            {match.status === 'finished' ? (
                                                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-800">
                                                    <span className="text-base font-bold text-primary-400">
                                                        {match.sets?.filter(s => s.winner_team_id === match.home_team_id).length}
                                                    </span>
                                                    <span className="text-xs text-surface-600">—</span>
                                                    <span className="text-base font-bold text-accent-400">
                                                        {match.sets?.filter(s => s.winner_team_id === match.away_team_id).length}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-surface-600 font-bold px-3 py-1 bg-surface-800 rounded-lg">VS</span>
                                            )}
                                        </div>
                                        <span className="text-sm font-semibold text-surface-200 flex-1">
                                            {match.away_team?.name || 'TBD'}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-surface-500">
                                        {match.referee && <span>🧑‍⚖️ {match.referee.name}</span>}
                                        {match.court_number && <span>📍 Lapangan {match.court_number}</span>}
                                        {match.scheduled_at && (
                                            <span>📅 {new Date(match.scheduled_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                                    {!match.referee_id && (
                                        <button
                                            onClick={() => setAssignModal(match)}
                                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-amber-300 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-colors"
                                        >
                                            🧑‍⚖️ Tugaskan Wasit
                                        </button>
                                    )}
                                    {!match.scheduled_at && (
                                        <button
                                            onClick={() => setScheduleModal(match)}
                                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-blue-300 bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 transition-colors"
                                        >
                                            📅 Jadwalkan
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setEditModal(match)}
                                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-primary-300 bg-primary-500/10 border border-primary-500/30 hover:bg-primary-500/20 transition-colors"
                                    >
                                        ✏️ Edit
                                    </button>
                                    {match.status === 'scheduled' && (
                                        <button
                                            onClick={() => setDeleting(match.id)}
                                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-300 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-colors"
                                        >
                                            🗑️ Hapus
                                        </button>
                                    )}
                                    <Link
                                        href={route('matches.show', match.id)}
                                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-surface-300 bg-surface-800 border border-surface-700 hover:bg-surface-700 transition-colors"
                                    >
                                        Detail →
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <Pagination links={matches.links} className="mt-6" />

            {/* Modals */}
            {assignModal && <AssignRefereeModal match={assignModal} referees={referees} onClose={() => setAssignModal(null)} />}
            {scheduleModal && <ScheduleModal match={scheduleModal} onClose={() => setScheduleModal(null)} />}
            {editModal && <EditMatchModal match={editModal} referees={referees} onClose={() => setEditModal(null)} />}

            <ConfirmDialog
                isOpen={deleting !== null}
                onClose={() => setDeleting(null)}
                onConfirm={handleDelete}
                title="Hapus Pertandingan"
                message="Pertandingan ini akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan."
            />
        </AuthenticatedLayout>
    );
}

// ─── Assign Referee Modal (Komponen 1: Dropdown) ────────
function AssignRefereeModal({ match, referees, onClose }) {
    const { data, setData, post, processing, errors } = useForm({ referee_id: '' });

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('matches.assign-referee', match.id), {
            onSuccess: onClose,
        });
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-surface-800 rounded-2xl border border-surface-700/50 shadow-2xl max-w-md w-full p-6 animate-slide-up">
                <h3 className="text-lg font-semibold text-surface-100 mb-4">🧑‍⚖️ Tugaskan Wasit</h3>
                <p className="text-sm text-surface-400 mb-4">
                    {match.home_team?.name} vs {match.away_team?.name}
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-surface-300 mb-2">Pilih Wasit</label>
                        <select
                            value={data.referee_id}
                            onChange={(e) => setData('referee_id', e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-surface-700 border border-surface-600 text-surface-100 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                        >
                            <option value="">— Pilih Wasit —</option>
                            {referees?.map((ref) => (
                                <option key={ref.id} value={ref.id}>{ref.name}</option>
                            ))}
                        </select>
                        {errors.referee_id && <p className="text-red-400 text-xs mt-1">{errors.referee_id}</p>}
                    </div>
                    <div className="flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl text-sm text-surface-300 bg-surface-700 hover:bg-surface-600 transition-colors">
                            Batal
                        </button>
                        <button type="submit" disabled={processing || !data.referee_id} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 transition-colors">
                            {processing ? 'Menyimpan...' : 'Tugaskan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Schedule Modal ─────────────────────────────────────
function ScheduleModal({ match, onClose }) {
    const { data, setData, post, processing } = useForm({ scheduled_at: '' });

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('matches.schedule', match.id), { onSuccess: onClose });
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-surface-800 rounded-2xl border border-surface-700/50 shadow-2xl max-w-md w-full p-6 animate-slide-up">
                <h3 className="text-lg font-semibold text-surface-100 mb-4">📅 Jadwalkan Pertandingan</h3>
                <p className="text-sm text-surface-400 mb-4">
                    {match.home_team?.name} vs {match.away_team?.name}
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-surface-300 mb-2">Tanggal & Waktu</label>
                        <input
                            type="datetime-local"
                            value={data.scheduled_at}
                            onChange={(e) => setData('scheduled_at', e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-surface-700 border border-surface-600 text-surface-100 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                        />
                    </div>
                    <div className="flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl text-sm text-surface-300 bg-surface-700 hover:bg-surface-600 transition-colors">
                            Batal
                        </button>
                        <button type="submit" disabled={processing} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 transition-colors">
                            {processing ? 'Menyimpan...' : 'Jadwalkan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Edit Match Modal (Komponen 4) ──────────────────────
function EditMatchModal({ match, referees, onClose }) {
    const formatDateForInput = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        // Format: YYYY-MM-DDTHH:mm
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const { data, setData, put, processing, errors } = useForm({
        scheduled_at: formatDateForInput(match.scheduled_at),
        court_number: match.court_number || '',
        referee_id: match.referee_id || '',
        status: match.status || 'scheduled',
    });

    const isNonScheduled = match.status !== 'scheduled';

    const handleSubmit = (e) => {
        e.preventDefault();
        put(route('matches.update', match.id), {
            onSuccess: onClose,
        });
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-surface-800 rounded-2xl border border-surface-700/50 shadow-2xl max-w-lg w-full p-6 animate-slide-up">
                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-lg font-bold text-surface-100 flex items-center gap-2">
                        <span>✏️</span> Edit Jadwal Pertandingan
                    </h3>
                    <span className="text-xs px-2.5 py-0.5 rounded-full uppercase font-bold bg-surface-700 text-surface-300">
                        Status: {match.status}
                    </span>
                </div>
                <p className="text-sm font-semibold text-primary-300 mb-4">
                    {match.home_team?.name || match.home_display_name || 'TBD'} <span className="text-surface-400 font-normal">vs</span> {match.away_team?.name || match.away_display_name || 'TBD'}
                </p>

                {/* Warning Alert Banner */}
                <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs mb-4 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                        <span>⚠️</span>
                        <span>Perhatian Pengubahan Jadwal:</span>
                    </div>
                    <p className="text-amber-300/90 leading-relaxed">
                        Mengubah tanggal, jam tanding, atau nomor lapangan akan langsung mengubah jadwal pertandingan turnamen bagi peserta dan wasit terkait.
                        {isNonScheduled && ' Pertandingan ini sudah dalam status ' + match.status.toUpperCase() + ', pastikan seluruh pihak telah diberi tahu.'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Status Pertandingan */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-surface-300 mb-2">Status Pertandingan</label>
                        <select
                            value={data.status}
                            onChange={(e) => setData('status', e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-surface-700 border border-surface-600 text-surface-100 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 font-medium"
                        >
                            <option value="scheduled">Dijadwalkan (Scheduled)</option>
                            <option value="setup">Setup Pertandingan</option>
                            <option value="live">Sedang Berlangsung (Live)</option>
                            <option value="finished">Selesai (Finished)</option>
                        </select>
                        {errors.status && <p className="text-red-400 text-xs mt-1">{errors.status}</p>}
                    </div>

                    {/* Scheduled At */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-surface-300 mb-2">Tanggal & Jam Pertandingan</label>
                        <input
                            type="datetime-local"
                            value={data.scheduled_at}
                            onChange={(e) => setData('scheduled_at', e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-surface-700 border border-surface-600 text-surface-100 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 font-mono"
                        />
                        {errors.scheduled_at && <p className="text-red-400 text-xs mt-1">{errors.scheduled_at}</p>}
                    </div>

                    {/* Court Number */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-surface-300 mb-2">Nomor Lapangan</label>
                        <input
                            type="number"
                            min="1"
                            value={data.court_number}
                            onChange={(e) => setData('court_number', e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-surface-700 border border-surface-600 text-surface-100 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                            placeholder="Contoh: 1"
                        />
                        {errors.court_number && <p className="text-red-400 text-xs mt-1">{errors.court_number}</p>}
                    </div>

                    {/* Referee Dropdown */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-surface-300 mb-2">Wasit Pertandingan</label>
                        <select
                            value={data.referee_id}
                            onChange={(e) => setData('referee_id', e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-surface-700 border border-surface-600 text-surface-100 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                        >
                            <option value="">— Pilih Wasit —</option>
                            {referees?.map((ref) => (
                                <option key={ref.id} value={ref.id}>🧑‍⚖️ {ref.name}</option>
                            ))}
                        </select>
                        {errors.referee_id && <p className="text-red-400 text-xs mt-1">{errors.referee_id}</p>}
                    </div>

                    <div className="flex gap-3 pt-3 border-t border-surface-700">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-surface-300 bg-surface-700 hover:bg-surface-600 transition-colors">
                            Batal
                        </button>
                        <button type="submit" disabled={processing} className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-md flex items-center justify-center gap-1.5">
                            {processing ? 'Menyimpan...' : '💾 Simpan Perubahan Jadwal'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
