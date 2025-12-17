import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

describe("documents", () => {
  const createTestTeam = async (t: any) => {
    return await t.mutation(api.teams.create, {
      name: "Test Team",
    });
  };

  describe("create", () => {
    it("should create a new document", async () => {
      const t = convexTest(schema);
      const teamId = await createTestTeam(t);

      const docId = await t.mutation(api.documents.create, {
        name: "Test Document",
        file: "https://storage.example.com/doc.pdf",
        teamId,
        type: "pdf",
        contentType: "application/pdf",
      });

      expect(docId).toBeDefined();

      const doc = await t.query(api.documents.getById, { id: docId });
      expect(doc).toBeDefined();
      expect(doc?.name).toBe("Test Document");
      expect(doc?.type).toBe("pdf");
      expect(doc?.storageType).toBe("VERCEL_BLOB");
      expect(doc?.assistantEnabled).toBe(false);
      expect(doc?.downloadOnly).toBe(false);
    });

    it("should create document with all options", async () => {
      const t = convexTest(schema);
      const teamId = await createTestTeam(t);

      const docId = await t.mutation(api.documents.create, {
        name: "Full Document",
        description: "A document with all options",
        file: "https://storage.example.com/full.pdf",
        originalFile: "https://storage.example.com/full.pptx",
        teamId,
        type: "pdf",
        contentType: "application/pdf",
        storageType: "S3_PATH",
        numPages: 10,
        assistantEnabled: true,
        advancedExcelEnabled: false,
        agentsEnabled: true,
        downloadOnly: true,
      });

      const doc = await t.query(api.documents.getById, { id: docId });
      expect(doc?.description).toBe("A document with all options");
      expect(doc?.originalFile).toBe("https://storage.example.com/full.pptx");
      expect(doc?.storageType).toBe("S3_PATH");
      expect(doc?.numPages).toBe(10);
      expect(doc?.assistantEnabled).toBe(true);
      expect(doc?.agentsEnabled).toBe(true);
      expect(doc?.downloadOnly).toBe(true);
    });
  });

  describe("versions", () => {
    it("should create document version", async () => {
      const t = convexTest(schema);
      const teamId = await createTestTeam(t);

      const docId = await t.mutation(api.documents.create, {
        name: "Versioned Doc",
        file: "https://storage.example.com/v1.pdf",
        teamId,
      });

      const versionId = await t.mutation(api.documents.createVersion, {
        documentId: docId,
        versionNumber: 1,
        file: "https://storage.example.com/v1.pdf",
        isPrimary: true,
        numPages: 5,
      });

      const version = await t.query(api.documents.getPrimaryVersion, {
        documentId: docId,
      });

      expect(version).toBeDefined();
      expect(version?.versionNumber).toBe(1);
      expect(version?.isPrimary).toBe(true);
    });

    it("should handle multiple versions", async () => {
      const t = convexTest(schema);
      const teamId = await createTestTeam(t);

      const docId = await t.mutation(api.documents.create, {
        name: "Multi Version Doc",
        file: "https://storage.example.com/mv.pdf",
        teamId,
      });

      await t.mutation(api.documents.createVersion, {
        documentId: docId,
        versionNumber: 1,
        file: "https://storage.example.com/v1.pdf",
        isPrimary: true,
      });

      await t.mutation(api.documents.createVersion, {
        documentId: docId,
        versionNumber: 2,
        file: "https://storage.example.com/v2.pdf",
        isPrimary: true,
      });

      const versions = await t.query(api.documents.getVersions, {
        documentId: docId,
      });

      expect(versions).toHaveLength(2);

      // Only version 2 should be primary now
      const v1 = versions.find((v) => v.versionNumber === 1);
      const v2 = versions.find((v) => v.versionNumber === 2);
      expect(v1?.isPrimary).toBe(false);
      expect(v2?.isPrimary).toBe(true);
    });
  });

  describe("pages", () => {
    it("should create and retrieve pages", async () => {
      const t = convexTest(schema);
      const teamId = await createTestTeam(t);

      const docId = await t.mutation(api.documents.create, {
        name: "Paged Doc",
        file: "https://storage.example.com/paged.pdf",
        teamId,
      });

      const versionId = await t.mutation(api.documents.createVersion, {
        documentId: docId,
        versionNumber: 1,
        file: "https://storage.example.com/paged.pdf",
        isPrimary: true,
        hasPages: true,
      });

      await t.mutation(api.documents.createPage, {
        versionId,
        pageNumber: 1,
        file: "https://storage.example.com/page1.png",
        embeddedLinks: ["https://link1.com", "https://link2.com"],
      });

      await t.mutation(api.documents.createPage, {
        versionId,
        pageNumber: 2,
        file: "https://storage.example.com/page2.png",
      });

      const pages = await t.query(api.documents.getVersionPages, { versionId });
      expect(pages).toHaveLength(2);
      expect(pages[0].embeddedLinks).toHaveLength(2);
    });
  });

  describe("folders", () => {
    it("should create folder and assign documents", async () => {
      const t = convexTest(schema);
      const teamId = await createTestTeam(t);

      const folderId = await t.mutation(api.documents.createFolder, {
        name: "My Folder",
        path: "/my-folder",
        teamId,
      });

      const docId = await t.mutation(api.documents.create, {
        name: "Folder Doc",
        file: "https://storage.example.com/folder.pdf",
        teamId,
        folderId,
      });

      const doc = await t.query(api.documents.getById, { id: docId });
      expect(doc?.folderId).toBe(folderId);

      const docsInFolder = await t.query(api.documents.getByTeam, {
        teamId,
        folderId,
      });
      expect(docsInFolder).toHaveLength(1);
    });

    it("should handle nested folders", async () => {
      const t = convexTest(schema);
      const teamId = await createTestTeam(t);

      const parentId = await t.mutation(api.documents.createFolder, {
        name: "Parent",
        path: "/parent",
        teamId,
      });

      const childId = await t.mutation(api.documents.createFolder, {
        name: "Child",
        path: "/parent/child",
        teamId,
        parentId,
      });

      const childFolder = await t.query(api.documents.getFolderById, {
        id: childId,
      });
      expect(childFolder?.parentId).toBe(parentId);
    });
  });

  describe("annotations", () => {
    it("should create and retrieve annotations", async () => {
      const t = convexTest(schema);
      const teamId = await createTestTeam(t);

      const userId = await t.mutation(api.users.create, {
        name: "Annotator",
        email: "annotator@example.com",
      });

      const docId = await t.mutation(api.documents.create, {
        name: "Annotated Doc",
        file: "https://storage.example.com/annotated.pdf",
        teamId,
      });

      const annotationId = await t.mutation(api.documents.createAnnotation, {
        title: "Important Note",
        content: { type: "doc", content: [{ type: "paragraph", content: [] }] },
        pages: [1, 2],
        documentId: docId,
        teamId,
        createdById: userId,
      });

      const annotations = await t.query(api.documents.getDocumentAnnotations, {
        documentId: docId,
      });

      expect(annotations).toHaveLength(1);
      expect(annotations[0].title).toBe("Important Note");
      expect(annotations[0].pages).toEqual([1, 2]);
    });
  });

  describe("search", () => {
    it("should search documents by name", async () => {
      const t = convexTest(schema);
      const teamId = await createTestTeam(t);

      await t.mutation(api.documents.create, {
        name: "Sales Report Q1",
        file: "https://storage.example.com/sales1.pdf",
        teamId,
      });

      await t.mutation(api.documents.create, {
        name: "Marketing Plan",
        file: "https://storage.example.com/marketing.pdf",
        teamId,
      });

      await t.mutation(api.documents.create, {
        name: "Sales Report Q2",
        file: "https://storage.example.com/sales2.pdf",
        teamId,
      });

      const results = await t.query(api.documents.searchByName, {
        teamId,
        name: "Sales",
      });

      expect(results).toHaveLength(2);
    });
  });

  describe("delete", () => {
    it("should delete document and all related data", async () => {
      const t = convexTest(schema);
      const teamId = await createTestTeam(t);

      const docId = await t.mutation(api.documents.create, {
        name: "Delete Me",
        file: "https://storage.example.com/delete.pdf",
        teamId,
      });

      const versionId = await t.mutation(api.documents.createVersion, {
        documentId: docId,
        versionNumber: 1,
        file: "https://storage.example.com/delete.pdf",
        isPrimary: true,
      });

      await t.mutation(api.documents.createPage, {
        versionId,
        pageNumber: 1,
        file: "https://storage.example.com/page1.png",
      });

      await t.mutation(api.documents.remove, { id: docId });

      const doc = await t.query(api.documents.getById, { id: docId });
      expect(doc).toBeNull();

      const versions = await t.query(api.documents.getVersions, {
        documentId: docId,
      });
      expect(versions).toHaveLength(0);
    });
  });
});
