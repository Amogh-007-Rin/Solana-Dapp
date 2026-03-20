import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { executeTrade } from "@/lib/trading-store";
import { getUserByEmail } from "@/lib/user-store";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const appUser = await getUserByEmail(session.user.email);
  if (!appUser) {
    return NextResponse.json({ message: "User profile not found" }, { status: 404 });
  }

  const body = (await req.json()) as { listingId?: string; quantity?: number };
  if (!body.listingId || typeof body.quantity !== "number") {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  try {
    const result = await executeTrade({
      listingId: body.listingId,
      buyerEmail: appUser.email,
      buyerName: appUser.name,
      quantity: body.quantity,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Trade execution failed" },
      { status: 400 },
    );
  }
}
