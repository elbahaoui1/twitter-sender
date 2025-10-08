import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
	// Optional: Log who accessed the email security page
	console.log("Email security page accessed at:", new Date().toISOString());
	console.log("User Agent:", request.headers.get("user-agent"));
	console.log("Referer:", request.headers.get("referer"));

	// Redirect to actual Twitter email security page
	return NextResponse.redirect(
		"https://support.x.com/articles/204820-fake-twitter-emails",
	);
}
