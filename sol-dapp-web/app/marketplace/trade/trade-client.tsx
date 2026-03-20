"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CARBON_MARKETS,
  MARKET_BY_ID,
  generateOrderBook,
  generateRecentTrades,
  generatePrices,
  type OrderBookEntry,
  type Trade,
} from "@/lib/market-data";
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

// ─── Sparkline for price chart ────────────────────────────────────────────────
function PriceChart({ prices, positive }: { prices: number[]; positive: boolean }) {
  const w = 500, h = 80;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const step = w / (prices.length - 1);
  const pts  = prices.map((p, i) => `${i * step},${h - ((p - min) / range) * (h - 4) - 2}`).join(" ");
  const area = `0,${h} ${pts} ${(prices.length - 1) * step},${h}`;
  const color = positive ? "#10b981" : "#ef4444";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-20 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#priceGrad)" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Order book side ──────────────────────────────────────────────────────────
function OrderBookSide({
  entries, side, midPrice,
}: {
  entries: OrderBookEntry[];
  side: "ask" | "bid";
  midPrice: number;
}) {
  const isAsk   = side === "ask";
  const color   = isAsk ? "text-red-400" : "text-emerald-400";
  const barColor = isAsk ? "bg-red-500/10" : "bg-emerald-500/10";

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
      <div className="grid grid-cols-3 border-b border-slate-800 px-3 py-2 text-[10px] uppercase tracking-wider text-slate-600">
        <span>{isAsk ? "Ask Price" : "Bid Price"}</span>
        <span className="text-center">Qty</span>
        <span className="text-right">Total</span>
      </div>
      <div className="max-h-52 overflow-y-auto">
        {entries.map((entry, i) => (
          <div
            key={i}
            className="relative grid grid-cols-3 items-center px-3 py-1.5 font-mono text-xs transition hover:bg-slate-800/40"
          >
            <div
              className={`absolute inset-0 ${barColor}`}
              style={{ width: `${entry.depth * 100}%`, [isAsk ? "right" : "left"]: 0, position: "absolute" }}
            />
            <span className={`relative z-10 font-semibold ${color}`}>{entry.price.toFixed(2)}</span>
            <span className="relative z-10 text-center text-slate-400">{entry.quantity.toLocaleString()}</span>
            <span className="relative z-10 text-right text-slate-500">{(entry.total / 1000).toFixed(0)}K</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Live trades feed ────────────────────────────────────────────────────────
function TradesFeed({ trades }: { trades: Trade[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
      <div className="grid grid-cols-3 border-b border-slate-800 px-3 py-2 text-[10px] uppercase tracking-wider text-slate-600">
        <span>Price</span>
        <span className="text-center">Qty</span>
        <span className="text-right">Time</span>
      </div>
      <div className="max-h-52 overflow-y-auto divide-y divide-slate-900">
        {trades.map((t) => (
          <div key={t.id} className="grid grid-cols-3 px-3 py-1.5 font-mono text-xs">
            <span className={`font-semibold ${t.side === "buy" ? "text-emerald-400" : "text-red-400"}`}>
              {t.price.toFixed(2)}
            </span>
            <span className="text-center text-slate-400">{t.quantity}</span>
            <span className="text-right text-slate-600">{t.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function TradeClient({ initialMarketId }: TradeClientProps) {
  const defaultMarket = CARBON_MARKETS[0]?.id ?? "";
  const [user,          setUser]          = useState<AppUser | null>(null);
  const [listings,      setListings]      = useState<MarketListing[]>([]);
  const [trades,        setTrades]        = useState<MarketTrade[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [selectedMarket, setSelectedMarket] = useState(initialMarketId || defaultMarket);
  const [orderSide,     setOrderSide]     = useState<"buy" | "sell">("buy");
  const [orderType,     setOrderType]     = useState<"market" | "limit">("market");
  const [orderQty,      setOrderQty]      = useState(50);
  const [orderPrice,    setOrderPrice]    = useState(0);
  const [status,        setStatus]        = useState("");
  const [statusType,    setStatusType]    = useState<"ok" | "error">("ok");
  const [busy,          setBusy]          = useState(false);
  const [publishing,    setPublishing]    = useState(false);
  const [listingDraft,  setListingDraft]  = useState({ pricePerToken: 12, quantityAvailable: 300, minPurchase: 25 });

  const market = MARKET_BY_ID[selectedMarket] ?? MARKET_BY_ID[defaultMarket];

  const orderBook   = useMemo(() => generateOrderBook(market.pricePerToken, market.idx ?? 0), [market]);
  const recentTrades = useMemo(() => generateRecentTrades(market.pricePerToken, market.idx ?? 0, 30), [market]);
  const priceHistory = useMemo(() => generatePrices(market.pricePerToken, market.idx ?? 0, 60), [market]);
  const positive     = market.change24h >= 0;

  const filteredListings = useMemo(
    () => listings.filter((l) => l.marketId === selectedMarket),
    [listings, selectedMarket],
  );

  function toast(msg: string, type: "ok" | "error") {
    setStatus(msg);
    setStatusType(type);
    window.setTimeout(() => setStatus(""), 4000);
  }

  async function load() {
    setLoading(true);
    try {
      const [meRes, lRes, tRes] = await Promise.all([
        fetch("/api/users/me", { cache: "no-store" }),
        fetch(`/api/market/listings?market=${selectedMarket}`, { cache: "no-store" }),
        fetch(`/api/market/trades?limit=60&market=${selectedMarket}`, { cache: "no-store" }),
      ]);
      const meData = (await meRes.json()) as { user?: AppUser };
      const lData  = (await lRes.json()) as { listings?: MarketListing[] };
      const tData  = (await tRes.json()) as { trades?: MarketTrade[] };
      setUser(meData.user ?? null);
      setListings(lData.listings ?? []);
      setTrades(tData.trades ?? []);
      setOrderPrice(Number(market.pricePerToken.toFixed(2)));
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, [selectedMarket]);

  const isFarmer       = user?.participantType === "farmer";
  const isIndustrialist = user?.participantType === "industrialist";

  async function placeOrder() {
    const listing = filteredListings[0];
    if (!listing) { toast("No listing found for this market", "error"); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/market/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: listing.id, quantity: orderQty }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast(`Order filled: ${orderQty} rCO2 @ $${listing.pricePerToken.toFixed(2)}`, "ok");
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Order failed", "error");
    } finally { setBusy(false); }
  }

  async function publishListing() {
    setPublishing(true);
    try {
      const res = await fetch("/api/market/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...listingDraft, marketId: selectedMarket }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast("Listing published", "ok");
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not create listing", "error");
    } finally { setPublishing(false); }
  }

  const totals = useMemo(() => ({
    listed:    listings.reduce((s, l) => s + l.quantityAvailable, 0),
    traded:    trades.reduce((s, t) => s + t.quantity, 0),
    volumeUsd: trades.reduce((s, t) => s + t.totalValueUsd, 0),
  }), [listings, trades]);

  return (
    <main className="min-h-screen bg-[#020817] text-white">
      <div className="pointer-events-none fixed inset-0 bg-dot-grid opacity-15" />

      <div className="relative z-10 mx-auto max-w-7xl px-3 py-5 sm:px-5">

        {/* ── Top nav ── */}
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-white">
              ← Dashboard
            </Link>
            <span className="text-slate-700">/</span>
            <span className="text-xs font-bold text-white">Trade Desk</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="h-1.5 w-1.5 animate-blink rounded-full bg-emerald-400 inline-block" />
            Simulated market feed · Solana Devnet
          </div>
        </header>

        {/* ── Market selector + stats ── */}
        <div className="mb-4 flex flex-wrap items-center gap-3 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3">
          <div className="flex-1 min-w-48">
            <select
              value={selectedMarket}
              onChange={(e) => setSelectedMarket(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-white focus:border-emerald-500/50 focus:outline-none"
            >
              {CARBON_MARKETS.map((m) => (
                <option key={m.id} value={m.id}>{m.flag} {m.farmName}</option>
              ))}
            </select>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-extrabold text-white">${market.pricePerToken.toFixed(2)}</span>
            <span className={`font-mono text-sm font-semibold ${positive ? "text-emerald-400" : "text-red-400"}`}>
              {positive ? "+" : ""}{market.change24h.toFixed(1)}%
            </span>
          </div>
          {[
            { label: "Vol 24h",    value: `${(market.volume24h / 1000).toFixed(0)}K` },
            { label: "Available",  value: `${(market.available / 1000).toFixed(0)}K` },
            { label: "Supply",     value: `${(market.supply / 1000).toFixed(0)}K` },
          ].map((s) => (
            <div key={s.label} className="border-l border-slate-800 pl-3">
              <p className="text-[10px] text-slate-600">{s.label}</p>
              <p className="font-mono text-sm font-bold text-slate-300">{s.value}</p>
            </div>
          ))}
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-300">
            {market.carbonType}
          </span>
        </div>

        {/* ── Main layout: chart + order book + order form ── */}
        <div className="grid gap-4 lg:grid-cols-[1fr_280px_240px]">

          {/* ── Chart + order book ── */}
          <div className="space-y-4">
            {/* Price chart */}
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                <div>
                  <p className="text-xs font-bold text-white">{market.farmName}</p>
                  <p className="text-[10px] text-slate-500">{market.region} · {market.vintage}</p>
                </div>
                <div className="flex items-center gap-1.5 text-[10px]">
                  {["1H","4H","1D","1W"].map((t) => (
                    <button key={t} type="button"
                      className={`rounded px-1.5 py-0.5 font-mono ${t === "1D" ? "bg-slate-700 text-white" : "text-slate-600 hover:text-white"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="px-4 py-2">
                <PriceChart prices={priceHistory} positive={positive} />
              </div>
            </div>

            {/* Order book */}
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <h2 className="mb-3 text-sm font-bold">Order Book</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-red-400">Asks (Sell)</p>
                  <OrderBookSide entries={orderBook.asks} side="ask" midPrice={market.pricePerToken} />
                </div>
                <div>
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">Bids (Buy)</p>
                  <OrderBookSide entries={orderBook.bids} side="bid" midPrice={market.pricePerToken} />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-center gap-3 rounded-lg border border-slate-800 bg-slate-950 py-2">
                <span className="text-[10px] text-slate-600">Spread</span>
                <span className="font-mono text-xs font-bold text-white">${orderBook.spread.toFixed(3)}</span>
                <span className="font-mono text-[10px] text-slate-500">({orderBook.spreadPct.toFixed(3)}%)</span>
              </div>
            </div>

            {/* Open listings */}
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
              <div className="border-b border-slate-800 px-4 py-3">
                <h2 className="text-sm font-bold">Open Listings</h2>
                <p className="text-[11px] text-slate-500">Real user sell orders for this market</p>
              </div>
              {filteredListings.length === 0 ? (
                <p className="px-4 py-8 text-center text-xs text-slate-600">No listings yet. Farmers can post sell orders above.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-600">
                        <th className="px-4 py-2.5 text-left">Seller</th>
                        <th className="px-3 py-2.5 text-right">Price</th>
                        <th className="px-3 py-2.5 text-right">Available</th>
                        <th className="px-3 py-2.5 text-right">Min</th>
                        <th className="px-3 py-2.5">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {filteredListings.map((l) => {
                        const canBuy = isIndustrialist && user?.email?.toLowerCase() !== l.sellerEmail.toLowerCase();
                        return (
                          <tr key={l.id} className="hover:bg-slate-800/30 transition">
                            <td className="px-4 py-2.5">
                              <p className="text-slate-300">{l.sellerName}</p>
                              <p className="text-[10px] text-slate-600">{l.sellerEmail}</p>
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-emerald-300">${l.pricePerToken.toFixed(2)}</td>
                            <td className="px-3 py-2.5 text-right font-mono text-white">{l.quantityAvailable}</td>
                            <td className="px-3 py-2.5 text-right font-mono text-slate-500">{l.minPurchase}</td>
                            <td className="px-3 py-2.5">
                              <button
                                type="button"
                                disabled={!canBuy || busy}
                                onClick={() => { setOrderQty(l.minPurchase); void placeOrder(); }}
                                className="rounded-lg bg-emerald-600/20 px-2.5 py-1.5 text-[11px] font-bold text-emerald-300 transition hover:bg-emerald-600 hover:text-white disabled:opacity-40"
                                title={canBuy ? "Buy" : "Switch to Industrialist mode"}
                              >
                                Buy
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* ── Recent trades feed ── */}
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
              <div className="border-b border-slate-800 px-4 py-3">
                <p className="text-xs font-bold text-white">Recent Trades</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 inline-block" />
                  <span className="text-[10px] text-slate-500">Simulated feed</span>
                </div>
              </div>
              <TradesFeed trades={recentTrades} />
            </div>

            {/* Settled trades from store */}
            {trades.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
                <div className="border-b border-slate-800 px-4 py-3">
                  <p className="text-xs font-bold">Desk Trades</p>
                  <p className="text-[10px] text-slate-500">From this trading session</p>
                </div>
                <ul className="divide-y divide-slate-800/50">
                  {trades.slice(0, 10).map((t) => (
                    <li key={t.id} className="px-4 py-2.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-300">{t.quantity} rCO2</span>
                        <span className="font-mono font-semibold text-emerald-300">${t.totalValueUsd.toFixed(2)}</span>
                      </div>
                      <p className="mt-0.5 text-[10px] text-slate-600">{t.buyerName}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Market stats */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
              <p className="text-xs font-bold">Session Stats</p>
              {[
                { label: "Listed tokens",  value: totals.listed.toLocaleString() },
                { label: "Traded tokens",  value: totals.traded.toLocaleString() },
                { label: "Volume (USD)",   value: `$${totals.volumeUsd.toFixed(0)}` },
              ].map((s) => (
                <div key={s.label} className="flex justify-between text-xs">
                  <span className="text-slate-600">{s.label}</span>
                  <span className="font-mono font-semibold text-white">{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Order form ── */}
          <div className="space-y-4">
            {/* Participant mode */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Mode</p>
              <p className="mt-1 text-xs font-semibold text-slate-300">
                {isFarmer ? "🌾 Farmer (Sell)" : isIndustrialist ? "🏭 Industrialist (Buy)" : "…"}
              </p>
              <Link href="/marketplace" className="mt-2 block text-[11px] text-slate-600 underline hover:text-slate-400">
                Switch on market board
              </Link>
            </div>

            {/* Buy form (industrialist) */}
            {isIndustrialist && (
              <div className="rounded-2xl border border-emerald-500/25 bg-emerald-950/20 p-4">
                <div className="mb-4 flex gap-1 rounded-xl bg-slate-950 p-1">
                  {(["buy", "sell"] as const).map((side) => (
                    <button
                      key={side}
                      type="button"
                      onClick={() => setOrderSide(side)}
                      className={`flex-1 rounded-lg py-1.5 text-xs font-bold capitalize transition ${
                        orderSide === side
                          ? side === "buy"
                            ? "bg-emerald-600 text-white"
                            : "bg-red-600 text-white"
                          : "text-slate-500 hover:text-white"
                      }`}
                    >
                      {side}
                    </button>
                  ))}
                </div>

                <div className="mb-3 flex gap-1 rounded-xl bg-slate-950 p-1">
                  {(["market", "limit"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setOrderType(type)}
                      className={`flex-1 rounded-lg py-1.5 text-xs font-semibold capitalize transition ${
                        orderType === type ? "bg-slate-700 text-white" : "text-slate-600 hover:text-white"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                <div className="space-y-3">
                  {orderType === "limit" && (
                    <label className="block text-xs text-slate-500">
                      Price (USD)
                      <input
                        type="number"
                        value={orderPrice}
                        step={0.01}
                        onChange={(e) => setOrderPrice(Number(e.target.value))}
                        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm font-mono font-bold text-white focus:border-emerald-500/50 focus:outline-none"
                      />
                    </label>
                  )}
                  <label className="block text-xs text-slate-500">
                    Quantity (rCO2)
                    <input
                      type="number"
                      value={orderQty}
                      min={1}
                      step={1}
                      onChange={(e) => setOrderQty(Number(e.target.value))}
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm font-mono font-bold text-white focus:border-emerald-500/50 focus:outline-none"
                    />
                  </label>

                  <div className="rounded-xl bg-slate-950 px-3 py-2.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Est. total</span>
                      <span className="font-mono font-bold text-white">
                        ${(orderQty * (orderType === "limit" ? orderPrice : market.pricePerToken)).toFixed(2)}
                      </span>
                    </div>
                    <div className="mt-1 flex justify-between text-slate-700">
                      <span>Fee (0.3%)</span>
                      <span className="font-mono">${(orderQty * market.pricePerToken * 0.003).toFixed(2)}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void placeOrder()}
                    disabled={busy || loading || filteredListings.length === 0}
                    className={`w-full rounded-xl py-3 text-sm font-extrabold transition ${
                      orderSide === "buy"
                        ? "bg-emerald-600 hover:bg-emerald-500"
                        : "bg-red-600 hover:bg-red-500"
                    } text-white disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    {busy ? "Processing…" : filteredListings.length === 0 ? "No listings" : `${orderSide === "buy" ? "Buy" : "Sell"} ${orderQty} rCO2`}
                  </button>
                </div>
              </div>
            )}

            {/* Sell form (farmer) */}
            {isFarmer && (
              <div className="rounded-2xl border border-amber-500/25 bg-amber-950/20 p-4">
                <h3 className="text-sm font-bold text-amber-300">Post Sell Listing</h3>
                <p className="mt-1 text-[11px] text-amber-200/60">List your carbon credits for sale</p>
                <div className="mt-3 space-y-3">
                  <label className="block text-xs text-slate-500">
                    Price per token (USD)
                    <input
                      type="number"
                      value={listingDraft.pricePerToken}
                      step={0.01}
                      min={0.01}
                      onChange={(e) => setListingDraft((d) => ({ ...d, pricePerToken: Number(e.target.value) }))}
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm font-mono font-bold text-white focus:outline-none"
                    />
                  </label>
                  <label className="block text-xs text-slate-500">
                    Quantity
                    <input
                      type="number"
                      value={listingDraft.quantityAvailable}
                      min={1}
                      onChange={(e) => setListingDraft((d) => ({ ...d, quantityAvailable: Number(e.target.value) }))}
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm font-mono font-bold text-white focus:outline-none"
                    />
                  </label>
                  <label className="block text-xs text-slate-500">
                    Min purchase
                    <input
                      type="number"
                      value={listingDraft.minPurchase}
                      min={1}
                      onChange={(e) => setListingDraft((d) => ({ ...d, minPurchase: Number(e.target.value) }))}
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm font-mono font-bold text-white focus:outline-none"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => void publishListing()}
                    disabled={publishing}
                    className="w-full rounded-xl bg-amber-500 py-3 text-sm font-extrabold text-slate-900 transition hover:bg-amber-400 disabled:opacity-60"
                  >
                    {publishing ? "Publishing…" : "List Credits for Sale"}
                  </button>
                </div>
              </div>
            )}

            {/* Toast */}
            {status && (
              <div className={`rounded-xl border px-3 py-2.5 text-xs font-semibold ${
                statusType === "ok"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-rose-500/30 bg-rose-500/10 text-rose-300"
              }`}>
                {statusType === "ok" ? "✓ " : "✗ "}{status}
              </div>
            )}

            {/* ESG Retire CTA */}
            <div className="rounded-2xl border border-rose-500/20 bg-rose-950/20 p-4 text-center">
              <span className="text-2xl">🔥</span>
              <p className="mt-2 text-xs font-bold text-rose-300">Retire Credits</p>
              <p className="mt-1 text-[11px] text-slate-500">Burn tokens → receive proof-of-offset NFT</p>
              <button
                type="button"
                className="mt-3 w-full rounded-xl border border-rose-500/30 py-2 text-xs font-bold text-rose-400 transition hover:bg-rose-500/10"
              >
                Initiate Retirement
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
