import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import { useState, useEffect } from 'react';

function AthleteAvatarUpload({ index, photoFile, existingUrl, onChange }) {
    const [previewUrl, setPreviewUrl] = useState(null);

    useEffect(() => {
        if (photoFile) {
            const url = URL.createObjectURL(photoFile);
            setPreviewUrl(url);
            return () => URL.revokeObjectURL(url);
        }
        setPreviewUrl(null);
    }, [photoFile]);

    const displayUrl = previewUrl || existingUrl;
    const inputId = `athlete-photo-edit-${index}`;

    return (
        <div className="relative shrink-0 mt-1">
            <input
                type="file"
                id={inputId}
                accept="image/*"
                onChange={(e) => onChange(e.target.files[0] || null)}
                className="hidden"
            />
            <label
                htmlFor={inputId}
                className="w-8 h-8 rounded-lg bg-surface-700 flex items-center justify-center text-xs font-bold text-surface-400 cursor-pointer overflow-hidden border border-surface-600 hover:border-primary-500 transition-colors block"
                title="Unggah foto atlet"
            >
                {displayUrl ? (
                    <img src={displayUrl} alt="Preview foto atlet" className="w-full h-full object-cover" />
                ) : (
                    <span>{index + 1}</span>
                )}
            </label>
            {displayUrl && (
                <button
                    type="button"
                    onClick={() => onChange(null)}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] leading-none flex items-center justify-center hover:bg-red-600"
                    title="Hapus foto"
                >
                    ×
                </button>
            )}
        </div>
    );
}

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
            photo: null,
            photo_url: a.photo_url || null,
        })),
    });

    const addAthlete = () => {
        setData('athletes', [...data.athletes, { id: null, name: '', jersey_number: '', position: '', photo: null, photo_url: null }]);
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

    const jerseyNumbers = data.athletes
        .map(a => (a.jersey_number !== '' && a.jersey_number !== null && a.jersey_number !== undefined) ? parseInt(a.jersey_number, 10) : null)
        .filter(n => n !== null && !isNaN(n));
    const duplicateJerseys = jerseyNumbers.filter((num, idx) => jerseyNumbers.indexOf(num) !== idx);

    const handleCsvUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            const lines = text.split(/\r?\n/);
            if (lines.length <= 1) return;

            const importedAthletes = [];
            const seenJerseys = new Set();
            const duplicateInCsv = [];

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
                    if (seenJerseys.has(jerseyNumber)) {
                        duplicateInCsv.push(jerseyNumber);
                    }
                    seenJerseys.add(jerseyNumber);

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

            if (duplicateInCsv.length > 0) {
                alert(`Perhatian: File CSV berisi nomor punggung duplikat (#${duplicateInCsv.join(', #')}). Harap pastikan setiap pemain memiliki nomor punggung unik.`);
            }

            if (importedAthletes.length > 0) {
                setData('athletes', importedAthletes);
            }
        };
        reader.readAsText(file);
        e.target.value = null; // reset input
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (duplicateJerseys.length > 0) {
            alert(`Nomor punggung #${duplicateJerseys[0]} digunakan lebih dari 1 atlet. Harap ubah agar semua nomor punggung unik.`);
            return;
        }

        patch(route('teams.update', team.id), {
            forceFormData: true,
        });
    };

    return (
        <AuthenticatedLayout header={`Edit: ${team.name}`}>
            <Head title={`Edit: ${team.name}`} />

            <div className="max-w-3xl mx-auto">
                <div className="mb-6">
                    <Link href={route('teams.show', team.id)} className="text-sm text-surface-400 hover:text-surface-200 transition-colors flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                        </svg>
                        Kembali ke Detail Tim
                    </Link>
                </div>

                {team.is_locked && (
                    <div className="mb-6 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 backdrop-blur-sm flex items-start gap-3">
                        <div className="text-2xl shrink-0">🔒</div>
                        <div>
                            <h4 className="text-sm font-bold text-amber-200">
                                Roster Tim Ini Terkunci
                            </h4>
                            <p className="text-xs text-amber-300/80 mt-1 leading-relaxed">
                                Tim ini telah memiliki riwayat penilaian dalam pertandingan (Live / Selesai). Perubahan data tim dan atlet tidak diizinkan demi menjaga integritas data statistik.
                            </p>
                        </div>
                    </div>
                )}

                <div className="rounded-2xl border border-surface-700/50 bg-surface-900/60 backdrop-blur-sm p-6 shadow-xl">
                    <h2 className="text-xl font-bold text-surface-100 mb-6 flex items-center gap-2">
                        <span>✏️ Edit Tim</span>
                        {team.is_locked && <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-normal">Terkunci</span>}
                    </h2>

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
                            {errors.coach_id && <p className="text-red-400 text-xs mt-1">{errors.coach_id}</p>}
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

                            {duplicateJerseys.length > 0 && (
                                <div className="mb-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                                    <span>⚠️</span>
                                    <span>Nomor punggung <strong>#{duplicateJerseys.join(', #')}</strong> kembar! Setiap pemain dalam tim harus memiliki nomor punggung unik.</span>
                                </div>
                            )}

                            <div className="space-y-3">
                                {data.athletes.map((athlete, index) => {
                                    const isDup = athlete.jersey_number && duplicateJerseys.includes(parseInt(athlete.jersey_number, 10));
                                    const athleteJerseyError = errors[`athletes.${index}.jersey_number`];
                                    const athleteNameError = errors[`athletes.${index}.name`];

                                    return (
                                        <div key={index} className={`flex flex-col gap-1 p-4 rounded-xl bg-surface-800/50 border ${isDup ? 'border-red-500/60 bg-red-950/10' : 'border-surface-700/30'}`}>
                                            <div className="flex items-start gap-3">
                                                <AthleteAvatarUpload
                                                    index={index}
                                                    photoFile={athlete.photo}
                                                    existingUrl={athlete.photo_url}
                                                    onChange={(file) => updateAthlete(index, 'photo', file)}
                                                />
                                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                    <div>
                                                        <input
                                                            type="text"
                                                            value={athlete.name}
                                                            onChange={(e) => updateAthlete(index, 'name', e.target.value)}
                                                            className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-100 text-sm placeholder-surface-600 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                                                            placeholder="Nama Atlet"
                                                        />
                                                        {athleteNameError && <p className="text-red-400 text-xs mt-1">{athleteNameError}</p>}
                                                    </div>
                                                    <div>
                                                        <input
                                                            type="number"
                                                            value={athlete.jersey_number}
                                                            onChange={(e) => updateAthlete(index, 'jersey_number', e.target.value)}
                                                            className={`w-full px-3 py-2 rounded-lg bg-surface-800 border ${isDup || athleteJerseyError ? 'border-red-500 text-red-300' : 'border-surface-700 text-surface-100'} text-sm placeholder-surface-600 focus:border-primary-500 focus:ring-1 focus:ring-primary-500`}
                                                            placeholder="No. Punggung"
                                                            min="1"
                                                            max="999"
                                                        />
                                                        {isDup && <p className="text-red-400 text-[11px] mt-0.5">Nomor kembar</p>}
                                                        {athleteJerseyError && <p className="text-red-400 text-xs mt-1">{athleteJerseyError}</p>}
                                                    </div>
                                                    <div>
                                                        <input
                                                            type="text"
                                                            value={athlete.position}
                                                            onChange={(e) => updateAthlete(index, 'position', e.target.value)}
                                                            className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-100 text-sm placeholder-surface-600 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                                                            placeholder="Posisi (Tekong, Feeder, dll)"
                                                        />
                                                    </div>
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
                                        </div>
                                    );
                                })}
                            </div>

                            {errors['athletes'] && <p className="text-red-400 text-xs mt-2">{errors['athletes']}</p>}
                            {Object.keys(errors).filter(k => k.startsWith('athletes.') && !k.includes('.name') && !k.includes('.jersey_number')).map(k => (
                                <p key={k} className="text-red-400 text-xs mt-1">{errors[k]}</p>
                            ))}
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
                                disabled={processing || duplicateJerseys.length > 0}
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
