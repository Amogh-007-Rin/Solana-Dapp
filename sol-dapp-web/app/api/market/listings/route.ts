import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserByEmail } from "@/lib/user-store";
import { createListing, getMarketStats, listOpenListings } from "@/lib/trading-store";

export async function GET(req: NextRequest) {
  const marketId = req.nextUrl.searchParams.get("market") ?? undefined;
  const listings = await listOpenListings(marketId);
  const stats = await getMarketStats();
  return NextResponse.json({ listings, stats });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const appUser = await getUserByEmail(session.user.email);
  if (!appUser) {
    return NextResponse.json({ message: "User profile not found" }, { status: 404 });
  }

  if (appUser.participantType !== "farmer") {
    return NextResponse.json({ message: "Only farmers can create listings" }, { status: 403 });
  }

  const body = (await req.json()) as {
    marketId?: string;
    pricePerToken?: number;
    quantityAvailable?: number;
    minPurchase?: number;
    sellerWallet?: string;
  };

  if (!body.marketId || typeof body.pricePerToken !== "number" || typeof body.quantityAvailable !== "number") {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  try {
    const listing = await createListing({
      marketId: body.marketId,
      sellerEmail: appUser.email,
      sellerName: appUser.name,
      sellerWallet: body.sellerWallet,
      pricePerToken: body.pricePerToken,
      quantityAvailable: body.quantityAvailable,
      minPurchase: body.minPurchase,
    });

    return NextResponse.json({ listing });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to create listing" },
      { status: 400 },
    );
  }
}
