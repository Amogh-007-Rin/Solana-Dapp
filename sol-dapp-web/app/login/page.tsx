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
    <main className="min-h-screen bg-[#09111f] px-6 py-12 text-white">
      <section className="mx-auto grid max-w-3xl gap-6">
        <Link href="/" className="text-sm text-cyan-200 hover:text-cyan-100">
          Back to landing
        </Link>
        <article className="rounded-2xl border border-slate-700 bg-slate-900/70 p-8">
          <h1 className="text-3xl font-bold">Sign in to Root-Chain</h1>
          <p className="mt-2 text-sm text-slate-300">
            Continue with Google, Facebook, or Twitter to access your dashboard.
          </p>
          <div className="mt-6">
            <SocialLoginButtons />
          </div>
        </article>
      </section>
    </main>
  );
}
