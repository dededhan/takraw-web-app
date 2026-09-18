import React from 'react';

/**
 * Format string source (misal: 'pool_A_rank_1') menjadi label yang mudah dibaca.
 */
export function formatSourceToHuman(source) {
    if (!source) return 'TBD';
    if (source === 'bye') return 'BYE (Lolos Otomatis)';
    if (source === 'best_runner_up') return '🌟 Runner-up Terbaik';
    if (source.startsWith('wildcard_')) {
        const num = source.replace('wildcard_', '');
        return `🃏 Wildcard #${num}`;
    }

    // Pool matching: pool_A_rank_1
    const poolMatch = source.match(/^pool_([A-Z])_rank_(\d+)$/);
    if (poolMatch) {
        const pool = poolMatch[1];
        const rank = parseInt(poolMatch[2], 10);
        if (rank === 1) return `🥇 Juara Pool ${pool}`;
        if (rank === 2) return `🥈 Runner-up Pool ${pool}`;
        return `🥉 Posisi ${rank} Pool ${pool}`;
    }

    // Winner matching
    if (source.startsWith('winner_sf_')) {
        return `🏆 Pemenang Semifinal #${source.replace('winner_sf_', '')}`;
    }
    if (source.startsWith('loser_sf_')) {
        return `🥉 Kalah Semifinal #${source.replace('loser_sf_', '')}`;
    }
    if (source.startsWith('winner_qf_')) {
        return `🥊 Pemenang 8 Besar #${source.replace('winner_qf_', '')}`;
    }
    if (source.startsWith('winner_r16_')) {
        return `🛡️ Pemenang 16 Besar #${source.replace('winner_r16_', '')}`;
    }
    if (source.startsWith('winner_r32_')) {
        return `🌐 Pemenang 32 Besar #${source.replace('winner_r32_', '')}`;
    }

    return source;
}

/**
 * Dapatkan warna aksen berdasarkan tipe source
 */
function getSourceBadgeStyle(source) {
    if (!source) return 'bg-surface-800 text-surface-400 border-surface-700';
    if (source === 'bye') {
        return 'bg-surface-950 text-surface-500 border-surface-800 border-dashed';
    }
    if (source.includes('rank_1')) {
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    }
    if (source.includes('rank_2')) {
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
    }
    if (source === 'best_runner_up' || source.startsWith('wildcard_')) {
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
    }
    if (source.startsWith('winner_')) {
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    }
    return 'bg-surface-800 text-surface-200 border-surface-700';
}

const STAGE_TITLES = {
    round_of_32: { label: 'Babak 32 Besar', icon: '🌐', short: 'R32', color: 'text-teal-400' },
    round_of_16: { label: 'Babak 16 Besar', icon: '🛡️', short: 'R16', color: 'text-indigo-400' },
    round_of_8:  { label: 'Perempat Final (8 Besar)', icon: '🥊', short: 'QF', color: 'text-blue-400' },
    semifinal:   { label: 'Semifinal (4 Besar)', icon: '⚔️', short: 'SF', color: 'text-purple-400' },
    final:       { label: 'Grand Final', icon: '🏆', short: 'FINAL', color: 'text-amber-400' },
    third_place: { label: 'Perebutan Juara 3', icon: '🥉', short: 'JUARA 3', color: 'text-orange-400' },
};

export default function VisualBracketTree({
    bracketName,
    poolCount,
    isSinglePool = false,
    stages = [],
    onSelectMatch = null,
    onSelectSlot = null,
    swapPendingSlot = null,
}) {
    if (isSinglePool || poolCount <= 1) {
        return (
            <div className="p-8 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-center space-y-3">
                <div className="text-4xl animate-bounce">🏆</div>
                <h4 className="text-base font-extrabold text-emerald-300">
                    Braket "{bracketName}" — Format 1 Pool (Full Round Robin)
                </h4>
                <p className="text-xs text-surface-300 max-w-lg mx-auto leading-relaxed">
                    Seluruh tim saling bertanding setengah kompetisi di dalam pool. 
                    <strong> Juara 1, 2, dan 3 ditentukan langsung dari total poin klasemen akhir </strong>
                    tanpa pertandingan babak gugur lanjutan.
                </p>
            </div>
        );
    }

    if (!stages || stages.length === 0) {
        return (
            <div className="p-8 rounded-2xl bg-surface-950/60 border border-dashed border-surface-800 text-center space-y-2">
                <div className="text-3xl">⚔️</div>
                <p className="text-xs font-bold text-surface-300">Belum Ada Bagan Pertandingan</p>
                <p className="text-[11px] text-surface-500">Pilih salah satu tombol preset di atas untuk membuat bagan otomatis.</p>
            </div>
        );
    }

    // Kelompokkan stages berdasarkan babak yang urut: r32 -> r16 -> r8 -> semifinal -> final -> third_place
    const stageOrder = ['round_of_32', 'round_of_16', 'round_of_8', 'semifinal', 'final', 'third_place'];
    const groupedStages = {};

    stageOrder.forEach(st => {
        const matches = stages
            .filter(s => s.bracket_stage === st)
            .sort((a, b) => (a.bracket_position || 1) - (b.bracket_position || 1));
        if (matches.length > 0) {
            groupedStages[st] = matches;
        }
    });

    const activeStageKeys = stageOrder.filter(k => !!groupedStages[k] && k !== 'third_place');
    const thirdPlaceMatch = groupedStages['third_place']?.[0] || null;

    // Hitung statistik BYE
    const byeCount = stages.filter(s => s.home_source === 'bye' || s.away_source === 'bye').length;

    return (
        <div className="space-y-4">
            {/* Header info bagan */}
            <div className="flex items-center justify-between flex-wrap gap-2 px-1">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-surface-200 flex items-center gap-1.5">
                        <span>📊</span> Diagram Bagan Babak Gugur — {bracketName}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-800 text-surface-300 font-mono">
                        {stages.length} Pertandingan
                    </span>
                    {byeCount > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold flex items-center gap-1">
                            <span>⬛</span> {byeCount} Match Menggunakan BYE
                        </span>
                    )}
                </div>
                <span className="text-[10px] text-surface-500">
                    💡 Klik kartu tim di babak awal untuk menukar posisi (swap) tim pool. Babak lanjutan mengalir otomatis.
                </span>
            </div>

            {/* Visual Tree Canvas Scrollable */}
            <div className="rounded-2xl border border-surface-800/80 bg-surface-950/70 p-5 overflow-x-auto shadow-inner">
                <div className="flex gap-8 md:gap-12 min-w-max py-4 justify-start items-stretch">
                    {activeStageKeys.map((stageKey, colIdx) => {
                        const meta = STAGE_TITLES[stageKey] || { label: stageKey, icon: '⚔️', short: stageKey, color: 'text-primary-400' };
                        const matches = groupedStages[stageKey] || [];
                        const isInitialStage = colIdx === 0;

                        return (
                            <div key={stageKey} className="flex flex-col flex-1 min-w-[230px] max-w-[280px]">
                                {/* Stage Column Header */}
                                <div className="pb-3 mb-4 border-b border-surface-800/80 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                        <span>{meta.icon}</span>
                                        <h5 className={`text-xs font-extrabold tracking-wide uppercase ${meta.color}`}>
                                            {meta.label}
                                        </h5>
                                    </div>
                                    <span className="text-[10px] text-surface-500 font-mono">
                                        {matches.length} Pertandingan {isInitialStage ? '(Babak Awal)' : '(Alur Otomatis)'}
                                    </span>
                                </div>

                                {/* Matches List for this Stage Column */}
                                <div className="flex flex-col justify-around flex-1 gap-6">
                                    {matches.map((m, mIdx) => {
                                        const isHomeBye = m.home_source === 'bye';
                                        const isAwayBye = m.away_source === 'bye';
                                        const hasBye = isHomeBye || isAwayBye;

                                        return (
                                            <div
                                                key={`${stageKey}-${m.bracket_position || mIdx}`}
                                                onClick={() => onSelectMatch?.(stageKey, m.bracket_position)}
                                                className={`group relative rounded-xl border transition-all duration-150 p-3 shadow-md ${
                                                    hasBye
                                                        ? 'bg-surface-900/60 border-indigo-500/30 hover:border-indigo-400/60'
                                                        : 'bg-surface-900/90 border-surface-700/60 hover:border-primary-500/70'
                                                }`}
                                            >
                                                {/* Header Match Tag */}
                                                <div className="flex items-center justify-between text-[10px] pb-2 mb-2 border-b border-surface-800">
                                                    <span className="font-extrabold text-surface-400 group-hover:text-primary-300 font-mono">
                                                        #{meta.short} {m.bracket_position}
                                                    </span>
                                                    {hasBye ? (
                                                        <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 text-[9px] font-bold">
                                                            BYE ADVANCE
                                                        </span>
                                                    ) : !isInitialStage ? (
                                                        <span className="px-1.5 py-0.2 rounded bg-surface-800/80 text-surface-400 text-[9px] font-mono">
                                                            OTOMATIS
                                                        </span>
                                                    ) : null}
                                                </div>

                                                {/* Home Team Card */}
                                                <div
                                                    onClick={(e) => {
                                                        if (onSelectSlot && isInitialStage) {
                                                            e.stopPropagation();
                                                            onSelectSlot(m, 'home_source');
                                                        }
                                                    }}
                                                    className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center justify-between gap-1 mb-1.5 transition-all ${
                                                        getSourceBadgeStyle(m.home_source)
                                                    } ${isHomeBye ? 'opacity-60' : ''} ${
                                                        swapPendingSlot?.stage === stageKey &&
                                                        swapPendingSlot?.pos === m.bracket_position &&
                                                        swapPendingSlot?.field === 'home_source'
                                                            ? 'ring-2 ring-amber-400 bg-amber-500/20 text-amber-200 shadow-md animate-pulse scale-[1.02]'
                                                            : onSelectSlot && isInitialStage
                                                            ? 'cursor-pointer hover:ring-2 hover:ring-primary-400/80 hover:scale-[1.01]'
                                                            : ''
                                                    }`}
                                                    title={
                                                        isInitialStage
                                                            ? onSelectSlot
                                                                ? swapPendingSlot
                                                                    ? `Klik untuk tukar dengan ${formatSourceToHuman(swapPendingSlot.source)}`
                                                                    : 'Klik untuk memilih tim ini dan tukar posisinya'
                                                                : undefined
                                                            : 'Lolos otomatis dari pemenang babak sebelumnya'
                                                    }
                                                >
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <span className="truncate">{formatSourceToHuman(m.home_source)}</span>
                                                        {swapPendingSlot?.stage === stageKey &&
                                                            swapPendingSlot?.pos === m.bracket_position &&
                                                            swapPendingSlot?.field === 'home_source' && (
                                                                <span className="text-[9px] px-1 py-0.2 rounded bg-amber-400 text-black font-extrabold shrink-0">
                                                                    ⚡ TERPILIH
                                                                </span>
                                                            )}
                                                    </div>
                                                    {isAwayBye && (
                                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold shrink-0">
                                                            ✓ LOLOS
                                                        </span>
                                                    )}
                                                </div>

                                                {/* VS Divider */}
                                                <div className="text-center py-0.5">
                                                    <span className="text-[9px] font-extrabold text-surface-500 uppercase tracking-widest">
                                                        VS
                                                    </span>
                                                </div>

                                                {/* Away Team Card */}
                                                <div
                                                    onClick={(e) => {
                                                        if (onSelectSlot && isInitialStage) {
                                                            e.stopPropagation();
                                                            onSelectSlot(m, 'away_source');
                                                        }
                                                    }}
                                                    className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center justify-between gap-1 transition-all ${
                                                        getSourceBadgeStyle(m.away_source)
                                                    } ${isAwayBye ? 'opacity-60' : ''} ${
                                                        swapPendingSlot?.stage === stageKey &&
                                                        swapPendingSlot?.pos === m.bracket_position &&
                                                        swapPendingSlot?.field === 'away_source'
                                                            ? 'ring-2 ring-amber-400 bg-amber-500/20 text-amber-200 shadow-md animate-pulse scale-[1.02]'
                                                            : onSelectSlot && isInitialStage
                                                            ? 'cursor-pointer hover:ring-2 hover:ring-primary-400/80 hover:scale-[1.01]'
                                                            : ''
                                                    }`}
                                                    title={
                                                        isInitialStage
                                                            ? onSelectSlot
                                                                ? swapPendingSlot
                                                                    ? `Klik untuk tukar dengan ${formatSourceToHuman(swapPendingSlot.source)}`
                                                                    : 'Klik untuk memilih tim ini dan tukar posisinya'
                                                                : undefined
                                                            : 'Lolos otomatis dari pemenang babak sebelumnya'
                                                    }
                                                >
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <span className="truncate">{formatSourceToHuman(m.away_source)}</span>
                                                        {swapPendingSlot?.stage === stageKey &&
                                                            swapPendingSlot?.pos === m.bracket_position &&
                                                            swapPendingSlot?.field === 'away_source' && (
                                                                <span className="text-[9px] px-1 py-0.2 rounded bg-amber-400 text-black font-extrabold shrink-0">
                                                                    ⚡ TERPILIH
                                                                </span>
                                                            )}
                                                    </div>
                                                    {isHomeBye && (
                                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold shrink-0">
                                                            ✓ LOLOS
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Connecting line to next stage (pure CSS indicator) */}
                                                {colIdx < activeStageKeys.length - 1 && (
                                                    <div className="hidden lg:block absolute -right-6 top-1/2 w-6 h-[2px] bg-surface-700/60 pointer-events-none" />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}

                    {/* Third Place Match Column if present */}
                    {thirdPlaceMatch && (
                        <div className="flex flex-col flex-1 min-w-[220px] max-w-[260px] border-l border-surface-800/80 pl-6">
                            <div className="pb-3 mb-4 border-b border-surface-800/80 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                    <span>🥉</span>
                                    <h5 className="text-xs font-extrabold tracking-wide uppercase text-orange-400">
                                        Perebutan Juara 3
                                    </h5>
                                </div>
                                <span className="text-[10px] text-surface-500 font-mono">1 Pertandingan</span>
                            </div>

                            <div className="flex flex-col justify-center flex-1">
                                <div className="rounded-xl border border-orange-500/30 bg-surface-900/90 p-3 shadow-md space-y-2">
                                    <div className="text-[10px] font-bold text-orange-400 pb-1 border-b border-surface-800">
                                        #JUARA 3
                                    </div>
                                    <div
                                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold ${getSourceBadgeStyle(
                                            thirdPlaceMatch.home_source
                                        )}`}
                                    >
                                        <span className="truncate">{formatSourceToHuman(thirdPlaceMatch.home_source)}</span>
                                    </div>
                                    <div className="text-center">
                                        <span className="text-[9px] font-bold text-surface-500">VS</span>
                                    </div>
                                    <div
                                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold ${getSourceBadgeStyle(
                                            thirdPlaceMatch.away_source
                                        )}`}
                                    >
                                        <span className="truncate">{formatSourceToHuman(thirdPlaceMatch.away_source)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
