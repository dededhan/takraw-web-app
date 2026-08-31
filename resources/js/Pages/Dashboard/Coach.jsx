import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import StatusBadge from '@/Components/StatusBadge';
import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';

export default function CoachDashboard({
    teams = [],
    superTeams = [],
    participatedTournaments = [],
    activeTournaments = [],
    completedTournaments = [],
    upcomingMatches = [],
    recentMatches = [],
    stats = {}
}) {
    const [activeTab, setActiveTab] = useState('tournaments'); // tournaments, upcoming, history

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

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('id-ID', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatDateTime = (dateStr) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('id-ID', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <AuthenticatedLayout header="Dashboard Pelatih">
            <Head title="Dashboard Pelatih" />

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {/* 1. Tim Binaan */}
                <Link
                    href={route('teams.index')}
                    className="relative overflow-hidden rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-500/15 via-surface-900/60 to-surface-900/90 p-5 hover:border-blue-400/50 transition-all group"
                >
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-blue-300">Tim Binaan</p>
                            <p className="text-3xl font-black text-surface-100 mt-1.5 group-hover:text-blue-300 transition-colors">
                                {stats.totalTeams ?? teams.length}
                            </p>
                            <p className="text-[11px] text-surface-400 mt-1">
                                {superTeams.length > 0 ? `+ ${superTeams.length} Super Team` : 'Tim Reguler'}
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center text-2xl border border-blue-500/30 shadow-inner">
                            👥
                        </div>
                    </div>
                </Link>

                {/* 2. Total Atlet */}
                <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 via-surface-900/60 to-surface-900/90 p-5">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Total Atlet</p>
                            <p className="text-3xl font-black text-surface-100 mt-1.5">
                                {stats.totalAthletes ?? 0}
                            </p>
                            <p className="text-[11px] text-surface-400 mt-1">Terdaftar di semua tim</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-2xl border border-emerald-500/30 shadow-inner">
                            🏃
                        </div>
                    </div>
                </div>

                {/* 3. Turnamen Diikuti */}
                <Link
                    href={route('coach.tournaments.history')}
                    className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/15 via-surface-900/60 to-surface-900/90 p-5 hover:border-amber-400/50 transition-all group"
                >
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">Turnamen Diikuti</p>
                            <p className="text-3xl font-black text-surface-100 mt-1.5 group-hover:text-amber-300 transition-colors">
                                {stats.totalTournaments ?? participatedTournaments.length}
                            </p>
                            <p className="text-[11px] text-amber-400 mt-1 flex items-center gap-1 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                                {stats.activeTournamentsCount ?? activeTournaments.length} Turnamen Berjalan
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center text-2xl border border-amber-500/30 shadow-inner">
                            🏆
                        </div>
                    </div>
                </Link>

                {/* 4. Win Rate / Performa */}
                <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/15 via-surface-900/60 to-surface-900/90 p-5">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-purple-300">Win Rate Tim</p>
                            <p className="text-3xl font-black text-surface-100 mt-1.5">
                                {stats.winRate ?? 0}%
                            </p>
                            <p className="text-[11px] text-surface-400 mt-1">
                                {stats.winsCount ?? 0} Menang / {stats.lossCount ?? 0} Kalah
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center text-2xl border border-purple-500/30 shadow-inner">
                            🎯
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* Left Column: Tim Saya & Template Download */}
                <div className="xl:col-span-5 space-y-6">
                    {/* Tim Binaan Card */}
                    <div className="rounded-2xl border border-surface-700/50 bg-surface-900/60 backdrop-blur-sm overflow-hidden flex flex-col shadow-lg">
                        <div className="px-5 py-4 border-b border-surface-700/50 flex items-center justify-between bg-surface-950/20">
                            <h2 className="text-sm font-bold text-surface-100 flex items-center gap-2">
                                <span>👥 Tim & Super Team Saya</span>
                            </h2>
                            <Link
                                href={route('teams.index')}
                                className="text-xs font-semibold text-primary-400 hover:text-primary-300 transition-colors"
                            >
                                Kelola Tim →
                            </Link>
                        </div>

                        <div className="divide-y divide-surface-700/30 max-h-[380px] overflow-y-auto">
                            {teams.length === 0 && superTeams.length === 0 ? (
                                <div className="text-center py-10 px-4">
                                    <div className="text-3xl mb-2">📋</div>
                                    <p className="text-surface-400 text-sm font-medium">Belum ada tim terdaftar</p>
                                    <Link
                                        href={route('teams.create')}
                                        className="inline-block mt-2.5 text-xs text-primary-400 hover:text-primary-300 font-semibold"
                                    >
                                        + Daftarkan tim pertama →
                                    </Link>
                                </div>
                            ) : (
                                <>
                                    {/* Regular Teams */}
                                    {teams.map((team) => (
                                        <Link
                                            key={team.id}
                                            href={route('teams.show', team.id)}
                                            className="flex items-center justify-between px-5 py-3.5 hover:bg-surface-800/40 transition-colors group"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-300 flex items-center justify-center text-sm font-bold shrink-0 border border-blue-500/20">
                                                    {team.name.charAt(0)}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-surface-200 group-hover:text-primary-300 transition-colors truncate">
                                                        {team.name}
                                                    </p>
                                                    <p className="text-[11px] text-surface-500">
                                                        {team.region} • {team.athletes?.length || 0} atlet
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {team.is_locked ? (
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/25 flex items-center gap-1 font-medium" title="Roster Terkunci karena pernah ikut turnamen">
                                                        🔒 Terkunci
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium">
                                                        🔓 Terbuka
                                                    </span>
                                                )}
                                            </div>
                                        </Link>
                                    ))}

                                    {/* Super Teams */}
                                    {superTeams.map((st) => (
                                        <div
                                            key={st.id}
                                            className="flex items-center justify-between px-5 py-3.5 bg-purple-500/5 hover:bg-purple-500/10 transition-colors border-l-2 border-purple-500"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center text-sm font-bold shrink-0 border border-purple-500/30">
                                                    🏆
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <p className="text-sm font-bold text-purple-200 truncate">{st.name}</p>
                                                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 uppercase font-black">
                                                            SUPER TEAM
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-surface-400">
                                                        {formatTournamentMode(st.match_mode)} • {st.members?.length || 0}/3 Sub-Tim
                                                    </p>
                                                </div>
                                            </div>
                                            <div>
                                                {st.tournament ? (
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/25 truncate max-w-[100px] block">
                                                        {st.tournament.name}
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-800 text-surface-400">
                                                        Belum Ikut Tur
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Template Download & Import Box (SUPER PROFESSIONAL EXCEL XLSX) */}
                    <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-surface-900/60 to-surface-900/90 p-5 shadow-lg relative overflow-hidden">
                        <div className="flex items-start justify-between gap-3 mb-3">
                            <div>
                                <h3 className="text-sm font-bold text-emerald-300 flex items-center gap-1.5">
                                    <span>📊 Template Data Atlet Excel (.XLSX)</span>
                                </h3>
                                <p className="text-xs text-surface-400 mt-1 leading-relaxed">
                                    Unduh file template Excel resmi lengkap dengan header berstyling, contoh data nyata, dan petunjuk kolom untuk mempermudah pendaftaran atlet secara massal.
                                </p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-xl shrink-0 border border-emerald-500/30">
                                📥
                            </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-emerald-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <div className="text-[11px] text-surface-400 flex items-center gap-1.5">
                                <span className="text-emerald-400">✓</span> Format terstruktur
                                <span className="text-surface-600">•</span>
                                <span>Anti-Duplikat</span>
                            </div>
                            <div className="w-full sm:w-auto flex items-center gap-2">
                                <a
                                    href={route('templates.athletes')}
                                    download="template_import_atlet.xlsx"
                                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <span>📥 .xlsx</span>
                                </a>
                                <a
                                    href={route('templates.athletes-csv')}
                                    download="template_import_atlet.csv"
                                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-200 border border-surface-700 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <span>📥 .csv</span>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: 3 Tabs (Tournaments, Upcoming, History) */}
                <div className="xl:col-span-7 rounded-2xl border border-surface-700/50 bg-surface-900/60 backdrop-blur-sm overflow-hidden flex flex-col shadow-lg">
                    {/* Tab Header Navigation */}
                    <div className="border-b border-surface-700/50 bg-surface-950/30 flex p-2 gap-1.5">
                        <button
                            onClick={() => setActiveTab('tournaments')}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border cursor-pointer ${
                                activeTab === 'tournaments'
                                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 shadow-md'
                                    : 'bg-transparent text-surface-400 border-transparent hover:text-surface-200 hover:bg-surface-800/40'
                            }`}
                        >
                            <span>🏆</span>
                            Turnamen Diikuti
                            {participatedTournaments.length > 0 && (
                                <span className="bg-amber-500 text-black text-[10px] font-black px-1.5 py-0.2 rounded-full">
                                    {participatedTournaments.length}
                                </span>
                            )}
                        </button>

                        <button
                            onClick={() => setActiveTab('upcoming')}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border cursor-pointer ${
                                activeTab === 'upcoming'
                                    ? 'bg-primary-600/20 text-primary-300 border-primary-500/30 shadow-md'
                                    : 'bg-transparent text-surface-400 border-transparent hover:text-surface-200 hover:bg-surface-800/40'
                            }`}
                        >
                            <span>📅</span>
                            Jadwal Tanding
                            {upcomingMatches.length > 0 && (
                                <span className="bg-primary-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                                    {upcomingMatches.length}
                                </span>
                            )}
                        </button>

                        <button
                            onClick={() => setActiveTab('history')}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border cursor-pointer ${
                                activeTab === 'history'
                                    ? 'bg-blue-500/15 text-blue-300 border-blue-500/30 shadow-md'
                                    : 'bg-transparent text-surface-400 border-transparent hover:text-surface-200 hover:bg-surface-800/40'
                            }`}
                        >
                            <span>📜</span>
                            Hasil & Riwayat
                            {recentMatches.length > 0 && (
                                <span className="bg-blue-500/20 text-blue-300 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                                    {recentMatches.length}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Tab Content Body */}
                    <div className="p-5 flex-1 overflow-y-auto max-h-[520px]">
                        {/* 🏆 TAB 1: TURNAMEN DI IKUTI */}
                        {activeTab === 'tournaments' && (
                            <div className="space-y-4">
                                {participatedTournaments.length === 0 ? (
                                    <div className="text-center py-14 px-4">
                                        <div className="text-4xl mb-3">🏆</div>
                                        <h4 className="text-base font-semibold text-surface-200">Belum Mengikuti Turnamen</h4>
                                        <p className="text-xs text-surface-400 mt-1 max-w-sm mx-auto">
                                            Daftarkan tim binaan Anda ke turnamen yang sedang membuka pendaftaran untuk mulai bertanding.
                                        </p>
                                        <Link
                                            href={route('coach.tournaments.index')}
                                            className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold transition-all shadow-md"
                                        >
                                            Lihat Turnamen →
                                        </Link>
                                    </div>
                                ) : (
                                    participatedTournaments.map((t) => (
                                        <div
                                            key={t.id}
                                            className="p-4 rounded-2xl bg-surface-950/40 border border-surface-800 hover:border-amber-500/30 transition-all group"
                                        >
                                            <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                                                <div>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h4 className="text-base font-bold text-surface-100 group-hover:text-amber-300 transition-colors">
                                                            {t.name}
                                                        </h4>
                                                        <StatusBadge status={t.status} size="sm" />
                                                    </div>
                                                    <p className="text-xs text-surface-400 mt-1">
                                                        📅 {formatDate(t.start_date)} — {formatDate(t.end_date)}
                                                    </p>
                                                </div>
                                                <div className="flex flex-wrap gap-1 justify-end">
                                                    {(t.modes || []).filter(m => m.is_active).map(m => (
                                                        <span key={m.match_mode} className="text-[11px] font-semibold text-surface-300 bg-surface-800 px-2.5 py-1 rounded-lg border border-surface-700">
                                                            {formatTournamentMode(m.match_mode)}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="mt-3 pt-3 border-t border-surface-850 flex items-center justify-between text-xs text-surface-400">
                                                <span>Total {t.teams_count ?? 0} Tim Peserta • {t.matches_count ?? 0} Pertandingan</span>
                                                <Link
                                                    href={route('coach.tournaments.history')}
                                                    className="font-semibold text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-1"
                                                >
                                                    Lihat Detail Riwayat →
                                                </Link>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* 📅 TAB 2: JADWAL PERTANDINGAN MENDATANG */}
                        {activeTab === 'upcoming' && (
                            <div className="space-y-3.5">
                                {upcomingMatches.length === 0 ? (
                                    <div className="text-center py-14 px-4">
                                        <div className="text-4xl mb-3">📅</div>
                                        <p className="text-surface-300 font-semibold text-sm">Tidak Ada Jadwal Laga Mendatang</p>
                                        <p className="text-xs text-surface-500 mt-1">
                                            Jadwal pertandingan yang telah diatur oleh Admin akan otomatis muncul di sini.
                                        </p>
                                    </div>
                                ) : (
                                    upcomingMatches.map((m) => {
                                        const homeName = m.home_team?.name || m.home_super_team?.name || 'TBD';
                                        const awayName = m.away_team?.name || m.away_super_team?.name || 'TBD';
                                        return (
                                            <div
                                                key={m.id}
                                                className="p-4 rounded-2xl bg-surface-950/40 border border-surface-800 hover:border-primary-500/30 transition-all"
                                            >
                                                <div className="flex items-center justify-between text-xs text-surface-400 mb-2.5">
                                                    <span className="font-semibold text-primary-300 truncate max-w-[200px]">
                                                        🏆 {m.tournament?.name}
                                                    </span>
                                                    <span>⏱️ {formatDateTime(m.scheduled_at)}</span>
                                                </div>

                                                <div className="flex items-center justify-between gap-3 py-1.5">
                                                    <div className="flex-1 text-center font-bold text-surface-100 text-sm truncate">
                                                        {homeName}
                                                    </div>
                                                    <div className="px-2.5 py-0.5 rounded-lg bg-surface-800 text-[10px] font-black text-surface-400 uppercase tracking-wider">
                                                        VS
                                                    </div>
                                                    <div className="flex-1 text-center font-bold text-surface-100 text-sm truncate">
                                                        {awayName}
                                                    </div>
                                                </div>

                                                <div className="mt-3 pt-2.5 border-t border-surface-850 flex items-center justify-between text-[11px] text-surface-500">
                                                    <span>🏟️ Lapangan {m.court_number || m.court?.court_number || '1'}</span>
                                                    <span>Status: Terjadwal</span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}

                        {/* 📜 TAB 3: HASIL & RIWAYAT PERTANDINGAN SELESAI */}
                        {activeTab === 'history' && (
                            <div className="space-y-3.5">
                                {recentMatches.length === 0 ? (
                                    <div className="text-center py-14 px-4">
                                        <div className="text-4xl mb-3">📜</div>
                                        <p className="text-surface-300 font-semibold text-sm">Belum Ada Riwayat Pertandingan Selesai</p>
                                        <p className="text-xs text-surface-500 mt-1">
                                            Hasil pertandingan yang telah dipimpin oleh wasit akan tercatat di sini.
                                        </p>
                                    </div>
                                ) : (
                                    recentMatches.map((m) => {
                                        const homeName = m.home_team?.name || m.home_super_team?.name || 'Home';
                                        const awayName = m.away_team?.name || m.away_super_team?.name || 'Away';
                                        return (
                                            <div
                                                key={m.id}
                                                className="p-4 rounded-2xl bg-surface-950/40 border border-surface-800 hover:border-blue-500/30 transition-all"
                                            >
                                                <div className="flex items-center justify-between text-xs text-surface-400 mb-2">
                                                    <span className="font-medium text-surface-300 truncate max-w-[200px]">
                                                        🏆 {m.tournament?.name}
                                                    </span>
                                                    <span className="text-[11px] text-surface-500">{formatDate(m.finished_at || m.scheduled_at)}</span>
                                                </div>

                                                <div className="flex items-center justify-between gap-3 py-1">
                                                    <div className="flex-1 text-center font-bold text-surface-100 text-sm truncate">
                                                        {homeName}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 font-mono font-bold text-sm text-primary-300 bg-surface-900 px-3 py-1 rounded-xl border border-surface-700">
                                                        {m.sets && m.sets.length > 0 ? (
                                                            m.sets.map((s, idx) => (
                                                                <span key={s.id} className="text-xs">
                                                                    {idx > 0 && <span className="text-surface-600 mx-0.5">,</span>}
                                                                    {s.home_score}-{s.away_score}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span>Selesai</span>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 text-center font-bold text-surface-100 text-sm truncate">
                                                        {awayName}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
