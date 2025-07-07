import * as React from 'react';
import Button from '@mui/material/Button';
import Product from '../components/Product';
import SearchBar from '../components/SearchBar';


function Content() {
    
    return(
        <>
        {/*Este es el jesucristo de todo el content, si este div se borra todo vale verga*/}
        <div className="min-h-screen h-full w-full flex items-center justify-center-safe bg-[#282424] space-x-48  px-8">
            {/*Partes que necesito hacer
            1. Apartado de Postear Listings XXX
            2. Apartado para purgear listings XXX
            3. Apartado para crear e importar productos
            4. Lista de todos los productos creados
            */}
        
            <div className="flex flex-col flex-1 max-h-[80vh] rounded-md h-fit w-100 bg-gray-600 text-gray-300 p-4">
                {/*Apartado para postear listings*/}
                <h2 className="font-bold text-4xl text-center"> Post Listings </h2>
                <p className="text-center mt-3">Creating a new listing every minute and removing listings older than 1 day.</p>
                <div className="flex justify-center space-x-32 mt-4">
                    <p>Posted</p>
                    <p>Purged</p>
                </div>
                <div className="flex justify-center space-x-38">
                    <p>169</p>
                    <p>169</p>
                </div>

                <button className="h-fit w-full border-red-500 border-2 rounded-sm mt-3 hover:bg-red-500 duration-200">
                    <p className="text-xl">Stop Posting</p>
                </button>

                {/*Apartado para purgear listings*/}
                <h2 className="font-bold text-4xl text-center my-4"> Purge Listings </h2>

                <button className="h-full w-full border-red-500 border-2 rounded-sm mt-3 hover:bg-red-500 duration-200">
                    <p className="text-xl">Remove Expired </p>
                </button>
                <button className="h-full w-full border-red-500 border-2 rounded-sm mt-3 hover:bg-red-500 duration-200">
                    <p className="text-xl">Remove All</p>
                </button>
                
            </div>
        
            <div className="flex flex-col flex-1 max-h-[80vh] overflow-y-auto rounded-md space-y-4 h-fit w-100 bg-gray-600 text-gray-300 p-4">
                {/*Apartado para crear e importar productos*/}

                <button className="h-full w-full border-green-500 border-2 rounded-sm mt-3 hover:bg-green-500 duration-200">
                    <p className="text-xl">Create Product</p>
                </button>
                <button className="h-full w-full border-green-500 border-2 rounded-sm mt-3 hover:bg-green-500 duration-200">
                    <p className="text-xl">Import Product</p>
                </button>
                
                <SearchBar/>
                
            </div>
            

            <div className="flex flex-col flex-1 max-h-[80vh] rounded-md h-fit w-100 bg-gray-600 text-gray-300 p-4">
                <h2 className="font-bold text-4xl text-center mb-4">Productos</h2>
                <div className="grid grid-cols-1 gap-4">
                    <Product product="PlaceHolder 1"/>
                    <Product product="PlaceHolder 2"/>
                    <Product product="PlaceHolder 3"/>
                    <Product product="PlaceHolder 4"/>
                    <Product product="PlaceHolder 5"/>
                    <Product product="PlaceHolder 6"/>
                    <Product product="PlaceHolder 7"/>
                    <Product product="PlaceHolder 8"/>
                    <Product product="PlaceHolder 9"/>
                    <Product product="PlaceHolder 10"/>
                </div>
            </div>
        </div>
        </>
    );
}

export default Content
