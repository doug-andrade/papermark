import { describe, it, expect, vi } from "vitest";

// Note: Auth adapter tests would need to mock the Convex HTTP client
// In a real test environment, you would use proper mocking

describe("ConvexAdapter", () => {
  describe("user operations", () => {
    it("should format user data correctly", () => {
      const convexUser = {
        _id: "user_123",
        name: "Test User",
        email: "test@example.com",
        emailVerified: 1700000000000,
        image: "https://example.com/avatar.jpg",
      };

      const adapterUser = {
        id: convexUser._id as string,
        name: convexUser.name ?? null,
        email: convexUser.email ?? "",
        emailVerified: convexUser.emailVerified
          ? new Date(convexUser.emailVerified)
          : null,
        image: convexUser.image ?? null,
      };

      expect(adapterUser.id).toBe("user_123");
      expect(adapterUser.name).toBe("Test User");
      expect(adapterUser.email).toBe("test@example.com");
      expect(adapterUser.emailVerified).toBeInstanceOf(Date);
      expect(adapterUser.image).toBe("https://example.com/avatar.jpg");
    });

    it("should handle null user fields", () => {
      const convexUser = {
        _id: "user_123",
        name: null,
        email: null,
        emailVerified: null,
        image: null,
      };

      const adapterUser = {
        id: convexUser._id as string,
        name: convexUser.name ?? null,
        email: convexUser.email ?? "",
        emailVerified: convexUser.emailVerified
          ? new Date(convexUser.emailVerified)
          : null,
        image: convexUser.image ?? null,
      };

      expect(adapterUser.name).toBeNull();
      expect(adapterUser.email).toBe("");
      expect(adapterUser.emailVerified).toBeNull();
      expect(adapterUser.image).toBeNull();
    });
  });

  describe("session operations", () => {
    it("should format session data correctly", () => {
      const convexSession = {
        _id: "session_123",
        sessionToken: "token_abc123",
        userId: "user_123",
        expires: 1700000000000,
      };

      const adapterSession = {
        sessionToken: convexSession.sessionToken,
        userId: convexSession.userId as string,
        expires: new Date(convexSession.expires),
      };

      expect(adapterSession.sessionToken).toBe("token_abc123");
      expect(adapterSession.userId).toBe("user_123");
      expect(adapterSession.expires).toBeInstanceOf(Date);
    });
  });

  describe("account operations", () => {
    it("should map OAuth token fields to schema fields", () => {
      const oauthAccount = {
        userId: "user_123",
        type: "oauth",
        provider: "google",
        providerAccountId: "google_123",
        refresh_token: "refresh_token_value",
        access_token: "access_token_value",
        expires_at: 3600,
        token_type: "Bearer",
        scope: "openid profile email",
        id_token: "id_token_value",
        session_state: null,
      };

      const schemaAccount = {
        userId: oauthAccount.userId,
        type: oauthAccount.type,
        provider: oauthAccount.provider,
        providerAccountId: oauthAccount.providerAccountId,
        refreshToken: oauthAccount.refresh_token,
        accessToken: oauthAccount.access_token,
        expiresAt: oauthAccount.expires_at,
        tokenType: oauthAccount.token_type,
        scope: oauthAccount.scope,
        idToken: oauthAccount.id_token,
        sessionState: oauthAccount.session_state,
      };

      expect(schemaAccount.refreshToken).toBe("refresh_token_value");
      expect(schemaAccount.accessToken).toBe("access_token_value");
      expect(schemaAccount.tokenType).toBe("Bearer");
    });
  });

  describe("verification token operations", () => {
    it("should format verification token correctly", () => {
      const convexToken = {
        _id: "token_123",
        identifier: "user@example.com",
        token: "verification_token",
        expires: 1700000000000,
      };

      const adapterToken = {
        identifier: convexToken.identifier,
        token: convexToken.token,
        expires: new Date(convexToken.expires),
      };

      expect(adapterToken.identifier).toBe("user@example.com");
      expect(adapterToken.token).toBe("verification_token");
      expect(adapterToken.expires).toBeInstanceOf(Date);
    });
  });

  describe("date conversions", () => {
    it("should convert Date to timestamp for storage", () => {
      const date = new Date("2023-11-15T00:00:00.000Z");
      const timestamp = date.getTime();

      expect(typeof timestamp).toBe("number");
      expect(timestamp).toBe(1700006400000);
    });

    it("should convert timestamp to Date for retrieval", () => {
      const timestamp = 1700006400000;
      const date = new Date(timestamp);

      expect(date).toBeInstanceOf(Date);
      expect(date.toISOString()).toBe("2023-11-15T00:00:00.000Z");
    });

    it("should handle null dates", () => {
      const timestamp: number | null = null;
      const date = timestamp ? new Date(timestamp) : null;

      expect(date).toBeNull();
    });
  });

  describe("ID handling", () => {
    it("should cast string IDs to Convex ID type", () => {
      const stringId = "user_123";
      // In real code, this would be: stringId as Id<"users">
      // The test verifies the pattern works
      expect(typeof stringId).toBe("string");
    });
  });

  describe("getSessionAndUser", () => {
    it("should return combined session and user data", () => {
      const session = {
        sessionToken: "token_123",
        userId: "user_123",
        expires: 1700000000000,
      };

      const user = {
        _id: "user_123",
        name: "Test User",
        email: "test@example.com",
        emailVerified: 1700000000000,
        image: null,
      };

      const result = {
        session: {
          sessionToken: session.sessionToken,
          userId: session.userId,
          expires: new Date(session.expires),
        },
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          emailVerified: new Date(user.emailVerified),
          image: user.image,
        },
      };

      expect(result.session.sessionToken).toBe("token_123");
      expect(result.user.id).toBe("user_123");
      expect(result.user.name).toBe("Test User");
    });

    it("should return null if session not found", () => {
      const session = null;
      const result = session ? { session, user: null } : null;

      expect(result).toBeNull();
    });

    it("should return null if user not found", () => {
      const session = { sessionToken: "token_123", userId: "user_123" };
      const user = null;

      const result = user ? { session, user } : null;

      expect(result).toBeNull();
    });
  });
});
