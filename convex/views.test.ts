import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

describe("views", () => {
  const setupTestData = async (t: any) => {
    const teamId = await t.mutation(api.teams.create, {
      name: "Test Team",
    });

    const docId = await t.mutation(api.documents.create, {
      name: "Test Document",
      file: "https://storage.example.com/doc.pdf",
      teamId,
    });

    const linkId = await t.mutation(api.links.create, {
      documentId: docId,
      teamId,
    });

    return { teamId, docId, linkId };
  };

  describe("create", () => {
    it("should create a new view", async () => {
      const t = convexTest(schema);
      const { teamId, docId, linkId } = await setupTestData(t);

      const viewId = await t.mutation(api.views.create, {
        linkId,
        documentId: docId,
        teamId,
        viewerEmail: "viewer@example.com",
        viewerName: "John Doe",
      });

      expect(viewId).toBeDefined();

      const view = await t.query(api.views.getById, { id: viewId });
      expect(view).toBeDefined();
      expect(view?.viewerEmail).toBe("viewer@example.com");
      expect(view?.viewerName).toBe("John Doe");
      expect(view?.viewType).toBe("DOCUMENT_VIEW");
      expect(view?.verified).toBe(false);
      expect(view?.isArchived).toBe(false);
    });

    it("should create verified view", async () => {
      const t = convexTest(schema);
      const { teamId, docId, linkId } = await setupTestData(t);

      const viewId = await t.mutation(api.views.create, {
        linkId,
        documentId: docId,
        teamId,
        viewerEmail: "verified@example.com",
        verified: true,
      });

      const view = await t.query(api.views.getById, { id: viewId });
      expect(view?.verified).toBe(true);
    });
  });

  describe("queries", () => {
    it("should get views by document", async () => {
      const t = convexTest(schema);
      const { teamId, docId, linkId } = await setupTestData(t);

      await t.mutation(api.views.create, {
        linkId,
        documentId: docId,
        teamId,
        viewerEmail: "viewer1@example.com",
      });

      await t.mutation(api.views.create, {
        linkId,
        documentId: docId,
        teamId,
        viewerEmail: "viewer2@example.com",
      });

      await t.mutation(api.views.create, {
        linkId,
        documentId: docId,
        teamId,
        viewerEmail: "archived@example.com",
        isArchived: true,
      });

      // Without archived
      const activeViews = await t.query(api.views.getByDocument, {
        documentId: docId,
      });
      expect(activeViews).toHaveLength(2);

      // With archived
      const allViews = await t.query(api.views.getByDocument, {
        documentId: docId,
        includeArchived: true,
      });
      expect(allViews).toHaveLength(3);
    });

    it("should get views by viewer email", async () => {
      const t = convexTest(schema);
      const { teamId, docId, linkId } = await setupTestData(t);

      await t.mutation(api.views.create, {
        linkId,
        documentId: docId,
        teamId,
        viewerEmail: "repeat@example.com",
      });

      await t.mutation(api.views.create, {
        linkId,
        documentId: docId,
        teamId,
        viewerEmail: "repeat@example.com",
      });

      const views = await t.query(api.views.getByViewerEmail, {
        viewerEmail: "repeat@example.com",
      });

      expect(views).toHaveLength(2);
    });

    it("should get view with details", async () => {
      const t = convexTest(schema);
      const { teamId, docId, linkId } = await setupTestData(t);

      const viewId = await t.mutation(api.views.create, {
        linkId,
        documentId: docId,
        teamId,
        viewerEmail: "detailed@example.com",
      });

      const viewWithDetails = await t.query(api.views.getViewWithDetails, {
        id: viewId,
      });

      expect(viewWithDetails?.link).toBeDefined();
      expect(viewWithDetails?.document).toBeDefined();
      expect(viewWithDetails?.reactions).toEqual([]);
    });
  });

  describe("update", () => {
    it("should update view fields", async () => {
      const t = convexTest(schema);
      const { teamId, docId, linkId } = await setupTestData(t);

      const viewId = await t.mutation(api.views.create, {
        linkId,
        documentId: docId,
        teamId,
        viewerEmail: "update@example.com",
      });

      await t.mutation(api.views.update, {
        id: viewId,
        verified: true,
        viewerName: "Updated Name",
      });

      const view = await t.query(api.views.getById, { id: viewId });
      expect(view?.verified).toBe(true);
      expect(view?.viewerName).toBe("Updated Name");
    });

    it("should mark view as downloaded", async () => {
      const t = convexTest(schema);
      const { teamId, docId, linkId } = await setupTestData(t);

      const viewId = await t.mutation(api.views.create, {
        linkId,
        documentId: docId,
        teamId,
        viewerEmail: "download@example.com",
      });

      await t.mutation(api.views.markDownloaded, {
        id: viewId,
        downloadType: "SINGLE",
      });

      const view = await t.query(api.views.getById, { id: viewId });
      expect(view?.downloadedAt).toBeDefined();
      expect(view?.downloadType).toBe("SINGLE");
    });
  });

  describe("archive", () => {
    it("should archive and unarchive view", async () => {
      const t = convexTest(schema);
      const { teamId, docId, linkId } = await setupTestData(t);

      const viewId = await t.mutation(api.views.create, {
        linkId,
        documentId: docId,
        teamId,
        viewerEmail: "archive@example.com",
      });

      await t.mutation(api.views.archive, { id: viewId });

      let view = await t.query(api.views.getById, { id: viewId });
      expect(view?.isArchived).toBe(true);

      await t.mutation(api.views.unarchive, { id: viewId });

      view = await t.query(api.views.getById, { id: viewId });
      expect(view?.isArchived).toBe(false);
    });
  });

  describe("reactions", () => {
    it("should add and remove reactions", async () => {
      const t = convexTest(schema);
      const { teamId, docId, linkId } = await setupTestData(t);

      const viewId = await t.mutation(api.views.create, {
        linkId,
        documentId: docId,
        teamId,
        viewerEmail: "reaction@example.com",
      });

      const reactionId = await t.mutation(api.views.addReaction, {
        viewId,
        pageNumber: 1,
        type: "like",
      });

      let reactions = await t.query(api.views.getViewReactions, { viewId });
      expect(reactions).toHaveLength(1);
      expect(reactions[0].type).toBe("like");
      expect(reactions[0].pageNumber).toBe(1);

      await t.mutation(api.views.removeReaction, { id: reactionId });

      reactions = await t.query(api.views.getViewReactions, { viewId });
      expect(reactions).toHaveLength(0);
    });
  });

  describe("viewers", () => {
    it("should create and manage viewers", async () => {
      const t = convexTest(schema);
      const teamId = await t.mutation(api.teams.create, {
        name: "Viewer Team",
      });

      const viewerId = await t.mutation(api.views.createViewer, {
        email: "newviewer@example.com",
        teamId,
      });

      const viewer = await t.query(api.views.getViewerById, { id: viewerId });
      expect(viewer?.email).toBe("newviewer@example.com");
      expect(viewer?.verified).toBe(false);

      // Update viewer
      await t.mutation(api.views.updateViewer, {
        id: viewerId,
        verified: true,
        invitedAt: Date.now(),
      });

      const updatedViewer = await t.query(api.views.getViewerById, {
        id: viewerId,
      });
      expect(updatedViewer?.verified).toBe(true);
      expect(updatedViewer?.invitedAt).toBeDefined();
    });

    it("should not duplicate viewers", async () => {
      const t = convexTest(schema);
      const teamId = await t.mutation(api.teams.create, {
        name: "Dupe Viewer Team",
      });

      const firstId = await t.mutation(api.views.createViewer, {
        email: "dupe@example.com",
        teamId,
      });

      const secondId = await t.mutation(api.views.createViewer, {
        email: "dupe@example.com",
        teamId,
      });

      expect(firstId).toBe(secondId);
    });

    it("should get viewers by team", async () => {
      const t = convexTest(schema);
      const teamId = await t.mutation(api.teams.create, {
        name: "Team Viewers",
      });

      await t.mutation(api.views.createViewer, {
        email: "v1@example.com",
        teamId,
      });

      await t.mutation(api.views.createViewer, {
        email: "v2@example.com",
        teamId,
      });

      const viewers = await t.query(api.views.getViewersByTeam, { teamId });
      expect(viewers).toHaveLength(2);
    });
  });

  describe("agreements", () => {
    it("should create and manage agreements", async () => {
      const t = convexTest(schema);
      const teamId = await t.mutation(api.teams.create, {
        name: "Agreement Team",
      });

      const agreementId = await t.mutation(api.views.createAgreement, {
        name: "Terms of Service",
        content: "https://example.com/tos.pdf",
        contentType: "LINK",
        teamId,
        requireName: true,
      });

      const agreements = await t.query(api.teams.getTeamAgreements, { teamId });
      expect(agreements).toHaveLength(1);
      expect(agreements[0].name).toBe("Terms of Service");

      // Update
      await t.mutation(api.views.updateAgreement, {
        id: agreementId,
        content: "https://example.com/updated-tos.pdf",
      });

      const updated = await t.query(api.teams.getTeamAgreements, { teamId });
      expect(updated[0].content).toBe("https://example.com/updated-tos.pdf");
    });

    it("should soft delete agreement", async () => {
      const t = convexTest(schema);
      const teamId = await t.mutation(api.teams.create, {
        name: "Delete Agreement Team",
      });

      const agreementId = await t.mutation(api.views.createAgreement, {
        name: "Delete Me",
        content: "Delete content",
        teamId,
      });

      await t.mutation(api.views.softDeleteAgreement, {
        id: agreementId,
        deletedBy: "admin@example.com",
      });

      const agreements = await t.query(api.teams.getTeamAgreements, { teamId });
      expect(agreements[0].deletedAt).toBeDefined();
      expect(agreements[0].deletedBy).toBe("admin@example.com");
    });
  });
});
