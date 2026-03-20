"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CARBON_MARKETS, MARKET_BY_ID } from "@/lib/market-data";
import type { MarketListing, MarketTrade } from "@/lib/trading-store";

type ParticipantType = "farmer" | "industrialist";

interface AppUser {
  id: string;
  email: string;
  name: string;
  role: "operator" | "admin" | "auditor";
  participantType: ParticipantType;
}

interface TradeClientProps {
  initialMarketId?: string;
}

interface NewListingDraft {
  marketId: string;
  pricePerToken: number;
  quantityAvailable: number;
  minPurchase: number;
}

const DEFAULT_DRAFT: NewListingDraft = {
  marketId: CARBON_MARKETS[0]?.id ?? "",
  pricePerToken: 12,
  quantityAvailable: 300,
  minPurchase: 25,
};

export function TradeClient({ initialMarketId }: TradeClientProps) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [trades, setTrades] = useState<MarketTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMarket, setSelectedMarket] = useState(initialMarketId || "");
  const [draft, setDraft] = useState<NewListingDraft>({
    ...DEFAULT_DRAFT,
    marketId: initialMarketId || DEFAULT_DRAFT.marketId,
  });
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState<"ok" | "error">("ok");
  const [busyListing, setBusyListing] = useState<string | null>(null);
  const [listingQty, setListingQty] = useState<Record<string, number>>({});
  const [publishing, setPublishing] = useState(false);
  const [updatingType, setUpdatingType] = useState(false);

  function toast(message: string, type: "ok" | "error") {
    setStatusType(type);
    setStatus(message);
    window.setTimeout(() => setStatus(""), 3500);
  }

  const filteredListings = useMemo(() => {
    if (!selectedMarket) return listings;
    return listings.filter((l) => l.marketId === selectedMarket);
  }, [listings, selectedMarket]);

  const filteredTrades = useMemo(() => {
    if (!selectedMarket) return trades;
    return trades.filter((t) => t.marketId === selectedMarket);
  }, [trades, selectedMarket]);

  const isFarmer = user?.participantType === "farmer";
  const isIndustrialist = user?.participantType === "industrialist";

  async function loadMarketplace() {
    setLoading(true);
    try {
      const [meRes, listingsRes, tradesRes] = await Promise.all([
        fetch("/api/users/me", { cache: "no-store" }),
        fetch(`/api/market/listings${selectedMarket ? `?market=${selectedMarket}` : ""}`, { cache: "no-store" }),
        fetch(`/api/market/trades?limit=60${selectedMarket ? `&market=${selectedMarket}` : ""}`, { cache: "no-store" }),
      ]);

      if (!meRes.ok) throw new Error("Unable to load user profile");
      if (!listingsRes.ok) throw new Error("Unable to load listings");
      if (!tradesRes.ok) throw new Error("Unable to load recent trades");

      const meData = (await meRes.json()) as { user?: AppUser };
      const listingsData = (await listingsRes.json()) as { listings?: MarketListing[] };
      const tradesData = (await tradesRes.json()) as { trades?: MarketTrade[] };

      setUser(meData.user ?? null);
      setListings(listingsData.listings ?? []);
      setTrades(tradesData.trades ?? []);
      setListingQty(
        Object.fromEntries((listingsData.listings ?? []).map((listing) => [listing.id, listing.minPurchase])) as Record<string, number>,
      );
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to load marketplace data", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMarketplace();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMarket]);

  async function updateParticipantType(nextType: ParticipantType) {
    if (!user || user.participantType === nextType) return;
    setUpdatingType(true);
    try {
      const res = await fetch("/api/users/participant-type", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantType: nextType }),
      });
      if (!res.ok) throw new Error(await res.text());
      setUser((prev) => (prev ? { ...prev, participantType: nextType } : prev));
      toast(`Profile switched to ${nextType}`, "ok");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to update participant type", "error");
    } finally {
      setUpdatingType(false);
    }
  }

  async function publishListing() {
    setPublishing(true);
    try {
      const res = await fetch("/api/market/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error(await res.text());
      toast("Listing created", "ok");
      await loadMarketplace();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not create listing", "error");
    } finally {
      setPublishing(false);
    }
  }

  async function buyCredits(listingId: string) {
    const quantity = listingQty[listingId];
    if (!quantity || quantity <= 0) {
      toast("Quantity must be greater than zero", "error");
      return;
    }

    setBusyListing(listingId);
    try {
      const res = await fetch("/api/market/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, quantity }),
      });

      if (!res.ok) throw new Error(await res.text());
      toast("Trade submitted. Settlement pending on-chain proof.", "ok");
      await loadMarketplace();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Trade failed", "error");
    } finally {
      setBusyListing(null);
    }
  }

  const totals = useMemo(() => {
    const listed = listings.reduce((sum, listing) => sum + listing.quantityAvailable, 0);
    const traded = trades.reduce((sum, trade) => sum + trade.quantity, 0);
    const volumeUsd = trades.reduce((sum, trade) => sum + trade.totalValueUsd, 0);
    return {
      listed,
      traded,
      volumeUsd,
    };
  }, [listings, trades]);

  return (
    <main className="min-h-screen bg-[#020817] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-44 right-1/4 h-96 w-96 rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 h-80 w-80 rounded-full bg-cyan-500/8 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-5 py-4 backdrop-blur-md">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-emerald-400">Decentralized Carbon Desk</p>
            <h1 className="mt-1 text-xl font-bold">Farmer to Industrialist Trading Platform</h1>
            <p className="text-xs text-slate-500">Peer listing, direct purchase intent, and pending on-chain settlement records.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/marketplace" className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-400 transition hover:text-white">
              Market Board
            </Link>
            <Link href="/dashboard" className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-400 transition hover:text-white">
              Dashboard
            </Link>
          </div>
        </header>

        <section className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
            <p className="text-[11px] uppercase tracking-wider text-slate-600">Listed Tokens</p>
            <p className="mt-1 font-mono text-2xl font-bold text-emerald-300">{totals.listed.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
            <p className="text-[11px] uppercase tracking-wider text-slate-600">Traded Tokens</p>
            <p className="mt-1 font-mono text-2xl font-bold text-cyan-300">{totals.traded.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
            <p className="text-[11px] uppercase tracking-wider text-slate-600">Traded Value (USD)</p>
            <p className="mt-1 font-mono text-2xl font-bold text-white">${totals.volumeUsd.toFixed(2)}</p>
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-600">Participant Mode</p>
              <p className="text-sm text-slate-300">Choose how you participate in this marketplace.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={updatingType || user?.participantType === "farmer"}
                onClick={() => void updateParticipantType("farmer")}
                className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-50"
              >
                Farmer (Sell)
              </button>
              <button
                type="button"
                disabled={updatingType || user?.participantType === "industrialist"}
                onClick={() => void updateParticipantType("industrialist")}
                className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-500/20 disabled:opacity-50"
              >
                Industrialist (Buy)
              </button>
            </div>
          </div>
        </section>

        <section className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-600">Market Filter</p>
            <p className="text-xs text-slate-500">Select one project or view all listings.</p>
          </div>
          <select
            value={selectedMarket}
            onChange={(e) => {
              setSelectedMarket(e.target.value);
              setDraft((prev) => ({ ...prev, marketId: e.target.value || prev.marketId }));
            }}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-emerald-500/50 focus:outline-none"
          >
            <option value="">All markets</option>
            {CARBON_MARKETS.map((market) => (
              <option key={market.id} value={market.id}>{market.farmName}</option>
            ))}
          </select>
        </section>

        {isFarmer && (
          <section className="mb-6 rounded-2xl border border-amber-600/25 bg-amber-950/20 p-5">
            <h2 className="text-sm font-bold text-amber-300">Create New Sell Listing</h2>
            <p className="mt-1 text-xs text-amber-200/70">Publish how many carbon credits you want to sell and at what USD/token price.</p>

            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <label className="text-xs text-slate-400">
                Market
                <select
                  value={draft.marketId}
                  onChange={(e) => setDraft((prev) => ({ ...prev, marketId: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                >
                  {CARBON_MARKETS.map((market) => (
                    <option key={market.id} value={market.id}>{market.farmName}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-slate-400">
                Price per token (USD)
                <input
                  type="number"
                  value={draft.pricePerToken}
                  min={0.01}
                  step={0.01}
                  onChange={(e) => setDraft((prev) => ({ ...prev, pricePerToken: Number(e.target.value) }))}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                />
              </label>
              <label className="text-xs text-slate-400">
                Quantity
                <input
                  type="number"
                  value={draft.quantityAvailable}
                  min={1}
                  step={1}
                  onChange={(e) => setDraft((prev) => ({ ...prev, quantityAvailable: Number(e.target.value) }))}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                />
              </label>
              <label className="text-xs text-slate-400">
                Minimum purchase
                <input
                  type="number"
                  value={draft.minPurchase}
                  min={1}
                  step={1}
                  onChange={(e) => setDraft((prev) => ({ ...prev, minPurchase: Number(e.target.value) }))}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={() => void publishListing()}
              disabled={publishing}
              className="mt-4 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-900 transition hover:bg-amber-400 disabled:opacity-50"
            >
              {publishing ? "Publishing..." : "Publish Listing"}
            </button>
          </section>
        )}

        <section className="grid gap-5 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
            <div className="border-b border-slate-800 px-5 py-4">
              <h2 className="text-sm font-bold">Open Listings</h2>
              <p className="text-xs text-slate-500">Farmers list available token inventory for industrial buyers.</p>
            </div>

            {loading ? (
              <div className="space-y-2 p-4">
                {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-lg bg-slate-800/80" />)}
              </div>
            ) : filteredListings.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-500">No listings for this market yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-left uppercase tracking-wider text-slate-600">
                      <th className="px-5 py-3">Market</th>
                      <th className="px-4 py-3">Seller</th>
                      <th className="px-4 py-3 text-right">Price</th>
                      <th className="px-4 py-3 text-right">Available</th>
                      <th className="px-4 py-3 text-right">Min</th>
                      <th className="px-4 py-3">Trade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredListings.map((listing) => {
                      const market = MARKET_BY_ID[listing.marketId];
                      const canBuy = isIndustrialist && user?.email?.toLowerCase() !== listing.sellerEmail.toLowerCase();
                      return (
                        <tr key={listing.id} className="hover:bg-slate-800/30 transition">
                          <td className="px-5 py-3.5">
                            <p className="font-semibold text-white">{market?.farmName ?? listing.marketId}</p>
                            <p className="text-[10px] text-slate-600">{market?.region ?? "Unknown"}</p>
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="text-slate-300">{listing.sellerName}</p>
                            <p className="text-[10px] text-slate-600">{listing.sellerEmail}</p>
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono text-emerald-300">${listing.pricePerToken.toFixed(2)}</td>
                          <td className="px-4 py-3.5 text-right font-mono text-white">{listing.quantityAvailable}</td>
                          <td className="px-4 py-3.5 text-right font-mono text-slate-400">{listing.minPurchase}</td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={listing.minPurchase}
                                max={listing.quantityAvailable}
                                step={1}
                                value={listingQty[listing.id] ?? listing.minPurchase}
                                onChange={(e) => setListingQty((prev) => ({ ...prev, [listing.id]: Number(e.target.value) }))}
                                className="w-20 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-white"
                              />
                              <button
                                type="button"
                                disabled={!canBuy || busyListing === listing.id}
                                onClick={() => void buyCredits(listing.id)}
                                className="rounded-lg bg-cyan-600 px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-cyan-500 disabled:opacity-40"
                                title={canBuy ? "Buy credits" : "Switch to Industrialist mode to buy"}
                              >
                                {busyListing === listing.id ? "..." : "Buy"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
            <div className="border-b border-slate-800 px-4 py-4">
              <h2 className="text-sm font-bold">Recent Trades</h2>
              <p className="text-xs text-slate-500">Most recent buyer fill activity.</p>
            </div>
            <ul className="max-h-[520px] divide-y divide-slate-800/60 overflow-y-auto">
              {filteredTrades.length === 0 ? (
                <li className="px-4 py-8 text-center text-xs text-slate-500">No trades yet.</li>
              ) : (
                filteredTrades.map((trade) => {
                  const market = MARKET_BY_ID[trade.marketId];
                  return (
                    <li key={trade.id} className="px-4 py-3 text-xs">
                      <p className="font-semibold text-white">{market?.farmName ?? trade.marketId}</p>
                      <p className="mt-1 text-slate-400">{trade.quantity} tokens at ${trade.pricePerToken.toFixed(2)} by {trade.buyerName}</p>
                      <p className="mt-1 font-mono text-[11px] text-emerald-300">${trade.totalValueUsd.toFixed(2)} · {trade.settlement}</p>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </section>

        {status && (
          <div className={`mt-5 rounded-xl border px-4 py-2 text-xs font-medium ${
            statusType === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-rose-500/30 bg-rose-500/10 text-rose-300"
          }`}>
            {status}
          </div>
        )}
      </div>
    </main>
  );
}
