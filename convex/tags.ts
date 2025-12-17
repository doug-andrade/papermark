import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ==================== TAG QUERIES ====================

export const getById = query({
  args: { id: v.id("tags") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getByTeam = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tags")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();
  },
});

export const getByTeamAndName = query({
  args: {
    teamId: v.id("teams"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tags")
      .withIndex("by_team_name", (q) =>
        q.eq("teamId", args.teamId).eq("name", args.name)
      )
      .unique();
  },
});

export const getTagWithItems = query({
  args: { id: v.id("tags") },
  handler: async (ctx, args) => {
    const tag = await ctx.db.get(args.id);
    if (!tag) return null;

    const items = await ctx.db
      .query("tagItems")
      .withIndex("by_tag", (q) => q.eq("tagId", args.id))
      .collect();

    return { ...tag, items };
  },
});

export const getTagsForLink = query({
  args: { linkId: v.id("links") },
  handler: async (ctx, args) => {
    const tagItems = await ctx.db
      .query("tagItems")
      .withIndex("by_tag_link", (q) => q.eq("linkId", args.linkId))
      .collect();

    const tags = await Promise.all(
      tagItems.map(async (ti) => {
        const tag = await ctx.db.get(ti.tagId);
        return tag;
      })
    );

    return tags.filter(Boolean);
  },
});

export const getTagsForDocument = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const tagItems = await ctx.db
      .query("tagItems")
      .withIndex("by_tag_document", (q) => q.eq("documentId", args.documentId))
      .collect();

    const tags = await Promise.all(
      tagItems.map(async (ti) => {
        const tag = await ctx.db.get(ti.tagId);
        return tag;
      })
    );

    return tags.filter(Boolean);
  },
});

export const getTagsForDataroom = query({
  args: { dataroomId: v.id("datarooms") },
  handler: async (ctx, args) => {
    const tagItems = await ctx.db
      .query("tagItems")
      .withIndex("by_tag_dataroom", (q) => q.eq("dataroomId", args.dataroomId))
      .collect();

    const tags = await Promise.all(
      tagItems.map(async (ti) => {
        const tag = await ctx.db.get(ti.tagId);
        return tag;
      })
    );

    return tags.filter(Boolean);
  },
});

// ==================== TAG MUTATIONS ====================

export const create = mutation({
  args: {
    name: v.string(),
    color: v.string(),
    teamId: v.id("teams"),
    description: v.optional(v.string()),
    createdBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if tag with same name exists
    const existing = await ctx.db
      .query("tags")
      .withIndex("by_team_name", (q) =>
        q.eq("teamId", args.teamId).eq("name", args.name)
      )
      .unique();

    if (existing) {
      throw new Error(`Tag "${args.name}" already exists for this team`);
    }

    const now = Date.now();
    return await ctx.db.insert("tags", {
      name: args.name,
      color: args.color,
      teamId: args.teamId,
      description: args.description,
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("tags"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
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

export const remove = mutation({
  args: { id: v.id("tags") },
  handler: async (ctx, args) => {
    // Delete tag items
    const tagItems = await ctx.db
      .query("tagItems")
      .withIndex("by_tag", (q) => q.eq("tagId", args.id))
      .collect();
    await Promise.all(tagItems.map((ti) => ctx.db.delete(ti._id)));

    await ctx.db.delete(args.id);
  },
});

// ==================== TAG ITEM MUTATIONS ====================

export const addTagToLink = mutation({
  args: {
    tagId: v.id("tags"),
    linkId: v.id("links"),
    taggedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if already tagged
    const existing = await ctx.db
      .query("tagItems")
      .withIndex("by_tag_link", (q) =>
        q.eq("tagId", args.tagId).eq("linkId", args.linkId)
      )
      .unique();

    if (existing) {
      return existing._id;
    }

    const now = Date.now();
    return await ctx.db.insert("tagItems", {
      tagId: args.tagId,
      itemType: "LINK_TAG",
      linkId: args.linkId,
      taggedBy: args.taggedBy,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const addTagToDocument = mutation({
  args: {
    tagId: v.id("tags"),
    documentId: v.id("documents"),
    taggedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if already tagged
    const existing = await ctx.db
      .query("tagItems")
      .withIndex("by_tag_document", (q) =>
        q.eq("tagId", args.tagId).eq("documentId", args.documentId)
      )
      .unique();

    if (existing) {
      return existing._id;
    }

    const now = Date.now();
    return await ctx.db.insert("tagItems", {
      tagId: args.tagId,
      itemType: "DOCUMENT_TAG",
      documentId: args.documentId,
      taggedBy: args.taggedBy,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const addTagToDataroom = mutation({
  args: {
    tagId: v.id("tags"),
    dataroomId: v.id("datarooms"),
    taggedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if already tagged
    const existing = await ctx.db
      .query("tagItems")
      .withIndex("by_tag_dataroom", (q) =>
        q.eq("tagId", args.tagId).eq("dataroomId", args.dataroomId)
      )
      .unique();

    if (existing) {
      return existing._id;
    }

    const now = Date.now();
    return await ctx.db.insert("tagItems", {
      tagId: args.tagId,
      itemType: "DATAROOM_TAG",
      dataroomId: args.dataroomId,
      taggedBy: args.taggedBy,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const removeTagFromLink = mutation({
  args: {
    tagId: v.id("tags"),
    linkId: v.id("links"),
  },
  handler: async (ctx, args) => {
    const tagItem = await ctx.db
      .query("tagItems")
      .withIndex("by_tag_link", (q) =>
        q.eq("tagId", args.tagId).eq("linkId", args.linkId)
      )
      .unique();

    if (tagItem) {
      await ctx.db.delete(tagItem._id);
    }
  },
});

export const removeTagFromDocument = mutation({
  args: {
    tagId: v.id("tags"),
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    const tagItem = await ctx.db
      .query("tagItems")
      .withIndex("by_tag_document", (q) =>
        q.eq("tagId", args.tagId).eq("documentId", args.documentId)
      )
      .unique();

    if (tagItem) {
      await ctx.db.delete(tagItem._id);
    }
  },
});

export const removeTagFromDataroom = mutation({
  args: {
    tagId: v.id("tags"),
    dataroomId: v.id("datarooms"),
  },
  handler: async (ctx, args) => {
    const tagItem = await ctx.db
      .query("tagItems")
      .withIndex("by_tag_dataroom", (q) =>
        q.eq("tagId", args.tagId).eq("dataroomId", args.dataroomId)
      )
      .unique();

    if (tagItem) {
      await ctx.db.delete(tagItem._id);
    }
  },
});

// ==================== DOMAIN QUERIES ====================

export const getDomainById = query({
  args: { id: v.id("domains") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getDomainBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("domains")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

export const getDomainsByTeam = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("domains")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();
  },
});

export const getDomainsByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("domains")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

// ==================== DOMAIN MUTATIONS ====================

export const createDomain = mutation({
  args: {
    slug: v.string(),
    teamId: v.id("teams"),
    userId: v.optional(v.id("users")),
    verified: v.optional(v.boolean()),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Check if slug already exists
    const existing = await ctx.db
      .query("domains")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (existing) {
      throw new Error(`Domain "${args.slug}" already exists`);
    }

    const now = Date.now();
    return await ctx.db.insert("domains", {
      slug: args.slug,
      teamId: args.teamId,
      userId: args.userId,
      verified: args.verified ?? false,
      isDefault: args.isDefault ?? false,
      lastChecked: now,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateDomain = mutation({
  args: {
    id: v.id("domains"),
    slug: v.optional(v.string()),
    verified: v.optional(v.boolean()),
    isDefault: v.optional(v.boolean()),
    lastChecked: v.optional(v.number()),
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

export const verifyDomain = mutation({
  args: { id: v.id("domains") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      verified: true,
      lastChecked: Date.now(),
      updatedAt: Date.now(),
    });
    return await ctx.db.get(args.id);
  },
});

export const setDefaultDomain = mutation({
  args: {
    id: v.id("domains"),
    teamId: v.id("teams"),
  },
  handler: async (ctx, args) => {
    // Unset current default
    const currentDefaults = await ctx.db
      .query("domains")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .filter((q) => q.eq(q.field("isDefault"), true))
      .collect();

    await Promise.all(
      currentDefaults.map((d) =>
        ctx.db.patch(d._id, { isDefault: false, updatedAt: Date.now() })
      )
    );

    // Set new default
    await ctx.db.patch(args.id, { isDefault: true, updatedAt: Date.now() });
    return await ctx.db.get(args.id);
  },
});

export const deleteDomain = mutation({
  args: { id: v.id("domains") },
  handler: async (ctx, args) => {
    // Update links to remove domain reference
    const domain = await ctx.db.get(args.id);
    if (domain) {
      const links = await ctx.db
        .query("links")
        .filter((q) => q.eq(q.field("domainId"), args.id))
        .collect();

      await Promise.all(
        links.map((l) =>
          ctx.db.patch(l._id, { domainId: undefined, updatedAt: Date.now() })
        )
      );
    }

    await ctx.db.delete(args.id);
  },
});

// ==================== SENT EMAIL MUTATIONS ====================

export const createSentEmail = mutation({
  args: {
    type: v.string(),
    recipient: v.string(),
    teamId: v.id("teams"),
    marketing: v.optional(v.boolean()),
    domainSlug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("sentEmails", {
      type: args.type,
      recipient: args.recipient,
      teamId: args.teamId,
      marketing: args.marketing ?? false,
      domainSlug: args.domainSlug,
      createdAt: Date.now(),
    });
  },
});

export const getSentEmailsByTeam = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sentEmails")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();
  },
});

// ==================== YEAR IN REVIEW MUTATIONS ====================

export const createYearInReview = mutation({
  args: {
    teamId: v.string(),
    stats: v.any(),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("yearInReviews", {
      teamId: args.teamId,
      stats: args.stats,
      status: args.status ?? "pending",
      attempts: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateYearInReview = mutation({
  args: {
    id: v.id("yearInReviews"),
    status: v.optional(v.string()),
    stats: v.optional(v.any()),
    attempts: v.optional(v.number()),
    lastAttempted: v.optional(v.number()),
    error: v.optional(v.string()),
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

export const getYearInReviewByTeam = query({
  args: { teamId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("yearInReviews")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .first();
  },
});
