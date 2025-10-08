import { NextRequest, NextResponse } from "next/server";
import { generateOAuthURL } from "@/lib/utils";

export async function GET(request: NextRequest) {
	console.log("Short OAuth redirect accessed at:", new Date().toISOString());
	const oauthUrl = await generateOAuthURL();
	return NextResponse.redirect(oauthUrl);
}
