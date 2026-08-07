import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

/**
 * GenerateConfirm — Halaman konfirmasi sebelum Auto-Generate Jadwal.
 * Menampilkan ringkasan dan tombol 1-klik Generate.
 */
export default function GenerateConfirm({ tournament }) {
    const handleGenerate = () => {
        router.post(route('tournaments.master-schedule.generate', tournament.id));
    };

    return (
        <AuthenticatedLayout header={
            <div className="flex items-center gap-3">
                <a href={route('tournaments.master-schedule.bracket-matrix', tournament.id)}
                    className="text-gray-400 hover:text-gray-600 text-sm">← Bracket Matrix</a>
                <span className="text-gray-300">/</span>
                <h2 className="text-xl font-bold text-gray-900">Generate Master Schedule</h2>
            </div>
        }>
            <Head title={`Generate Jadwal — ${tournament.name}`} />

            <div className="max-w-2xl mx-auto py-16 px-4 text-center">
                <div className="text-7xl mb-6">🗓️</div>
                <h1 className="text-3xl font-extrabold text-gray-900 mb-3">
                    Siap Generate Jadwal Master?
                </h1>
                <p className="text-gray-500 mb-2">
                    Sistem akan otomatis membuat <strong>100% jadwal</strong> dari Hari 1 hingga Hari {tournament.total_days}:
                </p>
                <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto mt-6 mb-8 text-left">
                    {[
                        ['🕌', 'Blokir slot ISHOMA/Break'],
                        ['🏆', 'Plot match Mode Team (3 slot)'],
                        ['🏐', 'Plot match Pool tunggal'],
                        ['🔗', 'Buat match Braket (Placeholder)'],
                    ].map(([icon, text]) => (
                        <div key={text} className="flex items-center gap-2 bg-blue-50 rounded-xl p-3">
                            <span className="text-xl">{icon}</span>
                            <span className="text-sm text-blue-800 font-medium">{text}</span>
                        </div>
                    ))}
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 text-left">
                    <p className="text-sm text-amber-700">
                        ⚠️ <strong>Perhatian:</strong> Proses ini akan menghapus semua jadwal lama yang berstatus
                        <em> scheduled</em> dan membuat ulang dari awal. Match yang sudah <em>live/finished</em> tidak terpengaruh.
                    </p>
                </div>

                <button
                    onClick={handleGenerate}
                    className="bg-blue-600 text-white px-10 py-4 rounded-2xl text-lg font-bold hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl active:scale-95"
                >
                    ⚡ Generate Master Schedule Sekarang
                </button>

                <p className="text-xs text-gray-400 mt-4">
                    Setelah generate, Anda bisa mengedit jadwal secara manual via Drag & Drop.
                </p>
            </div>
        </AuthenticatedLayout>
    );
}
