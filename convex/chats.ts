import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ==================== CHAT QUERIES ====================

export const getById = query({
  args: { id: v.id("chats") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getByTeam = query({
  args: {
    teamId: v.id("teams"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("chats")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .order("desc");

    if (args.limit) {
      return await query.take(args.limit);
    }
    return await query.collect();
  },
});

export const getByDocument = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chats")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .collect();
  },
});

export const getByDataroom = query({
  args: { dataroomId: v.id("datarooms") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chats")
      .withIndex("by_dataroom", (q) => q.eq("dataroomId", args.dataroomId))
      .collect();
  },
});

export const getByUser = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("chats")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc");

    if (args.limit) {
      return await query.take(args.limit);
    }
    return await query.collect();
  },
});

export const getByViewer = query({
  args: {
    viewerId: v.id("viewers"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("chats")
      .withIndex("by_viewer", (q) => q.eq("viewerId", args.viewerId))
      .order("desc");

    if (args.limit) {
      return await query.take(args.limit);
    }
    return await query.collect();
  },
});

export const getChatWithMessages = query({
  args: { id: v.id("chats") },
  handler: async (ctx, args) => {
    const chat = await ctx.db.get(args.id);
    if (!chat) return null;

    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_chat", (q) => q.eq("chatId", args.id))
      .order("asc")
      .collect();

    return { ...chat, messages };
  },
});

export const getChatMessages = query({
  args: {
    chatId: v.id("chats"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("chatMessages")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .order("asc");

    if (args.limit) {
      return await query.take(args.limit);
    }
    return await query.collect();
  },
});

// ==================== CHAT MUTATIONS ====================

export const create = mutation({
  args: {
    teamId: v.id("teams"),
    title: v.optional(v.string()),
    documentId: v.optional(v.id("documents")),
    dataroomId: v.optional(v.id("datarooms")),
    linkId: v.optional(v.id("links")),
    viewId: v.optional(v.id("views")),
    userId: v.optional(v.id("users")),
    viewerId: v.optional(v.id("viewers")),
    vectorStoreId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("chats", {
      teamId: args.teamId,
      title: args.title,
      documentId: args.documentId,
      dataroomId: args.dataroomId,
      linkId: args.linkId,
      viewId: args.viewId,
      userId: args.userId,
      viewerId: args.viewerId,
      vectorStoreId: args.vectorStoreId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("chats"),
    title: v.optional(v.string()),
    vectorStoreId: v.optional(v.string()),
    lastMessageAt: v.optional(v.number()),
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
  args: { id: v.id("chats") },
  handler: async (ctx, args) => {
    // Delete messages
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_chat", (q) => q.eq("chatId", args.id))
      .collect();
    await Promise.all(messages.map((m) => ctx.db.delete(m._id)));

    await ctx.db.delete(args.id);
  },
});

// ==================== CHAT MESSAGE MUTATIONS ====================

export const createMessage = mutation({
  args: {
    chatId: v.id("chats"),
    role: v.string(),
    content: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Create the message
    const messageId = await ctx.db.insert("chatMessages", {
      chatId: args.chatId,
      role: args.role,
      content: args.content,
      metadata: args.metadata,
      createdAt: now,
    });

    // Update chat's lastMessageAt
    await ctx.db.patch(args.chatId, {
      lastMessageAt: now,
      updatedAt: now,
    });

    return messageId;
  },
});

export const updateMessage = mutation({
  args: {
    id: v.id("chatMessages"),
    content: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(id, filteredUpdates);
    return await ctx.db.get(id);
  },
});

export const deleteMessage = mutation({
  args: { id: v.id("chatMessages") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
