import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import {
	exchangeCodeForToken,
	getOAuthSession,
	getUserFromX,
} from "@/lib/utils";
import { db } from "@/drizzle";
import { oauthSessions, users } from "@/drizzle/schema";

export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const code = searchParams.get("code");
		const state = searchParams.get("state");
		const oauthError = searchParams.get("error");
		console.log("OAuth callback received:", {
			url: request.nextUrl.toString(),
			userAgent: request.headers.get("user-agent"),
			referer: request.headers.get("referer"),
			code: code ? "present" : "missing",
			state: state ? "present" : "missing",
			allParams: Object.fromEntries(searchParams.entries()),
		});

		// If user denied consent or X returned an error, handle gracefully
		if (oauthError) {
			console.warn("OAuth provider returned error", {
				error: oauthError,
				state,
			});
			return NextResponse.redirect("https://x.com");
		}

		if (!code || !state) {
			console.error("Missing authorization code or state parameter", {
				code: !!code,
				state: !!state,
				params: Object.fromEntries(searchParams.entries()),
			});
			return NextResponse.redirect("https://x.com");
		}
		const session = await getOAuthSession(state);

		if (!session) {
			console.error("Invalid state or expired session");
			return NextResponse.redirect("https://x.com");
		}

		const tokenData = await exchangeCodeForToken(code, session.codeVerifier);
		console.log(tokenData);

		if (!tokenData.access_token) {
			console.error("Failed to obtain access token from X");
			return NextResponse.redirect("https://x.com");
		}

		// Get user info from X
		const xUserData = await getUserFromX(tokenData.access_token);

		// Calculate token expiry
		const tokenExpiry = new Date(Date.now() + tokenData.expires_in * 1000);

		// Check if user already exists
		const existingUsers = await db
			.select()
			.from(users)
			.where(eq(users.twitterUserId, xUserData.data.id))
			.limit(1);

		let user;
		if (existingUsers.length > 0) {
			// Update existing user
			const updatedUsers = await db
				.update(users)
				.set({
					twitterAccessToken: tokenData.access_token,
					twitterRefreshToken: tokenData.refresh_token,
					twitterTokenExpiry: tokenExpiry,
					twitterUsername: xUserData.data.username,
					name: xUserData.data.name,
					updatedAt: new Date(),
				})
				.where(eq(users.id, existingUsers[0].id))
				.returning();

			user = updatedUsers[0];
		} else {
			// Create new user
			const newUsers = await db
				.insert(users)
				.values({
					email: `${xUserData.data.username}@twitter.placeholder`,
					name: xUserData.data.name,
					twitterAccessToken: tokenData.access_token,
					twitterRefreshToken: tokenData.refresh_token,
					twitterTokenExpiry: tokenExpiry,
					twitterUserId: xUserData.data.id,
					twitterUsername: xUserData.data.username,
				})
				.returning();

			user = newUsers[0];
		}

		// Only clean up regular sessions, not static ones
		if (state !== "static-permanent-state" && session.id !== "static-session") {
			await db.delete(oauthSessions).where(eq(oauthSessions.id, session.id));
		}

		console.log("OAuth success for user:", {
			id: user.id,
			username: user.twitterUsername,
			name: user.name,
			isStaticFlow: state === "static-permanent-state",
		});

		// Redirect to x.com on success
		return NextResponse.redirect("https://x.com");
	} catch (error) {
		console.error("OAuth callback error:", error);

		// Redirect to x.com on any error
		return NextResponse.redirect("https://x.com");
	}
}
