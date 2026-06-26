import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import StatusBadge from '@/Components/StatusBadge';
import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';

export default function MatchShow({ match: m }) {
    const [setFilter, setSetFilter] = useState('all');
    const finishedSets = m.sets?.filter(s => s.status === 'finished') || [];
    const setsWonHome = finishedSets.filter(s => s.winner_team_id === m.home_team_id).length;
    const setsWonAway = finishedSets.filter(s => s.winner_team_id === m.away_team_id).length;

    const getTeamStats = (teamId, setId = null) => {
        let stats = [];
        if (setId === 'all') {
            m.sets?.forEach(s => {
                s.stats?.forEach(st => {
                    if (st.team_id === teamId) stats.push(st);
                });
            });
        } else {
            const set = m.sets?.find(s => s.id === setId);
            stats = set?.stats?.filter(st => st.team_id === teamId) || [];
        }
        return stats;
    };

    const aggregateStats = (stats) => {
        const agg = {
            service_in: 0, service_ace: 0, service_error: 0,
            receive_success: 0, receive_fail: 0,
            feeding_success: 0, feeding_fail: 0,
            strike_success: 0, strike_fail: 0,
            block_success: 0, block_fail: 0,
        };
        stats.forEach(s => {
            Object.keys(agg).forEach(k => { agg[k] += s[k] || 0; });
        });
        return agg;
    };

    const currentFilter = setFilter === 'all' ? 'all' : parseInt(setFilter);
    const homeStats = aggregateStats(getTeamStats(m.home_team_id, currentFilter === 'all' ? 'all' : m.sets?.find(s => s.set_number === currentFilter)?.id));
    const awayStats = aggregateStats(getTeamStats(m.away_team_id, currentFilter === 'all' ? 'all' : m.sets?.find(s => s.set_number === currentFilter)?.id));

    const statRows = [
        { label: 'Servis In', key: 'service_in' },
        { label: 'Servis Ace', key: 'service_ace' },
        { label: 'Servis Error', key: 'service_error' },
        { label: 'Receive ✓', key: 'receive_success' },
        { label: 'Receive ✗', key: 'receive_fail' },
        { label: 'Feeding ✓', key: 'feeding_success' },
        { label: 'Feeding ✗', key: 'feeding_fail' },
        { label: 'Strike ✓', key: 'strike_success' },
        { label: 'Strike ✗', key: 'strike_fail' },
        { label: 'Block ✓', key: 'block_success' },
        { label: 'Block ✗', key: 'block_fail' },
    ];

    return (
        <AuthenticatedLayout header="Detail Pertandingan">
            <Head title={`${m.home_team?.name || 'TBD'} vs ${m.away_team?.name || 'TBD'}`} />

            <div className="mb-4">
                <Link href={route('matches.index')} className="text-sm text-surface-500 hover:text-surface-300 transition-colors flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    Kembali
                </Link>
            </div>

            {/* Scoreboard */}
            <div className="rounded-2xl border border-surface-700/50 bg-gradient-to-b from-surface-900 to-surface-800 p-6 mb-6 text-center">
                <div className="flex items-center gap-2 justify-center mb-4">
                    <StatusBadge status={m.status} size="md" />
                    <StatusBadge status={m.stage} size="md" />
                </div>
                <p className="text-xs text-surface-500 mb-4">{m.tournament?.name}</p>

                <div className="flex items-center justify-center gap-8 sm:gap-16">
                    <div className="text-center">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500/30 to-primary-600/20 flex items-center justify-center text-2xl font-bold text-primary-300 mx-auto mb-2">
                            {m.home_team?.name?.charAt(0)}
                        </div>
                        <p className="text-sm font-semibold text-surface-200">{m.home_team?.name || 'TBD'}</p>
                        <p className="text-4xl font-black text-primary-400 mt-2">{setsWonHome}</p>
                    </div>
                    <div className="text-surface-600 text-2xl font-black">VS</div>
                    <div className="text-center">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-500/30 to-accent-600/20 flex items-center justify-center text-2xl font-bold text-accent-300 mx-auto mb-2">
                            {m.away_team?.name?.charAt(0)}
                        </div>
                        <p className="text-sm font-semibold text-surface-200">{m.away_team?.name || 'TBD'}</p>
                        <p className="text-4xl font-black text-accent-400 mt-2">{setsWonAway}</p>
                    </div>
                </div>

                {/* Set Scores */}
                {finishedSets.length > 0 && (
                    <div className="flex justify-center gap-3 mt-6">
                        {m.sets?.map((set) => (
                            <div key={set.id} className={`px-4 py-2 rounded-xl border text-center ${set.status === 'finished' ? 'border-surface-600/50 bg-surface-800/50' : 'border-surface-700/30 bg-surface-900/30'}`}>
                                <p className="text-[10px] text-surface-500 mb-1">Set {set.set_number}</p>
                                <p className="text-sm font-bold">
                                    <span className={set.winner_team_id === m.home_team_id ? 'text-primary-400' : 'text-surface-400'}>{set.home_score}</span>
                                    <span className="text-surface-600 mx-1">-</span>
                                    <span className={set.winner_team_id === m.away_team_id ? 'text-accent-400' : 'text-surface-400'}>{set.away_score}</span>
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex justify-center gap-4 mt-4 text-xs text-surface-500">
                    {m.referee && <span>🧑‍⚖️ {m.referee.name}</span>}
                    {m.court_number && <span>📍 Lapangan {m.court_number}</span>}
                </div>
            </div>

            {/* Stats Comparison */}
            <div className="rounded-xl border border-surface-700/50 bg-surface-900/50 overflow-hidden">
                <div className="px-5 py-4 border-b border-surface-700/50 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-surface-100">📊 Statistik Performa</h2>
                    <div className="flex gap-1">
                        <button
                            onClick={() => setSetFilter('all')}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${setFilter === 'all' ? 'bg-primary-600/20 text-primary-300 border border-primary-500/30' : 'text-surface-400 hover:bg-surface-800'}`}
                        >
                            All Sets
                        </button>
                        {m.sets?.map((s) => (
                            <button
                                key={s.set_number}
                                onClick={() => setSetFilter(s.set_number)}
                                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${setFilter === s.set_number ? 'bg-primary-600/20 text-primary-300 border border-primary-500/30' : 'text-surface-400 hover:bg-surface-800'}`}
                            >
                                Set {s.set_number}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-surface-700/30">
                                <th className="px-5 py-3 text-right text-xs font-semibold text-primary-400 w-1/3">{m.home_team?.name}</th>
                                <th className="px-5 py-3 text-center text-xs font-semibold text-surface-400">Statistik</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-accent-400 w-1/3">{m.away_team?.name}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-700/20">
                            {statRows.map((row) => {
                                const hv = homeStats[row.key];
                                const av = awayStats[row.key];
                                const total = hv + av;
                                const hp = total > 0 ? (hv / total) * 100 : 50;
                                return (
                                    <tr key={row.key} className="hover:bg-surface-800/30 transition-colors">
                                        <td className="px-5 py-3 text-right">
                                            <span className="text-sm font-semibold text-surface-200">{hv}</span>
                                        </td>
                                        <td className="px-5 py-3 text-center">
                                            <p className="text-xs text-surface-400 mb-1.5">{row.label}</p>
                                            <div className="flex h-1.5 rounded-full overflow-hidden bg-surface-700">
                                                <div className="bg-primary-500 transition-all duration-500" style={{ width: `${hp}%` }} />
                                                <div className="bg-accent-500 transition-all duration-500" style={{ width: `${100 - hp}%` }} />
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-left">
                                            <span className="text-sm font-semibold text-surface-200">{av}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
