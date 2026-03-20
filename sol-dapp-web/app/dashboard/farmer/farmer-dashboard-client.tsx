"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";

interface FarmerUser {
  name: string;
  email: string;
  participantType: "farmer" | "industrialist";
}

interface MintResult {
  verificationStatus: string;
  nft: {
    id: string;
    name: string;
    metadataUri: string;
    image: string;
    issuedAt: string;
  };
  carbonCredits: {
    tokenSymbol: string;
    amount: number;
    mintAddress: string;
    transferStatus: string;
    recipientWallet: string | null;
    transferTx: string | null;
  };
  metrics: {
    landAreaAcres: number;
    biomassIndex: number;
    calculation: string;
  };
}

const FLOW_STEPS = [
  { id: 0, label: "Land details submitted",        icon: "📋", phase: "init" },
  { id: 1, label: "Geo-boundary mapping",          icon: "🗺️", phase: "mapping" },
  { id: 2, label: "Satellite NDVI scan",           icon: "🛰️", phase: "scan" },
  { id: 3, label: "Biomass & area verification",   icon: "🌿", phase: "verify" },
  { id: 4, label: "NFT certificate issued on-chain",icon: "🎫", phase: "nft" },
  { id: 5, label: "Carbon credits minted",         icon: "🪙", phase: "mint" },
  { id: 6, label: "Transfer to Phantom wallet",    icon: "👻", phase: "transfer" },
];

// ─── Geo-mapping SVG animation ──────────────────────────────────────────────
function GeoMapAnimation({ phase }: { phase: number }) {
  const polygonRef  = useRef<SVGPolygonElement>(null);
  const scanRef     = useRef<SVGLineElement>(null);

  const pts = "200,60 340,90 370,200 310,290 180,270 110,180 140,80";

  useEffect(() => {
    const poly = polygonRef.current;
    if (!poly) return;
    if (phase >= 1) {
      const len = poly.getTotalLength?.() ?? 600;
      poly.style.strokeDasharray = `${len}`;
      poly.style.strokeDashoffset = phase >= 2 ? "0" : `${len}`;
      poly.style.transition = "stroke-dashoffset 2s ease-out";
    }
  }, [phase]);

  const ndviColors = [
    { x: 140, y: 100, r: 40, color: "#22c55e", opacity: 0.25 },
    { x: 280, y: 120, r: 55, color: "#86efac", opacity: 0.22 },
    { x: 310, y: 230, r: 45, color: "#16a34a", opacity: 0.28 },
    { x: 180, y: 230, r: 50, color: "#4ade80", opacity: 0.2 },
    { x: 240, y: 170, r: 60, color: "#15803d", opacity: 0.18 },
  ];

  const dataPoints = [
    { x: 200, y: 60 }, { x: 340, y: 90 }, { x: 370, y: 200 },
    { x: 310, y: 290 }, { x: 180, y: 270 }, { x: 110, y: 180 }, { x: 140, y: 80 },
  ];

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
      <svg viewBox="0 0 480 360" className="w-full" style={{ height: "260px" }}>
        {/* Grid */}
        {Array.from({ length: 12 }).map((_, i) => (
          <line key={`gx-${i}`} x1={i * 40} y1={0} x2={i * 40} y2={360}
            stroke="rgba(100,116,139,0.12)" strokeWidth="0.8" />
        ))}
        {Array.from({ length: 9 }).map((_, i) => (
          <line key={`gy-${i}`} x1={0} y1={i * 40} x2={480} y2={i * 40}
            stroke="rgba(100,116,139,0.12)" strokeWidth="0.8" />
        ))}

        {/* Terrain background hint */}
        <ellipse cx="240" cy="180" rx="170" ry="130" fill="rgba(16,185,129,0.04)" />

        {/* NDVI heat zones — phase 3+ */}
        {phase >= 3 && ndviColors.map((z, i) => (
          <circle
            key={`ndvi-${i}`}
            cx={z.x} cy={z.y} r={z.r}
            fill={z.color}
            fillOpacity={z.opacity}
            style={{
              animation: `geoFadeIn 0.6s ease-out both`,
              animationDelay: `${i * 0.12}s`,
            }}
          />
        ))}

        {/* Boundary polygon */}
        {phase >= 1 && (
          <polygon
            ref={polygonRef}
            points={pts}
            fill={phase >= 3 ? "rgba(16,185,129,0.08)" : "none"}
            stroke="#10b981"
            strokeWidth="2.5"
            strokeLinejoin="round"
            style={{
              strokeDasharray: phase >= 2 ? "none" : "600",
              strokeDashoffset: phase >= 2 ? "0" : "600",
              transition: "stroke-dashoffset 2.2s ease-out, fill 0.8s ease-out",
            }}
          />
        )}

        {/* Scan line — phase 2 */}
        {phase === 2 && (
          <line
            ref={scanRef}
            x1={90} y1={50} x2={400} y2={50}
            stroke="#06b6d4"
            strokeWidth="2"
            strokeOpacity="0.9"
            style={{ animation: "geoScan 2s linear forwards" }}
          />
        )}

        {/* Data pins — phase 2+ */}
        {phase >= 2 && dataPoints.map((pt, i) => (
          <g key={`pin-${i}`} style={{ animationDelay: `${i * 0.15}s` }}>
            <circle
              cx={pt.x} cy={pt.y} r="5"
              fill="#10b981"
              style={{ animation: "geoFadeIn 0.4s ease-out both", animationDelay: `${i * 0.15}s` }}
            />
            <circle
              cx={pt.x} cy={pt.y} r="10"
              fill="none"
              stroke="#10b981"
              strokeWidth="1.5"
              strokeOpacity="0.4"
              style={{ animation: "geoPing 2s ease-out infinite", animationDelay: `${i * 0.2}s` }}
            />
          </g>
        ))}

        {/* Center coordinate label — phase 2+ */}
        {phase >= 2 && (
          <text x="240" y="175" textAnchor="middle" fontSize="9" fill="#34d399" fontFamily="monospace"
            style={{ animation: "geoFadeIn 0.6s ease-out both", animationDelay: "0.5s" }}>
            12.9716°N, 77.5946°E
          </text>
        )}

        {/* NDVI score badge — phase 3+ */}
        {phase >= 3 && (
          <g style={{ animation: "geoFadeIn 0.5s ease-out both", animationDelay: "0.3s" }}>
            <rect x="20" y="20" width="90" height="28" rx="5"
              fill="rgba(6,78,59,0.7)" stroke="rgba(16,185,129,0.4)" strokeWidth="1" />
            <text x="65" y="32" textAnchor="middle" fontSize="7.5" fill="#6ee7b7" fontFamily="monospace">NDVI INDEX</text>
            <text x="65" y="43" textAnchor="middle" fontSize="10" fill="#34d399" fontWeight="bold" fontFamily="monospace">0.68 ↑</text>
          </g>
        )}

        {/* NFT badge — phase 4+ */}
        {phase >= 4 && (
          <g style={{ animation: "geoFadeIn 0.5s ease-out both" }}>
            <rect x="370" y="20" width="88" height="28" rx="5"
              fill="rgba(55,48,163,0.6)" stroke="rgba(129,140,248,0.4)" strokeWidth="1" />
            <text x="414" y="32" textAnchor="middle" fontSize="7.5" fill="#a5b4fc" fontFamily="monospace">NFT ISSUED</text>
            <text x="414" y="43" textAnchor="middle" fontSize="9" fill="#818cf8" fontWeight="bold" fontFamily="monospace">✓ ON-CHAIN</text>
          </g>
        )}

        {/* Area label */}
        {phase >= 1 && (
          <text x="240" y="350" textAnchor="middle" fontSize="8" fill="#475569" fontFamily="monospace">
            Registered Land Boundary · Root-Chain Oracle
          </text>
        )}
      </svg>

      {/* Phase status bar */}
      <div className="flex items-center gap-2 border-t border-slate-800 bg-slate-950/80 px-3 py-2">
        <span className={`h-1.5 w-1.5 rounded-full ${phase >= 1 ? "bg-emerald-400 animate-pulse" : "bg-slate-700"}`} />
        <span className="text-[10px] font-mono text-slate-500">
          {phase === 0 && "Awaiting submission…"}
          {phase === 1 && "Drawing geo-boundary…"}
          {phase === 2 && "Satellite scan in progress…"}
          {phase === 3 && "Biomass analysis complete"}
          {phase === 4 && "NFT certificate minted"}
          {phase === 5 && "Carbon credits issued"}
          {phase >= 6 && "Transfer complete ✓"}
        </span>
        {phase >= 3 && (
          <span className="ml-auto rounded bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] text-emerald-400">
            {phase >= 5 ? "VERIFIED ✓" : "ANALYZING…"}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── NFT Certificate card ────────────────────────────────────────────────────
function NftCertificate({ nft, metrics, credits }: {
  nft: MintResult["nft"];
  metrics: MintResult["metrics"];
  credits: MintResult["carbonCredits"];
}) {
  const shortId = nft.id.slice(-12).toUpperCase();

  return (
    <div className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-slate-900 via-indigo-950/30 to-slate-900 p-5 shadow-2xl shadow-indigo-900/20">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/5 via-transparent to-emerald-500/5" />

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300">Land Verification NFT</p>
          <h3 className="mt-1 text-base font-bold text-white">{nft.name}</h3>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 ring-1 ring-indigo-500/30">
          <span className="text-xl">🎫</span>
        </div>
      </div>

      {/* Image */}
      <div className="relative mt-4 overflow-hidden rounded-xl">
        <img
          src={nft.image}
          alt="Land NFT"
          className="h-32 w-full object-cover"
          style={{ filter: "saturate(0.7) brightness(0.85)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
        <div className="absolute bottom-2 left-3">
          <span className="rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-bold text-white">VERIFIED</span>
        </div>
      </div>

      {/* Metadata grid */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {[
          { label: "Token ID",    value: shortId,                          mono: true },
          { label: "Standard",   value: "Token-2022",                     mono: false },
          { label: "Land Area",  value: `${metrics.landAreaAcres} acres`, mono: true },
          { label: "NDVI Index", value: metrics.biomassIndex.toFixed(2),  mono: true },
        ].map((m) => (
          <div key={m.label} className="rounded-lg bg-slate-900/60 px-2.5 py-2">
            <p className="text-[10px] text-slate-600">{m.label}</p>
            <p className={`mt-0.5 text-xs text-slate-200 ${m.mono ? "font-mono" : "font-semibold"}`}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Issued timestamp */}
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-indigo-500/20 bg-indigo-500/5 px-3 py-2">
        <svg className="h-3 w-3 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="font-mono text-[10px] text-indigo-300">
          Issued: {new Date(nft.issuedAt).toLocaleString()}
        </p>
      </div>

      <a
        href={nft.metadataUri}
        target="_blank"
        rel="noreferrer"
        className="mt-3 flex items-center gap-1.5 text-[11px] text-indigo-400 underline underline-offset-2 transition hover:text-indigo-300"
      >
        View on-chain metadata
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    </div>
  );
}

// ─── Carbon credits card ─────────────────────────────────────────────────────
function CarbonCreditsCard({ credits, metrics }: {
  credits: MintResult["carbonCredits"];
  metrics: MintResult["metrics"];
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-slate-900 via-emerald-950/20 to-slate-900 p-5 shadow-2xl shadow-emerald-900/20">
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/5 via-transparent to-cyan-500/5" />

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">Carbon Credits Minted</p>
          <p className="mt-2 font-mono text-4xl font-extrabold text-white">
            {credits.amount}
            <span className="ml-2 text-xl text-emerald-400">{credits.tokenSymbol}</span>
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-500/30">
          <span className="text-xl">🪙</span>
        </div>
      </div>

      <p className="mt-1 text-xs text-slate-500">Calculation: {metrics.calculation} = {credits.amount}</p>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between rounded-lg bg-slate-900/60 px-3 py-2">
          <p className="text-xs text-slate-500">Mint address</p>
          <p className="font-mono text-[11px] text-emerald-300">{credits.mintAddress.slice(0, 16)}…</p>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-slate-900/60 px-3 py-2">
          <p className="text-xs text-slate-500">Transfer status</p>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
            credits.transferStatus === "transferred_to_wallet"
              ? "bg-emerald-500/20 text-emerald-300"
              : "bg-amber-500/20 text-amber-300"
          }`}>
            {credits.transferStatus === "transferred_to_wallet" ? "✓ Transferred" : "⏳ Wallet not connected"}
          </span>
        </div>
        {credits.recipientWallet && (
          <div className="rounded-lg bg-slate-900/60 px-3 py-2">
            <p className="text-[10px] text-slate-600">Recipient wallet</p>
            <p className="mt-0.5 break-all font-mono text-[10px] text-slate-400">{credits.recipientWallet}</p>
          </div>
        )}
        {credits.transferTx && (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
            <p className="text-[10px] text-emerald-600">Transaction hash</p>
            <p className="mt-0.5 break-all font-mono text-[10px] text-emerald-400">{credits.transferTx.slice(0, 32)}…</p>
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <Link
          href="/marketplace/trade"
          className="flex-1 rounded-xl bg-emerald-600 py-2 text-center text-xs font-bold text-white transition hover:bg-emerald-500"
        >
          List on Market
        </Link>
        <Link
          href="/marketplace"
          className="flex-1 rounded-xl border border-emerald-500/30 py-2 text-center text-xs font-semibold text-emerald-400 transition hover:bg-emerald-500/10"
        >
          View Market
        </Link>
      </div>
    </div>
  );
}

// ─── Main dashboard ──────────────────────────────────────────────────────────
export function FarmerDashboardClient({ user }: { user: FarmerUser }) {
  const { publicKey } = useWallet();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const walletKey = mounted ? publicKey : null;
  const [landName,      setLandName]      = useState("Green Valley Plot A");
  const [landAreaAcres, setLandAreaAcres] = useState(22);
  const [biomassIndex,  setBiomassIndex]  = useState(1.4);
  const [currentStep,   setCurrentStep]   = useState(-1);
  const [geoPhase,      setGeoPhase]      = useState(0);
  const [runningFlow,   setRunningFlow]   = useState(false);
  const [result,        setResult]        = useState<MintResult | null>(null);
  const [statusMsg,     setStatusMsg]     = useState("");
  const [error,         setError]         = useState("");

  const projectedCredits = useMemo(
    () => Math.max(1, Math.floor(landAreaAcres * biomassIndex * 3.2)),
    [landAreaAcres, biomassIndex],
  );

  async function delay(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async function runRegistrationFlow() {
    setRunningFlow(true);
    setResult(null);
    setError("");
    setCurrentStep(0);
    setGeoPhase(0);
    setStatusMsg("Submitting land details…");

    await delay(800);
    setCurrentStep(1); setGeoPhase(1); setStatusMsg("Drawing geo-boundary…");
    await delay(1400);
    setCurrentStep(2); setGeoPhase(2); setStatusMsg("Satellite NDVI scan in progress…");
    await delay(2000);
    setCurrentStep(3); setGeoPhase(3); setStatusMsg("Verifying biomass and area…");
    await delay(1200);

    try {
      const response = await fetch("/api/farmer/register-land", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          landName,
          landAreaAcres,
          biomassIndex,
          walletAddress: walletKey?.toBase58(),
        }),
      });

      if (!response.ok) throw new Error(await response.text());
      const payload = (await response.json()) as MintResult;

      setCurrentStep(4); setGeoPhase(4); setStatusMsg("Issuing NFT certificate on-chain…");
      await delay(900);
      setCurrentStep(5); setGeoPhase(5); setStatusMsg("Minting carbon credit tokens…");
      await delay(800);
      setCurrentStep(6); setGeoPhase(6);
      setStatusMsg(
        payload.carbonCredits.transferStatus === "transferred_to_wallet"
          ? "Credits transferred to Phantom wallet ✓"
          : "Flow complete. Connect Phantom wallet to receive credits.",
      );
      setResult(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Flow failed");
      setGeoPhase(0);
    } finally {
      setRunningFlow(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#020817] text-white">
      <style>{`
        @keyframes geoFadeIn { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
        @keyframes geoScan   { from { transform: translateY(0); } to { transform: translateY(260px); } }
        @keyframes geoPing   { 0% { r: 10; stroke-opacity: 0.6; } 100% { r: 28; stroke-opacity: 0; } }
      `}</style>

      <div className="pointer-events-none fixed inset-0 bg-dot-grid opacity-20" />
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-amber-500/6 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-emerald-500/6 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6">

        {/* ── Header ── */}
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-5 py-4 backdrop-blur-md">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
                Farmer Dashboard
              </span>
            </div>
            <h1 className="mt-1 text-xl font-bold">Land Registration & Carbon Credit Issuance</h1>
            <p className="text-xs text-slate-500">{user.name} · {user.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <WalletMultiButton />
            <Link href="/marketplace/trade" className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-400 transition hover:text-white">
              Trade Desk
            </Link>
            <Link href="/marketplace" className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-400 transition hover:text-white">
              Market
            </Link>
          </div>
        </header>

        {/* ── Stats row ── */}
        <section className="mb-6 grid gap-3 sm:grid-cols-4">
          {[
            { label: "Land Area",         value: `${landAreaAcres.toFixed(1)} ac`, color: "text-white" },
            { label: "Biomass Index",     value: biomassIndex.toFixed(2),           color: "text-emerald-300" },
            { label: "Projected Credits", value: `${projectedCredits} rCO2`,        color: "text-amber-300" },
            { label: "Wallet",            value: walletKey ? `${walletKey.toBase58().slice(0, 8)}…` : "Not connected", color: walletKey ? "text-cyan-300" : "text-slate-600" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-slate-600">{s.label}</p>
              <p className={`mt-1 font-mono text-lg font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </section>

        {/* ── Main grid ── */}
        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">

          {/* ── Registration form ── */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="text-base font-bold">Register Land for NFT Issuance</h2>
            <p className="mt-1 text-xs text-slate-500">Fill in land metadata and run the geo-verification flow to receive a land NFT and carbon credits.</p>

            <div className="mt-5 space-y-3">
              <label className="block text-xs text-slate-400">
                Land name / Plot ID
                <input
                  type="text"
                  value={landName}
                  onChange={(e) => setLandName(e.target.value)}
                  disabled={runningFlow}
                  className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-amber-500/50 focus:outline-none disabled:opacity-60"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs text-slate-400">
                  Land area (acres)
                  <input
                    type="number"
                    min={1}
                    step={0.5}
                    value={landAreaAcres}
                    onChange={(e) => setLandAreaAcres(Number(e.target.value))}
                    disabled={runningFlow}
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white focus:border-amber-500/50 focus:outline-none disabled:opacity-60"
                  />
                </label>
                <label className="block text-xs text-slate-400">
                  Biomass index (NDVI)
                  <input
                    type="number"
                    min={0.1}
                    step={0.05}
                    value={biomassIndex}
                    onChange={(e) => setBiomassIndex(Number(e.target.value))}
                    disabled={runningFlow}
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white focus:border-amber-500/50 focus:outline-none disabled:opacity-60"
                  />
                </label>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2.5">
                <p className="text-[10px] text-slate-600">Connected Phantom wallet</p>
                <p className="mt-0.5 break-all font-mono text-xs text-slate-400">
                  {walletKey?.toBase58() ?? "Connect Phantom wallet above to receive minted credits"}
                </p>
              </div>

              {/* Projection preview */}
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-amber-300">Estimated carbon credits</span>
                  <span className="font-mono text-xl font-bold text-amber-300">{projectedCredits} rCO2</span>
                </div>
                <p className="mt-1 text-[10px] text-amber-400/60">{landAreaAcres} × {biomassIndex} × 3.2 = {projectedCredits}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void runRegistrationFlow()}
              disabled={runningFlow || !landName || landAreaAcres <= 0 || biomassIndex <= 0}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-slate-900 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {runningFlow ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Running Verification Flow…
                </>
              ) : (
                <>
                  <span>🚀</span>
                  Register Land & Issue NFT
                </>
              )}
            </button>

            {error && (
              <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                {error}
              </div>
            )}
          </div>

          {/* ── Geo-mapping animation + flow steps ── */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold">Geo-Mapping Satellite View</h2>
                {geoPhase >= 3 && (
                  <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                    LIVE
                  </span>
                )}
              </div>
              <GeoMapAnimation phase={geoPhase} />
            </div>

            {/* Flow steps */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <h2 className="mb-3 text-sm font-bold">Verification Flow</h2>
              <div className="space-y-2">
                {FLOW_STEPS.map((step) => {
                  const done   = step.id < currentStep;
                  const active = step.id === currentStep;
                  const idle   = step.id > currentStep;
                  return (
                    <div
                      key={step.id}
                      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-xs transition-all duration-300 ${
                        done
                          ? "border-emerald-500/30 bg-emerald-500/8 text-emerald-300"
                          : active
                            ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                            : "border-slate-800 bg-slate-900/40 text-slate-600"
                      }`}
                    >
                      <span className="text-base leading-none">{step.icon}</span>
                      <span className="flex-1">{step.label}</span>
                      {done   && <span className="text-emerald-400">✓</span>}
                      {active && <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />}
                    </div>
                  );
                })}
              </div>

              {statusMsg && (
                <div className="mt-3 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-[11px] text-slate-400">
                  › {statusMsg}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Results ── */}
        {result && (
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <NftCertificate nft={result.nft} metrics={result.metrics} credits={result.carbonCredits} />
            <CarbonCreditsCard credits={result.carbonCredits} metrics={result.metrics} />
          </div>
        )}
      </div>
    </main>
  );
}
