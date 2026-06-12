import { useEffect, useState } from 'react';
import axios from 'axios';
import ImageUploader from './ImageUploader';

function ProductEditModal({ product, onClose, onSaved }) {
    const [name, setName] = useState(product.name);
    const [description, setDescription] = useState(product.description);
    const [price, setPrice] = useState(String(product.rawPrice ?? ''));
    const [autopost, setAutopost] = useState(product.autoPost ? 'yes' : 'no');
    const [category, setCategory] = useState(product.category || 'ingame-item');
    const [imageFile, setImageFile] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setName(product.name);
        setDescription(product.description);
        setPrice(String(product.rawPrice ?? ''));
        setAutopost(product.autoPost ? 'yes' : 'no');
        setCategory(product.category || 'ingame-item');
        setImageFile(null);
    }, [product]);

    const fileToBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const payload = {
                name,
                description,
                price: parseFloat(price),
                category,
                auto_post: autopost === 'yes'
            };

            if (imageFile) {
                payload.image = await fileToBase64(imageFile);
            }

            await axios.patch(`http://localhost:3000/api/db/products/${product.id}`, payload);
            onSaved?.();
        } catch (error) {
            console.log('Error updating product:', error.response?.data || error.message);
            alert(`Error: ${error.response?.data?.error?.message || error.response?.data?.error || error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <form
                onSubmit={handleSave}
                onClick={(e) => e.stopPropagation()}
                className="bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto flex flex-col justify-start animate-in zoom-in-95 duration-200"
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/60 sticky top-0 bg-zinc-900 z-10">
                    <span className="text-base font-bold tracking-tight text-zinc-100">Edit Product</span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-zinc-400 hover:text-white cursor-pointer transition-colors p-1 hover:bg-zinc-800 rounded-lg"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label htmlFor="edit-name" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                            Name
                        </label>
                        <input
                            type="text"
                            id="edit-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-emerald-500/50 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                            Product Image
                        </label>
                        <ImageUploader
                            inputId={`edit-image-${product.id}`}
                            initialImageUrl={product.imageUrl}
                            onImageSelect={setImageFile}
                        />
                    </div>

                    <div>
                        <label htmlFor="edit-desc" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                            Description
                        </label>
                        <input
                            type="text"
                            id="edit-desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            required
                            className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-emerald-500/50 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200"
                        />
                    </div>

                    <div>
                        <label htmlFor="edit-price" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                            Price (USD)
                        </label>
                        <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">$</span>
                            <input
                                type="number"
                                step="0.01"
                                id="edit-price"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                required
                                className="w-full pl-8 pr-3.5 py-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-emerald-500/50 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="edit-autopost" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                            Autopost
                        </label>
                        <select
                            id="edit-autopost"
                            value={autopost}
                            onChange={(e) => setAutopost(e.target.value)}
                            className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-emerald-500/50 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200"
                        >
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="edit-category" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                            Category
                        </label>
                        <select
                            id="edit-category"
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

                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800/60 sticky bottom-0 bg-zinc-900 z-10">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800/30 hover:bg-zinc-800 rounded-lg border border-zinc-700/50 hover:border-zinc-600/50 transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="px-4 py-2 text-sm font-semibold text-zinc-950 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-700 disabled:text-zinc-500 rounded-lg shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                    >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default ProductEditModal;
