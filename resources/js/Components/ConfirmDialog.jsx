import { useEffect, useRef } from 'react';

export default function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title = 'Konfirmasi',
    message = 'Apakah Anda yakin?',
    confirmLabel = 'Ya, Hapus',
    cancelLabel = 'Batal',
    variant = 'danger',
    processing = false,
}) {
    const dialogRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            dialogRef.current?.focus();
        }
    }, [isOpen]);

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const confirmColors = {
        danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
        warning: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
        primary: 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500',
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Dialog */}
            <div
                ref={dialogRef}
                tabIndex={-1}
                className="relative bg-surface-800 rounded-2xl border border-surface-700/50 shadow-2xl max-w-md w-full p-6 animate-slide-up"
            >
                {/* Icon */}
                <div className="flex items-center justify-center w-14 h-14 mx-auto mb-4 rounded-full bg-red-500/20">
                    <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                </div>

                <h3 className="text-lg font-semibold text-surface-100 text-center mb-2">
                    {title}
                </h3>
                <p className="text-sm text-surface-400 text-center mb-6">
                    {message}
                </p>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={processing}
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-surface-300 bg-surface-700 hover:bg-surface-600 transition-colors"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={processing}
                        className={`
                            flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-colors
                            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-800
                            ${confirmColors[variant]}
                            ${processing ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                    >
                        {processing ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Memproses...
                            </span>
                        ) : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
