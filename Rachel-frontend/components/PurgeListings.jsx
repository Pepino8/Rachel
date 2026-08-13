import { useState } from "react";
import axios from "axios";
import { API_URL } from '../src/config';
import { useToast } from "../src/ToastContext";
import { createPortal } from "react-dom";

function PurgeListings() {
    const { showToast } = useToast();
    const [isPurgingExpired, setIsPurgingExpired] = useState(false);
    const [isPurgingAll, setIsPurgingAll] = useState(false);
    const [purgedCount, setPurgedCount] = useState(0);
    const [showConfirm, setShowConfirm] = useState(false);

    const handlePurgeExpired = async () => {
        setIsPurgingExpired(true);
        console.log("Requesting Gameflip expired listings purge...");
        try {
            const response = await axios.post(`${API_URL}/api/purge/expired`);
            console.log("Purge expired success:", response.data);
            setPurgedCount(response.data.purged || 0);
            showToast(`Purged ${response.data.purged || 0} expired/draft listings!`, 'success');
        } catch (error) {
            console.error("Purge expired failed:", error.response?.data || error.message);
            showToast(`Error: ${error.response?.data?.error?.message || error.message}`, 'error');
        } finally {
            setIsPurgingExpired(false);
        }
    };

    const handlePurgeAll = () => {
        setShowConfirm(true);
    };

    const executePurgeAll = async () => {
        setIsPurgingAll(true);
        console.log("Requesting Gameflip ALL listings purge...");
        try {
            const response = await axios.post(`${API_URL}/api/purge/all`);
            console.log("Purge all success:", response.data);
            setPurgedCount(response.data.purged || 0);
            showToast(`Purged all ${response.data.purged || 0} listings!`, 'success');
        } catch (error) {
            console.error("Purge all failed:", error.response?.data || error.message);
            showToast(`Error: ${error.response?.data?.error?.message || error.message}`, 'error');
        } finally {
            setIsPurgingAll(false);
        }
    };

    const activePurging = isPurgingExpired || isPurgingAll;

    return (
        <div className="bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md rounded-2xl p-6 shadow-xl shadow-black/20 w-full transition-all duration-300">
            {/* Header Section */}
            <div className="flex items-center justify-between border-b border-zinc-800/60 pb-4 mb-4">
                <div>
                    <h2 className="font-bold text-lg text-zinc-100 tracking-tight">Purge Listings</h2>
                    <p className="text-xs text-zinc-500 mt-0.5">Database maintenance agent</p>
                </div>
                {activePurging ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                        Purging
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">
                        <span className="h-1.5 w-1.5 rounded-full bg-zinc-500"></span>
                        Idle
                    </span>
                )}
            </div>

            {/* Description / Info */}
            <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                Clean up active listing records. Remove expired posts to free space or wipe all listing databases for reset.
            </p>

            {/* Stats / Feedback dashboard */}
            {purgedCount > 0 && (
                <div className="grid grid-cols-1 gap-4 mb-6 animate-in fade-in duration-200">
                    <div className="bg-zinc-950/40 border border-zinc-800/50 rounded-xl p-4 flex items-center justify-between transition-all duration-300 hover:border-zinc-700/50">
                        <div>
                            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                                Items Removed in Last Run
                            </span>
                            <div className="text-3xl font-extrabold text-red-400 tracking-tight mt-1">{purgedCount}</div>
                        </div>
                        <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20">
                            <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </div>
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
                {/* Remove Expired Button */}
                <button
                    onClick={handlePurgeExpired}
                    disabled={activePurging}
                    className={`w-full py-2.5 px-4 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 border disabled:opacity-50 disabled:cursor-not-allowed
                        ${isPurgingExpired
                            ? 'bg-red-950/30 text-red-400 border-red-900/50'
                            : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 border-zinc-700/50 hover:border-zinc-600/50'
                        }`}
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {isPurgingExpired ? 'Purging Expired and Drafts...' : 'Remove Expired / Drafts'}
                </button>

                {/* Remove All Button */}
                <button
                    onClick={handlePurgeAll}
                    disabled={activePurging}
                    className={`w-full py-2.5 px-4 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 border disabled:opacity-50 disabled:cursor-not-allowed
                        ${isPurgingAll
                            ? 'bg-red-950/30 text-red-400 border-red-900/50'
                            : 'bg-red-950/10 hover:bg-red-950/30 text-red-400 border-red-950/30 hover:border-red-500/30'
                        }`}
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    {isPurgingAll ? 'Purging All...' : 'Remove All'}
                </button>
            </div>

            {/* Custom Confirm Modal */}
            {showConfirm && createPortal(
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 text-zinc-100 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
                        <div className="h-1.5 w-full bg-gradient-to-r from-red-500 via-rose-500 to-red-600"></div>
                        <div className="p-6 flex flex-col items-center text-center">
                            <div className="h-14 w-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-5 relative group">
                                <div className="absolute inset-0 rounded-full bg-red-500/5 blur-xl group-hover:bg-red-500/15 transition-all duration-300"></div>
                                <svg className="w-6 h-6 text-red-500 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-extrabold text-zinc-100 tracking-tight mb-2">Confirm Purge All</h3>
                            <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                                Are you sure you want to delete <span className="text-red-400 font-semibold">ALL</span> active and draft listings on Gameflip? This action cannot be undone.
                            </p>
                            <div className="w-full flex flex-col sm:flex-row gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm(false)}
                                    className="w-full order-2 sm:order-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700/50 transition-all duration-200 cursor-pointer text-center"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowConfirm(false);
                                        executePurgeAll();
                                    }}
                                    className="w-full order-1 sm:order-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 hover:scale-[1.02] shadow-lg shadow-red-950/20 hover:shadow-red-500/20 transition-all duration-200 cursor-pointer text-center"
                                >
                                    Purge All
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

export default PurgeListings;
