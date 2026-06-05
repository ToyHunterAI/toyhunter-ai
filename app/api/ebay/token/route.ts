import { NextResponse } from "next/server";

export async function GET() {
  try {
    const clientId = process.env.EBAY_CLIENT_ID?.trim();
    const clientSecret = process.env.EBAY_CLIENT_SECRET?.trim();

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { success: false, error: "Missing eBay keys" },
        { status: 500 }
      );
    }

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
      "base64"
    );

    const response = await fetch(
      "https://api.sandbox.ebay.com/identity/v1/oauth2/token",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          scope: "https://api.ebay.com/oauth/api_scope",
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        status: response.status,
        error: data,
      });
    }

    return NextResponse.json({
      success: true,
      status: response.status,
      token_type: data.token_type,
      expires_in: data.expires_in,
      access_token_preview: `${data.access_token.slice(0, 12)}...`,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}