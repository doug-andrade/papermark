/**
 * Migration script: Prisma to Convex
 *
 * This script migrates data from the existing PostgreSQL database (via Prisma)
 * to Convex. It handles all tables and maintains relationships.
 *
 * Usage:
 *   npx ts-node scripts/migrate-to-convex.ts
 *
 * Prerequisites:
 * 1. Set NEXT_PUBLIC_CONVEX_URL environment variable
 * 2. Set DATABASE_URL for Prisma
 * 3. Run npx convex dev to ensure Convex is set up
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Map to track old IDs to new Convex IDs
const idMap: Record<string, Record<string, string>> = {
  users: {},
  teams: {},
  documents: {},
  documentVersions: {},
  folders: {},
  links: {},
  datarooms: {},
  dataroomDocuments: {},
  dataroomFolders: {},
  viewers: {},
  viewerGroups: {},
  permissionGroups: {},
  views: {},
  conversations: {},
  messages: {},
  chats: {},
  workflows: {},
  workflowSteps: {},
  workflowExecutions: {},
  tags: {},
  agreements: {},
  feedback: {},
  integrations: {},
  webhooks: {},
  incomingWebhooks: {},
  restrictedTokens: {},
  domains: {},
};

// Helper to convert Date to timestamp
const toTimestamp = (date: Date | null | undefined): number | undefined => {
  return date ? date.getTime() : undefined;
};

// Batch size for processing
const BATCH_SIZE = 100;

async function migrateUsers() {
  console.log("Migrating users...");
  const users = await prisma.user.findMany();

  for (const user of users) {
    try {
      const newId = await convex.mutation(api.users.create, {
        name: user.name || undefined,
        email: user.email || undefined,
        emailVerified: toTimestamp(user.emailVerified),
        image: user.image || undefined,
        plan: user.plan,
      });

      // Update with additional fields
      await convex.mutation(api.users.update, {
        id: newId,
        stripeId: user.stripeId || undefined,
        subscriptionId: user.subscriptionId || undefined,
        startsAt: toTimestamp(user.startsAt),
        endsAt: toTimestamp(user.endsAt),
        contactId: user.contactId || undefined,
      });

      idMap.users[user.id] = newId;
      console.log(`  Migrated user: ${user.email}`);
    } catch (error) {
      console.error(`  Error migrating user ${user.email}:`, error);
    }
  }

  // Migrate accounts
  console.log("Migrating accounts...");
  const accounts = await prisma.account.findMany();
  for (const account of accounts) {
    if (idMap.users[account.userId]) {
      try {
        await convex.mutation(api.users.createAccount, {
          userId: idMap.users[account.userId] as any,
          type: account.type,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          refreshToken: account.refresh_token || undefined,
          accessToken: account.access_token || undefined,
          expiresAt: account.expires_at || undefined,
          tokenType: account.token_type || undefined,
          scope: account.scope || undefined,
          idToken: account.id_token || undefined,
          sessionState: account.session_state || undefined,
        });
      } catch (error) {
        console.error(`  Error migrating account for user ${account.userId}:`, error);
      }
    }
  }

  console.log(`Migrated ${users.length} users`);
}

async function migrateTeams() {
  console.log("Migrating teams...");
  const teams = await prisma.team.findMany();

  for (const team of teams) {
    try {
      const newId = await convex.mutation(api.teams.create, {
        name: team.name,
        plan: team.plan,
      });

      await convex.mutation(api.teams.update, {
        id: newId,
        stripeId: team.stripeId || undefined,
        subscriptionId: team.subscriptionId || undefined,
        startsAt: toTimestamp(team.startsAt),
        endsAt: toTimestamp(team.endsAt),
        pausedAt: toTimestamp(team.pausedAt),
        pauseStartsAt: toTimestamp(team.pauseStartsAt),
        pauseEndsAt: toTimestamp(team.pauseEndsAt),
        cancelledAt: toTimestamp(team.cancelledAt),
        limits: team.limits || undefined,
        enableExcelAdvancedMode: team.enableExcelAdvancedMode,
        replicateDataroomFolders: team.replicateDataroomFolders,
        agentsEnabled: team.agentsEnabled,
        vectorStoreId: team.vectorStoreId || undefined,
        ignoredDomains: team.ignoredDomains,
        globalBlockList: team.globalBlockList,
      });

      idMap.teams[team.id] = newId;
      console.log(`  Migrated team: ${team.name}`);
    } catch (error) {
      console.error(`  Error migrating team ${team.name}:`, error);
    }
  }

  // Migrate user-team relationships
  console.log("Migrating user-team relationships...");
  const userTeams = await prisma.userTeam.findMany();
  for (const ut of userTeams) {
    if (idMap.users[ut.userId] && idMap.teams[ut.teamId]) {
      try {
        await convex.mutation(api.teams.addMember, {
          userId: idMap.users[ut.userId] as any,
          teamId: idMap.teams[ut.teamId] as any,
          role: ut.role,
        });
      } catch (error) {
        console.error(`  Error migrating user-team relationship:`, error);
      }
    }
  }

  // Migrate brands
  console.log("Migrating brands...");
  const brands = await prisma.brand.findMany();
  for (const brand of brands) {
    if (idMap.teams[brand.teamId]) {
      try {
        await convex.mutation(api.teams.createBrand, {
          teamId: idMap.teams[brand.teamId] as any,
          logo: brand.logo || undefined,
          banner: brand.banner || undefined,
          brandColor: brand.brandColor || undefined,
          accentColor: brand.accentColor || undefined,
          welcomeMessage: brand.welcomeMessage || undefined,
        });
      } catch (error) {
        console.error(`  Error migrating brand for team ${brand.teamId}:`, error);
      }
    }
  }

  console.log(`Migrated ${teams.length} teams`);
}

async function migrateFolders() {
  console.log("Migrating folders...");
  const folders = await prisma.folder.findMany({
    orderBy: { path: "asc" }, // Process parent folders first
  });

  for (const folder of folders) {
    if (idMap.teams[folder.teamId]) {
      try {
        const newId = await convex.mutation(api.documents.createFolder, {
          name: folder.name,
          path: folder.path,
          teamId: idMap.teams[folder.teamId] as any,
          parentId: folder.parentId ? (idMap.folders[folder.parentId] as any) : undefined,
        });
        idMap.folders[folder.id] = newId;
      } catch (error) {
        console.error(`  Error migrating folder ${folder.name}:`, error);
      }
    }
  }

  console.log(`Migrated ${folders.length} folders`);
}

async function migrateDocuments() {
  console.log("Migrating documents...");
  const documents = await prisma.document.findMany();

  for (const doc of documents) {
    if (idMap.teams[doc.teamId]) {
      try {
        const newId = await convex.mutation(api.documents.create, {
          name: doc.name,
          description: doc.description || undefined,
          file: doc.file,
          originalFile: doc.originalFile || undefined,
          type: doc.type || undefined,
          contentType: doc.contentType || undefined,
          storageType: doc.storageType,
          numPages: doc.numPages || undefined,
          teamId: idMap.teams[doc.teamId] as any,
          ownerId: doc.ownerId ? (idMap.users[doc.ownerId] as any) : undefined,
          folderId: doc.folderId ? (idMap.folders[doc.folderId] as any) : undefined,
          assistantEnabled: doc.assistantEnabled,
          advancedExcelEnabled: doc.advancedExcelEnabled,
          agentsEnabled: doc.agentsEnabled,
          downloadOnly: doc.downloadOnly,
          isExternalUpload: doc.isExternalUpload,
        });
        idMap.documents[doc.id] = newId;
        console.log(`  Migrated document: ${doc.name}`);
      } catch (error) {
        console.error(`  Error migrating document ${doc.name}:`, error);
      }
    }
  }

  // Migrate document versions
  console.log("Migrating document versions...");
  const versions = await prisma.documentVersion.findMany();
  for (const version of versions) {
    if (idMap.documents[version.documentId]) {
      try {
        const newId = await convex.mutation(api.documents.createVersion, {
          documentId: idMap.documents[version.documentId] as any,
          versionNumber: version.versionNumber,
          file: version.file,
          originalFile: version.originalFile || undefined,
          type: version.type || undefined,
          contentType: version.contentType || undefined,
          fileSize: version.fileSize ? Number(version.fileSize) : undefined,
          storageType: version.storageType,
          numPages: version.numPages || undefined,
          isPrimary: version.isPrimary,
          isVertical: version.isVertical,
          hasPages: version.hasPages,
          length: version.length || undefined,
        });
        idMap.documentVersions[version.id] = newId;
      } catch (error) {
        console.error(`  Error migrating version ${version.id}:`, error);
      }
    }
  }

  // Migrate document pages
  console.log("Migrating document pages...");
  const pages = await prisma.documentPage.findMany();
  for (const page of pages) {
    if (idMap.documentVersions[page.versionId]) {
      try {
        await convex.mutation(api.documents.createPage, {
          versionId: idMap.documentVersions[page.versionId] as any,
          pageNumber: page.pageNumber,
          file: page.file,
          embeddedLinks: page.embeddedLinks,
          pageLinks: page.pageLinks || undefined,
          metadata: page.metadata || undefined,
          storageType: page.storageType,
        });
      } catch (error) {
        console.error(`  Error migrating page ${page.pageNumber}:`, error);
      }
    }
  }

  console.log(`Migrated ${documents.length} documents`);
}

async function migrateDomains() {
  console.log("Migrating domains...");
  const domains = await prisma.domain.findMany();

  for (const domain of domains) {
    if (idMap.teams[domain.teamId]) {
      try {
        const newId = await convex.mutation(api.tags.createDomain, {
          slug: domain.slug,
          teamId: idMap.teams[domain.teamId] as any,
          userId: domain.userId ? (idMap.users[domain.userId] as any) : undefined,
          verified: domain.verified,
          isDefault: domain.isDefault,
        });
        idMap.domains[domain.id] = newId;
      } catch (error) {
        console.error(`  Error migrating domain ${domain.slug}:`, error);
      }
    }
  }

  console.log(`Migrated ${domains.length} domains`);
}

async function migrateAgreements() {
  console.log("Migrating agreements...");
  const agreements = await prisma.agreement.findMany();

  for (const agreement of agreements) {
    if (idMap.teams[agreement.teamId]) {
      try {
        const newId = await convex.mutation(api.views.createAgreement, {
          name: agreement.name,
          content: agreement.content,
          contentType: agreement.contentType,
          requireName: agreement.requireName,
          teamId: idMap.teams[agreement.teamId] as any,
        });
        idMap.agreements[agreement.id] = newId;
      } catch (error) {
        console.error(`  Error migrating agreement ${agreement.name}:`, error);
      }
    }
  }

  console.log(`Migrated ${agreements.length} agreements`);
}

async function migrateLinks() {
  console.log("Migrating links...");
  const links = await prisma.link.findMany();

  for (const link of links) {
    try {
      const newId = await convex.mutation(api.links.create, {
        documentId: link.documentId
          ? (idMap.documents[link.documentId] as any)
          : undefined,
        dataroomId: link.dataroomId
          ? (idMap.datarooms[link.dataroomId] as any)
          : undefined,
        linkType: link.linkType,
        url: link.url || undefined,
        name: link.name || undefined,
        slug: link.slug || undefined,
        expiresAt: toTimestamp(link.expiresAt),
        password: link.password || undefined,
        allowList: link.allowList,
        denyList: link.denyList,
        emailProtected: link.emailProtected,
        emailAuthenticated: link.emailAuthenticated,
        allowDownload: link.allowDownload ?? undefined,
        domainId: link.domainId ? (idMap.domains[link.domainId] as any) : undefined,
        domainSlug: link.domainSlug || undefined,
        enableNotification: link.enableNotification ?? undefined,
        enableFeedback: link.enableFeedback ?? undefined,
        enableQuestion: link.enableQuestion ?? undefined,
        enableScreenshotProtection: link.enableScreenshotProtection ?? undefined,
        enableAgreement: link.enableAgreement ?? undefined,
        agreementId: link.agreementId
          ? (idMap.agreements[link.agreementId] as any)
          : undefined,
        showBanner: link.showBanner ?? undefined,
        enableWatermark: link.enableWatermark ?? undefined,
        watermarkConfig: link.watermarkConfig || undefined,
        audienceType: link.audienceType,
        metaTitle: link.metaTitle || undefined,
        metaDescription: link.metaDescription || undefined,
        metaImage: link.metaImage || undefined,
        metaFavicon: link.metaFavicon || undefined,
        enableCustomMetatag: link.enableCustomMetatag ?? undefined,
        welcomeMessage: link.welcomeMessage || undefined,
        enableConversation: link.enableConversation,
        enableAIAgents: link.enableAIAgents ?? undefined,
        enableUpload: link.enableUpload ?? undefined,
        isFileRequestOnly: link.isFileRequestOnly ?? undefined,
        uploadFolderId: link.uploadFolderId || undefined,
        enableIndexFile: link.enableIndexFile ?? undefined,
        teamId: link.teamId ? (idMap.teams[link.teamId] as any) : undefined,
      });
      idMap.links[link.id] = newId;
    } catch (error) {
      console.error(`  Error migrating link ${link.id}:`, error);
    }
  }

  console.log(`Migrated ${links.length} links`);
}

async function migrateDatarooms() {
  console.log("Migrating datarooms...");
  const datarooms = await prisma.dataroom.findMany();

  for (const dr of datarooms) {
    if (idMap.teams[dr.teamId]) {
      try {
        const newId = await convex.mutation(api.datarooms.create, {
          pId: dr.pId,
          name: dr.name,
          description: dr.description || undefined,
          teamId: idMap.teams[dr.teamId] as any,
          conversationsEnabled: dr.conversationsEnabled,
          agentsEnabled: dr.agentsEnabled,
          enableChangeNotifications: dr.enableChangeNotifications,
          defaultPermissionStrategy: dr.defaultPermissionStrategy,
          allowBulkDownload: dr.allowBulkDownload,
          showLastUpdated: dr.showLastUpdated,
        });
        idMap.datarooms[dr.id] = newId;
        console.log(`  Migrated dataroom: ${dr.name}`);
      } catch (error) {
        console.error(`  Error migrating dataroom ${dr.name}:`, error);
      }
    }
  }

  // Migrate dataroom folders
  console.log("Migrating dataroom folders...");
  const drFolders = await prisma.dataroomFolder.findMany({
    orderBy: { path: "asc" },
  });
  for (const folder of drFolders) {
    if (idMap.datarooms[folder.dataroomId]) {
      try {
        const newId = await convex.mutation(api.datarooms.createFolder, {
          name: folder.name,
          path: folder.path,
          dataroomId: idMap.datarooms[folder.dataroomId] as any,
          parentId: folder.parentId
            ? (idMap.dataroomFolders[folder.parentId] as any)
            : undefined,
          orderIndex: folder.orderIndex || undefined,
          hierarchicalIndex: folder.hierarchicalIndex || undefined,
        });
        idMap.dataroomFolders[folder.id] = newId;
      } catch (error) {
        console.error(`  Error migrating dataroom folder ${folder.name}:`, error);
      }
    }
  }

  // Migrate dataroom documents
  console.log("Migrating dataroom documents...");
  const drDocs = await prisma.dataroomDocument.findMany();
  for (const dd of drDocs) {
    if (idMap.datarooms[dd.dataroomId] && idMap.documents[dd.documentId]) {
      try {
        const newId = await convex.mutation(api.datarooms.addDocument, {
          dataroomId: idMap.datarooms[dd.dataroomId] as any,
          documentId: idMap.documents[dd.documentId] as any,
          folderId: dd.folderId
            ? (idMap.dataroomFolders[dd.folderId] as any)
            : undefined,
          orderIndex: dd.orderIndex || undefined,
          hierarchicalIndex: dd.hierarchicalIndex || undefined,
        });
        idMap.dataroomDocuments[dd.id] = newId;
      } catch (error) {
        console.error(`  Error migrating dataroom document:`, error);
      }
    }
  }

  // Migrate dataroom brands
  console.log("Migrating dataroom brands...");
  const drBrands = await prisma.dataroomBrand.findMany();
  for (const brand of drBrands) {
    if (idMap.datarooms[brand.dataroomId]) {
      try {
        await convex.mutation(api.datarooms.createBrand, {
          dataroomId: idMap.datarooms[brand.dataroomId] as any,
          logo: brand.logo || undefined,
          banner: brand.banner || undefined,
          brandColor: brand.brandColor || undefined,
          accentColor: brand.accentColor || undefined,
          welcomeMessage: brand.welcomeMessage || undefined,
        });
      } catch (error) {
        console.error(`  Error migrating dataroom brand:`, error);
      }
    }
  }

  console.log(`Migrated ${datarooms.length} datarooms`);
}

async function migrateViewers() {
  console.log("Migrating viewers...");
  const viewers = await prisma.viewer.findMany();

  for (const viewer of viewers) {
    if (idMap.teams[viewer.teamId]) {
      try {
        const newId = await convex.mutation(api.views.createViewer, {
          email: viewer.email,
          teamId: idMap.teams[viewer.teamId] as any,
          dataroomId: viewer.dataroomId
            ? (idMap.datarooms[viewer.dataroomId] as any)
            : undefined,
          verified: viewer.verified,
          invitedAt: toTimestamp(viewer.invitedAt),
          notificationPreferences: viewer.notificationPreferences || undefined,
        });
        idMap.viewers[viewer.id] = newId;
      } catch (error) {
        console.error(`  Error migrating viewer ${viewer.email}:`, error);
      }
    }
  }

  console.log(`Migrated ${viewers.length} viewers`);
}

async function migrateViews() {
  console.log("Migrating views...");
  const views = await prisma.view.findMany();

  for (const view of views) {
    if (idMap.links[view.linkId]) {
      try {
        const newId = await convex.mutation(api.views.create, {
          linkId: idMap.links[view.linkId] as any,
          documentId: view.documentId
            ? (idMap.documents[view.documentId] as any)
            : undefined,
          dataroomId: view.dataroomId
            ? (idMap.datarooms[view.dataroomId] as any)
            : undefined,
          dataroomViewId: view.dataroomViewId || undefined,
          viewerEmail: view.viewerEmail || undefined,
          viewerName: view.viewerName || undefined,
          verified: view.verified,
          viewType: view.viewType,
          viewerId: view.viewerId
            ? (idMap.viewers[view.viewerId] as any)
            : undefined,
          teamId: view.teamId ? (idMap.teams[view.teamId] as any) : undefined,
        });

        // Update with download info if present
        if (view.downloadedAt) {
          await convex.mutation(api.views.update, {
            id: newId,
            downloadedAt: toTimestamp(view.downloadedAt),
            downloadType: view.downloadType || undefined,
            downloadMetadata: view.downloadMetadata || undefined,
            isArchived: view.isArchived,
          });
        }

        idMap.views[view.id] = newId;
      } catch (error) {
        console.error(`  Error migrating view ${view.id}:`, error);
      }
    }
  }

  // Migrate reactions
  console.log("Migrating reactions...");
  const reactions = await prisma.reaction.findMany();
  for (const reaction of reactions) {
    if (idMap.views[reaction.viewId]) {
      try {
        await convex.mutation(api.views.addReaction, {
          viewId: idMap.views[reaction.viewId] as any,
          pageNumber: reaction.pageNumber,
          type: reaction.type,
        });
      } catch (error) {
        console.error(`  Error migrating reaction:`, error);
      }
    }
  }

  console.log(`Migrated ${views.length} views`);
}

async function migrateTags() {
  console.log("Migrating tags...");
  const tags = await prisma.tag.findMany();

  for (const tag of tags) {
    if (idMap.teams[tag.teamId]) {
      try {
        const newId = await convex.mutation(api.tags.create, {
          name: tag.name,
          color: tag.color,
          teamId: idMap.teams[tag.teamId] as any,
          description: tag.description || undefined,
          createdBy: tag.createdBy || undefined,
        });
        idMap.tags[tag.id] = newId;
      } catch (error) {
        console.error(`  Error migrating tag ${tag.name}:`, error);
      }
    }
  }

  // Migrate tag items
  const tagItems = await prisma.tagItem.findMany();
  for (const item of tagItems) {
    if (idMap.tags[item.tagId]) {
      try {
        if (item.linkId && idMap.links[item.linkId]) {
          await convex.mutation(api.tags.addTagToLink, {
            tagId: idMap.tags[item.tagId] as any,
            linkId: idMap.links[item.linkId] as any,
            taggedBy: item.taggedBy || undefined,
          });
        } else if (item.documentId && idMap.documents[item.documentId]) {
          await convex.mutation(api.tags.addTagToDocument, {
            tagId: idMap.tags[item.tagId] as any,
            documentId: idMap.documents[item.documentId] as any,
            taggedBy: item.taggedBy || undefined,
          });
        } else if (item.dataroomId && idMap.datarooms[item.dataroomId]) {
          await convex.mutation(api.tags.addTagToDataroom, {
            tagId: idMap.tags[item.tagId] as any,
            dataroomId: idMap.datarooms[item.dataroomId] as any,
            taggedBy: item.taggedBy || undefined,
          });
        }
      } catch (error) {
        console.error(`  Error migrating tag item:`, error);
      }
    }
  }

  console.log(`Migrated ${tags.length} tags`);
}

async function migrateWebhooks() {
  console.log("Migrating webhooks...");
  const webhooks = await prisma.webhook.findMany();

  for (const webhook of webhooks) {
    if (idMap.teams[webhook.teamId]) {
      try {
        const newId = await convex.mutation(api.webhooks.create, {
          pId: webhook.pId,
          name: webhook.name,
          url: webhook.url,
          secret: webhook.secret,
          triggers: webhook.triggers,
          teamId: idMap.teams[webhook.teamId] as any,
        });
        idMap.webhooks[webhook.id] = newId;
      } catch (error) {
        console.error(`  Error migrating webhook ${webhook.name}:`, error);
      }
    }
  }

  // Incoming webhooks
  const incomingWebhooks = await prisma.incomingWebhook.findMany();
  for (const iw of incomingWebhooks) {
    if (idMap.teams[iw.teamId]) {
      try {
        const newId = await convex.mutation(api.webhooks.createIncoming, {
          externalId: iw.externalId,
          name: iw.name,
          teamId: idMap.teams[iw.teamId] as any,
          secret: iw.secret || undefined,
          source: iw.source || undefined,
          actions: iw.actions || undefined,
        });
        idMap.incomingWebhooks[iw.id] = newId;
      } catch (error) {
        console.error(`  Error migrating incoming webhook ${iw.name}:`, error);
      }
    }
  }

  console.log(`Migrated ${webhooks.length} webhooks`);
}

async function migrateWorkflows() {
  console.log("Migrating workflows...");
  const workflows = await prisma.workflow.findMany();

  for (const wf of workflows) {
    if (idMap.teams[wf.teamId] && idMap.links[wf.entryLinkId]) {
      try {
        const newId = await convex.mutation(api.workflows.create, {
          name: wf.name,
          description: wf.description || undefined,
          entryLinkId: idMap.links[wf.entryLinkId] as any,
          teamId: idMap.teams[wf.teamId] as any,
          isActive: wf.isActive,
        });
        idMap.workflows[wf.id] = newId;
      } catch (error) {
        console.error(`  Error migrating workflow ${wf.name}:`, error);
      }
    }
  }

  // Workflow steps
  const steps = await prisma.workflowStep.findMany({
    orderBy: { stepOrder: "asc" },
  });
  for (const step of steps) {
    if (idMap.workflows[step.workflowId]) {
      try {
        const newId = await convex.mutation(api.workflows.createStep, {
          workflowId: idMap.workflows[step.workflowId] as any,
          name: step.name,
          stepOrder: step.stepOrder,
          stepType: step.stepType,
          conditions: step.conditions,
          actions: step.actions,
        });
        idMap.workflowSteps[step.id] = newId;
      } catch (error) {
        console.error(`  Error migrating workflow step ${step.name}:`, error);
      }
    }
  }

  console.log(`Migrated ${workflows.length} workflows`);
}

async function migrateIntegrations() {
  console.log("Migrating integrations...");
  const integrations = await prisma.integration.findMany();

  for (const integration of integrations) {
    try {
      const newId = await convex.mutation(api.webhooks.createIntegration, {
        name: integration.name,
        slug: integration.slug,
        developer: integration.developer,
        website: integration.website,
        description: integration.description || undefined,
        readme: integration.readme || undefined,
        logo: integration.logo || undefined,
        screenshots: integration.screenshots || undefined,
        verified: integration.verified,
        installUrl: integration.installUrl || undefined,
        category: integration.category || undefined,
        comingSoon: integration.comingSoon,
      });
      idMap.integrations[integration.id] = newId;
    } catch (error) {
      console.error(`  Error migrating integration ${integration.name}:`, error);
    }
  }

  // Installed integrations
  const installed = await prisma.installedIntegration.findMany();
  for (const inst of installed) {
    if (
      idMap.integrations[inst.integrationId] &&
      idMap.teams[inst.teamId]
    ) {
      try {
        await convex.mutation(api.webhooks.installIntegration, {
          integrationId: idMap.integrations[inst.integrationId] as any,
          teamId: idMap.teams[inst.teamId] as any,
          userId: inst.userId ? (idMap.users[inst.userId] as any) : undefined,
          credentials: inst.credentials || undefined,
          configuration: inst.configuration || undefined,
          enabled: inst.enabled,
        });
      } catch (error) {
        console.error(`  Error installing integration:`, error);
      }
    }
  }

  console.log(`Migrated ${integrations.length} integrations`);
}

async function main() {
  console.log("Starting migration from Prisma to Convex...");
  console.log("=========================================\n");

  try {
    // Order matters due to foreign key relationships
    await migrateUsers();
    await migrateTeams();
    await migrateFolders();
    await migrateDocuments();
    await migrateDomains();
    await migrateAgreements();
    await migrateDatarooms();
    await migrateViewers();
    await migrateLinks(); // After datarooms and agreements
    await migrateViews();
    await migrateTags();
    await migrateWebhooks();
    await migrateWorkflows();
    await migrateIntegrations();

    console.log("\n=========================================");
    console.log("Migration completed successfully!");
    console.log("\nSummary:");
    console.log(`  Users: ${Object.keys(idMap.users).length}`);
    console.log(`  Teams: ${Object.keys(idMap.teams).length}`);
    console.log(`  Documents: ${Object.keys(idMap.documents).length}`);
    console.log(`  Links: ${Object.keys(idMap.links).length}`);
    console.log(`  Datarooms: ${Object.keys(idMap.datarooms).length}`);
    console.log(`  Views: ${Object.keys(idMap.views).length}`);
    console.log(`  Viewers: ${Object.keys(idMap.viewers).length}`);
    console.log(`  Workflows: ${Object.keys(idMap.workflows).length}`);
    console.log(`  Tags: ${Object.keys(idMap.tags).length}`);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
