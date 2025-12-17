import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ==================== QUERIES ====================

export const getById = query({
  args: { id: v.id("teams") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getByStripeId = query({
  args: { stripeId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("teams")
      .withIndex("by_stripe_id", (q) => q.eq("stripeId", args.stripeId))
      .unique();
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("teams").collect();
  },
});

export const getTeamMembers = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    const userTeams = await ctx.db
      .query("userTeams")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    const members = await Promise.all(
      userTeams.map(async (ut) => {
        const user = await ctx.db.get(ut.userId);
        return {
          ...ut,
          user,
        };
      })
    );

    return members;
  },
});

export const getTeamWithBrand = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.teamId);
    if (!team) return null;

    const brand = await ctx.db
      .query("brands")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .unique();

    return { ...team, brand };
  },
});

export const getTeamDocuments = query({
  args: {
    teamId: v.id("teams"),
    folderId: v.optional(v.id("folders")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("documents")
      .withIndex("by_team_folder", (q) => {
        if (args.folderId) {
          return q.eq("teamId", args.teamId).eq("folderId", args.folderId);
        }
        return q.eq("teamId", args.teamId);
      });

    if (args.limit) {
      return await query.take(args.limit);
    }
    return await query.collect();
  },
});

export const getTeamDatarooms = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("datarooms")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();
  },
});

export const getTeamFolders = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("folders")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();
  },
});

export const getTeamDomains = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("domains")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();
  },
});

export const getTeamLinks = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("links")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();
  },
});

export const getTeamViews = query({
  args: {
    teamId: v.id("teams"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("views")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .order("desc");

    if (args.limit) {
      return await query.take(args.limit);
    }
    return await query.collect();
  },
});

export const getTeamViewers = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("viewers")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();
  },
});

export const getTeamAgreements = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agreements")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();
  },
});

export const getTeamTags = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tags")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();
  },
});

export const getTeamLinkPresets = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("linkPresets")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();
  },
});

export const getTeamWebhooks = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("webhooks")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();
  },
});

export const getTeamIntegrations = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    const installed = await ctx.db
      .query("installedIntegrations")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    const integrations = await Promise.all(
      installed.map(async (inst) => {
        const integration = await ctx.db.get(inst.integrationId);
        return { ...inst, integration };
      })
    );

    return integrations;
  },
});

// ==================== MUTATIONS ====================

export const create = mutation({
  args: {
    name: v.string(),
    plan: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("teams", {
      name: args.name,
      plan: args.plan ?? "free",
      enableExcelAdvancedMode: false,
      replicateDataroomFolders: true,
      agentsEnabled: false,
      ignoredDomains: [],
      globalBlockList: [],
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("teams"),
    name: v.optional(v.string()),
    plan: v.optional(v.string()),
    stripeId: v.optional(v.string()),
    subscriptionId: v.optional(v.string()),
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
    pausedAt: v.optional(v.number()),
    pauseStartsAt: v.optional(v.number()),
    pauseEndsAt: v.optional(v.number()),
    cancelledAt: v.optional(v.number()),
    limits: v.optional(v.any()),
    enableExcelAdvancedMode: v.optional(v.boolean()),
    replicateDataroomFolders: v.optional(v.boolean()),
    agentsEnabled: v.optional(v.boolean()),
    vectorStoreId: v.optional(v.string()),
    ignoredDomains: v.optional(v.array(v.string())),
    globalBlockList: v.optional(v.array(v.string())),
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
  args: { id: v.id("teams") },
  handler: async (ctx, args) => {
    // Cascading delete is handled by Convex when models reference with onDelete: Cascade
    // For safety, we manually delete related records

    // Delete user-team relationships
    const userTeams = await ctx.db
      .query("userTeams")
      .withIndex("by_team", (q) => q.eq("teamId", args.id))
      .collect();
    await Promise.all(userTeams.map((ut) => ctx.db.delete(ut._id)));

    // Delete documents (which cascade to versions, pages, etc.)
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_team", (q) => q.eq("teamId", args.id))
      .collect();
    await Promise.all(documents.map((d) => ctx.db.delete(d._id)));

    // Delete the team
    await ctx.db.delete(args.id);
  },
});

// ==================== USER-TEAM RELATIONSHIP MUTATIONS ====================

export const addMember = mutation({
  args: {
    userId: v.id("users"),
    teamId: v.id("teams"),
    role: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if relationship already exists
    const existing = await ctx.db
      .query("userTeams")
      .withIndex("by_user_team", (q) =>
        q.eq("userId", args.userId).eq("teamId", args.teamId)
      )
      .unique();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("userTeams", {
      userId: args.userId,
      teamId: args.teamId,
      role: args.role ?? "MEMBER",
      status: "ACTIVE",
    });
  },
});

export const updateMember = mutation({
  args: {
    userId: v.id("users"),
    teamId: v.id("teams"),
    role: v.optional(v.string()),
    status: v.optional(v.string()),
    blockedAt: v.optional(v.number()),
    notificationPreferences: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const userTeam = await ctx.db
      .query("userTeams")
      .withIndex("by_user_team", (q) =>
        q.eq("userId", args.userId).eq("teamId", args.teamId)
      )
      .unique();

    if (!userTeam) {
      throw new Error("User-team relationship not found");
    }

    const { userId, teamId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(userTeam._id, filteredUpdates);
    return await ctx.db.get(userTeam._id);
  },
});

export const removeMember = mutation({
  args: {
    userId: v.id("users"),
    teamId: v.id("teams"),
  },
  handler: async (ctx, args) => {
    const userTeam = await ctx.db
      .query("userTeams")
      .withIndex("by_user_team", (q) =>
        q.eq("userId", args.userId).eq("teamId", args.teamId)
      )
      .unique();

    if (userTeam) {
      await ctx.db.delete(userTeam._id);
    }
  },
});

// ==================== BRAND MUTATIONS ====================

export const createBrand = mutation({
  args: {
    teamId: v.id("teams"),
    logo: v.optional(v.string()),
    banner: v.optional(v.string()),
    brandColor: v.optional(v.string()),
    accentColor: v.optional(v.string()),
    welcomeMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("brands", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateBrand = mutation({
  args: {
    teamId: v.id("teams"),
    logo: v.optional(v.string()),
    banner: v.optional(v.string()),
    brandColor: v.optional(v.string()),
    accentColor: v.optional(v.string()),
    welcomeMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const brand = await ctx.db
      .query("brands")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .unique();

    const { teamId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    if (brand) {
      await ctx.db.patch(brand._id, { ...filteredUpdates, updatedAt: Date.now() });
      return await ctx.db.get(brand._id);
    } else {
      const now = Date.now();
      const id = await ctx.db.insert("brands", {
        teamId,
        ...filteredUpdates,
        createdAt: now,
        updatedAt: now,
      });
      return await ctx.db.get(id);
    }
  },
});

// ==================== INVITATION MUTATIONS ====================

export const createInvitation = mutation({
  args: {
    email: v.string(),
    teamId: v.id("teams"),
    token: v.string(),
    expires: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("invitations", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const getInvitationByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("invitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
  },
});

export const deleteInvitation = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (invitation) {
      await ctx.db.delete(invitation._id);
    }
  },
});

export const getTeamInvitations = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("invitations")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();
  },
});
