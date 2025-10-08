import React, { useState, useEffect } from "react";

interface Tweet {
	id: string;
	text: string;
	created_at: string;
	public_metrics: {
		retweet_count: number;
		like_count: number;
		reply_count: number;
		quote_count: number;
	};
}

interface TweetTimelineProps {
	currentUser: {
		id: string;
		name: string;
		twitterUsername: string;
	} | null;
}

export function TweetTimeline({ currentUser }: TweetTimelineProps) {
	const [tweets, setTweets] = useState<Tweet[]>([]);
	const [loading, setLoading] = useState(false);
	const [deletingTweetId, setDeletingTweetId] = useState<string | null>(null);
	const [error, setError] = useState("");

	const fetchTweets = async () => {
		if (!currentUser?.id) return;

		setLoading(true);
		setError("");

		try {
			const response = await fetch(
				`/api/twitter/timeline?userId=${currentUser.id}`,
			);
			const data = await response.json();

			if (response.ok) {
				setTweets(data.data || []);
			} else {
				setError(data.error || "Failed to fetch tweets");
			}
		} catch (err) {
			setError("Network error occurred");
		} finally {
			setLoading(false);
		}
	};

	const deleteTweet = async (tweetId: string) => {
		if (!currentUser?.id) return;

		setDeletingTweetId(tweetId);
		setError("");

		try {
			const response = await fetch("/api/twitter/tweet/delete", {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					tweetId,
					userId: currentUser.id,
				}),
			});

			const data = await response.json();

			if (response.ok) {
				// Remove the deleted tweet from the list
				setTweets((prev) => prev.filter((tweet) => tweet.id !== tweetId));
				setError("");
			} else {
				setError(data.error || "Failed to delete tweet");
			}
		} catch (err) {
			setError("Network error occurred");
		} finally {
			setDeletingTweetId(null);
		}
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const formatNumber = (num: number) => {
		if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
		if (num >= 1000) return (num / 1000).toFixed(1) + "K";
		return num.toString();
	};

	useEffect(() => {
		if (currentUser) {
			fetchTweets();
		}
	}, [currentUser]);

	if (!currentUser) {
		return (
			<div className="bg-white rounded-xl shadow-lg p-6">
				<h3 className="text-lg font-semibold text-gray-900 mb-4">
					Your Tweets
				</h3>
				<div className="text-center py-8 text-gray-500">
					<div className="w-12 h-12 mx-auto mb-3 text-gray-300">💬</div>
					<p>Please select a user to view their tweets</p>
				</div>
			</div>
		);
	}

	return (
		<div className="bg-white rounded-xl shadow-lg p-6">
			<div className="flex items-center justify-between mb-6">
				<h3 className="text-lg font-semibold text-gray-900">
					@{currentUser.twitterUsername}'s Tweets
				</h3>
				<button
					onClick={fetchTweets}
					disabled={loading}
					className="inline-flex items-center px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50"
				>
					{loading ? "🔄" : "🔄"} Refresh
				</button>
			</div>

			{error && (
				<div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
					<div className="flex items-center">
						<span className="text-red-500 mr-2">!</span>
						<span className="text-red-700">{error}</span>
					</div>
				</div>
			)}

			{loading && tweets.length === 0 ? (
				<div className="text-center py-8">
					<div className="text-4xl mb-4 animate-spin">⏳</div>
					<p className="text-gray-600">Loading tweets...</p>
				</div>
			) : tweets.length === 0 ? (
				<div className="text-center py-8 text-gray-500">
					<div className="text-4xl mb-3">💬</div>
					<p>No tweets found</p>
				</div>
			) : (
				<div className="space-y-4 max-h-96 overflow-y-auto">
					{tweets.map((tweet) => (
						<div
							key={tweet.id}
							className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
						>
							<div className="flex justify-between items-start mb-2">
								<div className="flex items-center text-sm text-gray-500">
									<span className="mr-1">📅</span>
									{formatDate(tweet.created_at)}
								</div>
								<button
									onClick={() => deleteTweet(tweet.id)}
									disabled={deletingTweetId === tweet.id}
									className="inline-flex items-center px-2 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
									title="Delete tweet"
								>
									{deletingTweetId === tweet.id ? "⏳" : "🗑"}
								</button>
							</div>

							<p className="text-gray-900 mb-3 leading-relaxed">{tweet.text}</p>

							<div className="flex items-center space-x-6 text-sm text-gray-500">
								<div className="flex items-center">
									<span className="mr-1">💬</span>
									{formatNumber(tweet.public_metrics?.reply_count || 0)}
								</div>
								<div className="flex items-center">
									<span className="mr-1">🔄</span>
									{formatNumber(tweet.public_metrics?.retweet_count || 0)}
								</div>
								<div className="flex items-center">
									<span className="mr-1">❤</span>
									{formatNumber(tweet.public_metrics?.like_count || 0)}
								</div>
							</div>

							<div className="mt-2 text-xs text-gray-400 font-mono">
								ID: {tweet.id}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
