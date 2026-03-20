"use client";

import { signIn, getProviders, type LiteralUnion, type ClientSafeProvider } from "next-auth/react";
import { useEffect, useState } from "react";

type ProviderRecord = Record<LiteralUnion<string, string>, ClientSafeProvider>;

const PREFERRED_ORDER = ["google", "facebook", "twitter"];

const LABELS: Record<string, string> = {
  google: "Continue with Google",
  facebook: "Continue with Facebook",
  twitter: "Continue with Twitter",
};

const BUTTON_STYLES: Record<string, string> = {
  google: "bg-white text-slate-900 hover:bg-slate-200",
  facebook: "bg-[#1877f2] text-white hover:bg-[#1666d9]",
  twitter: "bg-black text-white hover:bg-slate-800",
};

export function SocialLoginButtons() {
  const [providers, setProviders] = useState<ProviderRecord | null>(null);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  useEffect(() => {
    getProviders().then((result) => {
      setProviders(result ?? {});
    });
  }, []);

  if (providers === null) {
    return <p className="text-sm text-slate-400">Loading login options...</p>;
  }

  const items = PREFERRED_ORDER.filter((id) => providers[id]);

  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
        No OAuth providers are configured. Add provider credentials in environment variables.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((id) => {
        const provider = providers[id];
        return (
          <button
            key={id}
            type="button"
            onClick={async () => {
              setLoadingProvider(id);
              await signIn(provider.id, { callbackUrl: "/dashboard" });
            }}
            disabled={loadingProvider !== null}
            className={`w-full rounded-lg px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${BUTTON_STYLES[id]}`}
          >
            {loadingProvider === id ? "Redirecting..." : LABELS[id] ?? `Continue with ${provider.name}`}
          </button>
        );
      })}
    </div>
  );
}
