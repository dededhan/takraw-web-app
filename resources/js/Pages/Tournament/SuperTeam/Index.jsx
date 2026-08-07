import { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

/**
 * SuperTeam/Index — Manajemen Super Team (team_regu / team_double).
 * Satu Super Team = 3 tim regu anggota.
 */
export default function SuperTeamIndex({ tournament, superTeams, availableTeams, usedTeamIds }) {
    const [showCreate, setShowCreate] = useState(false);
    const [expandedId, setExpandedId] = useState(null);

    const { data, setData, post, processing, reset, errors } = useForm({
        name:       '',
        match_mode: 'team_regu',
    });

    const handleCreate = (e) => {
        e.preventDefault();
        post(route('tournaments.super-teams.store', tournament.id), {
            onSuccess: () => { reset(); setShowCreate(false); },
        });
    };

    const handleAddMember = (superTeamId, teamId) => {
        router.post(route('super-teams.members.add', superTeamId), { team_id: teamId }, {
            preserveScroll: true,
        });
    };

    const handleRemoveMember = (superTeamId, teamId) => {
        if (!confirm('Hapus tim dari Super Team ini?')) return;
        router.delete(route('super-teams.members.remove', { superTeam: superTeamId, team: teamId }), {
            preserveScroll: true,
        });
    };

    const allSuperTeams = Object.values(superTeams).flat();

    return (
        <AuthenticatedLayout header={
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <a href={route('tournaments.show', tournament.id)}
                        className="text-gray-400 hover:text-gray-600 text-sm">← {tournament.name}</a>
                    <span className="text-gray-300">/</span>
                    <h2 className="text-xl font-bold text-gray-900">Manajemen Super Team</h2>
                </div>
                <button onClick={() => setShowCreate(!showCreate)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700">
                    + Buat Super Team
                </button>
            </div>
        }>
            <Head title={`Super Team — ${tournament.name}`} />

            <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
                {/* Create Form */}
                {showCreate && (
                    <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-6">
                        <h3 className="font-bold text-gray-900 mb-4">Buat Super Team Baru</h3>
                        <form onSubmit={handleCreate} className="flex gap-3 items-end">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Super Team</label>
                                <input type="text"
                                    placeholder='e.g. "TRA (Team Regu Putra)"'
                                    value={data.name}
                                    onChange={e => setData('name', e.target.value)}
                                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
                                <select value={data.match_mode} onChange={e => setData('match_mode', e.target.value)}
                                    className="rounded-xl border border-gray-200 px-3 py-2 text-sm">
                                    <option value="team_regu">🏆 Team Regu</option>
                                    <option value="team_double">🥇 Team Double</option>
                                </select>
                            </div>
                            <button type="submit" disabled={processing}
                                className="bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                                Buat
                            </button>
                            <button type="button" onClick={() => setShowCreate(false)}
                                className="bg-gray-100 text-gray-600 px-4 py-2 rounded-xl text-sm hover:bg-gray-200">
                                Batal
                            </button>
                        </form>
                    </div>
                )}

                {/* Super Team List */}
                {allSuperTeams.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                        <div className="text-5xl mb-4">🏆</div>
                        <p className="text-gray-500 font-medium">Belum ada Super Team.</p>
                        <p className="text-gray-400 text-sm mt-1">Klik "Buat Super Team" untuk membuat Super Team pertama.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {['team_regu', 'team_double'].map(mode => {
                            const modeTeams = superTeams[mode] || [];
                            if (!modeTeams.length) return null;

                            const modeLabel = mode === 'team_regu' ? '🏆 Team Regu' : '🥇 Team Double';
                            const modeColor = mode === 'team_regu' ? '#d97706' : '#dc2626';

                            return (
                                <div key={mode}>
                                    <h3 className="text-sm font-bold uppercase tracking-wide mb-3"
                                        style={{ color: modeColor }}>
                                        {modeLabel}
                                    </h3>
                                    <div className="grid gap-4">
                                        {modeTeams.map(st => (
                                            <SuperTeamCard
                                                key={st.id}
                                                superTeam={st}
                                                availableTeams={availableTeams}
                                                usedTeamIds={usedTeamIds}
                                                isExpanded={expandedId === st.id}
                                                onToggle={() => setExpandedId(expandedId === st.id ? null : st.id)}
                                                onAddMember={handleAddMember}
                                                onRemoveMember={handleRemoveMember}
                                                modeColor={modeColor}
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}

function SuperTeamCard({ superTeam, availableTeams, usedTeamIds, isExpanded, onToggle, onAddMember, onRemoveMember, modeColor }) {
    const members      = superTeam.members || [];
    const isComplete   = members.length >= 3;
    const [addingId, setAddingId] = useState('');

    const freeTeams = availableTeams.filter(t =>
        !usedTeamIds.includes(t.id) || members.some(m => m.id === t.id)
    );

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Header */}
            <div
                className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={onToggle}
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                        style={{ backgroundColor: modeColor }}>
                        {superTeam.name.charAt(0)}
                    </div>
                    <div>
                        <p className="font-semibold text-gray-900">{superTeam.name}</p>
                        <p className="text-xs text-gray-400">{members.length}/3 tim anggota</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        isComplete ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-600'
                    }`}>
                        {isComplete ? '✓ Lengkap' : 'Belum Lengkap'}
                    </span>
                    <span className="text-gray-400 text-sm">{isExpanded ? '▲' : '▼'}</span>
                </div>
            </div>

            {/* Expanded: member list */}
            {isExpanded && (
                <div className="border-t border-gray-100 px-5 py-4 space-y-3">
                    {/* Member list */}
                    {members.map((m, i) => (
                        <div key={m.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
                            <div className="flex items-center gap-3">
                                <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                                    {i + 1}
                                </span>
                                <div>
                                    <p className="text-sm font-medium text-gray-800">{m.name}</p>
                                    <p className="text-xs text-gray-400">{m.region}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => onRemoveMember(superTeam.id, m.id)}
                                className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">
                                Hapus
                            </button>
                        </div>
                    ))}

                    {/* Add member */}
                    {!isComplete && (
                        <div className="flex gap-2">
                            <select
                                value={addingId}
                                onChange={e => setAddingId(e.target.value)}
                                className="flex-1 text-sm rounded-xl border border-gray-200 px-3 py-2">
                                <option value="">— Pilih Tim —</option>
                                {freeTeams.filter(t => !members.some(m => m.id === t.id)).map(t => (
                                    <option key={t.id} value={t.id}>{t.name} ({t.region})</option>
                                ))}
                            </select>
                            <button
                                onClick={() => { if (addingId) { onAddMember(superTeam.id, +addingId); setAddingId(''); } }}
                                disabled={!addingId}
                                className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                                + Tambah
                            </button>
                        </div>
                    )}

                    {isComplete && (
                        <p className="text-center text-sm text-green-600 font-medium py-2">
                            ✅ Super Team sudah lengkap (3/3 anggota)
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
