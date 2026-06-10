import { useState } from 'react';
import axios from 'axios';
import ImageUploader from './ImageUploader';

function CreateImport({ onProductCreated }) {
    const [create, setCreate] = useState(false);

    // Form States
    const [nombre, setNombre] = useState('');
    const [desc, setDesc] = useState('');
    const [price, setPrice] = useState('');
    const [autopost, setAutopost] = useState('yes');
    const [category, setCategory] = useState('ingame-item');
    const [isLoading, setIsLoading] = useState(false);

    const handleCreate = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        console.log('Sending product creation request with payload:', { nombre, desc, price, category, autopost });

        try {
            // Generate product ID
            const productId = typeof window !== 'undefined' && window.crypto?.randomUUID 
                ? window.crypto.randomUUID() 
                : 'prod_' + Math.random().toString(36).substring(2, 15);

            // 1. Save product to local DB
            await axios.post('http://localhost:3000/api/db/products', {
                id: productId,
                name: nombre,
                description: desc,
                price: parseFloat(price),
                category: category,
                auto_post: autopost === 'yes'
            });

            console.log('Successfully saved product to SQLite DB:', productId);

            // 2. If autopost is yes, also create the listing on Gameflip
            if (autopost === 'yes') {
                const response = await axios.post('http://localhost:3000/api/listings', {
                    name: nombre,
                    description: desc,
                    price: price,
                    category: category,
                    product_id: productId
                });
                console.log('Gameflip listing created successfully:', response.data);
                alert(`Product created and posted to Gameflip! ID: ${response.data.id || response.data.listing_id || 'unknown'}`);
            } else {
                alert(`Product created successfully in local database!`);
            }

            setCreate(false);

            // Clear form
            setNombre('');
            setDesc('');
            setPrice('');

            // Trigger parent refresh
            if (onProductCreated) {
                onProductCreated();
            }
        } catch (error) {
            console.error('Error creating product listing:', error.response?.data || error.message);
            alert(`Error: ${error.response?.data?.error?.message || error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 shadow-xl shadow-black/20 w-full transition-all duration-300">
            {/* Title Section */}
            <div className="border-b border-zinc-800/60 pb-4 mb-4">
                <h2 className="font-bold text-lg text-zinc-100 tracking-tight">Product Actions</h2>
                <p className="text-xs text-zinc-500 mt-0.5">Manage and import inventory items</p>
            </div>

            {/* Actions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                <button
                    onClick={() => setCreate(true)}
                    className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-semibold transition-all duration-200 hover:-translate-y-0.5 shadow-lg shadow-emerald-500/5 hover:shadow-emerald-500/10 cursor-pointer"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Create Product
                </button>
                <button
                    className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-zinc-700/80 bg-zinc-800/40 hover:bg-zinc-800/80 text-zinc-300 font-semibold transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Import Product
                </button>
            </div>

            {/* Create Product Modal overlay */}
            {create && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    {/* Modal Card */}
                    <form onSubmit={handleCreate} className="bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto flex flex-col justify-start animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/60 sticky top-0 bg-zinc-900 z-10">
                            <span className="text-base font-bold tracking-tight text-zinc-100">Create Product</span>
                            <button
                                type="button"
                                onClick={() => setCreate(false)}
                                className="text-zinc-400 hover:text-white cursor-pointer transition-colors p-1 hover:bg-zinc-800 rounded-lg"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Modal Body / Form */}
                        <div className="p-6 space-y-4">
                            {/* Product Name */}
                            <div>
                                <label htmlFor="nombre" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                                    Name
                                </label>
                                <input
                                    type="text"
                                    id="nombre"
                                    name="nombre"
                                    value={nombre}
                                    onChange={(e) => setNombre(e.target.value)}
                                    required
                                    placeholder="Enter product name"
                                    className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-emerald-500/50 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200"
                                />
                            </div>

                            {/* Image Uploader */}
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                                    Product Image
                                </label>
                                <ImageUploader />
                            </div>

                            {/* Description */}
                            <div>
                                <label htmlFor="desc" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                                    Description
                                </label>
                                <input
                                    type="text"
                                    id="desc"
                                    name="desc"
                                    value={desc}
                                    onChange={(e) => setDesc(e.target.value)}
                                    required
                                    placeholder="Enter description"
                                    className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-emerald-500/50 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200"
                                />
                            </div>

                            {/* Price */}
                            <div>
                                <label htmlFor="price" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                                    Price (USD)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        id="price"
                                        name="price"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        required
                                        placeholder="0.00"
                                        className="w-full pl-8 pr-3.5 py-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-emerald-500/50 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200"
                                    />
                                </div>
                            </div>

                            {/* Autopost */}
                            <div>
                                <label htmlFor="autopost" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                                    Autopost
                                </label>
                                <select
                                    id="autopost"
                                    name="autopost"
                                    value={autopost}
                                    onChange={(e) => setAutopost(e.target.value)}
                                    className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-emerald-500/50 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200"
                                >
                                    <option value="yes">Yes</option>
                                    <option value="no">No</option>
                                </select>
                            </div>

                            {/* Category */}
                            <div>
                                <label htmlFor="category" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                                    Category
                                </label>
                                <select
                                    id="category"
                                    name="category"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-emerald-500/50 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200"
                                >
                                    <option value="ingame-item">Ingame Item</option>
                                    <option value="video-dvd">Video DVD</option>
                                    <option value="video-game-console">Video Game Console</option>
                                    <option value="giftcard">Gift Card</option>
                                    <option value="unknown">Unknown</option>
                                </select>
                            </div>
                        </div>

                        {/* Modal Actions Footer */}
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800/60 sticky bottom-0 bg-zinc-900 z-10">
                            <button
                                type="button"
                                onClick={() => setCreate(false)}
                                className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800/30 hover:bg-zinc-800 rounded-lg border border-zinc-700/50 hover:border-zinc-600/50 transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="px-4 py-2 text-sm font-semibold text-zinc-950 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-700 disabled:text-zinc-500 rounded-lg shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                            >
                                {isLoading ? 'Creating...' : 'Create'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

export default CreateImport;