import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link } from '@inertiajs/react';

export default function TeamEdit({ team, coaches }) {
    const { data, setData, patch, processing, errors } = useForm({
        name: team.name || '',
        region: team.region || '',
        coach_id: team.coach_id || '',
        athletes: (team.athletes || []).map(a => ({
            id: a.id,
            name: a.name,
            jersey_number: a.jersey_number,
            position: a.position || '',
        })),
    });

    const addAthlete = () => {
        setData('athletes', [...data.athletes, { id: null, name: '', jersey_number: '', position: '' }]);
    };

    const removeAthlete = (index) => {
        if (data.athletes.length <= 1) return;
        setData('athletes', data.athletes.filter((_, i) => i !== index));
    };

    const updateAthlete = (index, field, value) => {
        const updated = [...data.athletes];
        updated[index][field] = value;
        setData('athletes', updated);
    };

    const handleCsvUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            const lines = text.split(/\r?\n/);
            if (lines.length <= 1) return;

            const importedAthletes = [];
            // Skip header
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                const columns = line.split(',').map(col => col.replace(/^["']|["']$/g, '').trim());
                if (columns.length < 2) continue;

                const name = columns[0];
                const jerseyNumber = parseInt(columns[1], 10);
                let position = columns[2] || '';

                if (name && !isNaN(jerseyNumber)) {
                    if (position) {
                        position = position.charAt(0).toUpperCase() + position.slice(1).toLowerCase();
                    }
                    importedAthletes.push({
                        id: null, // new athlete
                        name,
                        jersey_number: jerseyNumber,
                        position: position
                    });
                }
            }

            if (importedAthletes.length > 0) {
                // We can append or replace. Overwriting/replacing is standard, but let's replace or ask.
                // In Edit mode, replacing the whole list is the same as Create mode.
                setData('athletes', importedAthletes);
            }
        };
        reader.readAsText(file);
        e.target.value = null; // reset input
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        patch(route('teams.update', team.id));
    };

    return (
        <AuthenticatedLayout header={`Edit: ${team.name}`}>
            <Head title={`Edit: ${team.name}`} />

            <div className="max-w-3xl mx-auto">
                <div className="mb-6">
                    <Link href={route('teams.show', team.id)} className="text-sm text-surface-500 hover:text-surface-300 transition-colors flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                        </svg>
                        Kembali ke Detail Tim
                    </Link>
                </div>

                <div className="rounded-xl border border-surface-700/50 bg-surface-900/50 backdrop-blur-sm p-6">
                    <h2 className="text-xl font-bold text-surface-100 mb-6">✏️ Edit Tim</h2>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Team Info */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-surface-300 mb-2">Nama Tim <span className="text-red-400">*</span></label>
                                <input
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-surface-800 border border-surface-700 text-surface-100 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
                                />
                                {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-surface-300 mb-2">Daerah <span className="text-red-400">*</span></label>
                                <input
                                    type="text"
                                    value={data.region}
                                    onChange={(e) => setData('region', e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-surface-800 border border-surface-700 text-surface-100 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
                                />
                                {errors.region && <p className="text-red-400 text-xs mt-1">{errors.region}</p>}
                            </div>
                        </div>

                        {/* Coach */}
                        <div>
                            <label className="block text-sm font-medium text-surface-300 mb-2">Pelatih</label>
                            <select
                                value={data.coach_id}
                                onChange={(e) => setData('coach_id', e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-surface-800 border border-surface-700 text-surface-100 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
                            >
                                <option value="">— Pilih Pelatih —</option>
                                {coaches?.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Athletes */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-sm font-medium text-surface-300">Daftar Atlet</label>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => document.getElementById('csv-file-input').click()}
                                        className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 transition-all flex items-center gap-1 font-semibold"
                                        title="Import daftar atlet dari file CSV"
                                    >
                                        📥 Import CSV
                                    </button>
                                    <input
                                        type="file"
                                        id="csv-file-input"
                                        accept=".csv"
                                        onChange={handleCsvUpload}
                                        className="hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={addAthlete}
                                        className="text-xs px-3 py-1.5 rounded-lg bg-primary-600/20 text-primary-300 border border-primary-500/30 hover:bg-primary-600/30 transition-colors"
                                    >
                                        + Tambah Atlet
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {data.athletes.map((athlete, index) => (
                                    <div key={index} className="flex items-start gap-3 p-4 rounded-xl bg-surface-800/50 border border-surface-700/30">
                                        <div className="w-8 h-8 rounded-lg bg-surface-700 flex items-center justify-center text-xs font-bold text-surface-400 shrink-0 mt-1">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <input
                                                type="text"
                                                value={athlete.name}
                                                onChange={(e) => updateAthlete(index, 'name', e.target.value)}
                                                className="px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-100 text-sm placeholder-surface-600 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                                                placeholder="Nama Atlet"
                                            />
                                            <input
                                                type="number"
                                                value={athlete.jersey_number}
                                                onChange={(e) => updateAthlete(index, 'jersey_number', e.target.value)}
                                                className="px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-100 text-sm placeholder-surface-600 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                                                placeholder="No. Punggung"
                                                min="1"
                                            />
                                            <input
                                                type="text"
                                                value={athlete.position}
                                                onChange={(e) => updateAthlete(index, 'position', e.target.value)}
                                                className="px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-100 text-sm placeholder-surface-600 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                                                placeholder="Posisi"
                                            />
                                        </div>
                                        {data.athletes.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeAthlete(index)}
                                                className="p-2 rounded-lg text-surface-500 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0 mt-1"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Submit */}
                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-700/50">
                            <Link
                                href={route('teams.show', team.id)}
                                className="px-5 py-2.5 rounded-xl text-sm font-medium text-surface-400 hover:text-surface-200 bg-surface-800 hover:bg-surface-700 transition-colors"
                            >
                                Batal
                            </Link>
                            <button
                                type="submit"
                                disabled={processing}
                                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-glow-primary"
                            >
                                {processing ? 'Menyimpan...' : '💾 Simpan Perubahan'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
