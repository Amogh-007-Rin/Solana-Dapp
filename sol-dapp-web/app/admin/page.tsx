import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    return (
      <main className="rc-bg rc-grid min-h-screen px-6 py-14 text-slate-100">
        <section className="rc-glass rc-neo mx-auto max-w-2xl rounded-3xl p-7">
          <h1 className="text-2xl font-black text-rose-100">Admin Access Required</h1>
          <p className="mt-2 text-sm text-slate-200">
            Your current role is {session.user.role ?? "operator"}. Ask an admin to grant admin role.
          </p>
          <Link
            href="/dashboard"
            className="rc-btn mt-6 inline-flex rounded-xl bg-slate-950/30 px-4 py-2 text-sm font-bold text-slate-100 transition hover:bg-slate-950/50"
          >
            Return to dashboard
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="rc-bg rc-grid min-h-screen px-6 py-14 text-slate-100">
      <section className="rc-glass rc-neo mx-auto max-w-3xl rounded-3xl p-7">
        <p className="rc-chip inline-flex rounded-full px-4 py-2 text-[11px] font-extrabold tracking-widest text-indigo-100">
          ADMIN ONLY
        </p>
        <h1 className="mt-4 text-2xl font-black">Admin Console</h1>
        <p className="mt-2 text-sm text-slate-200">
          This page is role-protected and available only to admin users.
        </p>
        <p className="mt-3 text-xs text-slate-300">Use PATCH /api/users/role to manage user roles.</p>
        <Link
          href="/dashboard"
          className="rc-btn mt-6 inline-flex rounded-xl bg-emerald-400 px-4 py-2 text-sm font-extrabold text-slate-950 transition hover:bg-emerald-300"
        >
          Back to dashboard
        </Link>
      </section>
    </main>
  );
}
