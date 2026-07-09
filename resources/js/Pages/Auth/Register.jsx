import { useEffect } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import GuestLayout from '@/Layouts/GuestLayout';

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        role: 'coach', // Default to coach (Pelatih)
        phone: '',
    });

    useEffect(() => {
        return () => {
            reset('password', 'password_confirmation');
        };
    }, []);

    const submit = (e) => {
        e.preventDefault();

        post(route('register'));
    };

    return (
        <GuestLayout>
            <Head title="Registrasi Akun Baru" />

            <div className="mb-6 text-center">
                <h2 className="text-xl font-bold text-white">Daftar Akun Baru</h2>
                <p className="text-xs text-slate-500 mt-1">Isi data di bawah ini untuk mengajukan pendaftaran akun</p>
            </div>

            <form onSubmit={submit} className="space-y-4">
                {/* Name */}
                <div>
                    <label htmlFor="name" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                        Nama Lengkap
                    </label>
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 text-sm">
                            👤
                        </span>
                        <input
                            id="name"
                            name="name"
                            value={data.name}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950/60 text-slate-200 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all text-sm placeholder-slate-600 shadow-inner"
                            autoComplete="name"
                            placeholder="Contoh: Budi Santoso"
                            onChange={(e) => setData('name', e.target.value)}
                            required
                        />
                    </div>
                    {errors.name && (
                        <div className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                            <span>⚠️</span> {errors.name}
                        </div>
                    )}
                </div>

                {/* Email */}
                <div>
                    <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                        Alamat Email
                    </label>
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 text-sm">
                            ✉️
                        </span>
                        <input
                            id="email"
                            type="email"
                            name="email"
                            value={data.email}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950/60 text-slate-200 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all text-sm placeholder-slate-600 shadow-inner"
                            autoComplete="username"
                            placeholder="nama@email.com"
                            onChange={(e) => setData('email', e.target.value)}
                            required
                        />
                    </div>
                    {errors.email && (
                        <div className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                            <span>⚠️</span> {errors.email}
                        </div>
                    )}
                </div>

                {/* Phone */}
                <div>
                    <label htmlFor="phone" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                        Nomor Telepon / WhatsApp
                    </label>
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 text-sm">
                            📞
                        </span>
                        <input
                            id="phone"
                            type="tel"
                            name="phone"
                            value={data.phone}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950/60 text-slate-200 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all text-sm placeholder-slate-600 shadow-inner"
                            placeholder="Contoh: 08123456789"
                            onChange={(e) => setData('phone', e.target.value)}
                        />
                    </div>
                    {errors.phone && (
                        <div className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                            <span>⚠️</span> {errors.phone}
                        </div>
                    )}
                </div>

                {/* Role select */}
                <div>
                    <label htmlFor="role" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                        Daftar Sebagai (Role)
                    </label>
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 text-sm">
                            🎭
                        </span>
                        <select
                            id="role"
                            name="role"
                            value={data.role}
                            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-800 bg-slate-950/60 text-slate-200 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all text-sm appearance-none cursor-pointer"
                            onChange={(e) => setData('role', e.target.value)}
                            required
                        >
                            <option value="coach" className="bg-slate-900 text-slate-200">Pelatih (Coach)</option>
                            <option value="referee" className="bg-slate-900 text-slate-200">Wasit (Referee)</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                            ▼
                        </div>
                    </div>
                    {errors.role && (
                        <div className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                            <span>⚠️</span> {errors.role}
                        </div>
                    )}
                </div>

                {/* Password */}
                <div>
                    <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                        Password
                    </label>
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 text-sm">
                            🔑
                        </span>
                        <input
                            id="password"
                            type="password"
                            name="password"
                            value={data.password}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950/60 text-slate-200 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all text-sm placeholder-slate-600 shadow-inner"
                            autoComplete="new-password"
                            placeholder="Minimal 8 karakter"
                            onChange={(e) => setData('password', e.target.value)}
                            required
                        />
                    </div>
                    {errors.password && (
                        <div className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                            <span>⚠️</span> {errors.password}
                        </div>
                    )}
                </div>

                {/* Confirm Password */}
                <div>
                    <label htmlFor="password_confirmation" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                        Ulangi Password
                    </label>
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 text-sm">
                            🔑
                        </span>
                        <input
                            id="password_confirmation"
                            type="password"
                            name="password_confirmation"
                            value={data.password_confirmation}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950/60 text-slate-200 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all text-sm placeholder-slate-600 shadow-inner"
                            autoComplete="new-password"
                            placeholder="Ulangi password"
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                            required
                        />
                    </div>
                    {errors.password_confirmation && (
                        <div className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                            <span>⚠️</span> {errors.password_confirmation}
                        </div>
                    )}
                </div>

                {/* Note about admin approval */}
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300 leading-relaxed">
                    ℹ️ Akun Anda akan dinonaktifkan terlebih dahulu setelah dibuat. Admin turnamen akan meninjau pendaftaran Anda sebelum akun dapat digunakan untuk login.
                </div>

                {/* Submit button */}
                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={processing}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-sm transition-all duration-300 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/35 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                        {processing ? (
                            <>
                                <svg className="animate-spin h-4 w-4 text-slate-950" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Mendaftarkan...
                            </>
                        ) : (
                            <>
                                Ajukan Pendaftaran Akun ➔
                            </>
                        )}
                    </button>
                </div>

                {/* Login Link */}
                <div className="text-center text-xs text-slate-500 mt-4 pt-4 border-t border-slate-800/40">
                    Sudah terdaftar?{' '}
                    <Link
                        href={route('login')}
                        className="text-amber-400 font-bold hover:text-amber-300 transition-colors"
                    >
                        Masuk di sini
                    </Link>
                </div>
            </form>
        </GuestLayout>
    );
}
