import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
	id: uuid("id").primaryKey().defaultRandom(),
	email: text("email").unique().notNull(),
	name: text("name"),
	twitterAccessToken: text("twitter_access_token"),
	twitterRefreshToken: text("twitter_refresh_token"),
	twitterTokenExpiry: timestamp("twitter_token_expiry"),
	twitterUserId: text("twitter_user_id"),
	twitterUsername: text("twitter_username"),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});

export const oauthSessions = pgTable("oauth_sessions", {
	id: uuid("id").primaryKey().defaultRandom(),
	state: text("state").notNull().unique(),
	codeVerifier: text("code_verifier").notNull(),
	userId: uuid("user_id"), // Optional: link to user if you have authentication
	createdAt: timestamp("created_at").defaultNow(),
	expiresAt: timestamp("expires_at").notNull(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
	id: uuid("id").primaryKey().defaultRandom(),
	email: text("email").notNull(),
	token: text("token").notNull().unique(),
	expires: timestamp("expires").notNull(),
});

export const tweets = pgTable("tweets", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id),
	twitterTweetId: text("twitter_tweet_id").notNull().unique(),
	text: text("text").notNull(),
	replyToTweetId: text("reply_to_tweet_id"),
	mediaId: text("media_id"),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});
