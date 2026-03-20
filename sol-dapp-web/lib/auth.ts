import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import TwitterProvider from "next-auth/providers/twitter";
import CredentialsProvider from "next-auth/providers/credentials";
import { getUserByEmail, upsertUserFromOAuth } from "@/lib/user-store";

const providers = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
  providers.push(
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    }),
  );
}

if (process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET) {
  providers.push(
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET,
      version: "2.0",
    }),
  );
}

const devAuthEnabled = process.env.NODE_ENV !== "production" && process.env.DISABLE_DEV_AUTH !== "1";

if (devAuthEnabled && providers.length === 0) {
  providers.push(
    CredentialsProvider({
      name: "Local Dev",
      credentials: {},
      async authorize() {
        return {
          id: "local-dev",
          name: "Local Operator",
          email: "local@root-chain.dev",
        };
      },
    }),
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  secret:
    process.env.NEXTAUTH_SECRET ??
    (process.env.NODE_ENV !== "production" ? "root-chain-dev-secret" : undefined),
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) {
        return false;
      }

      await upsertUserFromOAuth({
        email: user.email,
        name: user.name ?? undefined,
        image: user.image ?? undefined,
        provider: account?.provider,
      });

      return true;
    },
    async jwt({ token }) {
      if (token.email) {
        const appUser = await getUserByEmail(token.email);
        token.role = appUser?.role ?? "operator";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      if (new URL(url).origin === baseUrl) {
        return url;
      }

      return `${baseUrl}/dashboard`;
    },
  },
};
