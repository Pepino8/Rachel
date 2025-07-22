import { useState } from "react";

function ImageUploader() {
    const [image, setImage] = useState(null);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
        const imageUrl = URL.createObjectURL(file);
        setImage(imageUrl);
        }
    };

    return (
        <div className="text-gray-300 p-4 rounded-lg max-w-sm">
            <label className="block mb-2 font-semibold">Image</label>

            <div className="border border-gray-600 rounded-lg overflow-hidden w-48">
                {image ? (
                    <img
                        src={image}
                        alt="Preview"
                        className="w-full h-48 object-cover"
                    />
                    ) : (
                    <div className="w-full h-48 bg-gray-700 flex items-center justify-center text-sm text-gray-400">
                        No image selected
                    </div>
                    )}

                    <label
                        htmlFor="fileInput"
                        className="block text-center bg-gray-700 hover:bg-gray-600 py-2 cursor-pointer"
                        >
                        Select Image
                    </label>
                    <input
                        id="fileInput"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                    />
            </div>
        </div>
    );
}

export default ImageUploader;
