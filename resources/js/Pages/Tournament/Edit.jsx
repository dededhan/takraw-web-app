import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import StatusBadge from '@/Components/StatusBadge';
import { Head, useForm, Link } from '@inertiajs/react';

const MODES = [
    { value: 'regu',        label: 'Regu',        desc: '3 pemain per tim (standar)', icon: '🏐' },
    { value: 'double',      label: 'Double',      desc: '2 pemain per tim', icon: '👥' },
    { value: 'quadrant',    label: 'Quadrant',    desc: '4 pemain per tim', icon: '⬡' },
    { value: 'team_regu',   label: 'Team Regu',   desc: 'Super Team (3 tim regu)', icon: '🏆' },
    { value: 'team_double', label: 'Team Double', desc: 'Super Team (3 tim double)', icon: '🥇' },
];

const STATUSES = [
    { value: 'draft', label: 'Draft' },
    { value: 'registration', label: 'Registrasi' },
    { value: 'pool_stage', label: 'Babak Penyisihan' },
    { value: 'bracket_stage', label: 'Babak Bracket' },
    { value: 'completed', label: 'Selesai' },
];

export default function TournamentEdit({ tournament }) {
    const initialModes = (tournament.modes || []).map(m => m.match_mode);

    const { data, setData, patch, processing, errors } = useForm({
        name: tournament.name || '',
        start_date: tournament.start_date?.split('T')[0] || '',
        end_date: tournament.end_date?.split('T')[0] || '',
        modes: initialModes.length > 0 ? initialModes : [tournament.mode || 'regu'],
        status: tournament.status || 'draft',
    });

    const toggleMode = (value) => {
        if (data.modes.includes(value)) {
            if (data.modes.length === 1) return;
            setData('modes', data.modes.filter(m => m !== value));
        } else {
            setData('modes', [...data.modes, value]);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        patch(route('tournaments.update', tournament.id));
    };

    return (
        <AuthenticatedLayout header="Edit Turnamen">
            <Head title={`Edit: ${tournament.name}`} />

            <div className="max-w-2xl mx-auto">
                <div className="mb-6">
                    <Link href={route('tournaments.show', tournament.id)} className="text-sm text-surface-500 hover:text-surface-300 transition-colors flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                        </svg>
                        Kembali ke Detail Turnamen
                    </Link>
                </div>

                <div className="rounded-xl border border-surface-700/50 bg-surface-900/50 backdrop-blur-sm p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-surface-100">✏️ Edit Turnamen</h2>
                        <StatusBadge status={tournament.status} size="md" />
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium text-surface-300 mb-2">Nama Turnamen <span className="text-red-400">*</span></label>
                            <input
                                type="text"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-surface-800 border border-surface-700 text-surface-100 placeholder-surface-600 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
                            />
                            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-surface-300 mb-2">Tanggal Mulai <span className="text-red-400">*</span></label>
                                <input
                                    type="date"
                                    value={data.start_date}
                                    onChange={(e) => setData('start_date', e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-surface-800 border border-surface-700 text-surface-100 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
                                />
                                {errors.start_date && <p className="text-red-400 text-xs mt-1">{errors.start_date}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-surface-300 mb-2">Tanggal Berakhir <span className="text-red-400">*</span></label>
                                <input
                                    type="date"
                                    value={data.end_date}
                                    onChange={(e) => setData('end_date', e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-surface-800 border border-surface-700 text-surface-100 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
                                />
                                {errors.end_date && <p className="text-red-400 text-xs mt-1">{errors.end_date}</p>}
                            </div>
                        </div>

                        {/* Modes Multi-select */}
                        <div>
                            <label className="block text-sm font-medium text-surface-300 mb-1">
                                Mode Takraw Aktif (Pilih 1 atau Lebih) <span className="text-red-400">*</span>
                            </label>
                            <p className="text-xs text-surface-500 mb-3">Pilih semua mode tanding yang dipertandingkan.</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {MODES.map((mode) => {
                                    const isSelected = data.modes.includes(mode.value);
                                    return (
                                        <button
                                            key={mode.value}
                                            type="button"
                                            onClick={() => toggleMode(mode.value)}
                                            className={`
                                                p-4 rounded-xl border-2 text-left transition-all duration-200 relative
                                                ${isSelected
                                                    ? 'border-primary-500 bg-primary-500/10 shadow-glow-primary'
                                                    : 'border-surface-700 bg-surface-800/50 hover:border-surface-600 opacity-60 hover:opacity-100'
                                                }
                                            `}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-lg">{mode.icon}</span>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    readOnly
                                                    className="w-4 h-4 rounded text-primary-500 focus:ring-0"
                                                />
                                            </div>
                                            <p className={`text-sm font-semibold ${isSelected ? 'text-primary-300' : 'text-surface-200'}`}>
                                                {mode.label}
                                            </p>
                                            <p className="text-xs text-surface-500 mt-0.5">{mode.desc}</p>
                                        </button>
                                    );
                                })}
                            </div>
                            {errors.modes && <p className="text-red-400 text-xs mt-1">{errors.modes}</p>}
                        </div>


                        {/* Status */}
                        <div>
                            <label className="block text-sm font-medium text-surface-300 mb-2">Status Turnamen</label>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                {STATUSES.map((s) => (
                                    <button
                                        key={s.value}
                                        type="button"
                                        onClick={() => setData('status', s.value)}
                                        className={`px-3 py-2 rounded-xl text-xs font-medium text-center transition-all duration-200 border
                                            ${data.status === s.value
                                                ? 'border-primary-500 bg-primary-500/10 text-primary-300'
                                                : 'border-surface-700 bg-surface-800/50 text-surface-400 hover:border-surface-600'
                                            }`}
                                    >
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                            {errors.status && <p className="text-red-400 text-xs mt-1">{errors.status}</p>}
                        </div>

                        {/* Submit */}
                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-700/50">
                            <Link
                                href={route('tournaments.show', tournament.id)}
                                className="px-5 py-2.5 rounded-xl text-sm font-medium text-surface-400 hover:text-surface-200 bg-surface-800 hover:bg-surface-700 transition-colors"
                            >
                                Batal
                            </Link>
                            <button
                                type="submit"
                                disabled={processing}
                                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-glow-primary"
                            >
                                {processing ? 'Menyimpan...' : '💾 Simpan Perubahan'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
