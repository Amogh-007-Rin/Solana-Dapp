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
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-100 w-150 rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 h-75 w-75 rounded-full bg-indigo-500/8 blur-[100px]" />
        <div className="absolute top-1/4 right-0 h-62.5 w-62.5 rounded-full bg-cyan-500/8 blur-[80px]" />
      </div>

      {/* Dot grid */}
      <div className="pointer-events-none absolute inset-0 bg-dot-grid opacity-30" />

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

      <div className="relative z-10 mx-auto w-full max-w-6xl">

        <div className="mb-10 text-center animate-slide-up">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Root-Chain Exchange</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">Choose Login Type</h1>
          <p className="mt-3 text-sm text-slate-400">
            Role-based flow inspired by trading terminals: Backpack and Polymarket style onboarding.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className="animate-slide-up rounded-2xl border border-amber-500/25 bg-slate-900/70 p-6 backdrop-blur-md">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-amber-300">Farmer / Agriculturist</p>
                <h2 className="mt-1 text-xl font-bold">Issue Land NFT and Mint Credits</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Register land, run geo-map verification animation, get a mock NFT, and mint carbon credit coins.
                </p>
              </div>
              <span className="rounded-lg bg-amber-500/15 px-2 py-1 text-xs font-semibold text-amber-300">Seller</span>
            </div>
            <SocialLoginButtons
              callbackUrl="/onboarding?type=farmer"
              label="Continue as Farmer"
            />
          </section>

          <section className="animate-slide-up delay-100 rounded-2xl border border-cyan-500/25 bg-slate-900/70 p-6 backdrop-blur-md">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-cyan-300">Industrialist / Buyer</p>
                <h2 className="mt-1 text-xl font-bold">Trade and Buy Carbon Credits</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Access the common market desk, buy listed credits, and manage portfolio and demand workflows.
                </p>
              </div>
              <span className="rounded-lg bg-cyan-500/15 px-2 py-1 text-xs font-semibold text-cyan-300">Buyer</span>
            </div>
            <SocialLoginButtons
              callbackUrl="/onboarding?type=industrialist"
              label="Continue as Industrialist"
            />
          </section>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2 text-center">
          {["Phantom Wallet", "Geo Verification", "Trade Desk"].map((tag) => (
            <div key={tag} className="rounded-lg bg-slate-800/60 py-2 text-[11px] font-medium text-slate-500">
              {tag}
            </div>
          ))}
        </div>

        <p className="mt-5 text-center text-xs text-slate-700">
          Root-Chain Protocol · Solana Devnet
        </p>
      </div>
    </main>
  );
}
