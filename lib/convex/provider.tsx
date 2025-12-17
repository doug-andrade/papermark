"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

// Validate environment variable with helpful error message
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error(
    "NEXT_PUBLIC_CONVEX_URL environment variable is not set. " +
      "Please add it to your .env.local file. " +
      "You can get this URL from your Convex dashboard at https://dashboard.convex.dev"
  );
}

// Create a singleton Convex client
const convex = new ConvexReactClient(convexUrl);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}

// Note: This client is for client-side React components only.
// For server-side operations, use ConvexHttpClient from "convex/browser".
export { convex };
