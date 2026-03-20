// In-memory user store — no database required.
// Data resets on server restart; fine for hackathon demo.

export type UserRole = "operator" | "admin" | "auditor";

export interface RoleAuditLog {
  id: string;
  actorEmail: string;
  targetEmail: string;
  previousRole: UserRole;
  newRole: UserRole;
  createdAt: string;
}

export interface AppUser {
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

// ─── Global in-memory store (survives HMR reloads in dev) ────────────────────

const g = globalThis as unknown as {
  __users?: Map<string, AppUser>;
  __auditLogs?: RoleAuditLog[];
};

if (!g.__users) g.__users = new Map();
if (!g.__auditLogs) g.__auditLogs = [];

const users: Map<string, AppUser> = g.__users;
const auditLogs: RoleAuditLog[] = g.__auditLogs;

// ─── Public API ───────────────────────────────────────────────────────────────

export async function upsertUserFromOAuth(input: {
  email: string;
  name?: string;
  image?: string;
  provider?: string;
}): Promise<AppUser> {
  const firstAdminEmail = process.env.FIRST_ADMIN_EMAIL?.toLowerCase();
  const normalizedEmail = input.email.toLowerCase();
  const shouldBeAdmin = Boolean(firstAdminEmail && normalizedEmail === firstAdminEmail);

  const existing = users.get(normalizedEmail);
  const now = new Date().toISOString();

  if (existing) {
    const updated: AppUser = {
      ...existing,
      name: input.name ?? existing.name,
      image: input.image ?? existing.image,
      provider: input.provider ?? existing.provider,
      role: shouldBeAdmin ? "admin" : existing.role,
      updatedAt: now,
      lastLoginAt: now,
    };
    users.set(normalizedEmail, updated);
    return updated;
  }

  const created: AppUser = {
    id: crypto.randomUUID(),
    email: normalizedEmail,
    name: input.name ?? "Root-Chain User",
    image: input.image,
    provider: input.provider,
    role: shouldBeAdmin ? "admin" : "operator",
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
  };
  users.set(normalizedEmail, created);
  return created;
}

export async function getUserByEmail(email: string): Promise<AppUser | null> {
  return users.get(email.toLowerCase()) ?? null;
}

export async function updateUserRole(email: string, role: UserRole): Promise<AppUser | null> {
  const existing = users.get(email.toLowerCase());
  if (!existing) return null;

  const updated: AppUser = { ...existing, role, updatedAt: new Date().toISOString() };
  users.set(email.toLowerCase(), updated);
  return updated;
}

export async function listUsers(): Promise<AppUser[]> {
  return Array.from(users.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export async function appendRoleAuditLog(input: {
  actorEmail: string;
  targetEmail: string;
  previousRole: UserRole;
  newRole: UserRole;
}): Promise<RoleAuditLog> {
  const entry: RoleAuditLog = {
    id: crypto.randomUUID(),
    ...input,
    createdAt: new Date().toISOString(),
  };
  auditLogs.unshift(entry);
  return entry;
}

export async function listRoleAuditLogs(limit = 100): Promise<RoleAuditLog[]> {
  return auditLogs.slice(0, Math.max(1, limit));
}
