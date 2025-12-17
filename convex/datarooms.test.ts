import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

describe("datarooms", () => {
  const setupTestData = async (t: any) => {
    const teamId = await t.mutation(api.teams.create, {
      name: "Test Team",
    });

    const docId = await t.mutation(api.documents.create, {
      name: "Test Document",
      file: "https://storage.example.com/doc.pdf",
      teamId,
    });

    return { teamId, docId };
  };

  describe("create", () => {
    it("should create a new dataroom with default settings", async () => {
      const t = convexTest(schema);
      const { teamId } = await setupTestData(t);

      const dataroomId = await t.mutation(api.datarooms.create, {
        pId: "dr_test123",
        name: "Test Dataroom",
        teamId,
      });

      expect(dataroomId).toBeDefined();

      const dataroom = await t.query(api.datarooms.getById, { id: dataroomId });
      expect(dataroom).toBeDefined();
      expect(dataroom?.name).toBe("Test Dataroom");
      expect(dataroom?.pId).toBe("dr_test123");
      expect(dataroom?.conversationsEnabled).toBe(false);
      expect(dataroom?.agentsEnabled).toBe(false);
      expect(dataroom?.allowBulkDownload).toBe(true);
      expect(dataroom?.showLastUpdated).toBe(true);
      expect(dataroom?.defaultPermissionStrategy).toBe("INHERIT_FROM_PARENT");
    });

    it("should create dataroom with custom settings", async () => {
      const t = convexTest(schema);
      const { teamId } = await setupTestData(t);

      const dataroomId = await t.mutation(api.datarooms.create, {
        pId: "dr_custom456",
        name: "Custom Dataroom",
        description: "A custom dataroom",
        teamId,
        conversationsEnabled: true,
        agentsEnabled: true,
        allowBulkDownload: false,
        defaultPermissionStrategy: "ASK_EVERY_TIME",
      });

      const dataroom = await t.query(api.datarooms.getById, { id: dataroomId });
      expect(dataroom?.description).toBe("A custom dataroom");
      expect(dataroom?.conversationsEnabled).toBe(true);
      expect(dataroom?.agentsEnabled).toBe(true);
      expect(dataroom?.allowBulkDownload).toBe(false);
      expect(dataroom?.defaultPermissionStrategy).toBe("ASK_EVERY_TIME");
    });
  });

  describe("queries", () => {
    it("should get dataroom by pId", async () => {
      const t = convexTest(schema);
      const { teamId } = await setupTestData(t);

      await t.mutation(api.datarooms.create, {
        pId: "dr_findme",
        name: "Find Me Dataroom",
        teamId,
      });

      const dataroom = await t.query(api.datarooms.getByPId, {
        pId: "dr_findme",
      });

      expect(dataroom).toBeDefined();
      expect(dataroom?.name).toBe("Find Me Dataroom");
    });

    it("should get datarooms by team", async () => {
      const t = convexTest(schema);
      const { teamId } = await setupTestData(t);

      await t.mutation(api.datarooms.create, {
        pId: "dr_team1",
        name: "Dataroom 1",
        teamId,
      });

      await t.mutation(api.datarooms.create, {
        pId: "dr_team2",
        name: "Dataroom 2",
        teamId,
      });

      const datarooms = await t.query(api.datarooms.getByTeam, { teamId });
      expect(datarooms).toHaveLength(2);
    });

    it("should get dataroom with details", async () => {
      const t = convexTest(schema);
      const { teamId, docId } = await setupTestData(t);

      const dataroomId = await t.mutation(api.datarooms.create, {
        pId: "dr_details",
        name: "Detailed Dataroom",
        teamId,
      });

      await t.mutation(api.datarooms.addDocument, {
        dataroomId,
        documentId: docId,
      });

      await t.mutation(api.datarooms.createBrand, {
        dataroomId,
        logo: "https://example.com/logo.png",
      });

      const dataroomWithDetails = await t.query(
        api.datarooms.getDataroomWithDetails,
        { id: dataroomId }
      );

      expect(dataroomWithDetails?.documents).toHaveLength(1);
      expect(dataroomWithDetails?.brand).toBeDefined();
      expect(dataroomWithDetails?.brand?.logo).toBe(
        "https://example.com/logo.png"
      );
    });
  });

  describe("documents", () => {
    it("should add document to dataroom", async () => {
      const t = convexTest(schema);
      const { teamId, docId } = await setupTestData(t);

      const dataroomId = await t.mutation(api.datarooms.create, {
        pId: "dr_docs",
        name: "Document Dataroom",
        teamId,
      });

      const ddId = await t.mutation(api.datarooms.addDocument, {
        dataroomId,
        documentId: docId,
        orderIndex: 1,
      });

      expect(ddId).toBeDefined();

      const docs = await t.query(api.datarooms.getDataroomDocuments, {
        dataroomId,
      });

      expect(docs).toHaveLength(1);
      expect(docs[0].orderIndex).toBe(1);
      expect(docs[0].document?.name).toBe("Test Document");
    });

    it("should not duplicate document in dataroom", async () => {
      const t = convexTest(schema);
      const { teamId, docId } = await setupTestData(t);

      const dataroomId = await t.mutation(api.datarooms.create, {
        pId: "dr_nodupe",
        name: "No Dupe Dataroom",
        teamId,
      });

      const firstId = await t.mutation(api.datarooms.addDocument, {
        dataroomId,
        documentId: docId,
      });

      const secondId = await t.mutation(api.datarooms.addDocument, {
        dataroomId,
        documentId: docId,
      });

      expect(firstId).toBe(secondId);

      const docs = await t.query(api.datarooms.getDataroomDocuments, {
        dataroomId,
      });
      expect(docs).toHaveLength(1);
    });
  });

  describe("folders", () => {
    it("should create dataroom folders", async () => {
      const t = convexTest(schema);
      const { teamId } = await setupTestData(t);

      const dataroomId = await t.mutation(api.datarooms.create, {
        pId: "dr_folders",
        name: "Folder Dataroom",
        teamId,
      });

      const folderId = await t.mutation(api.datarooms.createFolder, {
        name: "Legal",
        path: "/legal",
        dataroomId,
      });

      const folders = await t.query(api.datarooms.getDataroomFolders, {
        dataroomId,
      });

      expect(folders).toHaveLength(1);
      expect(folders[0].name).toBe("Legal");
      expect(folders[0].path).toBe("/legal");
    });

    it("should create nested folders", async () => {
      const t = convexTest(schema);
      const { teamId } = await setupTestData(t);

      const dataroomId = await t.mutation(api.datarooms.create, {
        pId: "dr_nested",
        name: "Nested Dataroom",
        teamId,
      });

      const parentId = await t.mutation(api.datarooms.createFolder, {
        name: "Financial",
        path: "/financial",
        dataroomId,
      });

      const childId = await t.mutation(api.datarooms.createFolder, {
        name: "Q1 Reports",
        path: "/financial/q1-reports",
        dataroomId,
        parentId,
      });

      const childFolders = await t.query(api.datarooms.getDataroomFolders, {
        dataroomId,
        parentId,
      });

      expect(childFolders).toHaveLength(1);
      expect(childFolders[0].name).toBe("Q1 Reports");
    });
  });

  describe("viewer groups", () => {
    it("should create and manage viewer groups", async () => {
      const t = convexTest(schema);
      const { teamId } = await setupTestData(t);

      const dataroomId = await t.mutation(api.datarooms.create, {
        pId: "dr_groups",
        name: "Group Dataroom",
        teamId,
      });

      const groupId = await t.mutation(api.datarooms.createViewerGroup, {
        name: "Investors",
        dataroomId,
        teamId,
        domains: ["@investor.com", "@vc.com"],
      });

      const groups = await t.query(api.datarooms.getDataroomViewerGroups, {
        dataroomId,
      });

      expect(groups).toHaveLength(1);
      expect(groups[0].name).toBe("Investors");
      expect(groups[0].domains).toContain("@investor.com");
    });

    it("should add viewer to group", async () => {
      const t = convexTest(schema);
      const { teamId } = await setupTestData(t);

      const dataroomId = await t.mutation(api.datarooms.create, {
        pId: "dr_addviewer",
        name: "Add Viewer Dataroom",
        teamId,
      });

      const groupId = await t.mutation(api.datarooms.createViewerGroup, {
        name: "VIPs",
        dataroomId,
        teamId,
      });

      const viewerId = await t.mutation(api.views.createViewer, {
        email: "vip@example.com",
        teamId,
      });

      await t.mutation(api.datarooms.addViewerToGroup, {
        viewerId,
        groupId,
      });

      // Query to verify membership would go here
      // (Would need a getMembershipsByGroup query)
    });

    it("should set access controls for viewer group", async () => {
      const t = convexTest(schema);
      const { teamId, docId } = await setupTestData(t);

      const dataroomId = await t.mutation(api.datarooms.create, {
        pId: "dr_access",
        name: "Access Dataroom",
        teamId,
      });

      const ddId = await t.mutation(api.datarooms.addDocument, {
        dataroomId,
        documentId: docId,
      });

      const groupId = await t.mutation(api.datarooms.createViewerGroup, {
        name: "Limited Access",
        dataroomId,
        teamId,
      });

      await t.mutation(api.datarooms.setViewerGroupAccessControl, {
        groupId,
        itemId: ddId,
        itemType: "DATAROOM_DOCUMENT",
        canView: true,
        canDownload: false,
      });

      // Access controls are set
    });
  });

  describe("permission groups", () => {
    it("should create permission groups", async () => {
      const t = convexTest(schema);
      const { teamId } = await setupTestData(t);

      const dataroomId = await t.mutation(api.datarooms.create, {
        pId: "dr_perms",
        name: "Permission Dataroom",
        teamId,
      });

      await t.mutation(api.datarooms.createPermissionGroup, {
        name: "View Only",
        description: "Can view but not download",
        dataroomId,
        teamId,
      });

      const groups = await t.query(api.datarooms.getDataroomPermissionGroups, {
        dataroomId,
      });

      expect(groups).toHaveLength(1);
      expect(groups[0].name).toBe("View Only");
    });
  });

  describe("brand", () => {
    it("should create and update dataroom brand", async () => {
      const t = convexTest(schema);
      const { teamId } = await setupTestData(t);

      const dataroomId = await t.mutation(api.datarooms.create, {
        pId: "dr_brand",
        name: "Branded Dataroom",
        teamId,
      });

      await t.mutation(api.datarooms.createBrand, {
        dataroomId,
        logo: "https://example.com/logo.png",
        brandColor: "#FF0000",
      });

      let brand = await t.query(api.datarooms.getDataroomBrand, { dataroomId });
      expect(brand?.logo).toBe("https://example.com/logo.png");
      expect(brand?.brandColor).toBe("#FF0000");

      await t.mutation(api.datarooms.updateBrand, {
        dataroomId,
        brandColor: "#00FF00",
        welcomeMessage: "Welcome to our dataroom!",
      });

      brand = await t.query(api.datarooms.getDataroomBrand, { dataroomId });
      expect(brand?.brandColor).toBe("#00FF00");
      expect(brand?.welcomeMessage).toBe("Welcome to our dataroom!");
    });
  });

  describe("delete", () => {
    it("should delete dataroom and all related data", async () => {
      const t = convexTest(schema);
      const { teamId, docId } = await setupTestData(t);

      const dataroomId = await t.mutation(api.datarooms.create, {
        pId: "dr_delete",
        name: "Delete Me Dataroom",
        teamId,
      });

      await t.mutation(api.datarooms.addDocument, {
        dataroomId,
        documentId: docId,
      });

      await t.mutation(api.datarooms.createFolder, {
        name: "Delete Folder",
        path: "/delete",
        dataroomId,
      });

      await t.mutation(api.datarooms.createBrand, {
        dataroomId,
        logo: "https://example.com/logo.png",
      });

      await t.mutation(api.datarooms.remove, { id: dataroomId });

      const dataroom = await t.query(api.datarooms.getById, { id: dataroomId });
      expect(dataroom).toBeNull();

      const docs = await t.query(api.datarooms.getDataroomDocuments, {
        dataroomId,
      });
      expect(docs).toHaveLength(0);
    });
  });
});
