import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

/**
 * Warna per mode tanding default
 */
const MODE_COLORS = {
    regu:        { bg: '#1d4ed8', border: '#1e40af', light: '#dbeafe', text: '#1e40af', label: 'Regu' },
    double:      { bg: '#059669', border: '#047857', light: '#d1fae5', text: '#047857', label: 'Double' },
    quadrant:    { bg: '#7c3aed', border: '#6d28d9', light: '#ede9fe', text: '#6d28d9', label: 'Quadrant' },
    team_regu:   { bg: '#d97706', border: '#b45309', light: '#fef3c7', text: '#b45309', label: 'Team Regu' },
    team_double: { bg: '#dc2626', border: '#b91c1c', light: '#fee2e2', text: '#b91c1c', label: 'Team Double' },
};

const STAGE_LABELS = {
    pool:        'Pool',
    round_of_16: 'R16',
    round_of_8:  'QF',
    semifinal:   'SF',
    third_place: 'Perebutan 3',
    final:       'Final',
};

/**
 * Helper untuk memeriksa apakah satu sisi (Home/Away) cocok secara TEPAT (EXACT) dengan tim yang dicari
 */
export function isSideMatchingTeam(match, side, searchedTeam) {
    if (!searchedTeam) return false;
    const sId = searchedTeam.id ? Number(searchedTeam.id) : null;
    const sName = (searchedTeam.name || '').trim().toLowerCase();

    if (side === 'home') {
        if (sId) {
            if (searchedTeam.type === 'super_team') {
                if (match.home_super_team_id === sId) return true;
            } else {
                if (match.home_team_id === sId) return true;
                const members = match.home_super_team?.members || [];
                if (members.some(m => m.id === sId)) return true;
            }
        }
        const homeName = (match.home_display_name || match.home_super_team?.name || match.home_team?.name || match.home_placeholder || '').trim().toLowerCase();
        if (sName && homeName === sName) return true;
        const members = match.home_super_team?.members || [];
        if (sName && members.some(m => (m.name || '').trim().toLowerCase() === sName)) return true;
    } else {
        if (sId) {
            if (searchedTeam.type === 'super_team') {
                if (match.away_super_team_id === sId) return true;
            } else {
                if (match.away_team_id === sId) return true;
                const members = match.away_super_team?.members || [];
                if (members.some(m => m.id === sId)) return true;
            }
        }
        const awayName = (match.away_display_name || match.away_super_team?.name || match.away_team?.name || match.away_placeholder || '').trim().toLowerCase();
        if (sName && awayName === sName) return true;
        const members = match.away_super_team?.members || [];
        if (sName && members.some(m => (m.name || '').trim().toLowerCase() === sName)) return true;
    }
    return false;
}

/**
 * MatchCard — Kartu pertandingan di kalender grid dengan pewarnaan nama tim yang kontras dan jelas.
 */
export default function MatchCard({
    match,
    slotHeight = 68,
    isDraggable = true,
    onCardClick,
    searchedTeam1 = null,
    searchedTeam2 = null,
    isFocused = false,
}) {
    const canDrag = isDraggable && match.status === 'scheduled';

    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `match-${match.id}`,
        data: { match },
        disabled: !canDrag,
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        opacity:   isDragging ? 0.5 : 1,
        zIndex:    isDragging ? 999 : isFocused ? 30 : 'auto',
        cursor:    canDrag ? (isDragging ? 'grabbing' : 'grab') : 'default',
    };

    const colors   = MODE_COLORS[match.match_mode] || MODE_COLORS.regu;
    const span     = match.slot_span || (match.match_mode === 'team_regu' || match.match_mode === 'team_double' ? 3 : 1);
    const height   = span * slotHeight - 6; // -6 untuk gap
    const isPlaceholder = match.home_placeholder || match.away_placeholder;

    const stageLabel = STAGE_LABELS[match.stage] || match.stage;

    const homeName = match.home_display_name
        || match.home_super_team?.name
        || match.home_team?.name
        || match.home_placeholder
        || 'TBD';

    const awayName = match.away_display_name
        || match.away_super_team?.name
        || match.away_team?.name
        || match.away_placeholder
        || 'TBD';

    const homeMembers = match.home_super_team?.members || [];
    const awayMembers = match.away_super_team?.members || [];

    const isTeamMode = span >= 3;

    // Evaluasi EXACT match untuk Tim 1 dan Tim 2
    const isHomeT1 = isSideMatchingTeam(match, 'home', searchedTeam1);
    const isAwayT1 = isSideMatchingTeam(match, 'away', searchedTeam1);
    const isHomeT2 = isSideMatchingTeam(match, 'home', searchedTeam2);
    const isAwayT2 = isSideMatchingTeam(match, 'away', searchedTeam2);

    const isTeam1 = isHomeT1 || isAwayT1;
    const isTeam2 = isHomeT2 || isAwayT2;
    const isClash = Boolean(searchedTeam1 && searchedTeam2 && isTeam1 && isTeam2);
    const hasSearch = Boolean(searchedTeam1 || searchedTeam2);
    const isDimmed = hasSearch && !isTeam1 && !isTeam2;

    // Card border & container dynamic classes
    let containerHighlightClasses = 'border-surface-700/40';
    let headerStyle = { backgroundColor: colors.bg };
    let headerBadge = null;

    if (isClash) {
        // Duel Head-to-Head Tim 1 vs Tim 2!
        containerHighlightClasses = 'ring-2.5 ring-fuchsia-400 border-fuchsia-500 shadow-[0_0_22px_rgba(217,70,239,0.7)] scale-[1.01]';
        headerStyle = { background: 'linear-gradient(135deg, #7e22ce 0%, #c026d3 50%, #e11d48 100%)' };
        headerBadge = (
            <span className="bg-white text-fuchsia-950 font-black text-[9px] px-1.5 py-0.2 rounded-full uppercase tracking-tighter shadow-sm animate-pulse">
                ⚔️ DUEL LANGSUNG
            </span>
        );
    } else if (isTeam1) {
        // Tim 1 (Sky Blue / Cyan)
        containerHighlightClasses = 'ring-2 ring-sky-400 border-sky-500 shadow-[0_0_16px_rgba(14,165,233,0.55)] scale-[1.01]';
        headerStyle = { background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' };
        headerBadge = (
            <span className="bg-sky-950 text-sky-200 font-extrabold text-[9px] px-1.5 py-0.2 rounded-full border border-sky-400/60 uppercase tracking-tighter">
                🎯 TIM 1
            </span>
        );
    } else if (isTeam2) {
        // Tim 2 (Vibrant Amber / Orange)
        containerHighlightClasses = 'ring-2 ring-amber-400 border-amber-500 shadow-[0_0_16px_rgba(245,158,11,0.55)] scale-[1.01]';
        headerStyle = { background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)' };
        headerBadge = (
            <span className="bg-amber-950 text-amber-200 font-extrabold text-[9px] px-1.5 py-0.2 rounded-full border border-amber-400/60 uppercase tracking-tighter">
                🎯 TIM 2
            </span>
        );
    }

    // Helper untuk style badge nama tim agar TIDAK SAMA warnanya
    const getTeamNameBadgeClass = (isT1, isT2) => {
        if (isT1) {
            // Tim 1: Cyan / Sky Blue pill
            return 'bg-sky-600 text-white font-extrabold px-1.5 py-0.5 rounded shadow-xs border border-sky-400/80';
        }
        if (isT2) {
            // Tim 2: Amber / Orange pill (Warna JELAS BEDA dari Tim 1)
            return 'bg-amber-600 text-white font-extrabold px-1.5 py-0.5 rounded shadow-xs border border-amber-400/80';
        }
        if (hasSearch) {
            // Tim Lawan (Neutral contrast)
            return 'bg-black/10 text-gray-800 font-medium px-1.5 py-0.5 rounded border border-black/10';
        }
        return 'text-gray-900 font-bold';
    };

    return (
        <div
            ref={setNodeRef}
            id={`match-card-${match.id}`}
            style={{ ...style, height: `${height}px`, minHeight: `${height}px` }}
            className={`
                relative rounded-lg select-none overflow-hidden transition-all duration-200 flex flex-col justify-between
                shadow-sm hover:shadow-md border
                ${containerHighlightClasses}
                ${isDimmed ? 'opacity-35 grayscale-[25%] hover:opacity-100 hover:grayscale-0' : ''}
                ${isFocused ? 'ring-4 ring-yellow-400 scale-[1.03] shadow-[0_0_25px_rgba(250,204,21,0.8)]' : ''}
                ${isDragging ? 'shadow-2xl z-50 opacity-90' : ''}
            `}
            {...attributes}
            {...(canDrag ? listeners : {})}
            onClick={() => !isDragging && onCardClick?.(match)}
        >
            {/* Header dengan Nomor Match #ID, Badge Pencarian, dan warna mode */}
            <div
                className="px-2 py-0.5 flex items-center justify-between gap-1 shrink-0"
                style={headerStyle}
            >
                <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[10px] font-extrabold text-white bg-black/35 px-1.5 py-0.2 rounded shrink-0 font-mono">
                        #{match.match_number || match.id}
                    </span>
                    <span className="text-white text-[10px] font-bold uppercase tracking-wide truncate">
                        {colors.label}
                    </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    {headerBadge}
                    <span className="text-white/90 text-[10px] font-medium shrink-0">
                        {stageLabel}
                    </span>
                </div>
            </div>

            {/* Body */}
            {isTeamMode ? (
                /* Layout Mode Team Regu / Team Double (Vertikal dengan 3 Sub-regu) */
                <div
                    className="px-2.5 py-1.5 flex-1 flex flex-col justify-between gap-1 overflow-hidden"
                    style={{ backgroundColor: colors.light }}
                >
                    {/* Header Tim Home Super Team */}
                    <div className="flex items-center justify-between gap-1 min-w-0 border-b border-black/10 pb-0.5">
                        <div className="flex items-center gap-1 min-w-0 flex-1">
                            {isHomeT1 && <span className="text-[10px] shrink-0">🔵</span>}
                            {isHomeT2 && <span className="text-[10px] shrink-0">🟠</span>}
                            <span
                                className={`text-xs truncate block ${getTeamNameBadgeClass(isHomeT1, isHomeT2)} ${isPlaceholder ? 'italic' : ''}`}
                                title={homeName}
                            >
                                {homeName}
                            </span>
                        </div>
                    </div>

                    {/* 3 Sub-Regu */}
                    <div className="flex-1 flex flex-col justify-around py-0.5 space-y-1">
                        {[0, 1, 2].map((idx) => (
                            <div
                                key={idx}
                                className="px-2 py-1 rounded-md bg-white/70 border border-black/10 flex items-center justify-between text-[10px] shadow-2xs"
                            >
                                <span className="font-semibold text-gray-800 truncate max-w-[45%] text-left" title={homeMembers[idx]?.name}>
                                    {homeMembers[idx]?.name || `Regu ${idx + 1} A`}
                                </span>
                                <span className="text-gray-400 font-mono text-[8px] px-1 font-bold">VS</span>
                                <span className="font-semibold text-gray-800 truncate max-w-[45%] text-right" title={awayMembers[idx]?.name}>
                                    {awayMembers[idx]?.name || `Regu ${idx + 1} B`}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Footer Tim Away Super Team */}
                    <div className="flex items-center justify-end gap-1 min-w-0 border-t border-black/10 pt-0.5">
                        <span
                            className={`text-xs truncate block ${getTeamNameBadgeClass(isAwayT1, isAwayT2)} ${isPlaceholder ? 'italic' : ''}`}
                            title={awayName}
                        >
                            {awayName}
                        </span>
                        {isAwayT1 && <span className="text-[10px] shrink-0">🔵</span>}
                        {isAwayT2 && <span className="text-[10px] shrink-0">🟠</span>}
                    </div>
                </div>
            ) : (
                /* Layout Mode Regu / Double (1 Slot - HORIZONTAL Ke Samping) */
                <div
                    className="px-2 py-1 flex-1 flex items-center justify-between gap-1.5 overflow-hidden"
                    style={{ backgroundColor: colors.light }}
                >
                    {/* Home Team */}
                    <div className="flex items-center gap-1 flex-1 min-w-0">
                        {isHomeT1 && <span className="text-[10px] shrink-0">🔵</span>}
                        {isHomeT2 && <span className="text-[10px] shrink-0">🟠</span>}
                        <span
                            className={`text-xs truncate text-left ${getTeamNameBadgeClass(isHomeT1, isHomeT2)} ${isPlaceholder ? 'italic' : ''}`}
                            title={homeName}
                        >
                            {homeName}
                        </span>
                    </div>

                    {/* VS Center */}
                    {isClash ? (
                        <span className="text-[9px] font-black text-fuchsia-950 bg-fuchsia-200 border border-fuchsia-400/80 uppercase px-1.5 py-0.5 rounded shrink-0 shadow-xs animate-pulse">
                            ⚔️ VS ⚔️
                        </span>
                    ) : (
                        <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-tighter px-0.5 shrink-0">
                            VS
                        </span>
                    )}

                    {/* Away Team */}
                    <div className="flex items-center justify-end gap-1 flex-1 min-w-0 text-right">
                        <span
                            className={`text-xs truncate text-right ${getTeamNameBadgeClass(isAwayT1, isAwayT2)} ${isPlaceholder ? 'italic' : ''}`}
                            title={awayName}
                        >
                            {awayName}
                        </span>
                        {isAwayT1 && <span className="text-[10px] shrink-0">🔵</span>}
                        {isAwayT2 && <span className="text-[10px] shrink-0">🟠</span>}
                    </div>
                </div>
            )}

            {/* Referee badge */}
            {match.referee?.name && (
                <div className="bg-black/10 text-gray-700 text-[9px] font-bold px-1.5 py-0.5 shrink-0 flex items-center justify-between border-t border-black/5">
                    <span className="truncate">🧑‍⚖️ {match.referee.name}</span>
                </div>
            )}
        </div>
    );
}


