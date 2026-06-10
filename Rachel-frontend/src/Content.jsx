import CreateImport from '../components/CreateImport';
import PostListings from '../components/PostListings';
import ProductList from '../components/ProductList';
import PurgeListings from '../components/PurgeListings';

function Content() {
    return(
        <>
            {/*Este es el jesucristo de todo el content, si este div se borra todo vale verga*/}
            <div className="min-h-[calc(100vh-4rem)] w-full flex flex-col lg:flex-row items-start justify-center bg-zinc-950 gap-8 lg:gap-16 px-4 py-8 sm:px-6 lg:px-8">
                {/*Columna izquierda*/}
                <div className="w-full lg:w-1/2 max-w-lg flex flex-col gap-6">
                    <PostListings/>
                    <PurgeListings/>
                </div>
                
                {/*Columna derecha*/}
                <div className="w-full lg:w-1/2 max-w-lg flex flex-col gap-6">
                    <CreateImport/>
                    <ProductList/>
                </div>
            </div>
        </>
    );
}

export default Content
