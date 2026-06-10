import { useState, useEffect } from 'react';
import axios from 'axios';
import Switch from '@mui/material/Switch';

function Product({ id, product, description, category, price, rawPrice, autoPost, isReal, onDelete, onPost }) {
    const label = { inputProps: { 'aria-label': 'Switch demo' } };
    const [isDeleting, setIsDeleting] = useState(false);
    const [isPosting, setIsPosting] = useState(false);
    const [autoPostState, setAutoPostState] = useState(autoPost);
    const [isToggling, setIsToggling] = useState(false);

    useEffect(() => {
        setAutoPostState(autoPost);
    }, [autoPost]);

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

    const handleToggleAutoPost = async (e) => {
        if (!isReal || !id) return;
        const newValue = e.target.checked;
        setAutoPostState(newValue);
        setIsToggling(true);
        try {
            console.log(`Toggling auto_post for product ${id} to ${newValue}...`);
            await axios.patch(`http://localhost:3000/api/db/products/${id}/autopost`, {
                auto_post: newValue
            });
            console.log(`Successfully toggled auto_post for ${id}`);
        } catch (error) {
            console.error("Failed to update auto_post status:", error.message);
            setAutoPostState(!newValue); // revert on error
            alert(`Failed to update auto-post toggle: ${error.message}`);
        } finally {
            setIsToggling(false);
        }
    };

    const handleDelete = async () => {
        if (!isReal || !id) return;

        const confirmDelete = window.confirm(`Are you sure you want to delete "${product}" from your inventory?`);
        if (!confirmDelete) return;

        setIsDeleting(true);
        try {
            console.log(`Deleting product ${id} from DB...`);
            await axios.delete(`http://localhost:3000/api/db/products/${id}`);
            console.log(`Successfully deleted product ${id} from DB`);
            if (onDelete) onDelete(id);
        } catch (error) {
            console.error("Failed to delete product:", error.response?.data || error.message);
            alert(`Error deleting product: ${error.response?.data?.error?.message || error.message}`);
        } finally {
            setIsDeleting(false);
        }
    };

    const handlePost = async () => {
        if (!isReal || !id) return;
        setIsPosting(true);
        try {
            console.log(`Posting product "${product}" to Gameflip...`);
            // Strip $ from price if needed
            const cleanPrice = typeof price === 'string' && price.startsWith('$') ? price.slice(1) : price;

            const response = await axios.post('http://localhost:3000/api/listings', {
                name: product,
                description: description || 'No description provided.',
                price: rawPrice || cleanPrice,
                category: category,
                product_id: id
            });

            console.log(`Successfully posted product ${id} to Gameflip:`, response.data);
            alert(`Product "${product}" successfully posted to Gameflip!`);
            if (onPost) onPost();
        } catch (error) {
            console.error("Failed to post product to Gameflip:", error.response?.data || error.message);
            alert(`Error posting to Gameflip: ${error.response?.data?.error?.message || error.message}`);
        } finally {
            setIsPosting(false);
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
                        checked={autoPostState}
                        onChange={handleToggleAutoPost}
                        disabled={isToggling || !isReal}
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
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePost}
                            disabled={isPosting}
                            className="px-3 py-1.5 bg-emerald-950/20 hover:bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 hover:border-emerald-500/50 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer disabled:opacity-50"
                        >
                            {isPosting ? 'Posting...' : 'Post'}
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="p-1.5 bg-zinc-950/20 hover:bg-red-950/20 text-zinc-500 hover:text-red-400 border border-zinc-850 hover:border-red-900/40 rounded-lg transition-all duration-200 cursor-pointer disabled:opacity-50"
                            title="Delete from inventory"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
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