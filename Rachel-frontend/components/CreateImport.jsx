import { useState } from 'react'
import CreateProduct from './CreateProduct';


function CreateImport() {
    const [create, setCreate] = new useState(false)

    return (
        <div className="flex flex-col flex-1 max-h-[80vh] overflow-y-auto rounded-md space-y-4 h-fit w-100 bg-gray-600 text-gray-300 p-4 my-4">
            <button 
            onClick={() => setCreate(!create)}
            className="h-full w-full border-green-500 border-2 rounded-sm mt-3 hover:bg-green-500 duration-200"
            >
                <p className="text-xl">Create Product</p>
            </button>
            <button className="h-full w-full border-green-500 border-2 rounded-sm mt-3 hover:bg-green-500 duration-200">
                <p className="text-xl">Import Product</p>
            </button>

            {create && (
                <>
                    <CreateProduct/>
                </>
            )}
        </div>
    );
}

export default CreateImport