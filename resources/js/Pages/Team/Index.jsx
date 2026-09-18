import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Pagination from '@/Components/Pagination';
import ConfirmDialog from '@/Components/ConfirmDialog';
import BulkImportAthletesModal from '@/Components/Team/BulkImportAthletesModal';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';

export default function TeamIndex({ teams, superTeams = [], allCoachTeams = [], coaches = [], tournaments = [], filters = {} }) {
    const { auth } = usePage().props;
    const isCoach = auth.user?.role === 'coach';
    const isAdmin = auth.user?.role === 'admin';
    const canManageSuperTeams = isAdmin || isCoach;

    const [search, setSearch] = useState(filters?.search || '');
    const [selectedCoachId, setSelectedCoachId] = useState(filters?.coach_id || '');
    const isFirstRender = useRef(true);

    const handleSearch = (searchTerm, coachId = selectedCoachId) => {
        router.get(
            route('teams.index'),
            {
                search: searchTerm ? searchTerm.trim() : undefined,
                coach_id: coachId || undefined,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    // Debounce search input
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const timer = setTimeout(() => {
            handleSearch(search, selectedCoachId);
        }, 350);

        return () => clearTimeout(timer);
    }, [search]);

    const handleCoachChange = (e) => {
        const newCoachId = e.target.value;
        setSelectedCoachId(newCoachId);
        handleSearch(search, newCoachId);
    };

    const handleClearSearch = () => {
        setSearch('');
        setSelectedCoachId('');
        router.get(
            route('teams.index'),
            {},
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    const [activeTab, setActiveTab] = useState('single'); // single, super
    const [deletingTeamId, setDeletingTeamId] = useState(null);
    const [deletingSuperTeamId, setDeletingSuperTeamId] = useState(null);
    const [isSuperTeamModalOpen, setIsSuperTeamModalOpen] = useState(false);
    const [editingSuperTeam, setEditingSuperTeam] = useState(null);
    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

    // Initial athletes roster template (same clean format as regular team)
    const emptyAthlete = () => ({ name: '', jersey_number: '', position: 'Tekong', photo: null });

    const { data: stData, setData: setStData, post: postSt, processing: stProcessing, errors: stErrors, reset: resetSt } = useForm({
        name: '',
        region: '',
        coach_id: '',
        tournament_id: '',
        athletes: [emptyAthlete()],
    });

    const handleOpenCreateModal = () => {
        setEditingSuperTeam(null);
        resetSt();
        setStData({
            name: '',
            region: '',
            coach_id: '',
            tournament_id: '',
            athletes: [emptyAthlete()],
        });
        setIsSuperTeamModalOpen(true);
    };

    const handleOpenEditModal = (st) => {
        setEditingSuperTeam(st);
        const allAthletes = (st.members || []).flatMap(m => m.athletes || []);
        const formattedAthletes = allAthletes.length > 0
            ? allAthletes.map(a => ({
                id: a.id,
                name: a.name,
                jersey_number: String(a.jersey_number),
                position: a.position || 'Tekong',
                photo: null,
                photo_url: a.photo ? `/storage/${a.photo}` : null,
            }))
            : [emptyAthlete()];

        setStData({
            name: st.name,
            region: st.members?.[0]?.region || '',
            coach_id: st.coach_id || '',
            tournament_id: st.tournament_id || '',
            athletes: formattedAthletes,
        });
        setIsSuperTeamModalOpen(true);
    };

    const addAthlete = () => {
        const nextJersey = stData.athletes.length + 1;
        setStData('athletes', [
            ...stData.athletes,
            { name: '', jersey_number: String(nextJersey), position: 'Tekong', photo: null },
        ]);
    };

    const removeAthlete = (index) => {
        if (stData.athletes.length <= 1) return;
        setStData('athletes', stData.athletes.filter((_, i) => i !== index));
    };

    const updateAthlete = (index, field, value) => {
        const updated = [...stData.athletes];
        updated[index] = { ...updated[index], [field]: value };
        setStData('athletes', updated);
    };

    const [isParsingSuperTeamFile, setIsParsingSuperTeamFile] = useState(false);

    const handleExcelUpload = async (file) => {
        if (!file) return;

        setIsParsingSuperTeamFile(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            const response = await fetch(route('teams.parse-athletes-file'), {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': csrfToken || '',
                    'Accept': 'application/json',
                },
                body: formData,
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                alert(result.message || 'Gagal membaca file Excel/CSV.');
                return;
            }

            if (result.athletes && result.athletes.length > 0) {
                const mappedAthletes = result.athletes.map((ath) => ({
                    name: ath.name,
                    jersey_number: String(ath.jersey_number),
                    position: ath.position || 'Tekong',
                    photo: null,
                }));

                setStData('athletes', mappedAthletes);

                if (result.duplicate_jerseys && result.duplicate_jerseys.length > 0) {
                    alert(`✅ Berhasil membaca ${result.count} atlet dari Excel.\n⚠️ Perhatian: Terdapat nomor punggung kembar (#${result.duplicate_jerseys.join(', #')}). Harap pastikan setiap nomor punggung unik.`);
                } else {
                    alert(`✅ Berhasil membaca ${result.count} atlet dari file Excel! Data terisi otomatis.`);
                }
            } else {
                alert('Tidak ada data atlet valid yang ditemukan di file tersebut.');
            }
        } catch (error) {
            console.error('Error parsing super team excel:', error);
            alert('Terjadi kesalahan saat memproses file Excel.');
        } finally {
            setIsParsingSuperTeamFile(false);
        }
    };

    const handleDeleteTeam = () => {
        if (!deletingTeamId) return;
        router.delete(route('teams.destroy', deletingTeamId), {
            onFinish: () => setDeletingTeamId(null),
        });
    };

    const handleDeleteSuperTeam = () => {
        if (!deletingSuperTeamId) return;
        router.delete(route('super-teams.destroy', deletingSuperTeamId), {
            onFinish: () => setDeletingSuperTeamId(null),
        });
    };

    const handleSaveSuperTeam = (e) => {
        e.preventDefault();

        // Check for duplicate jersey numbers
        const jerseys = stData.athletes
            .map(a => (a.jersey_number !== '' && a.jersey_number !== null && a.jersey_number !== undefined) ? parseInt(a.jersey_number, 10) : null)
            .filter(n => n !== null && !isNaN(n));
        const dups = jerseys.filter((n, idx) => jerseys.indexOf(n) !== idx);
        if (dups.length > 0) {
            alert(`Terdapat nomor punggung duplikat (#${Array.from(new Set(dups)).join(', #')}). Pastikan seluruh nomor punggung unik dalam satu tim.`);
            return;
        }

        if (editingSuperTeam) {
            postSt(route('super-teams.update-unified', editingSuperTeam.id), {
                onSuccess: () => {
                    setIsSuperTeamModalOpen(false);
                    setEditingSuperTeam(null);
                    resetSt();
                },
            });
        } else {
            postSt(route('super-teams.store-unified'), {
                onSuccess: () => {
                    setIsSuperTeamModalOpen(false);
                    resetSt();
                },
            });
        }
    };

    return (
        <AuthenticatedLayout header="Manajemen Tim">
            <Head title="Manajemen Team Unit & Team Squad" />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-surface-100 flex items-center gap-2">
                        <span>👥 Team Unit & Team Squad</span>
                    </h2>
                    <p className="text-sm text-surface-400 mt-1">
                        Kelola Team Unit serta Team Squad untuk turnamen.
                    </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    {isAdmin && (
                        <button
                            type="button"
                            onClick={() => setIsBulkImportOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
                        >
                            <span>📥 Import Excel Pemain</span>
                        </button>
                    )}

                    <Link
                        href={route('teams.create')}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 text-white text-xs font-bold hover:bg-primary-500 transition-colors shadow-glow-primary cursor-pointer"
                    >
                        <span>+ Daftarkan Team Unit</span>
                    </Link>

                    {canManageSuperTeams && (
                        <button
                            onClick={handleOpenCreateModal}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/20 cursor-pointer"
                        >
                            <span>🏆 + Buat Team Squad</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Search and Filter Toolbar */}
            <div className="bg-surface-900/80 border border-surface-700/60 rounded-2xl p-4 mb-6 backdrop-blur-sm shadow-md">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    {/* Search Input Box */}
                    <div className="flex-1 relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-surface-400">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={isAdmin ? "🔍 Cari nama tim, daerah, pelatih, atau nama atlet..." : "🔍 Cari nama tim, asal daerah, atau nama atlet..."}
                            className="w-full bg-surface-950 border border-surface-700 text-surface-100 rounded-xl pl-10 pr-10 py-2.5 text-xs font-medium focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors placeholder:text-surface-500"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch('')}
                                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-surface-400 hover:text-surface-200 text-xs font-bold cursor-pointer"
                                title="Hapus teks pencarian"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {/* Coach Filter Dropdown for Admin */}
                    {isAdmin && coaches && coaches.length > 0 && (
                        <div className="sm:w-56 shrink-0">
                            <select
                                value={selectedCoachId}
                                onChange={handleCoachChange}
                                className="w-full bg-surface-950 border border-surface-700 text-surface-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:border-primary-500 focus:ring-1 focus:ring-primary-500 cursor-pointer"
                            >
                                <option value="">🧑‍🏫 Semua Pelatih</option>
                                {coaches.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        🧑‍🏫 {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Reset All Filters Button */}
                    {(search || selectedCoachId) && (
                        <button
                            type="button"
                            onClick={handleClearSearch}
                            className="px-3.5 py-2.5 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-300 hover:text-white text-xs font-bold transition-all border border-surface-700 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                        >
                            <span>✕</span>
                            <span>Reset</span>
                        </button>
                    )}
                </div>

                {/* Active Search / Filter Indicator Badge */}
                {(search || selectedCoachId) && (
                    <div className="mt-3 pt-3 border-t border-surface-800/80 flex items-center justify-between flex-wrap gap-2 text-xs">
                        <div className="flex items-center gap-2 flex-wrap text-surface-300">
                            <span>Hasil pencarian untuk:</span>
                            {search && (
                                <span className="px-2.5 py-0.5 rounded-full bg-primary-500/20 text-primary-300 border border-primary-500/30 font-bold">
                                    Kata kunci: "{search}"
                                </span>
                            )}
                            {selectedCoachId && (
                                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                                    Pelatih: {coaches.find(c => String(c.id) === String(selectedCoachId))?.name || 'Terpilih'}
                                </span>
                            )}
                        </div>
                        <span className="text-surface-400 font-mono text-[11px]">
                            Ditemukan: <strong className="text-white">{teams.total ?? teams.data?.length ?? 0}</strong> Tim Unit & <strong className="text-white">{superTeams.length}</strong> Team Squad
                        </span>
                    </div>
                )}
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-2 mb-6 border-b border-surface-800 pb-3">
                <button
                    onClick={() => setActiveTab('single')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        activeTab === 'single'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-surface-900 text-surface-400 hover:text-surface-200 border border-surface-800'
                    }`}
                >
                    <span>👥 Team Unit (Regu / Double / Quadrant)</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                        activeTab === 'single' ? 'bg-black/30 text-white' : 'bg-surface-800 text-surface-400'
                    }`}>
                        {teams.total ?? teams.data?.length ?? 0}
                    </span>
                </button>

                <button
                    onClick={() => setActiveTab('super')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        activeTab === 'super'
                            ? 'bg-purple-600 text-white shadow-md'
                            : 'bg-surface-900 text-surface-400 hover:text-surface-200 border border-surface-800'
                    }`}
                >
                    <span>🏆 Team Squad</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                        activeTab === 'super' ? 'bg-black/30 text-white' : 'bg-surface-800 text-surface-400'
                    }`}>
                        {superTeams.length}
                    </span>
                </button>
            </div>

            {/* TAB 1: REGULAR TEAMS */}
            {activeTab === 'single' && (
                <div>
                    {teams.data.length === 0 ? (
                        (search || selectedCoachId) ? (
                            <div className="text-center py-16 rounded-2xl border border-dashed border-surface-700/50 bg-surface-900/30">
                                <div className="text-5xl mb-4">🔍</div>
                                <h3 className="text-base font-bold text-surface-200">Tidak Ada Tim Unit yang Cocok</h3>
                                <p className="text-surface-400 text-xs mt-1 max-w-sm mx-auto">
                                    Tidak ditemukan tim unit yang sesuai dengan pencarian Anda. Silakan coba kata kunci lain atau reset pencarian.
                                </p>
                                <button
                                    type="button"
                                    onClick={handleClearSearch}
                                    className="inline-block mt-4 px-4 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-white text-xs font-bold border border-surface-700 shadow-md cursor-pointer transition-colors"
                                >
                                    ✕ Reset Pencarian
                                </button>
                            </div>
                        ) : (
                            <div className="text-center py-16 rounded-2xl border border-dashed border-surface-700/50 bg-surface-900/30">
                                <div className="text-5xl mb-4">👥</div>
                                <h3 className="text-base font-bold text-surface-200">Belum Ada Tim Terdaftar</h3>
                                <p className="text-surface-400 text-xs mt-1 max-w-sm mx-auto">
                                    Daftarkan tim binaan Anda terlebih dahulu untuk mengelola daftar atlet dan mengikuti turnamen.
                                </p>
                                <Link
                                    href={route('teams.create')}
                                    className="inline-block mt-4 px-4 py-2 rounded-xl bg-primary-600 text-white text-xs font-bold hover:bg-primary-500 shadow-md"
                                >
                                    + Daftarkan Tim Pertama
                                </Link>
                            </div>
                        )
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
                            {teams.data.map((team) => (
                                <div
                                    key={team.id}
                                    className="rounded-2xl border border-surface-700/50 bg-surface-900/60 backdrop-blur-sm overflow-hidden hover:border-primary-500/30 transition-all duration-200 group flex flex-col justify-between shadow-md"
                                >
                                    <div className="p-5">
                                        {/* Header Card */}
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500/20 to-blue-600/10 flex items-center justify-center text-lg font-bold text-primary-300 shrink-0 border border-primary-500/20">
                                                    {team.name.charAt(0)}
                                                </div>
                                                <div className="min-w-0">
                                                    <Link
                                                        href={route('teams.show', team.id)}
                                                        className="text-base font-bold text-surface-100 hover:text-primary-300 transition-colors truncate block"
                                                    >
                                                        {team.name}
                                                    </Link>
                                                    <p className="text-xs text-surface-400">📍 {team.region}</p>
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex items-center gap-1 shrink-0">
                                                {(!isCoach || !team.has_match_scores) && (
                                                    <Link
                                                        href={route('teams.edit', team.id)}
                                                        className="p-1.5 rounded-lg text-surface-400 hover:text-accent-300 hover:bg-surface-800 transition-colors"
                                                        title="Edit Tim"
                                                    >
                                                        ✏️
                                                    </Link>
                                                )}
                                                <button
                                                    onClick={() => setDeletingTeamId(team.id)}
                                                    className="p-1.5 rounded-lg text-surface-400 hover:text-red-400 hover:bg-surface-800 transition-colors cursor-pointer"
                                                    title="Hapus Tim"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>

                                        {/* Coach & Info */}
                                        <div className="mt-3.5 flex items-center gap-2 flex-wrap">
                                            {team.coach && (
                                                <span className="text-[11px] text-surface-400">
                                                    🧑‍🏫 Pelatih: {team.coach.name}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Athletes Preview Footer */}
                                    <div className="px-5 py-3 bg-surface-950/40 border-t border-surface-800 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-surface-500">Atlet:</span>
                                            <div className="flex -space-x-1">
                                                {(team.athletes || []).slice(0, 4).map((a) => (
                                                    <div
                                                        key={a.id}
                                                        className="w-6 h-6 rounded-full bg-surface-800 border border-surface-700 flex items-center justify-center text-[10px] font-bold text-surface-300 shadow-sm"
                                                        title={`${a.name} (#${a.jersey_number} - ${a.position || 'Pemain'})`}
                                                    >
                                                        {a.jersey_number}
                                                    </div>
                                                ))}
                                                {(team.athletes_count || team.athletes?.length || 0) > 4 && (
                                                    <div className="w-6 h-6 rounded-full bg-surface-800 border border-surface-700 flex items-center justify-center text-[10px] text-surface-400">
                                                        +{(team.athletes_count || team.athletes?.length || 0) - 4}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <Link
                                            href={route('teams.show', team.id)}
                                            className="text-xs font-semibold text-primary-400 hover:text-primary-300 transition-colors"
                                        >
                                            {team.athletes_count || team.athletes?.length || 0} atlet →
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <Pagination links={teams.links} />
                </div>
            )}

            {/* TAB 2: TEAM SQUADS */}
            {activeTab === 'super' && (
                <div>
                    <div className="mb-4 p-4 rounded-2xl border border-purple-500/20 bg-purple-500/10 text-xs text-purple-200 flex items-start gap-2.5">
                        <span className="text-base shrink-0">💡</span>
                        <div>
                            <p className="font-bold text-purple-100">Team Squad:</p>
                            <p className="text-purple-300/80 mt-0.5">
                                Team Squad diinput sebagai <strong>1 kesatuan tim</strong> persis seperti team unit. Pada jadwal turnamen (Master Schedule), setiap pertandingan Team Squad otomatis dialokasikan <strong>3 kotak waktu (3 sesi)</strong>.
                            </p>
                        </div>
                    </div>

                    {superTeams.length === 0 ? (
                        (search || selectedCoachId) ? (
                            <div className="text-center py-16 rounded-2xl border border-dashed border-purple-500/30 bg-surface-900/30">
                                <div className="text-5xl mb-4">🔍</div>
                                <h3 className="text-base font-bold text-purple-200">Tidak Ada Team Squad yang Cocok</h3>
                                <p className="text-surface-400 text-xs mt-1 max-w-md mx-auto">
                                    Tidak ditemukan Team Squad yang sesuai dengan pencarian Anda. Silakan coba kata kunci lain atau reset pencarian.
                                </p>
                                <button
                                    type="button"
                                    onClick={handleClearSearch}
                                    className="inline-block mt-4 px-4 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-white text-xs font-bold border border-surface-700 shadow-md cursor-pointer transition-colors"
                                >
                                    ✕ Reset Pencarian
                                </button>
                            </div>
                        ) : (
                            <div className="text-center py-16 rounded-2xl border border-dashed border-surface-700/50 bg-surface-900/30">
                                <div className="text-5xl mb-4">🏆</div>
                                <h3 className="text-base font-bold text-surface-200">Belum Ada Team Squad</h3>
                                <p className="text-surface-400 text-xs mt-1 max-w-md mx-auto">
                                    Daftarkan Team Squad untuk turnamen kategori Team Squad (3 sesi pertandingan).
                                </p>
                                {canManageSuperTeams && (
                                    <button
                                        onClick={handleOpenCreateModal}
                                        className="inline-block mt-4 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                                    >
                                        + Buat Team Squad Pertama
                                    </button>
                                )}
                            </div>
                        )
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
                            {superTeams.map((st) => {
                                const allAthletes = (st.members || []).flatMap((m) => m.athletes || []);
                                const region = st.members?.[0]?.region || 'Daerah Tim';

                                return (
                                    <div
                                        key={st.id}
                                        className="rounded-2xl border border-purple-500/30 bg-surface-900/60 backdrop-blur-sm overflow-hidden hover:border-purple-500/50 transition-all duration-200 flex flex-col justify-between shadow-md"
                                    >
                                        <div className="p-5">
                                            {/* Top Header */}
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/25 to-indigo-600/15 flex items-center justify-center text-lg font-bold text-purple-300 shrink-0 border border-purple-500/30">
                                                        {st.name.charAt(0)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3 className="text-base font-bold text-purple-100 truncate">
                                                            {st.name}
                                                        </h3>
                                                        <p className="text-xs text-surface-400">📍 {region}</p>
                                                    </div>
                                                </div>

                                                {/* Action Edit & Delete Buttons */}
                                                <div className="flex items-center gap-1 shrink-0">
                                                    {canManageSuperTeams && (
                                                        <>
                                                            {(!isCoach || !st.has_match_scores) && (
                                                                <button
                                                                    onClick={() => handleOpenEditModal(st)}
                                                                    className="p-1.5 rounded-lg text-surface-400 hover:text-accent-300 hover:bg-surface-800 transition-colors cursor-pointer"
                                                                    title="Edit Team Squad"
                                                                >
                                                                    ✏️
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => setDeletingSuperTeamId(st.id)}
                                                                className="p-1.5 rounded-lg text-surface-400 hover:text-red-400 hover:bg-surface-800 transition-colors cursor-pointer"
                                                                title="Hapus Team Squad"
                                                            >
                                                                🗑️
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Badge & Coach */}
                                            <div className="mt-3.5 flex items-center gap-2 flex-wrap">
                                                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold uppercase">
                                                    🏆 Team Squad
                                                </span>

                                                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-semibold">
                                                    ⏱️ 3 Sesi / Match
                                                </span>

                                                {st.coach && (
                                                    <span className="text-[11px] text-surface-400">
                                                        🧑‍🏫 {st.coach.name}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Tournament Status */}
                                            <div className="mt-2.5 text-xs">
                                                {st.tournaments && st.tournaments.length > 0 ? (
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <span className="text-surface-400 font-medium text-[11px]">🏆 Turnamen:</span>
                                                        {st.tournaments.map((t) => (
                                                            <span key={t.id} className="px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/30 text-[11px] font-semibold">
                                                                {t.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : st.tournament ? (
                                                    <span className="text-blue-300 font-medium">
                                                        🏆 Terdaftar di Turnamen: <strong>{st.tournament.name}</strong>
                                                    </span>
                                                ) : (
                                                    <span className="text-surface-500">
                                                        🔓 Belum didaftarkan ke turnamen
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Athletes Preview Footer */}
                                        <div className="px-5 py-3 bg-surface-950/40 border-t border-surface-800 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-surface-500">Atlet:</span>
                                                <div className="flex -space-x-1">
                                                    {allAthletes.slice(0, 4).map((a) => (
                                                        <div
                                                            key={a.id}
                                                            className="w-6 h-6 rounded-full bg-surface-800 border border-surface-700 flex items-center justify-center text-[10px] font-bold text-surface-300 shadow-sm"
                                                            title={`${a.name} (#${a.jersey_number} - ${a.position || 'Pemain'})`}
                                                        >
                                                            {a.jersey_number}
                                                        </div>
                                                    ))}
                                                    {allAthletes.length > 4 && (
                                                        <div className="w-6 h-6 rounded-full bg-surface-800 border border-surface-700 flex items-center justify-center text-[10px] text-surface-400">
                                                            +{allAthletes.length - 4}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <span className="text-xs font-semibold text-purple-400">
                                                {allAthletes.length} total atlet
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Modal Create & Edit Super Team (Clean Single Form) */}
            {isSuperTeamModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-3xl bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
                        <div className="px-6 py-4 border-b border-surface-800 flex items-center justify-between bg-surface-950/40">
                            <div>
                                <h3 className="text-base font-bold text-surface-100 flex items-center gap-2">
                                    <span>{editingSuperTeam ? '✏️ Edit Team Squad' : '🏆 Buat Team Squad Baru'}</span>
                                </h3>
                                <p className="text-xs text-surface-400 mt-0.5">
                                    {editingSuperTeam
                                        ? 'Perbarui data tim dan roster atlet.'
                                        : 'Input data tim dan daftar atlet sebagai 1 kesatuan (otomatis dialokasikan 3 sesi di jadwal).'}
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setIsSuperTeamModalOpen(false);
                                    setEditingSuperTeam(null);
                                }}
                                className="text-surface-400 hover:text-surface-200 p-1.5 rounded-lg hover:bg-surface-800 transition-colors cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSaveSuperTeam} className="p-6 space-y-4 flex flex-col flex-1 overflow-hidden" encType="multipart/form-data">
                            {/* General Details */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-surface-300 mb-1.5">
                                        Nama Team Squad <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={stData.name}
                                        onChange={(e) => setStData('name', e.target.value)}
                                        placeholder="Contoh: Tim Harimau Perkasa"
                                        className="w-full px-4 py-2.5 rounded-xl bg-surface-950/60 border border-surface-700 text-surface-100 text-xs focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                                        required
                                    />
                                    {stErrors.name && <p className="text-red-400 text-xs mt-1">{stErrors.name}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-surface-300 mb-1.5">
                                        Daerah <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={stData.region}
                                        onChange={(e) => setStData('region', e.target.value)}
                                        placeholder="Contoh: Jakarta"
                                        className="w-full px-4 py-2.5 rounded-xl bg-surface-950/60 border border-surface-700 text-surface-100 text-xs focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                                        required
                                    />
                                    {stErrors.region && <p className="text-red-400 text-xs mt-1">{stErrors.region}</p>}
                                </div>

                                {isAdmin ? (
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-surface-300 mb-1.5">
                                            Pelatih Penanggung Jawab
                                        </label>
                                        <select
                                            value={stData.coach_id}
                                            onChange={(e) => setStData('coach_id', e.target.value)}
                                            className="w-full px-3 py-2.5 rounded-xl bg-surface-950/60 border border-surface-700 text-surface-100 text-xs focus:border-purple-500 transition-colors"
                                        >
                                            <option value="">— Pilih Pelatih (Opsional) —</option>
                                            {coaches.map((c) => (
                                                <option key={c.id} value={c.id}>
                                                    🧑‍🏫 {c.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                ) : (
                                    <div className="sm:col-span-2 flex items-center text-xs text-purple-300/80 p-2.5 rounded-xl bg-purple-950/20 border border-purple-900/30">
                                        <span>🧑‍🏫 Pelatih: <strong>{auth.user?.name}</strong> <span className="text-xs text-purple-400 ml-1">(Terdeteksi otomatis)</span></span>
                                    </div>
                                )}
                            </div>

                            {/* Athletes Section Header */}
                            <div className="pt-2 border-t border-surface-800 flex items-center justify-between">
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider text-surface-300">
                                        Daftar Atlet <span className="text-red-400">*</span>
                                    </label>
                                    <p className="text-[11px] text-surface-500">
                                        Minimal 1 atlet. Nomor punggung harus unik dalam satu tim.
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                    <a
                                        href={route('templates.athletes')}
                                        download="template_import_atlet.xlsx"
                                        className="text-xs px-3 py-1.5 rounded-xl bg-surface-800 text-surface-300 border border-surface-700 hover:bg-surface-700 hover:text-white transition-all flex items-center gap-1.5 font-medium cursor-pointer"
                                        title="Unduh template Excel resmi (.xlsx)"
                                    >
                                        <span>📄 Unduh Template (.xlsx)</span>
                                    </a>

                                    <button
                                        type="button"
                                        onClick={() => document.getElementById('unified-excel-upload').click()}
                                        disabled={isParsingSuperTeamFile}
                                        className="text-xs px-3.5 py-1.5 rounded-xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 transition-all font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                        title="Import daftar atlet dari file Excel (.xlsx / .xls) atau CSV"
                                    >
                                        {isParsingSuperTeamFile ? (
                                            <>
                                                <span className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                                                <span>Membaca File...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>📥 Import XLSX / Excel</span>
                                            </>
                                        )}
                                    </button>
                                    <input
                                        type="file"
                                        id="unified-excel-upload"
                                        accept=".xlsx,.xls,.csv"
                                        onChange={(e) => {
                                            handleExcelUpload(e.target.files[0]);
                                            e.target.value = '';
                                        }}
                                        className="hidden"
                                    />

                                    <button
                                        type="button"
                                        onClick={addAthlete}
                                        className="text-xs px-3 py-1.5 rounded-xl bg-primary-600/20 text-primary-300 border border-primary-500/30 hover:bg-primary-600/30 transition-all font-semibold flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <span>+ Tambah Atlet</span>
                                    </button>
                                </div>
                            </div>

                            {stErrors.athletes && (
                                <p className="text-red-400 text-xs">{stErrors.athletes}</p>
                            )}

                            {/* Athletes Table / List */}
                            <div className="space-y-2 overflow-y-auto pr-1 flex-1 max-h-[38vh]">
                                {stData.athletes.map((athlete, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center gap-2.5 p-2 rounded-xl border border-surface-700 bg-surface-950/50"
                                    >
                                        {/* Photo Upload */}
                                        <div className="relative shrink-0">
                                            <input
                                                type="file"
                                                id={`ath-photo-${idx}`}
                                                accept="image/*"
                                                onChange={(e) => updateAthlete(idx, 'photo', e.target.files[0] || null)}
                                                className="hidden"
                                            />
                                            <label
                                                htmlFor={`ath-photo-${idx}`}
                                                className="w-9 h-9 rounded-lg bg-surface-800 flex items-center justify-center text-xs font-bold text-surface-400 cursor-pointer overflow-hidden border border-surface-700 hover:border-purple-500 transition-colors block"
                                                title="Unggah foto atlet (opsional)"
                                            >
                                                {athlete.photo ? (
                                                    <img
                                                        src={URL.createObjectURL(athlete.photo)}
                                                        alt="Preview"
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : athlete.photo_url ? (
                                                    <img
                                                        src={athlete.photo_url}
                                                        alt="Foto Atlet"
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <span>#{athlete.jersey_number || idx + 1}</span>
                                                )}
                                            </label>
                                        </div>

                                        {/* Name */}
                                        <input
                                            type="text"
                                            value={athlete.name}
                                            onChange={(e) => updateAthlete(idx, 'name', e.target.value)}
                                            placeholder="Nama Atlet"
                                            className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-surface-900 border border-surface-700 text-surface-100 text-xs focus:border-purple-500 transition-colors"
                                            required
                                        />

                                        {/* Jersey Number */}
                                        <input
                                            type="number"
                                            value={athlete.jersey_number}
                                            onChange={(e) => updateAthlete(idx, 'jersey_number', e.target.value)}
                                            placeholder="No"
                                            min="1"
                                            max="999"
                                            className="w-16 px-2 py-2 rounded-xl bg-surface-900 border border-surface-700 text-surface-100 text-xs text-center font-bold focus:border-purple-500 transition-colors"
                                            required
                                            title="Nomor Punggung"
                                        />

                                        {/* Position */}
                                        <select
                                            value={athlete.position || 'Tekong'}
                                            onChange={(e) => updateAthlete(idx, 'position', e.target.value)}
                                            className="w-28 px-2 py-2 rounded-xl bg-surface-900 border border-surface-700 text-surface-200 text-xs focus:border-purple-500 transition-colors"
                                        >
                                            <option value="Tekong">Tekong</option>
                                            <option value="Feeder">Feeder</option>
                                            <option value="Smash">Smash</option>
                                            <option value="Cadangan">Cadangan</option>
                                        </select>

                                        {/* Remove Button */}
                                        {stData.athletes.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeAthlete(idx)}
                                                className="shrink-0 w-8 h-8 rounded-lg bg-red-500/10 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-colors cursor-pointer"
                                                title="Hapus atlet"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Modal Footer */}
                            <div className="pt-4 border-t border-surface-800 flex items-center justify-between">
                                <div className="text-xs text-surface-400 font-mono">
                                    Total: <strong>{stData.athletes.length}</strong> Atlet
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsSuperTeamModalOpen(false);
                                            setEditingSuperTeam(null);
                                        }}
                                        className="px-4 py-2 rounded-xl border border-surface-700 text-surface-400 text-xs font-semibold hover:bg-surface-800 transition-colors cursor-pointer"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={stProcessing}
                                        className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/20 disabled:opacity-50 cursor-pointer"
                                    >
                                        {stProcessing ? 'Menyimpan...' : (editingSuperTeam ? '✓ Simpan Perubahan' : '✓ Daftarkan Team Squad')}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirm Dialogs */}
            <ConfirmDialog
                isOpen={deletingTeamId !== null}
                onClose={() => setDeletingTeamId(null)}
                onConfirm={handleDeleteTeam}
                title="Hapus Team Unit"
                message="Team Unit beserta seluruh data atletnya akan dihapus permanen. Aksi ini hanya dapat dilakukan jika tim belum pernah mengikuti turnamen."
            />

            <ConfirmDialog
                isOpen={deletingSuperTeamId !== null}
                onClose={() => setDeletingSuperTeamId(null)}
                onConfirm={handleDeleteSuperTeam}
                title="Hapus Team Squad"
                message="Team Squad beserta seluruh data atletnya akan dihapus permanen. Aksi ini hanya dapat dilakukan jika Team Squad belum pernah mengikuti turnamen."
            />

            {/* Bulk Import Athletes Modal (Admin Only) */}
            {isAdmin && (
                <BulkImportAthletesModal
                    isOpen={isBulkImportOpen}
                    onClose={() => setIsBulkImportOpen(false)}
                    allDbTeams={allCoachTeams}
                />
            )}
        </AuthenticatedLayout>
    );
}
