import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

describe("teams", () => {
  describe("create", () => {
    it("should create a new team with default settings", async () => {
      const t = convexTest(schema);

      const teamId = await t.mutation(api.teams.create, {
        name: "Test Team",
      });

      expect(teamId).toBeDefined();

      const team = await t.query(api.teams.getById, { id: teamId });
      expect(team).toBeDefined();
      expect(team?.name).toBe("Test Team");
      expect(team?.plan).toBe("free");
      expect(team?.enableExcelAdvancedMode).toBe(false);
      expect(team?.replicateDataroomFolders).toBe(true);
      expect(team?.agentsEnabled).toBe(false);
      expect(team?.ignoredDomains).toEqual([]);
      expect(team?.globalBlockList).toEqual([]);
    });

    it("should create a team with custom plan", async () => {
      const t = convexTest(schema);

      const teamId = await t.mutation(api.teams.create, {
        name: "Pro Team",
        plan: "pro",
      });

      const team = await t.query(api.teams.getById, { id: teamId });
      expect(team?.plan).toBe("pro");
    });
  });

  describe("update", () => {
    it("should update team fields", async () => {
      const t = convexTest(schema);

      const teamId = await t.mutation(api.teams.create, {
        name: "Original Team",
      });

      await t.mutation(api.teams.update, {
        id: teamId,
        name: "Updated Team",
        plan: "business",
        agentsEnabled: true,
        ignoredDomains: ["spam.com"],
      });

      const team = await t.query(api.teams.getById, { id: teamId });
      expect(team?.name).toBe("Updated Team");
      expect(team?.plan).toBe("business");
      expect(team?.agentsEnabled).toBe(true);
      expect(team?.ignoredDomains).toEqual(["spam.com"]);
    });
  });

  describe("members", () => {
    it("should add member to team", async () => {
      const t = convexTest(schema);

      const userId = await t.mutation(api.users.create, {
        name: "Team Member",
        email: "member@example.com",
      });

      const teamId = await t.mutation(api.teams.create, {
        name: "Member Team",
      });

      await t.mutation(api.teams.addMember, {
        userId,
        teamId,
        role: "ADMIN",
      });

      const members = await t.query(api.teams.getTeamMembers, { teamId });
      expect(members).toHaveLength(1);
      expect(members[0].role).toBe("ADMIN");
      expect(members[0].user?._id).toBe(userId);
    });

    it("should not duplicate member", async () => {
      const t = convexTest(schema);

      const userId = await t.mutation(api.users.create, {
        name: "Duplicate Member",
        email: "dupe@example.com",
      });

      const teamId = await t.mutation(api.teams.create, {
        name: "Dupe Team",
      });

      const firstId = await t.mutation(api.teams.addMember, {
        userId,
        teamId,
      });

      const secondId = await t.mutation(api.teams.addMember, {
        userId,
        teamId,
      });

      // Should return the same ID
      expect(firstId).toBe(secondId);

      const members = await t.query(api.teams.getTeamMembers, { teamId });
      expect(members).toHaveLength(1);
    });

    it("should update member role", async () => {
      const t = convexTest(schema);

      const userId = await t.mutation(api.users.create, {
        name: "Role Change",
        email: "role@example.com",
      });

      const teamId = await t.mutation(api.teams.create, {
        name: "Role Team",
      });

      await t.mutation(api.teams.addMember, {
        userId,
        teamId,
        role: "MEMBER",
      });

      await t.mutation(api.teams.updateMember, {
        userId,
        teamId,
        role: "MANAGER",
      });

      const members = await t.query(api.teams.getTeamMembers, { teamId });
      expect(members[0].role).toBe("MANAGER");
    });

    it("should remove member from team", async () => {
      const t = convexTest(schema);

      const userId = await t.mutation(api.users.create, {
        name: "Remove Me",
        email: "remove@example.com",
      });

      const teamId = await t.mutation(api.teams.create, {
        name: "Remove Team",
      });

      await t.mutation(api.teams.addMember, {
        userId,
        teamId,
      });

      await t.mutation(api.teams.removeMember, {
        userId,
        teamId,
      });

      const members = await t.query(api.teams.getTeamMembers, { teamId });
      expect(members).toHaveLength(0);
    });
  });

  describe("brand", () => {
    it("should create and update brand", async () => {
      const t = convexTest(schema);

      const teamId = await t.mutation(api.teams.create, {
        name: "Brand Team",
      });

      await t.mutation(api.teams.createBrand, {
        teamId,
        logo: "https://example.com/logo.png",
        brandColor: "#FF0000",
      });

      let teamWithBrand = await t.query(api.teams.getTeamWithBrand, { teamId });
      expect(teamWithBrand?.brand?.logo).toBe("https://example.com/logo.png");
      expect(teamWithBrand?.brand?.brandColor).toBe("#FF0000");

      await t.mutation(api.teams.updateBrand, {
        teamId,
        brandColor: "#00FF00",
        welcomeMessage: "Welcome!",
      });

      teamWithBrand = await t.query(api.teams.getTeamWithBrand, { teamId });
      expect(teamWithBrand?.brand?.brandColor).toBe("#00FF00");
      expect(teamWithBrand?.brand?.welcomeMessage).toBe("Welcome!");
    });
  });

  describe("invitations", () => {
    it("should create and retrieve invitation", async () => {
      const t = convexTest(schema);

      const teamId = await t.mutation(api.teams.create, {
        name: "Invite Team",
      });

      await t.mutation(api.teams.createInvitation, {
        email: "invite@example.com",
        teamId,
        token: "invite-token-123",
        expires: Date.now() + 86400000,
      });

      const invitation = await t.query(api.teams.getInvitationByToken, {
        token: "invite-token-123",
      });

      expect(invitation).toBeDefined();
      expect(invitation?.email).toBe("invite@example.com");
      expect(invitation?.teamId).toBe(teamId);
    });

    it("should delete invitation", async () => {
      const t = convexTest(schema);

      const teamId = await t.mutation(api.teams.create, {
        name: "Delete Invite Team",
      });

      await t.mutation(api.teams.createInvitation, {
        email: "delete@example.com",
        teamId,
        token: "delete-token",
        expires: Date.now() + 86400000,
      });

      await t.mutation(api.teams.deleteInvitation, {
        token: "delete-token",
      });

      const invitation = await t.query(api.teams.getInvitationByToken, {
        token: "delete-token",
      });

      expect(invitation).toBeNull();
    });
  });
});
