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

export function AdminUsersClient({ currentAdminEmail }: AdminUsersClientProps) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<RoleAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditLoading, setAuditLoading] = useState(true);
  const [savingEmail, setSavingEmail] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("Ready");

  const roleDrafts = useMemo(() => {
    return Object.fromEntries(users.map((user) => [user.email, user.role])) as Record<string, UserRole>;
  }, [users]);
  const [draftRoles, setDraftRoles] = useState<Record<string, UserRole>>({});

  async function loadAuditLogs() {
    setAuditLoading(true);
    try {
      const response = await fetch("/api/audit/roles?limit=30", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to load audit logs (${response.status})`);
      }
      const data = (await response.json()) as { logs?: RoleAuditLog[] };
      setAuditLogs(data.logs ?? []);
    } catch {
      setAuditLogs([]);
    } finally {
      setAuditLoading(false);
    }
  }

  async function loadUsers() {
    setLoading(true);
    try {
      const response = await fetch("/api/users/list", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to load users (${response.status})`);
      }
      const data = (await response.json()) as { users?: AppUser[] };
      const loaded = data.users ?? [];
      setUsers(loaded);
      setDraftRoles(Object.fromEntries(loaded.map((user) => [user.email, user.role])) as Record<string, UserRole>);
      setStatus("User list loaded.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshAll() {
    await Promise.all([loadUsers(), loadAuditLogs()]);
  }

  useEffect(() => {
    refreshAll();
  }, []);

  async function saveRole(email: string) {
    const nextRole = draftRoles[email];
    if (!nextRole) {
      return;
    }

    setSavingEmail(email);
    try {
      const response = await fetch("/api/users/role", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: nextRole }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Update failed (${response.status}): ${text}`);
      }

      setUsers((prev) =>
        prev.map((user) =>
          user.email === email ? { ...user, role: nextRole, updatedAt: new Date().toISOString() } : user,
        ),
      );
      setStatus(`Role updated for ${email}.`);
      await loadAuditLogs();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to update role.");
      setDraftRoles((prev) => ({
        ...prev,
        [email]: roleDrafts[email],
      }));
    } finally {
      setSavingEmail(null);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-700 bg-slate-900 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">User Management</h2>
        <button
          type="button"
          onClick={refreshAll}
          className="rounded-md border border-slate-500 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:border-slate-300"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-slate-300">Loading users...</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-slate-300">
                <th className="px-2 py-2 font-medium">Name</th>
                <th className="px-2 py-2 font-medium">Email</th>
                <th className="px-2 py-2 font-medium">Provider</th>
                <th className="px-2 py-2 font-medium">Role</th>
                <th className="px-2 py-2 font-medium">Updated</th>
                <th className="px-2 py-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isCurrentAdmin = user.email.toLowerCase() === currentAdminEmail.toLowerCase();
                const canEdit = !isCurrentAdmin;
                return (
                  <tr key={user.id} className="border-b border-slate-800">
                    <td className="px-2 py-2">{user.name}</td>
                    <td className="px-2 py-2 text-slate-300">{user.email}</td>
                    <td className="px-2 py-2 text-slate-400">{user.provider ?? "google"}</td>
                    <td className="px-2 py-2">
                      <select
                        value={draftRoles[user.email] ?? user.role}
                        disabled={!canEdit || savingEmail === user.email}
                        onChange={(event) =>
                          setDraftRoles((prev) => ({
                            ...prev,
                            [user.email]: event.target.value as UserRole,
                          }))
                        }
                        className="rounded-md border border-slate-600 bg-slate-950 px-2 py-1 text-xs"
                      >
                        {ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-2 text-slate-400">{new Date(user.updatedAt).toLocaleString()}</td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        onClick={() => saveRole(user.email)}
                        disabled={!canEdit || savingEmail === user.email}
                        className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {savingEmail === user.email ? "Saving..." : "Save"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-xs text-slate-400">{status}</p>

      <div className="mt-6 rounded-xl border border-slate-700 bg-slate-950 p-3">
        <h3 className="text-sm font-semibold text-slate-200">Role Change Audit</h3>
        {auditLoading ? (
          <p className="mt-3 text-xs text-slate-400">Loading audit logs...</p>
        ) : auditLogs.length === 0 ? (
          <p className="mt-3 text-xs text-slate-400">No role changes recorded yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-xs text-slate-300">
            {auditLogs.map((log) => (
              <li key={log.id} className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2">
                <p>
                  <span className="text-indigo-300">{log.actorEmail}</span> changed
                  <span className="mx-1 text-cyan-300">{log.targetEmail}</span>
                  from <span className="text-amber-300">{log.previousRole}</span> to
                  <span className="ml-1 text-emerald-300">{log.newRole}</span>
                </p>
                <p className="mt-1 text-[11px] text-slate-500">{new Date(log.createdAt).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
