"use client";

import { signIn, getProviders, type LiteralUnion, type ClientSafeProvider } from "next-auth/react";
import { useEffect, useState } from "react";

type ProviderRecord = Record<LiteralUnion<string, string>, ClientSafeProvider>;

export function SocialLoginButtons() {
  const [providers, setProviders] = useState<ProviderRecord | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getProviders().then((result) => {
      setProviders(result ?? {});
    });
  }, []);

  if (providers === null) {
    return <p className="text-sm text-slate-400">Loading login options...</p>;
  }

  const provider = providers.google;

  if (!provider) {
    return (
      <p className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
        Google OAuth is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in environment variables.
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={async () => {
        setLoading(true);
        await signIn(provider.id, { callbackUrl: "/dashboard" });
      }}
      disabled={loading}
      className="w-full rounded-lg bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? "Redirecting..." : "Continue with Google"}
    </button>
  );
}
