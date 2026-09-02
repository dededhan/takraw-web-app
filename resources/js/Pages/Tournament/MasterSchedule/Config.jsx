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

export default function Config({ tournament, modePools = {}, preview: initialPreview }) {
    const [step, setStep] = useState(1);
    const [calcMode, setCalcMode] = useState('auto'); // 'auto' | 'manual'
    const [sessionsBeforeBreak, setSessionsBeforeBreak] = useState(4);
    const [ishomaDurationMin, setIshomaDurationMin] = useState(60);
    const [sessionsAfterBreak, setSessionsAfterBreak] = useState(4);
    const [selectedPreviewDay, setSelectedPreviewDay] = useState('default');
    const [customDayPickerOpen, setCustomDayPickerOpen] = useState(false);

    const { data, setData, post, processing, errors, transform } = useForm({
        total_days:               tournament.total_days || 5,
        courts_count:             tournament.courts_count || 4,
        session_start_time:       tournament.session_start_time?.slice(0, 5) || '08:00',
        session_end_time:         tournament.session_end_time?.slice(0, 5) || '17:00',
        session_duration_minutes: tournament.session_duration_minutes || 50,
        break_duration_minutes:   0,
        has_ishoma:               tournament.ishoma_start_time ? true : true,
        ishoma_start_time:        tournament.ishoma_start_time?.slice(0, 5) || '12:00',
        ishoma_end_time:          tournament.ishoma_end_time?.slice(0, 5) || '13:00',
        day_overrides:            tournament.day_overrides || {},
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
            currentMins = mEnd;
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
                currentMins = mEnd;
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
        data.has_ishoma,
        sessionsBeforeBreak,
        ishomaDurationMin,
        sessionsAfterBreak
    ]);

    const addCustomDay = (dayNum) => {
        setData(prev => ({
            ...prev,
            day_overrides: {
                ...(prev.day_overrides || {}),
                [dayNum]: {
                    session_start_time: prev.session_start_time || '08:00',
                    session_end_time: prev.session_end_time || '17:00',
                    session_duration_minutes: Number(prev.session_duration_minutes || 50),
                    has_ishoma: prev.has_ishoma !== undefined ? prev.has_ishoma : true,
                    ishoma_start_time: prev.ishoma_start_time || '12:00',
                    ishoma_end_time: prev.ishoma_end_time || '13:00',
                },
            },
        }));
        setSelectedPreviewDay(String(dayNum));
        setCustomDayPickerOpen(false);
    };

    const removeCustomDay = (dayNum) => {
        setData(prev => {
            const next = { ...(prev.day_overrides || {}) };
            delete next[dayNum];
            delete next[String(dayNum)];
            return {
                ...prev,
                day_overrides: next,
            };
        });
        if (selectedPreviewDay === String(dayNum)) {
            setSelectedPreviewDay('default');
        }
    };

    const updateCustomDay = (dayNum, field, value) => {
        setData(prev => ({
            ...prev,
            day_overrides: {
                ...(prev.day_overrides || {}),
                [dayNum]: {
                    ...(prev.day_overrides?.[dayNum] || {}),
                    [field]: value,
                },
            },
        }));
    };

    const getPreviewSlots = (previewKey) => {
        if (previewKey === 'default') {
            return schedule.slots;
        }
        const override = data.day_overrides?.[previewKey];
        if (!override) return schedule.slots;

        const sStart = parseTimeToMinutes(override.session_start_time || data.session_start_time || '08:00');
        const sEnd = parseTimeToMinutes(override.session_end_time || data.session_end_time || '17:00');
        const sDur = Number(override.session_duration_minutes || data.session_duration_minutes || 50);
        const hIshoma = override.has_ishoma !== undefined ? override.has_ishoma : data.has_ishoma;
        const iStart = parseTimeToMinutes(override.ishoma_start_time || data.ishoma_start_time || '12:00');
        const iEnd = parseTimeToMinutes(override.ishoma_end_time || data.ishoma_end_time || '13:00');

        const slots = [];
        let currentMins = sStart;
        let slotNum = 1;
        let ishomaInserted = false;

        while (currentMins < sEnd) {
            if (hIshoma && !ishomaInserted && currentMins >= iStart) {
                slots.push({
                    slotNum: null,
                    type: 'ishoma',
                    startTime: formatTime(iStart),
                    endTime: formatTime(iEnd),
                    duration: Math.max(0, iEnd - iStart),
                    period: 'ISHOMA / Istirahat',
                });
                currentMins = iEnd;
                ishomaInserted = true;
                continue;
            }

            const slotEnd = currentMins + sDur;
            if (slotEnd > sEnd) break;

            if (hIshoma && !ishomaInserted && slotEnd > iStart) {
                currentMins = iStart;
                continue;
            }

            slots.push({
                slotNum: slotNum++,
                type: 'match',
                startTime: formatTime(currentMins),
                endTime: formatTime(slotEnd),
                period: `Sesi ${slotNum - 1}`,
            });
            currentMins = slotEnd;
        }

        return slots;
    };

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
            break_duration_minutes: 0,
            ishoma_start_time: formData.has_ishoma ? formData.ishoma_start_time : null,
            ishoma_end_time:   formData.has_ishoma ? formData.ishoma_end_time : null,
            day_overrides:     Object.keys(formData.day_overrides || {}).length > 0 ? formData.day_overrides : null,
            pool_counts:       resolvedPoolCounts,
        }));

        post(route('tournaments.master-schedule.save-config', tournament.id), {
            preserveScroll: true,
            onError: (errs) => {
                // If there are errors in step 1 or 2, jump back to appropriate step
                if (errs.total_days || errs.courts_count || errs.session_start_time || errs.session_end_time || errs.ishoma_start_time || errs.ishoma_end_time || errs.day_overrides) {
                    setStep(1);
                } else if (errs.modes || errs.pool_counts) {
                    setStep(2);
                }
            },
        });
    };

    // Calculate total capacity across all days (including overrides)
    let computedTotalMatchSlots = 0;
    for (let d = 1; d <= Number(data.total_days || 1); d++) {
        const dSlots = getPreviewSlots(data.day_overrides?.[d] ? String(d) : 'default');
        computedTotalMatchSlots += dSlots.filter(s => s.type === 'match').length;
    }
    const totalCapacity = computedTotalMatchSlots * Number(data.courts_count || 1);

    const activeOverrideDays = Object.keys(data.day_overrides || {}).map(Number).sort((a, b) => a - b);
    const previewSlots = getPreviewSlots(selectedPreviewDay);

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
                                        Atur jam mulai dan durasi setiap sesi pertandingan. Sistem akan otomatis menghitung waktu istirahat dan jam selesai harian turnamen.
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
                                    <span>Konfigurasi Waktu & Durasi Sesi</span>
                                </h4>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field label="Jam Mulai Sesi 1 (Pagi)" error={errors.session_start_time} hint="Pertandingan pertama tiap hari">
                                        <input
                                            type="time"
                                            value={data.session_start_time}
                                            onChange={e => setData('session_start_time', e.target.value)}
                                            className="input-field font-mono font-bold"
                                        />
                                    </Field>

                                    <Field label="Durasi 1 Sesi (Menit)" error={errors.session_duration_minutes} hint="Alokasi waktu per sesi pertandingan">
                                        <input
                                            type="number"
                                            min={10}
                                            max={180}
                                            value={data.session_duration_minutes}
                                            onChange={e => setData('session_duration_minutes', +e.target.value)}
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
                            <div className="p-5 rounded-2xl bg-gradient-to-b from-surface-950 to-surface-900 border border-surface-800 space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-surface-300 flex items-center gap-1.5">
                                            <span>📊</span>
                                            <span>Simulasi Jadwal Timeline</span>
                                        </h4>
                                        
                                        {/* Day Timeline Switcher Tabs */}
                                        <div className="flex items-center gap-1 bg-surface-900/90 p-1 rounded-xl border border-surface-800 text-[11px]">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedPreviewDay('default')}
                                                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                                                    selectedPreviewDay === 'default'
                                                        ? 'bg-primary-600 text-white shadow-sm'
                                                        : 'text-surface-400 hover:text-surface-200'
                                                }`}
                                            >
                                                🌐 Hari Default
                                            </button>
                                            {activeOverrideDays.map(d => (
                                                <button
                                                    key={d}
                                                    type="button"
                                                    onClick={() => setSelectedPreviewDay(String(d))}
                                                    className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                                                        selectedPreviewDay === String(d)
                                                            ? 'bg-amber-600 text-white shadow-sm'
                                                            : 'text-amber-400/80 hover:text-amber-300'
                                                    }`}
                                                >
                                                    <span>🌟</span>
                                                    <span>Hari {d}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <span className="text-[11px] font-mono text-primary-300 font-bold self-start sm:self-auto">
                                        {selectedPreviewDay === 'default' ? 'Hari Reguler' : `Hari ke-${selectedPreviewDay}`}: {previewSlots.filter(s => s.type === 'match').length * data.courts_count} Match ({previewSlots.filter(s => s.type === 'match').length} Sesi)
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 pt-1">
                                    {previewSlots.map((slot, idx) => (
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
                                                <span className="text-[9px] opacity-75">
                                                    {slot.type === 'ishoma'
                                                        ? `${slot.duration}m`
                                                        : `${selectedPreviewDay !== 'default' && data.day_overrides?.[selectedPreviewDay]?.session_duration_minutes ? data.day_overrides[selectedPreviewDay].session_duration_minutes : data.session_duration_minutes}m`}
                                                </span>
                                            </div>
                                            <p className="text-xs font-mono font-black text-surface-100">
                                                {slot.startTime} – {slot.endTime}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* ─── KUSTOMISASI HARI TERTENTU (OPSIONAL) ─── */}
                            <div className="p-6 rounded-2xl bg-surface-950/50 border border-surface-800 space-y-5">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-800/80">
                                    <div>
                                        <h4 className="text-sm font-bold text-surface-200 flex items-center gap-2">
                                            <span>🗓️</span>
                                            <span>Kustomisasi Jadwal Hari Tertentu (Opsional)</span>
                                        </h4>
                                        <p className="text-xs text-surface-400 mt-0.5">
                                            Gunakan ini jika ada hari tertentu yang jam mulai/selesai atau ISHOMA-nya berbeda (misal: Hari 1 ada Pembukaan, Hari Jumat, Hari Final).
                                        </p>
                                    </div>

                                    {/* Add Custom Day Button & Dropdown */}
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setCustomDayPickerOpen(!customDayPickerOpen)}
                                            className="px-3.5 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                                        >
                                            <span>➕</span>
                                            <span>Pilih Hari Kustom</span>
                                        </button>

                                        {customDayPickerOpen && (
                                            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-surface-900 border border-surface-700 shadow-2xl p-2 z-20 animate-slide-up space-y-1">
                                                <p className="text-[10px] uppercase font-bold text-surface-400 px-2 py-1">
                                                    Pilih Hari yang Ingin Dikustom:
                                                </p>
                                                {Array.from({ length: Number(data.total_days || 1) }, (_, i) => i + 1).map(dayNum => {
                                                    const isAlreadyOverridden = !!data.day_overrides?.[dayNum];
                                                    return (
                                                        <button
                                                            key={dayNum}
                                                            type="button"
                                                            disabled={isAlreadyOverridden}
                                                            onClick={() => addCustomDay(dayNum)}
                                                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
                                                                isAlreadyOverridden
                                                                    ? 'bg-surface-950 text-surface-600 cursor-not-allowed'
                                                                    : 'text-surface-200 hover:bg-amber-500/20 hover:text-amber-300'
                                                            }`}
                                                        >
                                                            <span>📅 Hari ke-{dayNum}</span>
                                                            {isAlreadyOverridden && (
                                                                <span className="text-[10px] text-amber-400 font-bold">Sudah Kustom</span>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* List of Active Custom Days */}
                                {activeOverrideDays.length === 0 ? (
                                    <div className="text-center py-6 border border-dashed border-surface-800 rounded-xl">
                                        <p className="text-xs text-surface-500">
                                            Belum ada hari khusus yang dikustomisasi. Semua hari (1 s/d {data.total_days}) akan memakai jadwal default reguler di atas.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {activeOverrideDays.map(dayNum => {
                                            const override = data.day_overrides[dayNum] || {};
                                            const daySlots = getPreviewSlots(String(dayNum));
                                            const matchCount = daySlots.filter(s => s.type === 'match').length;

                                            return (
                                                <div key={dayNum} className="p-5 rounded-2xl bg-surface-900 border border-amber-500/30 space-y-4 shadow-sm relative animate-fade-in">
                                                    <div className="flex items-center justify-between pb-3 border-b border-surface-800">
                                                        <div className="flex items-center gap-2.5">
                                                            <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/30">
                                                                🌟 Hari ke-{dayNum}
                                                            </span>
                                                            <span className="text-xs text-surface-300 font-medium">
                                                                Total: <strong className="text-amber-300">{matchCount} Sesi Pertandingan</strong> ({matchCount * data.courts_count} Match)
                                                            </span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeCustomDay(dayNum)}
                                                            className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2.5 py-1 rounded-lg transition-colors font-semibold flex items-center gap-1"
                                                        >
                                                            ✕ Hapus Kustom Hari Ini
                                                        </button>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                        <div>
                                                            <label className="block text-[11px] font-semibold text-surface-400 mb-1">Jam Mulai Sesi 1</label>
                                                            <input
                                                                type="time"
                                                                value={override.session_start_time || '08:00'}
                                                                onChange={e => updateCustomDay(dayNum, 'session_start_time', e.target.value)}
                                                                className="input-field font-mono font-bold"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="block text-[11px] font-semibold text-surface-400 mb-1">Jam Selesai Harian</label>
                                                            <input
                                                                type="time"
                                                                value={override.session_end_time || '17:00'}
                                                                onChange={e => updateCustomDay(dayNum, 'session_end_time', e.target.value)}
                                                                className="input-field font-mono font-bold"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="block text-[11px] font-semibold text-surface-400 mb-1">Durasi 1 Sesi (Menit)</label>
                                                            <input
                                                                type="number"
                                                                min={10}
                                                                max={180}
                                                                value={override.session_duration_minutes || 50}
                                                                onChange={e => updateCustomDay(dayNum, 'session_duration_minutes', +e.target.value)}
                                                                className="input-field font-mono font-bold"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Custom ISHOMA for this day */}
                                                    <div className="pt-2 border-t border-surface-800/80 flex flex-col sm:flex-row sm:items-center gap-4">
                                                        <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-surface-300">
                                                            <input
                                                                type="checkbox"
                                                                checked={override.has_ishoma !== false}
                                                                onChange={e => updateCustomDay(dayNum, 'has_ishoma', e.target.checked)}
                                                                className="w-4 h-4 rounded text-amber-600 bg-surface-950 border-surface-700 focus:ring-amber-500"
                                                            />
                                                            <span>Aktifkan ISHOMA di Hari {dayNum}</span>
                                                        </label>

                                                        {override.has_ishoma !== false && (
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="time"
                                                                    value={override.ishoma_start_time || '12:00'}
                                                                    onChange={e => updateCustomDay(dayNum, 'ishoma_start_time', e.target.value)}
                                                                    className="w-28 px-2 py-1 rounded-lg bg-surface-950 border border-surface-700 text-xs font-mono font-bold text-surface-200"
                                                                />
                                                                <span className="text-surface-500 text-xs">s/d</span>
                                                                <input
                                                                    type="time"
                                                                    value={override.ishoma_end_time || '13:00'}
                                                                    onChange={e => updateCustomDay(dayNum, 'ishoma_end_time', e.target.value)}
                                                                    className="w-28 px-2 py-1 rounded-lg bg-surface-950 border border-surface-700 text-xs font-mono font-bold text-surface-200"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
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
                            <div className="pb-4 border-b border-surface-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <h3 className="text-lg font-bold text-surface-100 flex items-center gap-2">
                                        <span>🏆</span>
                                        <span>Kategori & Struktur Braket / Pool</span>
                                    </h3>
                                    <p className="text-xs text-surface-400 mt-1">
                                        Pilih mode yang akan dipertandingkan. Sistem mendeteksi konfigurasi braket dan pool yang telah disiapkan pada turnamen ini.
                                    </p>
                                </div>
                                <Link
                                    href={route('pools.index', tournament.id)}
                                    target="_blank"
                                    className="px-3 py-1.5 rounded-xl bg-surface-800 hover:bg-surface-700 border border-surface-700 text-xs font-bold text-primary-300 flex items-center gap-1.5 self-start sm:self-auto transition-colors"
                                >
                                    <span>⚙️ Kelola Bagan & Pool</span>
                                    <span>↗</span>
                                </Link>
                            </div>

                            {errors.modes && (
                                <p className="text-xs font-bold text-red-400 bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                                    ⚠️ {errors.modes}
                                </p>
                            )}

                            <div className="space-y-4">
                                {MODES.map(mode => {
                                    const isActive = data.modes.includes(mode.key);
                                    const modePoolData = modePools?.[mode.key];
                                    const hasDbPools = modePoolData && modePoolData.brackets && modePoolData.brackets.length > 0;
                                    const totalPools = hasDbPools ? modePoolData.total_pools : (data.pool_counts[mode.key] || 2);

                                    return (
                                        <div
                                            key={mode.key}
                                            className={`rounded-2xl border-2 p-4 cursor-pointer transition-all duration-150 ${
                                                isActive
                                                    ? `bg-gradient-to-r ${mode.color} shadow-lg ring-1 ring-primary-500/30`
                                                    : 'bg-surface-950/40 border-surface-800 hover:border-surface-700 text-surface-400'
                                            }`}
                                            onClick={() => toggleMode(mode.key)}
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                                                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto" onClick={e => e.stopPropagation()}>
                                                        {hasDbPools ? (
                                                            <span className="px-3 py-1.5 rounded-xl bg-surface-900/90 border border-surface-700 text-xs font-bold text-surface-100 flex items-center gap-1.5 shadow-sm">
                                                                <span className="text-primary-400">📊 Terkonfigurasi:</span>
                                                                <span>{modePoolData.brackets.length} Braket ({modePoolData.total_pools} Pool)</span>
                                                            </span>
                                                        ) : (
                                                            <div className="flex items-center gap-2">
                                                                <label className="text-xs font-bold text-surface-300">Jumlah Pool:</label>
                                                                <select
                                                                    value={data.pool_counts[mode.key] || 2}
                                                                    onChange={e => setPoolCount(mode.key, +e.target.value)}
                                                                    className="rounded-xl bg-surface-900 border border-surface-700 px-3 py-1.5 text-xs text-surface-100 font-bold focus:border-primary-500"
                                                                >
                                                                    <option value={1}>1 Pool (Full Round Robin — Juara dari Klasemen)</option>
                                                                    <option value={2}>2 Pool (Pool A & B — Semifinal & Final)</option>
                                                                    <option value={3}>3 Pool (Pool A, B, C — Wildcard & Final)</option>
                                                                    <option value={4}>4 Pool (Pool A, B, C, D — QF, SF, Final)</option>
                                                                    <option value={6}>6 Pool (Pool A s/d F — R16, QF, SF, Final)</option>
                                                                    <option value={8}>8 Pool (Pool A s/d H — R16, QF, SF, Final)</option>
                                                                </select>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Detailed Braket / Pool Breakdown when mode is active */}
                                            {isActive && (
                                                <div className="mt-3.5 pt-3.5 border-t border-surface-800/80 space-y-2.5" onClick={e => e.stopPropagation()}>
                                                    {hasDbPools ? (
                                                        <div>
                                                            <p className="text-[11px] font-bold text-surface-400 uppercase tracking-wider mb-2">
                                                                Rincian Braket & Pool:
                                                            </p>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                                                {modePoolData.brackets.map((b, bIdx) => (
                                                                    <div key={bIdx} className="p-3 rounded-xl bg-surface-950/80 border border-surface-800 text-xs space-y-1.5 shadow-sm">
                                                                        <div className="flex items-center justify-between font-bold text-surface-200">
                                                                            <span className="truncate">{b.bracket_name}</span>
                                                                            <span className="text-[11px] px-2 py-0.5 rounded bg-surface-900 text-primary-300 border border-surface-750 font-mono">
                                                                                {b.pool_count} Pool
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex flex-wrap gap-1 text-[10.5px]">
                                                                            {b.pools.map(p => (
                                                                                <span key={p.id} className="px-1.5 py-0.5 rounded bg-surface-900 text-surface-300 border border-surface-800">
                                                                                    Pool {p.name} ({p.teams_count} Tim)
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                        {b.pool_count === 1 ? (
                                                                            <p className="text-[10px] text-emerald-400/90 font-medium flex items-center gap-1 pt-0.5">
                                                                                <span>🏆</span>
                                                                                <span>1 Pool: Full Round Robin (Juara dari Klasemen — Tanpa Babak Gugur)</span>
                                                                            </p>
                                                                        ) : (
                                                                            <p className="text-[10px] text-amber-400/80 font-medium flex items-center gap-1 pt-0.5">
                                                                                <span>⚔️</span>
                                                                                <span>Babak Gugur (Playoff & Final Braket)</span>
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="p-3 rounded-xl bg-surface-950/60 border border-surface-800 text-xs">
                                                            {Number(data.pool_counts[mode.key] || 2) === 1 ? (
                                                                <p className="text-emerald-300 font-medium flex items-center gap-1.5">
                                                                    <span>🏆</span>
                                                                    <span><strong>Format 1 Pool (Full Round Robin):</strong> Seluruh tim bertanding satu sama lain. Pemenang dan juara ditentukan langsung dari poin klasemen akhir (tanpa babak gugur lanjutan).</span>
                                                                </p>
                                                            ) : (
                                                                <p className="text-surface-300 font-medium flex items-center gap-1.5">
                                                                    <span>⚔️</span>
                                                                    <span><strong>Format {data.pool_counts[mode.key] || 2} Pool:</strong> Babak penyisihan pool dilanjutkan babak gugur (Playoff/Semifinal/Final) untuk menentukan juara.</span>
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
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
                                <SummaryCard icon="⏱️" label="Durasi Match" value={`${data.session_duration_minutes} Menit / Sesi`} />
                                
                                {data.has_ishoma && (
                                    <SummaryCard icon="🕌" label="Waktu ISHOMA" value={`${data.ishoma_start_time} – ${data.ishoma_end_time}`} note="Serentak semua lapangan" />
                                )}
                                
                                <SummaryCard icon="🗓️" label="Slot Pertandingan/Hari" value={`${schedule.totalMatchSlots} Sesi/Lap`} />
                                <SummaryCard icon="📊" label="Total Kapasitas Match" value={`${totalCapacity} Slot`} note="Seluruh lapangan & hari" />
                            </div>

                            {/* Active Mode summary */}
                            <div className="rounded-2xl bg-surface-950/60 border border-surface-800 p-4 space-y-3">
                                <p className="text-xs font-bold text-surface-400 uppercase tracking-wider">
                                    Kategori & Struktur Braket / Pool Terpilih:
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {data.modes.map(m => {
                                        const mode = MODES.find(x => x.key === m);
                                        const modePoolData = modePools?.[m];
                                        const hasDbPools = modePoolData && modePoolData.brackets && modePoolData.brackets.length > 0;

                                        return (
                                            <div
                                                key={m}
                                                className="p-3.5 rounded-xl border bg-surface-900/90 border-surface-750 text-surface-200 shadow-sm space-y-2"
                                            >
                                                <div className="flex items-center justify-between font-bold text-xs">
                                                    <span className="flex items-center gap-1.5 text-surface-100">
                                                        <span>{mode?.icon}</span>
                                                        <span>{mode?.label}</span>
                                                    </span>
                                                    <span className="text-primary-300 font-mono">
                                                        {hasDbPools ? `${modePoolData.brackets.length} Braket (${modePoolData.total_pools} Pool)` : `${data.pool_counts[m] || 2} Pool`}
                                                    </span>
                                                </div>

                                                {hasDbPools ? (
                                                    <div className="space-y-1 text-[11px] text-surface-400">
                                                        {modePoolData.brackets.map((b, idx) => (
                                                            <div key={idx} className="flex items-center justify-between">
                                                                <span className="text-surface-300">{b.bracket_name}:</span>
                                                                <span className={b.pool_count === 1 ? 'text-emerald-400 font-semibold' : 'text-surface-400'}>
                                                                    {b.pool_count} Pool {b.pool_count === 1 ? '(1 Pool — Round Robin)' : ''}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-[11px] text-surface-400">
                                                        {Number(data.pool_counts[m] || 2) === 1
                                                            ? 'Format 1 Pool (Full Round Robin — Juara dari Klasemen)'
                                                            : `Format ${data.pool_counts[m] || 2} Pool (Babak Penyisihan + Gugur)`}
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Custom Days Summary if any */}
                            {activeOverrideDays.length > 0 && (
                                <div className="rounded-2xl bg-amber-500/5 border border-amber-500/20 p-4 space-y-2">
                                    <p className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                                        <span>🌟</span>
                                        <span>Kustomisasi Jadwal Khusus ({activeOverrideDays.length} Hari):</span>
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                        {activeOverrideDays.map(d => {
                                            const o = data.day_overrides[d] || {};
                                            const dSlots = getPreviewSlots(String(d));
                                            const mCount = dSlots.filter(s => s.type === 'match').length;
                                            return (
                                                <div key={d} className="p-2.5 rounded-xl bg-surface-900/80 border border-surface-700/60 flex items-center justify-between">
                                                    <div>
                                                        <span className="font-bold text-amber-300">Hari ke-{d}:</span>{' '}
                                                        <span className="font-mono text-surface-200">{o.session_start_time || '08:00'} – {o.session_end_time || '17:00'}</span>
                                                        {o.has_ishoma !== false && (
                                                            <span className="text-[10px] text-surface-400 block">
                                                                ISHOMA: {o.ishoma_start_time || '12:00'} – {o.ishoma_end_time || '13:00'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-[11px] font-mono text-primary-300 font-bold">
                                                        {mCount} Sesi / Lap
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

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
