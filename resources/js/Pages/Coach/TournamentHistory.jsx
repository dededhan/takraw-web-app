import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import StatusBadge from '@/Components/StatusBadge';
import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';

export default function TournamentHistory({ tournaments = [] }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // all, completed, active

    const formatTournamentMode = (mode) => {
        switch (mode) {
            case 'regu': return 'Regu (3 vs 3)';
            case 'double': return 'Double (2 vs 2)';
            case 'quadrant': return 'Quadrant (4 vs 4)';
            case 'team_regu': return 'Team Regu (Super Team)';
            case 'team_double': return 'Team Double (Super Team)';
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

    const filteredTournaments = tournaments.filter((t) => {
        const matchSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchSearch) return false;

        if (statusFilter === 'completed') return t.status === 'completed';
        if (statusFilter === 'active') return t.status !== 'completed';
        return true;
    });

    return (
        <AuthenticatedLayout header="Riwayat Turnamen">
            <Head title="Riwayat Turnamen" />

            {/* Header Banner */}
            <div className="mb-6 p-6 rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-surface-900/40 to-transparent">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-surface-100 flex items-center gap-2">
                            <span>📜 Riwayat Turnamen & Hasil Pertandingan</span>
                        </h2>
                        <p className="text-xs text-surface-400 mt-1 max-w-2xl">
                            Daftar seluruh kejuaraan yang pernah dan sedang diikuti oleh tim-tim binaan Anda beserta riwayat hasil set pertandingannya.
                        </p>
                    </div>
                    <Link
                        href={route('coach.tournaments.index')}
                        className="px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold transition-all shadow-md shadow-primary-600/20 flex items-center gap-2 shrink-0"
                    >
                        <span>🏆 Ikuti Turnamen Baru</span>
                    </Link>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="w-full sm:w-80 relative">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Cari nama turnamen..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-900/70 border border-surface-700/60 text-surface-100 placeholder-surface-500 text-xs focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
                    />
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-500 text-xs">🔍</span>
                </div>

                {/* Status Tabs */}
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-900/60 border border-surface-700/50 w-full sm:w-auto">
                    <button
                        onClick={() => setStatusFilter('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            statusFilter === 'all'
                                ? 'bg-primary-600 text-white shadow-sm'
                                : 'text-surface-400 hover:text-surface-200'
                        }`}
                    >
                        Semua ({tournaments.length})
                    </button>
                    <button
                        onClick={() => setStatusFilter('active')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            statusFilter === 'active'
                                ? 'bg-primary-600 text-white shadow-sm'
                                : 'text-surface-400 hover:text-surface-200'
                        }`}
                    >
                        Sedang Berjalan ({tournaments.filter(t => t.status !== 'completed').length})
                    </button>
                    <button
                        onClick={() => setStatusFilter('completed')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            statusFilter === 'completed'
                                ? 'bg-primary-600 text-white shadow-sm'
                                : 'text-surface-400 hover:text-surface-200'
                        }`}
                    >
                        Selesai ({tournaments.filter(t => t.status === 'completed').length})
                    </button>
                </div>
            </div>

            {/* Tournament List */}
            {filteredTournaments.length === 0 ? (
                <div className="rounded-2xl border border-surface-700/50 bg-surface-900/40 p-12 text-center">
                    <div className="text-4xl mb-3">📜</div>
                    <h3 className="text-base font-bold text-surface-200">Tidak Ada Riwayat Turnamen</h3>
                    <p className="text-xs text-surface-500 mt-1 max-w-sm mx-auto">
                        {searchTerm ? 'Tidak ada turnamen yang cocok dengan pencarian Anda.' : 'Belum ada data keikutsertaan turnamen yang tercatat.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {filteredTournaments.map((tournament) => {
                        const myTournamentTeams = tournament.teams || [];
                        const myTournamentSuperTeams = tournament.superTeams || [];
                        const matches = tournament.matches || [];

                        return (
                            <div
                                key={tournament.id}
                                className="rounded-2xl border border-surface-700/60 bg-surface-900/60 backdrop-blur-md p-6 shadow-xl space-y-5"
                            >
                                {/* Top Header */}
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-surface-800">
                                    <div>
                                        <div className="flex items-center gap-2.5 flex-wrap">
                                            <h3 className="text-lg font-bold text-surface-100">
                                                {tournament.name}
                                            </h3>
                                            <StatusBadge status={tournament.status} size="sm" />
                                            {(tournament.modes || []).filter(m => m.is_active).map(m => (
                                                <span key={m.match_mode} className="text-xs px-2.5 py-0.5 rounded-lg bg-surface-800 text-surface-300 border border-surface-700 font-medium">
                                                    {formatTournamentMode(m.match_mode)}
                                                </span>
                                            ))}
                                        </div>
                                        <p className="text-xs text-surface-400 mt-1">
                                            📅 Periode Pelaksanaan: {formatDate(tournament.start_date)} — {formatDate(tournament.end_date)}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Link
                                            href={route('tournaments.show', tournament.id)}
                                            className="px-3.5 py-1.5 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-300 text-xs font-semibold transition-colors border border-surface-700 flex items-center gap-1.5"
                                        >
                                            <span>👁️ Lihat Bagan & Jadwal</span>
                                        </Link>
                                    </div>
                                </div>

                                {/* Teams Joined */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Sub-Card: Tim Terdaftar */}
                                    <div className="p-4 rounded-xl bg-surface-950/40 border border-surface-800">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-surface-400 mb-2.5 flex items-center gap-1.5">
                                            <span>👥 Tim Binaan Terdaftar ({myTournamentTeams.length + myTournamentSuperTeams.length})</span>
                                        </h4>
                                        <div className="space-y-1.5">
                                            {myTournamentTeams.map((t) => (
                                                <div key={t.id} className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-surface-900/50">
                                                    <span className="font-semibold text-surface-200">{t.name}</span>
                                                    <span className="text-[11px] text-surface-500">{t.athletes?.length || 0} Atlet</span>
                                                </div>
                                            ))}
                                            {myTournamentSuperTeams.map((st) => (
                                                <div key={st.id} className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
                                                    <span className="font-bold text-purple-300">{st.name} (Super Team)</span>
                                                    <span className="text-[11px] text-purple-400">{st.members?.length || 0}/3 Sub-Tim</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Sub-Card: Ringkasan Hasil Laga */}
                                    <div className="p-4 rounded-xl bg-surface-950/40 border border-surface-800">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-surface-400 mb-2.5 flex items-center gap-1.5">
                                            <span>⚔️ Riwayat Pertandingan ({matches.length} Laga)</span>
                                        </h4>
                                        {matches.length === 0 ? (
                                            <p className="text-xs text-surface-500 italic py-2">Belum ada pertandingan yang dijadwalkan / dimainkan.</p>
                                        ) : (
                                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                                {matches.map((m) => {
                                                    const homeName = m.home_team?.name || m.home_super_team?.name || 'Home';
                                                    const awayName = m.away_team?.name || m.away_super_team?.name || 'Away';
                                                    return (
                                                        <div key={m.id} className="p-2 rounded-lg bg-surface-900/60 border border-surface-850 text-xs">
                                                            <div className="flex items-center justify-between gap-2 font-medium">
                                                                <span className="truncate flex-1 font-bold text-surface-200">{homeName}</span>
                                                                <div className="font-mono px-2 py-0.5 rounded bg-black/40 text-primary-300 text-[11px] shrink-0">
                                                                    {m.sets && m.sets.length > 0 ? (
                                                                        m.sets.map((s, i) => `${i > 0 ? ', ' : ''}${s.home_score}-${s.away_score}`)
                                                                    ) : (
                                                                        <span>{m.status}</span>
                                                                    )}
                                                                </div>
                                                                <span className="truncate flex-1 text-right font-bold text-surface-200">{awayName}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </AuthenticatedLayout>
    );
}
