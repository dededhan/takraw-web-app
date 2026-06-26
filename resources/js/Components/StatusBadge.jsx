const STATUS_CONFIG = {
    // Tournament statuses
    draft: { label: 'Draft', color: 'bg-surface-600/30 text-surface-300 border-surface-500/30' },
    registration: { label: 'Registrasi', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    pool_stage: { label: 'Penyisihan', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    bracket_stage: { label: 'Bracket', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
    completed: { label: 'Selesai', color: 'bg-primary-500/20 text-primary-300 border-primary-500/30' },

    // Match statuses
    scheduled: { label: 'Dijadwalkan', color: 'bg-surface-600/30 text-surface-300 border-surface-500/30' },
    setup: { label: 'Setup', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    live: { label: '● LIVE', color: 'bg-red-500/20 text-red-300 border-red-500/30 animate-pulse' },
    finished: { label: 'Selesai', color: 'bg-primary-500/20 text-primary-300 border-primary-500/30' },

    // Match stages
    pool: { label: 'Pool', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    quarterfinal: { label: 'Perempat Final', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    semifinal: { label: 'Semi Final', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
    third_place: { label: 'Perebutan Juara 3', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    final: { label: 'Final', color: 'bg-accent-500/20 text-accent-300 border-accent-500/30' },

    // Generic
    active: { label: 'Aktif', color: 'bg-primary-500/20 text-primary-300 border-primary-500/30' },
    inactive: { label: 'Nonaktif', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
};

export default function StatusBadge({ status, size = 'sm', className = '' }) {
    const config = STATUS_CONFIG[status] || { label: status, color: 'bg-surface-600/30 text-surface-300 border-surface-500/30' };

    const sizeClasses = {
        xs: 'text-[10px] px-1.5 py-0.5',
        sm: 'text-xs px-2 py-0.5',
        md: 'text-sm px-3 py-1',
    };

    return (
        <span className={`
            inline-flex items-center rounded-full border font-medium whitespace-nowrap
            ${sizeClasses[size]}
            ${config.color}
            ${className}
        `}>
            {config.label}
        </span>
    );
}
