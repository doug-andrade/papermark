import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ==================== DATAROOM QUERIES ====================

export const getById = query({
  args: { id: v.id("datarooms") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getByPId = query({
  args: { pId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("datarooms")
      .withIndex("by_pid", (q) => q.eq("pId", args.pId))
      .unique();
  },
});

export const getByTeam = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("datarooms")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();
  },
});

export const getDataroomWithDetails = query({
  args: { id: v.id("datarooms") },
  handler: async (ctx, args) => {
    const dataroom = await ctx.db.get(args.id);
    if (!dataroom) return null;

    const [documents, folders, brand, viewerGroups] = await Promise.all([
      ctx.db
        .query("dataroomDocuments")
        .withIndex("by_dataroom", (q) => q.eq("dataroomId", args.id))
        .collect(),
      ctx.db
        .query("dataroomFolders")
        .withIndex("by_dataroom", (q) => q.eq("dataroomId", args.id))
        .collect(),
      ctx.db
        .query("dataroomBrands")
        .withIndex("by_dataroom", (q) => q.eq("dataroomId", args.id))
        .unique(),
      ctx.db
        .query("viewerGroups")
        .withIndex("by_dataroom", (q) => q.eq("dataroomId", args.id))
        .collect(),
    ]);

    // Get full document details
    const documentsWithDetails = await Promise.all(
      documents.map(async (dd) => {
        const document = await ctx.db.get(dd.documentId);
        return { ...dd, document };
      })
    );

    return {
      ...dataroom,
      documents: documentsWithDetails,
      folders,
      brand,
      viewerGroups,
    };
  },
});

export const getDataroomDocuments = query({
  args: {
    dataroomId: v.id("datarooms"),
    folderId: v.optional(v.id("dataroomFolders")),
  },
  handler: async (ctx, args) => {
    let documents;

    if (args.folderId) {
      documents = await ctx.db
        .query("dataroomDocuments")
        .withIndex("by_folder", (q) => q.eq("folderId", args.folderId))
        .collect();
    } else {
      documents = await ctx.db
        .query("dataroomDocuments")
        .withIndex("by_dataroom", (q) => q.eq("dataroomId", args.dataroomId))
        .collect();
    }

    // Get full document details
    const documentsWithDetails = await Promise.all(
      documents.map(async (dd) => {
        const document = await ctx.db.get(dd.documentId);
        return { ...dd, document };
      })
    );

    return documentsWithDetails;
  },
});

export const getDataroomFolders = query({
  args: {
    dataroomId: v.id("datarooms"),
    parentId: v.optional(v.id("dataroomFolders")),
  },
  handler: async (ctx, args) => {
    if (args.parentId) {
      return await ctx.db
        .query("dataroomFolders")
        .withIndex("by_parent", (q) => q.eq("parentId", args.parentId))
        .collect();
    }
    return await ctx.db
      .query("dataroomFolders")
      .withIndex("by_dataroom", (q) => q.eq("dataroomId", args.dataroomId))
      .collect();
  },
});

export const getDataroomBrand = query({
  args: { dataroomId: v.id("datarooms") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("dataroomBrands")
      .withIndex("by_dataroom", (q) => q.eq("dataroomId", args.dataroomId))
      .unique();
  },
});

export const getDataroomViewerGroups = query({
  args: { dataroomId: v.id("datarooms") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("viewerGroups")
      .withIndex("by_dataroom", (q) => q.eq("dataroomId", args.dataroomId))
      .collect();
  },
});

export const getDataroomPermissionGroups = query({
  args: { dataroomId: v.id("datarooms") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("permissionGroups")
      .withIndex("by_dataroom", (q) => q.eq("dataroomId", args.dataroomId))
      .collect();
  },
});

export const getDataroomLinks = query({
  args: { dataroomId: v.id("datarooms") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("links")
      .withIndex("by_dataroom", (q) => q.eq("dataroomId", args.dataroomId))
      .collect();
  },
});

export const getDataroomViews = query({
  args: {
    dataroomId: v.id("datarooms"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("views")
      .withIndex("by_dataroom", (q) => q.eq("dataroomId", args.dataroomId))
      .order("desc");

    if (args.limit) {
      return await query.take(args.limit);
    }
    return await query.collect();
  },
});

// ==================== DATAROOM MUTATIONS ====================

export const create = mutation({
  args: {
    pId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    teamId: v.id("teams"),
    conversationsEnabled: v.optional(v.boolean()),
    agentsEnabled: v.optional(v.boolean()),
    enableChangeNotifications: v.optional(v.boolean()),
    defaultPermissionStrategy: v.optional(v.string()),
    allowBulkDownload: v.optional(v.boolean()),
    showLastUpdated: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("datarooms", {
      pId: args.pId,
      name: args.name,
      description: args.description,
      teamId: args.teamId,
      conversationsEnabled: args.conversationsEnabled ?? false,
      agentsEnabled: args.agentsEnabled ?? false,
      enableChangeNotifications: args.enableChangeNotifications ?? false,
      defaultPermissionStrategy:
        args.defaultPermissionStrategy ?? "INHERIT_FROM_PARENT",
      allowBulkDownload: args.allowBulkDownload ?? true,
      showLastUpdated: args.showLastUpdated ?? true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("datarooms"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    conversationsEnabled: v.optional(v.boolean()),
    agentsEnabled: v.optional(v.boolean()),
    vectorStoreId: v.optional(v.string()),
    enableChangeNotifications: v.optional(v.boolean()),
    defaultPermissionStrategy: v.optional(v.string()),
    allowBulkDownload: v.optional(v.boolean()),
    showLastUpdated: v.optional(v.boolean()),
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
  args: { id: v.id("datarooms") },
  handler: async (ctx, args) => {
    // Delete documents
    const documents = await ctx.db
      .query("dataroomDocuments")
      .withIndex("by_dataroom", (q) => q.eq("dataroomId", args.id))
      .collect();
    await Promise.all(documents.map((d) => ctx.db.delete(d._id)));

    // Delete folders
    const folders = await ctx.db
      .query("dataroomFolders")
      .withIndex("by_dataroom", (q) => q.eq("dataroomId", args.id))
      .collect();
    await Promise.all(folders.map((f) => ctx.db.delete(f._id)));

    // Delete brand
    const brand = await ctx.db
      .query("dataroomBrands")
      .withIndex("by_dataroom", (q) => q.eq("dataroomId", args.id))
      .unique();
    if (brand) {
      await ctx.db.delete(brand._id);
    }

    // Delete viewer groups
    const viewerGroups = await ctx.db
      .query("viewerGroups")
      .withIndex("by_dataroom", (q) => q.eq("dataroomId", args.id))
      .collect();
    await Promise.all(viewerGroups.map((vg) => ctx.db.delete(vg._id)));

    // Delete permission groups
    const permissionGroups = await ctx.db
      .query("permissionGroups")
      .withIndex("by_dataroom", (q) => q.eq("dataroomId", args.id))
      .collect();
    await Promise.all(permissionGroups.map((pg) => ctx.db.delete(pg._id)));

    // Delete links
    const links = await ctx.db
      .query("links")
      .withIndex("by_dataroom", (q) => q.eq("dataroomId", args.id))
      .collect();
    await Promise.all(links.map((l) => ctx.db.delete(l._id)));

    // Delete dataroom
    await ctx.db.delete(args.id);
  },
});

// ==================== DATAROOM DOCUMENT MUTATIONS ====================

export const addDocument = mutation({
  args: {
    dataroomId: v.id("datarooms"),
    documentId: v.id("documents"),
    folderId: v.optional(v.id("dataroomFolders")),
    orderIndex: v.optional(v.number()),
    hierarchicalIndex: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if document already exists in dataroom
    const existing = await ctx.db
      .query("dataroomDocuments")
      .withIndex("by_dataroom_document", (q) =>
        q.eq("dataroomId", args.dataroomId).eq("documentId", args.documentId)
      )
      .unique();

    if (existing) {
      return existing._id;
    }

    const now = Date.now();
    return await ctx.db.insert("dataroomDocuments", {
      dataroomId: args.dataroomId,
      documentId: args.documentId,
      folderId: args.folderId,
      orderIndex: args.orderIndex,
      hierarchicalIndex: args.hierarchicalIndex,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateDataroomDocument = mutation({
  args: {
    id: v.id("dataroomDocuments"),
    folderId: v.optional(v.id("dataroomFolders")),
    orderIndex: v.optional(v.number()),
    hierarchicalIndex: v.optional(v.string()),
    vectorStoreFileId: v.optional(v.string()),
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

export const removeDocument = mutation({
  args: { id: v.id("dataroomDocuments") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ==================== DATAROOM FOLDER MUTATIONS ====================

export const createFolder = mutation({
  args: {
    name: v.string(),
    path: v.string(),
    dataroomId: v.id("datarooms"),
    parentId: v.optional(v.id("dataroomFolders")),
    orderIndex: v.optional(v.number()),
    hierarchicalIndex: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("dataroomFolders", {
      name: args.name,
      path: args.path,
      dataroomId: args.dataroomId,
      parentId: args.parentId,
      orderIndex: args.orderIndex,
      hierarchicalIndex: args.hierarchicalIndex,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateFolder = mutation({
  args: {
    id: v.id("dataroomFolders"),
    name: v.optional(v.string()),
    path: v.optional(v.string()),
    parentId: v.optional(v.id("dataroomFolders")),
    orderIndex: v.optional(v.number()),
    hierarchicalIndex: v.optional(v.string()),
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
  args: { id: v.id("dataroomFolders") },
  handler: async (ctx, args) => {
    // Move documents to root (set folderId to undefined)
    const documents = await ctx.db
      .query("dataroomDocuments")
      .withIndex("by_folder", (q) => q.eq("folderId", args.id))
      .collect();
    await Promise.all(
      documents.map((d) => ctx.db.patch(d._id, { folderId: undefined }))
    );

    // Delete child folders recursively
    const childFolders = await ctx.db
      .query("dataroomFolders")
      .withIndex("by_parent", (q) => q.eq("parentId", args.id))
      .collect();

    for (const child of childFolders) {
      await ctx.db.delete(child._id);
    }

    await ctx.db.delete(args.id);
  },
});

// ==================== DATAROOM BRAND MUTATIONS ====================

export const createBrand = mutation({
  args: {
    dataroomId: v.id("datarooms"),
    logo: v.optional(v.string()),
    banner: v.optional(v.string()),
    brandColor: v.optional(v.string()),
    accentColor: v.optional(v.string()),
    welcomeMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("dataroomBrands", {
      dataroomId: args.dataroomId,
      logo: args.logo,
      banner: args.banner,
      brandColor: args.brandColor,
      accentColor: args.accentColor,
      welcomeMessage: args.welcomeMessage,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateBrand = mutation({
  args: {
    dataroomId: v.id("datarooms"),
    logo: v.optional(v.string()),
    banner: v.optional(v.string()),
    brandColor: v.optional(v.string()),
    accentColor: v.optional(v.string()),
    welcomeMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const brand = await ctx.db
      .query("dataroomBrands")
      .withIndex("by_dataroom", (q) => q.eq("dataroomId", args.dataroomId))
      .unique();

    const { dataroomId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    if (brand) {
      await ctx.db.patch(brand._id, { ...filteredUpdates, updatedAt: Date.now() });
      return await ctx.db.get(brand._id);
    } else {
      const now = Date.now();
      const id = await ctx.db.insert("dataroomBrands", {
        dataroomId,
        ...filteredUpdates,
        createdAt: now,
        updatedAt: now,
      });
      return await ctx.db.get(id);
    }
  },
});

// ==================== VIEWER GROUP MUTATIONS ====================

export const createViewerGroup = mutation({
  args: {
    name: v.string(),
    dataroomId: v.id("datarooms"),
    teamId: v.id("teams"),
    domains: v.optional(v.array(v.string())),
    allowAll: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("viewerGroups", {
      name: args.name,
      dataroomId: args.dataroomId,
      teamId: args.teamId,
      domains: args.domains ?? [],
      allowAll: args.allowAll ?? false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateViewerGroup = mutation({
  args: {
    id: v.id("viewerGroups"),
    name: v.optional(v.string()),
    domains: v.optional(v.array(v.string())),
    allowAll: v.optional(v.boolean()),
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

export const deleteViewerGroup = mutation({
  args: { id: v.id("viewerGroups") },
  handler: async (ctx, args) => {
    // Delete memberships
    const memberships = await ctx.db
      .query("viewerGroupMemberships")
      .withIndex("by_group", (q) => q.eq("groupId", args.id))
      .collect();
    await Promise.all(memberships.map((m) => ctx.db.delete(m._id)));

    // Delete access controls
    const accessControls = await ctx.db
      .query("viewerGroupAccessControls")
      .withIndex("by_group", (q) => q.eq("groupId", args.id))
      .collect();
    await Promise.all(accessControls.map((ac) => ctx.db.delete(ac._id)));

    await ctx.db.delete(args.id);
  },
});

export const addViewerToGroup = mutation({
  args: {
    viewerId: v.id("viewers"),
    groupId: v.id("viewerGroups"),
  },
  handler: async (ctx, args) => {
    // Check if membership already exists
    const existing = await ctx.db
      .query("viewerGroupMemberships")
      .withIndex("by_viewer_group", (q) =>
        q.eq("viewerId", args.viewerId).eq("groupId", args.groupId)
      )
      .unique();

    if (existing) {
      return existing._id;
    }

    const now = Date.now();
    return await ctx.db.insert("viewerGroupMemberships", {
      viewerId: args.viewerId,
      groupId: args.groupId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const removeViewerFromGroup = mutation({
  args: {
    viewerId: v.id("viewers"),
    groupId: v.id("viewerGroups"),
  },
  handler: async (ctx, args) => {
    const membership = await ctx.db
      .query("viewerGroupMemberships")
      .withIndex("by_viewer_group", (q) =>
        q.eq("viewerId", args.viewerId).eq("groupId", args.groupId)
      )
      .unique();

    if (membership) {
      await ctx.db.delete(membership._id);
    }
  },
});

export const setViewerGroupAccessControl = mutation({
  args: {
    groupId: v.id("viewerGroups"),
    itemId: v.string(),
    itemType: v.string(),
    canView: v.optional(v.boolean()),
    canDownload: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("viewerGroupAccessControls")
      .withIndex("by_group_item", (q) =>
        q.eq("groupId", args.groupId).eq("itemId", args.itemId)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        canView: args.canView ?? existing.canView,
        canDownload: args.canDownload ?? existing.canDownload,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    const now = Date.now();
    return await ctx.db.insert("viewerGroupAccessControls", {
      groupId: args.groupId,
      itemId: args.itemId,
      itemType: args.itemType,
      canView: args.canView ?? true,
      canDownload: args.canDownload ?? false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// ==================== PERMISSION GROUP MUTATIONS ====================

export const createPermissionGroup = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    dataroomId: v.id("datarooms"),
    teamId: v.id("teams"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("permissionGroups", {
      name: args.name,
      description: args.description,
      dataroomId: args.dataroomId,
      teamId: args.teamId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updatePermissionGroup = mutation({
  args: {
    id: v.id("permissionGroups"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
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

export const deletePermissionGroup = mutation({
  args: { id: v.id("permissionGroups") },
  handler: async (ctx, args) => {
    // Delete access controls
    const accessControls = await ctx.db
      .query("permissionGroupAccessControls")
      .withIndex("by_group", (q) => q.eq("groupId", args.id))
      .collect();
    await Promise.all(accessControls.map((ac) => ctx.db.delete(ac._id)));

    // Update links to remove permission group reference
    const links = await ctx.db
      .query("links")
      .withIndex("by_permission_group", (q) => q.eq("permissionGroupId", args.id))
      .collect();
    await Promise.all(
      links.map((l) => ctx.db.patch(l._id, { permissionGroupId: undefined }))
    );

    await ctx.db.delete(args.id);
  },
});

export const setPermissionGroupAccessControl = mutation({
  args: {
    groupId: v.id("permissionGroups"),
    itemId: v.string(),
    itemType: v.string(),
    canView: v.optional(v.boolean()),
    canDownload: v.optional(v.boolean()),
    canDownloadOriginal: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("permissionGroupAccessControls")
      .withIndex("by_group_item", (q) =>
        q.eq("groupId", args.groupId).eq("itemId", args.itemId)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        canView: args.canView ?? existing.canView,
        canDownload: args.canDownload ?? existing.canDownload,
        canDownloadOriginal: args.canDownloadOriginal ?? existing.canDownloadOriginal,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    const now = Date.now();
    return await ctx.db.insert("permissionGroupAccessControls", {
      groupId: args.groupId,
      itemId: args.itemId,
      itemType: args.itemType,
      canView: args.canView ?? true,
      canDownload: args.canDownload ?? false,
      canDownloadOriginal: args.canDownloadOriginal ?? false,
      createdAt: now,
      updatedAt: now,
    });
  },
});
