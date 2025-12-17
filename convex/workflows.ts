import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ==================== WORKFLOW QUERIES ====================

export const getById = query({
  args: { id: v.id("workflows") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getByTeam = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("workflows")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();
  },
});

export const getByEntryLink = query({
  args: { entryLinkId: v.id("links") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("workflows")
      .withIndex("by_entry_link", (q) => q.eq("entryLinkId", args.entryLinkId))
      .unique();
  },
});

export const getActiveWorkflows = query({
  args: { teamId: v.optional(v.id("teams")) },
  handler: async (ctx, args) => {
    let workflows = await ctx.db
      .query("workflows")
      .withIndex("by_is_active", (q) => q.eq("isActive", true))
      .collect();

    if (args.teamId) {
      workflows = workflows.filter((w) => w.teamId === args.teamId);
    }

    return workflows;
  },
});

export const getWorkflowWithSteps = query({
  args: { id: v.id("workflows") },
  handler: async (ctx, args) => {
    const workflow = await ctx.db.get(args.id);
    if (!workflow) return null;

    const steps = await ctx.db
      .query("workflowSteps")
      .withIndex("by_workflow", (q) => q.eq("workflowId", args.id))
      .collect();

    // Sort steps by stepOrder
    steps.sort((a, b) => a.stepOrder - b.stepOrder);

    return { ...workflow, steps };
  },
});

export const getWorkflowSteps = query({
  args: { workflowId: v.id("workflows") },
  handler: async (ctx, args) => {
    const steps = await ctx.db
      .query("workflowSteps")
      .withIndex("by_workflow", (q) => q.eq("workflowId", args.workflowId))
      .collect();

    // Sort by stepOrder
    return steps.sort((a, b) => a.stepOrder - b.stepOrder);
  },
});

export const getWorkflowExecutions = query({
  args: {
    workflowId: v.id("workflows"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const executionsQuery = ctx.db
      .query("workflowExecutions")
      .withIndex("by_workflow_started", (q) => q.eq("workflowId", args.workflowId))
      .order("desc");

    if (args.limit) {
      return await executionsQuery.take(args.limit);
    }
    return await executionsQuery.collect();
  },
});

export const getExecutionWithLogs = query({
  args: { executionId: v.id("workflowExecutions") },
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.executionId);
    if (!execution) return null;

    const logs = await ctx.db
      .query("workflowStepLogs")
      .withIndex("by_execution", (q) => q.eq("executionId", args.executionId))
      .collect();

    return { ...execution, logs };
  },
});

// ==================== WORKFLOW MUTATIONS ====================

export const create = mutation({
  args: {
    name: v.string(),
    entryLinkId: v.id("links"),
    teamId: v.id("teams"),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("workflows", {
      name: args.name,
      description: args.description,
      entryLinkId: args.entryLinkId,
      teamId: args.teamId,
      isActive: args.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("workflows"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
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
  args: { id: v.id("workflows") },
  handler: async (ctx, args) => {
    // Delete steps
    const steps = await ctx.db
      .query("workflowSteps")
      .withIndex("by_workflow", (q) => q.eq("workflowId", args.id))
      .collect();
    await Promise.all(steps.map((s) => ctx.db.delete(s._id)));

    // Delete executions
    const executions = await ctx.db
      .query("workflowExecutions")
      .withIndex("by_workflow_started", (q) => q.eq("workflowId", args.id))
      .collect();

    for (const execution of executions) {
      // Delete step logs
      const logs = await ctx.db
        .query("workflowStepLogs")
        .withIndex("by_execution", (q) => q.eq("executionId", execution._id))
        .collect();
      await Promise.all(logs.map((l) => ctx.db.delete(l._id)));
      await ctx.db.delete(execution._id);
    }

    await ctx.db.delete(args.id);
  },
});

export const activate = mutation({
  args: { id: v.id("workflows") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isActive: true, updatedAt: Date.now() });
    return await ctx.db.get(args.id);
  },
});

export const deactivate = mutation({
  args: { id: v.id("workflows") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isActive: false, updatedAt: Date.now() });
    return await ctx.db.get(args.id);
  },
});

// ==================== WORKFLOW STEP MUTATIONS ====================

export const createStep = mutation({
  args: {
    workflowId: v.id("workflows"),
    name: v.string(),
    stepOrder: v.number(),
    stepType: v.optional(v.string()),
    conditions: v.any(),
    actions: v.any(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("workflowSteps", {
      workflowId: args.workflowId,
      name: args.name,
      stepOrder: args.stepOrder,
      stepType: args.stepType ?? "ROUTER",
      conditions: args.conditions,
      actions: args.actions,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateStep = mutation({
  args: {
    id: v.id("workflowSteps"),
    name: v.optional(v.string()),
    stepOrder: v.optional(v.number()),
    stepType: v.optional(v.string()),
    conditions: v.optional(v.any()),
    actions: v.optional(v.any()),
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

export const deleteStep = mutation({
  args: { id: v.id("workflowSteps") },
  handler: async (ctx, args) => {
    // Delete step logs
    const logs = await ctx.db
      .query("workflowStepLogs")
      .withIndex("by_workflow_step", (q) => q.eq("workflowStepId", args.id))
      .collect();
    await Promise.all(logs.map((l) => ctx.db.delete(l._id)));

    await ctx.db.delete(args.id);
  },
});

// ==================== WORKFLOW EXECUTION MUTATIONS ====================

export const createExecution = mutation({
  args: {
    workflowId: v.id("workflows"),
    visitorEmail: v.optional(v.string()),
    visitorIp: v.optional(v.string()),
    status: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("workflowExecutions", {
      workflowId: args.workflowId,
      visitorEmail: args.visitorEmail,
      visitorIp: args.visitorIp,
      status: args.status,
      startedAt: Date.now(),
      metadata: args.metadata,
    });
  },
});

export const updateExecution = mutation({
  args: {
    id: v.id("workflowExecutions"),
    status: v.optional(v.string()),
    completedAt: v.optional(v.number()),
    result: v.optional(v.any()),
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

export const completeExecution = mutation({
  args: {
    id: v.id("workflowExecutions"),
    result: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "COMPLETED",
      completedAt: Date.now(),
      result: args.result,
    });
    return await ctx.db.get(args.id);
  },
});

export const failExecution = mutation({
  args: {
    id: v.id("workflowExecutions"),
    result: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "FAILED",
      completedAt: Date.now(),
      result: args.result,
    });
    return await ctx.db.get(args.id);
  },
});

// ==================== WORKFLOW STEP LOG MUTATIONS ====================

export const createStepLog = mutation({
  args: {
    executionId: v.id("workflowExecutions"),
    workflowStepId: v.id("workflowSteps"),
    conditionsMatched: v.boolean(),
    conditionResults: v.optional(v.any()),
    actionsExecuted: v.optional(v.any()),
    duration: v.optional(v.number()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("workflowStepLogs", {
      executionId: args.executionId,
      workflowStepId: args.workflowStepId,
      conditionsMatched: args.conditionsMatched,
      conditionResults: args.conditionResults,
      actionsExecuted: args.actionsExecuted,
      executedAt: Date.now(),
      duration: args.duration,
      error: args.error,
    });
  },
});
