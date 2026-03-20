import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { MarketClient } from "./market-client";

export default async function MarketplacePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  return <MarketClient />;
}
