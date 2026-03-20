"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { MarketListing, MarketTrade } from "@/lib/trading-store";

interface IndustrialistUser {
  name: string;
  email: string;
}

export function IndustrialistDashboardClient({ user }: { user: IndustrialistUser }) {
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [trades, setTrades] = useState<MarketTrade[]>([]);

  useEffect(() => {
    async function loadData() {
      const [listingsRes, tradesRes] = await Promise.all([
        fetch("/api/market/listings", { cache: "no-store" }),
        fetch("/api/market/trades?limit=20", { cache: "no-store" }),
      ]);
      const listingsData = (await listingsRes.json()) as { listings?: MarketListing[] };
      const tradesData = (await tradesRes.json()) as { trades?: MarketTrade[] };
      setListings(listingsData.listings ?? []);
      setTrades(tradesData.trades ?? []);
    }
    void loadData();
  }, []);

  const metrics = useMemo(() => {
    const listed = listings.reduce((sum, item) => sum + item.quantityAvailable, 0);
    const volume = trades.reduce((sum, item) => sum + item.totalValueUsd, 0);
    return {
      listed,
      volume,
      activeListings: listings.length,
    };
  }, [listings, trades]);

  return (
    <main className="min-h-screen bg-[#020817] text-white">
      <div className="pointer-events-none fixed inset-0 bg-dot-grid opacity-20" />
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <header className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/70 px-5 py-4">
          <p className="text-xs uppercase tracking-[0.16em] text-cyan-300">Industrialist Dashboard</p>
          <h1 className="mt-1 text-xl font-bold">Carbon Credit Demand and Trading Console</h1>
          <p className="text-xs text-slate-500">{user.name} · {user.email}</p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link href="/marketplace/trade" className="rounded-lg bg-cyan-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-cyan-500">
              Open Trading Desk
            </Link>
            <Link href="/marketplace" className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 transition hover:text-white">
              Market Overview
            </Link>
          </div>
        </header>

        <section className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
            <p className="text-[11px] uppercase tracking-wider text-slate-600">Active Listings</p>
            <p className="mt-1 font-mono text-2xl font-bold text-white">{metrics.activeListings}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
            <p className="text-[11px] uppercase tracking-wider text-slate-600">Tokens Available</p>
            <p className="mt-1 font-mono text-2xl font-bold text-cyan-300">{metrics.listed.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
            <p className="text-[11px] uppercase tracking-wider text-slate-600">Recent Trade Volume</p>
            <p className="mt-1 font-mono text-2xl font-bold text-emerald-300">${metrics.volume.toFixed(2)}</p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="text-sm font-bold">Recent Trades</h2>
          <ul className="mt-3 space-y-2">
            {trades.slice(0, 10).map((trade) => (
              <li key={trade.id} className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs">
                <p className="text-slate-300">{trade.quantity} tokens at ${trade.pricePerToken.toFixed(2)}</p>
                <p className="font-mono text-[11px] text-slate-500">Buyer: {trade.buyerEmail}</p>
              </li>
            ))}
            {trades.length === 0 && (
              <li className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-4 text-center text-xs text-slate-500">
                No trade activity yet. Open the trading desk to execute first order.
              </li>
            )}
          </ul>
        </section>
      </div>
    </main>
  );
}
