import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/drizzle";
import { users } from "@/drizzle/schema";

export async function POST(request: NextRequest) {
	try {
		const { userId } = await request.json();

		if (!userId) {
			return NextResponse.json(
				{ error: "User ID is required" },
				{ status: 400 },
			);
		}

		// Fetch the specific user
		const user = await db
			.select({
				id: users.id,
				name: users.name,
				email: users.email,
				twitterUsername: users.twitterUsername,
				twitterUserId: users.twitterUserId,
				twitterAccessToken: users.twitterAccessToken,
				twitterRefreshToken: users.twitterRefreshToken,
				twitterTokenExpiry: users.twitterTokenExpiry,
			})
			.from(users)
			.where(eq(users.id, userId))
			.limit(1);

		if (!user[0]) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		const userData = user[0];

		// Check if user has valid Twitter credentials
		if (!userData.twitterAccessToken) {
			return NextResponse.json(
				{ error: "User has no Twitter access token" },
				{ status: 400 },
			);
		}

		// Check if token is expired
		const isTokenExpired =
			userData.twitterTokenExpiry && userData.twitterTokenExpiry < new Date();

		if (isTokenExpired) {
			return NextResponse.json(
				{ error: "User's Twitter token has expired" },
				{ status: 400 },
			);
		}

		// Return user data for the frontend (similar to current user endpoint)
		return NextResponse.json({
			...userData,
			tokenExpired: isTokenExpired,
			hasValidToken: !!userData.twitterAccessToken && !isTokenExpired,
		});
	} catch (error) {
		console.error("Error connecting as user:", error);
		return NextResponse.json(
			{ error: "Failed to connect as user" },
			{ status: 500 },
		);
	}
}
