import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import StatusBadge from '@/Components/StatusBadge';
import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';

export default function CoachDashboard({ teams, liveMatches = [], upcomingMatches = [], pastMatches = [] }) {
    const [activeTab, setActiveTab] = useState('live'); // live, upcoming, past
    const totalAthletes = teams.reduce((sum, t) => sum + (t.athletes?.length || 0), 0);

    const formatTournamentMode = (mode) => {
        switch (mode) {
            case 'regu': return 'Regu';
            case 'double': return 'Double';
            case 'quarter': return 'Quarter';
            default: return mode;
        }
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('id-ID', {
            weekday: 'long',
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="relative overflow-hidden rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-500/20 to-blue-600/10 p-5">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-surface-450">Tim Saya</p>
                            <p className="text-3xl font-bold text-surface-100 mt-1">{teams.length}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-xl">👥</div>
                    </div>
                </div>
                <div className="relative overflow-hidden rounded-2xl border border-primary-500/30 bg-gradient-to-br from-primary-500/20 to-primary-600/10 p-5">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-surface-450">Total Atlet</p>
                            <p className="text-3xl font-bold text-surface-100 mt-1">{totalAthletes}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center text-xl">🏃</div>
                    </div>
                </div>
                <div className={`relative overflow-hidden rounded-2xl border transition-all duration-350 ${
                    liveMatches.length > 0 
                        ? 'border-red-500/30 bg-gradient-to-br from-red-500/20 to-red-600/10 shadow-lg shadow-red-500/5' 
                        : 'border-surface-700/50 bg-surface-900/50'
                } p-5`}>
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-surface-450">Pertandingan Live</p>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-3xl font-bold text-surface-100">{liveMatches.length}</p>
                                {liveMatches.length > 0 && (
                                    <span className="flex h-3 w-3 relative">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${
                            liveMatches.length > 0 ? 'bg-red-500/20 text-red-400' : 'bg-surface-800 text-surface-400'
                        }`}>
                            ⚡
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* Left Column: My Teams */}
                <div className="xl:col-span-5 rounded-2xl border border-surface-700/50 bg-surface-900/50 backdrop-blur-sm overflow-hidden flex flex-col justify-between">
                    <div>
                        <div className="px-5 py-4 border-b border-surface-700/50 flex items-center justify-between">
                            <h2 className="text-base font-semibold text-surface-100 flex items-center gap-2">
                                👥 Tim Saya
                            </h2>
                            <Link
                                href={route('teams.create')}
                                className="text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-500 transition-all shadow-md shadow-primary-600/15"
                            >
                                + Daftarkan Tim
                            </Link>
                        </div>
                        <div className="divide-y divide-surface-700/30 max-h-[480px] overflow-y-auto">
                            {teams.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="text-4xl mb-3">📋</div>
                                    <p className="text-surface-500 text-sm">Belum ada tim terdaftar</p>
                                    <Link
                                        href={route('teams.create')}
                                        className="inline-block mt-3 text-xs text-primary-400 hover:text-primary-300 font-medium"
                                    >
                                        Daftarkan tim pertama →
                                    </Link>
                                </div>
                            ) : (
                                teams.map((team) => (
                                    <Link
                                        key={team.id}
                                        href={route('teams.show', team.id)}
                                        className="flex items-center justify-between px-5 py-4 hover:bg-surface-800/30 transition-colors"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center text-sm font-bold text-blue-300 shrink-0 border border-blue-500/15">
                                                {team.name.charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-surface-200 truncate">{team.name}</p>
                                                <p className="text-xs text-surface-500">{team.region} • {team.athletes?.length || 0} atlet</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {team.tournaments?.length > 0 && (
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-300 border border-primary-500/20">
                                                    {team.tournaments.length} Turnamen
                                                </span>
                                            )}
                                            <svg className="w-4 h-4 text-surface-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>
                    </div>
                    <div className="p-4 bg-surface-950/20 border-t border-surface-700/30 flex items-center justify-between gap-3 text-center px-5">
                        <Link 
                            href={route('coach.tournaments.index')} 
                            className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors flex items-center justify-center gap-1"
                        >
                            🏆 Turnamen Baru →
                        </Link>
                        <a 
                            href={route('templates.athletes')} 
                            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center justify-center gap-1"
                            download
                        >
                            📥 Template CSV Atlet
                        </a>
                    </div>
                </div>

                {/* Right Column: 3 Tabs Match Panel */}
                <div className="xl:col-span-7 rounded-2xl border border-surface-700/50 bg-surface-900/50 backdrop-blur-sm overflow-hidden flex flex-col">
                    {/* Tab Navigation */}
                    <div className="border-b border-surface-700/50 bg-surface-950/20 flex p-2 gap-1">
                        <button
                            onClick={() => setActiveTab('live')}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border ${
                                activeTab === 'live'
                                    ? 'bg-red-500/10 text-red-400 border-red-500/25 shadow-glow-red'
                                    : 'bg-transparent text-surface-450 border-transparent hover:text-surface-200 hover:bg-surface-800/30'
                            }`}
                        >
                            <span className={liveMatches.length > 0 ? 'animate-pulse text-red-500' : ''}>⚡</span>
                            Live
                            {liveMatches.length > 0 && (
                                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                                    {liveMatches.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('upcoming')}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border ${
                                activeTab === 'upcoming'
                                    ? 'bg-primary-600/15 text-primary-300 border-primary-500/25 shadow-glow-primary'
                                    : 'bg-transparent text-surface-450 border-transparent hover:text-surface-200 hover:bg-surface-800/30'
                            }`}
                        >
                            <span>📅</span>
                            Mendatang
                            {upcomingMatches.length > 0 && (
                                <span className="bg-primary-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                                    {upcomingMatches.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('past')}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border ${
                                activeTab === 'past'
                                    ? 'bg-blue-500/10 text-blue-450 border-blue-500/20'
                                    : 'bg-transparent text-surface-450 border-transparent hover:text-surface-200 hover:bg-surface-800/30'
                            }`}
                        >
                            <span>📋</span>
                            Riwayat
                            {pastMatches.length > 0 && (
                                <span className="bg-blue-500/20 text-blue-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                                    {pastMatches.length}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Tab Contents */}
                    <div className="p-5 flex-1 overflow-y-auto max-h-[500px]">
                        
                        {/* ⚡ LIVE TAB */}
                        {activeTab === 'live' && (
                            <div className="space-y-4">
                                {liveMatches.length === 0 ? (
                                    <div className="text-center py-16">
                                        <div className="text-4xl mb-3">🏟️</div>
                                        <p className="text-surface-500 text-sm">Tidak ada pertandingan live saat ini</p>
                                        <p className="text-xs text-surface-600 mt-1">Laga yang sedang berjalan akan muncul di sini</p>
                                    </div>
                                ) : (
                                    liveMatches.map((match) => (
                                        <Link
                                            key={match.id}
                                            href={route('matches.show', match.id)}
                                            className="block p-4 rounded-2xl bg-surface-950/40 border border-surface-800 hover:border-red-500/30 transition-all duration-250 group relative overflow-hidden"
                                        >
                                            {/* Glowing border indicator */}
                                            <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                                            
                                            <div className="flex items-center justify-between mb-3 pl-2">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">LIVE SET-SCORING</span>
                                                </div>
                                                <span className="text-xs text-surface-500 truncate max-w-[180px] font-medium">
                                                    {match.tournament?.name}
                                                </span>
                                            </div>

                                            {/* VS Visualizer */}
                                            <div className="flex items-center justify-between gap-2 px-2 py-1">
                                                <div className="flex-1 text-center">
                                                    <p className="text-sm font-bold text-surface-100 group-hover:text-red-400 transition-colors truncate">
                                                        {match.home_team?.name}
                                                    </p>
                                                    <p className="text-[10px] text-surface-500">{match.home_team?.region || 'Home'}</p>
                                                </div>
                                                <div className="shrink-0 px-3 py-1 rounded-xl bg-red-500/10 border border-red-500/25 text-[10px] font-extrabold text-red-400 tracking-wider">
                                                    VS
                                                </div>
                                                <div className="flex-1 text-center">
                                                    <p className="text-sm font-bold text-surface-100 group-hover:text-red-400 transition-colors truncate">
                                                        {match.away_team?.name}
                                                    </p>
                                                    <p className="text-[10px] text-surface-500">{match.away_team?.region || 'Away'}</p>
                                                </div>
                                            </div>

                                            {/* Set-by-Set Real-time Scores */}
                                            <div className="mt-4 pt-3 border-t border-surface-850/50">
                                                <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-widest text-center mb-2">Skor Per Set</p>
                                                <div className="flex flex-wrap items-center justify-center gap-2">
                                                    {match.sets && match.sets.length > 0 ? (
                                                        match.sets.map((set) => (
                                                            <div 
                                                                key={set.id} 
                                                                className={`px-3 py-1.5 rounded-xl border text-xs font-mono flex items-center gap-1.5 ${
                                                                    set.status === 'live'
                                                                        ? 'bg-red-500/10 border-red-500/30 text-red-300 font-bold'
                                                                        : 'bg-surface-900 border-surface-800 text-surface-400'
                                                                }`}
                                                            >
                                                                <span>Set {set.set_number}:</span>
                                                                <span className={set.status === 'live' ? 'text-red-400 font-extrabold' : 'font-semibold text-surface-200'}>
                                                                    {set.home_score}
                                                                </span>
                                                                <span className="text-surface-600">—</span>
                                                                <span className={set.status === 'live' ? 'text-red-400 font-extrabold' : 'font-semibold text-surface-200'}>
                                                                    {set.away_score}
                                                                </span>
                                                                {set.status === 'live' && (
                                                                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping"></span>
                                                                )}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <span className="text-xs text-surface-500 italic">Inisialisasi set scoring...</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Court and Referee */}
                                            <div className="mt-3 flex items-center justify-between text-[11px] text-surface-500 pl-2">
                                                <span>🏟️ Lapangan {match.court_number || '—'}</span>
                                                {match.referee && <span>🧑‍⚖️ {match.referee.name}</span>}
                                            </div>
                                        </Link>
                                    ))
                                )}
                            </div>
                        )}

                        {/* 📅 UPCOMING TAB */}
                        {activeTab === 'upcoming' && (
                            <div className="space-y-3">
                                {upcomingMatches.length === 0 ? (
                                    <div className="text-center py-16">
                                        <div className="text-4xl mb-3">📅</div>
                                        <p className="text-surface-500 text-sm">Belum ada pertandingan mendatang</p>
                                        <p className="text-xs text-surface-600 mt-1">Jadwal pertandingan yang terjadwal akan muncul di sini</p>
                                    </div>
                                ) : (
                                    upcomingMatches.map((match) => (
                                        <Link
                                            key={match.id}
                                            href={route('matches.show', match.id)}
                                            className="block p-4 rounded-xl bg-surface-950/30 border border-surface-800 hover:border-primary-500/30 transition-all duration-200"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/20">
                                                    Scheduled
                                                </span>
                                                <span className="text-xs text-surface-500 truncate max-w-[180px]">{match.tournament?.name}</span>
                                            </div>
                                            <div className="flex items-center justify-center gap-4 py-2">
                                                <span className="text-sm font-semibold text-surface-200 text-right flex-1 truncate">{match.home_team?.name}</span>
                                                <span className="text-xs font-extrabold text-surface-500 px-2.5 py-1 bg-surface-900 rounded-lg border border-surface-800">VS</span>
                                                <span className="text-sm font-semibold text-surface-200 text-left flex-1 truncate">{match.away_team?.name}</span>
                                            </div>
                                            
                                            <div className="mt-3 pt-2 border-t border-surface-800/40 grid grid-cols-2 text-[11px] text-surface-500">
                                                <div className="flex items-center gap-1">
                                                    <span>📅</span> 
                                                    <span>{match.scheduled_at ? formatDate(match.scheduled_at) : 'Waktu belum diatur'}</span>
                                                </div>
                                                <div className="text-right flex items-center justify-end gap-1">
                                                    <span>🏟️</span>
                                                    <span>Lapangan {match.court_number || 'TBA'}</span>
                                                </div>
                                            </div>
                                        </Link>
                                    ))
                                )}
                            </div>
                        )}

                        {/* 📋 HISTORY TAB */}
                        {activeTab === 'past' && (
                            <div className="space-y-4">
                                {pastMatches.length === 0 ? (
                                    <div className="text-center py-16">
                                        <div className="text-4xl mb-3">📋</div>
                                        <p className="text-surface-500 text-sm">Belum ada riwayat pertandingan</p>
                                        <p className="text-xs text-surface-600 mt-1">Laga yang telah selesai dimainkan akan muncul di sini</p>
                                    </div>
                                ) : (
                                    pastMatches.map((match) => {
                                        const isHomeWinner = match.winner_team_id === match.home_team_id;
                                        const isAwayWinner = match.winner_team_id === match.away_team_id;
                                        const winnerName = isHomeWinner ? match.home_team?.name : (isAwayWinner ? match.away_team?.name : 'Bye/Draw');

                                        return (
                                            <Link
                                                key={match.id}
                                                href={route('matches.show', match.id)}
                                                className="block p-4 rounded-2xl bg-surface-950/25 border border-surface-800 hover:border-blue-500/20 transition-all duration-200"
                                            >
                                                <div className="flex items-center justify-between mb-3 text-[11px] text-surface-500">
                                                    <span className="uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-surface-800 text-surface-400">
                                                        Finished
                                                    </span>
                                                    <span className="truncate max-w-[200px]">{match.tournament?.name}</span>
                                                </div>

                                                {/* Team versus with winner highlighted */}
                                                <div className="flex items-center justify-center gap-4 py-1">
                                                    <div className={`flex-1 text-center ${isHomeWinner ? 'font-bold' : 'opacity-70'}`}>
                                                        <p className={`text-sm ${isHomeWinner ? 'text-emerald-400' : 'text-surface-300'} truncate`}>
                                                            {match.home_team?.name}
                                                        </p>
                                                        {isHomeWinner && <span className="text-[10px] text-emerald-400 font-semibold">🏆 Pemenang</span>}
                                                    </div>
                                                    <span className="text-xs font-bold text-surface-600">VS</span>
                                                    <div className={`flex-1 text-center ${isAwayWinner ? 'font-bold' : 'opacity-70'}`}>
                                                        <p className={`text-sm ${isAwayWinner ? 'text-emerald-400' : 'text-surface-300'} truncate`}>
                                                            {match.away_team?.name}
                                                        </p>
                                                        {isAwayWinner && <span className="text-[10px] text-emerald-400 font-semibold">🏆 Pemenang</span>}
                                                    </div>
                                                </div>

                                                {/* Set-by-Set final scores */}
                                                {match.sets && match.sets.length > 0 && (
                                                    <div className="mt-3 p-2 bg-surface-950/50 border border-surface-850 rounded-xl">
                                                        <div className="flex flex-wrap items-center justify-center gap-2">
                                                            {match.sets.map((set) => (
                                                                <span key={set.id} className="text-[11px] px-2 py-1 bg-surface-900 border border-surface-800 rounded-lg text-surface-400 font-mono">
                                                                    Set {set.set_number}: <span className={set.winner_team_id === match.home_team_id ? 'text-emerald-400 font-bold' : 'text-surface-300'}>{set.home_score}</span> - <span className={set.winner_team_id === match.away_team_id ? 'text-emerald-400 font-bold' : 'text-surface-300'}>{set.away_score}</span>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Contrast Winner Banner */}
                                                <div className="mt-3 flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold">
                                                    <span className="flex items-center gap-1">🥇 Winner:</span>
                                                    <span className="uppercase tracking-wide">{winnerName}</span>
                                                </div>
                                            </Link>
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
