import { NextRequest, NextResponse } from "next/server";
import { users } from "@/drizzle/schema";
import { db } from "@/drizzle";
import { eq } from "drizzle-orm";

async function uploadMediaToTwitter(
	accessToken: string,
	file: File,
): Promise<string> {
	const formData = new FormData();
	formData.append("media", file);

	const response = await fetch(
		"https://upload.twitter.com/1.1/media/upload.json",
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
			body: formData,
		},
	);

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Media upload failed: ${response.status} ${errorText}`);
	}

	const data = await response.json();
	return data.media_id_string;
}

export async function POST(request: NextRequest) {
	try {
		const formData = await request.formData();
		const text = formData.get("text") as string;
		const userId = formData.get("userId") as string;
		const replyToTweetId = formData.get("replyToTweetId") as string;
		const imageFile = formData.get("image") as File | null;

		if (!text || text.trim().length === 0) {
			return NextResponse.json(
				{ error: "Tweet text is required" },
				{ status: 400 },
			);
		}

		if (text.length > 280) {
			return NextResponse.json(
				{ error: "Tweet text too long (max 280 characters)" },
				{ status: 400 },
			);
		}

		if (!userId) {
			return NextResponse.json(
				{ error: "User ID is required" },
				{ status: 400 },
			);
		}

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

		// Upload image first if provided
		let mediaId: string | null = null;
		if (imageFile && imageFile.size > 0) {
			try {
				mediaId = await uploadMediaToTwitter(
					user.twitterAccessToken,
					imageFile,
				);
			} catch (error) {
				console.error("Media upload error:", error);
				return NextResponse.json(
					{ error: "Failed to upload image to Twitter" },
					{ status: 500 },
				);
			}
		}

		// Prepare the tweet payload
		const tweetPayload: any = { text };

		// Add reply information if this is a reply
		if (replyToTweetId) {
			tweetPayload.reply = {
				in_reply_to_tweet_id: replyToTweetId,
			};
		}

		// Add media ID if image was uploaded
		if (mediaId) {
			tweetPayload.media = {
				media_ids: [mediaId],
			};
		}

		const response = await fetch("https://api.x.com/2/tweets", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${user.twitterAccessToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(tweetPayload),
		});

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
		return NextResponse.json({
			...data,
			isReply: !!replyToTweetId,
			replyToTweetId: replyToTweetId || null,
			hasMedia: !!mediaId,
		});
	} catch (error) {
		console.error("Twitter API error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
