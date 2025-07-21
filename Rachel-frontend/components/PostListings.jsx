import { useState } from "react";

function PostListings(){

    const [isPressed, setIsPressed] = new useState(false);

    return (
        <div className="flex flex-col flex-1 max-h-[80vh] rounded-md h-fit w-100 bg-gray-600 text-gray-300 p-4">
            {/*Apartado para postear listings*/}
            <h2 className="font-bold text-4xl text-center"> Post Listings </h2>
            <p className="text-center my-3">
                {isPressed ? `Creating a new listing every minute and removing listings older than 1 day.` : 
                `Creates a new listing every minute and removes listings older than 1 day.` }
            </p>   

            {isPressed && (
                <>
                    <div className="flex justify-center space-x-32 mt-4">
                        <p>Posted</p>
                        <p>Purged</p>
                    </div>

                    <div className="flex justify-center space-x-38">
                        {/*Hacer que cambie de manera automatica */}
                        <p>100</p>
                        <p>100</p>
                    </div>
                </>
            )}
                
            <button
                onClick={() => setIsPressed(!isPressed)}
                className={`h-fit w-full border-2 rounded-sm mt-3 duration-200
                    ${
                        isPressed ? 'border-red-500 hover:bg-red-500' : 'border-green-500 hover:bg-green-500'
                    }`}
            >
                <p className="text-xl">{isPressed ? 'Stop Posting' : 'Auto Post Listings'}</p>
            </button>                        
        </div>
    );
}

export default PostListings