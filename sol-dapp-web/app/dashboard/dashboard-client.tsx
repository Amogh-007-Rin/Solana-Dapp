"use client";

import { useMemo, useState } from "react";
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
  hexToBytes,
} from "@/lib/program-instructions";

interface ServiceStatus {
  name: string;
  ok: boolean;
  detail: string;
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

  const farmPda = useMemo(() => {
    if (!publicKey) {
      return null;
    }

    return deriveFarmPda(publicKey, programId);
  }, [publicKey, programId]);

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
      tx.add(
        buildRegisterFarmIx({
          programId,
          owner: publicKey,
          farmPda,
          areaGeojson,
        }),
      );

      const txSig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(txSig, "confirmed");
      setSignature(txSig);
      setStatus("Farm account registered successfully.");
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
      setStatus("Set NEXT_PUBLIC_CO2_MINT in .env.local before claiming.");
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
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error";
      setStatus(`Retire failed: ${message}`);
    } finally {
      setRetireLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <section className="mx-auto grid w-full max-w-6xl gap-6">
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

        <div className="grid gap-4 lg:grid-cols-3">
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

            <label className="mt-4 block text-xs text-slate-400">Area GeoJSON</label>
            <textarea
              value={areaGeojson}
              onChange={(event) => setAreaGeojson(event.target.value)}
              rows={4}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs"
            />

            <button
              type="button"
              onClick={onRegisterFarm}
              disabled={registerLoading}
              className="mt-3 inline-flex items-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-70"
            >
              {registerLoading ? "Registering..." : "Register Farm"}
            </button>
          </article>

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
                <p>Amount: {oracleData.amount_carbon}</p>
                <p>NDVI previous: {oracleData.ndvi_previous}</p>
                <p>NDVI current: {oracleData.ndvi_current}</p>
                <p className="break-all">Oracle sig: {oracleData.signature_hex}</p>
              </div>
            )}
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Retire Credits</h2>
            <p className="mt-1 text-sm text-slate-400">Builds transaction via API and sends with your wallet.</p>

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

            {signature && <p className="mt-3 break-all text-xs text-cyan-300">Tx: {signature}</p>}
          </article>
        </div>

        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Service Health</h2>
          <p className="mt-1 text-sm text-slate-400">Check if Web API, AI engine, and SB server are reachable.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {services.length === 0 && <p className="text-sm text-slate-400">Press Refresh Services to load status.</p>}
            {services.map((service) => (
              <div key={service.name} className="rounded-lg border border-slate-700 bg-slate-800 p-3">
                <p className="text-sm font-medium">{service.name}</p>
                <p className={`text-xs ${service.ok ? "text-emerald-300" : "text-rose-300"}`}>
                  {service.ok ? "Online" : "Offline"}
                </p>
                <p className="mt-1 break-all text-xs text-slate-400">{service.detail}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-slate-300">{status}</p>
        </article>
      </section>
    </main>
  );
}
