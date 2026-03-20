import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { SocialLoginButtons } from "@/app/social-login-buttons";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="rc-bg rc-grid min-h-screen px-6 py-12 text-slate-100">
      <section className="mx-auto grid max-w-4xl gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="rc-btn rounded-xl bg-slate-950/30 px-4 py-2 text-sm font-bold text-slate-100">
            Back to landing
          </Link>
          <p className="rc-chip rounded-full px-4 py-2 text-xs font-semibold tracking-widest text-slate-100">
            COMMAND CENTER ACCESS
          </p>
        </div>

        <article className="rc-glass rc-neo rounded-3xl p-8">
          <h1 className="text-3xl font-black tracking-tight md:text-4xl">Sign in to Root-Chain</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-200">
            Neo-brutal shell, glass panels, and on-chain actions. Pick any available provider to continue.
          </p>
          <div className="mt-7 max-w-md">
            <SocialLoginButtons />
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rc-glass rounded-2xl px-4 py-3">
              <p className="text-xs font-semibold text-slate-200">Wallet</p>
              <p className="mt-1 text-xs text-slate-300">Connect Phantom, sign txs.</p>
            </div>
            <div className="rc-glass rounded-2xl px-4 py-3">
              <p className="text-xs font-semibold text-slate-200">Oracle</p>
              <p className="mt-1 text-xs text-slate-300">AI signs mint payload.</p>
            </div>
            <div className="rc-glass rounded-2xl px-4 py-3">
              <p className="text-xs font-semibold text-slate-200">Program</p>
              <p className="mt-1 text-xs text-slate-300">Mints/burns Token-2022.</p>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}
