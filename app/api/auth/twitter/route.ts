import { generateOAuthURL } from "@/lib/utils";
import { NextResponse } from "next/server";

export async function GET() {
	try {
		const oauthUrl = await generateOAuthURL();
		return NextResponse.redirect(oauthUrl);
	} catch (error) {
		console.error("Failed to generate OAuth URL:", error);
		return NextResponse.json(
			{
				error: "Failed to initiate authentication",
			},
			{ status: 500 },
		);
	}
}
