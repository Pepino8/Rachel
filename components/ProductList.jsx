import Product from '../components/Product';
import SearchBar from './SearchBar';

function ProductList(){
    return(
        <div className="flex flex-col flex-1 rounded-md h-fit w-100 bg-gray-600 text-gray-300 p-4">
            <h2 className="font-bold text-4xl text-center mb-4">Productos</h2>
            {/*Hacer una filter search para q se vea guapo*/}
            <SearchBar/>
            <div className="grid grid-cols-1 gap-4 m-4">
                {/*Hacer que se haga de manera automatica con el backend aca bien insano y q lo saque d la base d datos d postgresSQL*/}
                <Product product="PlaceHolder"/>
                <Product product="PlaceHolder"/>
                <Product product="PlaceHolder"/>
            </div>
        </div>
    );
}

export default ProductList