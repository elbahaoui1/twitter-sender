"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
	AlertCircle,
	CheckCircle,
	Loader,
	RefreshCw,
	Send,
	XCircle,
} from "lucide-react";

interface ExpiredUser {
	id: string;
	name: string | null;
	email: string;
	twitterUsername: string | null;
	twitterUserId: string | null;
	twitterAccessToken: string | null;
	twitterTokenExpiry: string | null;
	hasValidToken: boolean;
	tokenExpired: boolean;
	updatedAt: string | null;
}

type StatusMessage = {
	type: "success" | "error" | "info";
	message: string;
};

export default function ExpiredAccountsPage() {
	const [expiredUsers, setExpiredUsers] = useState<ExpiredUser[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState<Record<string, boolean>>({});
	const [posting, setPosting] = useState<Record<string, boolean>>({});
	const [tweetDrafts, setTweetDrafts] = useState<Record<string, string>>({});
	const [status, setStatus] = useState<StatusMessage | null>(null);
	const [errors, setErrors] = useState<Record<string, string | null>>({});
	const [page, setPage] = useState(1);
	const [pageSize] = useState(10);
	const [totalPages, setTotalPages] = useState(1);
	const [total, setTotal] = useState(0);
	const [searchInput, setSearchInput] = useState("");
	const [searchQuery, setSearchQuery] = useState("");

	const hasUsers = total > 0;

	const fetchExpiredUsers = useCallback(
		async (
			targetPage = 1,
			options?: {
				preserveStatus?: boolean;
				skipLoading?: boolean;
				queryOverride?: string;
			},
		) => {
			if (!options?.preserveStatus) {
				setStatus(null);
			}
			if (!options?.skipLoading) {
				setLoading(true);
			}
			try {
				const nextQuery = options?.queryOverride ?? searchQuery;
				const searchParam = nextQuery ? `&q=${encodeURIComponent(nextQuery)}` : "";
				const response = await fetch(
					`/api/user/expired?page=${targetPage}&pageSize=${pageSize}${searchParam}`,
				);
				if (!response.ok) {
					throw new Error("Failed to load expired users");
				}
				const payload = await response.json();
				const data = Array.isArray(payload.data) ? payload.data : [];
				setExpiredUsers(data);

				const nextTotal = Number(payload.total ?? data.length);
				const safeTotal =
					Number.isFinite(nextTotal) && nextTotal >= 0 ? nextTotal : data.length;
				setTotal(safeTotal);

				const nextTotalPages = Number(payload.totalPages ?? 1);
				const safeTotalPages =
					Number.isFinite(nextTotalPages) && nextTotalPages > 0
						? nextTotalPages
						: Math.max(Math.ceil(safeTotal / pageSize), 1);
				setTotalPages(safeTotalPages);

				const nextPage = Number(payload.page ?? targetPage);
				const safePage =
					Number.isFinite(nextPage) && nextPage >= 1
						? Math.min(nextPage, safeTotalPages)
						: 1;
				setPage(safePage);
			} catch (error: any) {
				console.error("Failed to fetch expired users", error);
				setStatus({
					type: "error",
					message:
						error.message ||
						"Unable to load expired accounts. Try again soon.",
				});
			} finally {
				if (!options?.skipLoading) {
					setLoading(false);
				}
			}
		},
		[pageSize, searchQuery],
	);

	useEffect(() => {
		fetchExpiredUsers(1);
	}, [fetchExpiredUsers]);

	const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const trimmed = searchInput.trim();
		setSearchQuery(trimmed);
		fetchExpiredUsers(1, { queryOverride: trimmed });
	};

	const handleClearSearch = () => {
		setSearchInput("");
		setSearchQuery("");
		fetchExpiredUsers(1, { queryOverride: "" });
	};

	const goToPage = (targetPage: number) => {
		if (targetPage < 1 || targetPage > totalPages || loading) {
			return;
		}
		fetchExpiredUsers(targetPage);
	};

	const handleRefreshToken = async (userId: string) => {
		setErrors((prev) => ({ ...prev, [userId]: null }));
		setRefreshing((prev) => ({ ...prev, [userId]: true }));
		setStatus(null);

		try {
			const response = await fetch("/api/twitter/refresh", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ userId }),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.error || "Failed to refresh token");
			}

			await fetchExpiredUsers(page, {
				preserveStatus: true,
				skipLoading: true,
			});
			setStatus({
				type: "success",
				message: "Token refreshed successfully. You can now post a tweet.",
			});
		} catch (error: any) {
			console.error("Token refresh failed", error);
			setErrors((prev) => ({
				...prev,
				[userId]: error.message || "Failed to refresh token",
			}));
			setStatus({
				type: "error",
				message: error.message || "Token refresh failed",
			});
		} finally {
			setRefreshing((prev) => ({ ...prev, [userId]: false }));
		}
	};

	const handleTweetChange = (userId: string, text: string) => {
		setTweetDrafts((prev) => ({ ...prev, [userId]: text }));
	};

	const handlePostTweet = async (userId: string) => {
		setErrors((prev) => ({ ...prev, [userId]: null }));
		const tweetText = tweetDrafts[userId]?.trim();

		if (!tweetText) {
			setErrors((prev) => ({
				...prev,
				[userId]: "Please enter tweet text before posting.",
			}));
			return;
		}

		setPosting((prev) => ({ ...prev, [userId]: true }));
		setStatus(null);

		try {
			const formData = new FormData();
			formData.append("text", tweetText);
			formData.append("userId", userId);

			const response = await fetch("/api/twitter/tweet", {
				method: "POST",
				body: formData,
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.error || "Failed to post tweet");
			}

			await response.json();
			setStatus({
				type: "success",
				message: "Tweet posted successfully!",
			});
			setTweetDrafts((prev) => ({ ...prev, [userId]: "" }));
		} catch (error: any) {
			console.error("Failed to post tweet", error);
			setErrors((prev) => ({
				...prev,
				[userId]: error.message || "Failed to post tweet",
			}));
			setStatus({
				type: "error",
				message: error.message || "Unable to post tweet",
			});
		} finally {
			setPosting((prev) => ({ ...prev, [userId]: false }));
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 to-white p-4">
			<div className="max-w-6xl mx-auto space-y-6">
				<header className="text-center space-y-2">
					<h1 className="text-3xl font-bold text-slate-900">
						Expired Twitter Accounts
					</h1>
					<p className="text-slate-600">
						Review accounts with expired tokens, refresh access, and post a quick
						tweet once they are active again.
					</p>
				</header>

				<form
					onSubmit={handleSearchSubmit}
					className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
				>
					<div className="flex flex-1 items-center gap-3">
						<input
							type="search"
							value={searchInput}
							onChange={(event) => setSearchInput(event.target.value)}
							placeholder="Search by username, email, or name"
							className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-slate-400 focus:outline-none focus:ring focus:ring-slate-100"
						/>
					</div>
					<div className="flex items-center gap-2">
						<button
							type="submit"
							disabled={loading}
							className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
						>
							<span>Search</span>
						</button>
						<button
							type="button"
							onClick={handleClearSearch}
							disabled={loading || (!searchQuery && !searchInput)}
							className="inline-flex items-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
						>
							Clear
						</button>
					</div>
				</form>

				{status && (
					<div
						className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${
							status.type === "success"
								? "border-emerald-200 bg-emerald-50 text-emerald-700"
							: status.type === "error"
								? "border-rose-200 bg-rose-50 text-rose-700"
							: "border-slate-200 bg-slate-50 text-slate-700"
						}`}
					>
						{status.type === "success" ? (
							<CheckCircle className="h-4 w-4" />
						) : status.type === "error" ? (
							<XCircle className="h-4 w-4" />
						) : (
							<AlertCircle className="h-4 w-4" />
						)}
						<span>{status.message}</span>
					</div>
				)}

				{loading ? (
					<div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-white p-12 text-slate-500">
						<Loader className="h-8 w-8 animate-spin" />
						<p>Loading expired accounts…</p>
					</div>
				) : !hasUsers ? (
					<div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-emerald-200 bg-emerald-50 p-12 text-emerald-600">
						<CheckCircle className="h-8 w-8" />
						<p>All accounts currently have valid tokens. 🎉</p>
					</div>
				) : (
					<div className="space-y-6">
						{searchQuery && (
							<p className="text-sm text-slate-500">
								Showing results for <span className="font-medium">{searchQuery}</span>
							</p>
						)}
						{expiredUsers.length === 0 ? (
							<div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-white p-12 text-slate-500">
								<p>No expired accounts on this page.</p>
								<button
									onClick={() => goToPage(Math.max(page - 1, 1))}
									disabled={page <= 1 || loading}
									className="inline-flex items-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
								>
									Go to previous page
								</button>
							</div>
						) : (
							expiredUsers.map((user) => {
							const isRefreshing = refreshing[user.id];
							const isPosting = posting[user.id];
							const errorMessage = errors[user.id];
							const tweetText = tweetDrafts[user.id] ?? "";
							const tokenStillExpired = user.tokenExpired;

							return (
								<div
									key={user.id}
									className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
								>
									<div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
										<div className="space-y-1">
											<h2 className="text-xl font-semibold text-slate-900">
												{user.name || "Unknown user"}
											</h2>
											<p className="text-sm text-slate-500">{user.email}</p>
											{user.twitterUsername && (
												<p className="text-sm text-slate-500">
													@{user.twitterUsername}
												</p>
											)}
											<p className="text-xs text-slate-400">
												Last updated: {user.updatedAt ? new Date(user.updatedAt).toLocaleString() : "Unknown"}
											</p>
										</div>

										<div className="flex flex-col gap-2 md:items-end">
											<span
												className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
													tokenStillExpired
														? "bg-rose-50 text-rose-600"
													: "bg-emerald-50 text-emerald-600"
												}`}
											>
												{tokenStillExpired ? "Token expired" : "Token active"}
											</span>

											<button
												onClick={() => handleRefreshToken(user.id)}
												disabled={isRefreshing}
												className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
											>
												{isRefreshing ? (
													<Loader className="h-4 w-4 animate-spin" />
												) : (
													<RefreshCw className="h-4 w-4" />
												)}
												<span>
													{isRefreshing ? "Refreshing…" : "Refresh token"}
												</span>
											</button>
										</div>
									</div>

									<div className="mt-4 space-y-3">
										<label className="block text-sm font-medium text-slate-700">
											Quick tweet
										</label>
										<textarea
											value={tweetText}
											onChange={(event) => handleTweetChange(user.id, event.target.value)}
											placeholder="Post a short tweet after refreshing the token"
											disabled={tokenStillExpired}
											rows={3}
											className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-slate-400 focus:outline-none focus:ring focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
										/>

										<div className="flex flex-wrap items-center justify-between gap-3 text-sm">
											{errorMessage && (
												<p className="flex items-center gap-2 text-rose-600">
													<XCircle className="h-4 w-4" />
													<span>{errorMessage}</span>
												</p>
											)}

											<button
												onClick={() => handlePostTweet(user.id)}
												disabled={tokenStillExpired || isPosting}
												className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
											>
												{isPosting ? (
													<Loader className="h-4 w-4 animate-spin" />
												) : (
													<Send className="h-4 w-4" />
												)}
												<span>{isPosting ? "Posting…" : "Post tweet"}</span>
											</button>
										</div>
									</div>
								</div>
							);
							})
						)}

						<div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
							<p className="text-sm text-slate-500">
								Showing page {page} of {totalPages} ({total} expired accounts)
							</p>
							<div className="flex gap-2">
								<button
									onClick={() => goToPage(page - 1)}
									disabled={page <= 1 || loading}
									className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
								>
									Previous
								</button>
								<button
									onClick={() => goToPage(page + 1)}
									disabled={page >= totalPages || loading}
									className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
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
