import { useState, useEffect } from 'react';
import axios from 'axios';
import Product from '../components/Product';
import SearchBar from './SearchBar';

function ProductList() {
    const [products, setProducts] = useState([]);
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Default mock products to show when Gameflip list is empty or fails
    const fallbackProducts = [
        { id: 'mock1', name: 'Retro Gaming Console', category: 'video-game-console', price: '$149.99', isReal: false },
        { id: 'mock2', name: 'Limited DVD Box Set', category: 'video-dvd', price: '$45.00', isReal: false },
        { id: 'mock3', name: 'Premium Gift Card (100 USD)', category: 'giftcard', price: '$100.00', isReal: false }
    ];

    const fetchListings = async () => {
        setIsLoading(true);
        console.log("Fetching active draft/ready listings from Gameflip API...");
        try {
            const response = await axios.get('http://localhost:3000/api/listings');
            console.log("listings fetched successfully:", response.data);
            
            if (response.data && Array.isArray(response.data)) {
                const mapped = response.data.map(item => ({
                    id: item.id || item.listing_id,
                    name: item.name || 'Unnamed listing',
                    category: item.category || 'unknown',
                    price: `$${((item.price || 0) / 100).toFixed(2)}`,
                    isReal: true
                }));
                setProducts(mapped);
            }
        } catch (error) {
            console.error("Failed to fetch listings from backend:", error.message);
            // On error we just keep the empty list so it falls back to mock items
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchListings();
    }, []);

    // Handle single item deletion in local state
    const handleDeleteProduct = (deletedId) => {
        setProducts(prev => prev.filter(p => p.id !== deletedId));
    };

    // Filter logic
    const activeProducts = products.length > 0 ? products : fallbackProducts;
    const filteredProducts = activeProducts.filter(p => 
        p.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md rounded-2xl p-6 shadow-xl shadow-black/20 w-full transition-all duration-300">
            {/* Header Section */}
            <div className="flex items-center justify-between border-b border-zinc-800/60 pb-4 mb-4">
                <div>
                    <h2 className="font-bold text-lg text-zinc-100 tracking-tight">Products</h2>
                    <p className="text-xs text-zinc-500 mt-0.5">Inventory catalogue & listings</p>
                </div>
                <div className="flex items-center gap-2">
                    {isLoading && (
                        <span className="text-[10px] text-zinc-500 animate-pulse">Loading...</span>
                    )}
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/15">
                        {activeProducts.length} {products.length > 0 ? 'Live' : 'Demo'}
                    </span>
                </div>
            </div>

            {/* Filter Search Bar */}
            <SearchBar value={search} onChange={(e) => setSearch(e.target.value)} />

            {/* Products List Container */}
            <div className="flex flex-col gap-3.5 mt-4">
                {filteredProducts.length > 0 ? (
                    filteredProducts.map(p => (
                        <Product 
                            key={p.id}
                            id={p.id}
                            product={p.name}
                            category={p.category}
                            price={p.price}
                            isReal={p.isReal}
                            onDelete={handleDeleteProduct}
                        />
                    ))
                ) : (
                    <div className="text-center py-6 text-sm text-zinc-600">
                        No products match your search.
                    </div>
                )}
            </div>
            
            {/* Refresh Button */}
            <button 
                onClick={fetchListings}
                disabled={isLoading}
                className="w-full mt-4 py-2 bg-zinc-950/40 hover:bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5"
            >
                <svg className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12" />
                </svg>
                Sync with Gameflip
            </button>
        </div>
    );
}

export default ProductList;