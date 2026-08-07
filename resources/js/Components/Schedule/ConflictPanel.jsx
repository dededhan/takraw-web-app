/**
 * ConflictPanel — Sidebar panel daftar konflik jadwal aktif.
 *
 * Props:
 *   conflicts      Array  — list ScheduleConflict objects
 *   onGoToMatch    Function(matchId) — callback scroll ke match tertentu
 *   isLoading      boolean
 */

const CONFLICT_CONFIG = {
    time_overlap: {
        icon:  '⚡',
        label: 'Jadwal Bentrok',
        color: 'text-red-600',
        bg:    'bg-red-50 border-red-200',
    },
    rest_violation: {
        icon:  '😴',
        label: 'Jeda Kurang',
        color: 'text-orange-600',
        bg:    'bg-orange-50 border-orange-200',
    },
    bracket_dependency: {
        icon:  '🔗',
        label: 'Urutan Braket Salah',
        color: 'text-purple-600',
        bg:    'bg-purple-50 border-purple-200',
    },
    ishoma_overlap: {
        icon:  '🕌',
        label: 'Menimpa ISHOMA',
        color: 'text-blue-600',
        bg:    'bg-blue-50 border-blue-200',
    },
};

export default function ConflictPanel({ conflicts = [], onGoToMatch, isLoading = false }) {
    const errors   = conflicts.filter(c => c.severity === 'error');
    const warnings = conflicts.filter(c => c.severity === 'warning');
    const total    = conflicts.length;

    if (isLoading) {
        return (
            <div className="w-72 bg-white border-l border-gray-200 flex flex-col">
                <PanelHeader errors={0} warnings={0} total={0} />
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center text-gray-400">
                        <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-2" />
                        <p className="text-sm">Memeriksa konflik...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-72 bg-white border-l border-gray-200 flex flex-col shadow-lg">
            <PanelHeader errors={errors.length} warnings={warnings.length} total={total} />

            {total === 0 ? (
                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="text-center">
                        <div className="text-4xl mb-3">✅</div>
                        <p className="text-sm font-medium text-green-700">Tidak ada konflik!</p>
                        <p className="text-xs text-gray-400 mt-1">Jadwal siap untuk dipublikasi.</p>
                    </div>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto">
                    {/* Error section */}
                    {errors.length > 0 && (
                        <div className="p-3 space-y-2">
                            <p className="text-xs font-semibold text-red-500 uppercase tracking-wide flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-red-500" />
                                Error ({errors.length})
                            </p>
                            {errors.map(conflict => (
                                <ConflictItem
                                    key={conflict.id}
                                    conflict={conflict}
                                    onGoToMatch={onGoToMatch}
                                />
                            ))}
                        </div>
                    )}

                    {/* Warning section */}
                    {warnings.length > 0 && (
                        <div className="p-3 space-y-2 border-t border-gray-100">
                            <p className="text-xs font-semibold text-orange-500 uppercase tracking-wide flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-orange-400" />
                                Peringatan ({warnings.length})
                            </p>
                            {warnings.map(conflict => (
                                <ConflictItem
                                    key={conflict.id}
                                    conflict={conflict}
                                    onGoToMatch={onGoToMatch}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Footer info */}
            {total > 0 && (
                <div className="p-3 border-t border-gray-100 bg-gray-50">
                    <p className="text-xs text-gray-500 text-center">
                        {errors.length > 0
                            ? `Selesaikan ${errors.length} error sebelum publish`
                            : 'Hanya peringatan — boleh publish'}
                    </p>
                </div>
            )}
        </div>
    );
}

function PanelHeader({ errors, warnings, total }) {
    return (
        <div className="px-4 py-3 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">Panel Konflik</h3>
                {total > 0 && (
                    <span className={`
                        text-xs font-bold px-2 py-0.5 rounded-full
                        ${errors > 0 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}
                    `}>
                        {total}
                    </span>
                )}
            </div>
            {(errors > 0 || warnings > 0) && (
                <div className="flex gap-3 mt-1">
                    {errors > 0 && (
                        <span className="flex items-center gap-1 text-xs text-red-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            {errors} error
                        </span>
                    )}
                    {warnings > 0 && (
                        <span className="flex items-center gap-1 text-xs text-orange-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                            {warnings} peringatan
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

function ConflictItem({ conflict, onGoToMatch }) {
    const config = CONFLICT_CONFIG[conflict.conflict_type] || {
        icon:  '⚠️',
        label: 'Konflik',
        color: 'text-gray-600',
        bg:    'bg-gray-50 border-gray-200',
    };

    return (
        <div className={`rounded-lg border p-2.5 ${config.bg}`}>
            <div className="flex items-start gap-2">
                <span className="text-base leading-none mt-0.5">{config.icon}</span>
                <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold ${config.color}`}>{config.label}</p>
                    <p className="text-xs text-gray-600 mt-0.5 line-clamp-3 leading-relaxed">
                        {conflict.description}
                    </p>
                </div>
            </div>
            {onGoToMatch && conflict.match_id && (
                <button
                    className={`
                        mt-2 w-full text-[10px] py-1 rounded font-medium transition-colors
                        ${conflict.severity === 'error'
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-orange-100 text-orange-700 hover:bg-orange-200'}
                    `}
                    onClick={() => onGoToMatch(conflict.match_id)}
                >
                    Lihat Match #{conflict.match_id} →
                </button>
            )}
        </div>
    );
}
