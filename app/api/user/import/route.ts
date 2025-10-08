import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/drizzle";
import { users } from "@/drizzle/schema";
import { inArray } from "drizzle-orm";

const LEGACY_ENTRY_REGEX = /Utilisateur:\s*@([^\r\n]+)[\s\S]*?Access token:\s*([^\r\n]+)[\s\S]*?Refresh token:\s*([^\r\n]+)[\s\S]*?(?:Expires in:\s*\d+s|$)/gi;
const MODERN_ENTRY_REGEX = /User:\s*@([^\r\n]+)[\s\S]*?Access token:\s*([^\r\n]+)[\s\S]*?Refresh token:\s*([^\r\n]+)[\s\S]*?(?:Scope:|Logged at|$)/gi;
const ENTRY_PATTERNS = [LEGACY_ENTRY_REGEX, MODERN_ENTRY_REGEX];

type ParsedEntry = {
	username: string;
	accessToken: string;
	refreshToken: string;
};

function sanitizeUsername(raw: string) {
	return raw.replace(/@/g, "").trim();
}

function generateEmail(username: string) {
	const slug = username.toLowerCase().replace(/[^a-z0-9]+/g, "") || "import";
	return `${slug}-${crypto.randomUUID()}@import.local`;
}

function extractEntries(messages: string): ParsedEntry[] {
	const entries: ParsedEntry[] = [];
	const seenKeys = new Set<string>();

	for (const pattern of ENTRY_PATTERNS) {
		pattern.lastIndex = 0;
		for (const match of messages.matchAll(pattern)) {
			const username = match[1]?.trim();
			const accessToken = match[2]?.trim();
			const refreshToken = match[3]?.trim();

			if (!username || !accessToken || !refreshToken) {
				continue;
			}

			const key = `${username}|${accessToken}|${refreshToken}`;
			if (seenKeys.has(key)) {
				continue;
			}

			entries.push({ username, accessToken, refreshToken });
			seenKeys.add(key);
		}
	}

	return entries;
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json().catch(() => null);
		const messages = body?.messages;

		if (!messages || typeof messages !== "string") {
			return NextResponse.json(
				{ error: "Request body must include a 'messages' string." },
				{ status: 400 },
			);
		}

		const entries = extractEntries(messages);

		if (entries.length === 0) {
			return NextResponse.json(
				{ error: "No valid OAuth entries found in provided messages." },
				{ status: 400 },
			);
		}

		const seenUsernames = new Set<string>();

		const results: Array<{
			username: string;
			inserted?: boolean;
			skipped?: boolean;
			reason?: string;
			error?: string;
			userId?: string;
		}> = [];

		const sanitizedUsernames = Array.from(
			new Set(
				entries
					.map((entry) => entry.username)
					.filter((raw) => typeof raw === "string" && raw.trim().length > 0)
					.map((raw) => sanitizeUsername(raw)),
			),
		);

		let existingUsernames = new Set<string>();
		if (sanitizedUsernames.length > 0) {
			const existingRecords = await db
				.select({ username: users.twitterUsername })
				.from(users)
				.where(inArray(users.twitterUsername, sanitizedUsernames));
			existingUsernames = new Set(
				existingRecords
					.map((record) => record.username)
					.filter((value): value is string => !!value),
			);
		}

		for (const entry of entries) {
			const rawUsername = entry.username;
			const accessToken = entry.accessToken;
			const refreshToken = entry.refreshToken;

			if (!rawUsername || !accessToken || !refreshToken) {
				results.push({
					username: rawUsername ?? "unknown",
					error: "Missing username or token details",
				});
				continue;
			}

			const username = sanitizeUsername(rawUsername);
			const email = generateEmail(username);
			const expiry = new Date(0); // mark as expired

			if (existingUsernames.has(username) || seenUsernames.has(username)) {
				results.push({
					username,
					skipped: true,
					reason: "Username already exists",
				});
				continue;
			}

			try {
				const inserted = await db
					.insert(users)
					.values({
						email,
						name: username,
						twitterUsername: username,
						twitterAccessToken: accessToken.trim(),
						twitterRefreshToken: refreshToken.trim(),
						twitterTokenExpiry: expiry,
					})
					.returning({ id: users.id });

				results.push({
					username,
					inserted: true,
					userId: inserted[0]?.id,
				});
				seenUsernames.add(username);
			} catch (error: any) {
				console.error("Failed to insert imported user", error);
				results.push({
					username,
					error: error.message || "Failed to insert user",
				});
			}
		}

		const insertedCount = results.filter((item) => item.inserted).length;
		const skippedCount = results.filter((item) => item.skipped).length;
		const errorCount = results.length - insertedCount - skippedCount;

		return NextResponse.json({
			processed: results.length,
			inserted: insertedCount,
			skipped: skippedCount,
			errors: errorCount,
			results,
		});
	} catch (error) {
		console.error("Bulk user import error", error);
		return NextResponse.json(
			{ error: "Unexpected error processing messages" },
			{ status: 500 },
		);
	}
}
