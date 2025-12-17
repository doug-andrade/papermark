import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ==================== WEBHOOK QUERIES ====================

export const getById = query({
  args: { id: v.id("webhooks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getByPId = query({
  args: { pId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("webhooks")
      .withIndex("by_pid", (q) => q.eq("pId", args.pId))
      .unique();
  },
});

export const getByTeam = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("webhooks")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();
  },
});

// ==================== WEBHOOK MUTATIONS ====================

export const create = mutation({
  args: {
    pId: v.string(),
    name: v.string(),
    url: v.string(),
    secret: v.string(),
    triggers: v.any(),
    teamId: v.id("teams"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("webhooks", {
      pId: args.pId,
      name: args.name,
      url: args.url,
      secret: args.secret,
      triggers: args.triggers,
      teamId: args.teamId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("webhooks"),
    name: v.optional(v.string()),
    url: v.optional(v.string()),
    secret: v.optional(v.string()),
    triggers: v.optional(v.any()),
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
  args: { id: v.id("webhooks") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ==================== INCOMING WEBHOOK QUERIES ====================

export const getIncomingById = query({
  args: { id: v.id("incomingWebhooks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getIncomingByExternalId = query({
  args: { externalId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("incomingWebhooks")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
      .unique();
  },
});

export const getIncomingByTeam = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("incomingWebhooks")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();
  },
});

// ==================== INCOMING WEBHOOK MUTATIONS ====================

export const createIncoming = mutation({
  args: {
    externalId: v.string(),
    name: v.string(),
    teamId: v.id("teams"),
    secret: v.optional(v.string()),
    source: v.optional(v.string()),
    actions: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("incomingWebhooks", {
      externalId: args.externalId,
      name: args.name,
      teamId: args.teamId,
      secret: args.secret,
      source: args.source,
      actions: args.actions,
      consecutiveFailures: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateIncoming = mutation({
  args: {
    id: v.id("incomingWebhooks"),
    name: v.optional(v.string()),
    secret: v.optional(v.string()),
    source: v.optional(v.string()),
    actions: v.optional(v.string()),
    consecutiveFailures: v.optional(v.number()),
    lastFailedAt: v.optional(v.number()),
    disabledAt: v.optional(v.number()),
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

export const recordIncomingFailure = mutation({
  args: { id: v.id("incomingWebhooks") },
  handler: async (ctx, args) => {
    const webhook = await ctx.db.get(args.id);
    if (!webhook) return null;

    const newFailures = webhook.consecutiveFailures + 1;
    await ctx.db.patch(args.id, {
      consecutiveFailures: newFailures,
      lastFailedAt: Date.now(),
      updatedAt: Date.now(),
    });
    return await ctx.db.get(args.id);
  },
});

export const resetIncomingFailures = mutation({
  args: { id: v.id("incomingWebhooks") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      consecutiveFailures: 0,
      lastFailedAt: undefined,
      updatedAt: Date.now(),
    });
    return await ctx.db.get(args.id);
  },
});

export const disableIncoming = mutation({
  args: { id: v.id("incomingWebhooks") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      disabledAt: Date.now(),
      updatedAt: Date.now(),
    });
    return await ctx.db.get(args.id);
  },
});

export const enableIncoming = mutation({
  args: { id: v.id("incomingWebhooks") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      disabledAt: undefined,
      consecutiveFailures: 0,
      updatedAt: Date.now(),
    });
    return await ctx.db.get(args.id);
  },
});

export const removeIncoming = mutation({
  args: { id: v.id("incomingWebhooks") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ==================== INTEGRATION QUERIES ====================

export const getIntegration = query({
  args: { id: v.id("integrations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getIntegrationBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("integrations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

export const listIntegrations = query({
  args: {
    verified: v.optional(v.boolean()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let integrations = await ctx.db.query("integrations").collect();

    if (args.verified !== undefined) {
      integrations = integrations.filter((i) => i.verified === args.verified);
    }

    if (args.category) {
      integrations = integrations.filter((i) => i.category === args.category);
    }

    return integrations;
  },
});

// ==================== INTEGRATION MUTATIONS ====================

export const createIntegration = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    developer: v.string(),
    website: v.string(),
    description: v.optional(v.string()),
    readme: v.optional(v.string()),
    logo: v.optional(v.string()),
    screenshots: v.optional(v.any()),
    verified: v.optional(v.boolean()),
    installUrl: v.optional(v.string()),
    category: v.optional(v.string()),
    comingSoon: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("integrations", {
      name: args.name,
      slug: args.slug,
      developer: args.developer,
      website: args.website,
      description: args.description,
      readme: args.readme,
      logo: args.logo,
      screenshots: args.screenshots,
      verified: args.verified ?? false,
      installUrl: args.installUrl,
      category: args.category,
      comingSoon: args.comingSoon ?? false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateIntegration = mutation({
  args: {
    id: v.id("integrations"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    readme: v.optional(v.string()),
    logo: v.optional(v.string()),
    screenshots: v.optional(v.any()),
    verified: v.optional(v.boolean()),
    installUrl: v.optional(v.string()),
    category: v.optional(v.string()),
    comingSoon: v.optional(v.boolean()),
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

export const deleteIntegration = mutation({
  args: { id: v.id("integrations") },
  handler: async (ctx, args) => {
    // Delete installed integrations
    const installed = await ctx.db
      .query("installedIntegrations")
      .withIndex("by_integration", (q) => q.eq("integrationId", args.id))
      .collect();
    await Promise.all(installed.map((i) => ctx.db.delete(i._id)));

    await ctx.db.delete(args.id);
  },
});

// ==================== INSTALLED INTEGRATION QUERIES ====================

export const getInstalledIntegration = query({
  args: { id: v.id("installedIntegrations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getInstalledByTeam = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    const installed = await ctx.db
      .query("installedIntegrations")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    // Get integration details
    const withDetails = await Promise.all(
      installed.map(async (inst) => {
        const integration = await ctx.db.get(inst.integrationId);
        return { ...inst, integration };
      })
    );

    return withDetails;
  },
});

export const getInstalledByTeamAndIntegration = query({
  args: {
    teamId: v.id("teams"),
    integrationId: v.id("integrations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("installedIntegrations")
      .withIndex("by_team_integration", (q) =>
        q.eq("teamId", args.teamId).eq("integrationId", args.integrationId)
      )
      .unique();
  },
});

// ==================== INSTALLED INTEGRATION MUTATIONS ====================

export const installIntegration = mutation({
  args: {
    integrationId: v.id("integrations"),
    teamId: v.id("teams"),
    userId: v.optional(v.id("users")),
    credentials: v.optional(v.any()),
    configuration: v.optional(v.any()),
    enabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Check if already installed
    const existing = await ctx.db
      .query("installedIntegrations")
      .withIndex("by_team_integration", (q) =>
        q.eq("teamId", args.teamId).eq("integrationId", args.integrationId)
      )
      .unique();

    if (existing) {
      return existing._id;
    }

    const now = Date.now();
    return await ctx.db.insert("installedIntegrations", {
      integrationId: args.integrationId,
      teamId: args.teamId,
      userId: args.userId,
      credentials: args.credentials,
      configuration: args.configuration,
      enabled: args.enabled ?? true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateInstalledIntegration = mutation({
  args: {
    id: v.id("installedIntegrations"),
    credentials: v.optional(v.any()),
    configuration: v.optional(v.any()),
    enabled: v.optional(v.boolean()),
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

export const uninstallIntegration = mutation({
  args: { id: v.id("installedIntegrations") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const enableInstalledIntegration = mutation({
  args: { id: v.id("installedIntegrations") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { enabled: true, updatedAt: Date.now() });
    return await ctx.db.get(args.id);
  },
});

export const disableInstalledIntegration = mutation({
  args: { id: v.id("installedIntegrations") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { enabled: false, updatedAt: Date.now() });
    return await ctx.db.get(args.id);
  },
});

// ==================== RESTRICTED TOKEN QUERIES ====================

export const getRestrictedToken = query({
  args: { id: v.id("restrictedTokens") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getRestrictedTokenByHashedKey = query({
  args: { hashedKey: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("restrictedTokens")
      .withIndex("by_hashed_key", (q) => q.eq("hashedKey", args.hashedKey))
      .unique();
  },
});

export const getRestrictedTokensByTeam = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("restrictedTokens")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();
  },
});

export const getRestrictedTokensByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("restrictedTokens")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

// ==================== RESTRICTED TOKEN MUTATIONS ====================

export const createRestrictedToken = mutation({
  args: {
    name: v.string(),
    hashedKey: v.string(),
    partialKey: v.string(),
    userId: v.id("users"),
    teamId: v.id("teams"),
    scopes: v.optional(v.string()),
    expires: v.optional(v.number()),
    rateLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("restrictedTokens", {
      name: args.name,
      hashedKey: args.hashedKey,
      partialKey: args.partialKey,
      userId: args.userId,
      teamId: args.teamId,
      scopes: args.scopes,
      expires: args.expires,
      rateLimit: args.rateLimit ?? 60,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateRestrictedToken = mutation({
  args: {
    id: v.id("restrictedTokens"),
    name: v.optional(v.string()),
    scopes: v.optional(v.string()),
    expires: v.optional(v.number()),
    rateLimit: v.optional(v.number()),
    lastUsed: v.optional(v.number()),
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

export const recordTokenUsage = mutation({
  args: { id: v.id("restrictedTokens") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { lastUsed: Date.now() });
    return await ctx.db.get(args.id);
  },
});

export const deleteRestrictedToken = mutation({
  args: { id: v.id("restrictedTokens") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
