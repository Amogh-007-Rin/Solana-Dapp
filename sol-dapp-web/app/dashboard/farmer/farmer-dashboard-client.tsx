"use client";

import { useMemo, useState } from "react";
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
  "Land details submitted",
  "Geo mapping in progress",
  "Biomass and area verification",
  "NFT certificate issued",
  "Carbon credits minted",
  "Transfer to Phantom wallet",
];

export function FarmerDashboardClient({ user }: { user: FarmerUser }) {
  const { publicKey } = useWallet();
  const [landName, setLandName] = useState("Green Valley Plot A");
  const [landAreaAcres, setLandAreaAcres] = useState(22);
  const [biomassIndex, setBiomassIndex] = useState(1.4);
  const [status, setStatus] = useState("");
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [runningFlow, setRunningFlow] = useState(false);
  const [result, setResult] = useState<MintResult | null>(null);

  const projectedCredits = useMemo(() => Math.max(1, Math.floor(landAreaAcres * biomassIndex * 3.2)), [landAreaAcres, biomassIndex]);

  async function runRegistrationFlow() {
    setRunningFlow(true);
    setStatus("Starting geo-verification flow...");
    setResult(null);

    for (let i = 0; i < FLOW_STEPS.length - 1; i += 1) {
      setCurrentStep(i);
      setStatus(FLOW_STEPS[i]);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    try {
      const response = await fetch("/api/farmer/register-land", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          landName,
          landAreaAcres,
          biomassIndex,
          walletAddress: publicKey?.toBase58(),
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const payload = (await response.json()) as MintResult;
      setResult(payload);
      setCurrentStep(FLOW_STEPS.length - 1);
      setStatus(payload.carbonCredits.transferStatus === "transferred_to_wallet"
        ? "Flow complete. Carbon credits transferred to Phantom wallet."
        : "Flow complete. Connect Phantom wallet to simulate transfer.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Flow failed");
    } finally {
      setRunningFlow(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#020817] text-white">
      <div className="pointer-events-none fixed inset-0 bg-dot-grid opacity-20" />
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6">

        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-5 py-4 backdrop-blur-md">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-amber-300">Farmer Dashboard</p>
            <h1 className="mt-1 text-xl font-bold">Land Registration and Carbon Credit Issuance</h1>
            <p className="text-xs text-slate-500">{user.name} · {user.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <WalletMultiButton />
            <Link href="/marketplace/trade" className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-400 transition hover:text-white">
              Trade Desk
            </Link>
          </div>
        </header>

        <section className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
            <p className="text-[11px] uppercase tracking-wider text-slate-600">Land Area</p>
            <p className="mt-1 font-mono text-2xl font-bold text-white">{landAreaAcres.toFixed(1)} acres</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
            <p className="text-[11px] uppercase tracking-wider text-slate-600">Biomass Index</p>
            <p className="mt-1 font-mono text-2xl font-bold text-emerald-300">{biomassIndex.toFixed(2)}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
            <p className="text-[11px] uppercase tracking-wider text-slate-600">Projected Credits</p>
            <p className="mt-1 font-mono text-2xl font-bold text-amber-300">{projectedCredits} rCO2</p>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="text-base font-bold">Register Land for NFT Issuance</h2>
            <p className="mt-1 text-xs text-slate-500">Fill land metadata, run geo-mapping animation, and issue a mock verification NFT.</p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-slate-400">
                Land name
                <input
                  type="text"
                  value={landName}
                  onChange={(e) => setLandName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                />
              </label>
              <label className="text-xs text-slate-400">
                Land area (acres)
                <input
                  type="number"
                  min={1}
                  step={0.5}
                  value={landAreaAcres}
                  onChange={(e) => setLandAreaAcres(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                />
              </label>
              <label className="text-xs text-slate-400">
                Biomass index
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={biomassIndex}
                  onChange={(e) => setBiomassIndex(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                />
              </label>
              <div className="text-xs text-slate-500">
                <p className="text-slate-400">Connected wallet</p>
                <p className="mt-1 break-all rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-[11px]">
                  {publicKey?.toBase58() ?? "Connect Phantom wallet to receive minted credits"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void runRegistrationFlow()}
              disabled={runningFlow}
              className="mt-4 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-900 transition hover:bg-amber-400 disabled:opacity-60"
            >
              {runningFlow ? "Running Verification..." : "Register Land and Issue NFT"}
            </button>

            {status && (
              <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                {status}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="text-base font-bold">Geo-Mapping Flow</h2>
            <ul className="mt-4 space-y-2">
              {FLOW_STEPS.map((step, idx) => {
                const active = idx === currentStep;
                const done = idx < currentStep;
                return (
                  <li
                    key={step}
                    className={`rounded-lg border px-3 py-2 text-xs transition ${
                      done
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : active
                          ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                          : "border-slate-800 bg-slate-900 text-slate-500"
                    }`}
                  >
                    <span className={`mr-2 inline-block h-2 w-2 rounded-full ${active ? "animate-pulse bg-cyan-400" : done ? "bg-emerald-400" : "bg-slate-700"}`} />
                    {step}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {result && (
          <section className="mt-6 grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-950/25 p-5">
              <h3 className="text-sm font-bold text-emerald-300">Issued Verification NFT</h3>
              <img src={result.nft.image} alt="Mock land NFT" className="mt-3 h-40 w-full rounded-xl object-cover" />
              <p className="mt-3 text-xs text-emerald-200">{result.nft.name}</p>
              <p className="mt-1 font-mono text-[11px] text-emerald-400">{result.nft.id}</p>
              <a href={result.nft.metadataUri} target="_blank" className="mt-2 inline-block text-xs text-emerald-300 underline" rel="noreferrer">
                View metadata URI
              </a>
            </div>
            <div className="rounded-2xl border border-cyan-500/25 bg-cyan-950/20 p-5">
              <h3 className="text-sm font-bold text-cyan-300">Minted Carbon Credits</h3>
              <p className="mt-3 text-3xl font-mono font-bold text-white">{result.carbonCredits.amount} {result.carbonCredits.tokenSymbol}</p>
              <p className="mt-1 text-xs text-cyan-200">Calculation: {result.metrics.calculation}</p>
              <p className="mt-2 text-xs text-slate-300">Transfer status: {result.carbonCredits.transferStatus}</p>
              {result.carbonCredits.recipientWallet && (
                <p className="mt-2 break-all font-mono text-[11px] text-slate-400">Wallet: {result.carbonCredits.recipientWallet}</p>
              )}
              {result.carbonCredits.transferTx && (
                <p className="mt-1 break-all font-mono text-[11px] text-cyan-400">Tx: {result.carbonCredits.transferTx}</p>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
