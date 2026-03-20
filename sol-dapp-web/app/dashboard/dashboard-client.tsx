"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Ed25519Program, PublicKey, Transaction } from "@solana/web3.js";
import { signOut } from "next-auth/react";
import Link from "next/link";
import type { OraclePayload } from "@/lib/oracle";
import {
  buildCreateOwnerTokenAtaIx,
  buildMintCarbonCreditsIx,
  buildRegisterFarmIx,
  buildRetireCreditsIx,
  deriveFarmPda,
  deriveMintAuthorityPda,
  deriveOwnerToken2022Ata,
  fetchFarmAccount,
  hexToBytes,
  type FarmAccountData,
} from "@/lib/program-instructions";

interface ServiceStatus { name: string; ok: boolean; detail: string; }
interface LiveEvent { id: string; eventType: "MINT" | "BURN"; owner: string; amount: number; timestamp: number; signature: string; }
interface CarbonStats { totalCarbonLocked: number; totalCarbonRetired: number; totalEvents: number; }
interface DashboardClientProps { email: string; name: string; role: "operator" | "admin" | "auditor"; }

const ROLE_COLORS: Record<string, string> = {
  admin:    "bg-rose-500/15 text-rose-300 border-rose-500/30",
  auditor:  "bg-amber-500/15 text-amber-300 border-amber-500/30",
  operator: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
};

export function DashboardClient({ email, name, role }: DashboardClientProps) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const programId = useMemo(
    () => new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID ?? "8qJjY3qeJc9cTGw3GRW7xVfN32B2j3YkM3p6N5cm6QkM"), [],
  );
  const co2Mint = useMemo(() => {
    const mint = process.env.NEXT_PUBLIC_CO2_MINT;
    return mint ? new PublicKey(mint) : null;
  }, []);

  const [registerLoading, setRegisterLoading] = useState(false);
  const [claimLoading, setClaimLoading]       = useState(false);
  const [retireLoading, setRetireLoading]     = useState(false);
  const [statusLoading, setStatusLoading]     = useState(false);
  const [farmLoading, setFarmLoading]         = useState(false);

  const [oracleData, setOracleData]     = useState<OraclePayload | null>(null);
  const [farmAccount, setFarmAccount]   = useState<FarmAccountData | null>(null);
  const [services, setServices]         = useState<ServiceStatus[]>([]);
  const [liveEvents, setLiveEvents]     = useState<LiveEvent[]>([]);
  const [carbonStats, setCarbonStats]   = useState<CarbonStats | null>(null);
  const [signature, setSignature]       = useState<string | null>(null);
  const [status, setStatus]             = useState<string>("Ready.");
  const [retireAmount, setRetireAmount] = useState<number>(1);
  const [areaGeojson, setAreaGeojson]   = useState<string>(
    JSON.stringify({ type: "Point", coordinates: [77.5946, 12.9716] }),
  );

  const socketRef = useRef<ReturnType<typeof import("socket.io-client").io> | null>(null);

  const farmPda = useMemo(() => (publicKey ? deriveFarmPda(publicKey, programId) : null), [publicKey, programId]);

  // Socket.IO
  useEffect(() => {
    const sbUrl = process.env.NEXT_PUBLIC_SB_SERVER_URL ?? "http://127.0.0.1:7001";
    let socket: ReturnType<typeof import("socket.io-client").io>;
    import("socket.io-client").then(({ io }) => {
      socket = io(sbUrl, { transports: ["websocket", "polling"] });
      socketRef.current = socket;
      socket.on("CACHE_SNAPSHOT", (data: CarbonStats) => setCarbonStats(data));
      socket.on("NEW_OFFSET", (ev: Omit<LiveEvent, "id">) => {
        setLiveEvents((p) => [{ ...ev, id: `${ev.signature}-${Date.now()}` }, ...p.slice(0, 19)]);
        setCarbonStats((p) => p ? { ...p, totalCarbonRetired: p.totalCarbonRetired + ev.amount, totalEvents: p.totalEvents + 1 } : p);
      });
      socket.on("NEW_MINT", (ev: Omit<LiveEvent, "id">) => {
        setLiveEvents((p) => [{ ...ev, id: `${ev.signature}-${Date.now()}` }, ...p.slice(0, 19)]);
        setCarbonStats((p) => p ? { ...p, totalCarbonLocked: p.totalCarbonLocked + ev.amount, totalEvents: p.totalEvents + 1 } : p);
      });
    });
    return () => { socket?.disconnect(); };
  }, []);

  // Auto-fetch farm on wallet connect
  useEffect(() => {
    if (!farmPda) { setFarmAccount(null); return; }
    void loadFarmAccount(farmPda);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmPda]);

  const loadFarmAccount = async (pda: PublicKey) => {
    setFarmLoading(true);
    try { setFarmAccount(await fetchFarmAccount(connection, pda)); }
    catch { setFarmAccount(null); }
    finally { setFarmLoading(false); }
  };

  const onRegisterFarm = async () => {
    if (!publicKey || !farmPda) { setStatus("Connect wallet first."); return; }
    setRegisterLoading(true); setSignature(null); setStatus("Submitting register_farm…");
    try {
      const tx = new Transaction();
      tx.add(buildRegisterFarmIx({ programId, owner: publicKey, farmPda, areaGeojson }));
      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");
      setSignature(sig); setStatus("Farm registered on chain.");
      await loadFarmAccount(farmPda);
    } catch (e) { setStatus(`Register failed: ${e instanceof Error ? e.message : e}`); }
    finally { setRegisterLoading(false); }
  };

  const onClaimCredits = async () => {
    if (!publicKey || !farmPda) { setStatus("Connect wallet first."); return; }
    if (!co2Mint) { setStatus("Set NEXT_PUBLIC_CO2_MINT in .env first."); return; }
    setClaimLoading(true); setSignature(null); setStatus("Requesting oracle signature…");
    try {
      const slot = await connection.getSlot("confirmed");
      const res = await fetch("/api/oracle/calculate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ farm_pda: farmPda.toBase58(), coordinates: { lat: 12.9716, lng: 77.5946 }, satellite_provider_api_key: "demo-key", slot_number: slot }),
      });
      if (!res.ok) throw new Error(await res.text());
      const payload = (await res.json()) as OraclePayload;

      const ownerTokenAccount = deriveOwnerToken2022Ata(publicKey, co2Mint);
      const mintAuthority = deriveMintAuthorityPda(programId);
      const tx = new Transaction();

      if (!await connection.getAccountInfo(ownerTokenAccount, "confirmed")) {
        tx.add(buildCreateOwnerTokenAtaIx(publicKey, co2Mint));
      }
      const msgBytes = hexToBytes(payload.message_hex);
      const sigBytes = hexToBytes(payload.signature_hex);
      tx.add(Ed25519Program.createInstructionWithPublicKey({ publicKey: new PublicKey(payload.oracle_pubkey).toBytes(), message: msgBytes, signature: sigBytes }));
      tx.add(buildMintCarbonCreditsIx({ programId, owner: publicKey, farmPda, co2Mint, ownerTokenAccount, mintAuthority, amount: BigInt(payload.amount_carbon), slotNumber: BigInt(payload.slot_number), signature64: sigBytes }));

      const txSig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(txSig, "confirmed");
      setOracleData(payload); setSignature(txSig);
      setStatus(`Minted ${payload.amount_carbon} CO₂ tokens.`);
      await loadFarmAccount(farmPda);
    } catch (e) { setStatus(`Claim failed: ${e instanceof Error ? e.message : e}`); }
    finally { setClaimLoading(false); }
  };

  const onRetireCredits = async () => {
    if (!publicKey || !co2Mint || !farmPda) { setStatus("Connect wallet and ensure farm + mint are configured."); return; }
    setRetireLoading(true); setStatus("Submitting retire transaction…"); setSignature(null);
    try {
      const ownerTokenAccount = deriveOwnerToken2022Ata(publicKey, co2Mint);
      const tx = new Transaction();
      tx.add(buildRetireCreditsIx({ programId, owner: publicKey, farmPda, co2Mint, ownerTokenAccount, amount: BigInt(retireAmount) }));
      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");
      setSignature(sig); setStatus("Retirement confirmed on chain.");
      await loadFarmAccount(farmPda);
    } catch (e) { setStatus(`Retire failed: ${e instanceof Error ? e.message : e}`); }
    finally { setRetireLoading(false); }
  };

  const refreshServices = async () => {
    setStatusLoading(true);
    try {
      const res = await fetch("/api/status", { cache: "no-store" });
      const data = await res.json();
      setServices(data.services ?? []);
      setStatus("Services refreshed.");
    } catch { setStatus("Failed to reach /api/status."); }
    finally { setStatusLoading(false); }
  };

  return (
    <main className="min-h-screen bg-[#020817] text-white">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/3 h-96 w-96 rounded-full bg-emerald-500/6 blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-cyan-500/6 blur-[80px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className="animate-slide-up mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 px-6 py-4 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-500/30">
              <span className="text-base font-bold text-emerald-400">R</span>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Root-Chain</h1>
              <p className="text-xs text-slate-500">{name} · {email}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-widest ${ROLE_COLORS[role]}`}>
              {role}
            </span>
            <WalletMultiButton />
            {role === "admin" && (
              <Link href="/admin" className="rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-3 py-2 text-xs font-semibold text-indigo-300 transition hover:bg-indigo-500/20">
                Admin
              </Link>
            )}
            <button
              type="button"
              onClick={refreshServices}
              disabled={statusLoading}
              className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-400 transition hover:border-slate-500 hover:text-white disabled:opacity-50"
            >
              {statusLoading ? "…" : "Services"}
            </button>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="rounded-lg border border-rose-500/30 px-3 py-2 text-xs font-medium text-rose-400 transition hover:bg-rose-500/10"
            >
              Sign out
            </button>
          </div>
        </header>

        {/* ── Farm stats strip ──────────────────────────────────────────── */}
        {farmAccount && (
          <div className="animate-slide-up delay-100 mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Farm Status", value: farmAccount.isActive ? "Active" : "Inactive", accent: farmAccount.isActive ? "text-emerald-400" : "text-rose-400" },
              { label: "CO₂ Balance", value: farmAccount.amountCarbon.toString(), accent: "text-cyan-300" },
              { label: "Total Sequestered", value: farmAccount.totalCarbonSequestered.toString(), accent: "text-white" },
              { label: "Last Update", value: new Date(Number(farmAccount.lastUpdate) * 1000).toLocaleDateString(), accent: "text-slate-300" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
                <p className="text-[11px] uppercase tracking-wider text-slate-600">{s.label}</p>
                <p className={`mt-1 text-lg font-bold font-mono ${s.accent}`}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Action cards ─────────────────────────────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-3">

          {/* Register Farm */}
          <div className="animate-slide-up delay-100 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-lg">🌾</div>
              <div>
                <h2 className="text-sm font-bold">Register Farm</h2>
                <p className="text-xs text-slate-500">Initialise your on-chain FarmAccount</p>
              </div>
            </div>

            <dl className="mb-4 space-y-2 text-xs">
              <div>
                <dt className="text-slate-500">Wallet</dt>
                <dd className="mt-0.5 truncate font-mono text-slate-300">{publicKey?.toBase58() ?? "Not connected"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Farm PDA</dt>
                <dd className="mt-0.5 truncate font-mono text-slate-400">{farmPda?.toBase58() ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">CO₂ Mint</dt>
                <dd className="mt-0.5 truncate font-mono text-slate-400">{co2Mint?.toBase58() ?? "Set NEXT_PUBLIC_CO2_MINT"}</dd>
              </div>
            </dl>

            <label className="block text-[11px] uppercase tracking-wider text-slate-600">Area GeoJSON</label>
            <textarea
              value={areaGeojson}
              onChange={(e) => setAreaGeojson(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 font-mono text-xs text-slate-300 focus:border-emerald-500/50 focus:outline-none"
            />

            {farmAccount && !farmLoading && (
              <div className="mt-3 rounded-lg border border-emerald-800/40 bg-emerald-950/30 p-3">
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-400">On-Chain State</p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <span className="text-slate-500">Balance</span>
                  <span className="font-mono text-right text-white">{farmAccount.amountCarbon.toString()}</span>
                  <span className="text-slate-500">Sequestered</span>
                  <span className="font-mono text-right text-white">{farmAccount.totalCarbonSequestered.toString()}</span>
                </div>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={onRegisterFarm}
                disabled={registerLoading}
                className="flex-1 rounded-xl bg-amber-600 py-2.5 text-sm font-bold text-white transition hover:bg-amber-500 disabled:opacity-60"
              >
                {registerLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    Registering…
                  </span>
                ) : "Register Farm"}
              </button>
              {farmPda && (
                <button
                  type="button"
                  onClick={() => loadFarmAccount(farmPda)}
                  disabled={farmLoading}
                  className="rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-400 transition hover:text-white disabled:opacity-50"
                  title="Refresh on-chain state"
                >
                  ↺
                </button>
              )}
            </div>
          </div>

          {/* Claim Credits */}
          <div className="animate-slide-up delay-200 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-lg">🛰️</div>
              <div>
                <h2 className="text-sm font-bold">Claim Credits</h2>
                <p className="text-xs text-slate-500">AI oracle verify → mint CO₂ tokens</p>
              </div>
            </div>

            <p className="mb-4 rounded-lg border border-slate-700/60 bg-slate-800/40 px-3 py-2 text-xs leading-relaxed text-slate-400">
              Calls the AI oracle with your farm coordinates. Oracle signs a payload, which is verified on-chain before minting.
            </p>

            <button
              type="button"
              onClick={onClaimCredits}
              disabled={claimLoading}
              className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {claimLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Verifying with Oracle…
                </span>
              ) : "Run AI Claim"}
            </button>

            {oracleData && (
              <div className="mt-4 space-y-2 rounded-xl border border-emerald-800/40 bg-emerald-950/30 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Oracle Payload</p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <span className="text-slate-500">Amount</span>
                  <span className="font-mono text-right font-bold text-white">{oracleData.amount_carbon}</span>
                  <span className="text-slate-500">NDVI</span>
                  <span className="font-mono text-right text-white">{oracleData.ndvi_previous.toFixed(3)} → {oracleData.ndvi_current.toFixed(3)}</span>
                </div>
                <p className="mt-1 break-all font-mono text-[10px] text-slate-600">{oracleData.signature_hex.slice(0, 48)}…</p>
              </div>
            )}
          </div>

          {/* Retire Credits */}
          <div className="animate-slide-up delay-300 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/15 text-lg">🔥</div>
              <div>
                <h2 className="text-sm font-bold">Retire Credits</h2>
                <p className="text-xs text-slate-500">Burn CO₂ tokens, emit on-chain event</p>
              </div>
            </div>

            <p className="mb-4 rounded-lg border border-slate-700/60 bg-slate-800/40 px-3 py-2 text-xs leading-relaxed text-slate-400">
              Permanently destroys tokens and emits a <code className="text-cyan-400">CarbonRetired</code> event visible in the live feed.
            </p>

            <label className="block text-[11px] uppercase tracking-wider text-slate-600">Amount to Retire</label>
            <input
              type="number"
              min={1}
              value={retireAmount}
              onChange={(e) => setRetireAmount(Math.max(1, Number(e.target.value || 1)))}
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm font-mono text-white focus:border-cyan-500/50 focus:outline-none"
            />

            <button
              type="button"
              onClick={onRetireCredits}
              disabled={retireLoading}
              className="mt-4 w-full rounded-xl bg-cyan-700 py-2.5 text-sm font-bold text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {retireLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Burning…
                </span>
              ) : `Retire ${retireAmount} CO₂`}
            </button>

            {signature && (
              <div className="mt-4 rounded-xl border border-slate-700/60 bg-slate-800/40 p-3">
                <p className="text-[11px] uppercase tracking-wider text-slate-500">Last transaction</p>
                <p className="mt-1 break-all font-mono text-[11px] text-cyan-400">{signature}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Bottom row: live feed + stats + services ──────────────────── */}
        <div className="mt-4 grid gap-4 lg:grid-cols-3">

          {/* Live feed — 2 cols */}
          <div className="animate-fade-in delay-300 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold">Live Carbon Feed</h2>
              <span className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                <span className="inline-block h-1.5 w-1.5 animate-blink rounded-full bg-emerald-400" />
                Live · SB Server
              </span>
            </div>

            {liveEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-600">
                <span className="text-3xl opacity-40">📡</span>
                <p className="text-xs">Waiting for on-chain events…</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {liveEvents.slice(0, 8).map((ev) => (
                  <li key={ev.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-800/40 px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${ev.eventType === "MINT" ? "bg-emerald-900/60 text-emerald-300" : "bg-cyan-900/60 text-cyan-300"}`}>
                        {ev.eventType}
                      </span>
                      <span className="font-mono text-xs font-semibold text-white">{ev.amount} CO₂</span>
                      <span className="hidden font-mono text-[11px] text-slate-500 sm:block">{ev.owner.slice(0, 8)}…</span>
                    </div>
                    <span className="font-mono text-[11px] text-slate-600">{new Date(ev.timestamp * 1000).toLocaleTimeString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Right column: stats + services */}
          <div className="flex flex-col gap-4">
            {/* Global stats */}
            <div className="animate-fade-in delay-400 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="mb-3 text-sm font-bold">Global Stats</h2>
              {carbonStats ? (
                <div className="space-y-3">
                  {[
                    { label: "Total Locked", value: carbonStats.totalCarbonLocked, color: "text-emerald-400" },
                    { label: "Total Retired", value: carbonStats.totalCarbonRetired, color: "text-cyan-400" },
                    { label: "Events", value: carbonStats.totalEvents, color: "text-slate-300" },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">{s.label}</span>
                      <span className={`font-mono text-sm font-bold ${s.color}`}>{s.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="skeleton h-4 w-full" />
                  <div className="skeleton h-4 w-3/4" />
                  <div className="skeleton h-4 w-1/2" />
                </div>
              )}
            </div>

            {/* Service health */}
            <div className="animate-fade-in delay-500 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="mb-3 text-sm font-bold">Services</h2>
              {services.length === 0 ? (
                <p className="text-xs text-slate-600">Click Services to check.</p>
              ) : (
                <div className="space-y-2">
                  {services.map((svc) => (
                    <div key={svc.name} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-800/40 px-3 py-2">
                      <span className="text-xs font-medium text-slate-300">{svc.name}</span>
                      <span className={`flex items-center gap-1 text-[11px] font-bold ${svc.ok ? "text-emerald-400" : "text-rose-400"}`}>
                        <span className={`inline-block h-1.5 w-1.5 rounded-full ${svc.ok ? "bg-emerald-400" : "bg-rose-400"}`} />
                        {svc.ok ? "Online" : "Offline"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Status bar ───────────────────────────────────────────────── */}
        <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-slate-800/60 bg-slate-900/40 px-4 py-2.5">
          <span className="inline-block h-1.5 w-1.5 shrink-0 animate-blink rounded-full bg-emerald-500" />
          <p className="text-xs text-slate-400">{status}</p>
        </div>

      </div>
    </main>
  );
}
