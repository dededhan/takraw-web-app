import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link } from '@inertiajs/react';

export default function ForgotPassword() {
    const waLink = "https://wa.me/6289654032950?text=Halo%20Admin%2C%20saya%20lupa%20kata%20sandi%20akun%20aplikasi%20Sepak%20Takraw.";

    return (
        <GuestLayout>
            <Head title="Lupa Password" />

            <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-3xl mx-auto mb-4 animate-bounce">
                    💬
                </div>

                <h2 className="text-xl font-bold text-white mb-2">Lupa Kata Sandi?</h2>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed mb-6">
                    Silakan hubungi Admin sistem melalui WhatsApp untuk memverifikasi identitas dan mengatur ulang password Anda.
                </p>

                <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-sm transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 cursor-pointer"
                >
                    <span>💬 Hubungi Admin via WhatsApp</span>
                </a>

                <div className="mt-4 text-xs text-slate-500 font-mono">
                    WhatsApp Admin: <span className="text-emerald-400 font-bold">089654032950</span>
                </div>

                <div className="mt-8 pt-4 border-t border-slate-800/40 text-center">
                    <Link href={route('login')} className="text-xs text-slate-400 hover:text-amber-400 transition-colors">
                        ← Kembali ke Halaman Login
                    </Link>
                </div>
            </div>
        </GuestLayout>
    );
}
