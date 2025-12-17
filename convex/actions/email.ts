"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";

// Get Resend client
const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY not configured");
  }
  return new Resend(apiKey);
};

// Default sender addresses
const getSenderAddress = (type: string) => {
  switch (type) {
    case "marketing":
      return "Marc from Papermark <marc@ship.papermark.io>";
    case "system":
      return "Papermark <system@papermark.io>";
    case "verify":
      return "Papermark <system@verify.papermark.io>";
    case "scheduled":
      return "Marc Seitz <marc@papermark.io>";
    default:
      return "Marc from Papermark <marc@papermark.io>";
  }
};

// Send a plain text or HTML email
export const sendEmail = action({
  args: {
    to: v.string(),
    subject: v.string(),
    html: v.string(),
    text: v.optional(v.string()),
    from: v.optional(v.string()),
    emailType: v.optional(v.string()), // "marketing", "system", "verify", "scheduled"
    cc: v.optional(v.union(v.string(), v.array(v.string()))),
    replyTo: v.optional(v.string()),
    scheduledAt: v.optional(v.string()),
    unsubscribeUrl: v.optional(v.string()),
    isTest: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const resend = getResendClient();

    const fromAddress = args.from || getSenderAddress(args.emailType || "default");
    const toAddress = args.isTest ? "delivered@resend.dev" : args.to;

    const headers: Record<string, string> = {
      "X-Entity-Ref-ID": `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
    };

    if (args.unsubscribeUrl) {
      headers["List-Unsubscribe"] = args.unsubscribeUrl;
    }

    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: toAddress,
      cc: args.cc,
      // Marketing emails always use marc@papermark.io as replyTo for consistency
      replyTo: args.emailType === "marketing" ? "marc@papermark.io" : args.replyTo,
      subject: args.subject,
      html: args.html,
      text: args.text,
      scheduledAt: args.scheduledAt,
      headers,
    });

    if (error) {
      throw new Error(`Failed to send email: ${error.name} - ${error.message}`);
    }

    return { id: data?.id, success: true };
  },
});

// Send batch emails
export const sendBatchEmails = action({
  args: {
    emails: v.array(
      v.object({
        to: v.string(),
        subject: v.string(),
        html: v.string(),
        text: v.optional(v.string()),
        from: v.optional(v.string()),
      })
    ),
    emailType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const resend = getResendClient();
    const fromAddress = getSenderAddress(args.emailType || "default");

    const timestamp = Date.now();
    const batchEmails = args.emails.map((email, index) => ({
      from: email.from || fromAddress,
      to: email.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      headers: {
        // Include index to ensure unique ID for each email in the batch
        "X-Entity-Ref-ID": `${timestamp}-${index}-${Math.random().toString(36).substring(2, 15)}`,
      },
    }));

    const { data, error } = await resend.batch.send(batchEmails);

    if (error) {
      throw new Error(`Failed to send batch emails: ${error.name} - ${error.message}`);
    }

    return { data, success: true };
  },
});

// Cancel a scheduled email
export const cancelScheduledEmail = action({
  args: {
    emailId: v.string(),
  },
  handler: async (ctx, args) => {
    const resend = getResendClient();

    const { data, error } = await resend.emails.cancel(args.emailId);

    if (error) {
      throw new Error(`Failed to cancel email: ${error.name} - ${error.message}`);
    }

    return { success: true, data };
  },
});

// Get email status
export const getEmailStatus = action({
  args: {
    emailId: v.string(),
  },
  handler: async (ctx, args) => {
    const resend = getResendClient();

    const { data, error } = await resend.emails.get(args.emailId);

    if (error) {
      throw new Error(`Failed to get email status: ${error.name} - ${error.message}`);
    }

    return data;
  },
});

// Verify email domain
export const verifyDomain = action({
  args: {
    domainId: v.string(),
  },
  handler: async (ctx, args) => {
    const resend = getResendClient();

    const { data, error } = await resend.domains.verify(args.domainId);

    if (error) {
      throw new Error(`Failed to verify domain: ${error.name} - ${error.message}`);
    }

    return data;
  },
});

// Add a contact to audience
export const addContact = action({
  args: {
    audienceId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    unsubscribed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const resend = getResendClient();

    const { data, error } = await resend.contacts.create({
      audienceId: args.audienceId,
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      unsubscribed: args.unsubscribed || false,
    });

    if (error) {
      throw new Error(`Failed to add contact: ${error.name} - ${error.message}`);
    }

    return data;
  },
});

// Remove a contact from audience
export const removeContact = action({
  args: {
    audienceId: v.string(),
    contactId: v.string(),
  },
  handler: async (ctx, args) => {
    const resend = getResendClient();

    const { data, error } = await resend.contacts.remove({
      audienceId: args.audienceId,
      id: args.contactId,
    });

    if (error) {
      throw new Error(`Failed to remove contact: ${error.name} - ${error.message}`);
    }

    return data;
  },
});
