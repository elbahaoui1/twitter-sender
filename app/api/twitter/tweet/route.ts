import { NextRequest, NextResponse } from "next/server";
import { users, tweets } from "@/drizzle/schema";
import { db } from "@/drizzle";
import { eq } from "drizzle-orm";

// Helper function to upload media to Twitter using v1.1 API
async function uploadMediaToTwitter(
	accessToken: string,
	file: File,
): Promise<string> {
	// Convert file to buffer
	const arrayBuffer = await file.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);

	// Create form data
	const formData = new FormData();
	const blob = new Blob([buffer], { type: file.type });
	formData.append("media", blob, file.name);

	console.log("Uploading media to Twitter...", {
		fileSize: file.size,
		fileType: file.type,
		fileName: file.name,
	});

	const response = await fetch(
		"https://upload.twitter.com/1.1/media/upload.json",
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				// Don't set Content-Type header - let the browser set it with boundary for FormData
			},
			body: formData,
		},
	);

	const responseText = await response.text();
	console.log("Twitter media upload response:", {
		status: response.status,
		statusText: response.statusText,
		headers: Object.fromEntries(response.headers.entries()),
		body: responseText,
	});

	if (!response.ok) {
		throw new Error(`Media upload failed: ${response.status} ${responseText}`);
	}

	const data = JSON.parse(responseText);
	return data.media_id_string;
}

export async function POST(request: NextRequest) {
	try {
		const formData = await request.formData();
		const text = formData.get("text") as string;
		const userId = formData.get("userId") as string;
		const replyToTweetId = formData.get("replyToTweetId") as string;
		const imageFile = formData.get("image") as File | null;

		console.log("Tweet request received:", {
			text: text?.substring(0, 50) + "...",
			userId,
			replyToTweetId,
			hasImage: !!imageFile,
			imageSize: imageFile?.size,
			imageType: imageFile?.type,
		});

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

		// Validate image file if provided
		if (imageFile && imageFile.size > 0) {
			const maxSize = 5 * 1024 * 1024; // 5MB
			const allowedTypes = [
				"image/jpeg",
				"image/jpg",
				"image/png",
				"image/gif",
				"image/webp",
			];

			if (imageFile.size > maxSize) {
				return NextResponse.json(
					{ error: "Image file too large. Maximum size is 5MB." },
					{ status: 400 },
				);
			}

			if (!allowedTypes.includes(imageFile.type.toLowerCase())) {
				return NextResponse.json(
					{
						error: "Invalid image type. Supported types: JPEG, PNG, GIF, WebP",
					},
					{ status: 400 },
				);
			}
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

		console.log("User found:", {
			userId: user.id,
			username: user.twitterUsername,
			hasToken: !!user.twitterAccessToken,
			tokenExpiry: user.twitterTokenExpiry,
		});

		// Upload image first if provided
		let mediaId: string | null = null;
		if (imageFile && imageFile.size > 0) {
			try {
				console.log("Starting media upload...");
				mediaId = await uploadMediaToTwitter(
					user.twitterAccessToken,
					imageFile,
				);
				console.log("Media upload successful:", mediaId);
			} catch (error: any) {
				console.error("Media upload error:", error);

				// Try to provide more specific error messages
				if (error.message.includes("403")) {
					return NextResponse.json(
						{
							error:
								"Media upload permission denied. Your Twitter app may need additional permissions for media upload.",
						},
						{ status: 403 },
					);
				} else if (error.message.includes("415")) {
					return NextResponse.json(
						{
							error:
								"Unsupported media type. Please use JPEG, PNG, GIF, or WebP images.",
						},
						{ status: 415 },
					);
				} else if (error.message.includes("413")) {
					return NextResponse.json(
						{ error: "Media file too large. Please use a smaller image." },
						{ status: 413 },
					);
				}

				return NextResponse.json(
					{ error: `Failed to upload image: ${error.message}` },
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

		console.log("Posting tweet with payload:", tweetPayload);

		const response = await fetch("https://api.x.com/2/tweets", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${user.twitterAccessToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(tweetPayload),
		});

		const responseText = await response.text();
		console.log("Tweet post response:", {
			status: response.status,
			statusText: response.statusText,
			body: responseText,
		});

		if (!response.ok) {
			return NextResponse.json(
				{
					error: `Twitter API error: ${response.status} ${responseText}`,
				},
				{ status: response.status },
			);
		}

		const data = JSON.parse(responseText);

		const tweetData = data?.data ?? {};
		const twitterTweetId = tweetData?.id as string | undefined;
		const returnedText = (tweetData?.text as string | undefined) ?? text;

		if (twitterTweetId) {
			try {
				await db.insert(tweets).values({
					userId: user.id,
					twitterTweetId,
					text: returnedText,
					replyToTweetId: replyToTweetId || null,
					mediaId: mediaId || null,
				});
				console.log("Tweet logged to database", { twitterTweetId, userId: user.id });
			} catch (insertError) {
				console.error("Failed to log tweet to database", insertError);
			}
		} else {
			console.warn("Tweet response missing id; skipping database insert", data);
		}

		return NextResponse.json({
			...data,
			isReply: !!replyToTweetId,
			replyToTweetId: replyToTweetId || null,
			hasMedia: !!mediaId,
			mediaId: mediaId,
		});
	} catch (error: any) {
		console.error("Twitter API error:", error);
		return NextResponse.json(
			{ error: `Internal server error: ${error.message}` },
			{ status: 500 },
		);
	}
}
