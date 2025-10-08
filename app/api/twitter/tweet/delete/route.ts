import { NextRequest, NextResponse } from "next/server";
import { users } from "@/drizzle/schema";
import { db } from "@/drizzle";
import { eq } from "drizzle-orm";

export async function DELETE(request: NextRequest) {
	try {
		const { tweetId, userId } = await request.json();

		if (!tweetId) {
			return NextResponse.json(
				{ error: "Tweet ID is required" },
				{ status: 400 },
			);
		}

		if (!userId) {
			return NextResponse.json(
				{ error: "User ID is required" },
				{ status: 400 },
			);
		}

		// Get the specific user by ID
		const userResult = await db
			.select()
			.from(users)
			.where(eq(users.id, userId))
			.limit(1);

		const user = userResult[0];

		if (!user || !user.twitterAccessToken) {
			return NextResponse.json(
				{ error: "User not found or no Twitter access token" },
				{ status: 401 },
			);
		}

		if (user.twitterTokenExpiry && user.twitterTokenExpiry < new Date()) {
			return NextResponse.json(
				{ error: "Twitter token expired" },
				{ status: 401 },
			);
		}

		// Make the delete request to Twitter API
		const response = await fetch(`https://api.x.com/2/tweets/${tweetId}`, {
			method: "DELETE",
			headers: {
				Authorization: `Bearer ${user.twitterAccessToken}`,
				"Content-Type": "application/json",
			},
		});

		if (!response.ok) {
			const errorText = await response.text();

			// Handle specific error cases
			if (response.status === 403) {
				return NextResponse.json(
					{ error: "You can only delete your own tweets" },
					{ status: 403 },
				);
			}

			if (response.status === 404) {
				return NextResponse.json(
					{ error: "Tweet not found or already deleted" },
					{ status: 404 },
				);
			}

			return NextResponse.json(
				{
					error: `Twitter API error: ${response.status} ${errorText}`,
				},
				{ status: response.status },
			);
		}

		const data = await response.json();
		return NextResponse.json({
			success: true,
			message: "Tweet deleted successfully",
			data: data,
		});
	} catch (error) {
		console.error("Twitter API delete error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
