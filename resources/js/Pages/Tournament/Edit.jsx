import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import StatusBadge from '@/Components/StatusBadge';
import { Head, useForm, Link } from '@inertiajs/react';
import { useState } from 'react';

const MODES = [
    { value: 'regu',        label: 'Regu',        desc: '3 pemain per tim (standar)', icon: '🏐' },
    { value: 'double',      label: 'Double',      desc: '2 pemain per tim', icon: '👥' },
    { value: 'quadrant',    label: 'Quadrant',    desc: '4 pemain per tim', icon: '⬡' },
    { value: 'team_regu',   label: 'Team Regu',   desc: 'Super Team (3 tim regu)', icon: '🏆' },
    { value: 'team_double', label: 'Team Double', desc: 'Super Team (3 tim double)', icon: '🥇' },
];

const STATUS_DETAILS = [
    {
        value: 'draft',
        label: 'Draft (Persiapan)',
        icon: '📝',
        badge: 'Draft',
        color: 'border-amber-500/50 bg-amber-500/10 text-amber-300',
        activeRing: 'ring-2 ring-amber-500 border-amber-500 bg-amber-500/15',
        desc: 'Turnamen sedang disiapkan. Belum tampil di menu pendaftaran pelatih (coach).',
        hint: 'Gunakan saat Admin masih menyusun bagan, jadwal, atau jumlah lapangan.',
    },
    {
        value: 'registration',
        label: 'Registrasi (Buka Pendaftaran)',
        icon: '📢',
        badge: 'Buka Pendaftaran',
        color: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300',
        activeRing: 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-500/15',
        desc: 'Pendaftaran dibuka! Pelatih dapat mendaftarkan timnya ke turnamen ini.',
        hint: 'Jika kunci pertandingan diisi, pelatih wajib memasukkan kunci tersebut.',
    },
    {
        value: 'pool_stage',
        label: 'Babak Penyisihan (Pool Stage)',
        icon: '🏊',
        badge: 'Penyisihan',
        color: 'border-blue-500/50 bg-blue-500/10 text-blue-300',
        activeRing: 'ring-2 ring-blue-500 border-blue-500 bg-blue-500/15',
        desc: 'Pendaftaran ditutup. Pertandingan fase pool/grup sedang berlangsung.',
        hint: 'Wasit dapat mulai mengisi skor pertandingan fase penyisihan.',
    },
    {
        value: 'bracket_stage',
        label: 'Babak Bracket (Knockout)',
        icon: '👑',
        badge: 'Babak Gugur',
        color: 'border-purple-500/50 bg-purple-500/10 text-purple-300',
        activeRing: 'ring-2 ring-purple-500 border-purple-500 bg-purple-500/15',
        desc: 'Fase gugur (Perempat Final / Semifinal / Final) sedang dimainkan.',
        hint: 'Peringkat pool telah lolos ke bagan bracket knockout.',
    },
    {
        value: 'completed',
        label: 'Selesai (Completed)',
        icon: '🏁',
        badge: 'Turnamen Selesai',
        color: 'border-surface-500/50 bg-surface-500/10 text-surface-300',
        activeRing: 'ring-2 ring-surface-400 border-surface-400 bg-surface-700/50',
        desc: 'Seluruh pertandingan telah rampung dan juara telah ditetapkan.',
        hint: 'Turnamen diarsipkan dan hasil pertandingan final terkunci.',
    },
];

export default function TournamentEdit({ tournament }) {
    const initialModes = (tournament.modes || []).map(m => m.match_mode);
    const [showPassword, setShowPassword] = useState(false);

    const { data, setData, patch, processing, errors } = useForm({
        name: tournament.name || '',
        start_date: tournament.start_date?.split('T')[0] || '',
        end_date: tournament.end_date?.split('T')[0] || '',
        modes: initialModes.length > 0 ? initialModes : [tournament.mode || 'regu'],
        status: tournament.status || 'draft',
        registration_code: tournament.registration_code || '',
    });

    const toggleMode = (value) => {
        if (data.modes.includes(value)) {
            if (data.modes.length === 1) return;
            setData('modes', data.modes.filter(m => m !== value));
        } else {
            setData('modes', [...data.modes, value]);
        }
    };

    const generateRandomCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let randomStr = '';
        for (let i = 0; i < 6; i++) {
            randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setData('registration_code', `TKW-${randomStr}`);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        patch(route('tournaments.update', tournament.id));
    };

    const currentStatusConfig = STATUS_DETAILS.find(s => s.value === data.status) || STATUS_DETAILS[0];

    return (
        <AuthenticatedLayout header="Edit Turnamen">
            <Head title={`Edit: ${tournament.name}`} />

            <div className="max-w-3xl mx-auto pb-12">
                <div className="mb-6 flex items-center justify-between">
                    <Link href={route('tournaments.show', tournament.id)} className="text-sm text-surface-400 hover:text-surface-200 transition-colors flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                        </svg>
                        Kembali ke Detail Turnamen
                    </Link>
                    <StatusBadge status={tournament.status} size="md" />
                </div>

                <div className="rounded-2xl border border-surface-700/50 bg-surface-900/60 backdrop-blur-md p-6 sm:p-8 shadow-xl">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-surface-800">
                        <div>
                            <h2 className="text-xl font-bold text-surface-100 flex items-center gap-2">
                                <span>✏️ Edit Pengaturan Turnamen</span>
                            </h2>
                            <p className="text-xs text-surface-400 mt-1">Ubah nama, tanggal pelaksanaan, mode tanding, status alur pertandingan, dan kunci akses.</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-7">
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

                        {/* Kunci Pertandingan / Password Pendaftaran */}
                        <div className="pt-4 border-t border-surface-700/40">
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-sm font-medium text-surface-200 flex items-center gap-1.5">
                                    <span>🔐 Kunci Pendaftaran / Password Pertandingan</span>
                                    <span className="text-[11px] text-surface-400 font-normal">(Opsional)</span>
                                </label>
                                <button
                                    type="button"
                                    onClick={generateRandomCode}
                                    className="text-xs text-primary-400 hover:text-primary-300 bg-primary-500/10 hover:bg-primary-500/20 border border-primary-500/30 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                                >
                                    🎲 Buat Kunci Acak
                                </button>
                            </div>
                            <p className="text-xs text-surface-400 mb-2.5">
                                Jika turnamen memiliki kunci, pelatih wajib mengisikan kunci ini saat mendaftarkan timnya. Kosongkan jika turnamen terbuka tanpa password.
                            </p>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={data.registration_code}
                                    onChange={(e) => setData('registration_code', e.target.value)}
                                    className="w-full pl-4 pr-24 py-3 rounded-xl bg-surface-800 border border-surface-700 text-surface-100 font-mono text-sm placeholder-surface-600 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
                                    placeholder="Contoh: TAKRAW-2026 atau kosongkan"
                                />
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                    {data.registration_code && (
                                        <button
                                            type="button"
                                            onClick={() => setData('registration_code', '')}
                                            className="p-1.5 text-xs text-surface-400 hover:text-surface-200 hover:bg-surface-700 rounded-lg transition-colors"
                                            title="Hapus Kunci"
                                        >
                                            ✕
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="p-1.5 text-xs text-surface-400 hover:text-surface-200 hover:bg-surface-700 rounded-lg transition-colors"
                                        title={showPassword ? 'Sembunyikan Kunci' : 'Tampilkan Kunci'}
                                    >
                                        {showPassword ? '🙈' : '👁️'}
                                    </button>
                                </div>
                            </div>
                            {errors.registration_code && <p className="text-red-400 text-xs mt-1">{errors.registration_code}</p>}
                        </div>

                        {/* Status Alur Turnamen */}
                        <div className="pt-4 border-t border-surface-700/40">
                            <div className="mb-3">
                                <label className="block text-sm font-bold text-surface-100 flex items-center gap-2">
                                    <span>⚙️ Status & Alur Pelaksanaan Turnamen</span>
                                    <span className="text-xs font-normal text-surface-400">(Pilih fase yang sedang aktif)</span>
                                </label>
                                <p className="text-xs text-surface-400 mt-1">
                                    Pilih status turnamen untuk mengatur ketersediaan pendaftaran tim bagi pelatih dan kesiapan wasit dalam menginput pertandingan.
                                </p>
                            </div>

                            {/* Status Cards Grid */}
                            <div className="space-y-2.5">
                                {STATUS_DETAILS.map((s) => {
                                    const isCurrentSelected = data.status === s.value;
                                    return (
                                        <div
                                            key={s.value}
                                            onClick={() => setData('status', s.value)}
                                            className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 flex items-start justify-between gap-4 ${
                                                isCurrentSelected
                                                    ? `${s.activeRing} shadow-md`
                                                    : 'border-surface-700/70 bg-surface-850/40 hover:border-surface-600 hover:bg-surface-800/60'
                                            }`}
                                        >
                                            <div className="flex items-start gap-3 min-w-0 flex-1">
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 border ${
                                                    isCurrentSelected ? s.color : 'bg-surface-800 border-surface-700 text-surface-400'
                                                }`}>
                                                    {s.icon}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className={`text-sm font-bold ${isCurrentSelected ? 'text-surface-100' : 'text-surface-300'}`}>
                                                            {s.label}
                                                        </p>
                                                        {isCurrentSelected && (
                                                            <span className={`text-[10px] uppercase font-extrabold px-2 py-0.2 rounded-full border ${s.color}`}>
                                                                Aktif Dipilih
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-surface-400 mt-0.5 leading-relaxed">
                                                        {s.desc}
                                                    </p>
                                                    <p className="text-[11px] text-surface-500 mt-1 italic">
                                                        ℹ️ {s.hint}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="shrink-0 pt-0.5">
                                                <input
                                                    type="radio"
                                                    name="status"
                                                    value={s.value}
                                                    checked={isCurrentSelected}
                                                    onChange={() => setData('status', s.value)}
                                                    className="w-4 h-4 text-primary-600 focus:ring-0 cursor-pointer"
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {errors.status && <p className="text-red-400 text-xs mt-1">{errors.status}</p>}

                            {/* Status Selected Highlight Banner */}
                            <div className="mt-3 p-3.5 rounded-xl bg-surface-950/60 border border-surface-800 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                    <span className="text-base">{currentStatusConfig.icon}</span>
                                    <span className="text-surface-400">Status tersimpan saat ini:</span>
                                    <span className="font-bold text-surface-200">{currentStatusConfig.label}</span>
                                </div>
                                <span className="text-surface-500 font-mono text-[11px]">
                                    db: {data.status}
                                </span>
                            </div>
                        </div>

                        {/* Submit */}
                        <div className="flex items-center justify-end gap-3 pt-6 border-t border-surface-700/50">
                            <Link
                                href={route('tournaments.show', tournament.id)}
                                className="px-5 py-2.5 rounded-xl text-sm font-medium text-surface-400 hover:text-surface-200 bg-surface-800 hover:bg-surface-700 transition-colors"
                            >
                                Batal
                            </Link>
                            <button
                                type="submit"
                                disabled={processing}
                                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-glow-primary flex items-center gap-2"
                            >
                                {processing ? 'Menyimpan...' : '💾 Simpan Perubahan Turnamen'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
