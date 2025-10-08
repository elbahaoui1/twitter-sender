import { NextRequest, NextResponse } from "next/server";
import { users } from "@/drizzle/schema";
import { db } from "@/drizzle";
import { desc, eq, isNotNull } from "drizzle-orm";

export async function GET(request: NextRequest) {
	try {
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

		if (user[0].twitterTokenExpiry && user[0].twitterTokenExpiry < new Date()) {
			return NextResponse.json(
				{ error: "Twitter token expired" },
				{ status: 401 },
			);
		}

		const response = await fetch(
			`https://api.x.com/2/users/${user[0].twitterUserId}?user.fields=public_metrics,description,profile_image_url,verified,created_at`,
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
