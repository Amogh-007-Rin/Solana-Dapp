import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AdminUsersClient } from "./admin-users-client";

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
      <section className="mx-auto max-w-5xl rounded-2xl border border-slate-700 bg-slate-900 p-6">
        <h1 className="text-2xl font-semibold">Admin Console</h1>
        <p className="mt-2 text-sm text-slate-300">Manage user roles and access policy for the Root-Chain dashboard.</p>
        <p className="mt-3 text-xs text-slate-400">
          Your role: {session.user.role}. Current admin account ({session.user.email}) cannot be demoted from this panel.
        </p>

        <AdminUsersClient currentAdminEmail={session.user.email ?? ""} />

        <div className="mt-6">
          <Link href="/dashboard" className="text-sm text-cyan-200 hover:text-cyan-100">
            Return to dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
