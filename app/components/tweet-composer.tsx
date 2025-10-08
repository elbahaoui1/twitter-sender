import { useState } from "react";
import { Send, Loader } from "lucide-react";
import { ImageUploader } from "./image-uploader";

export function TweetComposer({ currentUser }) {
	const [tweetText, setTweetText] = useState("");
	const [imageFile, setImageFile] = useState<File | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [result, setResult] = useState(null);

	const handleImageSelect = (file: File | null) => {
		setImageFile(file);
	};

	const postTweet = async () => {
		if (!tweetText.trim() && !imageFile) {
			setError("Please enter some text or upload an image.");
			return;
		}

		if (!currentUser?.id) {
			setError("No user selected");
			return;
		}

		setLoading(true);
		setError("");
		setResult(null);

		try {
			let mediaId: string | null = null;
			if (imageFile) {
				const formData = new FormData();
				formData.append("file", imageFile);
				formData.append("userId", currentUser.id);

				const mediaResponse = await fetch("/api/twitter/media/upload", {
					method: "POST",
					body: formData,
				});

				const mediaData = await mediaResponse.json();
				if (!mediaResponse.ok) {
					throw new Error(mediaData.error || "Failed to upload image");
				}
				mediaId = mediaData.media_id_string;
			}

			const tweetResponse = await fetch("/api/twitter/tweet", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					text: tweetText,
					userId: currentUser.id,
					...(mediaId && { mediaIds: [mediaId] }),
				}),
			});

			const tweetData = await tweetResponse.json();
			if (!tweetResponse.ok) {
				throw new Error(tweetData.error || "Failed to post tweet");
			}

			setResult(tweetData);
			setTweetText("");
			setImageFile(null);
		} catch (err: any) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="bg-white rounded-xl shadow-lg p-6">
			<h3 className="text-lg font-semibold text-gray-900 mb-4">Post a Tweet</h3>
			<div className="space-y-4">
				<textarea
					value={tweetText}
					onChange={(e) => setTweetText(e.target.value)}
					placeholder="What's happening?"
					className="w-full text-black h-24 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					maxLength={280}
				/>
				<ImageUploader onImageSelect={handleImageSelect} />
				<div className="flex items-center justify-between">
					<span className="text-sm text-gray-500">
						{tweetText.length}/280 characters
					</span>
					<button
						onClick={postTweet}
						disabled={loading}
						className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						{loading ? (
							<Loader className="w-4 h-4 mr-2 animate-spin" />
						) : (
							<Send className="w-4 h-4 mr-2" />
						)}
						Tweet
					</button>
				</div>
				{error && <p className="text-red-500">{error}</p>}
				{result && <p className="text-green-500">Tweet posted successfully!</p>}
			</div>
		</div>
	);
}
