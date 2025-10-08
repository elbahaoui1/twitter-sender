This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:


## OAuth reliability notes

- Ensure that the environment variable `REDIRECT_URI` exactly matches the callback registered in the X Developer Portal, including protocol and host (no `www` vs apex mismatch). Example: `https://mele.markets/api/auth/callback/twitter`.
- Avoid using a single static `state` and PKCE code challenge across users. Static values can cause collisions and intermittent `error=access_denied` or missing `code` in callbacks if the provider invalidates or reuses sessions. This repo uses `generateOAuthURL()` to create unique `state` and PKCE values per initiation.
- If users cancel or deny consent, the callback will contain `?error=access_denied&state=...`. We now detect this and exit gracefully.

## Expired accounts dashboard


## Tweet logging

- Every successful tweet (including quick tweets from `/expired`) is now recorded in the `tweets` table with the Twitter tweet ID, body text, media ID, and reply metadata.
- After pulling the latest code run your Drizzle migration sync (e.g. `pnpm drizzle-kit push`) so the new table is created before posting new tweets.
- Visit `/tweets` to browse the most recent posts, search by text or author, and audit who published what.
### Quick tweet removal

- The login dashboard’s delete-tweet panel now includes the same user search, so you can look up an active account by email or username before deleting by tweet ID.
- Paste raw OAuth success messages at `/import-users` to bootstrap users whose tokens are already expired.
- The importer parses each “Utilisateur / Access token / Refresh token” block, generates a unique placeholder email, saves the tokens, and marks the expiry in the past.
- Modern “✨ New OAuth connection!” messages are supported too—just paste the log and we’ll extract the user, access token, and refresh token automatically.
- Existing usernames are automatically skipped so re-importing logs won't overwrite or duplicate accounts; the API returns a `skipped` count for easy auditing.
- The backing API endpoint is `POST /api/user/import`, which returns a summary of inserted and failed records for auditing.
You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
