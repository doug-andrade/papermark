import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ==================== CONVERSATION QUERIES ====================

export const getById = query({
  args: { id: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getByDataroom = query({
  args: { dataroomId: v.id("datarooms") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("conversations")
      .withIndex("by_dataroom", (q) => q.eq("dataroomId", args.dataroomId))
      .collect();
  },
});

export const getByDataroomDocument = query({
  args: { dataroomDocumentId: v.id("dataroomDocuments") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("conversations")
      .withIndex("by_dataroom_document", (q) =>
        q.eq("dataroomDocumentId", args.dataroomDocumentId)
      )
      .collect();
  },
});

export const getByLink = query({
  args: { linkId: v.id("links") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("conversations")
      .withIndex("by_link", (q) => q.eq("linkId", args.linkId))
      .collect();
  },
});

export const getByTeam = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("conversations")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();
  },
});

export const getConversationWithMessages = query({
  args: { id: v.id("conversations") },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.id);
    if (!conversation) return null;

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.id))
      .order("asc")
      .collect();

    const participants = await ctx.db
      .query("conversationParticipants")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.id))
      .collect();

    return {
      ...conversation,
      messages,
      participants,
    };
  },
});

export const getConversationMessages = query({
  args: {
    conversationId: v.id("conversations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const messagesQuery = ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .order("asc");

    if (args.limit) {
      return await messagesQuery.take(args.limit);
    }
    return await messagesQuery.collect();
  },
});

export const getConversationParticipants = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const participants = await ctx.db
      .query("conversationParticipants")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    // Get user/viewer details
    const participantsWithDetails = await Promise.all(
      participants.map(async (p) => {
        let user = null;
        let viewer = null;
        if (p.userId) {
          user = await ctx.db.get(p.userId);
        }
        if (p.viewerId) {
          viewer = await ctx.db.get(p.viewerId);
        }
        return { ...p, user, viewer };
      })
    );

    return participantsWithDetails;
  },
});

// ==================== CONVERSATION MUTATIONS ====================

export const create = mutation({
  args: {
    dataroomId: v.id("datarooms"),
    teamId: v.id("teams"),
    title: v.optional(v.string()),
    isEnabled: v.optional(v.boolean()),
    visibilityMode: v.optional(v.string()),
    dataroomDocumentId: v.optional(v.id("dataroomDocuments")),
    documentVersionNumber: v.optional(v.number()),
    documentPageNumber: v.optional(v.number()),
    linkId: v.optional(v.id("links")),
    viewerGroupId: v.optional(v.id("viewerGroups")),
    initialViewId: v.optional(v.id("views")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("conversations", {
      dataroomId: args.dataroomId,
      teamId: args.teamId,
      title: args.title,
      isEnabled: args.isEnabled ?? true,
      visibilityMode: args.visibilityMode ?? "PRIVATE",
      dataroomDocumentId: args.dataroomDocumentId,
      documentVersionNumber: args.documentVersionNumber,
      documentPageNumber: args.documentPageNumber,
      linkId: args.linkId,
      viewerGroupId: args.viewerGroupId,
      initialViewId: args.initialViewId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("conversations"),
    title: v.optional(v.string()),
    isEnabled: v.optional(v.boolean()),
    visibilityMode: v.optional(v.string()),
    lastMessageAt: v.optional(v.number()),
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

export const remove = mutation({
  args: { id: v.id("conversations") },
  handler: async (ctx, args) => {
    // Delete messages
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.id))
      .collect();
    await Promise.all(messages.map((m) => ctx.db.delete(m._id)));

    // Delete participants
    const participants = await ctx.db
      .query("conversationParticipants")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.id))
      .collect();
    await Promise.all(participants.map((p) => ctx.db.delete(p._id)));

    // Delete conversation views
    const conversationViews = await ctx.db
      .query("conversationViews")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.id))
      .collect();
    await Promise.all(conversationViews.map((cv) => ctx.db.delete(cv._id)));

    await ctx.db.delete(args.id);
  },
});

// ==================== MESSAGE MUTATIONS ====================

export const createMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    userId: v.optional(v.id("users")),
    viewerId: v.optional(v.id("viewers")),
    viewId: v.optional(v.id("views")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Create the message
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      content: args.content,
      userId: args.userId,
      viewerId: args.viewerId,
      viewId: args.viewId,
      isRead: false,
      createdAt: now,
      updatedAt: now,
    });

    // Update conversation's lastMessageAt
    await ctx.db.patch(args.conversationId, {
      lastMessageAt: now,
      updatedAt: now,
    });

    return messageId;
  },
});

export const markMessageAsRead = mutation({
  args: { id: v.id("messages") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isRead: true, updatedAt: Date.now() });
    return await ctx.db.get(args.id);
  },
});

export const markConversationMessagesAsRead = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    const now = Date.now();
    await Promise.all(
      messages
        .filter((m) => !m.isRead)
        .map((m) => ctx.db.patch(m._id, { isRead: true, updatedAt: now }))
    );
  },
});

export const deleteMessage = mutation({
  args: { id: v.id("messages") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ==================== PARTICIPANT MUTATIONS ====================

export const addParticipant = mutation({
  args: {
    conversationId: v.id("conversations"),
    role: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    viewerId: v.optional(v.id("viewers")),
    receiveNotifications: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Check for existing participant
    if (args.userId) {
      const existing = await ctx.db
        .query("conversationParticipants")
        .withIndex("by_conversation_user", (q) =>
          q.eq("conversationId", args.conversationId).eq("userId", args.userId)
        )
        .unique();
      if (existing) return existing._id;
    }

    if (args.viewerId) {
      const existing = await ctx.db
        .query("conversationParticipants")
        .withIndex("by_conversation_viewer", (q) =>
          q.eq("conversationId", args.conversationId).eq("viewerId", args.viewerId)
        )
        .unique();
      if (existing) return existing._id;
    }

    return await ctx.db.insert("conversationParticipants", {
      conversationId: args.conversationId,
      role: args.role ?? "PARTICIPANT",
      userId: args.userId,
      viewerId: args.viewerId,
      receiveNotifications: args.receiveNotifications ?? false,
      createdAt: Date.now(),
    });
  },
});

export const updateParticipant = mutation({
  args: {
    id: v.id("conversationParticipants"),
    role: v.optional(v.string()),
    receiveNotifications: v.optional(v.boolean()),
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

export const removeParticipant = mutation({
  args: { id: v.id("conversationParticipants") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ==================== CONVERSATION VIEW MUTATIONS ====================

export const addConversationView = mutation({
  args: {
    conversationId: v.id("conversations"),
    viewId: v.id("views"),
  },
  handler: async (ctx, args) => {
    // Check for existing
    const existing = await ctx.db
      .query("conversationViews")
      .withIndex("by_conversation_view", (q) =>
        q.eq("conversationId", args.conversationId).eq("viewId", args.viewId)
      )
      .unique();

    if (existing) return existing._id;

    return await ctx.db.insert("conversationViews", {
      conversationId: args.conversationId,
      viewId: args.viewId,
      createdAt: Date.now(),
    });
  },
});

// ==================== FAQ ITEM QUERIES ====================

export const getFaqItemsByDataroom = query({
  args: {
    dataroomId: v.id("datarooms"),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let faqItems = await ctx.db
      .query("dataroomFaqItems")
      .withIndex("by_dataroom", (q) => q.eq("dataroomId", args.dataroomId))
      .collect();

    if (args.status) {
      faqItems = faqItems.filter((item) => item.status === args.status);
    }

    return faqItems;
  },
});

export const getPublishedFaqItems = query({
  args: { dataroomId: v.id("datarooms") },
  handler: async (ctx, args) => {
    // Query by dataroom first (more selective), then filter by status
    // This is more efficient than querying by status globally
    const items = await ctx.db
      .query("dataroomFaqItems")
      .withIndex("by_dataroom", (q) => q.eq("dataroomId", args.dataroomId))
      .collect();

    return items.filter((item) => item.status === "PUBLISHED");
  },
});

// ==================== FAQ ITEM MUTATIONS ====================

export const createFaqItem = mutation({
  args: {
    dataroomId: v.id("datarooms"),
    teamId: v.id("teams"),
    publishedByUserId: v.id("users"),
    editedQuestion: v.string(),
    answer: v.string(),
    title: v.optional(v.string()),
    originalQuestion: v.optional(v.string()),
    description: v.optional(v.string()),
    linkId: v.optional(v.id("links")),
    dataroomDocumentId: v.optional(v.id("dataroomDocuments")),
    sourceConversationId: v.optional(v.id("conversations")),
    questionMessageId: v.optional(v.id("messages")),
    answerMessageId: v.optional(v.id("messages")),
    visibilityMode: v.optional(v.string()),
    status: v.optional(v.string()),
    isAnonymized: v.optional(v.boolean()),
    tags: v.optional(v.array(v.string())),
    documentPageNumber: v.optional(v.number()),
    documentVersionNumber: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("dataroomFaqItems", {
      dataroomId: args.dataroomId,
      teamId: args.teamId,
      publishedByUserId: args.publishedByUserId,
      editedQuestion: args.editedQuestion,
      answer: args.answer,
      title: args.title,
      originalQuestion: args.originalQuestion,
      description: args.description,
      linkId: args.linkId,
      dataroomDocumentId: args.dataroomDocumentId,
      sourceConversationId: args.sourceConversationId,
      questionMessageId: args.questionMessageId,
      answerMessageId: args.answerMessageId,
      visibilityMode: args.visibilityMode ?? "PUBLIC_DATAROOM",
      status: args.status ?? "PUBLISHED",
      isAnonymized: args.isAnonymized ?? true,
      viewCount: 0,
      tags: args.tags ?? [],
      documentPageNumber: args.documentPageNumber,
      documentVersionNumber: args.documentVersionNumber,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateFaqItem = mutation({
  args: {
    id: v.id("dataroomFaqItems"),
    title: v.optional(v.string()),
    editedQuestion: v.optional(v.string()),
    answer: v.optional(v.string()),
    description: v.optional(v.string()),
    visibilityMode: v.optional(v.string()),
    status: v.optional(v.string()),
    isAnonymized: v.optional(v.boolean()),
    tags: v.optional(v.array(v.string())),
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

export const incrementFaqViewCount = mutation({
  args: { id: v.id("dataroomFaqItems") },
  handler: async (ctx, args) => {
    // Convex mutations are automatically serialized with OCC (Optimistic Concurrency Control).
    // If concurrent calls try to update the same document, Convex will retry failed transactions.
    const faqItem = await ctx.db.get(args.id);
    if (faqItem) {
      // Use nullish coalescing to handle undefined viewCount gracefully
      const currentCount = faqItem.viewCount ?? 0;
      await ctx.db.patch(args.id, { viewCount: currentCount + 1 });
    }
    return await ctx.db.get(args.id);
  },
});

export const deleteFaqItem = mutation({
  args: { id: v.id("dataroomFaqItems") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const archiveFaqItem = mutation({
  args: { id: v.id("dataroomFaqItems") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: "ARCHIVED", updatedAt: Date.now() });
    return await ctx.db.get(args.id);
  },
});
