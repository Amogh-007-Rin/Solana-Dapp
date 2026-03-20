import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SocialLoginButtons } from "@/app/social-login-buttons";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session?.user) redirect("/dashboard");

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020817] text-white">

      {/* ── Ambient background orbs ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute top-1/3 -right-20 h-[400px] w-[400px] rounded-full bg-cyan-500/10 blur-[100px]" />
        <div className="absolute bottom-0 left-0 h-[350px] w-[350px] rounded-full bg-indigo-500/8 blur-[100px]" />
      </div>

      {/* ── Dot grid ── */}
      <div className="pointer-events-none absolute inset-0 bg-dot-grid opacity-40" />

      {/* ── Nav ── */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 lg:px-12">
        <div className="flex items-center gap-2.5 animate-fade-in">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 ring-1 ring-emerald-500/40">
            <span className="text-sm font-bold text-emerald-400">R</span>
          </div>
          <span className="text-lg font-bold tracking-tight">Root-Chain</span>
        </div>
        <div className="flex items-center gap-3 animate-fade-in delay-100">
          <Link
            href="/api/status"
            className="hidden rounded-lg px-4 py-2 text-sm text-slate-400 transition hover:text-white sm:block"
          >
            API Status
          </Link>
          <Link
            href="/login"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            Launch App
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pt-16 pb-8 lg:px-12">
        <div className="grid gap-16 lg:grid-cols-2 lg:items-center">

          {/* Left: Copy */}
          <div className="space-y-7">
            <div className="animate-slide-up">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-300">
                <span className="inline-block h-1.5 w-1.5 animate-glow-pulse rounded-full bg-emerald-400" />
                Solana Carbon Protocol
              </span>
            </div>

            <div className="animate-slide-up delay-100">
              <h1 className="text-5xl font-extrabold leading-[1.08] tracking-tight md:text-7xl">
                Carbon Markets,
                <br />
                <span className="gradient-text">Verified On Chain.</span>
              </h1>
            </div>

            <p className="animate-slide-up delay-200 max-w-lg text-lg leading-relaxed text-slate-400">
              Register farmland, verify sequestration with AI oracle signatures,
              mint Token-2022 credits, and retire assets with permanent, auditable
              proof on Solana.
            </p>

            <div className="animate-slide-up delay-300 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-900/40 transition hover:bg-emerald-500 hover:shadow-emerald-700/40"
              >
                <span>Get Started</span>
                <svg className="h-4 w-4 transition group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                href="/api/status"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white"
              >
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-blink" />
                Live Status
              </Link>
            </div>

            {/* Stats strip */}
            <div className="animate-slide-up delay-400 grid grid-cols-3 gap-4 pt-2">
              {[
                { label: "Token Standard", value: "Token-2022" },
                { label: "Network", value: "Solana Devnet" },
                { label: "Oracle", value: "Ed25519 AI" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-3 text-center">
                  <p className="text-sm font-bold text-white">{stat.value}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Sign-in card */}
          <div className="animate-slide-in-right delay-200">
            <div className="glass rounded-2xl p-8 shadow-2xl shadow-black/40">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20">
                  <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold">Sign In</h2>
                  <p className="text-xs text-slate-400">Access your command dashboard</p>
                </div>
              </div>

              <SocialLoginButtons />

              <p className="mt-6 text-center text-xs text-slate-600">
                By signing in you agree to use this dashboard for authorized purposes only.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Protocol flow ── */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 py-20 lg:px-12">
        <div className="mb-12 text-center animate-fade-in">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">How it works</p>
          <h2 className="mt-2 text-3xl font-bold md:text-4xl">The Root-Chain Protocol</h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-400">
            Five on-chain steps turning physical farmland into verifiable carbon assets.
          </p>
        </div>

        <div className="relative grid gap-4 sm:grid-cols-5">
          {/* Connector line */}
          <div className="pointer-events-none absolute top-10 left-0 right-0 hidden h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent sm:block" />

          {[
            { step: "01", icon: "🌾", title: "Register", desc: "Farmer signs a GeoJSON boundary on Solana." },
            { step: "02", icon: "🛰️", title: "Verify", desc: "AI oracle analyses NDVI satellite data." },
            { step: "03", icon: "🪙", title: "Mint", desc: "Ed25519-signed instruction mints CO₂ tokens." },
            { step: "04", icon: "📈", title: "Trade", desc: "Credits listed on the TerraNode DEX." },
            { step: "05", icon: "🔥", title: "Retire", desc: "Buyer burns tokens — NFT certificate issued." },
          ].map((item, i) => (
            <div
              key={item.step}
              className={`animate-slide-up delay-${(i + 1) * 100} group relative flex flex-col items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-center transition hover:border-emerald-500/40 hover:bg-slate-900`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-xl group-hover:bg-emerald-900/40 transition">
                {item.icon}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{item.step}</span>
              <p className="font-semibold text-white">{item.title}</p>
              <p className="text-xs leading-relaxed text-slate-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Feature grid ── */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-24 lg:px-12">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: "🔐",
              color: "indigo",
              title: "Ed25519 Oracle Verification",
              desc: "Each credit mint is cryptographically signed by the AI oracle. No oracle signature = no mint.",
            },
            {
              icon: "⚡",
              color: "amber",
              title: "Solana Speed",
              desc: "Sub-second transaction finality with near-zero fees enables micro-offset purchases from $0.01.",
            },
            {
              icon: "🌍",
              color: "emerald",
              title: "Auditable Retirement",
              desc: "Token burns are permanent, on-chain, and publicly verifiable — no paperwork required.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="animate-fade-in glass-emerald rounded-2xl p-6 transition hover:scale-[1.02]"
              style={{ transitionDuration: "200ms" }}
            >
              <span className="text-3xl">{f.icon}</span>
              <h3 className="mt-4 text-lg font-bold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-slate-800/60 px-6 py-8 text-center lg:px-12">
        <p className="text-sm text-slate-600">
          Root-Chain Protocol · Built on Solana · Anchor 0.30 · Token-2022
        </p>
      </footer>
    </main>
  );
}
