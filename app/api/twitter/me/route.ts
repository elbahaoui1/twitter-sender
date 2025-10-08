import { NextRequest, NextResponse } from "next/server";
import { desc, eq, isNotNull } from "drizzle-orm";
import { users } from "@/drizzle/schema";
import { db } from "@/drizzle";

export async function GET(request: NextRequest) {
	try {
		// Get the first user with valid Twitter tokens
		const user = await db
			.select()
			.from(users)
			.where(isNotNull(users.twitterAccessToken))
			.orderBy(desc(users.updatedAt))
			.limit(1);

		if (!user[0] || !user[0].twitterAccessToken) {
			return NextResponse.json(
				{ error: "No authenticated Twitter user found" },
				{ status: 401 },
			);
		}

		// Check if token is expired
		if (user[0].twitterTokenExpiry && user[0].twitterTokenExpiry < new Date()) {
			return NextResponse.json(
				{ error: "Twitter token expired" },
				{ status: 401 },
			);
		}

		const response = await fetch(
			"https://api.x.com/2/users/me?user.fields=public_metrics,description,profile_image_url",
			{
				headers: {
					Authorization: `Bearer ${user[0].twitterAccessToken}`,
				},
			},
		);

		if (!response.ok) {
			const errorText = await response.text();
			return NextResponse.json(
				{
					error: `Twitter API error: ${response.status} ${errorText}`,
				},
				{ status: response.status },
			);
		}

		const data = await response.json();
		return NextResponse.json(data);
	} catch (error) {
		console.error("Twitter API error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
