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
    <main className="relative min-h-screen overflow-hidden bg-[#0b1020] text-white">
      <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-[#f97316]/20 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-24 h-80 w-80 rounded-full bg-[#0ea5e9]/20 blur-3xl" />
      <section className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 gap-10 px-6 py-16 lg:grid-cols-2 lg:items-center">
        <article className="space-y-6">
          <p className="inline-flex rounded-full border border-cyan-300/40 bg-cyan-300/10 px-3 py-1 text-xs tracking-wider text-cyan-100">
            ROOT-CHAIN PROTOCOL
          </p>
          <h1 className="text-4xl font-bold leading-tight md:text-6xl">
            Carbon Markets,
            <br />
            Verified On Chain.
          </h1>
          <p className="max-w-xl text-base text-slate-300 md:text-lg">
            Register farmland, verify sequestration with AI signatures, mint Token-2022 credits, and retire assets with
            auditable proof on Solana.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/login"
              className="rounded-lg bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-400"
            >
              Start With SSO
            </Link>
            <Link
              href="/api/status"
              className="rounded-lg border border-slate-500/70 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-300"
            >
              Check API Status
            </Link>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-600/40 bg-slate-900/60 p-6 backdrop-blur-sm">
          <h2 className="text-2xl font-semibold">Sign In</h2>
          <p className="mt-2 text-sm text-slate-300">Use one social account to unlock your custom command dashboard.</p>
          <div className="mt-6">
            <SocialLoginButtons />
          </div>
        </article>
      </section>
    </main>
  );
}
