import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { useState, useMemo } from 'react';

export default function UserIndex({ users }) {
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('all'); // all, admin, coach, referee
    const [isOpen, setIsOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);

    const { data, setData, post, put, errors, reset, processing, clearErrors } = useForm({
        id: '',
        name: '',
        email: '',
        password: '',
        role: 'coach',
        phone: '',
        is_active: true,
    });

    // Filtering logic
    const filteredUsers = useMemo(() => {
        return users.filter((user) => {
            const matchesSearch =
                user.name.toLowerCase().includes(search.toLowerCase()) ||
                user.email.toLowerCase().includes(search.toLowerCase()) ||
                (user.phone && user.phone.includes(search));
            
            const matchesTab = activeTab === 'all' || user.role === activeTab;
            
            return matchesSearch && matchesTab;
        });
    }, [users, search, activeTab]);

    // Role count helper
    const counts = useMemo(() => {
        return {
            all: users.length,
            admin: users.filter(u => u.role === 'admin').length,
            coach: users.filter(u => u.role === 'coach').length,
            referee: users.filter(u => u.role === 'referee').length,
        };
    }, [users]);

    // Open modal for Create
    const openCreateModal = () => {
        reset();
        clearErrors();
        setEditMode(false);
        setIsOpen(true);
    };

    // Open modal for Edit
    const openEditModal = (user) => {
        clearErrors();
        setEditMode(true);
        setData({
            id: user.id,
            name: user.name,
            email: user.email,
            password: '', // blank by default for edit
            role: user.role,
            phone: user.phone || '',
            is_active: user.is_active,
        });
        setIsOpen(true);
    };

    // Close modal
    const closeModal = () => {
        setIsOpen(false);
        reset();
    };

    // Handle Submit (Create or Update)
    const handleSubmit = (e) => {
        e.preventDefault();
        if (editMode) {
            put(route('users.update', data.id), {
                onSuccess: () => closeModal(),
            });
        } else {
            post(route('users.store'), {
                onSuccess: () => closeModal(),
            });
        }
    };

    // Handle Active Toggle
    const handleToggleActive = (user) => {
        router.patch(
            route('users.toggle-active', user.id),
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    // Refresh current lists
                }
            }
        );
    };

    // Handle Delete Confirmation
    const confirmDelete = (user) => {
        setUserToDelete(user);
        setDeleteConfirmOpen(true);
    };

    const handleDelete = () => {
        if (userToDelete) {
            router.delete(route('users.destroy', userToDelete.id), {
                onSuccess: () => {
                    setDeleteConfirmOpen(false);
                    setUserToDelete(null);
                },
            });
        }
    };

    const getRoleBadgeColor = (role) => {
        switch (role) {
            case 'admin':
                return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
            case 'coach':
                return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
            case 'referee':
                return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
            default:
                return 'bg-surface-500/20 text-surface-300 border-surface-500/30';
        }
    };

    const getRoleLabel = (role) => {
        switch (role) {
            case 'admin': return 'Admin';
            case 'coach': return 'Pelatih';
            case 'referee': return 'Wasit';
            default: return role;
        }
    };

    return (
        <AuthenticatedLayout header="Manajemen Akun User">
            <Head title="Kelola User" />

            <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                {/* Search and Action */}
                <div className="relative flex-1 max-w-md">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-surface-500">
                        🔍
                    </span>
                    <input
                        type="text"
                        placeholder="Cari nama, email, atau telepon..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-surface-700/50 bg-surface-900/40 text-surface-200 placeholder-surface-500 focus:outline-none focus:border-primary-500 transition-colors text-sm"
                    />
                </div>
                
                <button
                    onClick={openCreateModal}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-primary-600/20 hover:shadow-primary-600/30"
                >
                    <span>➕</span> Tambah Akun Baru
                </button>
            </div>

            {/* Role Filter Tabs */}
            <div className="mb-6 flex flex-wrap gap-2 border-b border-surface-700/30 pb-4">
                {[
                    { id: 'all', label: 'Semua' },
                    { id: 'admin', label: 'Admin' },
                    { id: 'coach', label: 'Pelatih' },
                    { id: 'referee', label: 'Wasit' }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                            activeTab === tab.id
                                ? 'bg-primary-600/20 text-primary-300 border border-primary-500/30 shadow-glow-primary'
                                : 'bg-surface-800/30 text-surface-400 border border-transparent hover:bg-surface-800/50 hover:text-surface-200'
                        }`}
                    >
                        <span>
                            {tab.id === 'all' && '👥'}
                            {tab.id === 'admin' && '🧑‍💻'}
                            {tab.id === 'coach' && '🏃'}
                            {tab.id === 'referee' && '🧑‍⚖️'}
                        </span>
                        {tab.label}
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                            activeTab === tab.id ? 'bg-primary-500/30 text-primary-200' : 'bg-surface-800 text-surface-500'
                        }`}>
                            {counts[tab.id]}
                        </span>
                    </button>
                ))}
            </div>

            {/* Table Card */}
            <div className="rounded-xl border border-surface-700/50 bg-surface-900/50 backdrop-blur-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-surface-700/50 bg-surface-950/40 text-xs font-semibold uppercase tracking-wider text-surface-400">
                                <th className="px-6 py-4">Nama & Email</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">No. Telepon</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-700/30 text-sm text-surface-300">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="text-center py-12 text-surface-500">
                                        <div className="text-4xl mb-3">📭</div>
                                        Tidak ada data user ditemukan
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-surface-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-surface-100">{user.name}</div>
                                            <div className="text-xs text-surface-500 mt-0.5">{user.email}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${getRoleBadgeColor(user.role)}`}>
                                                {user.role === 'admin' && '🧑‍💻'}
                                                {user.role === 'coach' && '🏃'}
                                                {user.role === 'referee' && '🧑‍⚖️'}
                                                {getRoleLabel(user.role)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs text-surface-400">
                                            {user.phone || '—'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center">
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleActive(user)}
                                                    className={`${
                                                        user.is_active ? 'bg-emerald-500' : 'bg-surface-700'
                                                    } relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500/50`}
                                                >
                                                    <span
                                                        className={`${
                                                            user.is_active ? 'translate-x-5' : 'translate-x-0'
                                                        } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out`}
                                                    />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                <button
                                                    onClick={() => openEditModal(user)}
                                                    className="p-1.5 rounded-lg bg-surface-800 text-surface-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all text-xs flex items-center gap-1 border border-surface-700/50 hover:border-blue-500/30"
                                                    title="Edit Akun"
                                                >
                                                    ✏️ <span className="hidden md:inline">Edit</span>
                                                </button>
                                                <button
                                                    onClick={() => confirmDelete(user)}
                                                    className="p-1.5 rounded-lg bg-surface-800 text-surface-400 hover:text-red-400 hover:bg-red-500/10 transition-all text-xs flex items-center gap-1 border border-surface-700/50 hover:border-red-500/30"
                                                    title="Hapus Akun"
                                                >
                                                    🗑️ <span className="hidden md:inline">Hapus</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-sm transition-opacity duration-300">
                    <div className="w-full max-w-lg bg-surface-900 border border-surface-700/60 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-surface-800 flex items-center justify-between bg-surface-950/20">
                            <h3 className="text-lg font-semibold text-surface-100">
                                {editMode ? '✏️ Edit Akun User' : '➕ Tambah Akun Baru'}
                            </h3>
                            <button
                                onClick={closeModal}
                                className="text-surface-500 hover:text-surface-300 p-1 rounded-lg hover:bg-surface-800 transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {/* Name */}
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-surface-400 mb-1">Nama Lengkap</label>
                                <input
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-surface-700/60 bg-surface-950/50 text-surface-200 focus:outline-none focus:border-primary-500 transition-colors text-sm"
                                    placeholder="Contoh: Budi Santoso"
                                    required
                                />
                                {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-surface-400 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-surface-700/60 bg-surface-950/50 text-surface-200 focus:outline-none focus:border-primary-500 transition-colors text-sm"
                                    placeholder="nama@email.com"
                                    required
                                />
                                {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-surface-400 mb-1">
                                    Password {editMode && <span className="text-[10px] text-surface-500 capitalize font-normal">(kosongkan jika tidak diubah)</span>}
                                </label>
                                <input
                                    type="password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-surface-700/60 bg-surface-950/50 text-surface-200 focus:outline-none focus:border-primary-500 transition-colors text-sm"
                                    placeholder="Minimal 8 karakter"
                                    required={!editMode}
                                />
                                {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Role */}
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-surface-400 mb-1">Role Utama</label>
                                    <select
                                        value={data.role}
                                        onChange={(e) => setData('role', e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-surface-700/60 bg-surface-950/50 text-surface-200 focus:outline-none focus:border-primary-500 transition-colors text-sm"
                                    >
                                        <option value="admin" className="bg-surface-900 text-surface-200">Admin</option>
                                        <option value="coach" className="bg-surface-900 text-surface-200">Pelatih</option>
                                        <option value="referee" className="bg-surface-900 text-surface-200">Wasit</option>
                                    </select>
                                    {errors.role && <p className="text-red-400 text-xs mt-1">{errors.role}</p>}
                                </div>

                                {/* Phone */}
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-surface-400 mb-1">No. Telepon</label>
                                    <input
                                        type="text"
                                        value={data.phone}
                                        onChange={(e) => setData('phone', e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-surface-700/60 bg-surface-950/50 text-surface-200 focus:outline-none focus:border-primary-500 transition-colors text-sm"
                                        placeholder="0812xxxxxxxx"
                                    />
                                    {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
                                </div>
                            </div>

                            {/* Status Active Switch */}
                            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-950/30 border border-surface-800">
                                <div>
                                    <span className="block text-sm font-medium text-surface-200">Aktifkan Akun</span>
                                    <span className="block text-xs text-surface-500">Status akun aktif dapat login ke sistem</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setData('is_active', !data.is_active)}
                                    className={`${
                                        data.is_active ? 'bg-emerald-500' : 'bg-surface-700'
                                    } relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none`}
                                >
                                    <span
                                        className={`${
                                            data.is_active ? 'translate-x-5' : 'translate-x-0'
                                        } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out`}
                                    />
                                </button>
                            </div>

                            {/* Modal Footer Actions */}
                            <div className="pt-4 border-t border-surface-800 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2.5 rounded-xl border border-surface-700 text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-all text-sm font-medium"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-medium text-sm shadow-lg shadow-primary-600/20 hover:shadow-primary-600/30 transition-all flex items-center justify-center gap-2"
                                >
                                    {processing ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            Menyimpan...
                                        </>
                                    ) : (
                                        'Simpan Perubahan'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-surface-900 border border-surface-700/60 rounded-2xl shadow-2xl overflow-hidden p-6 text-center animate-in fade-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center text-2xl mx-auto mb-4 border border-red-500/25 animate-bounce">
                            ⚠️
                        </div>
                        <h3 className="text-lg font-semibold text-surface-100 mb-2">Konfirmasi Hapus Akun</h3>
                        <p className="text-sm text-surface-400 mb-6">
                            Apakah Anda yakin ingin menghapus akun <span className="font-semibold text-surface-200">{userToDelete?.name}</span> ({userToDelete?.email})? Aksi ini tidak dapat dibatalkan secara langsung.
                        </p>
                        <div className="flex justify-center gap-3">
                            <button
                                onClick={() => {
                                    setDeleteConfirmOpen(false);
                                    setUserToDelete(null);
                                }}
                                className="px-4 py-2.5 rounded-xl border border-surface-700 text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-all text-sm font-medium"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleDelete}
                                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium text-sm shadow-lg shadow-red-600/20 hover:shadow-red-500/35 transition-all"
                            >
                                Ya, Hapus Akun
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
