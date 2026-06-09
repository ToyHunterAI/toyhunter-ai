import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const EBAY_CLIENT_ID = process.env.EBAY_CLIENT_ID!;
const EBAY_CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET!;

export async function GET() {
  try {
    const credentials = Buffer.from(
      `${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`
    ).toString("base64");

    const tokenRes = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        scope: "https://api.ebay.com/oauth/api_scope",
      }),
      cache: "no-store",
    });

    const tokenText = await tokenRes.text();

    if (!tokenRes.ok) {
      return NextResponse.json({
        step: "token",
        ok: false,
        status: tokenRes.status,
        response: tokenText,
      });
    }

    const tokenData = JSON.parse(tokenText);
    const token = tokenData.access_token;

    const searchRes = await fetch(
      "https://api.ebay.com/buy/browse/v1/item_summary/search?q=Transformers%20G1&limit=3",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
          "X-EBAY-C-ENDUSERCTX": "contextualLocation=country=US,zip=10001",
        },
        cache: "no-store",
      }
    );

    const searchText = await searchRes.text();

    return NextResponse.json({
      step: "search",
      tokenOk: true,
      searchOk: searchRes.ok,
      searchStatus: searchRes.status,
      response: searchText,
    });
  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      error: error.message,
    });
  }
}