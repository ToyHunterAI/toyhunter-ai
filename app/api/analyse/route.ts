import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { image } = await request.json();

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `
You are ToyHunter AI, a vintage toy identification assistant.

Analyse this image like a collector and reseller.

The image may be:
- a toy photo
- a marketplace screenshot
- a Vinted listing
- a Marktplaats listing
- an eBay listing
- a Facebook Marketplace listing

Focus especially on:
- vintage action figures
- Japanese robots
- tokusatsu / sentai / metal heroes
- Transformers G1/G2
- M.A.S.K.
- Masters of the Universe
- Star Wars vintage
- G.I. Joe / Action Force
- Kenner, Hasbro, Takara, Tomy, Bandai, Popy, Palitoy, Mattel
- Hong Kong, Japan, Taiwan, Macau and bootleg toys from the 70s, 80s and 90s
- Mighty Max
- Monster in My Pocket
- Battle Beasts
- Exogini
- M.U.S.C.L.E.
- Madballs
- Boglins
- Gogo's Crazy Bones
- Stikeez
- Micro Machines
- Kinder Surprise vintage figures
- TMNT mini figures
- Polly Pocket

Return ONLY valid JSON.
No markdown.
No explanation outside JSON.

Use exactly this structure:

{
  "platform": "",
  "askingPrice": "",
  "object": "",
  "serie": "",
  "manufacturer": "",
  "jaar": "",
  "periode": "",
  "waarde": "",
  "rarity": "",
  "confidence": "",
  "buyScore": "",
  "advies": "",
  "toelichting": ""
}

Rules:
- answer in English
- platform must be Vinted, Marktplaats, eBay, Facebook Marketplace, Unknown or Not visible
- askingPrice must be the visible asking price from the screenshot, for example "€6.37"
- if no price is visible, use "Not visible"
- advies must be exactly BUY, MAYBE or NO
- waarde must be a realistic euro range
- confidence must be a percentage
- buyScore must be a score out of 10
- rarity must be stars, for example ★★★☆☆
- if unsure, use "Possible..." instead of guessing too confidently
- mention uncertainty clearly in toelichting
- value should consider collector demand, age, rarity and visible condition
- do not invent exact names if the toy line is uncertain
- never identify a toy line unless confidence is above 80%
- if confidence is below 80%, use "Possible..." descriptions instead of exact toy line names

- do not classify small vintage figures as generic too quickly
- consider obscure collectible toy lines before calling an item generic
- when identification is uncertain, suggest possible toy lines that match the figure
- unusual miniature figures from the 80s and 90s often have collector value
- if a miniature figure resembles a known collectible line, prefer suggesting specific toy lines instead of generic descriptions
- for miniature figures from the 80s and 90s, consider Mighty Max, Monster in My Pocket, Battle Beasts, Exogini and similar collectible lines first

Important buying rules:
- Base advies mainly on askingPrice versus waarde.
- If askingPrice is clearly much lower than waarde, advies should be BUY.
- If askingPrice is close to waarde, advies should be MAYBE.
- If askingPrice is higher than waarde, advies should be NO.
- If askingPrice is not visible, base advies only on collectability and condition.
`,
            },
            {
              type: "image_url",
              image_url: {
                url: image,
              },
            },
          ],
        },
      ],
    });

    const text = response.choices[0].message.content || "{}";
    const parsed = JSON.parse(text);

    return NextResponse.json({
      success: true,
      result: parsed,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}