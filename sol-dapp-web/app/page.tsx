import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SocialLoginButtons } from "@/app/social-login-buttons";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="rc-bg rc-grid relative min-h-screen overflow-hidden text-slate-100">
      <section className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 gap-10 px-6 py-16 lg:grid-cols-2 lg:items-center">
        <article className="space-y-6">
          <p className="rc-chip inline-flex rounded-full px-4 py-2 text-xs font-semibold tracking-widest text-cyan-100">
            ROOT-CHAIN PROTOCOL
          </p>
          <h1 className="text-4xl font-black leading-tight md:text-6xl">
            Carbon Markets,
            <br />
            Verified On Chain.
          </h1>
          <p className="max-w-xl text-base text-slate-200 md:text-lg">
            Register farmland, verify sequestration with AI signatures, mint Token-2022 credits, and retire assets with
            auditable proof on Solana.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/login"
              className="rc-btn inline-flex items-center justify-center rounded-xl bg-orange-400 px-6 py-3 text-sm font-extrabold text-slate-950 transition hover:bg-orange-300"
            >
              Open Dashboard Login
            </Link>
            <Link
              href="/api/status"
              className="rc-btn inline-flex items-center justify-center rounded-xl bg-slate-950/30 px-6 py-3 text-sm font-bold text-slate-100 transition hover:bg-slate-950/50"
            >
              Check System Status
            </Link>
          </div>
          <div className="rc-glass rounded-2xl px-5 py-4">
            <p className="text-xs font-semibold tracking-widest text-slate-200">ARCHITECTURE</p>
            <p className="mt-1 text-sm text-slate-200">
              Web command center → AI oracle → Anchor program → Token-2022 credits → burn + events → indexer.
            </p>
          </div>
        </article>

        <article className="rc-glass rc-neo-soft rounded-3xl p-7">
          <h2 className="text-2xl font-extrabold tracking-tight">Sign In</h2>
          <p className="mt-2 text-sm text-slate-200">Use any available provider to unlock the command center.</p>
          <div className="mt-6">
            <SocialLoginButtons />
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rc-glass rounded-2xl px-4 py-3">
              <p className="text-xs font-semibold text-slate-200">AI Engine</p>
              <p className="mt-1 text-xs text-slate-300">Calculates biomass + signs mint payload.</p>
            </div>
            <div className="rc-glass rounded-2xl px-4 py-3">
              <p className="text-xs font-semibold text-slate-200">SB Server</p>
              <p className="mt-1 text-xs text-slate-300">Indexes events + broadcasts live metrics.</p>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}
