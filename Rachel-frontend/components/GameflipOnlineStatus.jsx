import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { API_URL } from '../src/config';
import { useToast } from '../src/useToast';

function GameflipOnlineStatus({ variant = 'compact' }) {
    const { showToast } = useToast();
    const [statusData, setStatusData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [remainingSeconds, setRemainingSeconds] = useState(0);

    const fetchStatus = useCallback(async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const token = localStorage.getItem('rachel_token');
            if (!token) return;

            const res = await axios.get(`${API_URL}/api/gameflip/status`, {
                headers: { Authorization: token }
            });

            if (res.data?.success) {
                setStatusData(res.data);
                if (res.data.isOnline && res.data.onlineUntil) {
                    const diff = Math.max(0, Math.floor((new Date(res.data.onlineUntil).getTime() - Date.now()) / 1000));
                    setRemainingSeconds(diff);
                } else {
                    setRemainingSeconds(0);
                }
                if (!silent) {
                    if (res.data.isOnline) {
                        showToast('Status updated! Your account is Online on Gameflip.', 'success');
                    } else {
                        showToast('Status checked: Your account is Offline on Gameflip.', 'info');
                    }
                }
            }
        } catch (err) {
            console.warn('Error checking Gameflip online status:', err.response?.data || err.message);
        } finally {
            if (!silent) setIsLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchStatus(true);
        // Refresh every 2 minutes
        const interval = setInterval(() => fetchStatus(true), 120000);
        return () => clearInterval(interval);
    }, [fetchStatus]);

    // Live countdown timer
    useEffect(() => {
        if (remainingSeconds <= 0) return;
        const timer = setInterval(() => {
            setRemainingSeconds((prev) => {
                if (prev <= 1) {
                    fetchStatus(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [remainingSeconds, fetchStatus]);


    const formatRemainingTime = (totalSecs) => {
        if (totalSecs <= 0) return 'Expired';
        const hours = Math.floor(totalSecs / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);
        if (hours > 0) {
            return `${hours}h ${mins}m`;
        }
        return `${mins}m`;
    };

    const isOnline = statusData?.isOnline && remainingSeconds > 0;

    // Header variant (Status indicator pill that opens status details modal)
    if (variant === 'header') {
        return (
            <>
                <button
                    type="button"
                    onClick={() => setShowModal(true)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer border ${
                        isOnline
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 shadow-sm shadow-emerald-500/10'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-700/60 hover:text-zinc-200 hover:border-zinc-600'
                    }`}
                    title="View presence status on Gameflip"
                >
                    <span className={`h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
                    <span className="hidden sm:inline">Gameflip:</span>
                    <span>{isOnline ? `Online (${formatRemainingTime(remainingSeconds)})` : 'Offline'}</span>
                </button>

                {showModal && typeof document !== 'undefined' && createPortal(renderModal(), document.body)}
            </>
        );
    }

    return null;

    function renderModal() {
        return (
            <div
                className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
                onClick={() => setShowModal(false)}
            >
                <div
                    className="relative bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto flex flex-col justify-start animate-in zoom-in-95 duration-200 my-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 sticky top-0 bg-zinc-900 z-10">
                        <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <span className="font-bold text-base text-zinc-100">Gameflip Presence Status</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowModal(false)}
                            className="text-zinc-400 hover:text-white p-1 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 space-y-4 overflow-y-auto">
                        {/* Profile Info Card */}
                        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                            {statusData?.avatar ? (
                                <img
                                    src={statusData.avatar}
                                    alt="Gameflip Avatar"
                                    className="w-11 h-11 rounded-full object-cover border border-zinc-700"
                                />
                            ) : (
                                <div className="w-11 h-11 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 font-bold">
                                    GF
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-bold text-zinc-100 truncate">
                                    {statusData?.displayName || 'Gameflip Seller'}
                                </h4>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span
                                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full border ${
                                            isOnline
                                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                                        }`}
                                    >
                                        <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
                                        {isOnline ? 'ONLINE' : 'OFFLINE'}
                                    </span>
                                    {isOnline && (
                                        <span className="text-xs text-zinc-400">
                                            {formatRemainingTime(remainingSeconds)} remaining
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Informational Guidance */}
                        {isOnline ? (
                            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-xs text-zinc-300 space-y-2.5">
                                <p className="font-semibold text-emerald-400 flex items-center gap-1.5">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                    Your store appears as ONLINE on Gameflip
                                </p>
                                <p className="text-zinc-400">
                                    Your listings get higher visibility in searches with the &quot;Online&quot; filter. Your current session expires approximately at{' '}
                                    <strong className="text-zinc-200">
                                        {statusData?.onlineUntil ? new Date(statusData.onlineUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                    </strong>.
                                </p>
                                <p className="text-zinc-400 border-t border-emerald-500/20 pt-2">
                                    To change your status to offline, turn off the &quot;Online&quot; switch in the official Gameflip mobile app.
                                </p>
                            </div>
                        ) : (
                            <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs text-zinc-400 space-y-2.5">
                                <div className="flex items-center gap-2 text-zinc-200 font-semibold">
                                    <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                    <span>How to activate the green &quot;Online&quot; badge?</span>
                                </div>
                                <p className="leading-relaxed">
                                    Due to Gameflip&apos;s security policies and bot prevention, the toggle to appear as <strong>Online</strong> must be turned on directly from the <strong>official Gameflip mobile app</strong> (iOS or Android).
                                </p>
                                <div className="bg-zinc-900/80 p-3 rounded-lg border border-zinc-800 space-y-1.5 text-zinc-300">
                                    <p className="font-semibold text-zinc-200">Quick steps:</p>
                                    <ol className="list-decimal list-inside space-y-1 text-zinc-400">
                                        <li>Open the Gameflip app on your phone.</li>
                                        <li>Tap the top-left side menu.</li>
                                        <li>Toggle the <strong>Online</strong> switch and choose your desired duration.</li>
                                    </ol>
                                </div>
                                <p className="text-zinc-500">
                                    Once activated on your phone, click the button below to verify and see your account Online here in real time.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-zinc-800/80 sticky bottom-0 bg-zinc-900 z-10">
                        <button
                            type="button"
                            onClick={() => setShowModal(false)}
                            className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800/40 hover:bg-zinc-800 rounded-lg border border-zinc-700/60 transition-colors cursor-pointer"
                        >
                            Close
                        </button>
                        <button
                            type="button"
                            onClick={() => fetchStatus(false)}
                            disabled={isLoading}
                            className="px-4 py-2 text-xs font-semibold text-zinc-950 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 rounded-lg shadow-md transition-all duration-200 cursor-pointer flex items-center gap-1.5"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    <span>Checking...</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    <span>Check Status</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    }
}

export default GameflipOnlineStatus;
