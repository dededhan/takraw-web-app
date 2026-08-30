import Dropdown from '@/Components/Dropdown';
import { Link, usePage } from '@inertiajs/react';
import { useState } from 'react';

const NAV_ITEMS = {
    admin: [
        { label: 'Dashboard', route: 'dashboard', icon: '📊' },
        { label: 'Kelola User', route: 'users.index', icon: '👤' },
        { label: 'Turnamen', route: 'tournaments.index', icon: '🏆' },
        { label: 'Tim', route: 'teams.index', icon: '👥' },
        { label: 'Pertandingan', route: 'matches.index', icon: '⚔️' },
    ],
    coach: [
        { label: 'Dashboard', route: 'dashboard', icon: '📊' },
        { label: 'Tim Saya', route: 'teams.index', icon: '👥' },
        { label: 'Turnamen', route: 'coach.tournaments.index', icon: '🏆' },
        { label: 'Riwayat Turnamen', route: 'coach.tournaments.history', icon: '📜' },
    ],
    referee: [
        { label: 'Dashboard', route: 'dashboard', icon: '📊' },
    ],
};

export default function AuthenticatedLayout({ header, children }) {
    const { auth, flash } = usePage().props;
    const user = auth.user;
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const navItems = NAV_ITEMS[user.role] || [];

    const roleBadge = {
        admin: { label: 'Admin', color: 'bg-red-500/20 text-red-300' },
        coach: { label: 'Pelatih', color: 'bg-blue-500/20 text-blue-300' },
        referee: { label: 'Wasit', color: 'bg-amber-500/20 text-amber-300' },
    };

    return (
        <div className="min-h-screen bg-surface-950 flex">
            {/* Sidebar Overlay (mobile) */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-64 bg-surface-900 border-r border-surface-700/50
                transform transition-transform duration-300 ease-in-out
                lg:translate-x-0 lg:static lg:z-auto
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                {/* Logo */}
                <div className="h-16 flex items-center px-6 border-b border-surface-700/50">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-glow-primary">
                            T
                        </div>
                        <span className="text-lg font-bold bg-gradient-to-r from-primary-300 to-primary-500 bg-clip-text text-transparent">
                            Takraw UNJ
                        </span>
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="p-4 space-y-1">
                    {navItems.map((item) => {
                        const isActive = route().current(item.route);
                        return (
                            <Link
                                key={item.route}
                                href={route(item.route)}
                                className={`
                                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                                    transition-all duration-200
                                    ${isActive
                                        ? 'bg-primary-600/20 text-primary-300 shadow-glow-primary'
                                        : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800'
                                    }
                                `}
                            >
                                <span className="text-lg">{item.icon}</span>
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* User info at bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-surface-700/50">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-sm font-bold">
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-surface-200 truncate">{user.name}</p>
                            <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${roleBadge[user.role]?.color}`}>
                                {roleBadge[user.role]?.label}
                            </span>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top Bar */}
                <header className="h-16 bg-surface-900/50 backdrop-blur-xl border-b border-surface-700/50 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
                    {/* Mobile menu button */}
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="lg:hidden p-2 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>

                    {/* Header Title */}
                    <div className="flex-1 lg:flex-none">
                        {header && (
                            <h1 className="text-lg font-semibold text-surface-100">{header}</h1>
                        )}
                    </div>

                    {/* Right: User dropdown */}
                    <div className="flex items-center gap-3">
                        <Dropdown>
                            <Dropdown.Trigger>
                                <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-surface-300 hover:text-surface-100 hover:bg-surface-800 transition-colors">
                                    {user.name}
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                            </Dropdown.Trigger>
                            <Dropdown.Content>
                                <Dropdown.Link href={route('profile.edit')}>
                                    Profil
                                </Dropdown.Link>
                                <Dropdown.Link href={route('logout')} method="post" as="button">
                                    Keluar
                                </Dropdown.Link>
                            </Dropdown.Content>
                        </Dropdown>
                    </div>
                </header>

                {/* Flash Messages */}
                {flash?.success && (
                    <div className="mx-4 lg:mx-6 mt-4 px-4 py-3 rounded-lg bg-primary-600/20 border border-primary-500/30 text-primary-300 text-sm animate-slide-up">
                        ✅ {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div className="mx-4 lg:mx-6 mt-4 px-4 py-3 rounded-lg bg-red-600/20 border border-red-500/30 text-red-300 text-sm animate-slide-up">
                        ❌ {flash.error}
                    </div>
                )}

                {/* Page Content */}
                <main className="flex-1 p-4 lg:p-6 animate-fade-in">
                    {children}
                </main>
            </div>
        </div>
    );
}
