import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
	console.log("Help page accessed at:", new Date().toISOString());
	console.log("User Agent:", request.headers.get("user-agent"));
	console.log("Referer:", request.headers.get("referer"));

	// Redirect to actual Twitter help page
	return NextResponse.redirect("https://support.twitter.com/articles/76036");
}
