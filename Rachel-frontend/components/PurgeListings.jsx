import { useState } from "react";
function PurgeListings(){
    const [removeExpired, setExpired] = new useState(false);
    const [removeAll, setAll] = new useState(false);
    
        return (
            <div className="flex flex-col flex-1 max-h-[80vh] rounded-md h-fit w-100 bg-gray-600 text-gray-300 p-4 my-4">
                {/*Apartado para purgear listings*/}
                <h2 className="font-bold text-4xl text-center my-3"> Purge Listings </h2>   
                
            {removeExpired && (
                <>
                    <div className="flex justify-center space-x-32 mt-4">
                        <p>Purged</p>
                    </div>

                    <div className="flex justify-center space-x-38">
                        {/*Hacer que cambie de manera automatica */}
                        <p>100</p>
                    </div>
                </>
            )}

            {removeAll && (
                <>
                    <div className="flex justify-center space-x-32 mt-4">
                        <p>Purged</p>
                    </div>

                    <div className="flex justify-center space-x-38">
                        {/*Hacer que cambie de manera automatica */}
                        <p>100</p>
                    </div>
                </>
            )}


                <button
                    onClick={() => setExpired(!removeExpired)}
                    className={`h-fit w-full border-2 rounded-sm mt-3 duration-200
                        ${
                                removeExpired ? 'border-red-500 hover:bg-red-500' : 'border-green-500 hover:bg-green-500'
                        }`}
                >
                    <p className="text-xl">{removeExpired ? 'Stop Purging' : 'Remove Expired'}</p>
                </button> 

                <button
                    onClick={() => setAll(!removeAll)}
                    className={`h-fit w-full border-2 rounded-sm mt-3 duration-200
                        ${
                                removeAll ? 'border-red-500 hover:bg-red-500' : 'border-green-500 hover:bg-green-500'
                        }`}
                >
                    <p className="text-xl">{removeAll ? 'Stop Purging' : 'Remove All'}</p>
                </button>
                      
            </div>
        );
    
}

export default PurgeListings