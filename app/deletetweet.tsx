import { FormEvent, useState } from "react";

interface UserSummary {
	id: string;
	name: string | null;
	email: string;
	twitterUsername?: string | null;
	twitterUserId?: string | null;
	twitterAccessToken?: string | null;
	twitterTokenExpiry?: string | null;
	hasValidToken?: boolean;
	tokenExpired?: boolean;
}

interface DeleteTweetSectionProps {
	currentUser: UserSummary | null;
	onSelectUser?: (user: UserSummary) => void;
}

export function DeleteTweetSection({ currentUser, onSelectUser }: DeleteTweetSectionProps) {
	const [tweetId, setTweetId] = useState("");
	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState(null);
	const [error, setError] = useState("");
	const [searchTerm, setSearchTerm] = useState("");
	const [searchResults, setSearchResults] = useState<UserSummary[]>([]);
	const [searchLoading, setSearchLoading] = useState(false);
	const [searchError, setSearchError] = useState("");
	const [searchPerformed, setSearchPerformed] = useState(false);

	const searchUsers = async () => {
		const trimmed = searchTerm.trim();
		if (!trimmed) {
			setSearchError("Enter a username or email to search");
			setSearchResults([]);
			setSearchPerformed(false);
			return;
		}

		setSearchLoading(true);
		setSearchError("");
		setSearchPerformed(true);

		try {
			const response = await fetch(
				`/api/user/all?page=1&pageSize=10&status=active&q=${encodeURIComponent(trimmed)}`,
			);
			const data = await response.json();
			if (!response.ok) {
				throw new Error(data.error || "Failed to search users");
			}
			const matches: UserSummary[] = Array.isArray(data.data) ? data.data : [];
			setSearchResults(matches);
			if (matches.length === 0) {
				setSearchError("No matching active users found");
			}
		} catch (err: any) {
			setSearchError(err.message || "Unable to search users");
			setSearchResults([]);
		} finally {
			setSearchLoading(false);
		}
	};

	const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		searchUsers();
	};

	const handleSelectUser = (user: UserSummary) => {
		if (onSelectUser) {
			onSelectUser(user);
		}
		setSearchResults([]);
		setSearchError("");
		setSearchPerformed(false);
		setTweetId("");
		setResult(null);
	};

	const deleteTweet = async () => {
		if (!tweetId.trim()) {
			setError("Please enter a tweet ID");
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
			const response = await fetch("/api/twitter/tweet/delete", {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					tweetId: tweetId.trim(),
					userId: currentUser.id,
				}),
			});

			const data = await response.json();

			if (response.ok) {
				setResult({
					success: true,
					message: data.message,
					timestamp: new Date().toLocaleTimeString(),
				});
				setTweetId("");
			} else {
				setError(data.error || "Failed to delete tweet");
			}
		} catch (err) {
			setError("Network error occurred");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
			<div>
				<h3 className="text-lg font-semibold text-gray-900">Delete Tweet</h3>
				<p className="text-sm text-gray-500">
					Find an account by username or email, select it, then remove tweets by ID.
				</p>
			</div>

			<div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
				<form
					onSubmit={handleSearchSubmit}
					className="flex flex-col gap-3 md:flex-row md:items-center"
				>
					<input
						type="search"
						value={searchTerm}
						onChange={(event) => setSearchTerm(event.target.value)}
						placeholder="Search active users by username or email"
						className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-red-400 focus:outline-none focus:ring focus:ring-red-100"
					/>
					<button
						type="submit"
						disabled={searchLoading}
						className="inline-flex items-center justify-center rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{searchLoading ? "Searching…" : "Search"}
					</button>
				</form>

				{searchError && (
					<p className="mt-3 text-sm text-red-600">{searchError}</p>
				)}

				{!searchError && searchPerformed && searchResults.length === 0 && !searchLoading && (
					<p className="mt-3 text-sm text-gray-500">No users matched that search.</p>
				)}

				{searchResults.length > 0 && (
					<ul className="mt-4 space-y-3">
						{searchResults.map((user) => (
							<li
								key={user.id}
								className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm md:flex-row md:items-center md:justify-between"
							>
								<div>
									<p className="font-medium text-gray-900">
										{user.name || "Unknown"}
									</p>
									<p className="text-sm text-gray-600">{user.email}</p>
									{user.twitterUsername && (
										<p className="text-sm text-gray-500">@{user.twitterUsername}</p>
									)}
								</div>
								<button
									type="button"
									onClick={() => handleSelectUser(user)}
									disabled={!onSelectUser}
									className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
								>
									Use account
								</button>
							</li>
						))}
					</ul>
				)}
			</div>

			{!currentUser ? (
				<div className="rounded-lg border border-dashed border-gray-200 py-8 text-center text-gray-500">
					<p>Select an account above to enable tweet deletion.</p>
				</div>
			) : (
				<div className="space-y-4">
					<div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
						<p className="text-sm font-medium text-gray-700">Active account</p>
						<p className="text-base text-gray-900">
							{currentUser.name || "Unknown"} (@{currentUser.twitterUsername || "?"})
						</p>
						<p className="text-sm text-gray-500">{currentUser.email}</p>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Tweet ID
						</label>
						<input
							type="text"
							value={tweetId}
							onChange={(e) => setTweetId(e.target.value)}
							placeholder="Enter tweet ID (e.g., 1234567890123456789)"
							className="w-full p-3 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
						/>
						<p className="text-xs text-gray-500 mt-1">
							You can find the tweet ID in the URL or from the timeline above
						</p>
					</div>

					{error && (
						<div className="p-4 bg-red-50 border border-red-200 rounded-lg">
							<div className="flex items-center">
								<span className="text-red-500 mr-2">!</span>
								<span className="text-red-700">{error}</span>
							</div>
						</div>
					)}

					{result && (
						<div className="p-4 bg-green-50 border border-green-200 rounded-lg">
							<div className="flex items-center">
								<span className="text-green-500 mr-2">✅</span>
								<span className="text-green-800">{result.message}</span>
							</div>
							<div className="text-xs text-green-600 mt-1">
								Deleted at {result.timestamp}
							</div>
						</div>
					)}

					<button
						onClick={deleteTweet}
						disabled={loading || !tweetId.trim()}
						className="w-full flex items-center justify-center px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						{loading ? (
							<>
								<span className="mr-2">⏳</span>
								Deleting tweet...
							</>
						) : (
							<>
								<span className="mr-2">🗑</span>
								Delete Tweet
							</>
						)}
					</button>

					<div className="text-sm text-gray-600 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
						<div className="flex items-start">
							<span className="mr-2">!</span>
							<div>
								<strong>Warning:</strong> This action cannot be undone. You can
								only delete tweets from the currently selected account (@
								{currentUser?.twitterUsername}).
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
