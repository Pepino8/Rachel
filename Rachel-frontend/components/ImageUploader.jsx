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
        <div className="w-full text-zinc-300">
            <div className="relative border-2 border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-950 rounded-xl overflow-hidden min-h-[140px] flex flex-col items-center justify-center p-4 transition-colors duration-200">
                {image ? (
                    <div className="w-full flex flex-col items-center gap-3">
                        <div className="relative group rounded-lg overflow-hidden h-28 w-28 border border-zinc-800">
                            <img
                                src={image}
                                alt="Preview"
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <label
                                    htmlFor="fileInput"
                                    className="p-1.5 rounded-lg bg-zinc-900 text-zinc-200 hover:text-white cursor-pointer border border-zinc-700/80 text-xs"
                                >
                                    Change
                                </label>
                            </div>
                        </div>
                        <span className="text-xs text-zinc-500">Image loaded successfully</span>
                    </div>
                ) : (
                    <label
                        htmlFor="fileInput"
                        className="w-full flex flex-col items-center justify-center gap-2 cursor-pointer py-4"
                    >
                        <svg className="w-8 h-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                        </svg>
                        <div className="text-xs font-semibold text-zinc-400">Click to upload image</div>
                        <p className="text-[10px] text-zinc-600">Supports PNG, JPG, or WEBP</p>
                    </label>
                )}

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
