import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

/**
 * Warna per mode tanding
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
 * MatchCard — Kartu pertandingan yang bisa di-drag di grid jadwal.
 */
export default function MatchCard({ match, slotHeight = 68, isDraggable = true, onCardClick }) {
    const canDrag = isDraggable && match.status === 'scheduled';

    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `match-${match.id}`,
        data: { match },
        disabled: !canDrag,
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        opacity:   isDragging ? 0.5 : 1,
        zIndex:    isDragging ? 999 : 'auto',
        cursor:    canDrag ? (isDragging ? 'grabbing' : 'grab') : 'default',
    };

    const colors   = MODE_COLORS[match.match_mode] || MODE_COLORS.regu;
    const span     = match.slot_span || (match.match_mode === 'team_regu' || match.match_mode === 'team_double' ? 3 : 1);
    const height   = span * slotHeight - 6; // -6 untuk gap
    const hasConflict = match.has_conflicts;
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

    return (
        <div
            ref={setNodeRef}
            style={{ ...style, height: `${height}px`, minHeight: `${height}px` }}
            className={`
                relative rounded-lg select-none overflow-hidden transition-shadow flex flex-col justify-between
                shadow-sm hover:shadow-md border border-surface-700/30
                ${isDragging ? 'shadow-2xl z-50' : ''}
            `}
            {...attributes}
            {...(canDrag ? listeners : {})}
            onClick={() => !isDragging && onCardClick?.(match)}
        >
            {/* Header dengan Nomor Match #ID dan warna mode */}
            <div
                className="px-2 py-0.5 flex items-center justify-between gap-1 shrink-0"
                style={{ backgroundColor: colors.bg }}
            >
                <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[10px] font-extrabold text-white bg-black/35 px-1.5 py-0.2 rounded shrink-0 font-mono">
                        #{match.match_number || match.id}
                    </span>
                    <span className="text-white text-[10px] font-bold uppercase tracking-wide truncate">
                        {colors.label} {isTeamMode ? '(3 Sesi)' : ''}
                    </span>
                </div>
                <span className="text-white/90 text-[10px] font-medium shrink-0">
                    {stageLabel}
                </span>
            </div>

            {/* Body */}
            {isTeamMode ? (
                /* Layout Mode Team Regu / Team Double (3 Slot / 150 min - Vertikal dengan 3 Sub-regu) */
                <div
                    className="px-2.5 py-2 flex-1 flex flex-col justify-between gap-1 overflow-hidden"
                    style={{ backgroundColor: colors.light }}
                >
                    <span className={`text-xs font-extrabold block truncate ${isPlaceholder ? 'italic' : ''}`} style={{ color: colors.text }}>
                        {homeName}
                    </span>

                    <div className="my-1 py-1.5 px-2 rounded-lg bg-black/5 border border-black/10 space-y-1">
                        {[0, 1, 2].map((idx) => (
                            <div key={idx} className="flex items-center justify-between text-[10px] leading-tight">
                                <span className="font-semibold text-gray-800 truncate max-w-[44%]" title={homeMembers[idx]?.name}>
                                    {homeMembers[idx]?.name || `Regu ${idx + 1} A`}
                                </span>
                                <span className="text-gray-400 font-mono text-[9px] px-1 font-bold">VS</span>
                                <span className="font-semibold text-gray-800 truncate max-w-[44%] text-right" title={awayMembers[idx]?.name}>
                                    {awayMembers[idx]?.name || `Regu ${idx + 1} B`}
                                </span>
                            </div>
                        ))}
                    </div>

                    <span className={`text-xs font-extrabold block truncate text-right ${isPlaceholder ? 'italic' : ''}`} style={{ color: colors.text }}>
                        {awayName}
                    </span>
                </div>
            ) : (
                /* Layout Mode Regu / Double (1 Slot - HORIZONTAL Ke Samping) */
                <div
                    className="px-2 py-1 flex-1 flex items-center justify-between gap-1.5 overflow-hidden"
                    style={{ backgroundColor: colors.light }}
                >
                    <span
                        className={`text-xs font-bold truncate flex-1 text-left ${isPlaceholder ? 'italic' : ''}`}
                        style={{ color: colors.text }}
                        title={homeName}
                    >
                        {homeName}
                    </span>

                    <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-tighter px-0.5 shrink-0">
                        VS
                    </span>

                    <span
                        className={`text-xs font-bold truncate flex-1 text-right ${isPlaceholder ? 'italic' : ''}`}
                        style={{ color: colors.text }}
                        title={awayName}
                    >
                        {awayName}
                    </span>
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
