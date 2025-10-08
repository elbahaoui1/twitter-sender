"use client";
import { useState } from "react";

export default function ForgotPage() {
	const [sent, setSent] = useState(false);
	return (
		<form
			action={async (form: FormData) => {
				const email = form.get("email");
				await fetch("/api/forgot-password", {
					method: "POST",
					body: JSON.stringify({ email }),
				});
				setSent(true);
			}}
		>
			<h2 className="text-xl mb-2">Reset password</h2>
			<input
				name="email"
				type="email"
				required
				placeholder="you@example.com"
				className="border p-2"
			/>
			<button className="ml-2 bg-blue-600 text-white px-3 py-2 rounded">
				Send reset link
			</button>
			{sent && <p className="text-green-600 mt-2">Check your inbox!</p>}
		</form>
	);
}
