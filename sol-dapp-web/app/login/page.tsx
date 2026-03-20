import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { SocialLoginButtons } from "@/app/social-login-buttons";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session?.user) redirect("/dashboard");

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020817] px-4 py-12 text-white">

      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[600px] rounded-full bg-emerald-500/8 blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-indigo-500/8 blur-[100px]" />
        <div className="absolute top-1/4 right-0 h-64 w-64 rounded-full bg-cyan-500/6 blur-[80px]" />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-dot-grid opacity-25" />

      {/* Back link */}
      <Link
        href="/"
        className="animate-fade-in absolute top-6 left-6 flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-slate-300"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back
      </Link>

      <div className="relative z-10 mx-auto w-full max-w-5xl">

        <div className="mb-10 text-center animate-slide-up">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 inline-block" />
            Root-Chain Protocol
          </div>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
            Choose Your Role
          </h1>
          <p className="mt-3 text-sm text-slate-400 max-w-lg mx-auto">
            Select how you participate in the carbon credit ecosystem. Each role has a dedicated dashboard and trading access.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">

          {/* Farmer card */}
          <section className="animate-slide-up rounded-2xl border border-amber-500/25 bg-slate-900/70 p-6 backdrop-blur-md">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🌾</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-300">Farmer / Agriculturist</span>
                </div>
                <h2 className="mt-2 text-xl font-bold">Register Land & Mint Credits</h2>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  Register your farmland, run satellite geo-mapping verification, receive a land NFT certificate, and mint carbon credit tokens to your Phantom wallet.
                </p>
              </div>
              <span className="shrink-0 rounded-lg bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-300 border border-amber-500/20">SELLER</span>
            </div>

            <div className="mb-5 grid grid-cols-3 gap-2">
              {[
                { icon: "🗺️", label: "Geo Map" },
                { icon: "🛰️", label: "NDVI Scan" },
                { icon: "🪙", label: "Mint rCO2" },
              ].map((f) => (
                <div key={f.label} className="rounded-xl bg-amber-500/8 px-2 py-2 text-center">
                  <div className="text-lg">{f.icon}</div>
                  <p className="mt-1 text-[10px] text-amber-300">{f.label}</p>
                </div>
              ))}
            </div>

            <SocialLoginButtons
              callbackUrl="/onboarding?type=farmer"
              participantType="farmer"
            />
          </section>

          {/* Industrialist card */}
          <section className="animate-slide-up delay-100 rounded-2xl border border-cyan-500/25 bg-slate-900/70 p-6 backdrop-blur-md">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🏭</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">Industrialist / Buyer</span>
                </div>
                <h2 className="mt-2 text-xl font-bold">Trade & Buy Carbon Credits</h2>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  Access the live carbon market, browse listings by verified farmers, execute trades, manage your portfolio, and retire credits for ESG compliance.
                </p>
              </div>
              <span className="shrink-0 rounded-lg bg-cyan-500/15 px-2.5 py-1 text-xs font-bold text-cyan-300 border border-cyan-500/20">BUYER</span>
            </div>

            <div className="mb-5 grid grid-cols-3 gap-2">
              {[
                { icon: "📊", label: "Order Book" },
                { icon: "💼", label: "Portfolio" },
                { icon: "🔥", label: "Retire" },
              ].map((f) => (
                <div key={f.label} className="rounded-xl bg-cyan-500/8 px-2 py-2 text-center">
                  <div className="text-lg">{f.icon}</div>
                  <p className="mt-1 text-[10px] text-cyan-300">{f.label}</p>
                </div>
              ))}
            </div>

            <SocialLoginButtons
              callbackUrl="/onboarding?type=industrialist"
              participantType="industrialist"
            />
          </section>
        </div>

        {/* Admin note */}
        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-center">
          <p className="text-xs text-slate-500">
            Admin access: use <span className="font-mono text-slate-400">admin@demo.com</span> / <span className="font-mono text-slate-400">demo</span> →{" "}
            <Link href="/admin" className="text-indigo-400 underline hover:text-indigo-300">Admin Console</Link>
          </p>
        </div>

        <p className="mt-5 text-center text-xs text-slate-700">
          Root-Chain Protocol · Solana Devnet · Token-2022
        </p>
      </div>
    </main>
  );
}
