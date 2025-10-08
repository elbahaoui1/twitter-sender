import React, { useState } from "react";
import { Send, Plus, X, MessageSquare, Loader } from "lucide-react";
import { ImageUploader } from "./image-uploader";

interface ThreadComposerProps {
	currentUser: {
		id: string;
		name: string;
		twitterUsername?: string;
	} | null;
	onThreadSuccess: () => void;
}

interface ThreadTweet {
	id: string;
	text: string;
	image: File | null;
	isPosted: boolean;
	tweetId?: string;
}

export function ThreadComposer({
	currentUser,
	onThreadSuccess,
}: ThreadComposerProps) {
	const [threadTweets, setThreadTweets] = useState<ThreadTweet[]>([
		{ id: "1", text: "", image: null, isPosted: false },
	]);
	const [isPosting, setIsPosting] = useState(false);
	const [error, setError] = useState("");
	const [successMessage, setSuccessMessage] = useState("");

	const addTweetToThread = () => {
		const newTweet: ThreadTweet = {
			id: Date.now().toString(),
			text: "",
			image: null,
			isPosted: false,
		};
		setThreadTweets([...threadTweets, newTweet]);
	};

	const removeTweetFromThread = (id: string) => {
		if (threadTweets.length > 1) {
			setThreadTweets(threadTweets.filter((tweet) => tweet.id !== id));
		}
	};

	const updateTweetText = (id: string, text: string) => {
		setThreadTweets(
			threadTweets.map((tweet) =>
				tweet.id === id ? { ...tweet, text } : tweet,
			),
		);
	};

	const updateTweetImage = (id: string, image: File | null) => {
		setThreadTweets(
			threadTweets.map((tweet) =>
				tweet.id === id ? { ...tweet, image } : tweet,
			),
		);
	};

	const postThread = async () => {
		if (!currentUser?.id) {
			setError("No user selected");
			return;
		}

		const validTweets = threadTweets.filter(
			(tweet) => tweet.text.trim().length > 0 || tweet.image !== null,
		);

		if (validTweets.length === 0) {
			setError(
				"Please add at least one tweet with text or image to the thread",
			);
			return;
		}

		setIsPosting(true);
		setError("");
		setSuccessMessage("");

		try {
			let lastTweetId: string | null = null;

			for (let i = 0; i < validTweets.length; i++) {
				const tweet = validTweets[i];

				// Create FormData for the request
				const formData = new FormData();
				formData.append("text", tweet.text.trim());
				formData.append("userId", currentUser.id);
				if (lastTweetId) {
					formData.append("replyToTweetId", lastTweetId);
				}
				if (tweet.image) {
					formData.append("image", tweet.image);
				}

				const response = await fetch("/api/twitter/tweet", {
					method: "POST",
					body: formData,
				});

				const data = await response.json();

				if (response.ok) {
					lastTweetId = data.data.id;
					setThreadTweets((prev) =>
						prev.map((t) =>
							t.id === tweet.id
								? { ...t, isPosted: true, tweetId: data.data.id }
								: t,
						),
					);
				} else {
					throw new Error(data.error || `Failed to post tweet ${i + 1}`);
				}

				// Add a small delay between tweets to avoid rate limiting
				if (i < validTweets.length - 1) {
					await new Promise((resolve) => setTimeout(resolve, 1000));
				}
			}

			setSuccessMessage(
				`Thread posted successfully! ${validTweets.length} tweets published.`,
			);
			onThreadSuccess();

			// Reset form after success
			setTimeout(() => {
				setThreadTweets([
					{ id: Date.now().toString(), text: "", image: null, isPosted: false },
				]);
				setSuccessMessage("");
			}, 3000);
		} catch (err: any) {
			setError(err.message || "Failed to post thread");
		} finally {
			setIsPosting(false);
		}
	};

	if (!currentUser) {
		return (
			<div className="bg-white rounded-xl shadow-lg p-6">
				<h3 className="text-lg font-semibold text-gray-900 mb-4">
					Create Thread
				</h3>
				<div className="text-center py-8 text-gray-500">
					<MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
					<p>Please select a user to create threads</p>
				</div>
			</div>
		);
	}

	return (
		<div className="bg-white rounded-xl shadow-lg p-6">
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center">
					<MessageSquare className="w-6 h-6 text-blue-500 mr-2" />
					<h3 className="text-lg font-semibold text-gray-900">Create Thread</h3>
				</div>
				<div className="text-sm text-gray-500">
					@{currentUser.twitterUsername ?? "unknown"}
				</div>
			</div>

			{error && (
				<div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
					<div className="flex items-center">
						<span className="text-red-500 mr-2">!</span>
						<span className="text-red-700">{error}</span>
					</div>
				</div>
			)}

			{successMessage && (
				<div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
					<div className="flex items-center">
						<span className="text-green-500 mr-2">✅</span>
						<span className="text-green-700">{successMessage}</span>
					</div>
				</div>
			)}

			<div className="space-y-4 max-h-96 overflow-y-auto">
				{threadTweets.map((tweet, index) => (
					<div
						key={tweet.id}
						className={`border rounded-lg p-4 ${
							tweet.isPosted
								? "bg-green-50 border-green-200"
								: "border-gray-200"
						}`}
					>
						<div className="flex items-center justify-between mb-2">
							<div className="flex items-center text-sm text-gray-600">
								<span className="font-medium">Tweet {index + 1}</span>
								{tweet.isPosted && (
									<span className="ml-2 text-green-600 font-medium">
										✓ Posted
									</span>
								)}
								{index > 0 && !tweet.isPosted && (
									<span className="ml-2 text-blue-600">
										↳ Reply to Tweet {index}
									</span>
								)}
							</div>
							{threadTweets.length > 1 && !tweet.isPosted && (
								<button
									onClick={() => removeTweetFromThread(tweet.id)}
									className="text-red-500 hover:text-red-700 p-1 rounded"
									title="Remove tweet"
								>
									<X className="w-4 h-4" />
								</button>
							)}
						</div>

						<textarea
							value={tweet.text}
							onChange={(e) => updateTweetText(tweet.id, e.target.value)}
							placeholder={
								index === 0 ? "Start your thread..." : "Continue your thread..."
							}
							className={`w-full h-24 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
								tweet.isPosted
									? "bg-gray-100 text-black  cursor-not-allowed"
									: "border-gray-300 text-black"
							}`}
							maxLength={280}
							disabled={tweet.isPosted || isPosting}
						/>

						{/* Image Upload for each tweet */}
						{/* {!tweet.isPosted && ( */}
						{/* 	<div className="mt-3"> */}
						{/* 		<ImageUploader */}
						{/* 			onImageSelect={(file) => updateTweetImage(tweet.id, file)} */}
						{/* 		/> */}
						{/* 	</div> */}
						{/* )} */}

						<div className="flex items-center justify-between mt-2">
							<div className="flex items-center space-x-3">
								<span
									className={`text-sm ${
										tweet.text.length > 260 ? "text-red-500" : "text-gray-500"
									}`}
								>
									{tweet.text.length}/280 characters
								</span>
								{tweet.image && (
									<span className="text-sm text-blue-600">
										📷 Image attached
									</span>
								)}
							</div>
							{tweet.tweetId && (
								<span className="text-xs text-gray-400 font-mono">
									ID: {tweet.tweetId}
								</span>
							)}
						</div>
					</div>
				))}
			</div>

			<div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
				<button
					onClick={addTweetToThread}
					disabled={isPosting}
					className="inline-flex items-center px-4 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 disabled:opacity-50 transition-colors"
				>
					<Plus className="w-4 h-4 mr-2" />
					Add Tweet
				</button>

				<div className="flex items-center space-x-3">
					<span className="text-sm text-gray-600">
						{
							threadTweets.filter(
								(t) => t.text.trim().length > 0 || t.image !== null,
							).length
						}{" "}
						tweets ready
					</span>
					<button
						onClick={postThread}
						disabled={
							isPosting ||
							threadTweets.filter(
								(t) => t.text.trim().length > 0 || t.image !== null,
							).length === 0 ||
							threadTweets.some((t) => t.text.length > 280)
						}
						className="inline-flex items-center px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						{isPosting ? (
							<Loader className="w-4 h-4 mr-2 animate-spin" />
						) : (
							<Send className="w-4 h-4 mr-2" />
						)}
						{isPosting ? "Posting Thread..." : "Post Thread"}
					</button>
				</div>
			</div>

			<div className="mt-4 text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
				<div className="flex items-start">
					<span className="mr-2">💡</span>
					<div>
						<strong>Thread Tips:</strong> Each tweet after the first will
						automatically reply to the previous one, creating a connected
						thread. Add multiple tweets to tell your story in sequence. You can
						include one image per tweet!
					</div>
				</div>
			</div>
		</div>
	);
}
