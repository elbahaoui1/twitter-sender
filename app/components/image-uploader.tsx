import { useState } from "react";
import { Upload, X } from "lucide-react";

interface ImageUploaderProps {
	onImageSelect: (file: File | null) => void;
}

export function ImageUploader({ onImageSelect }: ImageUploaderProps) {
	const [imagePreview, setImagePreview] = useState<string | null>(null);
	const [file, setFile] = useState<File | null>(null);

	const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			setFile(file);
			const reader = new FileReader();
			reader.onloadend = () => {
				setImagePreview(reader.result as string);
			};
			reader.readAsDataURL(file);
			onImageSelect(file);
		}
	};

	const removeImage = () => {
		setImagePreview(null);
		setFile(null);
		onImageSelect(null);
	};

	return (
		<div>
			<div className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-10">
				<div className="text-center">
					{imagePreview ? (
						<div className="relative">
							<img
								src={imagePreview}
								alt="Image preview"
								className="mx-auto h-40 w-auto rounded-lg"
							/>
							<button
								onClick={removeImage}
								className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-full"
							>
								<X className="h-4 w-4" />
							</button>
						</div>
					) : (
						<>
							<Upload className="mx-auto h-12 w-12 text-gray-300" />
							<div className="mt-4 flex text-sm leading-6 text-gray-600">
								<label
									htmlFor="file-upload"
									className="relative cursor-pointer rounded-md bg-white font-semibold text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 hover:text-indigo-500"
								>
									<span>Upload a file</span>
									<input
										id="file-upload"
										name="file-upload"
										type="file"
										className="sr-only"
										onChange={handleImageChange}
										accept="image/*"
									/>
								</label>
								<p className="pl-1">or drag and drop</p>
							</div>
							<p className="text-xs leading-5 text-gray-600">
								PNG, JPG, GIF up to 10MB
							</p>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
