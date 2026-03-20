"use client";

import { useEffect, useMemo, useState } from "react";

type UserRole = "operator" | "admin" | "auditor";

interface AppUser {
  id: string;
  email: string;
  name: string;
  image?: string;
  provider?: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

interface RoleAuditLog {
  id: string;
  actorEmail: string;
  targetEmail: string;
  previousRole: UserRole;
  newRole: UserRole;
  createdAt: string;
}

interface AdminUsersClientProps {
  currentAdminEmail: string;
}

const ROLES: UserRole[] = ["operator", "auditor", "admin"];

const ROLE_PILL: Record<UserRole, string> = {
  admin:    "bg-rose-500/15 text-rose-300 border border-rose-500/30",
  auditor:  "bg-amber-500/15 text-amber-300 border border-amber-500/30",
  operator: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
};

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${ROLE_PILL[role]}`}>
      {role}
    </span>
  );
}

export function AdminUsersClient({ currentAdminEmail }: AdminUsersClientProps) {
  const [users, setUsers]           = useState<AppUser[]>([]);
  const [auditLogs, setAuditLogs]   = useState<RoleAuditLog[]>([]);
  const [loading, setLoading]       = useState(true);
  const [auditLoading, setAuditLoading] = useState(true);
  const [savingEmail, setSavingEmail]   = useState<string | null>(null);
  const [status, setStatus]         = useState<string>("");
  const [statusType, setStatusType] = useState<"ok" | "error">("ok");
  const [draftRoles, setDraftRoles] = useState<Record<string, UserRole>>({});

  const roleDrafts = useMemo(
    () => Object.fromEntries(users.map((u) => [u.email, u.role])) as Record<string, UserRole>,
    [users],
  );

  async function loadAuditLogs() {
    setAuditLoading(true);
    try {
      const res = await fetch("/api/audit/roles?limit=30", { cache: "no-store" });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = (await res.json()) as { logs?: RoleAuditLog[] };
      setAuditLogs(data.logs ?? []);
    } catch { setAuditLogs([]); }
    finally { setAuditLoading(false); }
  }

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/users/list", { cache: "no-store" });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = (await res.json()) as { users?: AppUser[] };
      const loaded = data.users ?? [];
      setUsers(loaded);
      setDraftRoles(Object.fromEntries(loaded.map((u) => [u.email, u.role])) as Record<string, UserRole>);
      toast("Users loaded.", "ok");
    } catch (e) { toast(e instanceof Error ? e.message : "Failed to load users.", "error"); }
    finally { setLoading(false); }
  }

  function toast(msg: string, type: "ok" | "error") {
    setStatus(msg); setStatusType(type);
    setTimeout(() => setStatus(""), 4000);
  }

  useEffect(() => { void Promise.all([loadUsers(), loadAuditLogs()]); }, []);

  async function saveRole(email: string) {
    const nextRole = draftRoles[email];
    if (!nextRole) return;
    setSavingEmail(email);
    try {
      const res = await fetch("/api/users/role", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: nextRole }),
      });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      setUsers((prev) => prev.map((u) => u.email === email ? { ...u, role: nextRole, updatedAt: new Date().toISOString() } : u));
      toast(`Role updated for ${email}.`, "ok");
      await loadAuditLogs();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Update failed.", "error");
      setDraftRoles((prev) => ({ ...prev, [email]: roleDrafts[email] }));
    } finally { setSavingEmail(null); }
  }

  return (
    <div className="space-y-5 animate-slide-up">

      {/* ── User table ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h2 className="text-base font-bold">User Management</h2>
            <p className="text-xs text-slate-500">{users.length} user{users.length !== 1 ? "s" : ""} in store</p>
          </div>
          <button
            type="button"
            onClick={() => void Promise.all([loadUsers(), loadAuditLogs()])}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-400 transition hover:border-slate-500 hover:text-white"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="space-y-2 p-5">
            {[1,2,3].map((i) => <div key={i} className="skeleton h-12 w-full rounded-xl" />)}
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-slate-600">
            <span className="text-3xl opacity-40">👤</span>
            <p className="text-sm">No users yet. Sign in with Google to appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-600">
                  <th className="px-5 py-3 text-left font-semibold">User</th>
                  <th className="px-4 py-3 text-left font-semibold">Provider</th>
                  <th className="px-4 py-3 text-left font-semibold">Current Role</th>
                  <th className="px-4 py-3 text-left font-semibold">Change Role</th>
                  <th className="px-4 py-3 text-left font-semibold">Updated</th>
                  <th className="px-4 py-3 text-left font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.map((user) => {
                  const isSelf = user.email.toLowerCase() === currentAdminEmail.toLowerCase();
                  const isDirty = draftRoles[user.email] !== user.role;
                  return (
                    <tr key={user.id} className="group transition hover:bg-slate-800/30">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-sm font-bold text-slate-200">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-white">{user.name}</p>
                            <p className="text-[11px] text-slate-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[11px] text-slate-400">
                          {user.provider ?? "google"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <RoleBadge role={user.role} />
                      </td>
                      <td className="px-4 py-3.5">
                        <select
                          value={draftRoles[user.email] ?? user.role}
                          disabled={isSelf || savingEmail === user.email}
                          onChange={(e) => setDraftRoles((prev) => ({ ...prev, [user.email]: e.target.value as UserRole }))}
                          className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3.5 text-[11px] text-slate-500">
                        {new Date(user.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3.5">
                        {isSelf ? (
                          <span className="text-[11px] text-slate-600">You</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => saveRole(user.email)}
                            disabled={!isDirty || savingEmail === user.email}
                            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {savingEmail === user.email ? "Saving…" : "Save"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Toast ───────────────────────────────────────────────────────── */}
      {status && (
        <div className={`animate-slide-up flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-medium ${
          statusType === "ok"
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
            : "border-rose-500/30 bg-rose-500/10 text-rose-300"
        }`}>
          <span>{statusType === "ok" ? "✓" : "✗"}</span>
          {status}
        </div>
      )}

      {/* ── Audit log ───────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 overflow-hidden">
        <div className="border-b border-slate-800 px-5 py-4">
          <h2 className="text-base font-bold">Role Change Audit</h2>
          <p className="text-xs text-slate-500">Last 30 changes</p>
        </div>

        {auditLoading ? (
          <div className="space-y-2 p-5">
            {[1,2].map((i) => <div key={i} className="skeleton h-10 w-full rounded-xl" />)}
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-slate-600">
            <span className="text-2xl opacity-40">📋</span>
            <p className="text-xs">No role changes recorded yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-800/60">
            {auditLogs.map((log) => (
              <li key={log.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3.5 text-xs transition hover:bg-slate-800/20">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium text-indigo-300">{log.actorEmail}</span>
                  <span className="text-slate-600">changed</span>
                  <span className="font-medium text-cyan-300">{log.targetEmail}</span>
                  <span className="text-slate-600">from</span>
                  <RoleBadge role={log.previousRole} />
                  <span className="text-slate-600">to</span>
                  <RoleBadge role={log.newRole} />
                </div>
                <span className="shrink-0 font-mono text-[11px] text-slate-600">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

    </div>
  );
}
