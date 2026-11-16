import { useEffect, useState, useRef, useId } from "react";

function ImageUploader({
    onImagesChange,
    onImageSelect,
    initialImages,
    initialImageUrl,
    maxImages = 4,
    inputId
}) {
    const reactId = useId();
    const actualInputId = inputId || `file-input-${reactId.replace(/:/g, '')}`;
    const fileInputRef = useRef(null);

    // Initialize state once from props
    const [images, setImages] = useState(() => {
        const init = Array.isArray(initialImages) && initialImages.length > 0
            ? initialImages
            : (initialImageUrl ? [initialImageUrl] : []);
        return init.map((url, i) => ({
            id: `init_${i}_${url}`,
            file: null,
            preview: url,
            url
        }));
    });

    // Reference to avoid wiping out user state when parent re-renders with new array references
    const lastSyncedKeyRef = useRef(
        JSON.stringify(Array.isArray(initialImages) ? initialImages : (initialImageUrl ? [initialImageUrl] : []))
    );

    // Only sync if the incoming initialImages/initialImageUrl prop meaningfully changed
    useEffect(() => {
        const currentKey = JSON.stringify(
            Array.isArray(initialImages) ? initialImages : (initialImageUrl ? [initialImageUrl] : [])
        );

        if (currentKey !== lastSyncedKeyRef.current) {
            lastSyncedKeyRef.current = currentKey;
            const init = Array.isArray(initialImages) && initialImages.length > 0
                ? initialImages
                : (initialImageUrl ? [initialImageUrl] : []);
            setImages(init.map((url, i) => ({
                id: `init_${i}_${url}`,
                file: null,
                preview: url,
                url
            })));
        }
    }, [initialImages, initialImageUrl]);

    // Cleanup object URLs on unmount
    useEffect(() => {
        return () => {
            images.forEach(img => {
                if (img.preview && img.preview.startsWith('blob:')) {
                    URL.revokeObjectURL(img.preview);
                }
            });
        };
    }, []);

    const notifyChange = (updated) => {
        onImagesChange?.(updated);
        const firstFile = updated.find(img => img.file)?.file;
        onImageSelect?.(firstFile || null);
    };

    const handleFilesAdded = (e) => {
        const fileList = e.target.files;
        if (!fileList || fileList.length === 0) return;
        const files = Array.from(fileList);

        const availableSlots = maxImages - images.length;
        if (availableSlots <= 0) return;

        const filesToAdd = files.slice(0, availableSlots);
        const newItems = filesToAdd.map(file => ({
            id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            file,
            preview: URL.createObjectURL(file),
            url: null
        }));

        const updated = [...images, ...newItems];
        setImages(updated);
        notifyChange(updated);

        // Reset input value so same files can be chosen again if desired
        if (e.target) e.target.value = '';
    };

    const handleRemove = (index, e) => {
        e.stopPropagation();
        e.preventDefault();
        const removed = images[index];
        if (removed.preview && removed.preview.startsWith('blob:')) {
            URL.revokeObjectURL(removed.preview);
        }
        const updated = images.filter((_, i) => i !== index);
        setImages(updated);
        notifyChange(updated);
    };

    const handleMakeCover = (index, e) => {
        e.stopPropagation();
        e.preventDefault();
        if (index === 0) return;
        const target = images[index];
        const remaining = images.filter((_, i) => i !== index);
        const updated = [target, ...remaining];
        setImages(updated);
        notifyChange(updated);
    };

    return (
        <div className="w-full text-zinc-300">
            {images.length > 0 ? (
                <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span className="font-semibold uppercase tracking-wider text-zinc-400">
                            Product Images ({images.length}/{maxImages})
                        </span>
                        <span className="text-[11px] text-zinc-500">
                            First image is the cover photo
                        </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {images.map((img, idx) => (
                            <div
                                key={img.id}
                                className={`relative group rounded-xl overflow-hidden aspect-square border transition-all duration-200 bg-zinc-950 flex items-center justify-center ${
                                    idx === 0
                                        ? 'border-emerald-500/80 ring-2 ring-emerald-500/20 shadow-md shadow-emerald-500/10'
                                        : 'border-zinc-800 hover:border-zinc-700'
                                }`}
                            >
                                <img
                                    src={img.preview}
                                    alt={`Product ${idx + 1}`}
                                    className="w-full h-full object-contain p-1"
                                />

                                {/* Cover Badge */}
                                {idx === 0 && (
                                    <div className="absolute top-1.5 left-1.5 bg-emerald-500/90 text-zinc-950 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shadow z-10 pointer-events-none">
                                        Cover
                                    </div>
                                )}

                                {/* Overlay Actions */}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1.5 z-20">
                                    <div className="flex justify-end">
                                        <button
                                            type="button"
                                            onClick={(e) => handleRemove(idx, e)}
                                            className="p-1 rounded-md bg-red-950/90 hover:bg-red-800 text-red-200 hover:text-white transition-colors cursor-pointer"
                                            title="Remove image"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>

                                    {idx !== 0 && (
                                        <button
                                            type="button"
                                            onClick={(e) => handleMakeCover(idx, e)}
                                            className="w-full py-1 px-1.5 rounded-md bg-zinc-900/90 hover:bg-emerald-600 text-[10px] font-bold text-zinc-200 hover:text-white transition-colors cursor-pointer text-center"
                                        >
                                            Make Cover
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Add More button if under max */}
                        {images.length < maxImages && (
                            <label
                                htmlFor={actualInputId}
                                className="border-2 border-dashed border-zinc-800 hover:border-emerald-500/60 hover:bg-emerald-500/5 rounded-xl aspect-square flex flex-col items-center justify-center gap-1 cursor-pointer transition-all duration-200 text-zinc-500 hover:text-emerald-400"
                                title="Add another image"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                                <span className="text-[10px] font-semibold">Add Image</span>
                            </label>
                        )}
                    </div>
                </div>
            ) : (
                <label
                    htmlFor={actualInputId}
                    className="relative border-2 border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-950 rounded-xl overflow-hidden min-h-[140px] flex flex-col items-center justify-center p-4 transition-colors duration-200 cursor-pointer w-full block text-center"
                >
                    <svg className="w-8 h-8 text-zinc-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                    <div className="text-xs font-semibold text-zinc-400">Click to upload product images</div>
                    <p className="text-[10px] text-zinc-600 mt-0.5">Supports PNG, JPG, or WEBP (up to {maxImages} images)</p>
                </label>
            )}

            <input
                id={actualInputId}
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFilesAdded}
            />
        </div>
    );
}

export default ImageUploader;
