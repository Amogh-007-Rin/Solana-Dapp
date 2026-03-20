import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { appendRoleAuditLog, getUserByEmail, updateUserRole, type UserRole } from "@/lib/user-store";

const ALLOWED_ROLES: UserRole[] = ["operator", "admin", "auditor"];

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as { email?: string; role?: UserRole };
  if (!body.email || !body.role || !ALLOWED_ROLES.includes(body.role)) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const existing = await getUserByEmail(body.email);
  if (!existing) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  if (existing.role === body.role) {
    return NextResponse.json({ user: existing, message: "Role unchanged" });
  }

  const updated = await updateUserRole(body.email, body.role);
  if (!updated) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  const audit = await appendRoleAuditLog({
    actorEmail: session.user.email,
    targetEmail: existing.email,
    previousRole: existing.role,
    newRole: body.role,
  });

  return NextResponse.json({ user: updated, audit });
}
