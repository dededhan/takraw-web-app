import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import StatusBadge from '@/Components/StatusBadge';
import { Head, Link } from '@inertiajs/react';

export default function RefereeDashboard({ assignedMatches = [], tournaments = [], completedToday = [] }) {
    const [selectedTournamentId, setSelectedTournamentId] = useState('all');

    // Filter matches by selected tournament
    const filteredMatches = assignedMatches.filter(m =>
        selectedTournamentId === 'all' || m.tournament_id === Number(selectedTournamentId)
    );

    const liveMatches = filteredMatches.filter(m => m.status === 'live');
    const upcomingMatches = filteredMatches.filter(m => m.status !== 'live');

    // Laga waktu terdekat berikutnya (match pertama dari daftar yang belum live)
    const nextClosestMatch = upcomingMatches[0];

    return (
        <AuthenticatedLayout header="Dashboard Wasit">
            <Head title="Dashboard Wasit" />

            <div className="max-w-7xl mx-auto space-y-6">
                {/* ─── Tournament Selector Tabs ─── */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-surface-800">
                    <button
                        onClick={() => setSelectedTournamentId('all')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 border ${
                            selectedTournamentId === 'all'
                                ? 'bg-primary-600/20 text-primary-300 border-primary-500/40 shadow-xs'
                                : 'bg-surface-800/50 text-surface-400 border-surface-700 hover:border-surface-600'
                        }`}
                    >
                        <span>🏆</span> Semua Turnamen
                        <span className="px-2 py-0.5 rounded-full bg-surface-900 text-surface-300 font-mono text-[10px]">
                            {assignedMatches.length}
                        </span>
                    </button>

                    {tournaments.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setSelectedTournamentId(t.id.toString())}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 border ${
                                selectedTournamentId === t.id.toString()
                                    ? 'bg-primary-600/20 text-primary-300 border-primary-500/40 shadow-xs'
                                    : 'bg-surface-800/50 text-surface-400 border-surface-700 hover:border-surface-600'
                            }`}
                        >
                            <span>🏆</span> {t.name}
                            <span className="px-2 py-0.5 rounded-full bg-surface-900 text-surface-300 font-mono text-[10px]">
                                {t.count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* ─── Alert / Highlight Live Match ─── */}
                {liveMatches.length > 0 && (
                    <div className="space-y-4">
                        {liveMatches.map((match) => (
                            <Link
                                key={match.id}
                                href={route('scoring.show', match.id)}
                                className="block p-5 rounded-2xl border-2 border-red-500/50 bg-gradient-to-r from-red-500/15 via-surface-900 to-red-600/10 hover:border-red-500 transition-all shadow-xl"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <StatusBadge status="live" size="md" />
                                        <span className="text-xs font-mono font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded">
                                            #{match.match_number || match.id}
                                        </span>
                                    </div>
                                    <span className="text-xs font-semibold text-surface-300">{match.tournament?.name}</span>
                                </div>
                                <div className="flex items-center justify-center gap-6 py-2">
                                    <div className="text-center flex-1">
                                        <p className="text-base font-bold text-surface-100">{match.home_display_name || match.home_team?.name || 'TBD'}</p>
                                        <p className="text-4xl font-black text-emerald-400 mt-1">
                                            {match.sets?.filter(s => s.winner_team_id === match.home_team_id).length || 0}
                                        </p>
                                    </div>
                                    <span className="text-2xl text-surface-600 font-black">VS</span>
                                    <div className="text-center flex-1">
                                        <p className="text-base font-bold text-surface-100">{match.away_display_name || match.away_team?.name || 'TBD'}</p>
                                        <p className="text-4xl font-black text-emerald-400 mt-1">
                                            {match.sets?.filter(s => s.winner_team_id === match.away_team_id).length || 0}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-center mt-3">
                                    <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold shadow-lg hover:bg-red-700 transition-colors">
                                        ⚡ Lanjutkan Scoring Match #{match.match_number || match.id}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {/* ─── Highlight Laga Waktu Terdekat (Next Upcoming Match) ─── */}
                {nextClosestMatch && liveMatches.length === 0 && (
                    <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-surface-900 to-amber-600/5 p-5 shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 px-3 py-1 bg-amber-500/20 text-amber-300 text-[10px] font-extrabold uppercase tracking-widest rounded-bl-xl border-l border-b border-amber-500/30">
                            ⚡ Pertandingan Terdekat Berikutnya
                        </div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                                    Match #{nextClosestMatch.match_number || nextClosestMatch.id}
                                </span>
                                <span className="text-xs uppercase font-bold text-surface-400">
                                    Mode {nextClosestMatch.match_mode?.replace('_', ' ')}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between gap-4 py-2">
                            <div className="flex-1 text-center">
                                <p className="text-sm font-bold text-surface-100">{nextClosestMatch.home_display_name || nextClosestMatch.home_team?.name || 'TBD'}</p>
                            </div>
                            <span className="text-xs font-black text-amber-400 bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20">VS</span>
                            <div className="flex-1 text-center">
                                <p className="text-sm font-bold text-surface-100">{nextClosestMatch.away_display_name || nextClosestMatch.away_team?.name || 'TBD'}</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-surface-400 border-t border-surface-800/80 pt-3 mt-2">
                            <div className="flex items-center gap-3">
                                <span>🏆 {nextClosestMatch.tournament?.name}</span>
                                <span>📅 Hari {nextClosestMatch.day_number} ({nextClosestMatch.time_slot?.label?.split(' - ')[0] || '—'})</span>
                                <span>📍 {nextClosestMatch.court?.name || (nextClosestMatch.court_number ? `Lapangan ${nextClosestMatch.court_number}` : '—')}</span>
                            </div>
                            <Link
                                href={route('scoring.show', nextClosestMatch.id)}
                                className="px-4 py-2 rounded-xl bg-amber-500 text-surface-950 font-extrabold text-xs hover:bg-amber-400 transition-colors shadow-md flex items-center gap-1.5"
                            >
                                <span>⚙️</span> Setup & Mulai Scoring
                            </Link>
                        </div>
                    </div>
                )}

                {/* ─── Summary Counters ─── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="rounded-xl border border-red-500/30 bg-surface-900/60 p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Live Berlangsung</p>
                            <p className="text-2xl font-bold text-red-400 mt-1">{liveMatches.length}</p>
                        </div>
                        <span className="text-2xl">🔴</span>
                    </div>
                    <div className="rounded-xl border border-amber-500/30 bg-surface-900/60 p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Mendatang / Ditugaskan</p>
                            <p className="text-2xl font-bold text-amber-400 mt-1">{upcomingMatches.length}</p>
                        </div>
                        <span className="text-2xl">📋</span>
                    </div>
                    <div className="rounded-xl border border-emerald-500/30 bg-surface-900/60 p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Selesai Hari Ini</p>
                            <p className="text-2xl font-bold text-emerald-400 mt-1">{completedToday.length}</p>
                        </div>
                        <span className="text-2xl">✅</span>
                    </div>
                </div>

                {/* ─── Assigned Matches List ─── */}
                <div className="rounded-2xl border border-surface-700/50 bg-surface-900/60 overflow-hidden shadow-lg">
                    <div className="px-5 py-4 border-b border-surface-700/60 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">📋</span>
                            <h2 className="text-sm font-bold text-surface-100 uppercase tracking-wider">
                                Daftar Pertandingan Ditugaskan ({filteredMatches.length})
                            </h2>
                        </div>
                        <span className="text-xs text-surface-400 font-mono">Diurutkan Waktu Terdekat</span>
                    </div>
                    <div className="p-5">
                        {filteredMatches.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="text-4xl mb-3">✅</div>
                                <p className="text-surface-400 text-sm font-semibold">Tidak ada pertandingan mendatang yang ditugaskan</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredMatches.map((match) => {
                                    const homeName = match.home_display_name || match.home_team?.name || 'TBD';
                                    const awayName = match.away_display_name || match.away_team?.name || 'TBD';

                                    return (
                                        <Link
                                            key={match.id}
                                            href={route('scoring.show', match.id)}
                                            className={`block p-4 rounded-xl border transition-all duration-200 ${
                                                match.status === 'live'
                                                    ? 'bg-red-500/10 border-red-500/40 shadow-lg'
                                                    : 'bg-surface-800/60 border-surface-700/40 hover:border-primary-500/40'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-mono font-bold text-primary-300 bg-black/30 px-2 py-0.5 rounded">
                                                        Match #{match.match_number || match.id}
                                                    </span>
                                                    <StatusBadge status={match.status} size="xs" />
                                                    <span className="text-[10px] uppercase font-bold text-surface-400 bg-surface-900 px-2 py-0.5 rounded border border-surface-700/50">
                                                        {match.match_mode?.replace('_', ' ')}
                                                    </span>
                                                </div>
                                                <span className="text-xs text-surface-400">🏆 {match.tournament?.name}</span>
                                            </div>

                                            <div className="flex items-center justify-between gap-4 py-2 border-y border-surface-800/40 my-2">
                                                <span className="text-sm font-bold text-surface-200 text-right flex-1 truncate">
                                                    {homeName}
                                                </span>
                                                <span className="text-xs text-surface-500 font-black px-3 py-1 bg-surface-900 rounded-lg">VS</span>
                                                <span className="text-sm font-bold text-surface-200 text-left flex-1 truncate">
                                                    {awayName}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between text-xs text-surface-400">
                                                <div className="flex items-center gap-3">
                                                    <span>📅 Hari {match.day_number} ({match.time_slot?.label?.split(' - ')[0] || '—'})</span>
                                                    <span>📍 {match.court?.name || (match.court_number ? `Lapangan ${match.court_number}` : '—')}</span>
                                                </div>
                                                <span className="px-3 py-1 rounded-lg bg-primary-600/20 text-primary-300 text-xs font-bold border border-primary-500/30">
                                                    {match.status === 'live' ? '⚡ Scoring Live' : (match.status === 'setup' ? '▶️ Mulai Pertandingan' : '⚙️ Setup & Mulai')}
                                                </span>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* ─── Completed Today Section ─── */}
                {completedToday.length > 0 && (
                    <div className="rounded-2xl border border-surface-700/50 bg-surface-900/60 overflow-hidden shadow-lg">
                        <div className="px-5 py-4 border-b border-surface-700/60">
                            <h2 className="text-sm font-bold text-surface-100 uppercase tracking-wider">
                                ✅ Selesai Hari Ini ({completedToday.length})
                            </h2>
                        </div>
                        <div className="divide-y divide-surface-800">
                            {completedToday.map((match) => (
                                <div key={match.id} className="flex items-center justify-between px-5 py-3 text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono font-bold text-emerald-400">Match #{match.match_number || match.id}</span>
                                        <span className="text-surface-200 font-semibold">
                                            {match.home_display_name || match.home_team?.name} vs {match.away_display_name || match.away_team?.name}
                                        </span>
                                    </div>
                                    <StatusBadge status="finished" size="xs" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
