import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

describe("links", () => {
  const createTestTeam = async (t: any) => {
    return await t.mutation(api.teams.create, {
      name: "Test Team",
    });
  };

  const createTestDocument = async (t: any, teamId: any) => {
    return await t.mutation(api.documents.create, {
      name: "Test Document",
      file: "https://storage.example.com/doc.pdf",
      teamId,
    });
  };

  describe("create", () => {
    it("should create a document link with default settings", async () => {
      const t = convexTest(schema);
      const teamId = await createTestTeam(t);
      const docId = await createTestDocument(t, teamId);

      const linkId = await t.mutation(api.links.create, {
        documentId: docId,
        teamId,
        url: "https://papermark.io/view/test-link",
      });

      expect(linkId).toBeDefined();

      const link = await t.query(api.links.getById, { id: linkId });
      expect(link).toBeDefined();
      expect(link?.linkType).toBe("DOCUMENT_LINK");
      expect(link?.emailProtected).toBe(true);
      expect(link?.emailAuthenticated).toBe(false);
      expect(link?.allowDownload).toBe(false);
      expect(link?.isArchived).toBe(false);
      expect(link?.audienceType).toBe("GENERAL");
      expect(link?.enableConversation).toBe(false);
    });

    it("should create link with custom settings", async () => {
      const t = convexTest(schema);
      const teamId = await createTestTeam(t);
      const docId = await createTestDocument(t, teamId);

      const linkId = await t.mutation(api.links.create, {
        documentId: docId,
        teamId,
        name: "VIP Link",
        emailProtected: false,
        allowDownload: true,
        password: "secret123",
        allowList: ["vip@company.com", "@trusted.com"],
        enableWatermark: true,
        watermarkConfig: {
          text: "Confidential",
          color: "#000000",
          opacity: 0.5,
        },
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      const link = await t.query(api.links.getById, { id: linkId });
      expect(link?.name).toBe("VIP Link");
      expect(link?.emailProtected).toBe(false);
      expect(link?.allowDownload).toBe(true);
      expect(link?.password).toBe("secret123");
      expect(link?.allowList).toEqual(["vip@company.com", "@trusted.com"]);
      expect(link?.enableWatermark).toBe(true);
      expect(link?.watermarkConfig).toEqual({
        text: "Confidential",
        color: "#000000",
        opacity: 0.5,
      });
    });
  });

  describe("queries", () => {
    it("should get link by URL", async () => {
      const t = convexTest(schema);
      const teamId = await createTestTeam(t);
      const docId = await createTestDocument(t, teamId);

      await t.mutation(api.links.create, {
        documentId: docId,
        teamId,
        url: "https://papermark.io/view/unique-url",
      });

      const link = await t.query(api.links.getByUrl, {
        url: "https://papermark.io/view/unique-url",
      });

      expect(link).toBeDefined();
      expect(link?.documentId).toBe(docId);
    });

    it("should get links by document", async () => {
      const t = convexTest(schema);
      const teamId = await createTestTeam(t);
      const docId = await createTestDocument(t, teamId);

      await t.mutation(api.links.create, {
        documentId: docId,
        teamId,
        url: "https://papermark.io/view/link1",
      });

      await t.mutation(api.links.create, {
        documentId: docId,
        teamId,
        url: "https://papermark.io/view/link2",
        isArchived: true,
      });

      // Without archived
      const activeLinks = await t.query(api.links.getByDocument, {
        documentId: docId,
      });
      expect(activeLinks).toHaveLength(1);

      // With archived
      const allLinks = await t.query(api.links.getByDocument, {
        documentId: docId,
        includeArchived: true,
      });
      expect(allLinks).toHaveLength(2);
    });

    it("should get link with document details", async () => {
      const t = convexTest(schema);
      const teamId = await createTestTeam(t);
      const docId = await createTestDocument(t, teamId);

      const linkId = await t.mutation(api.links.create, {
        documentId: docId,
        teamId,
      });

      const linkWithDoc = await t.query(api.links.getLinkWithDocument, {
        id: linkId,
      });

      expect(linkWithDoc?.document).toBeDefined();
      expect(linkWithDoc?.document?.name).toBe("Test Document");
    });
  });

  describe("update", () => {
    it("should update link settings", async () => {
      const t = convexTest(schema);
      const teamId = await createTestTeam(t);
      const docId = await createTestDocument(t, teamId);

      const linkId = await t.mutation(api.links.create, {
        documentId: docId,
        teamId,
      });

      await t.mutation(api.links.update, {
        id: linkId,
        name: "Updated Link",
        allowDownload: true,
        enableScreenshotProtection: true,
      });

      const link = await t.query(api.links.getById, { id: linkId });
      expect(link?.name).toBe("Updated Link");
      expect(link?.allowDownload).toBe(true);
      expect(link?.enableScreenshotProtection).toBe(true);
    });
  });

  describe("archive and delete", () => {
    it("should archive link", async () => {
      const t = convexTest(schema);
      const teamId = await createTestTeam(t);
      const docId = await createTestDocument(t, teamId);

      const linkId = await t.mutation(api.links.create, {
        documentId: docId,
        teamId,
      });

      await t.mutation(api.links.archive, { id: linkId });

      const link = await t.query(api.links.getById, { id: linkId });
      expect(link?.isArchived).toBe(true);
    });

    it("should soft delete link", async () => {
      const t = convexTest(schema);
      const teamId = await createTestTeam(t);
      const docId = await createTestDocument(t, teamId);

      const linkId = await t.mutation(api.links.create, {
        documentId: docId,
        teamId,
      });

      await t.mutation(api.links.softDelete, { id: linkId });

      const link = await t.query(api.links.getById, { id: linkId });
      expect(link?.deletedAt).toBeDefined();
    });

    it("should hard delete link", async () => {
      const t = convexTest(schema);
      const teamId = await createTestTeam(t);
      const docId = await createTestDocument(t, teamId);

      const linkId = await t.mutation(api.links.create, {
        documentId: docId,
        teamId,
      });

      await t.mutation(api.links.remove, { id: linkId });

      const link = await t.query(api.links.getById, { id: linkId });
      expect(link).toBeNull();
    });
  });

  describe("custom fields", () => {
    it("should create custom fields for link", async () => {
      const t = convexTest(schema);
      const teamId = await createTestTeam(t);
      const docId = await createTestDocument(t, teamId);

      const linkId = await t.mutation(api.links.create, {
        documentId: docId,
        teamId,
      });

      await t.mutation(api.links.createCustomField, {
        linkId,
        type: "SHORT_TEXT",
        identifier: "company",
        label: "Company Name",
        required: true,
      });

      await t.mutation(api.links.createCustomField, {
        linkId,
        type: "PHONE_NUMBER",
        identifier: "phone",
        label: "Phone Number",
        required: false,
      });

      const customFields = await t.query(api.links.getLinkCustomFields, {
        linkId,
      });

      expect(customFields).toHaveLength(2);
      expect(customFields[0].type).toBe("SHORT_TEXT");
      expect(customFields[0].required).toBe(true);
    });
  });

  describe("feedback", () => {
    it("should create feedback for link", async () => {
      const t = convexTest(schema);
      const teamId = await createTestTeam(t);
      const docId = await createTestDocument(t, teamId);

      const linkId = await t.mutation(api.links.create, {
        documentId: docId,
        teamId,
        enableQuestion: true,
      });

      await t.mutation(api.links.createFeedback, {
        linkId,
        data: {
          question: "Was this document helpful?",
          type: "yes/no",
          options: ["Yes", "No"],
        },
      });

      const feedback = await t.query(api.links.getLinkFeedback, { linkId });
      expect(feedback).toBeDefined();
      expect(feedback?.data.question).toBe("Was this document helpful?");
    });
  });

  describe("link presets", () => {
    it("should create and retrieve link presets", async () => {
      const t = convexTest(schema);
      const teamId = await createTestTeam(t);

      await t.mutation(api.links.createLinkPreset, {
        name: "Default Preset",
        teamId,
        emailProtected: true,
        allowDownload: false,
        enableWatermark: true,
        watermarkConfig: { text: "{{email}}" },
        isDefault: true,
      });

      const presets = await t.query(api.teams.getTeamLinkPresets, { teamId });
      expect(presets).toHaveLength(1);
      expect(presets[0].name).toBe("Default Preset");
      expect(presets[0].isDefault).toBe(true);
    });
  });
});
