import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import {
  buildRetireCreditsIx,
  deriveFarmPda,
  deriveOwnerToken2022Ata,
} from "@/lib/program-instructions";

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

const ACTIONS_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function GET() {
  return NextResponse.json(
    {
      title: "Retire Carbon Credits",
      icon: "https://dummyimage.com/128x128/0f172a/ffffff.png&text=CO2",
      description: "Build and sign a transaction to retire carbon credits from your wallet.",
      label: "Retire Credits",
      links: {
        actions: [
          {
            label: "Retire 1 CO2",
            href: "/api/actions/retire?amount=1",
          },
          {
            label: "Retire 10 CO2",
            href: "/api/actions/retire?amount=10",
          },
        ],
      },
    },
    { headers: ACTIONS_CORS_HEADERS },
  );
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: ACTIONS_CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  const amount = Number(req.nextUrl.searchParams.get("amount") ?? "1");
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { message: "Invalid amount. Must be > 0." },
      { status: 400, headers: ACTIONS_CORS_HEADERS },
    );
  }

  const body = await req.json();
  const account = body?.account as string | undefined;
  const programIdStr =
    process.env.NEXT_PUBLIC_PROGRAM_ID ??
    process.env.PROGRAM_ID ??
    "8qJjY3qeJc9cTGw3GRW7xVfN32B2j3YkM3p6N5cm6QkM";
  const co2MintStr = process.env.NEXT_PUBLIC_CO2_MINT ?? process.env.CO2_MINT;

  if (!account) {
    return NextResponse.json(
      { message: "Missing account in request body" },
      { status: 400, headers: ACTIONS_CORS_HEADERS },
    );
  }

  if (!co2MintStr) {
    return NextResponse.json(
      { message: "CO2 mint is missing. Set NEXT_PUBLIC_CO2_MINT in env." },
      { status: 500, headers: ACTIONS_CORS_HEADERS },
    );
  }

  let payer: PublicKey;
  let programId: PublicKey;
  let co2Mint: PublicKey;
  try {
    payer = new PublicKey(account);
    programId = new PublicKey(programIdStr);
    co2Mint = new PublicKey(co2MintStr);
  } catch {
    return NextResponse.json(
      { message: "Invalid account/program/mint public key" },
      { status: 400, headers: ACTIONS_CORS_HEADERS },
    );
  }

  const farmPda = deriveFarmPda(payer, programId);
  const ownerTokenAccount = deriveOwnerToken2022Ata(payer, co2Mint);

  const connection = new Connection(RPC_URL, "confirmed");
  const latestBlockhash = await connection.getLatestBlockhash();

  const tx = new Transaction({
    feePayer: payer,
    blockhash: latestBlockhash.blockhash,
    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
  });

  tx.add(
    buildRetireCreditsIx({
      programId,
      owner: payer,
      farmPda,
      co2Mint,
      ownerTokenAccount,
      amount: BigInt(amount),
    }),
  );

  const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64");

  return NextResponse.json(
    {
      transaction: serialized,
      message: `Prepared retire transaction for ${amount} CO2 credits.`,
    },
    { headers: ACTIONS_CORS_HEADERS },
  );
}
