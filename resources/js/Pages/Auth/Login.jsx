import { useEffect } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import GuestLayout from '@/Layouts/GuestLayout';

export default function Login({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    useEffect(() => {
        return () => {
            reset('password');
        };
    }, []);

    const submit = (e) => {
        e.preventDefault();

        post(route('login'));
    };

    return (
        <GuestLayout>
            <Head title="Masuk Aplikasi" />

            <div className="mb-6 text-center">
                <h2 className="text-xl font-bold text-white">Selamat Datang Kembali</h2>
                <p className="text-xs text-slate-500 mt-1">Silakan masuk untuk mengelola turnamen dan data tim</p>
            </div>

            {status && (
                <div className="mb-6 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-medium flex items-center gap-2">
                    <span>✅</span>
                    <span>{status}</span>
                </div>
            )}

            <form onSubmit={submit} className="space-y-5">
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
                            autoComplete="current-password"
                            placeholder="Masukkan password"
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

                {/* Remember & Forgot Password */}
                <div className="flex items-center justify-between text-xs">
                    <label className="flex items-center cursor-pointer group">
                        <input
                            type="checkbox"
                            name="remember"
                            checked={data.remember}
                            onChange={(e) => setData('remember', e.target.checked)}
                            className="rounded border-slate-800 bg-slate-950/60 text-amber-500 focus:ring-amber-500/20 focus:ring-offset-slate-900 focus:ring-2"
                        />
                        <span className="ms-2 text-slate-400 group-hover:text-slate-200 transition-colors">
                            Ingat saya
                        </span>
                    </label>

                    {canResetPassword && (
                        <Link
                            href={route('password.request')}
                            className="text-slate-400 hover:text-amber-400 underline underline-offset-4 transition-colors focus:outline-none"
                        >
                            Lupa Password?
                        </Link>
                    )}
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
                                Memproses...
                            </>
                        ) : (
                            <>
                                Masuk Aplikasi ➔
                            </>
                        )}
                    </button>
                </div>

                {/* Register Link */}
                <div className="text-center text-xs text-slate-500 mt-4 pt-4 border-t border-slate-800/40">
                    Belum punya akun?{' '}
                    <Link
                        href={route('register')}
                        className="text-amber-400 font-bold hover:text-amber-300 transition-colors"
                    >
                        Daftar sebagai Tim / Wasit
                    </Link>
                </div>
            </form>
        </GuestLayout>
    );
}
