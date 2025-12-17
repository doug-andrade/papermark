import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ==================== VIEW QUERIES ====================

export const getById = query({
  args: { id: v.id("views") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getByLink = query({
  args: {
    linkId: v.id("links"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const viewsQuery = ctx.db
      .query("views")
      .withIndex("by_link", (q) => q.eq("linkId", args.linkId))
      .order("desc");

    if (args.limit) {
      return await viewsQuery.take(args.limit);
    }
    return await viewsQuery.collect();
  },
});

export const getByDocument = query({
  args: {
    documentId: v.id("documents"),
    includeArchived: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let viewsQuery;

    if (args.includeArchived) {
      viewsQuery = ctx.db
        .query("views")
        .withIndex("by_document", (q) => q.eq("documentId", args.documentId));
    } else {
      viewsQuery = ctx.db
        .query("views")
        .withIndex("by_document_archived", (q) =>
          q.eq("documentId", args.documentId).eq("isArchived", false)
        );
    }

    if (args.limit) {
      return await viewsQuery.order("desc").take(args.limit);
    }
    return await viewsQuery.order("desc").collect();
  },
});

export const getByDataroom = query({
  args: {
    dataroomId: v.id("datarooms"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const viewsQuery = ctx.db
      .query("views")
      .withIndex("by_dataroom", (q) => q.eq("dataroomId", args.dataroomId))
      .order("desc");

    if (args.limit) {
      return await viewsQuery.take(args.limit);
    }
    return await viewsQuery.collect();
  },
});

export const getByViewer = query({
  args: {
    viewerId: v.id("viewers"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const viewsQuery = ctx.db
      .query("views")
      .withIndex("by_viewer", (q) => q.eq("viewerId", args.viewerId))
      .order("desc");

    if (args.limit) {
      return await viewsQuery.take(args.limit);
    }
    return await viewsQuery.collect();
  },
});

export const getByViewerEmail = query({
  args: {
    viewerEmail: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const viewsQuery = ctx.db
      .query("views")
      .withIndex("by_viewer_email", (q) => q.eq("viewerEmail", args.viewerEmail))
      .order("desc");

    if (args.limit) {
      return await viewsQuery.take(args.limit);
    }
    return await viewsQuery.collect();
  },
});

export const getByTeam = query({
  args: {
    teamId: v.id("teams"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const viewsQuery = ctx.db
      .query("views")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .order("desc");

    if (args.limit) {
      return await viewsQuery.take(args.limit);
    }
    return await viewsQuery.collect();
  },
});

export const getViewWithDetails = query({
  args: { id: v.id("views") },
  handler: async (ctx, args) => {
    const view = await ctx.db.get(args.id);
    if (!view) return null;

    const [link, document, viewer, reactions] = await Promise.all([
      view.linkId ? ctx.db.get(view.linkId) : null,
      view.documentId ? ctx.db.get(view.documentId) : null,
      view.viewerId ? ctx.db.get(view.viewerId) : null,
      ctx.db
        .query("reactions")
        .withIndex("by_view", (q) => q.eq("viewId", args.id))
        .collect(),
    ]);

    return {
      ...view,
      link,
      document,
      viewer,
      reactions,
    };
  },
});

export const getViewReactions = query({
  args: { viewId: v.id("views") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("reactions")
      .withIndex("by_view", (q) => q.eq("viewId", args.viewId))
      .collect();
  },
});

// ==================== VIEW MUTATIONS ====================

export const create = mutation({
  args: {
    linkId: v.id("links"),
    documentId: v.optional(v.id("documents")),
    dataroomId: v.optional(v.id("datarooms")),
    dataroomViewId: v.optional(v.string()),
    viewerEmail: v.optional(v.string()),
    viewerName: v.optional(v.string()),
    verified: v.optional(v.boolean()),
    viewType: v.optional(v.string()),
    viewerId: v.optional(v.id("viewers")),
    groupId: v.optional(v.id("viewerGroups")),
    teamId: v.optional(v.id("teams")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("views", {
      linkId: args.linkId,
      documentId: args.documentId,
      dataroomId: args.dataroomId,
      dataroomViewId: args.dataroomViewId,
      viewerEmail: args.viewerEmail,
      viewerName: args.viewerName,
      verified: args.verified ?? false,
      viewedAt: Date.now(),
      viewType: args.viewType ?? "DOCUMENT_VIEW",
      viewerId: args.viewerId,
      groupId: args.groupId,
      isArchived: false,
      teamId: args.teamId,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("views"),
    viewerEmail: v.optional(v.string()),
    viewerName: v.optional(v.string()),
    verified: v.optional(v.boolean()),
    downloadedAt: v.optional(v.number()),
    downloadType: v.optional(v.string()),
    downloadMetadata: v.optional(v.any()),
    viewerId: v.optional(v.id("viewers")),
    groupId: v.optional(v.id("viewerGroups")),
    isArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, val]) => val !== undefined)
    );
    await ctx.db.patch(id, filteredUpdates);
    return await ctx.db.get(id);
  },
});

export const archive = mutation({
  args: { id: v.id("views") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isArchived: true });
    return await ctx.db.get(args.id);
  },
});

export const unarchive = mutation({
  args: { id: v.id("views") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isArchived: false });
    return await ctx.db.get(args.id);
  },
});

export const remove = mutation({
  args: { id: v.id("views") },
  handler: async (ctx, args) => {
    // Delete reactions
    const reactions = await ctx.db
      .query("reactions")
      .withIndex("by_view", (q) => q.eq("viewId", args.id))
      .collect();
    await Promise.all(reactions.map((r) => ctx.db.delete(r._id)));

    // Delete custom field response
    const customFieldResponse = await ctx.db
      .query("customFieldResponses")
      .withIndex("by_view", (q) => q.eq("viewId", args.id))
      .unique();
    if (customFieldResponse) {
      await ctx.db.delete(customFieldResponse._id);
    }

    // Delete feedback response
    const feedbackResponse = await ctx.db
      .query("feedbackResponses")
      .withIndex("by_view", (q) => q.eq("viewId", args.id))
      .unique();
    if (feedbackResponse) {
      await ctx.db.delete(feedbackResponse._id);
    }

    // Delete agreement response
    const agreementResponse = await ctx.db
      .query("agreementResponses")
      .withIndex("by_view", (q) => q.eq("viewId", args.id))
      .unique();
    if (agreementResponse) {
      await ctx.db.delete(agreementResponse._id);
    }

    // Delete view
    await ctx.db.delete(args.id);
  },
});

export const markDownloaded = mutation({
  args: {
    id: v.id("views"),
    downloadType: v.optional(v.string()),
    downloadMetadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      downloadedAt: Date.now(),
      downloadType: args.downloadType ?? "SINGLE",
      downloadMetadata: args.downloadMetadata,
    });
    return await ctx.db.get(args.id);
  },
});

// ==================== REACTION MUTATIONS ====================

export const addReaction = mutation({
  args: {
    viewId: v.id("views"),
    pageNumber: v.number(),
    type: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("reactions", {
      viewId: args.viewId,
      pageNumber: args.pageNumber,
      type: args.type,
      createdAt: Date.now(),
    });
  },
});

export const removeReaction = mutation({
  args: { id: v.id("reactions") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ==================== VIEWER QUERIES ====================

export const getViewerById = query({
  args: { id: v.id("viewers") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getViewerByEmail = query({
  args: {
    teamId: v.id("teams"),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("viewers")
      .withIndex("by_team_email", (q) =>
        q.eq("teamId", args.teamId).eq("email", args.email)
      )
      .unique();
  },
});

export const getViewersByTeam = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("viewers")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();
  },
});

export const getViewersByDataroom = query({
  args: { dataroomId: v.id("datarooms") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("viewers")
      .withIndex("by_dataroom", (q) => q.eq("dataroomId", args.dataroomId))
      .collect();
  },
});

// ==================== VIEWER MUTATIONS ====================

export const createViewer = mutation({
  args: {
    email: v.string(),
    teamId: v.id("teams"),
    dataroomId: v.optional(v.id("datarooms")),
    verified: v.optional(v.boolean()),
    invitedAt: v.optional(v.number()),
    notificationPreferences: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Check if viewer already exists
    const existing = await ctx.db
      .query("viewers")
      .withIndex("by_team_email", (q) =>
        q.eq("teamId", args.teamId).eq("email", args.email)
      )
      .unique();

    if (existing) {
      return existing._id;
    }

    const now = Date.now();
    return await ctx.db.insert("viewers", {
      email: args.email,
      teamId: args.teamId,
      dataroomId: args.dataroomId,
      verified: args.verified ?? false,
      invitedAt: args.invitedAt,
      notificationPreferences: args.notificationPreferences,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateViewer = mutation({
  args: {
    id: v.id("viewers"),
    email: v.optional(v.string()),
    verified: v.optional(v.boolean()),
    invitedAt: v.optional(v.number()),
    notificationPreferences: v.optional(v.any()),
    dataroomId: v.optional(v.id("datarooms")),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, val]) => val !== undefined)
    );
    await ctx.db.patch(id, { ...filteredUpdates, updatedAt: Date.now() });
    return await ctx.db.get(id);
  },
});

export const deleteViewer = mutation({
  args: { id: v.id("viewers") },
  handler: async (ctx, args) => {
    // Delete group memberships
    const memberships = await ctx.db
      .query("viewerGroupMemberships")
      .withIndex("by_viewer", (q) => q.eq("viewerId", args.id))
      .collect();
    await Promise.all(memberships.map((m) => ctx.db.delete(m._id)));

    // Delete invitations
    const invitations = await ctx.db
      .query("viewerInvitations")
      .withIndex("by_viewer", (q) => q.eq("viewerId", args.id))
      .collect();
    await Promise.all(invitations.map((i) => ctx.db.delete(i._id)));

    await ctx.db.delete(args.id);
  },
});

// ==================== VIEWER INVITATION MUTATIONS ====================

export const createViewerInvitation = mutation({
  args: {
    viewerId: v.id("viewers"),
    linkId: v.id("links"),
    groupId: v.optional(v.id("viewerGroups")),
    invitedBy: v.string(),
    customMessage: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("viewerInvitations", {
      viewerId: args.viewerId,
      linkId: args.linkId,
      groupId: args.groupId,
      invitedBy: args.invitedBy,
      customMessage: args.customMessage,
      sentAt: Date.now(),
      status: args.status ?? "SENT",
      createdAt: Date.now(),
    });
  },
});

export const updateViewerInvitationStatus = mutation({
  args: {
    id: v.id("viewerInvitations"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status });
    return await ctx.db.get(args.id);
  },
});

// ==================== FEEDBACK RESPONSE MUTATIONS ====================

export const createFeedbackResponse = mutation({
  args: {
    feedbackId: v.id("feedback"),
    viewId: v.id("views"),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("feedbackResponses", {
      feedbackId: args.feedbackId,
      viewId: args.viewId,
      data: args.data,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// ==================== CUSTOM FIELD RESPONSE MUTATIONS ====================

export const createCustomFieldResponse = mutation({
  args: {
    viewId: v.id("views"),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("customFieldResponses", {
      viewId: args.viewId,
      data: args.data,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// ==================== AGREEMENT MUTATIONS ====================

export const createAgreement = mutation({
  args: {
    name: v.string(),
    content: v.string(),
    contentType: v.optional(v.string()),
    requireName: v.optional(v.boolean()),
    teamId: v.id("teams"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("agreements", {
      name: args.name,
      content: args.content,
      contentType: args.contentType ?? "LINK",
      requireName: args.requireName ?? true,
      teamId: args.teamId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateAgreement = mutation({
  args: {
    id: v.id("agreements"),
    name: v.optional(v.string()),
    content: v.optional(v.string()),
    contentType: v.optional(v.string()),
    requireName: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, val]) => val !== undefined)
    );
    await ctx.db.patch(id, { ...filteredUpdates, updatedAt: Date.now() });
    return await ctx.db.get(id);
  },
});

export const softDeleteAgreement = mutation({
  args: {
    id: v.id("agreements"),
    deletedBy: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      deletedBy: args.deletedBy,
      updatedAt: Date.now(),
    });
    return await ctx.db.get(args.id);
  },
});

export const deleteAgreement = mutation({
  args: { id: v.id("agreements") },
  handler: async (ctx, args) => {
    // Delete agreement responses
    const responses = await ctx.db
      .query("agreementResponses")
      .withIndex("by_agreement", (q) => q.eq("agreementId", args.id))
      .collect();
    await Promise.all(responses.map((r) => ctx.db.delete(r._id)));

    await ctx.db.delete(args.id);
  },
});

export const createAgreementResponse = mutation({
  args: {
    agreementId: v.id("agreements"),
    viewId: v.id("views"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("agreementResponses", {
      agreementId: args.agreementId,
      viewId: args.viewId,
      createdAt: now,
      updatedAt: now,
    });
  },
});
