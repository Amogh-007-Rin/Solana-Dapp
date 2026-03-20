import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { getUserByEmail, upsertUserFromOAuth, updateUserParticipantType } from "@/lib/user-store";

type ParticipantType = "farmer" | "industrialist";

const DEMO_ACCOUNTS: Record<string, { name: string; password: string; participantType: ParticipantType }> = {
  "farmer@demo.com":        { name: "Demo Farmer",       password: "demo", participantType: "farmer" },
  "industrialist@demo.com": { name: "Demo Industrialist", password: "demo", participantType: "industrialist" },
  "admin@demo.com":         { name: "Demo Admin",         password: "demo", participantType: "industrialist" },
};

const providers: NextAuthOptions["providers"] = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

providers.push(
  CredentialsProvider({
    name: "Demo Account",
    credentials: {
      email:    { label: "Email",    type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const email = (credentials?.email ?? "").toLowerCase().trim();
      const demo  = DEMO_ACCOUNTS[email];
      if (!demo || credentials?.password !== demo.password) return null;
      return { id: email, email, name: demo.name };
    },
  }),
);

export const authOptions: NextAuthOptions = {
  providers,
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;

      await upsertUserFromOAuth({
        email:    user.email,
        name:     user.name ?? undefined,
        image:    user.image ?? undefined,
        provider: account?.provider ?? "credentials",
      });

      const demo = DEMO_ACCOUNTS[user.email.toLowerCase()];
      if (demo) {
        await updateUserParticipantType(user.email, demo.participantType);
      }

      return true;
    },

    async jwt({ token }) {
      if (token.email) {
        const appUser = await getUserByEmail(token.email);
        token.role            = appUser?.role            ?? "operator";
        token.participantType = appUser?.participantType ?? "industrialist";
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.role            = token.role as string;
        session.user.participantType = token.participantType as string;
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/dashboard`;
    },
  },
};
