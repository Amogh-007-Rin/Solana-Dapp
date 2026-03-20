import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserByEmail } from "@/lib/user-store";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const appUser = await getUserByEmail(session.user.email);

  return NextResponse.json({
    user: {
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
      role: session.user.role,
    },
    profile: appUser,
    features: [
      "Farm Registration",
      "AI-verified Carbon Mint",
      "Token Retirement",
      "Live Service Health",
    ],
    timestamp: Date.now(),
  });
}
