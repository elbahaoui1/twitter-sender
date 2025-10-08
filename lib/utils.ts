import { and, eq, gt, lt, isNotNull } from "drizzle-orm";
import crypto from "crypto";
import { db } from "@/drizzle";
import { oauthSessions, users } from "@/drizzle/schema";

const CLIENT_ID = process.env.CLIENT_ID!;
const CLIENT_SECRET = process.env.CLIENT_SECRET!;
const REDIRECT_URI = process.env.REDIRECT_URI!;

export async function generateStaticOAuthURL(): Promise<string> {
  const staticCodeVerifier =
    "static-permanent-code-verifier-1234567890123456789012345678901234567890";
  const codeChallenge = crypto
    .createHash("sha256")
    .update(staticCodeVerifier)
    .digest("base64url");

  const staticState = "static-permanent-state";

  const params = new URLSearchParams({
    scope: "tweet.read tweet.write offline.access users.read",
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    state: staticState,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return `https://x.com/i/oauth2/authorize?${params.toString()}`;
}

export async function generateOAuthURL(): Promise<string> {
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");

  const state = crypto.randomBytes(32).toString("base64url");

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await db.insert(oauthSessions).values({
    state,
    codeVerifier,
    expiresAt,
  });

  await db.delete(oauthSessions).where(lt(oauthSessions.expiresAt, new Date()));

  const params = new URLSearchParams({
    scope: "tweet.read tweet.write offline.access users.read",
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return `https://x.com/i/oauth2/authorize?${params.toString()}`;
}

export async function getOAuthSession(state: string) {
  if (state === "static-permanent-state") {
    return {
      id: "static-session",
      state: "static-permanent-state",
      codeVerifier:
        "static-permanent-code-verifier-1234567890123456789012345678901234567890",
      expiresAt: null,
    };
  }

  const sessions = await db
    .select()
    .from(oauthSessions)
    .where(eq(oauthSessions.state, state))
    .limit(1);

  if (sessions.length === 0) {
    return null;
  }

  const session = sessions[0];

  if (session.expiresAt < new Date()) {
    await db.delete(oauthSessions).where(eq(oauthSessions.id, session.id));
    return null;
  }

  return session;
}

export async function exchangeCodeForToken(code: string, codeVerifier: string) {
  const tokenUrl = "https://api.x.com/2/oauth2/token";

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    code: code,
    code_verifier: codeVerifier,
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")}`,
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Token exchange error:", errorText);
    throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
  }

  return await response.json();
}

export async function getUserFromX(accessToken: string) {
  const response = await fetch("https://api.x.com/2/users/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get user info: ${response.status}`);
  }

  return await response.json();
}

export async function makeXAPIRequest(
  endpoint: string,
  accessToken: string,
  options: RequestInit = {},
) {
  const response = await fetch(`https://api.x.com/2/${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`X API request failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

export async function postTweet(accessToken: string, text: string) {
  return makeXAPIRequest("tweets", accessToken, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export async function refreshTwitterToken(refreshToken: string) {
  const client_id = "eVJiSmdMS1ZlSnowb0luMGVfYUY6MTpjaQ";
  const client_secret = "9XDpj97fE_PtRlaRfUmtRzYzuCSze7DwcEqDcjT6ZKEGspJtxv"
  const response = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${client_id}:${client_secret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: client_id,
    }),
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status}`);
  }

  return response.json();
}

export async function getAuthenticatedTwitterUser(userId?: string) {
  if (userId) {
    const result = await db
      .select()
      .from(users)
      .where(
        and(
          isNotNull(users.twitterAccessToken),
          gt(users.twitterTokenExpiry, new Date()),
          eq(users.id, userId),
        ),
      )
      .limit(1);
    return result[0] || null;
  }

  const result = await db
    .select()
    .from(users)
    .where(
      and(
        isNotNull(users.twitterAccessToken),
        gt(users.twitterTokenExpiry, new Date()),
      ),
    )
    .orderBy(users.updatedAt)
    .limit(1);
  return result[0] || null;
}

export async function refreshTokenIfNeeded(user: any) {
  if (!user.twitterRefreshToken) {
    throw new Error("No refresh token available");
  }

  if (user.twitterTokenExpiry && user.twitterTokenExpiry < new Date()) {
    const response = await fetch("https://api.x.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: user.twitterRefreshToken,
        client_id: process.env.X_CLIENT_ID!,
      }),
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status}`);
    }

    const tokenData = await response.json();

    await db
      .update(users)
      .set({
        twitterAccessToken: tokenData.access_token,
        twitterRefreshToken: tokenData.refresh_token,
        twitterTokenExpiry: new Date(Date.now() + tokenData.expires_in * 1000),
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return tokenData.access_token;
  }

  return user.twitterAccessToken;
}
