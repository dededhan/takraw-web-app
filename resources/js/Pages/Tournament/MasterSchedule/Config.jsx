import { useState, useEffect } from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const MODES = [
    { key: 'regu',        label: 'Regu',        desc: '3 vs 3 pemain (Mode Standar)', icon: '🏐', color: 'from-blue-600/30 to-blue-800/10 border-blue-500/40 text-blue-300' },
    { key: 'double',      label: 'Double',       desc: '2 vs 2 pemain', icon: '👥', color: 'from-emerald-600/30 to-emerald-800/10 border-emerald-500/40 text-emerald-300' },
    { key: 'quadrant',    label: 'Quadrant',     desc: '4 vs 4 pemain', icon: '⬡', color: 'from-purple-600/30 to-purple-800/10 border-purple-500/40 text-purple-300' },
    { key: 'team_regu',   label: 'Team Regu',    desc: 'Super Team (3 Sub-Tim Regu)', icon: '🏆', color: 'from-amber-600/30 to-amber-800/10 border-amber-500/40 text-amber-300' },
    { key: 'team_double', label: 'Team Double',  desc: 'Super Team (3 Sub-Tim Double)', icon: '🥇', color: 'from-red-600/30 to-red-800/10 border-red-500/40 text-red-300' },
];

const formatTime = (totalMinutes) => {
    const hours = Math.floor(totalMinutes / 60) % 24;
    const mins = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
};

export default function Config({ tournament, preview: initialPreview }) {
    const [step, setStep] = useState(1);
    const [calcMode, setCalcMode] = useState('auto'); // 'auto' | 'manual'
    const [sessionsBeforeBreak, setSessionsBeforeBreak] = useState(4);
    const [ishomaDurationMin, setIshomaDurationMin] = useState(60);
    const [sessionsAfterBreak, setSessionsAfterBreak] = useState(4);

    const { data, setData, post, processing, errors, transform } = useForm({
        total_days:               tournament.total_days || 5,
        courts_count:             tournament.courts_count || 4,
        session_start_time:       tournament.session_start_time?.slice(0, 5) || '08:00',
        session_end_time:         tournament.session_end_time?.slice(0, 5) || '17:00',
        session_duration_minutes: tournament.session_duration_minutes || 50,
        break_duration_minutes:   tournament.break_duration_minutes || 10,
        has_ishoma:               tournament.ishoma_start_time ? true : true,
        ishoma_start_time:        tournament.ishoma_start_time?.slice(0, 5) || '12:00',
        ishoma_end_time:          tournament.ishoma_end_time?.slice(0, 5) || '13:00',
        modes: (tournament.modes || []).filter(m => m.is_active).map(m => m.match_mode).length > 0
            ? tournament.modes.filter(m => m.is_active).map(m => m.match_mode)
            : ['regu'],
        pool_counts: {
            regu: 2,
            double: 2,
            quadrant: 2,
            team_regu: 2,
            team_double: 2,
            ...Object.fromEntries((tournament.modes || []).map(m => [m.match_mode, m.pool_count || 2])),
        },
    });

    // Smart Schedule Computation
    const computeSchedule = () => {
        const startMins = parseTimeToMinutes(data.session_start_time || '08:00');
        const sessionDur = Number(data.session_duration_minutes || 50);
        const breakDur = Number(data.break_duration_minutes || 10);
        const slotStep = sessionDur + breakDur;

        const sBefore = data.has_ishoma ? Math.max(1, Number(sessionsBeforeBreak)) : Math.max(1, Number(sessionsBeforeBreak) + Number(sessionsAfterBreak));
        const sAfter = data.has_ishoma ? Math.max(1, Number(sessionsAfterBreak)) : 0;
        const ishomaDur = data.has_ishoma ? Number(ishomaDurationMin) : 0;

        const slots = [];
        let currentMins = startMins;
        let slotNum = 1;

        // Morning Sessions
        for (let i = 0; i < sBefore; i++) {
            const mStart = currentMins;
            const mEnd = mStart + sessionDur;
            slots.push({
                slotNum: slotNum++,
                type: 'match',
                startTime: formatTime(mStart),
                endTime: formatTime(mEnd),
                period: `Pagi (Sesi ${i + 1})`,
            });
            currentMins = mStart + slotStep;
        }

        let computedIshomaStart = '';
        let computedIshomaEnd = '';

        if (data.has_ishoma) {
            // Ishoma starts after morning sessions
            computedIshomaStart = formatTime(currentMins);
            const ishomaEndMins = currentMins + ishomaDur;
            computedIshomaEnd = formatTime(ishomaEndMins);

            slots.push({
                slotNum: null,
                type: 'ishoma',
                startTime: computedIshomaStart,
                endTime: computedIshomaEnd,
                duration: ishomaDur,
                period: 'ISHOMA / Istirahat',
            });

            currentMins = ishomaEndMins;

            // Afternoon Sessions
            for (let i = 0; i < sAfter; i++) {
                const mStart = currentMins;
                const mEnd = mStart + sessionDur;
                slots.push({
                    slotNum: slotNum++,
                    type: 'match',
                    startTime: formatTime(mStart),
                    endTime: formatTime(mEnd),
                    period: `Siang-Sore (Sesi ${sBefore + i + 1})`,
                });
                currentMins = mStart + slotStep;
            }
        }

        // End of day is after the last afternoon slot
        const computedSessionEnd = formatTime(currentMins);

        return {
            slots,
            totalMatchSlots: slots.filter(s => s.type === 'match').length,
            computedIshomaStart,
            computedIshomaEnd,
            computedSessionEnd,
        };
    };

    const schedule = computeSchedule();

    // Auto-sync form times when in 'auto' mode
    useEffect(() => {
        if (calcMode === 'auto') {
            setData(prev => ({
                ...prev,
                ishoma_start_time: schedule.computedIshomaStart || '12:00',
                ishoma_end_time:   schedule.computedIshomaEnd || '13:00',
                session_end_time:  schedule.computedSessionEnd || '17:00',
            }));
        }
    }, [
        calcMode,
        data.session_start_time,
        data.session_duration_minutes,
        data.break_duration_minutes,
        data.has_ishoma,
        sessionsBeforeBreak,
        ishomaDurationMin,
        sessionsAfterBreak
    ]);

    const toggleMode = (key) => {
        const nextModes = data.modes.includes(key)
            ? data.modes.filter(m => m !== key)
            : [...data.modes, key];
        setData(prev => ({
            ...prev,
            modes: nextModes,
            pool_counts: {
                ...prev.pool_counts,
                [key]: prev.pool_counts?.[key] || 2,
            },
        }));
    };

    const setPoolCount = (mode, count) => {
        setData('pool_counts', { ...data.pool_counts, [mode]: count });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const resolvedPoolCounts = {};
        (data.modes || ['regu']).forEach(m => {
            resolvedPoolCounts[m] = Number(data.pool_counts?.[m] || 2);
        });

        transform((formData) => ({
            ...formData,
            total_days: Number(formData.total_days),
            courts_count: Number(formData.courts_count),
            session_duration_minutes: Number(formData.session_duration_minutes),
            break_duration_minutes: Number(formData.break_duration_minutes),
            ishoma_start_time: formData.has_ishoma ? formData.ishoma_start_time : null,
            ishoma_end_time:   formData.has_ishoma ? formData.ishoma_end_time : null,
            pool_counts: resolvedPoolCounts,
        }));

        post(route('tournaments.master-schedule.save-config', tournament.id), {
            preserveScroll: true,
            onError: (errs) => {
                // If there are errors in step 1 or 2, jump back to appropriate step
                if (errs.total_days || errs.courts_count || errs.session_start_time || errs.session_end_time || errs.ishoma_start_time || errs.ishoma_end_time) {
                    setStep(1);
                } else if (errs.modes || errs.pool_counts) {
                    setStep(2);
                }
            },
        });
    };

    const totalCapacity = schedule.totalMatchSlots * data.courts_count * data.total_days;

    return (
        <AuthenticatedLayout header={
            <div className="flex items-center gap-3">
                <Link href={route('tournaments.show', tournament.id)} className="text-surface-400 hover:text-surface-200 text-sm font-semibold transition-colors">
                    ← {tournament.name}
                </Link>
                <span className="text-surface-600">/</span>
                <h2 className="text-base font-bold text-surface-100">Konfigurasi Master Schedule</h2>
            </div>
        }>
            <Head title={`Konfigurasi Jadwal — ${tournament.name}`} />

            <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
                
                {/* Step Indicator */}
                <StepIndicator current={step} setStep={setStep} />

                {/* Error Banner if any */}
                {Object.keys(errors).length > 0 && (
                    <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center justify-between gap-3 animate-shake">
                        <div>
                            <p className="font-bold flex items-center gap-1.5">
                                <span>⚠️</span>
                                <span>Terdapat kesalahan pada input konfigurasi:</span>
                            </p>
                            <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px] text-red-400">
                                {Object.values(errors).map((err, i) => (
                                    <li key={i}>{err}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    
                    {/* ─── STEP 1: Parameter Global & Smart Session Calculator ─── */}
                    {step === 1 && (
                        <div className="rounded-3xl border border-surface-700/60 bg-surface-900/80 backdrop-blur-md p-6 sm:p-8 space-y-8 shadow-2xl animate-fade-in">
                            
                            {/* Header Section */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-surface-800">
                                <div>
                                    <h3 className="text-lg font-bold text-surface-100 flex items-center gap-2">
                                        <span>⚙️</span>
                                        <span>Parameter Waktu & Sesi Pertandingan</span>
                                    </h3>
                                    <p className="text-xs text-surface-400 mt-1">
                                        Atur jam mulai, durasi sesi, dan jeda istirahat. Sistem akan otomatis menghitung waktu istirahat dan jam selesai turnamen.
                                    </p>
                                </div>

                                {/* Mode Calculation Toggle */}
                                <div className="inline-flex p-1 rounded-xl bg-surface-950 border border-surface-800 text-xs shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => setCalcMode('auto')}
                                        className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                                            calcMode === 'auto'
                                                ? 'bg-primary-600 text-white shadow-md'
                                                : 'text-surface-400 hover:text-surface-200'
                                        }`}
                                    >
                                        ⚡ Auto Kalkulasi Sesi
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCalcMode('manual')}
                                        className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                                            calcMode === 'manual'
                                                ? 'bg-primary-600 text-white shadow-md'
                                                : 'text-surface-400 hover:text-surface-200'
                                        }`}
                                    >
                                        ⚙️ Manual Jam
                                    </button>
                                </div>
                            </div>

                            {/* Basic Parameters (Days & Courts) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Field label="📅 Total Hari Turnamen" error={errors.total_days} hint="Jumlah hari pelaksanaan turnamen (1-14 hari)">
                                    <input
                                        type="number"
                                        min={1}
                                        max={14}
                                        value={data.total_days}
                                        onChange={e => setData('total_days', +e.target.value)}
                                        className="input-field"
                                    />
                                </Field>

                                <Field label="🏟️ Jumlah Lapangan" error={errors.courts_count} hint="Banyaknya lapangan aktif untuk pertandingan serentak">
                                    <input
                                        type="number"
                                        min={1}
                                        max={20}
                                        value={data.courts_count}
                                        onChange={e => setData('courts_count', +e.target.value)}
                                        className="input-field"
                                    />
                                </Field>
                            </div>

                            {/* Session Times & Intervals */}
                            <div className="p-5 rounded-2xl bg-surface-950/60 border border-surface-800 space-y-6">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-primary-400 flex items-center gap-1.5">
                                    <span>⏱️</span>
                                    <span>Konfigurasi Durasi & Jeda Sesi</span>
                                </h4>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <Field label="Jam Mulai Sesi 1 (Pagi)" error={errors.session_start_time}>
                                        <input
                                            type="time"
                                            value={data.session_start_time}
                                            onChange={e => setData('session_start_time', e.target.value)}
                                            className="input-field font-mono font-bold"
                                        />
                                    </Field>

                                    <Field label="Durasi 1 Sesi (Menit)" error={errors.session_duration_minutes} hint="Waktu bersih 1 match">
                                        <input
                                            type="number"
                                            min={10}
                                            max={180}
                                            value={data.session_duration_minutes}
                                            onChange={e => setData('session_duration_minutes', +e.target.value)}
                                            className="input-field font-mono font-bold"
                                        />
                                    </Field>

                                    <Field label="Jeda Antar Sesi (Menit)" error={errors.break_duration_minutes} hint="Waktu pemanasan / pergantian tim">
                                        <input
                                            type="number"
                                            min={0}
                                            max={60}
                                            value={data.break_duration_minutes}
                                            onChange={e => setData('break_duration_minutes', +e.target.value)}
                                            className="input-field font-mono font-bold"
                                        />
                                    </Field>
                                </div>
                            </div>

                            {/* ISHOMA / Break Section */}
                            <div className="p-5 rounded-2xl bg-surface-950/60 border border-surface-800 space-y-5">
                                <div className="flex items-center justify-between">
                                    <label className="flex items-center gap-3 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={data.has_ishoma}
                                            onChange={e => setData('has_ishoma', e.target.checked)}
                                            className="w-4 h-4 rounded text-primary-600 bg-surface-900 border-surface-700 focus:ring-primary-500"
                                        />
                                        <div>
                                            <span className="font-bold text-surface-200 text-sm block">🕌 Aktifkan ISHOMA / Istirahat Siang</span>
                                            <span className="text-[11px] text-surface-400">Pertandingan dijeda serentak di semua lapangan</span>
                                        </div>
                                    </label>
                                </div>

                                {data.has_ishoma && (
                                    calcMode === 'auto' ? (
                                        /* Auto Calculation Session Pickers */
                                        <div className="space-y-4 pt-4 border-t border-surface-850">
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                
                                                {/* Sessions Before Break */}
                                                <div>
                                                    <label className="block text-xs font-semibold text-surface-300 mb-1.5">
                                                        Sesi Sebelum Istirahat (Pagi)
                                                    </label>
                                                    <div className="flex gap-1.5 flex-wrap">
                                                        {[1, 2, 3, 4, 5, 6].map(n => (
                                                            <button
                                                                key={n}
                                                                type="button"
                                                                onClick={() => setSessionsBeforeBreak(n)}
                                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                                                    sessionsBeforeBreak === n
                                                                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm ring-1 ring-amber-400/30'
                                                                        : 'bg-surface-900 text-surface-400 border-surface-700 hover:text-surface-200'
                                                                }`}
                                                            >
                                                                {n} Sesi
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <p className="text-[10px] text-amber-400/80 mt-1 font-mono">
                                                        → Istirahat mulai pk. <strong>{schedule.computedIshomaStart}</strong>
                                                    </p>
                                                </div>

                                                {/* Ishoma Duration */}
                                                <div>
                                                    <label className="block text-xs font-semibold text-surface-300 mb-1.5">
                                                        Durasi Istirahat / ISHOMA
                                                    </label>
                                                    <div className="flex gap-1.5 flex-wrap">
                                                        {[30, 45, 60, 90, 120].map(dur => (
                                                            <button
                                                                key={dur}
                                                                type="button"
                                                                onClick={() => setIshomaDurationMin(dur)}
                                                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                                                    ishomaDurationMin === dur
                                                                        ? 'bg-primary-500/20 text-primary-300 border-primary-500/50 shadow-sm ring-1 ring-primary-400/30'
                                                                        : 'bg-surface-900 text-surface-400 border-surface-700 hover:text-surface-200'
                                                                }`}
                                                            >
                                                                {dur}m
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <p className="text-[10px] text-primary-400/80 mt-1 font-mono">
                                                        → Selesai istirahat pk. <strong>{schedule.computedIshomaEnd}</strong>
                                                    </p>
                                                </div>

                                                {/* Sessions After Break */}
                                                <div>
                                                    <label className="block text-xs font-semibold text-surface-300 mb-1.5">
                                                        Sesi Setelah Istirahat (Sore)
                                                    </label>
                                                    <div className="flex gap-1.5 flex-wrap">
                                                        {[1, 2, 3, 4, 5, 6].map(n => (
                                                            <button
                                                                key={n}
                                                                type="button"
                                                                onClick={() => setSessionsAfterBreak(n)}
                                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                                                    sessionsAfterBreak === n
                                                                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm ring-1 ring-emerald-400/30'
                                                                        : 'bg-surface-900 text-surface-400 border-surface-700 hover:text-surface-200'
                                                                }`}
                                                            >
                                                                {n} Sesi
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <p className="text-[10px] text-emerald-400/80 mt-1 font-mono">
                                                        → Selesai hari pk. <strong>{schedule.computedSessionEnd}</strong>
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Computed Summary Badges */}
                                            <div className="mt-4 p-3 rounded-xl bg-surface-900 border border-surface-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                                                <div>
                                                    <span className="text-[10px] text-surface-500 uppercase font-bold block">Mulai Pagi</span>
                                                    <span className="text-xs font-mono font-bold text-surface-200">{data.session_start_time}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-amber-400 uppercase font-bold block">Waktu ISHOMA</span>
                                                    <span className="text-xs font-mono font-bold text-amber-300">{schedule.computedIshomaStart} – {schedule.computedIshomaEnd}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-emerald-400 uppercase font-bold block">Selesai Hari</span>
                                                    <span className="text-xs font-mono font-bold text-emerald-300">{schedule.computedSessionEnd}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-primary-400 uppercase font-bold block">Total Sesi/Hari</span>
                                                    <span className="text-xs font-mono font-bold text-primary-300">{schedule.totalMatchSlots} Sesi/Lap</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        /* Manual Times Input */
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-surface-850">
                                            <Field label="Mulai ISHOMA" error={errors.ishoma_start_time}>
                                                <input
                                                    type="time"
                                                    value={data.ishoma_start_time}
                                                    onChange={e => setData('ishoma_start_time', e.target.value)}
                                                    className="input-field font-mono font-bold"
                                                />
                                            </Field>
                                            <Field label="Selesai ISHOMA" error={errors.ishoma_end_time}>
                                                <input
                                                    type="time"
                                                    value={data.ishoma_end_time}
                                                    onChange={e => setData('ishoma_end_time', e.target.value)}
                                                    className="input-field font-mono font-bold"
                                                />
                                            </Field>
                                            <Field label="Jam Selesai Sesi Harian" error={errors.session_end_time}>
                                                <input
                                                    type="time"
                                                    value={data.session_end_time}
                                                    onChange={e => setData('session_end_time', e.target.value)}
                                                    className="input-field font-mono font-bold"
                                                />
                                            </Field>
                                        </div>
                                    )
                                )}
                            </div>

                            {/* Live Interactive Schedule Strip / Timeline Preview */}
                            <div className="p-5 rounded-2xl bg-gradient-to-b from-surface-950 to-surface-900 border border-surface-800 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-surface-300 flex items-center gap-1.5">
                                        <span>📊</span>
                                        <span>Simulasi Jadwal 1 Hari ({schedule.totalMatchSlots} Sesi Pertandingan)</span>
                                    </h4>
                                    <span className="text-[11px] font-mono text-primary-300 font-bold">
                                        Kapasitas: {schedule.totalMatchSlots * data.courts_count} Match / Hari
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 pt-2">
                                    {schedule.slots.map((slot, idx) => (
                                        <div
                                            key={idx}
                                            className={`p-2.5 rounded-xl border text-center transition-all ${
                                                slot.type === 'ishoma'
                                                    ? 'col-span-2 bg-amber-500/15 border-amber-500/40 text-amber-300 ring-1 ring-amber-400/20'
                                                    : 'bg-surface-950/80 border-surface-800 text-surface-200'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between text-[10px] text-surface-400 mb-1 font-bold">
                                                <span>{slot.type === 'ishoma' ? '🕌 ISHOMA' : `Sesi ${slot.slotNum}`}</span>
                                                <span className="text-[9px] opacity-75">{slot.type === 'ishoma' ? `${slot.duration}m` : `${data.session_duration_minutes}m`}</span>
                                            </div>
                                            <p className="text-xs font-mono font-black text-surface-100">
                                                {slot.startTime} – {slot.endTime}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Next Button */}
                            <div className="flex justify-end pt-2">
                                <button
                                    type="button"
                                    onClick={() => setStep(2)}
                                    className="btn-primary"
                                >
                                    Lanjut: Pilih Mode Tanding →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ─── STEP 2: Mode Tanding ─── */}
                    {step === 2 && (
                        <div className="rounded-3xl border border-surface-700/60 bg-surface-900/80 backdrop-blur-md p-6 sm:p-8 space-y-6 shadow-2xl animate-fade-in">
                            <div className="pb-4 border-b border-surface-800">
                                <h3 className="text-lg font-bold text-surface-100 flex items-center gap-2">
                                    <span>🏆</span>
                                    <span>Pilih Kategori / Mode Pertandingan</span>
                                </h3>
                                <p className="text-xs text-surface-400 mt-1">
                                    Pilih satu atau beberapa mode yang akan dipertandingkan pada turnamen ini, serta tentukan jumlah pembagian poolnya.
                                </p>
                            </div>

                            {errors.modes && (
                                <p className="text-xs font-bold text-red-400 bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                                    ⚠️ {errors.modes}
                                </p>
                            )}

                            <div className="space-y-3">
                                {MODES.map(mode => {
                                    const isActive = data.modes.includes(mode.key);
                                    return (
                                        <div
                                            key={mode.key}
                                            className={`rounded-2xl border-2 p-4 cursor-pointer transition-all duration-150 flex items-center justify-between gap-4 ${
                                                isActive
                                                    ? `bg-gradient-to-r ${mode.color} shadow-lg ring-1 ring-primary-500/30`
                                                    : 'bg-surface-950/40 border-surface-800 hover:border-surface-700 text-surface-400'
                                            }`}
                                            onClick={() => toggleMode(mode.key)}
                                        >
                                            <div className="flex items-center gap-3.5 min-w-0">
                                                <input
                                                    type="checkbox"
                                                    checked={isActive}
                                                    readOnly
                                                    className="w-5 h-5 rounded text-primary-600 bg-surface-900 border-surface-700 focus:ring-primary-500 shrink-0"
                                                />
                                                <span className="text-2xl shrink-0">{mode.icon}</span>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-sm text-surface-100 truncate">{mode.label}</p>
                                                    <p className="text-xs text-surface-400 truncate">{mode.desc}</p>
                                                </div>
                                            </div>

                                            {isActive && (
                                                <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                                                    <label className="text-xs font-bold text-surface-300">Jumlah Pool:</label>
                                                    <select
                                                        value={data.pool_counts[mode.key] || 2}
                                                        onChange={e => setPoolCount(mode.key, +e.target.value)}
                                                        className="rounded-xl bg-surface-900 border border-surface-700 px-3 py-1.5 text-xs text-surface-100 font-bold focus:border-primary-500"
                                                    >
                                                        {[2, 3, 4, 6, 8].map(n => (
                                                            <option key={n} value={n}>{n} Pool ({String.fromCharCode(65)} s/d {String.fromCharCode(64 + n)})</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex justify-between pt-4 border-t border-surface-800">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="btn-secondary"
                                >
                                    ← Kembali
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStep(3)}
                                    disabled={data.modes.length === 0}
                                    className="btn-primary disabled:opacity-50"
                                >
                                    Lanjut: Preview & Simpan →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ─── STEP 3: Preview & Submit ─── */}
                    {step === 3 && (
                        <div className="rounded-3xl border border-surface-700/60 bg-surface-900/80 backdrop-blur-md p-6 sm:p-8 space-y-6 shadow-2xl animate-fade-in">
                            <div className="pb-4 border-b border-surface-800">
                                <h3 className="text-lg font-bold text-surface-100 flex items-center gap-2">
                                    <span>📋</span>
                                    <span>Ringkasan Konfigurasi Master Schedule</span>
                                </h3>
                                <p className="text-xs text-surface-400 mt-1">
                                    Tinjau parameter jadwal sebelum menyimpan. Setelah disimpan, sistem akan men-generate slot lapangan dan membawa Anda ke konfigurasi Bracket Matrix.
                                </p>
                            </div>

                            {/* Summary cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <SummaryCard icon="📅" label="Total Hari" value={`${data.total_days} Hari`} />
                                <SummaryCard icon="🏟️" label="Jumlah Lapangan" value={`${data.courts_count} Lapangan`} />
                                <SummaryCard icon="⏰" label="Rentang Waktu" value={`${data.session_start_time} – ${data.session_end_time}`} />
                                <SummaryCard icon="⏱️" label="Durasi Match" value={`${data.session_duration_minutes}m (Jeda ${data.break_duration_minutes}m)`} />
                                
                                {data.has_ishoma && (
                                    <SummaryCard icon="🕌" label="Waktu ISHOMA" value={`${data.ishoma_start_time} – ${data.ishoma_end_time}`} note="Serentak semua lapangan" />
                                )}
                                
                                <SummaryCard icon="🗓️" label="Slot Pertandingan/Hari" value={`${schedule.totalMatchSlots} Sesi/Lap`} />
                                <SummaryCard icon="📊" label="Total Kapasitas Match" value={`${totalCapacity} Slot`} note="Seluruh lapangan & hari" />
                            </div>

                            {/* Active Mode summary */}
                            <div className="rounded-2xl bg-surface-950/60 border border-surface-800 p-4">
                                <p className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-2.5">
                                    Mode Tanding yang Akan Dibuat:
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {data.modes.map(m => {
                                        const mode = MODES.find(x => x.key === m);
                                        return (
                                            <span
                                                key={m}
                                                className="px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 bg-surface-900 border-surface-700 text-surface-200 shadow-sm"
                                            >
                                                <span>{mode?.icon}</span>
                                                <span>{mode?.label}</span>
                                                <span className="text-primary-300 font-mono">({data.pool_counts[m] || 2} Pool)</span>
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex justify-between pt-4 border-t border-surface-800">
                                <button
                                    type="button"
                                    onClick={() => setStep(2)}
                                    className="btn-secondary"
                                >
                                    ← Kembali
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="btn-primary flex items-center gap-2"
                                >
                                    {processing ? (
                                        <>
                                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            <span>Menyimpan & Generate Slot...</span>
                                        </>
                                    ) : (
                                        <span>💾 Simpan & Lanjut ke Bracket Matrix →</span>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </form>
            </div>

            <style>{`
                .input-field {
                    width: 100%;
                    border-radius: 0.75rem;
                    background-color: rgba(10, 15, 29, 0.6);
                    border: 1px solid rgba(51, 65, 85, 0.6);
                    padding: 0.625rem 0.875rem;
                    color: #f1f5f9;
                    font-size: 0.875rem;
                    transition: all 0.2s;
                }
                .input-field:focus {
                    outline: none;
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
                }
                .btn-primary {
                    background: linear-gradient(135deg, #2563eb, #1d4ed8);
                    color: #ffffff;
                    padding: 0.625rem 1.25rem;
                    border-radius: 0.875rem;
                    font-weight: 700;
                    font-size: 0.875rem;
                    transition: all 0.2s;
                    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
                    cursor: pointer;
                }
                .btn-primary:hover {
                    background: linear-gradient(135deg, #3b82f6, #2563eb);
                    box-shadow: 0 6px 16px rgba(37, 99, 235, 0.4);
                }
                .btn-secondary {
                    background-color: #1e293b;
                    color: #94a3b8;
                    padding: 0.625rem 1.25rem;
                    border-radius: 0.875rem;
                    font-weight: 700;
                    font-size: 0.875rem;
                    border: 1px solid #334155;
                    transition: all 0.2s;
                    cursor: pointer;
                }
                .btn-secondary:hover {
                    background-color: #334155;
                    color: #f1f5f9;
                }
            `}</style>
        </AuthenticatedLayout>
    );
}

function StepIndicator({ current, setStep }) {
    const steps = [
        { num: 1, label: 'Parameter Global & Sesi' },
        { num: 2, label: 'Mode Tanding' },
        { num: 3, label: 'Preview & Simpan' },
    ];

    return (
        <div className="flex items-center justify-between max-w-xl mx-auto p-2 rounded-2xl bg-surface-900/60 border border-surface-800 backdrop-blur-sm">
            {steps.map((s, i) => {
                const active = current === s.num;
                const done   = current > s.num;

                return (
                    <div key={s.num} className="flex items-center flex-1">
                        <button
                            type="button"
                            onClick={() => done && setStep(s.num)}
                            disabled={!done && !active}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all w-full justify-center ${
                                active
                                    ? 'bg-primary-600 text-white shadow-md'
                                    : done
                                        ? 'text-emerald-400 hover:bg-surface-800 cursor-pointer'
                                        : 'text-surface-500 cursor-not-allowed'
                            }`}
                        >
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                                active
                                    ? 'bg-white text-primary-600'
                                    : done
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                        : 'bg-surface-800 text-surface-500'
                            }`}>
                                {done ? '✓' : s.num}
                            </span>
                            <span className="hidden sm:inline truncate">{s.label}</span>
                        </button>
                        {i < steps.length - 1 && (
                            <div className="w-4 h-0.5 bg-surface-800 mx-1 shrink-0" />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function Field({ label, error, hint, children }) {
    return (
        <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-surface-300 mb-1.5">
                {label}
            </label>
            {children}
            {hint && <p className="text-[10px] text-surface-400 mt-1">{hint}</p>}
            {error && <p className="text-red-400 text-xs font-bold mt-1">⚠️ {error}</p>}
        </div>
    );
}

function SummaryCard({ icon, label, value, note }) {
    return (
        <div className="rounded-2xl bg-surface-950/70 border border-surface-800 p-3.5 flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-1">
                <span className="text-base">{icon}</span>
                <span className="text-[10px] uppercase font-bold text-surface-400 leading-tight">{label}</span>
            </div>
            <p className="font-mono font-black text-sm text-surface-100">{value}</p>
            {note && <p className="text-[9px] text-surface-500 mt-0.5">{note}</p>}
        </div>
    );
}
