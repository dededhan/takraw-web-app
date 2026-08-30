import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import { useState } from 'react';

const MODES = [
    { value: 'regu',        label: 'Regu',        desc: '3 pemain per tim (standar)', icon: '🏐', color: 'border-blue-500' },
    { value: 'double',      label: 'Double',      desc: '2 pemain per tim', icon: '👥', color: 'border-emerald-500' },
    { value: 'quadrant',    label: 'Quadrant',    desc: '4 pemain per tim', icon: '⬡', color: 'border-purple-500' },
    { value: 'team_regu',   label: 'Team Regu',   desc: 'Super Team (3 tim regu)', icon: '🏆', color: 'border-amber-500' },
    { value: 'team_double', label: 'Team Double', desc: 'Super Team (3 tim double)', icon: '🥇', color: 'border-red-500' },
];

export default function TournamentCreate() {
    const [showPassword, setShowPassword] = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        name: '',
        start_date: '',
        end_date: '',
        modes: ['regu'], // Array multi-select
        registration_code: '', // Kunci / Password Pendaftaran Turnamen
    });

    const toggleMode = (value) => {
        if (data.modes.includes(value)) {
            if (data.modes.length === 1) return; // Minimal 1 mode aktif
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
        post(route('tournaments.store'));
    };

    return (
        <AuthenticatedLayout header="Buat Turnamen">
            <Head title="Buat Turnamen" />

            <div className="max-w-2xl mx-auto">
                <div className="mb-6">
                    <Link href={route('tournaments.index')} className="text-sm text-surface-500 hover:text-surface-300 transition-colors flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                        </svg>
                        Kembali ke Daftar Turnamen
                    </Link>
                </div>

                <div className="rounded-xl border border-surface-700/50 bg-surface-900/50 backdrop-blur-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-surface-100">🏆 Turnamen Baru</h2>
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-surface-800 text-surface-300 border border-surface-700 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                            Status Awal: Draft
                        </span>
                    </div>

                    <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5">
                        <span className="text-base shrink-0">💡</span>
                        <div>
                            <p className="font-semibold text-amber-200">Status Default Turnamen adalah Draft</p>
                            <p className="text-amber-300/80 mt-0.5">Setelah dibuat, turnamen akan berstatus <strong>Draft</strong> agar Admin dapat menyusun Pool dan Master Schedule terlebih dahulu. Status dapat diubah ke <strong>Registrasi</strong> melalui menu Edit Turnamen saat pendaftaran dibuka.</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium text-surface-300 mb-2">
                                Nama Turnamen <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-surface-800 border border-surface-700 text-surface-100 placeholder-surface-600 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
                                placeholder="Contoh: Kejuaraan Sepak Takraw UNJ 2024"
                            />
                            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-surface-300 mb-2">
                                    Tanggal Mulai <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={data.start_date}
                                    onChange={(e) => setData('start_date', e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-surface-800 border border-surface-700 text-surface-100 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
                                />
                                {errors.start_date && <p className="text-red-400 text-xs mt-1">{errors.start_date}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-surface-300 mb-2">
                                    Tanggal Berakhir <span className="text-red-400">*</span>
                                </label>
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
                            <p className="text-xs text-surface-500 mb-3">Pilih semua mode tanding yang akan dipertandingkan dalam turnamen ini.</p>
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

                        {/* Kunci Pertandingan / Password Pendaftaran (Opsional) */}
                        <div className="pt-2 border-t border-surface-700/40">
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
                                Jika diisi, pelatih (coach) wajib memasukkan kunci ini untuk mendaftarkan timnya. Kosongkan jika turnamen terbuka tanpa kunci.
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

                        {/* Submit */}
                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-700/50">
                            <Link
                                href={route('tournaments.index')}
                                className="px-5 py-2.5 rounded-xl text-sm font-medium text-surface-400 hover:text-surface-200 bg-surface-800 hover:bg-surface-700 transition-colors"
                            >
                                Batal
                            </Link>
                            <button
                                type="submit"
                                disabled={processing}
                                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-glow-primary"
                            >
                                {processing ? 'Menyimpan...' : '✨ Buat Turnamen'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
