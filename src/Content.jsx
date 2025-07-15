import CreateImport from '../components/CreateImport';
import PostListings from '../components/PostListings';
import Product from '../components/Product';
import ProductList from '../components/ProductList';
import PurgeListings from '../components/PurgeListings';
import SearchBar from '../components/SearchBar';


function Content() {
    return(
        <>
            {/*Este es el jesucristo de todo el content, si este div se borra todo vale verga*/}
            <div className="min-h-screen h-full w-full flex items-center justify-center-safe bg-[#282424] space-x-48  px-8">
                {/*Columna izquierda*/}
                <div>
                    <PostListings/>
                    <PurgeListings/>
                </div>
                
                {/*Columna derecha*/}
                <div>
                    <CreateImport/>
                    <ProductList/>
                </div>
                
            </div>
        </>
    );
}

export default Content
