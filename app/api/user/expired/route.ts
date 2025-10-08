import { NextRequest, NextResponse } from "next/server";
import { desc, lt, and, isNotNull, count, or, ilike } from "drizzle-orm";
import { db } from "@/drizzle";
import { users } from "@/drizzle/schema";

const MAX_PAGE_SIZE = 100;

export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const pageParam = Number(searchParams.get("page")) || 1;
		const pageSizeParam = Number(searchParams.get("pageSize")) || 20;
		const page = Math.max(pageParam, 1);
		const pageSize = Math.min(Math.max(pageSizeParam, 1), MAX_PAGE_SIZE);
		const offset = (page - 1) * pageSize;
		const now = new Date();
		const searchTerm = searchParams.get("q")?.trim();
		const likePattern = searchTerm ? `%${searchTerm}%` : null;
		const searchCondition = likePattern
			? or(
					 ilike(users.email, likePattern),
					 ilike(users.twitterUsername, likePattern),
					 ilike(users.name, likePattern),
				)
			: null;

		let whereClause = and(
			isNotNull(users.twitterAccessToken),
			isNotNull(users.twitterTokenExpiry),
			lt(users.twitterTokenExpiry, now),
		);

		if (searchCondition) {
			whereClause = and(whereClause, searchCondition);
		}
		const expiredUsers = await db
			.select({
				id: users.id,
				name: users.name,
				email: users.email,
				twitterUsername: users.twitterUsername,
				twitterUserId: users.twitterUserId,
				twitterAccessToken: users.twitterAccessToken,
				twitterTokenExpiry: users.twitterTokenExpiry,
				createdAt: users.createdAt,
				updatedAt: users.updatedAt,
			})
			.from(users)
			.where(whereClause)
			.orderBy(desc(users.updatedAt))
			.limit(pageSize)
			.offset(offset);

		const formatted = expiredUsers.map((user) => ({
			...user,
			tokenExpired: true,
			hasValidToken: false,
		}));

		const [{ value: totalCount }] = await db
			.select({ value: count(users.id) })
			.from(users)
			.where(whereClause);
		const total = Number(totalCount ?? 0);
		const totalPages = Math.max(Math.ceil(total / pageSize), 1);

		return NextResponse.json({
			data: formatted,
			page,
			pageSize,
			total,
			totalPages,
		});
	} catch (error) {
		console.error("Error fetching expired users:", error);
		return NextResponse.json(
			{ error: "Failed to fetch expired users" },
			{ status: 500 },
		);
	}
}
