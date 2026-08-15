import { useState } from 'react';
import CreateImport from '../components/CreateImport';
import PostListings from '../components/PostListings';
import ProductList from '../components/ProductList';
import PurgeListings from '../components/PurgeListings';

function Content() {
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

    return(
        <>
            {/* This is the core container of all page content */}
            <div className="min-h-[calc(100vh-4rem)] w-full flex flex-col lg:flex-row items-center lg:items-start justify-center bg-zinc-950 gap-8 lg:gap-16 px-4 py-8 sm:px-6 lg:px-8">
                {/* Left column */}
                <div className="w-full lg:w-1/2 max-w-lg flex flex-col gap-6">
                    <PostListings/>
                    <PurgeListings/>
                </div>
                
                {/* Right column */}
                <div className="w-full lg:w-1/2 max-w-lg flex flex-col gap-6">
                    <CreateImport onProductCreated={triggerRefresh}/>
                    <ProductList refreshTrigger={refreshTrigger}/>
                </div>
            </div>
        </>
    );
}

export default Content
