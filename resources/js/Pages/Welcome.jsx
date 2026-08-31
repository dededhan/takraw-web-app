import { Head, Link } from '@inertiajs/react';

export default function Welcome({ auth }) {
    return (
        <>
            <Head>
                <title>Takraw UNJ - Sistem Manajemen Turnamen Modern</title>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
                <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
            </Head>

            <div
                className="min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden selection:bg-amber-500 selection:text-slate-950"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
                {/* Background decorative glow elements */}
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>
                <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-[150px] pointer-events-none"></div>
                <div className="absolute bottom-10 left-10 w-80 h-80 bg-rose-500/5 rounded-full blur-[100px] pointer-events-none"></div>

                {/* Header Navbar */}
                <header className="relative border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
                    <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                <span className="text-xl font-bold text-slate-950">T</span>
                            </div>
                            <div>
                                <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                                    TAKRAW <span className="text-amber-400">UNJ</span>
                                </span>
                                <span className="block text-[9px] uppercase tracking-widest text-slate-500 font-bold -mt-1">Tournament Management</span>
                            </div>
                        </div>

                        <nav className="flex items-center gap-3">
                            {auth.user ? (
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 text-xs font-medium">
                                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                            {auth.user.name?.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="max-w-[130px] truncate">{auth.user.name}</span>
                                    </div>
                                    <Link
                                        href={route('dashboard')}
                                        className="px-4 sm:px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 transition duration-300 shadow-md shadow-indigo-600/20 text-sm flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                        </svg>
                                        <span>Dashboard</span>
                                    </Link>
                                    <Link
                                        href={route('logout')}
                                        method="post"
                                        as="button"
                                        className="px-3.5 sm:px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-300 font-medium hover:text-rose-400 hover:bg-rose-950/30 hover:border-rose-800/40 transition duration-200 text-sm flex items-center gap-1.5 cursor-pointer shadow-sm"
                                        title="Logout"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                        </svg>
                                        <span>Logout</span>
                                    </Link>
                                </div>
                            ) : (
                                <>
                                    <Link
                                        href={route('login')}
                                        className="px-4 py-2.5 rounded-xl text-slate-300 font-medium hover:text-white hover:bg-slate-900 transition duration-200 text-sm"
                                    >
                                        Masuk
                                    </Link>
                                    <Link
                                        href={route('register')}
                                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold hover:from-amber-400 hover:to-amber-500 transition duration-300 shadow-lg shadow-amber-500/20 text-sm"
                                    >
                                        Daftar Tim
                                    </Link>
                                </>
                            )}
                        </nav>
                    </div>
                </header>

                {/* Hero Section */}
                <section className="relative pt-20 pb-24 px-6 max-w-7xl mx-auto">
                    <div className="text-center max-w-4xl mx-auto">
                        {/* Tagline Badge */}
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-6 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                            Tournament Management System v1.0
                        </div>

                        {/* Heading */}
                        <h1
                            className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight"
                            style={{ fontFamily: "'Outfit', sans-serif" }}
                        >
                            Kelola Turnamen Sepak Takraw{' '}
                            <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-indigo-400 bg-clip-text text-transparent">
                                Lebih Profesional & Real-Time
                            </span>
                        </h1>

                        {/* Description */}
                        <p className="text-lg sm:text-xl text-slate-400 font-light mb-10 max-w-2xl mx-auto leading-relaxed">
                            Platform digital hulu-ke-hilir untuk pendaftaran tim pelatih, pembagian pool otomatis,
                            pencatatan skor real-time oleh wasit di lapangan, hingga analitik statistik atlet.
                        </p>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
                            {auth.user ? (
                                <>
                                    <Link
                                        href={route('dashboard')}
                                        className="w-full sm:w-auto px-8 py-4 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition duration-300 shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 text-base"
                                    >
                                        Buka Dashboard Utama
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                        </svg>
                                    </Link>
                                    <Link
                                        href={route('logout')}
                                        method="post"
                                        as="button"
                                        className="w-full sm:w-auto px-6 py-4 rounded-xl border border-slate-700 bg-slate-900/80 text-slate-300 font-bold hover:bg-rose-950/30 hover:text-rose-400 hover:border-rose-800/40 transition duration-300 flex items-center justify-center gap-2 text-base cursor-pointer shadow-lg"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                        </svg>
                                        Keluar ({auth.user.name})
                                    </Link>
                                </>
                            ) : (
                                <>
                                    <Link
                                        href={route('login')}
                                        className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold hover:from-amber-300 hover:to-amber-400 transition duration-300 shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 text-base"
                                    >
                                        Masuk Aplikasi
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                        </svg>
                                    </Link>
                                    <Link
                                        href={route('register')}
                                        className="w-full sm:w-auto px-8 py-4 rounded-xl border border-slate-700 bg-slate-900/60 text-slate-200 font-bold hover:bg-slate-800 hover:text-white transition duration-300 flex items-center justify-center gap-2 text-base"
                                    >
                                        Registrasi Tim
                                    </Link>
                                </>
                            )}
                        </div>

                        {/* Interactive UI Preview Mockup */}
                        <div className="relative mx-auto max-w-5xl rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 shadow-2xl backdrop-blur-md">
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent rounded-2xl"></div>

                            {/* Browser controls chrome mockup */}
                            <div className="flex items-center justify-between pb-3 border-b border-slate-850 px-2 mb-3">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
                                    <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                                    <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                                </div>
                                <div className="text-xs text-slate-500 select-none">takraw-unj.app/dashboard</div>
                                <div className="w-6"></div>
                            </div>

                            {/* Scoring Panel Preview */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left p-2">
                                <div className="bg-slate-950/80 border border-slate-800/60 p-5 rounded-xl">
                                    <div className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">Set 1</div>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="font-bold text-white text-base">UNJ Jakarta</div>
                                        <div className="text-2xl font-extrabold text-amber-400">21</div>
                                    </div>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="font-bold text-slate-400 text-sm">UGM Yogyakarta</div>
                                        <div className="text-xl font-bold text-slate-500">19</div>
                                    </div>
                                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-3">
                                        <div className="bg-indigo-500 h-full w-[100%]"></div>
                                    </div>
                                </div>

                                <div className="bg-slate-950/80 border border-indigo-500/30 p-5 rounded-xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 px-2 py-0.5 bg-rose-500 text-[10px] font-bold text-white rounded-bl-lg uppercase tracking-wide animate-pulse">Live</div>
                                    <div className="text-xs font-bold text-rose-400 uppercase tracking-widest mb-1">Set 2 (Aktif)</div>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="font-bold text-white text-base">UNJ Jakarta</div>
                                        <div className="text-3xl font-black text-rose-500">12</div>
                                    </div>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="font-bold text-white text-base">UGM Yogyakarta</div>
                                        <div className="text-3xl font-black text-amber-400">14</div>
                                    </div>
                                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-3">
                                        <div className="bg-rose-500 h-full w-[46%]"></div>
                                    </div>
                                </div>

                                <div className="bg-slate-950/80 border border-slate-800/60 p-5 rounded-xl flex flex-col justify-between">
                                    <div>
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Wasit Ditugaskan</div>
                                        <div className="font-semibold text-white text-sm">Fahri Ramadhan</div>
                                        <div className="text-xs text-slate-500">Lisensi Nasional A</div>
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-slate-900 flex items-center justify-between">
                                        <span className="text-xs text-slate-400">Status Lapangan</span>
                                        <span className="px-2 py-0.5 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded">Court 1</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section className="relative border-t border-slate-900 bg-slate-900/20 py-24 px-6">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center max-w-3xl mx-auto mb-16">
                            <h2
                                className="text-3xl sm:text-4xl font-bold text-white mb-4"
                                style={{ fontFamily: "'Outfit', sans-serif" }}
                            >
                                Fitur Utama Manajemen Turnamen
                            </h2>
                            <p className="text-slate-400 font-light">
                                Dibangun khusus untuk kebutuhan olahraga Sepak Takraw dengan kompleksitas set skor,
                                rotasi posisi, dan data performa per posisi regu (tekong, feeder, killer).
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Feature 1 */}
                            <div className="bg-slate-950 border border-slate-850 p-8 rounded-2xl hover:border-indigo-500/40 transition duration-300 group">
                                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-6 group-hover:scale-110 transition duration-300">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3">Bagan & Pool Otomatis</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    Plotting tim peserta secara acak maupun manual ke dalam beberapa pool/group. Klasemen grup
                                    secara otomatis ber-kalkulasi ketika wasit menyelesaikan set pertandingan.
                                </p>
                            </div>

                            {/* Feature 2 */}
                            <div className="bg-slate-950 border border-slate-850 p-8 rounded-2xl hover:border-rose-500/40 transition duration-300 group">
                                <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-6 group-hover:scale-110 transition duration-300">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3">Live Scoring Mobile-First</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    Antarmuka scoring wasit yang dioptimalkan untuk perangkat mobile. Input skor per set, penambahan poin,
                                    serta pencatatan data servis masuk/error, smash, block, dan assist secara instan.
                                </p>
                            </div>

                            {/* Feature 3 */}
                            <div className="bg-slate-950 border border-slate-850 p-8 rounded-2xl hover:border-amber-500/40 transition duration-300 group">
                                <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-6 group-hover:scale-110 transition duration-300">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3">Analitik Statistik Atlet</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    Membantu pelatih menganalisis persentase akurasi servis tekong, efektivitas umpan feeder, dan tingkat keberhasilan
                                    smash killer demi peningkatan performa atlet.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* User Roles & Flow */}
                <section className="py-24 px-6 max-w-7xl mx-auto">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2
                            className="text-3xl sm:text-4xl font-bold text-white mb-4"
                            style={{ fontFamily: "'Outfit', sans-serif" }}
                        >
                            Satu Platform untuk Seluruh Stakeholder
                        </h2>
                        <p className="text-slate-400 font-light">
                            Hak akses yang disesuaikan secara khusus dengan alur kerja masing-masing peran dalam turnamen.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Admin Card */}
                        <div className="relative rounded-2xl border border-slate-800 bg-slate-900/30 p-6 backdrop-blur-sm">
                            <div className="absolute top-4 right-4 text-xs font-bold uppercase tracking-wider text-indigo-400">ROLE 01</div>
                            <span className="text-3xl mb-4 block">👑</span>
                            <h3 className="text-xl font-bold text-white mb-2">Administrator</h3>
                            <ul className="text-slate-400 text-sm space-y-2.5">
                                <li className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                    Buka Sesi & Konfigurasi Turnamen
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                    Plotting Pool & Pembagian Tim
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                    Penugasan Wasit & Jadwal Match
                                </li>
                            </ul>
                        </div>

                        {/* Coach Card */}
                        <div className="relative rounded-2xl border border-slate-800 bg-slate-900/30 p-6 backdrop-blur-sm">
                            <div className="absolute top-4 right-4 text-xs font-bold uppercase tracking-wider text-amber-400">ROLE 02</div>
                            <span className="text-3xl mb-4 block">📋</span>
                            <h3 className="text-xl font-bold text-white mb-2">Pelatih (Coach)</h3>
                            <ul className="text-slate-400 text-sm space-y-2.5">
                                <li className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                    Registrasi Tim & Unggah Atlet
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                    Pantau Statistik Regu Secara Real-Time
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                    Unduh Laporan Performa Atlet
                                </li>
                            </ul>
                        </div>

                        {/* Referee Card */}
                        <div className="relative rounded-2xl border border-slate-800 bg-slate-900/30 p-6 backdrop-blur-sm">
                            <div className="absolute top-4 right-4 text-xs font-bold uppercase tracking-wider text-rose-400">ROLE 03</div>
                            <span className="text-3xl mb-4 block">⏱️</span>
                            <h3 className="text-xl font-bold text-white mb-2">Wasit (Referee)</h3>
                            <ul className="text-slate-400 text-sm space-y-2.5">
                                <li className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                    Input Detail Sesi Lapangan
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                    Live Scoreboard Panel Mobile
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                    Pencatatan Poin & Stat Pelanggaran
                                </li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* Call To Action Banner */}
                <section className="relative max-w-7xl mx-auto px-6 pb-24">
                    <div className="relative rounded-3xl border border-slate-800/80 bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950/80 p-8 sm:p-16 text-center overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none"></div>

                        <h2
                            className="text-3xl sm:text-5xl font-extrabold text-white mb-4 relative z-10"
                            style={{ fontFamily: "'Outfit', sans-serif" }}
                        >
                            Siap Memulai Turnamen Anda?
                        </h2>
                        <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto mb-10 relative z-10 font-light">
                            Masuk dengan akun demo yang tersedia atau hubungi administrator untuk membuat turnamen baru.
                        </p>

                        <div className="flex flex-wrap items-center justify-center gap-4 relative z-10">
                            {auth.user ? (
                                <>
                                    <Link
                                        href={route('dashboard')}
                                        className="px-8 py-4 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition duration-300 shadow-xl shadow-indigo-600/30 text-sm flex items-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                        </svg>
                                        Masuk ke Dashboard
                                    </Link>
                                    <Link
                                        href={route('logout')}
                                        method="post"
                                        as="button"
                                        className="px-6 py-4 rounded-xl border border-slate-700 bg-slate-900/80 text-slate-300 font-bold hover:bg-rose-950/30 hover:text-rose-400 hover:border-rose-800/40 transition duration-300 text-sm flex items-center gap-2 cursor-pointer shadow-lg"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                        </svg>
                                        Keluar / Logout
                                    </Link>
                                </>
                            ) : (
                                <>
                                    <Link
                                        href={route('login')}
                                        className="px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold hover:from-amber-400 hover:to-amber-500 transition duration-300 shadow-xl shadow-amber-500/20 text-sm"
                                    >
                                        Log In dengan Akun Demo
                                    </Link>
                                    <Link
                                        href={route('register')}
                                        className="px-8 py-4 rounded-xl border border-slate-700 bg-slate-900/60 text-slate-200 font-bold hover:bg-slate-800 hover:text-white transition duration-300 text-sm"
                                    >
                                        Daftar Tim Baru
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="border-t border-slate-900 bg-slate-950 py-12 px-6">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-slate-500">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center shadow">
                                <span className="text-sm font-extrabold text-slate-950">T</span>
                            </div>
                            <span className="font-bold text-slate-400">TAKRAW UNJ</span>
                        </div>
                        <div>
                            &copy; {new Date().getFullYear()} Universitas Negeri Jakarta. All rights reserved.
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-850 text-slate-400 text-xs">Laravel + Inertia.js</span>
                            <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-850 text-slate-400 text-xs">Vite + React</span>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}
