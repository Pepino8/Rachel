import { useState } from 'react'
import ImageUploader from './ImageUploader';

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
                    {/*No supe como hacerlo un componente distinto, se me hacia un cagadero */}
                    <div className="fixed inset-0 flex items-center justify-center z-50">
                        <div className="bg-[#282424] text-black p-6 rounded-lg shadow-lg w-80 text-center">
                            {/*Cagadero para crear listings (tomar como inspiracion autoflipper)*/}
                            <div className="w-full h-fit bg-green-500 text-center rounded-sm">
                                <span>Create Product</span>
                            </div>

                            <div class="p-6 max-w-md mx-auto">
                                <div class="mb-4">
                                    <label for="nombre" className="block text-gray-300 font-semibold mb-2">Name: </label>
                                    <input type="text" id="nombre" name="nombre"
                                    class="w-full px-4 py-2 border border-gray-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                                </div>

                                <ImageUploader/>

                                {/*Copiar Y pegar este div para agregar mas cosas necesarias para la creacion de productos*/}

                                <div class="mb-4">
                                    <label for="desc" className="block text-gray-300 font-semibold mb-2">Description: </label>
                                    <input type="text" id="desc" name="desc"
                                    class="w-full px-4 py-2 border border-gray-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"/>
                                </div>
                                
                                <div class="mb-4">
                                    <label for="price" className="block text-gray-300 font-semibold mb-2">Price (USD) </label>
                                    <input type="text" id="price" name="price"
                                    class="w-full px-4 py-2 border border-gray-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"/>
                                </div>

                                <div class="mb-4">
                                    <label for="autopost" className="block text-gray-300 font-semibold mb-2">Autopost </label>
                                    <select type="text" id="autopost" name="autopost"
                                    class="w-full px-4 py-2 border border-gray-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                                        <option value="yes">Yes</option>
                                        <option value="no">No</option>
                                    </select>
                                </div>

                                <div class="mb-4">
                                    <label for="category" className="block text-gray-300 font-semibold mb-2">Category </label>
                                    <select type="text" id="category" name="category"
                                    class="w-full px-4 py-2 border border-gray-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                                        <option value="ingame-item">Ingame-item</option>
                                        <option value="video-dvd">Video-dvd</option>
                                        <option value="video-game-console">Video-game-console</option>
                                        <option value="unknown">Unknown</option>
                                        <option value="giftcard">Giftcard</option>
                                    </select>
                                </div>

                                <div class="mb-4">
                                    <label for="autopost" className="block text-gray-300 font-semibold mb-2">Autopost </label>
                                    <select type="text" id="autopost" name="autopost"
                                    class="w-full px-4 py-2 border border-gray-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                                        <option value="yes">Yes</option>
                                        <option value="no">No</option>
                                    </select>
                                </div>
                                
                            </div>
                            





                            <button
                                onClick={() => setCreate(!create)}
                                className="mx-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                            >
                            Cancel
                            </button>
                            <button
                                onClick={() => setCreate(!create)}
                                className="mx-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                            >
                            Create
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default CreateImport