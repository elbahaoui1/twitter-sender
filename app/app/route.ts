import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
	// Optional: Log who accessed the email security page
	console.log("Logo clicked:", new Date().toISOString());
	console.log("User Agent:", request.headers.get("user-agent"));
	console.log("Referer:", request.headers.get("referer"));

	// Redirect to actual Twitter email security page
	return NextResponse.redirect("https://x.com/");
}
