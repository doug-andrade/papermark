import type { Adapter, AdapterAccount, AdapterSession, AdapterUser, VerificationToken } from "next-auth/adapters";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

// Create a Convex HTTP client for server-side operations
const getConvexClient = () => {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
  }
  return new ConvexHttpClient(convexUrl);
};

export function ConvexAdapter(): Adapter {
  const client = getConvexClient();

  return {
    async createUser(user: Omit<AdapterUser, "id">): Promise<AdapterUser> {
      const id = await client.mutation(api.users.create, {
        name: user.name ?? undefined,
        email: user.email ?? undefined,
        emailVerified: user.emailVerified?.getTime() ?? undefined,
        image: user.image ?? undefined,
      });

      return {
        id: id as string,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image,
      };
    },

    async getUser(id: string): Promise<AdapterUser | null> {
      try {
        const user = await client.query(api.users.getById, { id: id as Id<"users"> });
        if (!user) return null;

        return {
          id: user._id as string,
          name: user.name ?? null,
          email: user.email ?? "",
          emailVerified: user.emailVerified ? new Date(user.emailVerified) : null,
          image: user.image ?? null,
        };
      } catch {
        return null;
      }
    },

    async getUserByEmail(email: string): Promise<AdapterUser | null> {
      const user = await client.query(api.users.getByEmail, { email });
      if (!user) return null;

      return {
        id: user._id as string,
        name: user.name ?? null,
        email: user.email ?? "",
        emailVerified: user.emailVerified ? new Date(user.emailVerified) : null,
        image: user.image ?? null,
      };
    },

    async getUserByAccount({ providerAccountId, provider }): Promise<AdapterUser | null> {
      const account = await client.query(api.users.getAccountByProviderAccountId, {
        provider,
        providerAccountId,
      });
      if (!account) return null;

      const user = await client.query(api.users.getById, { id: account.userId as Id<"users"> });
      if (!user) return null;

      return {
        id: user._id as string,
        name: user.name ?? null,
        email: user.email ?? "",
        emailVerified: user.emailVerified ? new Date(user.emailVerified) : null,
        image: user.image ?? null,
      };
    },

    async updateUser(user: Partial<AdapterUser> & Pick<AdapterUser, "id">): Promise<AdapterUser> {
      await client.mutation(api.users.update, {
        id: user.id as Id<"users">,
        name: user.name ?? undefined,
        email: user.email ?? undefined,
        emailVerified: user.emailVerified?.getTime() ?? undefined,
        image: user.image ?? undefined,
      });

      const updatedUser = await client.query(api.users.getById, { id: user.id as Id<"users"> });
      if (!updatedUser) throw new Error("User not found after update");

      return {
        id: updatedUser._id as string,
        name: updatedUser.name ?? null,
        email: updatedUser.email ?? "",
        emailVerified: updatedUser.emailVerified ? new Date(updatedUser.emailVerified) : null,
        image: updatedUser.image ?? null,
      };
    },

    async deleteUser(userId: string): Promise<void> {
      await client.mutation(api.users.deleteUser, { id: userId as Id<"users"> });
    },

    async linkAccount(account: AdapterAccount): Promise<AdapterAccount> {
      await client.mutation(api.users.createAccount, {
        userId: account.userId as Id<"users">,
        type: account.type,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        refresh_token: account.refresh_token ?? undefined,
        access_token: account.access_token ?? undefined,
        expires_at: account.expires_at ?? undefined,
        token_type: account.token_type ?? undefined,
        scope: account.scope ?? undefined,
        id_token: account.id_token ?? undefined,
        session_state: account.session_state as string | undefined,
      });

      return account;
    },

    async unlinkAccount({ providerAccountId, provider }): Promise<void> {
      const account = await client.query(api.users.getAccountByProviderAccountId, {
        provider,
        providerAccountId,
      });
      if (account) {
        await client.mutation(api.users.deleteAccountById, { id: account._id });
      }
    },

    async createSession(session: { sessionToken: string; userId: string; expires: Date }): Promise<AdapterSession> {
      await client.mutation(api.users.createSession, {
        sessionToken: session.sessionToken,
        userId: session.userId as Id<"users">,
        expires: session.expires.getTime(),
      });

      return {
        sessionToken: session.sessionToken,
        userId: session.userId,
        expires: session.expires,
      };
    },

    async getSessionAndUser(sessionToken: string): Promise<{ session: AdapterSession; user: AdapterUser } | null> {
      const session = await client.query(api.users.getSessionByToken, { sessionToken });
      if (!session) return null;

      const user = await client.query(api.users.getById, { id: session.userId as Id<"users"> });
      if (!user) return null;

      return {
        session: {
          sessionToken: session.sessionToken,
          userId: session.userId as string,
          expires: new Date(session.expires),
        },
        user: {
          id: user._id as string,
          name: user.name ?? null,
          email: user.email ?? "",
          emailVerified: user.emailVerified ? new Date(user.emailVerified) : null,
          image: user.image ?? null,
        },
      };
    },

    async updateSession(session: Partial<AdapterSession> & Pick<AdapterSession, "sessionToken">): Promise<AdapterSession | null> {
      const existingSession = await client.query(api.users.getSessionByToken, {
        sessionToken: session.sessionToken,
      });
      if (!existingSession) return null;

      await client.mutation(api.users.updateSessionById, {
        id: existingSession._id,
        expires: session.expires?.getTime(),
      });

      const updatedSession = await client.query(api.users.getSessionByToken, {
        sessionToken: session.sessionToken,
      });
      if (!updatedSession) return null;

      return {
        sessionToken: updatedSession.sessionToken,
        userId: updatedSession.userId as string,
        expires: new Date(updatedSession.expires),
      };
    },

    async deleteSession(sessionToken: string): Promise<void> {
      const session = await client.query(api.users.getSessionByToken, { sessionToken });
      if (session) {
        await client.mutation(api.users.deleteSessionById, { id: session._id });
      }
    },

    async createVerificationToken(verificationToken: VerificationToken): Promise<VerificationToken | null> {
      await client.mutation(api.users.createVerificationToken, {
        identifier: verificationToken.identifier,
        token: verificationToken.token,
        expires: verificationToken.expires.getTime(),
      });

      return verificationToken;
    },

    async useVerificationToken({ identifier, token }): Promise<VerificationToken | null> {
      const verificationToken = await client.query(api.users.getVerificationToken, {
        identifier,
        token,
      });

      if (!verificationToken) return null;

      await client.mutation(api.users.deleteVerificationToken, {
        id: verificationToken._id,
      });

      return {
        identifier: verificationToken.identifier,
        token: verificationToken.token,
        expires: new Date(verificationToken.expires),
      };
    },
  };
}
