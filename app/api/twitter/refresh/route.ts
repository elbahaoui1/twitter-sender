import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/drizzle";
import { users } from "@/drizzle/schema";
import { refreshTwitterToken } from "@/lib/utils";

export async function POST(request: NextRequest) {
	try {
		const { userId } = await request.json();

		if (!userId) {
			return NextResponse.json(
				{ error: "User ID is required" },
				{ status: 400 },
			);
		}

		const existingUsers = await db
			.select()
			.from(users)
			.where(eq(users.id, userId))
			.limit(1);

		const user = existingUsers[0];

		if (!user) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		if (!user.twitterRefreshToken) {
			return NextResponse.json(
				{ error: "User does not have a refresh token" },
				{ status: 400 },
			);
		}

		const tokenData = await refreshTwitterToken(user.twitterRefreshToken);
		const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

		const updatedUsers = await db
			.update(users)
			.set({
				twitterAccessToken: tokenData.access_token,
				twitterRefreshToken: tokenData.refresh_token || user.twitterRefreshToken,
				twitterTokenExpiry: expiresAt,
				updatedAt: new Date(),
			})
			.where(eq(users.id, user.id))
			.returning({
				id: users.id,
				name: users.name,
				email: users.email,
				twitterUsername: users.twitterUsername,
				twitterUserId: users.twitterUserId,
				twitterAccessToken: users.twitterAccessToken,
				twitterTokenExpiry: users.twitterTokenExpiry,
				updatedAt: users.updatedAt,
			});

		const updatedUser = updatedUsers[0];

		return NextResponse.json({
			...updatedUser,
			hasValidToken:
				!!updatedUser.twitterAccessToken &&
				(!updatedUser.twitterTokenExpiry ||
					updatedUser.twitterTokenExpiry > new Date()),
			tokenExpired:
				!!updatedUser.twitterTokenExpiry &&
				updatedUser.twitterTokenExpiry < new Date(),
		});
	} catch (error: any) {
		console.error("Error refreshing twitter token:", error);
		return NextResponse.json(
			{ error: error.message || "Failed to refresh token" },
			{ status: 500 },
		);
	}
}
