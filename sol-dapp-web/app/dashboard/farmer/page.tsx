import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getUserByEmail } from "@/lib/user-store";
import { FarmerDashboardClient } from "./farmer-dashboard-client";

export default async function FarmerDashboardPage() {
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

  if (appUser.participantType !== "farmer") {
    redirect("/dashboard");
  }

  return <FarmerDashboardClient user={appUser} />;
}
