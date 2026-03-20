"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { MarketListing, MarketTrade } from "@/lib/trading-store";
import { CARBON_MARKETS, generatePrices, type CarbonMarket } from "@/lib/market-data";

interface IndustrialistUser {
  name: string;
  email: string;
}

// ─── Sparkline ───────────────────────────────────────────────────────────────
function Sparkline({ prices, positive }: { prices: number[]; positive: boolean }) {
  const w = 80, h = 28;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const step  = w / (prices.length - 1);
  const pts   = prices.map((p, i) => `${i * step},${h - ((p - min) / range) * h}`).join(" ");
  const color = positive ? "#10b981" : "#ef4444";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-7 w-20">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Market row ──────────────────────────────────────────────────────────────
function MarketRow({ market, idx }: { market: CarbonMarket; idx: number }) {
  const prices  = generatePrices(market.pricePerToken, idx, 20);
  const positive = market.change24h >= 0;
  return (
    <tr className="group cursor-pointer border-b border-slate-800/50 transition hover:bg-slate-800/30">
      <td className="py-3 pl-5 pr-3">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">{market.flag}</span>
          <div>
            <p className="text-xs font-semibold text-white">{market.farmName}</p>
            <p className="text-[10px] text-slate-600">{market.region}</p>
          </div>
        </div>
      </td>
      <td className="px-3 py-3 text-right font-mono text-sm font-bold text-white">${market.pricePerToken.toFixed(2)}</td>
      <td className={`px-3 py-3 text-right font-mono text-xs font-semibold ${positive ? "text-emerald-400" : "text-red-400"}`}>
        {positive ? "+" : ""}{market.change24h.toFixed(1)}%
      </td>
      <td className="px-3 py-3 text-right font-mono text-xs text-slate-400">{(market.volume24h / 1000).toFixed(0)}K</td>
      <td className="px-3 py-3">
        <Sparkline prices={prices} positive={positive} />
      </td>
      <td className="py-3 pl-3 pr-5 text-right">
        <Link
          href={`/marketplace/trade?market=${market.id}`}
          className="rounded-lg bg-emerald-600/20 px-2.5 py-1.5 text-[11px] font-bold text-emerald-300 transition hover:bg-emerald-600 hover:text-white"
        >
          Trade →
        </Link>
      </td>
    </tr>
  );
}

// ─── Portfolio mock ───────────────────────────────────────────────────────────
const PORTFOLIO = [
  { symbol: "rCO2", market: "Amazon Restoration Fund", qty: 250, avgPrice: 17.80, currentPrice: 18.40 },
  { symbol: "rCO2", market: "Great Rift Agroforest",   qty: 100, avgPrice: 13.50, currentPrice: 14.80 },
];

// ─── Main component ───────────────────────────────────────────────────────────
export function IndustrialistDashboardClient({ user }: { user: IndustrialistUser }) {
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [trades,   setTrades]   = useState<MarketTrade[]>([]);
  const [tab,      setTab]      = useState<"markets" | "portfolio" | "orders">("markets");

  useEffect(() => {
    async function loadData() {
      const [lRes, tRes] = await Promise.all([
        fetch("/api/market/listings", { cache: "no-store" }),
        fetch("/api/market/trades?limit=30", { cache: "no-store" }),
      ]);
      const lData = (await lRes.json()) as { listings?: MarketListing[] };
      const tData = (await tRes.json()) as { trades?: MarketTrade[] };
      setListings(lData.listings ?? []);
      setTrades(tData.trades ?? []);
    }
    void loadData();
  }, []);

  const metrics = useMemo(() => {
    const listed  = listings.reduce((s, l) => s + l.quantityAvailable, 0);
    const volume  = trades.reduce((s, t) => s + t.totalValueUsd, 0);
    const portfolioValue = PORTFOLIO.reduce((s, p) => s + p.qty * p.currentPrice, 0);
    const portfolioPnl   = PORTFOLIO.reduce((s, p) => s + p.qty * (p.currentPrice - p.avgPrice), 0);
    return { listed, volume, activeListings: listings.length, portfolioValue, portfolioPnl };
  }, [listings, trades]);

  const sortedMarkets = useMemo(
    () => [...CARBON_MARKETS].sort((a, b) => b.volume24h - a.volume24h),
    [],
  );

  return (
    <main className="min-h-screen bg-[#020817] text-white">
      <div className="pointer-events-none fixed inset-0 bg-dot-grid opacity-20" />
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 right-1/4 h-96 w-96 rounded-full bg-cyan-500/6 blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-indigo-500/5 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6">

        {/* ── Header ── */}
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-5 py-4 backdrop-blur-md">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse inline-block" />
                Industrialist
              </span>
            </div>
            <h1 className="mt-1 text-xl font-bold">Carbon Credit Trading Console</h1>
            <p className="text-xs text-slate-500">{user.name} · {user.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/marketplace/trade" className="rounded-lg bg-cyan-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-cyan-500">
              Open Trade Desk
            </Link>
            <Link href="/marketplace" className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 transition hover:text-white">
              Market Board
            </Link>
          </div>
        </header>

        {/* ── Stats ── */}
        <section className="mb-6 grid gap-3 sm:grid-cols-4">
          {[
            { label: "Portfolio Value",  value: `$${metrics.portfolioValue.toFixed(0)}`, color: "text-white" },
            { label: "Unrealized P&L",   value: `${metrics.portfolioPnl >= 0 ? "+" : ""}$${metrics.portfolioPnl.toFixed(0)}`, color: metrics.portfolioPnl >= 0 ? "text-emerald-300" : "text-red-300" },
            { label: "Market Listings",  value: metrics.activeListings.toString(), color: "text-cyan-300" },
            { label: "Trade Volume",     value: `$${(metrics.volume).toFixed(0)}`, color: "text-amber-300" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-slate-600">{s.label}</p>
              <p className={`mt-1 font-mono text-xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </section>

        {/* ── Tab bar ── */}
        <div className="mb-4 flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/60 p-1">
          {(["markets", "portfolio", "orders"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold capitalize transition ${
                tab === t
                  ? "bg-slate-700 text-white"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* ── Markets tab ── */}
        {tab === "markets" && (
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
            <div className="border-b border-slate-800 px-5 py-3">
              <h2 className="text-sm font-bold">Carbon Credit Markets</h2>
              <p className="text-[11px] text-slate-500">Live pricing · Click Trade to open order desk</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-600">
                    <th className="py-3 pl-5 pr-3 text-left">Market</th>
                    <th className="px-3 py-3 text-right">Price</th>
                    <th className="px-3 py-3 text-right">24h</th>
                    <th className="px-3 py-3 text-right">Vol 24h</th>
                    <th className="px-3 py-3 text-left">7d</th>
                    <th className="py-3 pl-3 pr-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedMarkets.map((market, idx) => (
                    <MarketRow key={market.id} market={market} idx={idx} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Portfolio tab ── */}
        {tab === "portfolio" && (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
              <div className="border-b border-slate-800 px-5 py-3">
                <h2 className="text-sm font-bold">My Holdings</h2>
                <p className="text-[11px] text-slate-500">Mock portfolio · purchase credits on the trade desk</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-600">
                      <th className="py-3 pl-5 pr-3 text-left">Market</th>
                      <th className="px-3 py-3 text-right">Qty</th>
                      <th className="px-3 py-3 text-right">Avg Cost</th>
                      <th className="px-3 py-3 text-right">Current</th>
                      <th className="px-3 py-3 text-right">Value</th>
                      <th className="px-3 py-3 text-right">P&L</th>
                      <th className="py-3 pl-3 pr-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {PORTFOLIO.map((pos) => {
                      const value = pos.qty * pos.currentPrice;
                      const pnl   = pos.qty * (pos.currentPrice - pos.avgPrice);
                      const pnlPct = ((pos.currentPrice - pos.avgPrice) / pos.avgPrice) * 100;
                      return (
                        <tr key={pos.market} className="hover:bg-slate-800/30 transition">
                          <td className="py-3 pl-5 pr-3">
                            <p className="font-semibold text-white">{pos.market}</p>
                            <p className="text-[10px] text-slate-600">{pos.symbol}</p>
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-white">{pos.qty}</td>
                          <td className="px-3 py-3 text-right font-mono text-slate-400">${pos.avgPrice.toFixed(2)}</td>
                          <td className="px-3 py-3 text-right font-mono text-white">${pos.currentPrice.toFixed(2)}</td>
                          <td className="px-3 py-3 text-right font-mono font-semibold text-white">${value.toFixed(0)}</td>
                          <td className={`px-3 py-3 text-right font-mono font-semibold ${pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {pnl >= 0 ? "+" : ""}${pnl.toFixed(0)}
                            <br />
                            <span className="text-[10px]">{pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(1)}%</span>
                          </td>
                          <td className="py-3 pl-3 pr-5 text-right">
                            <Link href="/marketplace/trade" className="rounded-lg bg-cyan-600/20 px-2.5 py-1.5 text-[11px] font-bold text-cyan-300 transition hover:bg-cyan-600 hover:text-white">
                              Retire
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Retirement CTA */}
            <div className="rounded-2xl border border-rose-500/20 bg-rose-950/20 p-5 text-center">
              <span className="text-3xl">🔥</span>
              <h3 className="mt-2 text-sm font-bold text-rose-300">Retire Carbon Credits</h3>
              <p className="mt-1 text-xs text-slate-400">Permanently burn tokens to generate a proof-of-offset NFT certificate for ESG compliance reporting.</p>
              <Link href="/marketplace/trade" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-rose-500">
                Open Retirement Desk
              </Link>
            </div>
          </div>
        )}

        {/* ── Orders tab ── */}
        {tab === "orders" && (
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
            <div className="border-b border-slate-800 px-5 py-3">
              <h2 className="text-sm font-bold">Recent Order Activity</h2>
              <p className="text-[11px] text-slate-500">Trade history across all markets</p>
            </div>
            {trades.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-slate-600">
                <span className="text-4xl opacity-30">📋</span>
                <p className="text-sm">No trades yet. Go to the Trade Desk to execute your first order.</p>
                <Link href="/marketplace/trade" className="mt-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-cyan-500">
                  Open Trade Desk
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-slate-800/50">
                {trades.slice(0, 15).map((trade) => (
                  <li key={trade.id} className="flex items-center justify-between gap-3 px-5 py-3 text-xs hover:bg-slate-800/20">
                    <div>
                      <p className="font-semibold text-white">{trade.quantity} rCO2</p>
                      <p className="text-slate-500">by {trade.buyerName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-emerald-300">${trade.totalValueUsd.toFixed(2)}</p>
                      <p className="font-mono text-[10px] text-slate-600">${trade.pricePerToken.toFixed(2)}/token</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      trade.settlement === "settled"
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-amber-500/15 text-amber-300"
                    }`}>
                      {trade.settlement === "settled" ? "Settled" : "Pending"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
