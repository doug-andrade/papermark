"use node";

import { action, internalAction } from "../_generated/server";
import { v } from "convex/values";
import Stripe from "stripe";

// Get Stripe client
const getStripeClient = (useOldAccount: boolean = false) => {
  const secretKey = useOldAccount
    ? process.env.STRIPE_SECRET_KEY_LIVE_OLD || process.env.STRIPE_SECRET_KEY_OLD
    : process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Stripe secret key not configured");
  }

  return new Stripe(secretKey, {
    apiVersion: "2024-06-20",
    appInfo: {
      name: "Papermark.io",
      version: "0.1.0",
    },
    typescript: true,
  });
};

// Create a checkout session
export const createCheckoutSession = action({
  args: {
    priceId: v.string(),
    customerId: v.optional(v.string()),
    customerEmail: v.optional(v.string()),
    successUrl: v.string(),
    cancelUrl: v.string(),
    metadata: v.optional(v.any()),
    trialPeriodDays: v.optional(v.number()),
    allowPromotionCodes: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const stripe = getStripeClient();

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: args.priceId,
          quantity: 1,
        },
      ],
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
      allow_promotion_codes: args.allowPromotionCodes ?? true,
      metadata: args.metadata,
    };

    if (args.customerId) {
      sessionParams.customer = args.customerId;
    } else if (args.customerEmail) {
      sessionParams.customer_email = args.customerEmail;
    }

    if (args.trialPeriodDays) {
      sessionParams.subscription_data = {
        trial_period_days: args.trialPeriodDays,
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return {
      id: session.id,
      url: session.url,
    };
  },
});

// Create a billing portal session
export const createBillingPortalSession = action({
  args: {
    customerId: v.string(),
    returnUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const stripe = getStripeClient();

    const session = await stripe.billingPortal.sessions.create({
      customer: args.customerId,
      return_url: args.returnUrl,
    });

    return {
      url: session.url,
    };
  },
});

// Get customer
export const getCustomer = action({
  args: {
    customerId: v.string(),
    useOldAccount: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const stripe = getStripeClient(args.useOldAccount);

    const customer = await stripe.customers.retrieve(args.customerId);

    if (customer.deleted) {
      return null;
    }

    return {
      id: customer.id,
      email: customer.email,
      name: customer.name,
      metadata: customer.metadata,
    };
  },
});

// Create customer
export const createCustomer = action({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const stripe = getStripeClient();

    const customer = await stripe.customers.create({
      email: args.email,
      name: args.name,
      metadata: args.metadata,
    });

    return {
      id: customer.id,
      email: customer.email,
      name: customer.name,
    };
  },
});

// Update customer
export const updateCustomer = action({
  args: {
    customerId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const stripe = getStripeClient();

    const updateParams: Stripe.CustomerUpdateParams = {};
    if (args.email) updateParams.email = args.email;
    if (args.name) updateParams.name = args.name;
    if (args.metadata) updateParams.metadata = args.metadata;

    const customer = await stripe.customers.update(args.customerId, updateParams);

    return {
      id: customer.id,
      email: customer.email,
      name: customer.name,
    };
  },
});

// Get subscription
export const getSubscription = action({
  args: {
    subscriptionId: v.string(),
    useOldAccount: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const stripe = getStripeClient(args.useOldAccount);

    const subscription = await stripe.subscriptions.retrieve(args.subscriptionId);

    return {
      id: subscription.id,
      status: subscription.status,
      currentPeriodStart: subscription.current_period_start,
      currentPeriodEnd: subscription.current_period_end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at,
      endedAt: subscription.ended_at,
      items: subscription.items.data.map((item) => ({
        id: item.id,
        priceId: item.price.id,
        productId: typeof item.price.product === "string" ? item.price.product : item.price.product.id,
        quantity: item.quantity,
      })),
    };
  },
});

// List subscriptions for a customer
export const listSubscriptions = action({
  args: {
    customerId: v.string(),
    useOldAccount: v.optional(v.boolean()),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const stripe = getStripeClient(args.useOldAccount);

    const subscriptions = await stripe.subscriptions.list({
      customer: args.customerId,
      status: args.status as Stripe.SubscriptionListParams.Status,
      limit: args.limit || 10,
    });

    return subscriptions.data.map((sub) => ({
      id: sub.id,
      status: sub.status,
      currentPeriodStart: sub.current_period_start,
      currentPeriodEnd: sub.current_period_end,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    }));
  },
});

// Cancel subscription
export const cancelSubscription = action({
  args: {
    subscriptionId: v.string(),
    useOldAccount: v.optional(v.boolean()),
    cancelImmediately: v.optional(v.boolean()),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const stripe = getStripeClient(args.useOldAccount);

    if (args.cancelImmediately) {
      const subscription = await stripe.subscriptions.cancel(args.subscriptionId);
      return {
        id: subscription.id,
        status: subscription.status,
        canceledAt: subscription.canceled_at,
      };
    }

    const subscription = await stripe.subscriptions.update(args.subscriptionId, {
      cancel_at_period_end: true,
      cancellation_details: {
        comment: args.reason || "Customer requested cancellation",
      },
    });

    return {
      id: subscription.id,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    };
  },
});

// Resume subscription (undo cancel at period end)
export const resumeSubscription = action({
  args: {
    subscriptionId: v.string(),
    useOldAccount: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const stripe = getStripeClient(args.useOldAccount);

    const subscription = await stripe.subscriptions.update(args.subscriptionId, {
      cancel_at_period_end: false,
    });

    return {
      id: subscription.id,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    };
  },
});

// Update subscription
export const updateSubscription = action({
  args: {
    subscriptionId: v.string(),
    priceId: v.optional(v.string()),
    quantity: v.optional(v.number()),
    metadata: v.optional(v.any()),
    prorationBehavior: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const stripe = getStripeClient();

    const subscription = await stripe.subscriptions.retrieve(args.subscriptionId);

    const updateParams: Stripe.SubscriptionUpdateParams = {};

    if (args.priceId) {
      updateParams.items = [
        {
          id: subscription.items.data[0].id,
          price: args.priceId,
          quantity: args.quantity,
        },
      ];
      updateParams.proration_behavior = (args.prorationBehavior as Stripe.SubscriptionUpdateParams.ProrationBehavior) || "create_prorations";
    }

    if (args.metadata) {
      updateParams.metadata = args.metadata;
    }

    const updatedSubscription = await stripe.subscriptions.update(args.subscriptionId, updateParams);

    return {
      id: updatedSubscription.id,
      status: updatedSubscription.status,
    };
  },
});

// Get invoice
export const getInvoice = action({
  args: {
    invoiceId: v.string(),
  },
  handler: async (ctx, args) => {
    const stripe = getStripeClient();

    const invoice = await stripe.invoices.retrieve(args.invoiceId);

    return {
      id: invoice.id,
      status: invoice.status,
      amountDue: invoice.amount_due,
      amountPaid: invoice.amount_paid,
      currency: invoice.currency,
      customerId: invoice.customer as string,
      subscriptionId: invoice.subscription as string,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      invoicePdf: invoice.invoice_pdf,
    };
  },
});

// List invoices for a customer
export const listInvoices = action({
  args: {
    customerId: v.string(),
    limit: v.optional(v.number()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const stripe = getStripeClient();

    const invoices = await stripe.invoices.list({
      customer: args.customerId,
      limit: args.limit || 10,
      status: args.status as Stripe.InvoiceListParams.Status,
    });

    return invoices.data.map((invoice) => ({
      id: invoice.id,
      status: invoice.status,
      amountDue: invoice.amount_due,
      amountPaid: invoice.amount_paid,
      currency: invoice.currency,
      created: invoice.created,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      invoicePdf: invoice.invoice_pdf,
    }));
  },
});

// Get upcoming invoice (preview)
export const getUpcomingInvoice = action({
  args: {
    customerId: v.string(),
    subscriptionId: v.optional(v.string()),
    priceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const stripe = getStripeClient();

    const params: Stripe.InvoiceRetrieveUpcomingParams = {
      customer: args.customerId,
    };

    if (args.subscriptionId) {
      params.subscription = args.subscriptionId;
    }

    if (args.priceId && args.subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(args.subscriptionId);
      params.subscription_items = [
        {
          id: subscription.items.data[0].id,
          price: args.priceId,
        },
      ];
    }

    const invoice = await stripe.invoices.retrieveUpcoming(params);

    return {
      amountDue: invoice.amount_due,
      amountPaid: invoice.amount_paid,
      currency: invoice.currency,
      periodStart: invoice.period_start,
      periodEnd: invoice.period_end,
      lines: invoice.lines.data.map((line) => ({
        description: line.description,
        amount: line.amount,
        quantity: line.quantity,
      })),
    };
  },
});

// Get product
export const getProduct = action({
  args: {
    productId: v.string(),
  },
  handler: async (ctx, args) => {
    const stripe = getStripeClient();

    const product = await stripe.products.retrieve(args.productId);

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      active: product.active,
      metadata: product.metadata,
    };
  },
});

// Get price
export const getPrice = action({
  args: {
    priceId: v.string(),
  },
  handler: async (ctx, args) => {
    const stripe = getStripeClient();

    const price = await stripe.prices.retrieve(args.priceId);

    return {
      id: price.id,
      productId: typeof price.product === "string" ? price.product : price.product.id,
      unitAmount: price.unit_amount,
      currency: price.currency,
      recurring: price.recurring
        ? {
            interval: price.recurring.interval,
            intervalCount: price.recurring.interval_count,
          }
        : null,
      active: price.active,
    };
  },
});

// List prices for a product
export const listPrices = action({
  args: {
    productId: v.optional(v.string()),
    active: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const stripe = getStripeClient();

    const params: Stripe.PriceListParams = {
      limit: args.limit || 10,
    };

    if (args.productId) {
      params.product = args.productId;
    }

    if (args.active !== undefined) {
      params.active = args.active;
    }

    const prices = await stripe.prices.list(params);

    return prices.data.map((price) => ({
      id: price.id,
      productId: typeof price.product === "string" ? price.product : price.product.id,
      unitAmount: price.unit_amount,
      currency: price.currency,
      recurring: price.recurring
        ? {
            interval: price.recurring.interval,
            intervalCount: price.recurring.interval_count,
          }
        : null,
      active: price.active,
    }));
  },
});

// Verify webhook signature (internal action for webhook handling)
export const verifyWebhookSignature = internalAction({
  args: {
    payload: v.string(),
    signature: v.string(),
    webhookSecret: v.string(),
  },
  handler: async (ctx, args) => {
    const stripe = getStripeClient();

    try {
      const event = stripe.webhooks.constructEvent(
        args.payload,
        args.signature,
        args.webhookSecret
      );
      return { valid: true, event };
    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  },
});
