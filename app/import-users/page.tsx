"use client";

import React, { useState } from "react";
import { Loader2, UploadCloud, CheckCircle2, AlertCircle } from "lucide-react";

interface ImportResult {
	username: string;
	inserted?: boolean;
	error?: string;
	userId?: string;
}

interface ImportSummary {
	processed: number;
	inserted: number;
	errors: number;
	results: ImportResult[];
}

export default function ImportUsersPage() {
	const [messages, setMessages] = useState("");
	const [loading, setLoading] = useState(false);
	const [summary, setSummary] = useState<ImportSummary | null>(null);
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError(null);
		setSummary(null);

		const trimmed = messages.trim();
		if (!trimmed) {
			setError("Please paste one or more OAuth messages before importing.");
			return;
		}

		setLoading(true);
		try {
			const response = await fetch("/api/user/import", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ messages: trimmed }),
			});

			if (!response.ok) {
				const errorBody = await response.json().catch(() => ({}));
				throw new Error(errorBody.error || "Failed to import users");
			}

			const data: ImportSummary = await response.json();
			setSummary(data);
		} catch (err: any) {
			console.error("Import failed", err);
			setError(err.message || "Unexpected error while importing users");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-slate-950 pb-16">
			<header className="bg-slate-900 py-12 text-center text-white">
				<h1 className="text-3xl font-semibold">Bulk OAuth Message Import</h1>
				<p className="mt-2 text-sm text-slate-300">
					Paste the raw messages exported from your logs. We'll parse each entry,
					generate a unique email, and store the expired tokens for future refreshes.
				</p>
			</header>

			<main className="mx-auto mt-8 w-full max-w-4xl px-4">
				<form onSubmit={handleSubmit} className="space-y-6">
					<div>
						<label className="mb-2 block text-sm font-medium text-slate-100">
							OAuth messages
						</label>
						<textarea
							value={messages}
							onChange={(event) => setMessages(event.target.value)}
							placeholder="Paste the messages exactly as exported…"
							rows={14}
							className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 shadow focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/40"
						/>
						<p className="mt-2 text-xs text-slate-400">
							We look for blocks containing “Utilisateur”, “Access token”, and “Refresh token”.
						</p>
					</div>

					<div className="flex flex-wrap items-center gap-3">
						<button
							type="submit"
							disabled={loading}
							className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{loading ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<UploadCloud className="h-4 w-4" />
							)}
							<span>{loading ? "Importing…" : "Import entries"}</span>
						</button>
						<button
							type="button"
							onClick={() => {
								setMessages("");
								setSummary(null);
								setError(null);
							}}
							className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
						>
							Reset
						</button>
					</div>
				</form>

				{error && (
					<div className="mt-6 flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
						<AlertCircle className="h-4 w-4" />
						<span>{error}</span>
					</div>
				)}

				{summary && (
					<div className="mt-8 space-y-4">
						<div className="rounded-lg border border-slate-700 bg-slate-900 px-5 py-4 text-slate-200">
							<div className="flex flex-wrap items-center gap-3 text-sm">
								<CheckCircle2 className="h-4 w-4 text-emerald-400" />
								<span>
									Processed {summary.processed} entries — {summary.inserted} inserted,
									{summary.errors} failed.
								</span>
							</div>
						</div>

						<div className="overflow-x-auto rounded-lg border border-slate-800">
							<table className="min-w-full divide-y divide-slate-800 text-sm">
								<thead className="bg-slate-900 text-slate-300">
									<tr>
										<th className="px-4 py-2 text-left font-semibold">Username</th>
										<th className="px-4 py-2 text-left font-semibold">Status</th>
										<th className="px-4 py-2 text-left font-semibold">Details</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-800 bg-slate-950/60">
									{summary.results.map((result, index) => (
										<tr key={`${result.username}-${index}`} className="text-slate-200">
											<td className="px-4 py-2 font-medium">@{result.username}</td>
											<td className="px-4 py-2">
												{result.inserted ? (
													<span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-300">
														<CheckCircle2 className="h-3 w-3" />
														Imported
													</span>
												) : (
													<span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-semibold text-rose-300">
														<AlertCircle className="h-3 w-3" />
														Failed
													</span>
												)}
											</td>
											<td className="px-4 py-2 text-slate-400">
												{result.inserted
													? result.userId
													: result.error || "Unknown error"}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				)}
			</main>
		</div>
	);
}
