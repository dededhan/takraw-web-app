import { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const MODES = [
    { key: 'regu',        label: 'Regu',        desc: '3 pemain, mode standar', icon: '🏐', color: '#1d4ed8' },
    { key: 'double',      label: 'Double',       desc: '2 pemain', icon: '👥', color: '#059669' },
    { key: 'quadrant',    label: 'Quadrant',     desc: '4 pemain', icon: '⬡', color: '#7c3aed' },
    { key: 'team_regu',   label: 'Team Regu',    desc: 'Super Team (3 tim regu)', icon: '🏆', color: '#d97706' },
    { key: 'team_double', label: 'Team Double',  desc: 'Super Team (3 tim double)', icon: '🥇', color: '#dc2626' },
];

/**
 * Config — Wizard 3-step konfigurasi parameter Master Schedule.
 */
export default function Config({ tournament, preview: initialPreview }) {
    const [step, setStep]       = useState(1);
    const [preview, setPreview] = useState(initialPreview);

    const { data, setData, post, processing, errors } = useForm({
        total_days:               tournament.total_days || 5,
        courts_count:             tournament.courts_count || 4,
        session_start_time:       tournament.session_start_time?.slice(0, 5) || '08:00',
        session_end_time:         tournament.session_end_time?.slice(0, 5) || '17:00',
        session_duration_minutes: tournament.session_duration_minutes || 50,
        break_duration_minutes:   tournament.break_duration_minutes || 10,
        has_ishoma:               !!tournament.ishoma_start_time,
        ishoma_start_time:        tournament.ishoma_start_time?.slice(0, 5) || '12:00',
        ishoma_end_time:          tournament.ishoma_end_time?.slice(0, 5) || '13:00',
        modes:                    tournament.modes?.filter(m => m.is_active).map(m => m.match_mode) || ['regu'],
        pool_counts:              Object.fromEntries(
            (tournament.modes || []).map(m => [m.match_mode, m.pool_count])
        ),
    });

    const toggleMode = (key) => {
        setData('modes', data.modes.includes(key)
            ? data.modes.filter(m => m !== key)
            : [...data.modes, key]
        );
    };

    const setPoolCount = (mode, count) => {
        setData('pool_counts', { ...data.pool_counts, [mode]: count });
    };

    const calcPreview = () => {
        const start  = data.session_start_time.split(':').map(Number);
        const end    = data.session_end_time.split(':').map(Number);
        const total  = (end[0] * 60 + end[1]) - (start[0] * 60 + start[1]);
        let ishoma   = 0;
        if (data.has_ishoma) {
            const is = data.ishoma_start_time.split(':').map(Number);
            const ie = data.ishoma_end_time.split(':').map(Number);
            ishoma   = (ie[0] * 60 + ie[1]) - (is[0] * 60 + is[1]);
        }
        const net       = total - ishoma;
        const interval  = +data.session_duration_minutes + +data.break_duration_minutes;
        const slotsDay  = Math.floor(net / interval);
        const capacity  = slotsDay * data.total_days * data.courts_count;

        setPreview({ match_slots_per_day: slotsDay, total_capacity: capacity, slots_per_day: slotsDay + (data.has_ishoma ? 1 : 0) });
        setStep(3);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const payload = {
            ...data,
            ishoma_start_time: data.has_ishoma ? data.ishoma_start_time : null,
            ishoma_end_time:   data.has_ishoma ? data.ishoma_end_time : null,
        };
        post(route('tournaments.master-schedule.save-config', tournament.id));
    };

    return (
        <AuthenticatedLayout header={
            <div className="flex items-center gap-3">
                <a href={route('tournaments.show', tournament.id)} className="text-gray-400 hover:text-gray-600 text-sm">
                    ← {tournament.name}
                </a>
                <span className="text-gray-300">/</span>
                <h2 className="text-xl font-bold text-gray-900">Konfigurasi Master Schedule</h2>
            </div>
        }>
            <Head title={`Konfigurasi Jadwal — ${tournament.name}`} />

            <div className="max-w-3xl mx-auto py-8 px-4">
                {/* Step Indicator */}
                <StepIndicator current={step} />

                <form onSubmit={handleSubmit} className="mt-8">
                    {/* ─── STEP 1: Parameter Global ─── */}
                    {step === 1 && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
                            <h3 className="text-lg font-bold text-gray-900">Parameter Global Turnamen</h3>

                            <div className="grid grid-cols-2 gap-4">
                                <Field label="Total Hari Turnamen" error={errors.total_days}>
                                    <input type="number" min={1} max={14} value={data.total_days}
                                        onChange={e => setData('total_days', +e.target.value)}
                                        className="input-field"
                                    />
                                </Field>
                                <Field label="Jumlah Lapangan" error={errors.courts_count}>
                                    <input type="number" min={1} max={20} value={data.courts_count}
                                        onChange={e => setData('courts_count', +e.target.value)}
                                        className="input-field"
                                    />
                                </Field>
                                <Field label="Jam Mulai Sesi" error={errors.session_start_time}>
                                    <input type="time" value={data.session_start_time}
                                        onChange={e => setData('session_start_time', e.target.value)}
                                        className="input-field"
                                    />
                                </Field>
                                <Field label="Jam Selesai Sesi" error={errors.session_end_time}>
                                    <input type="time" value={data.session_end_time}
                                        onChange={e => setData('session_end_time', e.target.value)}
                                        className="input-field"
                                    />
                                </Field>
                                <Field label="Durasi Satu Sesi (menit)" error={errors.session_duration_minutes}>
                                    <input type="number" min={10} max={180} value={data.session_duration_minutes}
                                        onChange={e => setData('session_duration_minutes', +e.target.value)}
                                        className="input-field"
                                    />
                                </Field>
                                <Field label="Jeda Antar Sesi (menit)" error={errors.break_duration_minutes}>
                                    <input type="number" min={0} max={60} value={data.break_duration_minutes}
                                        onChange={e => setData('break_duration_minutes', +e.target.value)}
                                        className="input-field"
                                    />
                                </Field>
                            </div>

                            {/* ISHOMA Toggle */}
                            <div className="border-t pt-5">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" checked={data.has_ishoma}
                                        onChange={e => setData('has_ishoma', e.target.checked)}
                                        className="w-4 h-4 rounded text-blue-600"
                                    />
                                    <span className="font-medium text-gray-800">Ada ISHOMA / UPP</span>
                                    <span className="text-sm text-gray-400">(Berlaku serentak semua lapangan)</span>
                                </label>

                                {data.has_ishoma && (
                                    <div className="grid grid-cols-2 gap-4 mt-4 ml-7">
                                        <Field label="Mulai ISHOMA" error={errors.ishoma_start_time}>
                                            <input type="time" value={data.ishoma_start_time}
                                                onChange={e => setData('ishoma_start_time', e.target.value)}
                                                className="input-field"
                                            />
                                        </Field>
                                        <Field label="Selesai ISHOMA" error={errors.ishoma_end_time}>
                                            <input type="time" value={data.ishoma_end_time}
                                                onChange={e => setData('ishoma_end_time', e.target.value)}
                                                className="input-field"
                                            />
                                        </Field>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end">
                                <button type="button" onClick={() => setStep(2)}
                                    className="btn-primary">
                                    Lanjut: Pilih Mode Tanding →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ─── STEP 2: Mode Tanding ─── */}
                    {step === 2 && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
                            <h3 className="text-lg font-bold text-gray-900">Mode Tanding yang Aktif</h3>
                            <p className="text-sm text-gray-500">Pilih mode yang akan dipertandingkan dan tentukan jumlah poolnya.</p>

                            {errors.modes && (
                                <p className="text-sm text-red-500">{errors.modes}</p>
                            )}

                            <div className="space-y-3">
                                {MODES.map(mode => {
                                    const isActive = data.modes.includes(mode.key);
                                    return (
                                        <div key={mode.key}
                                            className={`rounded-xl border-2 p-4 cursor-pointer transition-all ${
                                                isActive ? 'border-opacity-100 bg-opacity-5' : 'border-gray-100 bg-gray-50'
                                            }`}
                                            style={isActive ? { borderColor: mode.color, backgroundColor: mode.color + '10' } : {}}
                                            onClick={() => toggleMode(mode.key)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <input type="checkbox" checked={isActive} readOnly
                                                    className="w-4 h-4 rounded" style={{ accentColor: mode.color }}
                                                />
                                                <span className="text-xl">{mode.icon}</span>
                                                <div className="flex-1">
                                                    <p className="font-semibold text-gray-900">{mode.label}</p>
                                                    <p className="text-xs text-gray-500">{mode.desc}</p>
                                                </div>
                                                {isActive && (
                                                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                                        <label className="text-sm text-gray-600">Jumlah Pool:</label>
                                                        <select
                                                            value={data.pool_counts[mode.key] || 2}
                                                            onChange={e => setPoolCount(mode.key, +e.target.value)}
                                                            className="rounded-lg border border-gray-200 px-2 py-1 text-sm"
                                                        >
                                                            {[2, 3, 4, 6, 8].map(n => (
                                                                <option key={n} value={n}>{n} Pool</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex justify-between pt-2">
                                <button type="button" onClick={() => setStep(1)}
                                    className="btn-secondary">
                                    ← Kembali
                                </button>
                                <button type="button"
                                    onClick={calcPreview}
                                    disabled={data.modes.length === 0}
                                    className="btn-primary disabled:opacity-50">
                                    Lanjut: Preview →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ─── STEP 3: Preview & Submit ─── */}
                    {step === 3 && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
                            <h3 className="text-lg font-bold text-gray-900">Ringkasan Konfigurasi</h3>

                            {/* Summary cards */}
                            <div className="grid grid-cols-2 gap-4">
                                <SummaryCard icon="📅" label="Total Hari" value={data.total_days} />
                                <SummaryCard icon="🏟️" label="Jumlah Lapangan" value={data.courts_count} />
                                <SummaryCard icon="⏰" label="Jam Sesi" value={`${data.session_start_time}–${data.session_end_time}`} />
                                <SummaryCard icon="⏱️" label="Durasi Sesi" value={`${data.session_duration_minutes} menit`} />
                                {data.has_ishoma && (
                                    <SummaryCard icon="🕌" label="ISHOMA" value={`${data.ishoma_start_time}–${data.ishoma_end_time}`} />
                                )}
                                {preview && (
                                    <>
                                        <SummaryCard icon="🗓️" label="Slot Match/Hari" value={preview.match_slots_per_day} />
                                        <SummaryCard icon="📊" label="Total Kapasitas Match" value={preview.total_capacity}
                                            note="(semua lapangan & hari)" />
                                    </>
                                )}
                            </div>

                            {/* Mode summary */}
                            <div className="rounded-xl bg-gray-50 p-4">
                                <p className="text-sm font-semibold text-gray-700 mb-2">Mode Tanding Aktif:</p>
                                <div className="flex flex-wrap gap-2">
                                    {data.modes.map(m => {
                                        const mode = MODES.find(x => x.key === m);
                                        return (
                                            <span key={m}
                                                className="px-3 py-1 rounded-full text-white text-xs font-medium"
                                                style={{ backgroundColor: mode?.color }}>
                                                {mode?.icon} {mode?.label} — {data.pool_counts[m] || 2} Pool
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex justify-between pt-2">
                                <button type="button" onClick={() => setStep(2)} className="btn-secondary">
                                    ← Kembali
                                </button>
                                <button type="submit" disabled={processing}
                                    className="btn-primary disabled:opacity-50 flex items-center gap-2">
                                    {processing && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                    Simpan & Lanjut ke Bracket Matrix →
                                </button>
                            </div>
                        </div>
                    )}
                </form>
            </div>

            <style>{`
                .input-field { @apply w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500; }
                .btn-primary { @apply bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors text-sm; }
                .btn-secondary { @apply bg-gray-100 text-gray-700 px-5 py-2.5 rounded-xl font-medium hover:bg-gray-200 transition-colors text-sm; }
            `}</style>
        </AuthenticatedLayout>
    );
}

function StepIndicator({ current }) {
    const steps = ['Parameter Global', 'Mode Tanding', 'Preview & Simpan'];
    return (
        <div className="flex items-center gap-0">
            {steps.map((label, i) => {
                const n = i + 1;
                const active   = current === n;
                const done     = current > n;
                return (
                    <div key={n} className="flex items-center flex-1">
                        <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                                done    ? 'bg-green-500 text-white' :
                                active  ? 'bg-blue-600 text-white ring-4 ring-blue-100' :
                                          'bg-gray-100 text-gray-400'
                            }`}>
                                {done ? '✓' : n}
                            </div>
                            <span className={`text-xs mt-1 whitespace-nowrap ${active ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
                                {label}
                            </span>
                        </div>
                        {i < steps.length - 1 && (
                            <div className={`flex-1 h-0.5 mx-2 mb-4 ${done ? 'bg-green-400' : 'bg-gray-100'}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function Field({ label, error, children }) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            {children}
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
    );
}

function SummaryCard({ icon, label, value, note }) {
    return (
        <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
            <div className="flex items-center gap-2">
                <span className="text-xl">{icon}</span>
                <div>
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="font-bold text-gray-900">{value}</p>
                    {note && <p className="text-[10px] text-gray-400">{note}</p>}
                </div>
            </div>
        </div>
    );
}
