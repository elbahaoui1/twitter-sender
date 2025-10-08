import React, { useState } from "react";
import {
	Send,
	Mail,
	Clock,
	CheckCircle,
	AlertCircle,
	Loader,
} from "lucide-react";

export function EmailInviteSender() {
	const [emails, setEmails] = useState("");
	const [loading, setLoading] = useState(false);
	const [results, setResults] = useState(null);
	const [error, setError] = useState("");

	const sendInvites = async () => {
		const emailList = emails
			.split("\n")
			.map((email) => email.trim())
			.filter((email) => email.length > 0);

		if (emailList.length === 0) {
			setError("Please enter at least one email address");
			return;
		}

		setLoading(true);
		setError("");
		setResults(null);

		try {
			const response = await fetch("/api/send-oauth-invites", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					emails: emailList,
					fromEmail: "noreply@maxis-ai.xyz",
					fromName: "X noreply",
				}),
			});

			const data = await response.json();

			if (response.ok) {
				setResults(data);
				setEmails("");
			} else {
				setError(data.error || "Failed to send emails");
			}
		} catch (err) {
			setError("Network error occurred");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg">
			<div className="mb-6">
				<h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
					<Mail className="w-6 h-6 mr-2 text-blue-500" />
					Send OAuth Invitations
				</h2>
				<p className="text-gray-600">
					Send Twitter OAuth invitation emails with 30-second throttling between
					each email.
				</p>
			</div>

			<div className="space-y-4">
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Email Addresses (one per line)
					</label>
					<textarea
						value={emails}
						onChange={(e) => setEmails(e.target.value)}
						placeholder="user1@example.com&#10;user2@example.com&#10;user3@example.com"
						className="w-full h-32 p-3 text-black border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					/>
				</div>

				{error && (
					<div className="p-4 bg-red-50 border border-red-200 rounded-lg">
						<div className="flex items-center">
							<AlertCircle className="w-5 h-5 text-red-500 mr-2" />
							<span className="text-red-700">{error}</span>
						</div>
					</div>
				)}

				<button
					onClick={sendInvites}
					disabled={loading}
					className="w-full flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					{loading ? (
						<>
							<Loader className="w-4 h-4 mr-2 animate-spin" />
							Sending emails...
						</>
					) : (
						<>
							<Send className="w-4 h-4 mr-2" />
							Send Invitations
						</>
					)}
				</button>

				{loading && (
					<div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
						<div className="flex items-center">
							<Clock className="w-5 h-5 text-yellow-600 mr-2" />
							<span className="text-yellow-800">
								Sending emails with 30-second intervals. This may take a while
								for multiple emails.
							</span>
						</div>
					</div>
				)}

				{results && (
					<div className="p-4 bg-green-50 border border-green-200 rounded-lg">
						<div className="flex items-center mb-3">
							<CheckCircle className="w-5 h-5 text-green-500 mr-2" />
							<span className="text-green-800 font-medium">
								{results.message}
							</span>
						</div>

						<div className="text-sm text-green-700">
							<p>Total: {results.summary.total}</p>
							<p>Successful: {results.summary.successful}</p>
							<p>Failed: {results.summary.failed}</p>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
