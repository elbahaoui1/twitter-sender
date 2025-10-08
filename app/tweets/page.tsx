"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader, MessageCircle, Search, Twitter } from "lucide-react";

interface TweetRecord {
	id: string;
	twitterTweetId: string;
	text: string;
	replyToTweetId: string | null;
	mediaId: string | null;
	createdAt: string | null;
	userId: string;
	userName: string | null;
	userEmail: string | null;
	userTwitterUsername: string | null;
}

interface ApiResponse {
	data: TweetRecord[];
	page: number;
	pageSize: number;
	total: number;
	totalPages: number;
	error?: string;
}

export default function TweetsPage() {
	const [tweets, setTweets] = useState<TweetRecord[]>([]);
	const [loading, setLoading] = useState(true);
	const [page, setPage] = useState(1);
	const [pageSize] = useState(20);
	const [total, setTotal] = useState(0);
	const [totalPages, setTotalPages] = useState(1);
	const [error, setError] = useState<string | null>(null);
	const [searchInput, setSearchInput] = useState("");
	const [searchQuery, setSearchQuery] = useState("");

	const fetchTweets = useCallback(
		async (
			targetPage = 1,
			options?: { queryOverride?: string; skipLoading?: boolean },
		) => {
			if (!options?.skipLoading) {
				setLoading(true);
			}
			setError(null);

			try {
				const nextQuery = options?.queryOverride ?? searchQuery;
				const searchParam = nextQuery ? `&q=${encodeURIComponent(nextQuery)}` : "";
				const response = await fetch(
					`/api/tweets?page=${targetPage}&pageSize=${pageSize}${searchParam}`,
				);

				if (!response.ok) {
					throw new Error("Failed to load tweets");
				}

				const payload: ApiResponse = await response.json();
				const data = Array.isArray(payload?.data) ? payload.data : [];

				setTweets(data);
				const nextTotal = Number(payload?.total ?? data.length);
				setTotal(Number.isFinite(nextTotal) && nextTotal >= 0 ? nextTotal : data.length);

				const nextTotalPages = Number(payload?.totalPages ?? 1);
				setTotalPages(
					Number.isFinite(nextTotalPages) && nextTotalPages > 0
						? nextTotalPages
						: Math.max(Math.ceil((payload?.total ?? data.length) / pageSize), 1),
				);

				const nextPage = Number(payload?.page ?? targetPage);
				setPage(
					Number.isFinite(nextPage) && nextPage >= 1
						? Math.min(nextPage, Number.isFinite(nextTotalPages) ? nextTotalPages : targetPage)
						: 1,
				);
			} catch (fetchError: any) {
				console.error("Failed to fetch tweets", fetchError);
				setError(fetchError?.message || "Unable to load tweets");
			} finally {
				if (!options?.skipLoading) {
					setLoading(false);
				}
			}
		},
		[pageSize, searchQuery],
	);

	useEffect(() => {
		fetchTweets(1);
	}, [fetchTweets]);

	const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const trimmed = searchInput.trim();
		setSearchQuery(trimmed);
		fetchTweets(1, { queryOverride: trimmed });
	};

	const handleClearSearch = () => {
		setSearchInput("");
		setSearchQuery("");
		fetchTweets(1, { queryOverride: "" });
	};

	const goToPage = (targetPage: number) => {
		if (targetPage < 1 || targetPage > totalPages || loading) {
			return;
		}
		fetchTweets(targetPage);
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-4">
			<div className="mx-auto max-w-6xl space-y-6">
				<header className="space-y-2 text-center">
					<div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-500">
						<Twitter className="h-8 w-8 text-white" />
					</div>
					<h1 className="text-3xl font-bold text-blue-950">Posted Tweets</h1>
					<p className="text-sm text-blue-700">
						Review tweets published through the dashboard, including quick tweets from
						the expired accounts page.
					</p>
				</header>

				<form
					onSubmit={handleSearchSubmit}
					className="flex flex-col gap-3 rounded-xl border border-blue-100 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between"
				>
					<div className="flex flex-1 items-center gap-2">
						<Search className="h-4 w-4 text-blue-400" />
						<input
							type="search"
							value={searchInput}
							onChange={(event) => setSearchInput(event.target.value)}
							placeholder="Search text, username, or email"
							className="w-full rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900 shadow-sm focus:border-blue-300 focus:outline-none focus:ring focus:ring-blue-100"
						/>
					</div>
					<div className="flex items-center gap-2">
						<button
							type="submit"
							disabled={loading}
							className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
						>
							<span>Search</span>
						</button>
						<button
							type="button"
							onClick={handleClearSearch}
							disabled={loading || (!searchInput && !searchQuery)}
							className="inline-flex items-center rounded-lg border border-blue-100 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
						>
							Clear
						</button>
					</div>
				</form>

				{error && (
					<div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
						<MessageCircle className="h-4 w-4" />
						<span>{error}</span>
					</div>
				)}

				{loading ? (
					<div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-blue-200 bg-white p-12 text-blue-500">
						<Loader className="h-8 w-8 animate-spin" />
						<p>Loading tweets...</p>
					</div>
				) : tweets.length === 0 ? (
					<div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-blue-200 bg-white p-12 text-blue-500">
						<Twitter className="h-10 w-10" />
						<p>No tweets logged yet. Once you post via the app they’ll appear here.</p>
					</div>
				) : (
					<div className="space-y-4">
						{searchQuery && (
							<p className="text-sm text-blue-700">
								Showing results for <span className="font-semibold">{searchQuery}</span>
							</p>
						)}

						<div className="overflow-x-auto rounded-xl border border-blue-100 bg-white shadow-sm">
							<table className="min-w-full divide-y divide-blue-100 text-sm text-blue-900">
								<thead className="bg-blue-50">
									<tr>
										<th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Tweet</th>
										<th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Account</th>
										<th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Posted at</th>
										<th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Meta</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-blue-50">
									{tweets.map((tweet) => {
										const createdAt = tweet.createdAt ? new Date(tweet.createdAt).toLocaleString() : "Unknown";
										return (
											<tr key={tweet.id} className="hover:bg-blue-50/60">
												<td className="px-4 py-3 align-top">
													<p className="whitespace-pre-wrap leading-relaxed text-blue-950">{tweet.text}</p>
													<p className="mt-1 text-xs text-blue-500">Twitter ID: {tweet.twitterTweetId}</p>
												</td>
												<td className="px-4 py-3 align-top">
													<div className="font-semibold text-blue-900">{tweet.userName || "Unknown"}</div>
													<div className="text-xs text-blue-600">{tweet.userEmail || "N/A"}</div>
													{tweet.userTwitterUsername && (
														<div className="text-xs text-blue-500">@{tweet.userTwitterUsername}</div>
													)}
												</td>
												<td className="px-4 py-3 align-top text-sm text-blue-700">{createdAt}</td>
												<td className="px-4 py-3 align-top text-xs text-blue-600">
													{tweet.replyToTweetId && (
														<p>Reply to: {tweet.replyToTweetId}</p>
													)}
													{tweet.mediaId && <p>Media ID: {tweet.mediaId}</p>}
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>

						<div className="flex flex-col gap-2 rounded-xl border border-blue-100 bg-white p-4 text-sm text-blue-700 sm:flex-row sm:items-center sm:justify-between">
							<p>
								Showing page {page} of {totalPages} ({total} tweet{total === 1 ? "" : "s"})
							</p>
							<div className="flex gap-2">
								<button
									onClick={() => goToPage(page - 1)}
									disabled={page <= 1 || loading}
									className="inline-flex items-center rounded-lg border border-blue-100 px-3 py-1 text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
								>
									Previous
								</button>
								<button
									onClick={() => goToPage(page + 1)}
									disabled={page >= totalPages || loading}
									className="inline-flex items-center rounded-lg border border-blue-100 px-3 py-1 text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
								>
									Next
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
