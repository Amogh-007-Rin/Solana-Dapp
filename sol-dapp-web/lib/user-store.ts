import { promises as fs } from "fs";
import path from "path";

export type UserRole = "operator" | "admin" | "auditor";

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

interface UserStoreShape {
  users: AppUser[];
}

const dataDir = path.resolve(process.cwd(), "data");
const usersFile = path.join(dataDir, "users.json");

function randomId() {
  return `usr_${Math.random().toString(36).slice(2, 12)}`;
}

async function readStore(): Promise<UserStoreShape> {
  try {
    const text = await fs.readFile(usersFile, "utf8");
    const parsed = JSON.parse(text) as UserStoreShape;
    if (!parsed || !Array.isArray(parsed.users)) {
      return { users: [] };
    }
    return parsed;
  } catch {
    return { users: [] };
  }
}

async function writeStore(store: UserStoreShape): Promise<void> {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(usersFile, JSON.stringify(store, null, 2), "utf8");
}

export async function upsertUserFromOAuth(input: {
  email: string;
  name?: string;
  image?: string;
  provider?: string;
}): Promise<AppUser> {
  const now = new Date().toISOString();
  const store = await readStore();
  const firstAdminEmail = process.env.FIRST_ADMIN_EMAIL?.toLowerCase();

  const existing = store.users.find((u) => u.email.toLowerCase() === input.email.toLowerCase());
  if (existing) {
    existing.name = input.name ?? existing.name;
    existing.image = input.image ?? existing.image;
    existing.provider = input.provider ?? existing.provider;
    existing.updatedAt = now;
    existing.lastLoginAt = now;
    if (firstAdminEmail && existing.email.toLowerCase() === firstAdminEmail) {
      existing.role = "admin";
    }
    await writeStore(store);
    return existing;
  }

  const created: AppUser = {
    id: randomId(),
    email: input.email,
    name: input.name ?? "Root-Chain User",
    image: input.image,
    provider: input.provider,
    role: firstAdminEmail && input.email.toLowerCase() === firstAdminEmail ? "admin" : "operator",
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
  };

  store.users.push(created);
  await writeStore(store);
  return created;
}

export async function getUserByEmail(email: string): Promise<AppUser | null> {
  const store = await readStore();
  return store.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export async function updateUserRole(email: string, role: UserRole): Promise<AppUser | null> {
  const store = await readStore();
  const user = store.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return null;
  }

  user.role = role;
  user.updatedAt = new Date().toISOString();
  await writeStore(store);
  return user;
}
