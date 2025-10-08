import { NextRequest, NextResponse } from "next/server";
import { db } from "@/drizzle";
import { users } from "@/drizzle/schema";
import {
	and,
	count,
	desc,
	gt,
	ilike,
	isNotNull,
	isNull,
	lt,
	or,
} from "drizzle-orm";

const MAX_PAGE_SIZE = 100;

export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const pageParam = Number(searchParams.get("page")) || 1;
		const pageSizeParam = Number(searchParams.get("pageSize")) || 20;
		const statusFilter = (searchParams.get("status") || "all").toLowerCase();
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

		const appendSearch = (condition?: any) => {
			if (condition && searchCondition) {
				return and(condition, searchCondition);
			}
			return searchCondition ?? condition ?? undefined;
		};

		const selectFields = {
			id: users.id,
			name: users.name,
			email: users.email,
			twitterUsername: users.twitterUsername,
			twitterUserId: users.twitterUserId,
			twitterAccessToken: users.twitterAccessToken,
			twitterTokenExpiry: users.twitterTokenExpiry,
			createdAt: users.createdAt,
			updatedAt: users.updatedAt,
		};

		let allUsers;
		let totalCountQuery;

		if (statusFilter === "active") {
			const condition = and(
				isNotNull(users.twitterAccessToken),
				or(isNull(users.twitterTokenExpiry), gt(users.twitterTokenExpiry, now)),
			);
			const activeWhere = appendSearch(condition);
			const baseQuery = db.select(selectFields).from(users);
			const filteredQuery = activeWhere ? baseQuery.where(activeWhere) : baseQuery;
			allUsers = await filteredQuery
				.orderBy(desc(users.createdAt))
				.limit(pageSize)
				.offset(offset);
			const baseCount = db.select({ value: count(users.id) }).from(users);
			totalCountQuery = activeWhere ? baseCount.where(activeWhere) : baseCount;
		} else if (statusFilter === "expired") {
			const condition = and(
				isNotNull(users.twitterAccessToken),
				isNotNull(users.twitterTokenExpiry),
				lt(users.twitterTokenExpiry, now),
			);
			const expiredWhere = appendSearch(condition);
			const baseQuery = db.select(selectFields).from(users);
			const filteredQuery = expiredWhere
				? baseQuery.where(expiredWhere)
				: baseQuery;
			allUsers = await filteredQuery
				.orderBy(desc(users.createdAt))
				.limit(pageSize)
				.offset(offset);
			const baseCount = db.select({ value: count(users.id) }).from(users);
			totalCountQuery = expiredWhere ? baseCount.where(expiredWhere) : baseCount;
		} else {
			const allWhere = appendSearch();
			const baseQuery = db.select(selectFields).from(users);
			const filteredQuery = allWhere ? baseQuery.where(allWhere) : baseQuery;
			allUsers = await filteredQuery
				.orderBy(desc(users.createdAt))
				.limit(pageSize)
				.offset(offset);
			const baseCount = db.select({ value: count(users.id) }).from(users);
			totalCountQuery = allWhere ? baseCount.where(allWhere) : baseCount;
		}

		// Add computed fields for frontend
		const usersWithStatus = allUsers.map((user) => ({
			...user,
			hasValidToken:
				!!user.twitterAccessToken &&
				(!user.twitterTokenExpiry || user.twitterTokenExpiry > new Date()),
			tokenExpired:
				!!user.twitterTokenExpiry && user.twitterTokenExpiry < new Date(),
		}));

		const [{ value: totalCount }] = await totalCountQuery;
		const total = Number(totalCount ?? 0);
		const totalPages = Math.max(Math.ceil(total / pageSize), 1);

		return NextResponse.json({
			data: usersWithStatus,
			page,
			pageSize,
			total,
			totalPages,
		});
	} catch (error) {
		console.error("Error fetching all users:", error);
		return NextResponse.json(
			{
				error: "Failed to fetch users from database",
			},
			{ status: 500 },
		);
	}
}
