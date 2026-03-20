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

interface ServiceStatus {
  name: string;
  ok: boolean;
  detail: string;
}

interface LiveEvent {
  id: string;
  eventType: "MINT" | "BURN";
  owner: string;
  amount: number;
  timestamp: number;
  signature: string;
}

interface CarbonStats {
  totalCarbonLocked: number;
  totalCarbonRetired: number;
  totalEvents: number;
}

interface DashboardClientProps {
  email: string;
  name: string;
  role: "operator" | "admin" | "auditor";
}

export function DashboardClient({ email, name, role }: DashboardClientProps) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const programId = useMemo(
    () => new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID ?? "8qJjY3qeJc9cTGw3GRW7xVfN32B2j3YkM3p6N5cm6QkM"),
    [],
  );
  const co2Mint = useMemo(() => {
    const mint = process.env.NEXT_PUBLIC_CO2_MINT;
    return mint ? new PublicKey(mint) : null;
  }, []);

  const [registerLoading, setRegisterLoading] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [retireLoading, setRetireLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [oracleData, setOracleData] = useState<OraclePayload | null>(null);
  const [status, setStatus] = useState<string>("Ready");
  const [retireAmount, setRetireAmount] = useState<number>(1);
  const [areaGeojson, setAreaGeojson] = useState<string>(
    JSON.stringify({ type: "Point", coordinates: [77.5946, 12.9716] }),
  );
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [signature, setSignature] = useState<string | null>(null);
  const [farmAccount, setFarmAccount] = useState<FarmAccountData | null>(null);
  const [farmLoading, setFarmLoading] = useState(false);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [carbonStats, setCarbonStats] = useState<CarbonStats | null>(null);
  const socketRef = useRef<ReturnType<typeof import("socket.io-client").io> | null>(null);

  const farmPda = useMemo(() => {
    if (!publicKey) return null;
    return deriveFarmPda(publicKey, programId);
  }, [publicKey, programId]);

  // ─── Socket.IO live feed ──────────────────────────────────────────────────
  useEffect(() => {
    const sbUrl = process.env.NEXT_PUBLIC_SB_SERVER_URL ?? "http://127.0.0.1:7001";
    let socket: ReturnType<typeof import("socket.io-client").io>;

    import("socket.io-client").then(({ io }) => {
      socket = io(sbUrl, { transports: ["websocket", "polling"] });
      socketRef.current = socket;

      socket.on("CACHE_SNAPSHOT", (data: CarbonStats) => {
        setCarbonStats(data);
      });

      socket.on("NEW_OFFSET", (event: Omit<LiveEvent, "id">) => {
        setLiveEvents((prev) => [
          { ...event, id: `${event.signature}-${Date.now()}` },
          ...prev.slice(0, 19),
        ]);
        setCarbonStats((prev) =>
          prev
            ? {
                ...prev,
                totalCarbonRetired: prev.totalCarbonRetired + event.amount,
                totalEvents: prev.totalEvents + 1,
              }
            : prev,
        );
      });

      socket.on("NEW_MINT", (event: Omit<LiveEvent, "id">) => {
        setLiveEvents((prev) => [
          { ...event, id: `${event.signature}-${Date.now()}` },
          ...prev.slice(0, 19),
        ]);
        setCarbonStats((prev) =>
          prev
            ? {
                ...prev,
                totalCarbonLocked: prev.totalCarbonLocked + event.amount,
                totalEvents: prev.totalEvents + 1,
              }
            : prev,
        );
      });
    });

    return () => {
      socket?.disconnect();
    };
  }, []);

  // ─── Auto-fetch farm account when wallet connects ─────────────────────────
  useEffect(() => {
    if (!farmPda) {
      setFarmAccount(null);
      return;
    }
    void loadFarmAccount(farmPda);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmPda]);

  const loadFarmAccount = async (pda: PublicKey) => {
    setFarmLoading(true);
    try {
      const data = await fetchFarmAccount(connection, pda);
      setFarmAccount(data);
    } catch {
      setFarmAccount(null);
    } finally {
      setFarmLoading(false);
    }
  };

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const onRegisterFarm = async () => {
    if (!publicKey || !farmPda) {
      setStatus("Connect wallet first.");
      return;
    }

    setRegisterLoading(true);
    setSignature(null);
    setStatus("Registering farm account on chain...");

    try {
      const tx = new Transaction();
      tx.add(buildRegisterFarmIx({ programId, owner: publicKey, farmPda, areaGeojson }));

      const txSig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(txSig, "confirmed");
      setSignature(txSig);
      setStatus("Farm account registered successfully.");
      await loadFarmAccount(farmPda);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error";
      setStatus(`Register failed: ${message}`);
    } finally {
      setRegisterLoading(false);
    }
  };

  const refreshStatus = async () => {
    setStatusLoading(true);
    try {
      const [serviceResponse, summaryResponse] = await Promise.all([
        fetch("/api/status", { cache: "no-store" }),
        fetch("/api/dashboard/summary", { cache: "no-store" }),
      ]);

      const serviceData = await serviceResponse.json();
      setServices(serviceData.services ?? []);

      if (!summaryResponse.ok) {
        setStatus("Service status loaded, but session summary request failed.");
      } else {
        setStatus("Service and dashboard status updated.");
      }
    } catch {
      setStatus("Failed to fetch service status.");
    } finally {
      setStatusLoading(false);
    }
  };

  const onClaimCredits = async () => {
    if (!publicKey || !farmPda) {
      setStatus("Connect wallet first.");
      return;
    }

    if (!co2Mint) {
      setStatus("Set NEXT_PUBLIC_CO2_MINT in .env before claiming.");
      return;
    }

    setClaimLoading(true);
    setSignature(null);
    setStatus("Requesting biomass verification from AI oracle...");

    try {
      const slot = await connection.getSlot("confirmed");
      const response = await fetch("/api/oracle/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farm_pda: farmPda.toBase58(),
          coordinates: { lat: 12.9716, lng: 77.5946 },
          satellite_provider_api_key: process.env.NEXT_PUBLIC_SATELLITE_PROVIDER_KEY ?? "demo-key",
          slot_number: slot,
        }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text);
      }
      const payload = (await response.json()) as OraclePayload;

      const ownerTokenAccount = deriveOwnerToken2022Ata(publicKey, co2Mint);
      const mintAuthority = deriveMintAuthorityPda(programId);
      const tx = new Transaction();

      const ataInfo = await connection.getAccountInfo(ownerTokenAccount, "confirmed");
      if (!ataInfo) {
        tx.add(buildCreateOwnerTokenAtaIx(publicKey, co2Mint));
      }

      const messageBytes = hexToBytes(payload.message_hex);
      const signatureBytes = hexToBytes(payload.signature_hex);
      const oraclePubkey = new PublicKey(payload.oracle_pubkey);

      tx.add(
        Ed25519Program.createInstructionWithPublicKey({
          publicKey: oraclePubkey.toBytes(),
          message: messageBytes,
          signature: signatureBytes,
        }),
      );

      tx.add(
        buildMintCarbonCreditsIx({
          programId,
          owner: publicKey,
          farmPda,
          co2Mint,
          ownerTokenAccount,
          mintAuthority,
          amount: BigInt(payload.amount_carbon),
          slotNumber: BigInt(payload.slot_number),
          signature64: signatureBytes,
        }),
      );

      const txSig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(txSig, "confirmed");

      setOracleData(payload);
      setSignature(txSig);
      setStatus(`Minted ${payload.amount_carbon} carbon units to your token account.`);
      await loadFarmAccount(farmPda);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error";
      setStatus(`Claim failed: ${message}`);
    } finally {
      setClaimLoading(false);
    }
  };

  const onRetireCredits = async () => {
    if (!publicKey) {
      setStatus("Connect wallet first.");
      return;
    }

    if (!co2Mint || !farmPda) {
      setStatus("Missing CO2 mint or farm account. Set env and register farm first.");
      return;
    }

    setRetireLoading(true);
    setStatus("Preparing retire transaction...");
    setSignature(null);

    try {
      const ownerTokenAccount = deriveOwnerToken2022Ata(publicKey, co2Mint);
      const tx = new Transaction();
      tx.add(
        buildRetireCreditsIx({
          programId,
          owner: publicKey,
          farmPda,
          co2Mint,
          ownerTokenAccount,
          amount: BigInt(retireAmount),
        }),
      );

      const txSig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(txSig, "confirmed");

      setSignature(txSig);
      setStatus("Retire transaction confirmed on chain.");
      await loadFarmAccount(farmPda);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error";
      setStatus(`Retire failed: ${message}`);
    } finally {
      setRetireLoading(false);
    }
  };

  // ─── UI ───────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <section className="mx-auto grid w-full max-w-6xl gap-6">

        {/* Header */}
        <div className="rounded-2xl border border-emerald-500/20 bg-linear-to-r from-slate-900 to-slate-800 p-6 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Root-Chain Dashboard</h1>
              <p className="mt-2 text-sm text-slate-300">
                Signed in as {name} ({email})
              </p>
              <p className="mt-1 text-xs uppercase tracking-wide text-emerald-300">Role: {role}</p>
            </div>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="rounded-lg border border-rose-400/60 px-4 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/10"
            >
              Sign out
            </button>
          </div>
          <p className="mt-3 text-sm text-slate-300">
            OAuth-protected command dashboard for wallet auth, AI verification, and retirement actions.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <WalletMultiButton />
            <Link
              href="/admin"
              className="rounded-lg border border-indigo-400/60 px-4 py-2 text-sm font-medium text-indigo-200 transition hover:bg-indigo-500/10"
            >
              Open Admin
            </Link>
            <button
              type="button"
              onClick={refreshStatus}
              disabled={statusLoading}
              className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium hover:bg-slate-700 disabled:opacity-60"
            >
              {statusLoading ? "Checking..." : "Refresh Services"}
            </button>
          </div>
        </div>

        {/* Three action cards */}
        <div className="grid gap-4 lg:grid-cols-3">

          {/* Wallet and Farm */}
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Wallet and Farm</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="font-medium text-slate-300">Wallet</dt>
                <dd className="break-all text-slate-400">{publicKey?.toBase58() ?? "Not connected"}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-300">Farm PDA</dt>
                <dd className="break-all text-slate-400">{farmPda?.toBase58() ?? "Unavailable"}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-300">CO2 Mint</dt>
                <dd className="break-all text-slate-400">{co2Mint?.toBase58() ?? "Set NEXT_PUBLIC_CO2_MINT"}</dd>
              </div>
            </dl>

            {/* On-chain farm state */}
            {farmLoading && <p className="mt-3 text-xs text-slate-500">Loading farm state...</p>}
            {!farmLoading && farmAccount && (
              <div className="mt-4 rounded-lg border border-emerald-800/50 bg-emerald-950/30 p-3 text-xs">
                <p className="mb-1 font-semibold text-emerald-300">On-Chain Farm State</p>
                <dl className="space-y-1 text-slate-300">
                  <div className="flex justify-between">
                    <dt>Status</dt>
                    <dd className={farmAccount.isActive ? "text-emerald-300" : "text-rose-300"}>
                      {farmAccount.isActive ? "Active" : "Inactive"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Balance (CO2)</dt>
                    <dd className="font-mono">{farmAccount.amountCarbon.toString()}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Total Sequestered</dt>
                    <dd className="font-mono">{farmAccount.totalCarbonSequestered.toString()}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Last Update</dt>
                    <dd>{new Date(Number(farmAccount.lastUpdate) * 1000).toLocaleString()}</dd>
                  </div>
                </dl>
              </div>
            )}
            {!farmLoading && !farmAccount && farmPda && (
              <p className="mt-3 text-xs text-slate-500">Farm not registered yet.</p>
            )}

            <label className="mt-4 block text-xs text-slate-400">Area GeoJSON</label>
            <textarea
              value={areaGeojson}
              onChange={(event) => setAreaGeojson(event.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs"
            />

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={onRegisterFarm}
                disabled={registerLoading}
                className="inline-flex items-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-70"
              >
                {registerLoading ? "Registering..." : "Register Farm"}
              </button>
              {farmPda && (
                <button
                  type="button"
                  onClick={() => loadFarmAccount(farmPda)}
                  disabled={farmLoading}
                  className="rounded-lg border border-slate-600 px-3 py-2 text-xs font-medium hover:bg-slate-800 disabled:opacity-60"
                >
                  Refresh
                </button>
              )}
            </div>
          </article>

          {/* Claim Credits */}
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Claim Credits</h2>
            <p className="mt-1 text-sm text-slate-400">Runs live AI verification and returns signed payload.</p>

            <button
              type="button"
              onClick={onClaimCredits}
              disabled={claimLoading}
              className="mt-4 inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {claimLoading ? "Processing..." : "Run AI Claim"}
            </button>

            {oracleData && (
              <div className="mt-4 rounded-lg bg-slate-800 p-3 text-xs text-slate-300">
                <p className="mb-1 font-semibold text-emerald-300">Oracle Payload</p>
                <p>Amount: <span className="font-mono text-white">{oracleData.amount_carbon}</span></p>
                <p>NDVI Δ: {oracleData.ndvi_previous.toFixed(4)} → {oracleData.ndvi_current.toFixed(4)}</p>
                <p className="mt-1 break-all text-slate-500">Sig: {oracleData.signature_hex.slice(0, 32)}…</p>
              </div>
            )}
          </article>

          {/* Retire Credits */}
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Retire Credits</h2>
            <p className="mt-1 text-sm text-slate-400">Burns CO2 tokens and emits an on-chain retirement event.</p>

            <label className="mt-4 block text-xs text-slate-400">Amount</label>
            <input
              type="number"
              min={1}
              value={retireAmount}
              onChange={(event) => setRetireAmount(Math.max(1, Number(event.target.value || 1)))}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
            />

            <button
              type="button"
              onClick={onRetireCredits}
              disabled={retireLoading}
              className="mt-4 inline-flex items-center rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {retireLoading ? "Submitting..." : "Retire Credits"}
            </button>

            {signature && (
              <div className="mt-3 rounded-lg bg-slate-800 p-2">
                <p className="text-xs text-slate-400">Last tx</p>
                <p className="break-all text-xs font-mono text-cyan-300">{signature}</p>
              </div>
            )}
          </article>
        </div>

        {/* Live Carbon Feed + Global Stats */}
        <div className="grid gap-4 lg:grid-cols-3">
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Live Carbon Feed</h2>
              <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                Live via SB server
              </span>
            </div>

            {liveEvents.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Waiting for on-chain events…</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {liveEvents.slice(0, 8).map((ev) => (
                  <li key={ev.id} className="flex items-start justify-between rounded-lg bg-slate-800 px-3 py-2 text-xs">
                    <div>
                      <span
                        className={`mr-2 rounded px-1.5 py-0.5 font-bold uppercase ${ev.eventType === "MINT" ? "bg-emerald-700 text-emerald-100" : "bg-cyan-800 text-cyan-100"}`}
                      >
                        {ev.eventType === "MINT" ? "MINT" : "BURN"}
                      </span>
                      <span className="font-mono text-white">{ev.amount} CO2</span>
                      <span className="ml-2 text-slate-500">{ev.owner.slice(0, 8)}…</span>
                    </div>
                    <span className="text-slate-600">{new Date(ev.timestamp * 1000).toLocaleTimeString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <div className="flex flex-col gap-4">
            {/* Global stats */}
            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Global Stats</h2>
              {carbonStats ? (
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Total Locked</dt>
                    <dd className="font-mono font-semibold text-emerald-300">{carbonStats.totalCarbonLocked}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Total Retired</dt>
                    <dd className="font-mono font-semibold text-cyan-300">{carbonStats.totalCarbonRetired}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Events</dt>
                    <dd className="font-mono">{carbonStats.totalEvents}</dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-2 text-xs text-slate-500">Connecting to SB server…</p>
              )}
            </article>

            {/* Service Health */}
            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Service Health</h2>
              <div className="mt-3 space-y-2">
                {services.length === 0 && (
                  <p className="text-xs text-slate-500">Press Refresh Services.</p>
                )}
                {services.map((service) => (
                  <div key={service.name} className="rounded-lg border border-slate-700 bg-slate-800 p-2">
                    <p className="text-xs font-medium">{service.name}</p>
                    <p className={`text-xs ${service.ok ? "text-emerald-300" : "text-rose-300"}`}>
                      {service.ok ? "Online" : "Offline"}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </div>

        {/* Status bar */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-2">
          <p className="text-sm text-slate-300">{status}</p>
        </div>

      </section>
    </main>
  );
}
