import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// ==================== SCHEMA DEFINITION ====================
// This schema mirrors the Prisma schema for Papermark
// All relationships are handled via foreign key fields

export default defineSchema({
  // ==================== AUTH & USERS ====================

  accounts: defineTable({
    userId: v.id("users"),
    type: v.string(),
    provider: v.string(),
    providerAccountId: v.string(),
    refreshToken: v.optional(v.string()),
    accessToken: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    tokenType: v.optional(v.string()),
    scope: v.optional(v.string()),
    idToken: v.optional(v.string()),
    sessionState: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_provider_account", ["provider", "providerAccountId"]),

  sessions: defineTable({
    sessionToken: v.string(),
    userId: v.id("users"),
    expires: v.number(), // Unix timestamp
  })
    .index("by_session_token", ["sessionToken"])
    .index("by_user", ["userId"]),

  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerified: v.optional(v.number()), // Unix timestamp
    image: v.optional(v.string()),
    contactId: v.optional(v.string()),
    plan: v.string(), // "free" | "pro" | "business" | "datarooms" | "enterprise"
    stripeId: v.optional(v.string()),
    subscriptionId: v.optional(v.string()),
    startsAt: v.optional(v.number()), // Unix timestamp
    endsAt: v.optional(v.number()), // Unix timestamp
    createdAt: v.number(), // Unix timestamp
  })
    .index("by_email", ["email"])
    .index("by_stripe_id", ["stripeId"])
    .index("by_subscription_id", ["subscriptionId"]),

  verificationTokens: defineTable({
    identifier: v.string(),
    token: v.string(),
    expires: v.number(), // Unix timestamp
  })
    .index("by_token", ["token"])
    .index("by_identifier_token", ["identifier", "token"]),

  // ==================== TEAMS & PERMISSIONS ====================

  teams: defineTable({
    name: v.string(),
    plan: v.string(), // "free" | "pro" | "business" | "datarooms" | "enterprise"
    stripeId: v.optional(v.string()),
    subscriptionId: v.optional(v.string()),
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
    pausedAt: v.optional(v.number()),
    pauseStartsAt: v.optional(v.number()),
    pauseEndsAt: v.optional(v.number()),
    cancelledAt: v.optional(v.number()),
    limits: v.optional(v.any()), // JSON object for plan limits
    enableExcelAdvancedMode: v.boolean(),
    replicateDataroomFolders: v.boolean(),
    agentsEnabled: v.boolean(),
    vectorStoreId: v.optional(v.string()),
    ignoredDomains: v.array(v.string()),
    globalBlockList: v.array(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_stripe_id", ["stripeId"])
    .index("by_subscription_id", ["subscriptionId"]),

  userTeams: defineTable({
    role: v.string(), // "ADMIN" | "MANAGER" | "MEMBER"
    status: v.string(), // "ACTIVE" | "INACTIVE"
    userId: v.id("users"),
    teamId: v.id("teams"),
    blockedAt: v.optional(v.number()),
    notificationPreferences: v.optional(v.any()), // JSON
  })
    .index("by_user", ["userId"])
    .index("by_team", ["teamId"])
    .index("by_user_team", ["userId", "teamId"]),

  // ==================== DOCUMENTS ====================

  documents: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    file: v.string(), // Storage reference
    originalFile: v.optional(v.string()),
    type: v.optional(v.string()), // "pdf" | "sheet" | etc.
    contentType: v.optional(v.string()), // MIME type
    storageType: v.string(), // "S3_PATH" | "VERCEL_BLOB"
    numPages: v.optional(v.number()),
    teamId: v.id("teams"),
    ownerId: v.optional(v.id("users")),
    assistantEnabled: v.boolean(),
    advancedExcelEnabled: v.boolean(),
    agentsEnabled: v.boolean(),
    downloadOnly: v.boolean(),
    folderId: v.optional(v.id("folders")),
    isExternalUpload: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_team", ["teamId"])
    .index("by_folder", ["folderId"])
    .index("by_team_folder", ["teamId", "folderId"])
    .index("by_team_name", ["teamId", "name"]),

  documentVersions: defineTable({
    versionNumber: v.number(),
    documentId: v.id("documents"),
    file: v.string(),
    originalFile: v.optional(v.string()),
    type: v.optional(v.string()),
    contentType: v.optional(v.string()),
    fileSize: v.optional(v.number()), // BigInt as number
    storageType: v.string(),
    numPages: v.optional(v.number()),
    isPrimary: v.boolean(),
    isVertical: v.boolean(),
    fileId: v.optional(v.string()),
    vectorStoreFileId: v.optional(v.string()),
    hasPages: v.boolean(),
    length: v.optional(v.number()), // Video length in seconds
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_document", ["documentId"])
    .index("by_document_version", ["documentId", "versionNumber"])
    .index("by_document_primary", ["documentId", "isPrimary"])
    .index("by_document_created", ["documentId", "createdAt"]),

  documentPages: defineTable({
    versionId: v.id("documentVersions"),
    pageNumber: v.number(),
    embeddedLinks: v.array(v.string()),
    pageLinks: v.optional(v.any()), // JSON array
    metadata: v.optional(v.any()), // JSON
    file: v.string(),
    storageType: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_version", ["versionId"])
    .index("by_version_page", ["versionId", "pageNumber"]),

  folders: defineTable({
    name: v.string(),
    path: v.string(), // Materialized path starting with "/"
    parentId: v.optional(v.id("folders")),
    teamId: v.id("teams"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_parent", ["parentId"])
    .index("by_team", ["teamId"])
    .index("by_team_path", ["teamId", "path"]),

  documentUploads: defineTable({
    documentId: v.id("documents"),
    teamId: v.id("teams"),
    viewerId: v.optional(v.id("viewers")),
    viewId: v.optional(v.id("views")),
    linkId: v.id("links"),
    dataroomId: v.optional(v.id("datarooms")),
    dataroomDocumentId: v.optional(v.id("dataroomDocuments")),
    originalFilename: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    numPages: v.optional(v.number()),
    mimeType: v.optional(v.string()),
    uploadedAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_document", ["documentId"])
    .index("by_viewer", ["viewerId"])
    .index("by_view", ["viewId"])
    .index("by_link", ["linkId"])
    .index("by_team", ["teamId"])
    .index("by_dataroom", ["dataroomId"])
    .index("by_dataroom_document", ["dataroomDocumentId"]),

  documentAnnotations: defineTable({
    title: v.string(),
    content: v.any(), // JSON - Rich text content
    pages: v.array(v.number()),
    documentId: v.id("documents"),
    teamId: v.id("teams"),
    createdById: v.id("users"),
    isVisible: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_document", ["documentId"])
    .index("by_team", ["teamId"])
    .index("by_created_by", ["createdById"]),

  annotationImages: defineTable({
    filename: v.string(),
    url: v.string(),
    size: v.optional(v.number()),
    mimeType: v.optional(v.string()),
    annotationId: v.id("documentAnnotations"),
    createdAt: v.number(),
  }).index("by_annotation", ["annotationId"]),

  // ==================== LINKS ====================

  links: defineTable({
    documentId: v.optional(v.id("documents")),
    dataroomId: v.optional(v.id("datarooms")),
    linkType: v.string(), // "DOCUMENT_LINK" | "DATAROOM_LINK" | "WORKFLOW_LINK"
    url: v.optional(v.string()),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    password: v.optional(v.string()),
    allowList: v.array(v.string()),
    denyList: v.array(v.string()),
    emailProtected: v.boolean(),
    emailAuthenticated: v.boolean(),
    allowDownload: v.optional(v.boolean()),
    isArchived: v.boolean(),
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
    watermarkConfig: v.optional(v.any()), // JSON
    audienceType: v.string(), // "GENERAL" | "GROUP" | "TEAM"
    groupId: v.optional(v.id("viewerGroups")),
    permissionGroupId: v.optional(v.id("permissionGroups")),
    metaTitle: v.optional(v.string()),
    metaDescription: v.optional(v.string()),
    metaImage: v.optional(v.string()),
    metaFavicon: v.optional(v.string()),
    enableCustomMetatag: v.optional(v.boolean()),
    welcomeMessage: v.optional(v.string()),
    enableConversation: v.boolean(),
    enableAIAgents: v.optional(v.boolean()),
    enableUpload: v.optional(v.boolean()),
    isFileRequestOnly: v.optional(v.boolean()),
    uploadFolderId: v.optional(v.string()),
    enableIndexFile: v.optional(v.boolean()),
    teamId: v.optional(v.id("teams")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_url", ["url"])
    .index("by_document", ["documentId"])
    .index("by_dataroom", ["dataroomId"])
    .index("by_team", ["teamId"])
    .index("by_domain_slug", ["domainSlug", "slug"])
    .index("by_document_archived", ["documentId", "isArchived"])
    .index("by_permission_group", ["permissionGroupId"])
    .index("by_deleted_at", ["deletedAt"]),

  linkPresets: defineTable({
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
    allowList: v.array(v.string()),
    enableDenyList: v.optional(v.boolean()),
    denyList: v.array(v.string()),
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
    isDefault: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_team", ["teamId"])
    .index("by_pid", ["pId"]),

  customFields: defineTable({
    type: v.string(), // "SHORT_TEXT" | "LONG_TEXT" | "NUMBER" | "PHONE_NUMBER" | "URL" | "CHECKBOX" | "SELECT" | "MULTI_SELECT"
    identifier: v.string(),
    label: v.string(),
    placeholder: v.optional(v.string()),
    required: v.boolean(),
    disabled: v.boolean(),
    linkId: v.id("links"),
    orderIndex: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_link", ["linkId"]),

  customFieldResponses: defineTable({
    data: v.any(), // JSON
    viewId: v.id("views"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_view", ["viewId"]),

  // ==================== DOMAINS ====================

  domains: defineTable({
    slug: v.string(),
    userId: v.optional(v.id("users")),
    teamId: v.id("teams"),
    verified: v.boolean(),
    isDefault: v.boolean(),
    lastChecked: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_user", ["userId"])
    .index("by_team", ["teamId"]),

  // ==================== VIEWS & ANALYTICS ====================

  views: defineTable({
    linkId: v.id("links"),
    documentId: v.optional(v.id("documents")),
    dataroomId: v.optional(v.id("datarooms")),
    dataroomViewId: v.optional(v.string()),
    viewerEmail: v.optional(v.string()),
    viewerName: v.optional(v.string()),
    verified: v.boolean(),
    viewedAt: v.number(),
    downloadedAt: v.optional(v.number()),
    downloadType: v.optional(v.string()), // "SINGLE" | "BULK" | "FOLDER"
    downloadMetadata: v.optional(v.any()), // JSON
    viewType: v.string(), // "DOCUMENT_VIEW" | "DATAROOM_VIEW"
    viewerId: v.optional(v.id("viewers")),
    groupId: v.optional(v.id("viewerGroups")),
    isArchived: v.boolean(),
    teamId: v.optional(v.id("teams")),
  })
    .index("by_link", ["linkId"])
    .index("by_document", ["documentId"])
    .index("by_dataroom", ["dataroomId"])
    .index("by_dataroom_view", ["dataroomViewId"])
    .index("by_viewer", ["viewerId"])
    .index("by_group", ["groupId"])
    .index("by_team", ["teamId"])
    .index("by_viewed_at", ["viewedAt"])
    .index("by_viewer_document", ["viewerId", "documentId"])
    .index("by_viewer_email", ["viewerEmail"])
    .index("by_document_archived", ["documentId", "isArchived"])
    .index("by_document_viewed_at", ["documentId", "viewedAt"]),

  viewers: defineTable({
    email: v.string(),
    verified: v.boolean(),
    invitedAt: v.optional(v.number()),
    notificationPreferences: v.optional(v.any()), // JSON
    dataroomId: v.optional(v.id("datarooms")),
    teamId: v.id("teams"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_team_email", ["teamId", "email"])
    .index("by_team", ["teamId"])
    .index("by_dataroom", ["dataroomId"]),

  reactions: defineTable({
    viewId: v.id("views"),
    pageNumber: v.number(),
    type: v.string(), // "like" | "dislike" | "love" | etc.
    createdAt: v.number(),
  })
    .index("by_view", ["viewId"])
    .index("by_view_type", ["viewId", "type"]),

  viewerInvitations: defineTable({
    viewerId: v.id("viewers"),
    linkId: v.id("links"),
    groupId: v.optional(v.id("viewerGroups")),
    invitedBy: v.string(),
    customMessage: v.optional(v.string()),
    sentAt: v.number(),
    status: v.string(), // "SENT" | "FAILED" | "BOUNCED"
    createdAt: v.number(),
  })
    .index("by_viewer", ["viewerId"])
    .index("by_link", ["linkId"])
    .index("by_group", ["groupId"]),

  // ==================== DATAROOMS ====================

  datarooms: defineTable({
    pId: v.string(), // Public ID like "dr_1234"
    name: v.string(),
    description: v.optional(v.string()),
    teamId: v.id("teams"),
    conversationsEnabled: v.boolean(),
    agentsEnabled: v.boolean(),
    vectorStoreId: v.optional(v.string()),
    enableChangeNotifications: v.boolean(),
    defaultPermissionStrategy: v.string(), // "INHERIT_FROM_PARENT" | "ASK_EVERY_TIME" | "HIDDEN_BY_DEFAULT"
    allowBulkDownload: v.boolean(),
    showLastUpdated: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_pid", ["pId"])
    .index("by_team", ["teamId"]),

  dataroomDocuments: defineTable({
    dataroomId: v.id("datarooms"),
    documentId: v.id("documents"),
    folderId: v.optional(v.id("dataroomFolders")),
    orderIndex: v.optional(v.number()),
    hierarchicalIndex: v.optional(v.string()),
    vectorStoreFileId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_dataroom", ["dataroomId"])
    .index("by_document", ["documentId"])
    .index("by_folder", ["folderId"])
    .index("by_dataroom_document", ["dataroomId", "documentId"])
    .index("by_dataroom_folder_order", ["dataroomId", "folderId", "orderIndex"]),

  dataroomFolders: defineTable({
    name: v.string(),
    path: v.string(),
    parentId: v.optional(v.id("dataroomFolders")),
    dataroomId: v.id("datarooms"),
    orderIndex: v.optional(v.number()),
    hierarchicalIndex: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_parent", ["parentId"])
    .index("by_dataroom", ["dataroomId"])
    .index("by_dataroom_path", ["dataroomId", "path"])
    .index("by_dataroom_parent_order", ["dataroomId", "parentId", "orderIndex"]),

  dataroomBrands: defineTable({
    logo: v.optional(v.string()),
    banner: v.optional(v.string()),
    brandColor: v.optional(v.string()),
    accentColor: v.optional(v.string()),
    welcomeMessage: v.optional(v.string()),
    dataroomId: v.id("datarooms"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_dataroom", ["dataroomId"]),

  viewerGroups: defineTable({
    name: v.string(),
    domains: v.array(v.string()),
    allowAll: v.boolean(),
    dataroomId: v.id("datarooms"),
    teamId: v.id("teams"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_dataroom", ["dataroomId"])
    .index("by_team", ["teamId"])
    .index("by_dataroom_created", ["dataroomId", "createdAt"]),

  viewerGroupMemberships: defineTable({
    viewerId: v.id("viewers"),
    groupId: v.id("viewerGroups"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_viewer", ["viewerId"])
    .index("by_group", ["groupId"])
    .index("by_viewer_group", ["viewerId", "groupId"]),

  viewerGroupAccessControls: defineTable({
    groupId: v.id("viewerGroups"),
    itemId: v.string(), // Document or dataroom item ID
    itemType: v.string(), // "DATAROOM_DOCUMENT" | "DATAROOM_FOLDER"
    canView: v.boolean(),
    canDownload: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_group", ["groupId"])
    .index("by_group_item", ["groupId", "itemId"]),

  permissionGroups: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    dataroomId: v.id("datarooms"),
    teamId: v.id("teams"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_dataroom", ["dataroomId"])
    .index("by_team", ["teamId"]),

  permissionGroupAccessControls: defineTable({
    groupId: v.id("permissionGroups"),
    itemId: v.string(),
    itemType: v.string(), // "DATAROOM_DOCUMENT" | "DATAROOM_FOLDER"
    canView: v.boolean(),
    canDownload: v.boolean(),
    canDownloadOriginal: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_group", ["groupId"])
    .index("by_group_item", ["groupId", "itemId"]),

  // ==================== CONVERSATIONS & MESSAGES ====================

  conversations: defineTable({
    title: v.optional(v.string()),
    isEnabled: v.boolean(),
    visibilityMode: v.string(), // "PRIVATE" | "PUBLIC_LINK" | "PUBLIC_GROUP" | "PUBLIC_DOCUMENT" | "PUBLIC_DATAROOM"
    dataroomId: v.id("datarooms"),
    dataroomDocumentId: v.optional(v.id("dataroomDocuments")),
    documentVersionNumber: v.optional(v.number()),
    documentPageNumber: v.optional(v.number()),
    linkId: v.optional(v.id("links")),
    viewerGroupId: v.optional(v.id("viewerGroups")),
    initialViewId: v.optional(v.id("views")),
    teamId: v.id("teams"),
    lastMessageAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_dataroom", ["dataroomId"])
    .index("by_dataroom_document", ["dataroomDocumentId"])
    .index("by_link", ["linkId"])
    .index("by_team", ["teamId"])
    .index("by_viewer_group", ["viewerGroupId"])
    .index("by_initial_view", ["initialViewId"]),

  conversationParticipants: defineTable({
    conversationId: v.id("conversations"),
    role: v.string(), // "OWNER" | "PARTICIPANT"
    viewerId: v.optional(v.id("viewers")),
    userId: v.optional(v.id("users")),
    receiveNotifications: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_viewer", ["viewerId"])
    .index("by_user", ["userId"])
    .index("by_conversation_viewer", ["conversationId", "viewerId"])
    .index("by_conversation_user", ["conversationId", "userId"]),

  messages: defineTable({
    content: v.string(),
    conversationId: v.id("conversations"),
    userId: v.optional(v.id("users")),
    viewerId: v.optional(v.id("viewers")),
    viewId: v.optional(v.id("views")),
    isRead: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_user", ["userId"])
    .index("by_viewer", ["viewerId"])
    .index("by_view", ["viewId"]),

  conversationViews: defineTable({
    conversationId: v.id("conversations"),
    viewId: v.id("views"),
    createdAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_view", ["viewId"])
    .index("by_conversation_view", ["conversationId", "viewId"]),

  dataroomFaqItems: defineTable({
    title: v.optional(v.string()),
    editedQuestion: v.string(),
    originalQuestion: v.optional(v.string()),
    answer: v.string(),
    description: v.optional(v.string()),
    dataroomId: v.id("datarooms"),
    linkId: v.optional(v.id("links")),
    dataroomDocumentId: v.optional(v.id("dataroomDocuments")),
    sourceConversationId: v.optional(v.id("conversations")),
    questionMessageId: v.optional(v.id("messages")),
    answerMessageId: v.optional(v.id("messages")),
    teamId: v.id("teams"),
    publishedByUserId: v.id("users"),
    visibilityMode: v.string(), // "PUBLIC_DATAROOM" | "PUBLIC_LINK" | "PUBLIC_DOCUMENT"
    status: v.string(), // "DRAFT" | "PUBLISHED" | "ARCHIVED"
    isAnonymized: v.boolean(),
    viewCount: v.number(),
    tags: v.array(v.string()),
    documentPageNumber: v.optional(v.number()),
    documentVersionNumber: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_dataroom", ["dataroomId"])
    .index("by_link", ["linkId"])
    .index("by_dataroom_document", ["dataroomDocumentId"])
    .index("by_source_conversation", ["sourceConversationId"])
    .index("by_team", ["teamId"])
    .index("by_published_by", ["publishedByUserId"])
    .index("by_status", ["status"])
    .index("by_visibility_mode", ["visibilityMode"])
    .index("by_created_at", ["createdAt"]),

  // ==================== AI CHATS ====================

  chats: defineTable({
    title: v.optional(v.string()),
    teamId: v.id("teams"),
    documentId: v.optional(v.id("documents")),
    dataroomId: v.optional(v.id("datarooms")),
    linkId: v.optional(v.id("links")),
    viewId: v.optional(v.id("views")),
    userId: v.optional(v.id("users")),
    viewerId: v.optional(v.id("viewers")),
    vectorStoreId: v.optional(v.string()),
    lastMessageAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_team", ["teamId"])
    .index("by_document", ["documentId"])
    .index("by_dataroom", ["dataroomId"])
    .index("by_link", ["linkId"])
    .index("by_user", ["userId"])
    .index("by_viewer", ["viewerId"])
    .index("by_view", ["viewId"])
    .index("by_created_at", ["createdAt"]),

  chatMessages: defineTable({
    chatId: v.id("chats"),
    role: v.string(), // "user" | "assistant" | "system"
    content: v.string(),
    metadata: v.optional(v.any()), // JSON
    createdAt: v.number(),
  })
    .index("by_chat", ["chatId"])
    .index("by_chat_created", ["chatId", "createdAt"]),

  // ==================== FEEDBACK & AGREEMENTS ====================

  feedback: defineTable({
    linkId: v.id("links"),
    data: v.any(), // JSON
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_link", ["linkId"]),

  feedbackResponses: defineTable({
    feedbackId: v.id("feedback"),
    data: v.any(), // JSON
    viewId: v.id("views"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_feedback", ["feedbackId"])
    .index("by_view", ["viewId"]),

  agreements: defineTable({
    name: v.string(),
    content: v.string(),
    contentType: v.string(), // "LINK" | "TEXT"
    requireName: v.boolean(),
    teamId: v.id("teams"),
    deletedAt: v.optional(v.number()),
    deletedBy: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_team", ["teamId"]),

  agreementResponses: defineTable({
    agreementId: v.id("agreements"),
    viewId: v.id("views"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_agreement", ["agreementId"])
    .index("by_view", ["viewId"]),

  // ==================== BRANDS ====================

  brands: defineTable({
    logo: v.optional(v.string()),
    banner: v.optional(v.string()),
    brandColor: v.optional(v.string()),
    accentColor: v.optional(v.string()),
    welcomeMessage: v.optional(v.string()),
    teamId: v.id("teams"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_team", ["teamId"]),

  // ==================== INVITATIONS ====================

  invitations: defineTable({
    email: v.string(),
    expires: v.number(),
    teamId: v.id("teams"),
    token: v.string(),
    createdAt: v.number(),
  })
    .index("by_team", ["teamId"])
    .index("by_token", ["token"])
    .index("by_email_team", ["email", "teamId"]),

  // ==================== EMAILS ====================

  sentEmails: defineTable({
    type: v.string(), // EmailType enum
    recipient: v.string(),
    marketing: v.boolean(),
    teamId: v.id("teams"),
    domainSlug: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_team", ["teamId"]),

  // ==================== WEBHOOKS ====================

  webhooks: defineTable({
    pId: v.string(), // Public ID
    name: v.string(),
    url: v.string(),
    secret: v.string(),
    triggers: v.any(), // JSON
    teamId: v.id("teams"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_team", ["teamId"])
    .index("by_pid", ["pId"]),

  incomingWebhooks: defineTable({
    externalId: v.string(),
    name: v.string(),
    secret: v.optional(v.string()),
    source: v.optional(v.string()),
    actions: v.optional(v.string()),
    consecutiveFailures: v.number(),
    lastFailedAt: v.optional(v.number()),
    disabledAt: v.optional(v.number()),
    teamId: v.id("teams"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_team", ["teamId"])
    .index("by_external_id", ["externalId"]),

  // ==================== TOKENS ====================

  restrictedTokens: defineTable({
    name: v.string(),
    hashedKey: v.string(),
    partialKey: v.string(),
    scopes: v.optional(v.string()),
    expires: v.optional(v.number()),
    lastUsed: v.optional(v.number()),
    rateLimit: v.number(),
    userId: v.id("users"),
    teamId: v.id("teams"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_team", ["teamId"])
    .index("by_hashed_key", ["hashedKey"]),

  // ==================== TAGS ====================

  tags: defineTable({
    name: v.string(),
    color: v.string(),
    description: v.optional(v.string()),
    teamId: v.id("teams"),
    createdBy: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_team", ["teamId"])
    .index("by_team_name", ["teamId", "name"])
    .index("by_name", ["name"]),

  tagItems: defineTable({
    tagId: v.id("tags"),
    itemType: v.string(), // "LINK_TAG" | "DOCUMENT_TAG" | "DATAROOM_TAG"
    linkId: v.optional(v.id("links")),
    documentId: v.optional(v.id("documents")),
    dataroomId: v.optional(v.id("datarooms")),
    taggedBy: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tag", ["tagId"])
    .index("by_tag_link", ["tagId", "linkId"])
    .index("by_tag_document", ["tagId", "documentId"])
    .index("by_tag_dataroom", ["tagId", "dataroomId"]),

  // ==================== WORKFLOWS ====================

  workflows: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    entryLinkId: v.id("links"),
    teamId: v.id("teams"),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_entry_link", ["entryLinkId"])
    .index("by_team", ["teamId"])
    .index("by_is_active", ["isActive"]),

  workflowSteps: defineTable({
    workflowId: v.id("workflows"),
    name: v.string(),
    stepOrder: v.number(),
    stepType: v.string(), // "ROUTER"
    conditions: v.any(), // JSON
    actions: v.any(), // JSON
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workflow", ["workflowId"])
    .index("by_workflow_order", ["workflowId", "stepOrder"]),

  workflowExecutions: defineTable({
    workflowId: v.id("workflows"),
    visitorEmail: v.optional(v.string()),
    visitorIp: v.optional(v.string()),
    status: v.string(), // "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "BLOCKED"
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    result: v.optional(v.any()), // JSON
    metadata: v.optional(v.any()), // JSON
  })
    .index("by_workflow_started", ["workflowId", "startedAt"])
    .index("by_visitor_email", ["visitorEmail"])
    .index("by_status", ["status"]),

  workflowStepLogs: defineTable({
    executionId: v.id("workflowExecutions"),
    workflowStepId: v.id("workflowSteps"),
    conditionsMatched: v.boolean(),
    conditionResults: v.optional(v.any()), // JSON
    actionsExecuted: v.optional(v.any()), // JSON
    executedAt: v.number(),
    duration: v.optional(v.number()),
    error: v.optional(v.string()),
  })
    .index("by_execution", ["executionId"])
    .index("by_workflow_step", ["workflowStepId"]),

  // ==================== INTEGRATIONS ====================

  integrations: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    readme: v.optional(v.string()),
    developer: v.string(),
    website: v.string(),
    logo: v.optional(v.string()),
    screenshots: v.optional(v.any()), // JSON
    verified: v.boolean(),
    installUrl: v.optional(v.string()),
    category: v.optional(v.string()),
    comingSoon: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_slug", ["slug"]),

  installedIntegrations: defineTable({
    credentials: v.optional(v.any()), // JSON
    configuration: v.optional(v.any()), // JSON
    enabled: v.boolean(),
    integrationId: v.id("integrations"),
    userId: v.optional(v.id("users")),
    teamId: v.id("teams"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_team", ["teamId"])
    .index("by_integration", ["integrationId"])
    .index("by_team_integration", ["teamId", "integrationId"]),

  // ==================== YEAR IN REVIEW ====================

  yearInReviews: defineTable({
    teamId: v.string(),
    status: v.string(), // "pending" | "processing" | "completed" | "failed"
    attempts: v.number(),
    lastAttempted: v.optional(v.number()),
    error: v.optional(v.string()),
    stats: v.any(), // JSON
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_team", ["teamId"])
    .index("by_status_attempts", ["status", "attempts"]),
});
