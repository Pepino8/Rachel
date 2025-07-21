

function CreateProduct({message, onClose}){
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white text-black p-6 rounded-lg shadow-lg w-80 text-center">
        <p>{message}</p>
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Cerrar
        </button>
      </div>
    </div>
    )
}

export default CreateProduct