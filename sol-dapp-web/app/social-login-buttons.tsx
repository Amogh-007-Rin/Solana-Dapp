"use client";

import { signIn, getProviders, type LiteralUnion, type ClientSafeProvider } from "next-auth/react";
import { useEffect, useState } from "react";

type ProviderRecord = Record<LiteralUnion<string, string>, ClientSafeProvider>;

interface SocialLoginButtonsProps {
  callbackUrl?: string;
  label?: string;
}

export function SocialLoginButtons({
  callbackUrl = "/dashboard",
  label = "Continue with Google",
}: SocialLoginButtonsProps) {
  const [providers, setProviders] = useState<ProviderRecord | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getProviders().then((result) => {
      setProviders(result ?? {});
    });
  }, []);

  if (providers === null) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-slate-800/60 px-4 py-3">
        <div className="skeleton h-5 w-5 rounded-full" />
        <div className="skeleton h-4 w-32 rounded" />
      </div>
    );
  }

  const provider = providers.google;

  if (!provider) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/8 px-4 py-3">
        <p className="text-xs font-medium text-amber-300">
          Google OAuth not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your environment.
        </p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={async () => {
        setLoading(true);
        await signIn(provider.id, { callbackUrl });
      }}
      disabled={loading}
      className="group flex w-full items-center justify-center gap-3 rounded-xl border border-slate-700 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? (
        <>
          <svg className="h-4 w-4 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Redirecting to Google…</span>
        </>
      ) : (
        <>
          {/* Google logo */}
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
