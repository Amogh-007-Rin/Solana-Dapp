import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { TradeClient } from "./trade-client";

interface TradePageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function TradePage({ searchParams }: TradePageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  const resolved = (await searchParams) ?? {};
  const market = typeof resolved.market === "string" ? resolved.market : "";

  return <TradeClient initialMarketId={market} />;
}
