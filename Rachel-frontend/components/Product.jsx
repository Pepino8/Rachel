import { useState } from 'react';
import axios from 'axios';
import Switch from '@mui/material/Switch';

function Product({ id, product, category, price, isReal, onDelete }) {
    const label = { inputProps: { 'aria-label': 'Switch demo' } };
    const [isDeleting, setIsDeleting] = useState(false);

    // Helper to get category icon / badge
    const getCategoryBadge = (cat) => {
        const c = String(cat).toLowerCase();
        if (c.includes('console') || c.includes('video-game-console')) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    Console
                </span>
            );
        } else if (c.includes('dvd') || c.includes('video-dvd')) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    DVD
                </span>
            );
        } else if (c.includes('giftcard')) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Giftcard
                </span>
            );
        } else {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                    Item
                </span>
            );
        }
    };

    const handleDelete = async () => {
        if (!isReal || !id) return;
        setIsDeleting(true);
        try {
            console.log(`Deleting Gameflip listing: ${id}...`);
            await axios.delete(`http://localhost:3000/api/listings/${id}`);
            console.log(`Successfully deleted Gameflip listing ${id}`);
            if (onDelete) onDelete(id);
        } catch (error) {
            console.error("Failed to delete listing:", error.response?.data || error.message);
            alert(`Error deleting listing: ${error.response?.data?.error?.message || error.message}`);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="w-full bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700/50 hover:bg-zinc-900/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-300">
            {/* Left side: Icon + Product Details */}
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center flex-shrink-0 text-zinc-500">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                </div>
                <div className="flex flex-col gap-0.5">
                    <h4 className="text-sm font-semibold text-zinc-100">{product}</h4>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-emerald-400 font-medium">{price}</span>
                        <span className="text-zinc-700">•</span>
                        {getCategoryBadge(category)}
                    </div>
                </div>
            </div>

            {/* Right side: Auto Toggle + Action Button */}
            <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto border-t sm:border-t-0 border-zinc-800/60 pt-3 sm:pt-0">
                <div className="flex items-center gap-1.5">
                    <span className="text-xs text-zinc-500">Auto</span>
                    <Switch 
                        {...label} 
                        defaultChecked
                        sx={{
                            '& .MuiSwitch-switchBase.Mui-checked': {
                                color: '#10b981',
                                '& + .MuiSwitch-track': {
                                    backgroundColor: '#059669',
                                },
                            },
                        }}
                    />
                </div>
                {isReal ? (
                    <button 
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="px-3 py-1.5 bg-red-950/20 hover:bg-red-950/40 text-red-400 border border-red-900/40 hover:border-red-500/50 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer disabled:opacity-50"
                    >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                ) : (
                    <button className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-zinc-800 hover:border-zinc-700 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer">
                        Post Product
                    </button>
                )}
            </div>
        </div>
    );
}

export default Product;