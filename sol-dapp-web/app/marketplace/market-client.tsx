"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CARBON_MARKETS, generatePrices, type CarbonMarket, type CarbonType } from "@/lib/market-data";

// ─── Sparkline chart ───────────────────────────────────────────────────────────
function Sparkline({ prices, positive }: { prices: number[]; positive: boolean }) {
  const w = 120, h = 36;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const step = w / (prices.length - 1);
  const pts = prices.map((p, i) => `${i * step},${h - ((p - min) / range) * h}`).join(" ");
  const color = positive ? "#10b981" : "#ef4444";
  const area = `0,${h} ${pts} ${(prices.length - 1) * step},${h}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-9 w-30">
      <defs>
        <linearGradient id={`sg-${positive}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#sg-${positive})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Type badge ───────────────────────────────────────────────────────────────
const TYPE_COLORS: Record<CarbonType, string> = {
  Forestry:     "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  Agriculture:  "bg-amber-500/15 text-amber-300 border-amber-500/30",
  "Blue Carbon":"bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  Renewable:    "bg-violet-500/15 text-violet-300 border-violet-500/30",
};

function TypeBadge({ type }: { type: CarbonType }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${TYPE_COLORS[type]}`}>
      {type}
    </span>
  );
}

// ─── Market card ──────────────────────────────────────────────────────────────
function MarketCard({ market, idx }: { market: CarbonMarket; idx: number }) {
  const prices = generatePrices(market.pricePerToken, idx);
  const positive = market.change24h >= 0;
  const pctDisplay = `${positive ? "+" : ""}${market.change24h.toFixed(1)}%`;
  const fillPct = Math.round((market.available / market.supply) * 100);

  return (
    <article className="group flex flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-slate-600 hover:bg-slate-900 hover:shadow-xl hover:shadow-black/30">
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">{market.flag}</span>
          <div>
            <p className="text-sm font-bold leading-tight text-white">{market.farmName}</p>
            <p className="text-[11px] text-slate-500">{market.region} · {market.vintage}</p>
          </div>
        </div>
        <TypeBadge type={market.carbonType} />
      </div>

      {/* Description */}
      <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-500">{market.description}</p>

      {/* Price + sparkline */}
      <div className="mt-4 flex items-end justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-slate-600">Price / CO₂</p>
          <p className="mt-0.5 font-mono text-2xl font-bold text-white">${market.pricePerToken.toFixed(2)}</p>
          <p className={`mt-0.5 font-mono text-sm font-semibold ${positive ? "text-emerald-400" : "text-red-400"}`}>
            {pctDisplay} <span className="text-[10px] text-slate-600">24h</span>
          </p>
        </div>
        <Sparkline prices={prices} positive={positive} />
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-800 pt-4 text-xs">
        <div>
          <p className="text-slate-600">Vol 24h</p>
          <p className="mt-0.5 font-mono font-semibold text-slate-300">{(market.volume24h / 1000).toFixed(0)}K</p>
        </div>
        <div>
          <p className="text-slate-600">Available</p>
          <p className="mt-0.5 font-mono font-semibold text-slate-300">{(market.available / 1000).toFixed(0)}K</p>
        </div>
      </div>

      {/* Supply bar */}
      <div className="mt-3">
        <div className="flex justify-between text-[10px] text-slate-600">
          <span>Liquidity</span>
          <span>{fillPct}% available</span>
        </div>
        <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all"
            style={{ width: `${fillPct}%` }}
          />
        </div>
      </div>

      {/* SDGs */}
      <div className="mt-3 flex flex-wrap gap-1">
        {market.sdgGoals.map((g) => (
          <span key={g} className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">SDG {g}</span>
        ))}
      </div>

      {/* CTA */}
      <Link
        href={`/marketplace/trade?market=${market.id}`}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white transition group-hover:bg-emerald-500"
      >
        Trade
        <svg className="h-4 w-4 transition group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </Link>
    </article>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
const FILTERS: { label: string; value: CarbonType | "All" }[] = [
  { label: "All Markets", value: "All" },
  { label: "🌲 Forestry", value: "Forestry" },
  { label: "🌾 Agriculture", value: "Agriculture" },
  { label: "🌊 Blue Carbon", value: "Blue Carbon" },
  { label: "⚡ Renewable", value: "Renewable" },
];

type SortKey = "price" | "volume" | "change" | "available";

const SORT_OPTIONS: { label: string; key: SortKey }[] = [
  { label: "Price", key: "price" },
  { label: "Volume", key: "volume" },
  { label: "24h Change", key: "change" },
  { label: "Available", key: "available" },
];

export function MarketClient() {
  const [filter, setFilter] = useState<CarbonType | "All">("All");
  const [sort, setSort] = useState<SortKey>("volume");
  const [sortDesc, setSortDesc] = useState(true);
  const [search, setSearch] = useState("");

  const totalVolume = CARBON_MARKETS.reduce((s, m) => s + m.volume24h, 0);
  const totalAvail  = CARBON_MARKETS.reduce((s, m) => s + m.available, 0);
  const avgPrice    = CARBON_MARKETS.reduce((s, m) => s + m.pricePerToken, 0) / CARBON_MARKETS.length;

  const displayed = useMemo(() => {
    let list = CARBON_MARKETS.filter((m) => {
      if (filter !== "All" && m.carbonType !== filter) return false;
      if (search && !m.farmName.toLowerCase().includes(search.toLowerCase()) && !m.region.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      const vals: Record<SortKey, number> = {
        price:     a.pricePerToken - b.pricePerToken,
        volume:    a.volume24h - b.volume24h,
        change:    a.change24h - b.change24h,
        available: a.available - b.available,
      };
      return sortDesc ? -vals[sort] : vals[sort];
    });
    return list;
  }, [filter, sort, sortDesc, search]);

  return (
    <main className="relative min-h-screen bg-[#020817] text-white">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/3 h-96 w-96 rounded-full bg-emerald-500/7 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-cyan-500/6 blur-[80px]" />
      </div>
      <div className="pointer-events-none fixed inset-0 bg-dot-grid opacity-20" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6">

        {/* ── Header nav ─────────────────────────────────────────────── */}
        <header className="animate-slide-up mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 px-5 py-3.5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2 text-sm text-slate-400 transition hover:text-white">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Dashboard
            </Link>
            <span className="text-slate-700">/</span>
            <span className="text-sm font-bold text-white">Carbon Market</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="h-1.5 w-1.5 animate-blink rounded-full bg-emerald-400 inline-block" />
              Live pricing
            </span>
          </div>
        </header>

        {/* ── Hero stats ─────────────────────────────────────────────── */}
        <div className="animate-slide-up delay-100 mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total Volume 24h", value: `${(totalVolume / 1000).toFixed(0)}K CO₂`, accent: "text-white" },
            { label: "Active Markets", value: CARBON_MARKETS.length.toString(), accent: "text-emerald-400" },
            { label: "Avg Price / CO₂", value: `$${avgPrice.toFixed(2)}`, accent: "text-cyan-400" },
            { label: "Credits Available", value: `${(totalAvail / 1000).toFixed(0)}K`, accent: "text-amber-400" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-slate-800 bg-slate-900/60 px-5 py-4">
              <p className="text-[11px] uppercase tracking-wider text-slate-600">{s.label}</p>
              <p className={`mt-1 font-mono text-2xl font-bold ${s.accent}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── Filters + search ───────────────────────────────────────── */}
        <div className="animate-slide-up delay-200 mb-5 flex flex-wrap items-center justify-between gap-3">
          {/* Type filters */}
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                  filter === f.value
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/40"
                    : "border border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search + sort */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search markets…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-900 py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-600 focus:border-emerald-500/50 focus:outline-none w-48"
              />
            </div>

            <div className="flex items-center gap-1">
              {SORT_OPTIONS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => { if (sort === s.key) setSortDesc((d) => !d); else { setSort(s.key); setSortDesc(true); } }}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition ${
                    sort === s.key ? "bg-slate-700 text-white" : "text-slate-500 hover:text-white"
                  }`}
                >
                  {s.label}
                  {sort === s.key && <span className="text-[9px]">{sortDesc ? "▼" : "▲"}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Market count ──────────────────────────────────────────── */}
        <p className="mb-4 text-xs text-slate-600">{displayed.length} market{displayed.length !== 1 ? "s" : ""}</p>

        {/* ── Market grid ───────────────────────────────────────────── */}
        {displayed.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-24 text-slate-600">
            <span className="text-5xl opacity-30">🌿</span>
            <p>No markets match your filter.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {displayed.map((market) => {
              const idx = CARBON_MARKETS.indexOf(market);
              return <MarketCard key={market.id} market={market} idx={idx} />;
            })}
          </div>
        )}

        {/* ── Table view (below grid) ───────────────────────────────── */}
        <div className="animate-fade-in delay-400 mt-10 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
          <div className="border-b border-slate-800 px-5 py-4">
            <h2 className="text-sm font-bold">Market Overview</h2>
            <p className="text-xs text-slate-500">All carbon credit markets sorted by volume</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-600">
                  <th className="px-5 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Market</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-right">24h</th>
                  <th className="px-4 py-3 text-right">Volume 24h</th>
                  <th className="px-4 py-3 text-right">Available</th>
                  <th className="px-4 py-3 text-right">7d Chart</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {CARBON_MARKETS.sort((a, b) => b.volume24h - a.volume24h).map((market, rank) => {
                  const idx = CARBON_MARKETS.indexOf(market);
                  const prices = generatePrices(market.pricePerToken, idx);
                  const pos = market.change24h >= 0;
                  return (
                    <tr key={market.id} className="group transition hover:bg-slate-800/30">
                      <td className="px-5 py-3 font-mono text-slate-600">{rank + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{market.flag}</span>
                          <div>
                            <p className="font-semibold text-white">{market.farmName}</p>
                            <p className="text-[10px] text-slate-600">{market.region} · {market.vintage}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><TypeBadge type={market.carbonType} /></td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-white">${market.pricePerToken.toFixed(2)}</td>
                      <td className={`px-4 py-3 text-right font-mono font-semibold ${pos ? "text-emerald-400" : "text-red-400"}`}>
                        {pos ? "+" : ""}{market.change24h.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-300">{(market.volume24h / 1000).toFixed(0)}K</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-400">{(market.available / 1000).toFixed(0)}K</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <Sparkline prices={prices} positive={pos} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/marketplace/trade?market=${market.id}`}
                          className="rounded-lg bg-emerald-600/20 px-3 py-1.5 text-[11px] font-bold text-emerald-300 transition hover:bg-emerald-600 hover:text-white"
                        >
                          Trade
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer note */}
        <p className="mt-6 text-center text-xs text-slate-700">
          Prices are indicative. All trades settle on Solana Devnet via the Root-Chain Token-2022 program.
        </p>
      </div>
    </main>
  );
}
