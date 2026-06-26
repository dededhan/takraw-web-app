import { Link } from '@inertiajs/react';

export default function Pagination({ links, className = '' }) {
    if (!links || links.length <= 3) return null;

    return (
        <nav className={`flex items-center justify-center gap-1 ${className}`}>
            {links.map((link, index) => {
                if (!link.url && !link.active) {
                    return (
                        <span
                            key={index}
                            className="px-3 py-2 text-sm text-surface-600 rounded-lg"
                            dangerouslySetInnerHTML={{ __html: link.label }}
                        />
                    );
                }

                return (
                    <Link
                        key={index}
                        href={link.url || '#'}
                        className={`
                            px-3 py-2 text-sm rounded-lg font-medium transition-all duration-200
                            ${link.active
                                ? 'bg-primary-600 text-white shadow-glow-primary'
                                : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800'
                            }
                            ${!link.url ? 'pointer-events-none opacity-40' : ''}
                        `}
                        dangerouslySetInnerHTML={{ __html: link.label }}
                        preserveScroll
                    />
                );
            })}
        </nav>
    );
}
