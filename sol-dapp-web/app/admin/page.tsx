import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AdminUsersClient } from "./admin-users-client";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  if (session.user.role !== "admin") {
    return (
      <main className="relative flex min-h-screen items-center justify-center bg-[#020817] px-6 text-white">
        <div className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-rose-500/8 p-8 text-center">
          <span className="text-4xl">🚫</span>
          <h1 className="mt-4 text-xl font-bold text-rose-300">Admin Access Required</h1>
          <p className="mt-2 text-sm text-rose-400/80">
            Your role is <strong>{session.user.role ?? "operator"}</strong>. Ask an admin to grant access.
          </p>
          <Link href="/dashboard" className="mt-6 inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-white">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-[#020817] text-white">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-0 right-1/3 h-72 w-72 rounded-full bg-indigo-500/8 blur-[100px]" />
        <div className="absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-emerald-500/6 blur-[80px]" />
      </div>
      <div className="pointer-events-none fixed inset-0 bg-dot-grid opacity-20" />

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-8 sm:px-6">

        {/* Header */}
        <header className="animate-slide-up mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 px-6 py-4 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 ring-1 ring-indigo-500/30">
              <svg className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold">Admin Console</h1>
              <p className="text-xs text-slate-500">Root-Chain · {session.user.email}</p>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-400 transition hover:border-slate-500 hover:text-white"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Dashboard
          </Link>
        </header>

        <AdminUsersClient currentAdminEmail={session.user.email ?? ""} />

      </div>
    </main>
  );
}
