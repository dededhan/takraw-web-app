export default function StatCard({ icon, label, value, trend, color = 'primary' }) {
    const colorMap = {
        primary: 'from-primary-500/20 to-primary-600/10 border-primary-500/30',
        accent: 'from-accent-500/20 to-accent-600/10 border-accent-500/30',
        red: 'from-red-500/20 to-red-600/10 border-red-500/30',
        blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
        purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
    };

    const iconBgMap = {
        primary: 'bg-primary-500/20 text-primary-400',
        accent: 'bg-accent-500/20 text-accent-400',
        red: 'bg-red-500/20 text-red-400',
        blue: 'bg-blue-500/20 text-blue-400',
        purple: 'bg-purple-500/20 text-purple-400',
    };

    return (
        <div className={`
            relative overflow-hidden rounded-xl border p-5
            bg-gradient-to-br ${colorMap[color]}
            backdrop-blur-sm transition-all duration-300
            hover:scale-[1.02] hover:shadow-lg
        `}>
            <div className="flex items-start justify-between">
                <div className="space-y-2">
                    <p className="text-sm font-medium text-surface-400">{label}</p>
                    <p className="text-3xl font-bold text-surface-100">{value}</p>
                    {trend && (
                        <p className={`text-xs font-medium ${trend > 0 ? 'text-primary-400' : 'text-red-400'}`}>
                            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
                        </p>
                    )}
                </div>
                <div className={`w-12 h-12 rounded-xl ${iconBgMap[color]} flex items-center justify-center text-xl`}>
                    {icon}
                </div>
            </div>
            {/* Decorative gradient orb */}
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-2xl" />
        </div>
    );
}
