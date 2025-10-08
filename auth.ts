import NextAuth from "next-auth";
import Twitter from "next-auth/providers/twitter";
import { users } from "@/drizzle/schema";
import { db } from "./drizzle";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";

export const { handlers, auth, signIn, signOut } = NextAuth({
	adapter: DrizzleAdapter(db),
	providers: [
		Twitter({
			clientId: process.env.TWITTER_API_KEY!,
			clientSecret: process.env.TWITTER_API_SECRET!,
			authorization: {
				url: "https://x.com/i/oauth2/authorize",
				params: {
					scope:
						"tweet.read tweet.write users.read follows.write like.write list.write dm.write media.write offline.access",
				},
			},
		}),
	],
	callbacks: {
		async session({ session, user }) {
			try {
				const u = await db
					.select()
					.from(users)
					.where(eq(users.id, user.id))
					.limit(1);

				return {
					...session,
					twitter: u[0] || null,
				};
			} catch (error) {
				console.error("Error fetching user data:", error);
				return { ...session, twitter: null };
			}
		},
	},
});
