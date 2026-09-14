import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import StatusBadge from '@/Components/StatusBadge';
import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';

export default function TournamentHistory({ tournaments = [], athleteAwards = [] }) {
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
                            Daftar seluruh kejuaraan yang pernah dan sedang diikuti oleh tim-tim binaan Anda beserta status penilaian skor pertandingannya.
                        </p>
                    </div>
                    <Link
                        href={route('coach.tournaments.index')}
                        className="px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold transition-all shadow-md shadow-primary-600/20 flex items-center gap-2 shrink-0 cursor-pointer"
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
                    {filteredTournaments.map((tournament) => (
                        <TournamentCard
                            key={tournament.id}
                            tournament={tournament}
                            formatTournamentMode={formatTournamentMode}
                            formatDate={formatDate}
                        />
                    ))}
                </div>
            )}
        </AuthenticatedLayout>
    );
}

function TournamentCard({ tournament, formatTournamentMode, formatDate }) {
    const [teamScoreFilter, setTeamScoreFilter] = useState('all'); // all, scored, unscored

    const isSchedulePublished = tournament.is_schedule_published || tournament.schedule_status === 'published';
    const matches = tournament.matches || [];

    // Compile all coach teams (regular & super teams)
    const regularTeams = (tournament.teams || []).map(t => ({ ...t, is_super: false }));
    const superTeams = (tournament.super_teams || tournament.superTeams || []).map(st => ({ ...st, is_super: true }));
    const rawTeams = [...regularTeams, ...superTeams];

    // Enrich each team with match assessment data
    const evaluatedTeams = rawTeams.map(team => {
        const teamMatches = matches.filter(m =>
            team.is_super
                ? (m.home_super_team_id === team.id || m.away_super_team_id === team.id)
                : (m.home_team_id === team.id || m.away_team_id === team.id)
        );

        const finishedMatches = teamMatches.filter(m => m.status === 'finished');
        const liveMatches = teamMatches.filter(m => m.status === 'live');

        // Only finished matches count as "Sudah Dinilai"
        const isScored = finishedMatches.length > 0;
        const isLive = !isScored && liveMatches.length > 0;

        // Detail hasil skor hanya untuk pertandingan yang sudah selesai dinilai
        const detailedResults = finishedMatches.map(m => {
            const isHome = team.is_super ? m.home_super_team_id === team.id : m.home_team_id === team.id;
            const opponentName = isHome
                ? (team.is_super ? (m.away_super_team?.name || 'Lawan') : (m.away_team?.name || 'Lawan'))
                : (team.is_super ? (m.home_super_team?.name || 'Lawan') : (m.home_team?.name || 'Lawan'));

            const sets = m.sets || [];
            let mySetsWon = 0;
            let oppSetsWon = 0;
            const setScores = sets.map(s => {
                const myScore = isHome ? Number(s.home_score) || 0 : Number(s.away_score) || 0;
                const oppScore = isHome ? Number(s.away_score) || 0 : Number(s.home_score) || 0;
                if (myScore > oppScore) mySetsWon++;
                else if (oppScore > myScore) oppSetsWon++;
                return `${myScore}-${oppScore}`;
            });

            const isWinner = team.is_super ? m.winner_super_team_id === team.id : m.winner_team_id === team.id;

            return {
                matchId: m.id,
                stage: m.stage,
                matchMode: m.match_mode,
                opponentName,
                setScores,
                mySetsWon,
                oppSetsWon,
                status: m.status,
                isFinished: true,
                isWinner,
            };
        });

        return {
            ...team,
            teamMatches,
            finishedMatches,
            liveMatches,
            isScored,
            isLive,
            detailedResults,
        };
    });

    const scoredCount = evaluatedTeams.filter(t => t.isScored).length;
    const unscoredCount = evaluatedTeams.filter(t => !t.isScored).length;

    const displayedTeams = evaluatedTeams.filter(t => {
        if (teamScoreFilter === 'scored') return t.isScored;
        if (teamScoreFilter === 'unscored') return !t.isScored;
        return true;
    });

    const stageLabels = {
        pool: 'Babak Pool',
        round_of_16: 'Babak 16 Besar',
        quarterfinal: 'Perempat Final',
        semifinal: 'Semifinal',
        third_place: 'Juara 3',
        final: 'Final',
    };

    return (
        <div className="rounded-2xl border border-surface-700/60 bg-surface-900/60 backdrop-blur-md p-6 shadow-xl space-y-5">
            {/* Top Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-surface-800">
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

                {/* Separated Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Button 1: Lihat Bagan */}
                    <Link
                        href={`${route('tournaments.show', tournament.id)}?tab=bracket`}
                        className="px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-bold transition-all border border-purple-500/30 flex items-center gap-1.5 shadow-sm hover:scale-[1.02] cursor-pointer"
                        title="Lihat bagan turnamen dan bracket fase gugur"
                    >
                        <span>👑 Lihat Bagan</span>
                    </Link>

                    {/* Button 2: Lihat Jadwal */}
                    {isSchedulePublished ? (
                        <Link
                            href={route('tournaments.master-schedule.index', tournament.id)}
                            className="px-3.5 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs font-bold transition-all border border-blue-500/30 flex items-center gap-1.5 shadow-sm hover:scale-[1.02] cursor-pointer"
                            title="Lihat Master Schedule resmi turnamen"
                        >
                            <span>🗓️ Lihat Jadwal</span>
                        </Link>
                    ) : (
                        <span
                            className="px-3.5 py-2 rounded-xl bg-surface-800/80 text-surface-500 text-xs font-medium border border-surface-700/60 flex items-center gap-1.5 cursor-not-allowed select-none"
                            title="Jadwal pertandingan resmi belum dipublikasikan oleh panitia pelaksana"
                        >
                            <span>🔒 Jadwal Belum Dipublish</span>
                        </span>
                    )}
                </div>
            </div>

            {/* Summary Score Assessment Bar */}
            <div className="p-3.5 rounded-xl bg-surface-950/60 border border-surface-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-bold text-surface-300 flex items-center gap-1.5">
                        <span>📊 Status Penilaian Tim:</span>
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-surface-850 text-surface-200 border border-surface-700 font-semibold">
                        Total: <strong>{evaluatedTeams.length}</strong> Tim
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1">
                        <span>✓</span> Sudah Dinilai: <strong>{scoredCount}</strong> Tim
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold flex items-center gap-1">
                        <span>⏳</span> Belum Dinilai: <strong>{unscoredCount}</strong> Tim
                    </span>
                </div>

                <div className="flex items-center gap-1 text-[11px]">
                    <span className="text-surface-500 mr-1">Filter Tim:</span>
                    <button
                        onClick={() => setTeamScoreFilter('all')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                            teamScoreFilter === 'all'
                                ? 'bg-primary-600 text-white'
                                : 'bg-surface-800 text-surface-400 hover:text-surface-200'
                        }`}
                    >
                        Semua ({evaluatedTeams.length})
                    </button>
                    <button
                        onClick={() => setTeamScoreFilter('scored')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                            teamScoreFilter === 'scored'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-surface-800 text-surface-400 hover:text-surface-200'
                        }`}
                    >
                        ✓ Sudah Dinilai ({scoredCount})
                    </button>
                    <button
                        onClick={() => setTeamScoreFilter('unscored')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                            teamScoreFilter === 'unscored'
                                ? 'bg-amber-600 text-white'
                                : 'bg-surface-800 text-surface-400 hover:text-surface-200'
                        }`}
                    >
                        ⏳ Belum ({unscoredCount})
                    </button>
                </div>
            </div>

            {/* Teams and Matches Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Column 1: Daftar Tim Binaan & Status Skor (7 Cols) */}
                <div className="lg:col-span-7 p-4 rounded-xl bg-surface-950/40 border border-surface-800 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-surface-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                            <span>👥</span> Tim Binaan & Hasil Penilaian Skor ({displayedTeams.length})
                        </span>
                        {teamScoreFilter !== 'all' && (
                            <button
                                onClick={() => setTeamScoreFilter('all')}
                                className="text-[10px] text-primary-400 hover:text-primary-300 font-semibold lowercase cursor-pointer"
                            >
                                reset filter
                            </button>
                        )}
                    </h4>

                    {displayedTeams.length === 0 ? (
                        <div className="p-6 text-center text-xs text-surface-500 italic bg-surface-900/30 rounded-xl border border-surface-850">
                            Tidak ada tim binaan pada filter ini.
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                            {displayedTeams.map((team) => (
                                <div
                                    key={`${team.is_super ? 'super' : 'reg'}-${team.id}`}
                                    className={`p-3.5 rounded-xl border transition-all text-xs space-y-2.5 ${
                                        team.isScored
                                            ? 'bg-surface-900/70 border-emerald-500/30 shadow-sm'
                                            : 'bg-surface-900/40 border-surface-800'
                                    }`}
                                >
                                    {/* Team Header */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-bold text-surface-100 text-sm truncate">
                                                    {team.is_super ? '🏆' : '👥'} {team.name}
                                                </span>
                                                {team.is_super && (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                                        Super Team
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-surface-400 mt-0.5">
                                                {team.region || 'Tanpa Wilayah'} • {team.is_super ? `${team.members?.length || 0}/3 Sub-Tim` : `${team.athletes?.length || 0} Atlet`}
                                            </p>
                                        </div>

                                        {/* Status Penilaian Badge */}
                                        {team.isScored ? (
                                            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold text-[11px] flex items-center gap-1 shrink-0 shadow-sm">
                                                <span>✓</span> Sudah Dinilai
                                            </span>
                                        ) : team.isLive ? (
                                            <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold text-[11px] flex items-center gap-1 shrink-0">
                                                <span>⚡</span> Sedang Berjalan
                                            </span>
                                        ) : (
                                            <span className="px-2.5 py-1 rounded-lg bg-surface-800 text-surface-400 border border-surface-700 font-bold text-[11px] flex items-center gap-1 shrink-0">
                                                <span>⏳</span> Belum Dinilai
                                            </span>
                                        )}
                                    </div>

                                    {/* Score Results or Pending Notice */}
                                    {team.isScored ? (
                                        <div className="space-y-1.5 pt-2 border-t border-surface-800/80">
                                            <p className="text-[10px] uppercase font-bold tracking-wider text-surface-400 flex items-center justify-between">
                                                <span>🎯 Hasil Set Pertandingan ({team.detailedResults.length} Laga Selesai):</span>
                                            </p>
                                            <div className="space-y-1.5">
                                                {team.detailedResults.map((res, rIdx) => (
                                                    <div
                                                        key={rIdx}
                                                        className="p-2 rounded-lg bg-surface-950/70 border border-surface-800 flex items-center justify-between gap-2 flex-wrap"
                                                    >
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface-800 text-surface-300 font-semibold">
                                                                    {stageLabels[res.stage] || res.stage}
                                                                </span>
                                                                <span className="text-surface-200 font-medium truncate">
                                                                    vs <strong className="text-surface-100">{res.opponentName}</strong>
                                                                </span>
                                                            </div>
                                                            {res.setScores && res.setScores.length > 0 && (
                                                                <p className="text-[11px] text-surface-400 mt-1 font-mono">
                                                                    Skor: <span className="text-primary-300 font-bold">{res.setScores.join(', ')}</span>
                                                                </p>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-2 shrink-0">
                                                            {res.isWinner ? (
                                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                                    🏆 Menang ({res.mySetsWon}-{res.oppSetsWon})
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                                                                    Kalah ({res.mySetsWon}-{res.oppSetsWon})
                                                                </span>
                                                            )}
                                                            <Link
                                                                href={route('matches.show', res.matchId)}
                                                                className="text-[11px] font-bold text-primary-400 hover:text-primary-300 underline cursor-pointer"
                                                            >
                                                                Detail
                                                            </Link>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : team.isLive ? (
                                        <div className="p-2.5 rounded-lg bg-surface-950/40 border border-amber-500/20 text-[11px] text-amber-300/90 flex items-center gap-2">
                                            <span>⚡</span>
                                            <span>Pertandingan sedang berjalan. Skor dan hasil detail akan ditampilkan setelah pertandingan selesai dinilai wasit.</span>
                                        </div>
                                    ) : (
                                        <div className="p-2.5 rounded-lg bg-surface-950/40 border border-surface-800/80 text-[11px] text-surface-400 flex items-center gap-2">
                                            <span>ℹ️</span>
                                            <span>
                                                Tim ini belum memiliki catatan nilai skor dari wasit.
                                                {isSchedulePublished
                                                    ? ' Menunggu pertandingan dimainkan dan dinilai oleh wasit pertandingan.'
                                                    : ' Menunggu jadwal resmi turnamen dipublikasikan panitia.'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Column 2: Ringkasan Riwayat Laga Turnamen (5 Cols) */}
                <div className="lg:col-span-5 p-4 rounded-xl bg-surface-950/40 border border-surface-800 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-surface-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                            <span>⚔️</span> Semua Laga Binaan ({matches.length} Laga)
                        </span>
                        {isSchedulePublished ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/20">
                                Jadwal Terbit
                            </span>
                        ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/20">
                                Draft Jadwal
                            </span>
                        )}
                    </h4>

                    {!isSchedulePublished ? (
                        <div className="p-8 text-center text-xs text-surface-400 bg-surface-900/40 rounded-xl border border-dashed border-surface-800 space-y-2">
                            <div className="text-2xl">🔒</div>
                            <p className="font-bold text-surface-200">Jadwal Belum Dipublikasikan</p>
                            <p className="text-[11px] text-surface-500 max-w-xs mx-auto">
                                Rincian laga dan jadwal resmi turnamen ini belum dipublikasikan oleh panitia pelaksana.
                            </p>
                        </div>
                    ) : matches.length === 0 ? (
                        <p className="text-xs text-surface-500 italic py-6 text-center">Belum ada pertandingan yang dijadwalkan.</p>
                    ) : (
                        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                            {matches.map((m) => {
                                const homeName = m.home_team?.name || m.home_super_team?.name || 'Home';
                                const awayName = m.away_team?.name || m.away_super_team?.name || 'Away';
                                const isFinished = m.status === 'finished';

                                if (isFinished) {
                                    return (
                                        <Link
                                            key={m.id}
                                            href={route('matches.show', m.id)}
                                            className="p-2.5 rounded-lg bg-surface-900/60 hover:bg-surface-900 border border-surface-850 hover:border-primary-500/30 text-xs transition-colors block cursor-pointer"
                                        >
                                            <div className="flex items-center justify-between gap-2 font-medium">
                                                <span className="truncate flex-1 font-bold text-surface-200">{homeName}</span>
                                                <div className="font-mono px-2 py-0.5 rounded bg-black/50 text-primary-300 text-[11px] shrink-0 border border-surface-800">
                                                    {m.sets && m.sets.length > 0 ? (
                                                        m.sets.map((s, i) => `${i > 0 ? ', ' : ''}${s.home_score}-${s.away_score}`)
                                                    ) : (
                                                        <span>Selesai</span>
                                                    )}
                                                </div>
                                                <span className="truncate flex-1 text-right font-bold text-surface-200">{awayName}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-[10px] text-surface-500 mt-1 pt-1 border-t border-surface-850">
                                                <span>{stageLabels[m.stage] || m.stage}</span>
                                                <span className="text-emerald-400 font-semibold">✓ Selesai • Lihat Detail →</span>
                                            </div>
                                        </Link>
                                    );
                                }

                                return (
                                    <div
                                        key={m.id}
                                        className="p-2.5 rounded-lg bg-surface-900/40 border border-surface-850 text-xs select-none"
                                    >
                                        <div className="flex items-center justify-between gap-2 font-medium">
                                            <span className="truncate flex-1 font-semibold text-surface-300">{homeName}</span>
                                            <div className="px-2 py-0.5 rounded bg-surface-950 text-amber-300 text-[11px] shrink-0 border border-surface-800 font-semibold">
                                                {m.status === 'live' ? '⚡ Sedang Berjalan' : 'Terjadwal'}
                                            </div>
                                            <span className="truncate flex-1 text-right font-semibold text-surface-300">{awayName}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[10px] text-surface-500 mt-1 pt-1 border-t border-surface-850">
                                            <span>{stageLabels[m.stage] || m.stage}</span>
                                            <span className="text-amber-400/80">
                                                {m.status === 'live' ? '⚡ Laga sedang berlangsung' : 'Menunggu pertandingan'}
                                            </span>
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
}
