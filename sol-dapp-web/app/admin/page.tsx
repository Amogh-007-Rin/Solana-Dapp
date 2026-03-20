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
      <main className="min-h-screen bg-slate-950 px-6 py-14 text-slate-100">
        <section className="mx-auto max-w-2xl rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6">
          <h1 className="text-2xl font-semibold text-rose-100">Admin Access Required</h1>
          <p className="mt-2 text-sm text-rose-200">
            Your current role is {session.user.role ?? "operator"}. Ask an admin to grant admin role.
          </p>
          <Link href="/dashboard" className="mt-4 inline-block text-sm text-cyan-200 hover:text-cyan-100">
            Return to dashboard
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-14 text-slate-100">
      <section className="mx-auto max-w-3xl rounded-2xl border border-slate-700 bg-slate-900 p-6">
        <h1 className="text-2xl font-semibold">Admin Console</h1>
        <p className="mt-2 text-sm text-slate-300">
          This page is role-protected and available only to admin users.
        </p>
        <p className="mt-3 text-xs text-slate-400">Use PATCH /api/users/role to manage user roles.</p>
      </section>
    </main>
  );
}
