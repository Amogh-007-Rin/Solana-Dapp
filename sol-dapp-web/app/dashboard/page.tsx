import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <DashboardClient
      email={session.user.email ?? "unknown-user"}
      name={session.user.name ?? "Operator"}
      role={session.user.role ?? "operator"}
    />
  );
}
