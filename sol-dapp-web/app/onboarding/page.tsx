import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getUserByEmail, updateUserParticipantType } from "@/lib/user-store";

interface OnboardingPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/login");
  }

  const appUser = await getUserByEmail(session.user.email);
  if (!appUser) {
    redirect("/login");
  }

  const resolvedParams = (await searchParams) ?? {};
  const type = typeof resolvedParams.type === "string" ? resolvedParams.type : "";

  if (type === "farmer" || type === "industrialist") {
    await updateUserParticipantType(appUser.email, type);
    if (type === "farmer") {
      redirect("/dashboard/farmer");
    }
    redirect("/dashboard/industrialist");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#020817] px-4 text-white">
      <section className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <h1 className="text-2xl font-bold">Choose Dashboard Type</h1>
        <p className="mt-2 text-sm text-slate-400">
          Continue as farmer/agriculturist to mint credits from land, or as industrialist to buy credits.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Link
            href="/onboarding?type=farmer"
            className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center text-sm font-semibold text-amber-300 transition hover:bg-amber-500/20"
          >
            Farmer Dashboard
          </Link>
          <Link
            href="/onboarding?type=industrialist"
            className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-center text-sm font-semibold text-cyan-300 transition hover:bg-cyan-500/20"
          >
            Industrialist Dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
