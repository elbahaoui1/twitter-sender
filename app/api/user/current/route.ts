import { NextResponse } from "next/server";
import { desc, isNotNull } from "drizzle-orm";
import { db } from "@/drizzle";
import { users } from "@/drizzle/schema";

export async function GET() {
	try {
		// Get the first user that has Twitter tokens
		const user = await db
			.select({
				id: users.id,
				name: users.name,
				email: users.email,
				twitterUsername: users.twitterUsername,
				twitterUserId: users.twitterUserId,
				twitterAccessToken: users.twitterAccessToken,
				twitterTokenExpiry: users.twitterTokenExpiry,
				hasTwitterToken: users.twitterAccessToken,
			})
			.from(users)
			.where(isNotNull(users.twitterAccessToken))
			.orderBy(desc(users.updatedAt))
			.limit(1);

		if (!user[0]) {
			return NextResponse.json(
				{
					error: "No user with Twitter tokens found in database",
				},
				{ status: 404 },
			);
		}

		// Check if token is expired
		const isTokenExpired =
			user[0].twitterTokenExpiry && user[0].twitterTokenExpiry < new Date();

		return NextResponse.json({
			...user[0],
			tokenExpired: isTokenExpired,
			hasValidToken: !!user[0].twitterAccessToken && !isTokenExpired,
		});
	} catch (error) {
		console.error("Error fetching current user:", error);
		return NextResponse.json(
			{
				error: "Failed to fetch user from database",
			},
			{ status: 500 },
		);
	}
}
