import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: "operator" | "admin" | "auditor";
      participantType?: "farmer" | "industrialist";
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "operator" | "admin" | "auditor";
    participantType?: "farmer" | "industrialist";
  }
}
