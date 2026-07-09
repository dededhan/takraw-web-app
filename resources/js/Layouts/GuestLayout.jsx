import { Link } from '@inertiajs/react';

export default function GuestLayout({ children }) {
    return (
        <div 
            className="relative min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100 overflow-x-hidden py-12 px-4 sm:px-6 lg:px-8" 
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
            {/* Background decorative glow elements */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-[150px] pointer-events-none"></div>

            <div className="relative z-10 w-full max-w-md">
                {/* Branding Logo Block */}
                <div className="flex flex-col items-center mb-8 animate-fade-in">
                    <Link href="/" className="flex items-center gap-3 group transition-transform duration-300 hover:scale-105">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <span className="text-2xl font-bold text-slate-950">T</span>
                        </div>
                        <div>
                            <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                                TAKRAW <span className="text-amber-400">UNJ</span>
                            </span>
                            <span className="block text-[10px] uppercase tracking-widest text-slate-500 font-bold -mt-1">Tournament Management</span>
                        </div>
                    </Link>
                </div>

                {/* Main Card Container */}
                <div className="w-full overflow-hidden border border-slate-800/80 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-md rounded-2xl animate-slide-up">
                    {children}
                </div>
            </div>
        </div>
    );
}
