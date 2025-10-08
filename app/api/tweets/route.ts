import { NextRequest, NextResponse } from "next/server";
import { db } from "@/drizzle";
import { tweets, users } from "@/drizzle/schema";
import { count, desc, eq, ilike, or } from "drizzle-orm";

const MAX_PAGE_SIZE = 100;

export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const pageParam = Number(searchParams.get("page")) || 1;
		const pageSizeParam = Number(searchParams.get("pageSize")) || 20;
		const searchTerm = searchParams.get("q")?.trim();
		const page = Math.max(pageParam, 1);
		const pageSize = Math.min(Math.max(pageSizeParam, 1), MAX_PAGE_SIZE);
		const offset = (page - 1) * pageSize;

		const likePattern = searchTerm ? `%${searchTerm}%` : null;
		const searchCondition = likePattern
			? or(
					 ilike(tweets.text, likePattern),
					 ilike(users.email, likePattern),
					 ilike(users.name, likePattern),
					 ilike(users.twitterUsername, likePattern),
				 )
			: null;

		const baseSelection = db
			.select({
				id: tweets.id,
				twitterTweetId: tweets.twitterTweetId,
				text: tweets.text,
				replyToTweetId: tweets.replyToTweetId,
				mediaId: tweets.mediaId,
				createdAt: tweets.createdAt,
				userId: tweets.userId,
				userName: users.name,
				userEmail: users.email,
				userTwitterUsername: users.twitterUsername,
			})
			.from(tweets)
			.leftJoin(users, eq(tweets.userId, users.id));

		const dataQuery = searchCondition
			? baseSelection.where(searchCondition)
			: baseSelection;

		const data = await dataQuery
			.orderBy(desc(tweets.createdAt))
			.limit(pageSize)
			.offset(offset);

		const baseCountQuery = db
			.select({ value: count(tweets.id) })
			.from(tweets)
			.leftJoin(users, eq(tweets.userId, users.id));

		const countQuery = searchCondition
			? baseCountQuery.where(searchCondition)
			: baseCountQuery;

		const [{ value: totalCount }] = await countQuery;

		const total = Number(totalCount ?? 0);
		const totalPages = Math.max(Math.ceil(total / pageSize), 1);

		return NextResponse.json({
			data,
			page,
			pageSize,
			total,
			totalPages,
		});
	} catch (error) {
		console.error("Error fetching tweets:", error);
		return NextResponse.json(
			{ error: "Failed to fetch tweets" },
			{ status: 500 },
		);
	}
}
