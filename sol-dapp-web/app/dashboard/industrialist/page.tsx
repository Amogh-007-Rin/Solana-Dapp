import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getUserByEmail } from "@/lib/user-store";
import { IndustrialistDashboardClient } from "./industrialist-dashboard-client";

export default async function IndustrialistDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/login");
  }

  if (session.user.role === "admin") {
    redirect("/admin");
  }

  const appUser = await getUserByEmail(session.user.email);
  if (!appUser) {
    redirect("/onboarding");
  }

  if (appUser.participantType !== "industrialist") {
    redirect("/dashboard");
  }

  return <IndustrialistDashboardClient user={appUser} />;
}
