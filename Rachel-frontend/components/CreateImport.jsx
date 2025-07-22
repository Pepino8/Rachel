import { useState } from 'react'

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
                    {/*Popup insano para crear listings*/}
                    <div className="fixed inset-0 flex items-center justify-center z-50">
                        <div className="bg-white text-black p-6 rounded-lg shadow-lg w-80 text-center">
                            <p>Popup</p>
                            <button
                                onClick={() => setCreate(!create)}
                                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                            >
                            Cerrar?
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default CreateImport