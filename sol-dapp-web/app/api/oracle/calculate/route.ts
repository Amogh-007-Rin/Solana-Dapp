import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const aiUrl = process.env.NEXT_PUBLIC_AI_ENGINE_URL ?? "http://127.0.0.1:8000";

  try {
    const response = await fetch(`${aiUrl}/calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const text = await response.text();
    if (!response.ok) {
      return NextResponse.json(
        { message: `AI engine error (${response.status})`, details: text },
        { status: response.status },
      );
    }

    return new NextResponse(text, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to reach AI engine", details: `${error}` },
      { status: 502 },
    );
  }
}
