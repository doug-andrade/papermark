import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ==================== DOCUMENT QUERIES ====================

export const getById = query({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getByIdWithVersions = query({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.id);
    if (!document) return null;

    const versions = await ctx.db
      .query("documentVersions")
      .withIndex("by_document", (q) => q.eq("documentId", args.id))
      .collect();

    return { ...document, versions };
  },
});

export const getByTeam = query({
  args: {
    teamId: v.id("teams"),
    folderId: v.optional(v.id("folders")),
  },
  handler: async (ctx, args) => {
    if (args.folderId) {
      return await ctx.db
        .query("documents")
        .withIndex("by_team_folder", (q) =>
          q.eq("teamId", args.teamId).eq("folderId", args.folderId)
        )
        .collect();
    }
    return await ctx.db
      .query("documents")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();
  },
});

export const searchByName = query({
  args: {
    teamId: v.id("teams"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // Convex doesn't have LIKE queries, so we filter in memory
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    return documents.filter((doc) =>
      doc.name.toLowerCase().includes(args.name.toLowerCase())
    );
  },
});

export const getPrimaryVersion = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("documentVersions")
      .withIndex("by_document_primary", (q) =>
        q.eq("documentId", args.documentId).eq("isPrimary", true)
      )
      .first();
  },
});

export const getVersions = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("documentVersions")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .order("desc")
      .collect();
  },
});

export const getVersionPages = query({
  args: { versionId: v.id("documentVersions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("documentPages")
      .withIndex("by_version", (q) => q.eq("versionId", args.versionId))
      .collect();
  },
});

export const getDocumentLinks = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("links")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .collect();
  },
});

export const getDocumentViews = query({
  args: {
    documentId: v.id("documents"),
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (args.includeArchived) {
      return await ctx.db
        .query("views")
        .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
        .collect();
    }
    return await ctx.db
      .query("views")
      .withIndex("by_document_archived", (q) =>
        q.eq("documentId", args.documentId).eq("isArchived", false)
      )
      .collect();
  },
});

export const getDocumentAnnotations = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const annotations = await ctx.db
      .query("documentAnnotations")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .collect();

    // Get images for each annotation
    const annotationsWithImages = await Promise.all(
      annotations.map(async (annotation) => {
        const images = await ctx.db
          .query("annotationImages")
          .withIndex("by_annotation", (q) => q.eq("annotationId", annotation._id))
          .collect();
        return { ...annotation, images };
      })
    );

    return annotationsWithImages;
  },
});

// ==================== DOCUMENT MUTATIONS ====================

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    file: v.string(),
    originalFile: v.optional(v.string()),
    type: v.optional(v.string()),
    contentType: v.optional(v.string()),
    storageType: v.optional(v.string()),
    numPages: v.optional(v.number()),
    teamId: v.id("teams"),
    ownerId: v.optional(v.id("users")),
    folderId: v.optional(v.id("folders")),
    assistantEnabled: v.optional(v.boolean()),
    advancedExcelEnabled: v.optional(v.boolean()),
    agentsEnabled: v.optional(v.boolean()),
    downloadOnly: v.optional(v.boolean()),
    isExternalUpload: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("documents", {
      name: args.name,
      description: args.description,
      file: args.file,
      originalFile: args.originalFile,
      type: args.type,
      contentType: args.contentType,
      storageType: args.storageType ?? "VERCEL_BLOB",
      numPages: args.numPages,
      teamId: args.teamId,
      ownerId: args.ownerId,
      folderId: args.folderId,
      assistantEnabled: args.assistantEnabled ?? false,
      advancedExcelEnabled: args.advancedExcelEnabled ?? false,
      agentsEnabled: args.agentsEnabled ?? false,
      downloadOnly: args.downloadOnly ?? false,
      isExternalUpload: args.isExternalUpload ?? false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("documents"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    file: v.optional(v.string()),
    originalFile: v.optional(v.string()),
    type: v.optional(v.string()),
    contentType: v.optional(v.string()),
    storageType: v.optional(v.string()),
    numPages: v.optional(v.number()),
    ownerId: v.optional(v.id("users")),
    folderId: v.optional(v.id("folders")),
    assistantEnabled: v.optional(v.boolean()),
    advancedExcelEnabled: v.optional(v.boolean()),
    agentsEnabled: v.optional(v.boolean()),
    downloadOnly: v.optional(v.boolean()),
    isExternalUpload: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(id, { ...filteredUpdates, updatedAt: Date.now() });
    return await ctx.db.get(id);
  },
});

export const remove = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    // Delete versions and their pages
    const versions = await ctx.db
      .query("documentVersions")
      .withIndex("by_document", (q) => q.eq("documentId", args.id))
      .collect();

    for (const version of versions) {
      const pages = await ctx.db
        .query("documentPages")
        .withIndex("by_version", (q) => q.eq("versionId", version._id))
        .collect();
      await Promise.all(pages.map((p) => ctx.db.delete(p._id)));
      await ctx.db.delete(version._id);
    }

    // Delete links
    const links = await ctx.db
      .query("links")
      .withIndex("by_document", (q) => q.eq("documentId", args.id))
      .collect();
    await Promise.all(links.map((l) => ctx.db.delete(l._id)));

    // Delete document
    await ctx.db.delete(args.id);
  },
});

// ==================== DOCUMENT VERSION MUTATIONS ====================

export const createVersion = mutation({
  args: {
    documentId: v.id("documents"),
    versionNumber: v.number(),
    file: v.string(),
    originalFile: v.optional(v.string()),
    type: v.optional(v.string()),
    contentType: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    storageType: v.optional(v.string()),
    numPages: v.optional(v.number()),
    isPrimary: v.optional(v.boolean()),
    isVertical: v.optional(v.boolean()),
    hasPages: v.optional(v.boolean()),
    length: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // If this is primary, unset other primary versions
    if (args.isPrimary) {
      const existingPrimary = await ctx.db
        .query("documentVersions")
        .withIndex("by_document_primary", (q) =>
          q.eq("documentId", args.documentId).eq("isPrimary", true)
        )
        .collect();

      await Promise.all(
        existingPrimary.map((v) => ctx.db.patch(v._id, { isPrimary: false }))
      );
    }

    return await ctx.db.insert("documentVersions", {
      documentId: args.documentId,
      versionNumber: args.versionNumber,
      file: args.file,
      originalFile: args.originalFile,
      type: args.type,
      contentType: args.contentType,
      fileSize: args.fileSize,
      storageType: args.storageType ?? "VERCEL_BLOB",
      numPages: args.numPages,
      isPrimary: args.isPrimary ?? false,
      isVertical: args.isVertical ?? false,
      hasPages: args.hasPages ?? false,
      length: args.length,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateVersion = mutation({
  args: {
    id: v.id("documentVersions"),
    file: v.optional(v.string()),
    originalFile: v.optional(v.string()),
    type: v.optional(v.string()),
    contentType: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    numPages: v.optional(v.number()),
    isPrimary: v.optional(v.boolean()),
    isVertical: v.optional(v.boolean()),
    fileId: v.optional(v.string()),
    vectorStoreFileId: v.optional(v.string()),
    hasPages: v.optional(v.boolean()),
    length: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    // If setting as primary, unset other primary versions
    if (args.isPrimary) {
      const version = await ctx.db.get(id);
      if (version) {
        const existingPrimary = await ctx.db
          .query("documentVersions")
          .withIndex("by_document_primary", (q) =>
            q.eq("documentId", version.documentId).eq("isPrimary", true)
          )
          .collect();

        await Promise.all(
          existingPrimary
            .filter((v) => v._id !== id)
            .map((v) => ctx.db.patch(v._id, { isPrimary: false }))
        );
      }
    }

    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(id, { ...filteredUpdates, updatedAt: Date.now() });
    return await ctx.db.get(id);
  },
});

export const deleteVersion = mutation({
  args: { id: v.id("documentVersions") },
  handler: async (ctx, args) => {
    // Delete pages
    const pages = await ctx.db
      .query("documentPages")
      .withIndex("by_version", (q) => q.eq("versionId", args.id))
      .collect();
    await Promise.all(pages.map((p) => ctx.db.delete(p._id)));

    await ctx.db.delete(args.id);
  },
});

// ==================== DOCUMENT PAGE MUTATIONS ====================

export const createPage = mutation({
  args: {
    versionId: v.id("documentVersions"),
    pageNumber: v.number(),
    file: v.string(),
    embeddedLinks: v.optional(v.array(v.string())),
    pageLinks: v.optional(v.any()),
    metadata: v.optional(v.any()),
    storageType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("documentPages", {
      versionId: args.versionId,
      pageNumber: args.pageNumber,
      file: args.file,
      embeddedLinks: args.embeddedLinks ?? [],
      pageLinks: args.pageLinks,
      metadata: args.metadata,
      storageType: args.storageType ?? "VERCEL_BLOB",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updatePage = mutation({
  args: {
    id: v.id("documentPages"),
    file: v.optional(v.string()),
    embeddedLinks: v.optional(v.array(v.string())),
    pageLinks: v.optional(v.any()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(id, { ...filteredUpdates, updatedAt: Date.now() });
    return await ctx.db.get(id);
  },
});

export const deletePage = mutation({
  args: { id: v.id("documentPages") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ==================== FOLDER MUTATIONS ====================

export const createFolder = mutation({
  args: {
    name: v.string(),
    path: v.string(),
    teamId: v.id("teams"),
    parentId: v.optional(v.id("folders")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("folders", {
      name: args.name,
      path: args.path,
      teamId: args.teamId,
      parentId: args.parentId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateFolder = mutation({
  args: {
    id: v.id("folders"),
    name: v.optional(v.string()),
    path: v.optional(v.string()),
    parentId: v.optional(v.id("folders")),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(id, { ...filteredUpdates, updatedAt: Date.now() });
    return await ctx.db.get(id);
  },
});

export const deleteFolder = mutation({
  args: { id: v.id("folders") },
  handler: async (ctx, args) => {
    // Update documents to have null folderId
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_folder", (q) => q.eq("folderId", args.id))
      .collect();
    await Promise.all(
      documents.map((d) => ctx.db.patch(d._id, { folderId: undefined }))
    );

    // Delete child folders recursively
    const childFolders = await ctx.db
      .query("folders")
      .withIndex("by_parent", (q) => q.eq("parentId", args.id))
      .collect();
    for (const child of childFolders) {
      await ctx.runMutation(ctx.api?.documents?.deleteFolder, { id: child._id });
    }

    await ctx.db.delete(args.id);
  },
});

export const getFolderById = query({
  args: { id: v.id("folders") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getFoldersByTeam = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("folders")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();
  },
});

export const getFolderByPath = query({
  args: {
    teamId: v.id("teams"),
    path: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("folders")
      .withIndex("by_team_path", (q) =>
        q.eq("teamId", args.teamId).eq("path", args.path)
      )
      .unique();
  },
});

// ==================== ANNOTATION MUTATIONS ====================

export const createAnnotation = mutation({
  args: {
    title: v.string(),
    content: v.any(),
    pages: v.array(v.number()),
    documentId: v.id("documents"),
    teamId: v.id("teams"),
    createdById: v.id("users"),
    isVisible: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("documentAnnotations", {
      title: args.title,
      content: args.content,
      pages: args.pages,
      documentId: args.documentId,
      teamId: args.teamId,
      createdById: args.createdById,
      isVisible: args.isVisible ?? true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateAnnotation = mutation({
  args: {
    id: v.id("documentAnnotations"),
    title: v.optional(v.string()),
    content: v.optional(v.any()),
    pages: v.optional(v.array(v.number())),
    isVisible: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(id, { ...filteredUpdates, updatedAt: Date.now() });
    return await ctx.db.get(id);
  },
});

export const deleteAnnotation = mutation({
  args: { id: v.id("documentAnnotations") },
  handler: async (ctx, args) => {
    // Delete images
    const images = await ctx.db
      .query("annotationImages")
      .withIndex("by_annotation", (q) => q.eq("annotationId", args.id))
      .collect();
    await Promise.all(images.map((i) => ctx.db.delete(i._id)));

    await ctx.db.delete(args.id);
  },
});

export const addAnnotationImage = mutation({
  args: {
    annotationId: v.id("documentAnnotations"),
    filename: v.string(),
    url: v.string(),
    size: v.optional(v.number()),
    mimeType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("annotationImages", {
      annotationId: args.annotationId,
      filename: args.filename,
      url: args.url,
      size: args.size,
      mimeType: args.mimeType,
      createdAt: Date.now(),
    });
  },
});

export const deleteAnnotationImage = mutation({
  args: { id: v.id("annotationImages") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
