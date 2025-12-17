import { convexTest } from "convex-test";
import { describe, it, expect, beforeEach } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

describe("users", () => {
  describe("create", () => {
    it("should create a new user with default plan", async () => {
      const t = convexTest(schema);

      const userId = await t.mutation(api.users.create, {
        name: "Test User",
        email: "test@example.com",
      });

      expect(userId).toBeDefined();

      const user = await t.query(api.users.getById, { id: userId });
      expect(user).toBeDefined();
      expect(user?.name).toBe("Test User");
      expect(user?.email).toBe("test@example.com");
      expect(user?.plan).toBe("free");
    });

    it("should create a user with custom plan", async () => {
      const t = convexTest(schema);

      const userId = await t.mutation(api.users.create, {
        name: "Pro User",
        email: "pro@example.com",
        plan: "pro",
      });

      const user = await t.query(api.users.getById, { id: userId });
      expect(user?.plan).toBe("pro");
    });
  });

  describe("getByEmail", () => {
    it("should find user by email", async () => {
      const t = convexTest(schema);

      const userId = await t.mutation(api.users.create, {
        name: "Email User",
        email: "findme@example.com",
      });

      const user = await t.query(api.users.getByEmail, {
        email: "findme@example.com",
      });

      expect(user).toBeDefined();
      expect(user?._id).toBe(userId);
    });

    it("should return null for non-existent email", async () => {
      const t = convexTest(schema);

      const user = await t.query(api.users.getByEmail, {
        email: "nonexistent@example.com",
      });

      expect(user).toBeNull();
    });
  });

  describe("update", () => {
    it("should update user fields", async () => {
      const t = convexTest(schema);

      const userId = await t.mutation(api.users.create, {
        name: "Original Name",
        email: "update@example.com",
      });

      await t.mutation(api.users.update, {
        id: userId,
        name: "Updated Name",
        plan: "business",
      });

      const user = await t.query(api.users.getById, { id: userId });
      expect(user?.name).toBe("Updated Name");
      expect(user?.plan).toBe("business");
    });
  });

  describe("remove", () => {
    it("should delete user and associated records", async () => {
      const t = convexTest(schema);

      const userId = await t.mutation(api.users.create, {
        name: "Delete Me",
        email: "delete@example.com",
      });

      // Create an account for the user
      await t.mutation(api.users.createAccount, {
        userId,
        type: "oauth",
        provider: "google",
        providerAccountId: "google-123",
      });

      // Delete the user
      await t.mutation(api.users.remove, { id: userId });

      // Verify user is deleted
      const user = await t.query(api.users.getById, { id: userId });
      expect(user).toBeNull();

      // Verify accounts are deleted
      const accounts = await t.query(api.users.getUserAccounts, { userId });
      expect(accounts).toHaveLength(0);
    });
  });

  describe("sessions", () => {
    it("should create and retrieve session", async () => {
      const t = convexTest(schema);

      const userId = await t.mutation(api.users.create, {
        name: "Session User",
        email: "session@example.com",
      });

      await t.mutation(api.users.createSession, {
        userId,
        sessionToken: "test-token-123",
        expires: Date.now() + 86400000, // 24 hours
      });

      const result = await t.query(api.users.getSessionByToken, {
        sessionToken: "test-token-123",
      });

      expect(result).toBeDefined();
      expect(result?.session.sessionToken).toBe("test-token-123");
      expect(result?.user?._id).toBe(userId);
    });

    it("should delete session", async () => {
      const t = convexTest(schema);

      const userId = await t.mutation(api.users.create, {
        name: "Session User",
        email: "session2@example.com",
      });

      await t.mutation(api.users.createSession, {
        userId,
        sessionToken: "delete-token",
        expires: Date.now() + 86400000,
      });

      await t.mutation(api.users.deleteSession, {
        sessionToken: "delete-token",
      });

      const result = await t.query(api.users.getSessionByToken, {
        sessionToken: "delete-token",
      });

      expect(result).toBeNull();
    });
  });

  describe("verification tokens", () => {
    it("should create and use verification token", async () => {
      const t = convexTest(schema);

      await t.mutation(api.users.createVerificationToken, {
        identifier: "verify@example.com",
        token: "verify-token-123",
        expires: Date.now() + 3600000, // 1 hour
      });

      const token = await t.mutation(api.users.useVerificationToken, {
        identifier: "verify@example.com",
        token: "verify-token-123",
      });

      expect(token).toBeDefined();
      expect(token?.identifier).toBe("verify@example.com");

      // Token should be deleted after use
      const tokenAgain = await t.mutation(api.users.useVerificationToken, {
        identifier: "verify@example.com",
        token: "verify-token-123",
      });

      expect(tokenAgain).toBeNull();
    });
  });
});
