import { NextRequest, NextResponse } from "next/server";
import { listRecentTrades } from "@/lib/trading-store";

export async function GET(req: NextRequest) {
  const marketId = req.nextUrl.searchParams.get("market") ?? undefined;
  const limitParam = req.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : 40;

  const trades = await listRecentTrades(Number.isFinite(limit) ? limit : 40, marketId);
  return NextResponse.json({ trades });
}
