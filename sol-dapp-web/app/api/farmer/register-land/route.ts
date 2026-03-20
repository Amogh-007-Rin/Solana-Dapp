import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserByEmail } from "@/lib/user-store";

function randomHex() {
  return `${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "")}`;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const appUser = await getUserByEmail(session.user.email);
  if (!appUser || appUser.participantType !== "farmer") {
    return NextResponse.json({ message: "Only farmers can register land" }, { status: 403 });
  }

  const body = (await req.json()) as {
    landName?: string;
    landAreaAcres?: number;
    biomassIndex?: number;
    walletAddress?: string;
  };

  if (!body.landName || typeof body.landAreaAcres !== "number" || typeof body.biomassIndex !== "number") {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  if (body.landAreaAcres <= 0 || body.biomassIndex <= 0) {
    return NextResponse.json({ message: "Area and biomass must be greater than zero" }, { status: 400 });
  }

  const creditsToMint = Math.max(1, Math.floor(body.landAreaAcres * body.biomassIndex * 3.2));
  const nftId = `LAND-NFT-${Date.now()}`;
  const certUri = `https://rootchain.mock/certificates/${nftId}`;

  const result = {
    verificationStatus: "verified",
    nft: {
      id: nftId,
      name: `${body.landName} Land Verification NFT`,
      metadataUri: certUri,
      image: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800&q=80",
      issuedAt: new Date().toISOString(),
    },
    carbonCredits: {
      tokenSymbol: "rCO2",
      amount: creditsToMint,
      mintAddress: "Rc02MockMint11111111111111111111111111111111",
      transferStatus: body.walletAddress ? "transferred_to_wallet" : "wallet_not_connected",
      recipientWallet: body.walletAddress ?? null,
      transferTx: body.walletAddress ? randomHex() : null,
    },
    metrics: {
      landAreaAcres: body.landAreaAcres,
      biomassIndex: body.biomassIndex,
      calculation: `${body.landAreaAcres} * ${body.biomassIndex} * 3.2`,
    },
  };

  return NextResponse.json(result);
}
