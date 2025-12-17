import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ==================== LINK QUERIES ====================

export const getById = query({
  args: { id: v.id("links") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getByUrl = query({
  args: { url: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("links")
      .withIndex("by_url", (q) => q.eq("url", args.url))
      .unique();
  },
});

export const getByDomainSlug = query({
  args: {
    domainSlug: v.string(),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("links")
      .withIndex("by_domain_slug", (q) =>
        q.eq("domainSlug", args.domainSlug).eq("slug", args.slug)
      )
      .unique();
  },
});

export const getByDocument = query({
  args: {
    documentId: v.id("documents"),
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (args.includeArchived) {
      return await ctx.db
        .query("links")
        .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
        .collect();
    }
    return await ctx.db
      .query("links")
      .withIndex("by_document_archived", (q) =>
        q.eq("documentId", args.documentId).eq("isArchived", false)
      )
      .collect();
  },
});

export const getByDataroom = query({
  args: { dataroomId: v.id("datarooms") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("links")
      .withIndex("by_dataroom", (q) => q.eq("dataroomId", args.dataroomId))
      .collect();
  },
});

export const getByTeam = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("links")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();
  },
});

export const getLinkWithDocument = query({
  args: { id: v.id("links") },
  handler: async (ctx, args) => {
    const link = await ctx.db.get(args.id);
    if (!link) return null;

    let document = null;
    if (link.documentId) {
      document = await ctx.db.get(link.documentId);
    }

    return { ...link, document };
  },
});

export const getLinkWithDataroom = query({
  args: { id: v.id("links") },
  handler: async (ctx, args) => {
    const link = await ctx.db.get(args.id);
    if (!link) return null;

    let dataroom = null;
    if (link.dataroomId) {
      dataroom = await ctx.db.get(link.dataroomId);
    }

    return { ...link, dataroom };
  },
});

export const getLinkViews = query({
  args: {
    linkId: v.id("links"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("views")
      .withIndex("by_link", (q) => q.eq("linkId", args.linkId))
      .order("desc");

    if (args.limit) {
      return await query.take(args.limit);
    }
    return await query.collect();
  },
});

export const getLinkCustomFields = query({
  args: { linkId: v.id("links") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("customFields")
      .withIndex("by_link", (q) => q.eq("linkId", args.linkId))
      .collect();
  },
});

export const getLinkFeedback = query({
  args: { linkId: v.id("links") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("feedback")
      .withIndex("by_link", (q) => q.eq("linkId", args.linkId))
      .unique();
  },
});

// ==================== LINK MUTATIONS ====================

export const create = mutation({
  args: {
    documentId: v.optional(v.id("documents")),
    dataroomId: v.optional(v.id("datarooms")),
    linkType: v.optional(v.string()),
    url: v.optional(v.string()),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    password: v.optional(v.string()),
    allowList: v.optional(v.array(v.string())),
    denyList: v.optional(v.array(v.string())),
    emailProtected: v.optional(v.boolean()),
    emailAuthenticated: v.optional(v.boolean()),
    allowDownload: v.optional(v.boolean()),
    domainId: v.optional(v.id("domains")),
    domainSlug: v.optional(v.string()),
    enableNotification: v.optional(v.boolean()),
    enableFeedback: v.optional(v.boolean()),
    enableQuestion: v.optional(v.boolean()),
    enableScreenshotProtection: v.optional(v.boolean()),
    enableAgreement: v.optional(v.boolean()),
    agreementId: v.optional(v.id("agreements")),
    showBanner: v.optional(v.boolean()),
    enableWatermark: v.optional(v.boolean()),
    watermarkConfig: v.optional(v.any()),
    audienceType: v.optional(v.string()),
    groupId: v.optional(v.id("viewerGroups")),
    permissionGroupId: v.optional(v.id("permissionGroups")),
    metaTitle: v.optional(v.string()),
    metaDescription: v.optional(v.string()),
    metaImage: v.optional(v.string()),
    metaFavicon: v.optional(v.string()),
    enableCustomMetatag: v.optional(v.boolean()),
    welcomeMessage: v.optional(v.string()),
    enableConversation: v.optional(v.boolean()),
    enableAIAgents: v.optional(v.boolean()),
    enableUpload: v.optional(v.boolean()),
    isFileRequestOnly: v.optional(v.boolean()),
    uploadFolderId: v.optional(v.string()),
    enableIndexFile: v.optional(v.boolean()),
    teamId: v.optional(v.id("teams")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("links", {
      documentId: args.documentId,
      dataroomId: args.dataroomId,
      linkType: args.linkType ?? "DOCUMENT_LINK",
      url: args.url,
      name: args.name,
      slug: args.slug,
      expiresAt: args.expiresAt,
      password: args.password,
      allowList: args.allowList ?? [],
      denyList: args.denyList ?? [],
      emailProtected: args.emailProtected ?? true,
      emailAuthenticated: args.emailAuthenticated ?? false,
      allowDownload: args.allowDownload ?? false,
      isArchived: false,
      domainId: args.domainId,
      domainSlug: args.domainSlug,
      enableNotification: args.enableNotification ?? true,
      enableFeedback: args.enableFeedback ?? false,
      enableQuestion: args.enableQuestion ?? false,
      enableScreenshotProtection: args.enableScreenshotProtection ?? false,
      enableAgreement: args.enableAgreement ?? false,
      agreementId: args.agreementId,
      showBanner: args.showBanner ?? false,
      enableWatermark: args.enableWatermark ?? false,
      watermarkConfig: args.watermarkConfig,
      audienceType: args.audienceType ?? "GENERAL",
      groupId: args.groupId,
      permissionGroupId: args.permissionGroupId,
      metaTitle: args.metaTitle,
      metaDescription: args.metaDescription,
      metaImage: args.metaImage,
      metaFavicon: args.metaFavicon,
      enableCustomMetatag: args.enableCustomMetatag ?? false,
      welcomeMessage: args.welcomeMessage,
      enableConversation: args.enableConversation ?? false,
      enableAIAgents: args.enableAIAgents ?? false,
      enableUpload: args.enableUpload ?? false,
      isFileRequestOnly: args.isFileRequestOnly ?? false,
      uploadFolderId: args.uploadFolderId,
      enableIndexFile: args.enableIndexFile ?? false,
      teamId: args.teamId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("links"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    password: v.optional(v.string()),
    allowList: v.optional(v.array(v.string())),
    denyList: v.optional(v.array(v.string())),
    emailProtected: v.optional(v.boolean()),
    emailAuthenticated: v.optional(v.boolean()),
    allowDownload: v.optional(v.boolean()),
    isArchived: v.optional(v.boolean()),
    deletedAt: v.optional(v.number()),
    domainId: v.optional(v.id("domains")),
    domainSlug: v.optional(v.string()),
    enableNotification: v.optional(v.boolean()),
    enableFeedback: v.optional(v.boolean()),
    enableQuestion: v.optional(v.boolean()),
    enableScreenshotProtection: v.optional(v.boolean()),
    enableAgreement: v.optional(v.boolean()),
    agreementId: v.optional(v.id("agreements")),
    showBanner: v.optional(v.boolean()),
    enableWatermark: v.optional(v.boolean()),
    watermarkConfig: v.optional(v.any()),
    audienceType: v.optional(v.string()),
    groupId: v.optional(v.id("viewerGroups")),
    permissionGroupId: v.optional(v.id("permissionGroups")),
    metaTitle: v.optional(v.string()),
    metaDescription: v.optional(v.string()),
    metaImage: v.optional(v.string()),
    metaFavicon: v.optional(v.string()),
    enableCustomMetatag: v.optional(v.boolean()),
    welcomeMessage: v.optional(v.string()),
    enableConversation: v.optional(v.boolean()),
    enableAIAgents: v.optional(v.boolean()),
    enableUpload: v.optional(v.boolean()),
    isFileRequestOnly: v.optional(v.boolean()),
    uploadFolderId: v.optional(v.string()),
    enableIndexFile: v.optional(v.boolean()),
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

export const archive = mutation({
  args: { id: v.id("links") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      isArchived: true,
      updatedAt: Date.now(),
    });
    return await ctx.db.get(args.id);
  },
});

export const softDelete = mutation({
  args: { id: v.id("links") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
    return await ctx.db.get(args.id);
  },
});

export const remove = mutation({
  args: { id: v.id("links") },
  handler: async (ctx, args) => {
    // Delete views
    const views = await ctx.db
      .query("views")
      .withIndex("by_link", (q) => q.eq("linkId", args.id))
      .collect();
    await Promise.all(views.map((v) => ctx.db.delete(v._id)));

    // Delete custom fields
    const customFields = await ctx.db
      .query("customFields")
      .withIndex("by_link", (q) => q.eq("linkId", args.id))
      .collect();
    await Promise.all(customFields.map((cf) => ctx.db.delete(cf._id)));

    // Delete feedback
    const feedback = await ctx.db
      .query("feedback")
      .withIndex("by_link", (q) => q.eq("linkId", args.id))
      .unique();
    if (feedback) {
      await ctx.db.delete(feedback._id);
    }

    // Delete link
    await ctx.db.delete(args.id);
  },
});

// ==================== CUSTOM FIELD MUTATIONS ====================

export const createCustomField = mutation({
  args: {
    linkId: v.id("links"),
    type: v.string(),
    identifier: v.string(),
    label: v.string(),
    placeholder: v.optional(v.string()),
    required: v.optional(v.boolean()),
    disabled: v.optional(v.boolean()),
    orderIndex: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("customFields", {
      linkId: args.linkId,
      type: args.type,
      identifier: args.identifier,
      label: args.label,
      placeholder: args.placeholder,
      required: args.required ?? false,
      disabled: args.disabled ?? false,
      orderIndex: args.orderIndex ?? 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateCustomField = mutation({
  args: {
    id: v.id("customFields"),
    type: v.optional(v.string()),
    identifier: v.optional(v.string()),
    label: v.optional(v.string()),
    placeholder: v.optional(v.string()),
    required: v.optional(v.boolean()),
    disabled: v.optional(v.boolean()),
    orderIndex: v.optional(v.number()),
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

export const deleteCustomField = mutation({
  args: { id: v.id("customFields") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ==================== FEEDBACK MUTATIONS ====================

export const createFeedback = mutation({
  args: {
    linkId: v.id("links"),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("feedback", {
      linkId: args.linkId,
      data: args.data,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateFeedback = mutation({
  args: {
    id: v.id("feedback"),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { data: args.data, updatedAt: Date.now() });
    return await ctx.db.get(args.id);
  },
});

export const deleteFeedback = mutation({
  args: { id: v.id("feedback") },
  handler: async (ctx, args) => {
    // Delete feedback responses
    const responses = await ctx.db
      .query("feedbackResponses")
      .withIndex("by_feedback", (q) => q.eq("feedbackId", args.id))
      .collect();
    await Promise.all(responses.map((r) => ctx.db.delete(r._id)));

    await ctx.db.delete(args.id);
  },
});

// ==================== LINK PRESET MUTATIONS ====================

export const createLinkPreset = mutation({
  args: {
    name: v.string(),
    teamId: v.id("teams"),
    pId: v.optional(v.string()),
    enableCustomMetaTag: v.optional(v.boolean()),
    metaTitle: v.optional(v.string()),
    metaDescription: v.optional(v.string()),
    metaImage: v.optional(v.string()),
    metaFavicon: v.optional(v.string()),
    enableNotification: v.optional(v.boolean()),
    emailProtected: v.optional(v.boolean()),
    emailAuthenticated: v.optional(v.boolean()),
    allowDownload: v.optional(v.boolean()),
    enableAllowList: v.optional(v.boolean()),
    allowList: v.optional(v.array(v.string())),
    enableDenyList: v.optional(v.boolean()),
    denyList: v.optional(v.array(v.string())),
    expiresIn: v.optional(v.number()),
    enableScreenshotProtection: v.optional(v.boolean()),
    expiresAt: v.optional(v.number()),
    enablePassword: v.optional(v.boolean()),
    password: v.optional(v.string()),
    enableWatermark: v.optional(v.boolean()),
    watermarkConfig: v.optional(v.any()),
    enableAgreement: v.optional(v.boolean()),
    agreementId: v.optional(v.string()),
    enableCustomFields: v.optional(v.boolean()),
    customFields: v.optional(v.any()),
    showBanner: v.optional(v.boolean()),
    welcomeMessage: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("linkPresets", {
      name: args.name,
      teamId: args.teamId,
      pId: args.pId,
      enableCustomMetaTag: args.enableCustomMetaTag ?? false,
      metaTitle: args.metaTitle,
      metaDescription: args.metaDescription,
      metaImage: args.metaImage,
      metaFavicon: args.metaFavicon,
      enableNotification: args.enableNotification ?? false,
      emailProtected: args.emailProtected ?? true,
      emailAuthenticated: args.emailAuthenticated ?? false,
      allowDownload: args.allowDownload ?? false,
      enableAllowList: args.enableAllowList ?? false,
      allowList: args.allowList ?? [],
      enableDenyList: args.enableDenyList ?? false,
      denyList: args.denyList ?? [],
      expiresIn: args.expiresIn,
      enableScreenshotProtection: args.enableScreenshotProtection ?? false,
      expiresAt: args.expiresAt,
      enablePassword: args.enablePassword ?? false,
      password: args.password,
      enableWatermark: args.enableWatermark ?? false,
      watermarkConfig: args.watermarkConfig,
      enableAgreement: args.enableAgreement ?? false,
      agreementId: args.agreementId,
      enableCustomFields: args.enableCustomFields ?? false,
      customFields: args.customFields,
      showBanner: args.showBanner ?? false,
      welcomeMessage: args.welcomeMessage,
      isDefault: args.isDefault ?? false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateLinkPreset = mutation({
  args: {
    id: v.id("linkPresets"),
    name: v.optional(v.string()),
    enableCustomMetaTag: v.optional(v.boolean()),
    metaTitle: v.optional(v.string()),
    metaDescription: v.optional(v.string()),
    metaImage: v.optional(v.string()),
    metaFavicon: v.optional(v.string()),
    enableNotification: v.optional(v.boolean()),
    emailProtected: v.optional(v.boolean()),
    emailAuthenticated: v.optional(v.boolean()),
    allowDownload: v.optional(v.boolean()),
    enableAllowList: v.optional(v.boolean()),
    allowList: v.optional(v.array(v.string())),
    enableDenyList: v.optional(v.boolean()),
    denyList: v.optional(v.array(v.string())),
    expiresIn: v.optional(v.number()),
    enableScreenshotProtection: v.optional(v.boolean()),
    expiresAt: v.optional(v.number()),
    enablePassword: v.optional(v.boolean()),
    password: v.optional(v.string()),
    enableWatermark: v.optional(v.boolean()),
    watermarkConfig: v.optional(v.any()),
    enableAgreement: v.optional(v.boolean()),
    agreementId: v.optional(v.string()),
    enableCustomFields: v.optional(v.boolean()),
    customFields: v.optional(v.any()),
    showBanner: v.optional(v.boolean()),
    welcomeMessage: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
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

export const deleteLinkPreset = mutation({
  args: { id: v.id("linkPresets") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
