"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

interface LoginButtonsProps {
  callbackUrl?: string;
  participantType?: "farmer" | "industrialist";
}

export function SocialLoginButtons({
  callbackUrl = "/dashboard",
  participantType,
}: LoginButtonsProps) {
  const demoEmail =
    participantType === "farmer"
      ? "farmer@demo.com"
      : participantType === "industrialist"
        ? "industrialist@demo.com"
        : "";

  const [loading, setLoading] = useState<string | null>(null);
  const [showCredentials, setShowCredentials] = useState(false);
  const [email, setEmail]     = useState(demoEmail);
  const [password, setPassword] = useState("");
  const [error, setError]     = useState("");

  async function handleDemoLogin(e?: string) {
    const target = e ?? demoEmail;
    if (!target) return;
    setLoading(target);
    await signIn("credentials", { email: target, password: "demo", callbackUrl });
    setLoading(null);
  }

  async function handleCredentials() {
    setLoading("creds");
    setError("");
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    if (result?.error) {
      setError("Invalid credentials. Try the demo buttons.");
      setLoading(null);
    } else {
      window.location.href = callbackUrl;
    }
  }

  const demoLabel =
    participantType === "farmer"
      ? "Demo Farmer"
      : participantType === "industrialist"
        ? "Demo Industrialist"
        : null;

  return (
    <div className="space-y-3">
      {demoLabel && demoEmail && (
        <button
          type="button"
          onClick={() => void handleDemoLogin()}
          disabled={loading === demoEmail}
          className="group flex w-full items-center justify-center gap-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading === demoEmail ? (
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <span className="text-base">⚡</span>
          )}
          <span>Enter as {demoLabel}</span>
          <span className="rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">DEMO</span>
        </button>
      )}

      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-slate-800" />
        <span className="text-[10px] text-slate-600">or sign in with credentials</span>
        <div className="h-px flex-1 bg-slate-800" />
      </div>

      {!showCredentials ? (
        <button
          type="button"
          onClick={() => setShowCredentials(true)}
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-400 transition hover:border-slate-600 hover:text-slate-300"
        >
          Email & Password login
        </button>
      ) : (
        <div className="space-y-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-emerald-500/50 focus:outline-none"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            onKeyDown={(e) => { if (e.key === "Enter") void handleCredentials(); }}
            className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-emerald-500/50 focus:outline-none"
          />
          {error && <p className="text-[11px] text-rose-400">{error}</p>}
          <button
            type="button"
            onClick={() => void handleCredentials()}
            disabled={loading === "creds"}
            className="w-full rounded-xl bg-slate-700 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-slate-600 disabled:opacity-60"
          >
            {loading === "creds" ? "Signing in…" : "Sign In"}
          </button>
        </div>
      )}

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">Demo credentials (password: demo)</p>
        {[
          { email: "farmer@demo.com",        label: "Farmer",        cb: "/dashboard/farmer" },
          { email: "industrialist@demo.com",  label: "Industrialist", cb: "/dashboard/industrialist" },
          { email: "admin@demo.com",          label: "Admin",         cb: "/admin" },
        ].map((acc) => (
          <button
            key={acc.email}
            type="button"
            onClick={() => void handleDemoLogin(acc.email)}
            disabled={!!loading}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:opacity-40"
          >
            <span className="font-mono text-emerald-400">{acc.email}</span>
            <span className="ml-auto rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-500">{acc.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
