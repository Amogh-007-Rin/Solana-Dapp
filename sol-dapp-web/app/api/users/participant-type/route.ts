import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getUserByEmail,
  updateUserParticipantType,
  type ParticipantType,
} from "@/lib/user-store";

const ALLOWED_TYPES: ParticipantType[] = ["farmer", "industrialist"];

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const appUser = await getUserByEmail(session.user.email);
  if (!appUser) {
    return NextResponse.json({ message: "User profile not found" }, { status: 404 });
  }

  const body = (await req.json()) as { participantType?: ParticipantType };
  if (!body.participantType || !ALLOWED_TYPES.includes(body.participantType)) {
    return NextResponse.json({ message: "Invalid participantType" }, { status: 400 });
  }

  const updated = await updateUserParticipantType(appUser.email, body.participantType);
  if (!updated) {
    return NextResponse.json({ message: "Failed to update user" }, { status: 500 });
  }

  return NextResponse.json({ user: updated });
}
