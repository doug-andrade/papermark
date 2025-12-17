import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// ==================== QUERIES ====================

export const getById = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
  },
});

export const getByStripeId = query({
  args: { stripeId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_stripe_id", (q) => q.eq("stripeId", args.stripeId))
      .unique();
  },
});

export const list = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100; // Default limit to prevent unbounded queries
    let query = ctx.db.query("users");

    // Apply pagination
    const results = await query.take(limit + 1);

    const hasMore = results.length > limit;
    const users = hasMore ? results.slice(0, limit) : results;

    return {
      users,
      hasMore,
      nextCursor: hasMore ? users[users.length - 1]?._id : undefined,
    };
  },
});

export const getUserTeams = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const userTeams = await ctx.db
      .query("userTeams")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const teams = await Promise.all(
      userTeams.map(async (ut) => {
        const team = await ctx.db.get(ut.teamId);
        return {
          ...ut,
          team,
        };
      })
    );

    return teams;
  },
});

export const getUserAccounts = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("accounts")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const getUserSessions = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

// ==================== MUTATIONS ====================

export const create = mutation({
  args: {
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerified: v.optional(v.number()),
    image: v.optional(v.string()),
    plan: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      emailVerified: args.emailVerified,
      image: args.image,
      plan: args.plan ?? "free",
      createdAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerified: v.optional(v.number()),
    image: v.optional(v.string()),
    plan: v.optional(v.string()),
    stripeId: v.optional(v.string()),
    subscriptionId: v.optional(v.string()),
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
    contactId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    // Filter out undefined values
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(id, filteredUpdates);
    return await ctx.db.get(id);
  },
});

export const remove = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    // Delete associated accounts
    const accounts = await ctx.db
      .query("accounts")
      .withIndex("by_user", (q) => q.eq("userId", args.id))
      .collect();
    await Promise.all(accounts.map((a) => ctx.db.delete(a._id)));

    // Delete associated sessions
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", args.id))
      .collect();
    await Promise.all(sessions.map((s) => ctx.db.delete(s._id)));

    // Delete user
    await ctx.db.delete(args.id);
  },
});

// ==================== ACCOUNT MUTATIONS ====================

export const createAccount = mutation({
  args: {
    userId: v.id("users"),
    type: v.string(),
    provider: v.string(),
    providerAccountId: v.string(),
    refresh_token: v.optional(v.string()),
    access_token: v.optional(v.string()),
    expires_at: v.optional(v.number()),
    token_type: v.optional(v.string()),
    scope: v.optional(v.string()),
    id_token: v.optional(v.string()),
    session_state: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Map OAuth field names to our schema field names
    return await ctx.db.insert("accounts", {
      userId: args.userId,
      type: args.type,
      provider: args.provider,
      providerAccountId: args.providerAccountId,
      refreshToken: args.refresh_token,
      accessToken: args.access_token,
      expiresAt: args.expires_at,
      tokenType: args.token_type,
      scope: args.scope,
      idToken: args.id_token,
      sessionState: args.session_state,
    });
  },
});

export const deleteAccount = mutation({
  args: {
    provider: v.string(),
    providerAccountId: v.string(),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("accounts")
      .withIndex("by_provider_account", (q) =>
        q.eq("provider", args.provider).eq("providerAccountId", args.providerAccountId)
      )
      .unique();
    if (account) {
      await ctx.db.delete(account._id);
    }
  },
});

// ==================== SESSION MUTATIONS ====================

export const createSession = mutation({
  args: {
    sessionToken: v.string(),
    userId: v.id("users"),
    expires: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("sessions", args);
  },
});

export const getSessionByToken = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sessions")
      .withIndex("by_session_token", (q) => q.eq("sessionToken", args.sessionToken))
      .unique();
  },
});

export const updateSession = mutation({
  args: {
    sessionToken: v.string(),
    expires: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_session_token", (q) => q.eq("sessionToken", args.sessionToken))
      .unique();

    if (session && args.expires) {
      await ctx.db.patch(session._id, { expires: args.expires });
    }
    return session;
  },
});

export const deleteSession = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_session_token", (q) => q.eq("sessionToken", args.sessionToken))
      .unique();
    if (session) {
      await ctx.db.delete(session._id);
    }
  },
});

// ==================== VERIFICATION TOKEN MUTATIONS ====================

export const createVerificationToken = mutation({
  args: {
    identifier: v.string(),
    token: v.string(),
    expires: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("verificationTokens", args);
  },
});

export const getVerificationToken = query({
  args: {
    identifier: v.string(),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("verificationTokens")
      .withIndex("by_identifier_token", (q) =>
        q.eq("identifier", args.identifier).eq("token", args.token)
      )
      .unique();
  },
});

export const deleteVerificationToken = mutation({
  args: { id: v.id("verificationTokens") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const useVerificationToken = mutation({
  args: {
    identifier: v.string(),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const verificationToken = await ctx.db
      .query("verificationTokens")
      .withIndex("by_identifier_token", (q) =>
        q.eq("identifier", args.identifier).eq("token", args.token)
      )
      .unique();

    if (verificationToken) {
      await ctx.db.delete(verificationToken._id);
    }
    return verificationToken;
  },
});

// ==================== AUTH ADAPTER HELPERS ====================

export const getAccountByProviderAccountId = query({
  args: {
    provider: v.string(),
    providerAccountId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("accounts")
      .withIndex("by_provider_account", (q) =>
        q.eq("provider", args.provider).eq("providerAccountId", args.providerAccountId)
      )
      .unique();
  },
});

export const deleteUser = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    // Delete associated accounts
    const accounts = await ctx.db
      .query("accounts")
      .withIndex("by_user", (q) => q.eq("userId", args.id))
      .collect();
    await Promise.all(accounts.map((a) => ctx.db.delete(a._id)));

    // Delete associated sessions
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", args.id))
      .collect();
    await Promise.all(sessions.map((s) => ctx.db.delete(s._id)));

    // Delete user
    await ctx.db.delete(args.id);
  },
});

export const deleteAccountById = mutation({
  args: { id: v.id("accounts") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const deleteSessionById = mutation({
  args: { id: v.id("sessions") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const updateSessionById = mutation({
  args: {
    id: v.id("sessions"),
    expires: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    if (Object.keys(filteredUpdates).length > 0) {
      await ctx.db.patch(id, filteredUpdates);
    }
    return await ctx.db.get(id);
  },
});
