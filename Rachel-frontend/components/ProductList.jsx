import { useState, useEffect } from 'react';
import axios from 'axios';
import Product from '../components/Product';
import SearchBar from './SearchBar';

function ProductList({ refreshTrigger }) {
    const [products, setProducts] = useState([]);
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const fetchProducts = async () => {
        setIsLoading(true);
        console.log("Fetching inventory products from local DB...");
        try {
            const response = await axios.get('http://localhost:3000/api/db/products');
            console.log("products fetched successfully:", response.data);
            
            if (response.data && Array.isArray(response.data)) {
                const mapped = response.data.map(item => ({
                    id: item.id,
                    name: item.name || 'Unnamed product',
                    description: item.description || '',
                    category: item.category || 'unknown',
                    price: `$${parseFloat(item.price || 0).toFixed(2)}`,
                    rawPrice: item.price,
                    autoPost: item.auto_post === 1 || item.auto_post === true,
                    imageUrl: item.image_path ? `http://localhost:3000/api/db/products/${item.id}/image` : null,
                    isReal: true
                }));
                setProducts(mapped);
            }
        } catch (error) {
            console.error("Failed to fetch products from local DB:", error.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, [refreshTrigger]);

    // Handle single item deletion in local state
    const handleDeleteProduct = (deletedId) => {
        setProducts(prev => prev.filter(p => p.id !== deletedId));
    };

    // Filter logic
    const filteredProducts = products.filter(p => 
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
                        {products.length} {products.length > 0 ? 'Live' : 'Empty'}
                    </span>
                </div>
            </div>

            {/* Filter Search Bar */}
            <SearchBar value={search} onChange={(e) => setSearch(e.target.value)} />

            {/* Products List Container */}
            <div className="flex flex-col gap-3.5 mt-4">
                {products.length === 0 ? (
                    <div className="text-center py-8 text-sm text-zinc-500">
                        No products in inventory. Create a product above!
                    </div>
                ) : filteredProducts.length > 0 ? (
                    filteredProducts.map(p => (
                        <Product 
                            key={p.id}
                            id={p.id}
                            product={p.name}
                            description={p.description}
                            category={p.category}
                            price={p.price}
                            rawPrice={p.rawPrice}
                            autoPost={p.autoPost}
                            imageUrl={p.imageUrl}
                            isReal={p.isReal}
                            onDelete={handleDeleteProduct}
                            onPost={fetchProducts}
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
                onClick={fetchProducts}
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