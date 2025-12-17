"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Get S3 client with configuration
const getS3Client = () => {
  const region = process.env.AWS_S3_REGION || "us-east-1";
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const endpoint = process.env.AWS_S3_ENDPOINT;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error("AWS credentials not configured");
  }

  return new S3Client({
    region,
    endpoint: endpoint || undefined,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
};

const getBucket = () => {
  const bucket = process.env.AWS_S3_BUCKET_NAME;
  if (!bucket) {
    throw new Error("AWS_S3_BUCKET_NAME not configured");
  }
  return bucket;
};

// Generate presigned URL for uploading files
export const getPresignedUploadUrl = action({
  args: {
    key: v.string(),
    contentType: v.string(),
    expiresIn: v.optional(v.number()), // seconds, default 3600
  },
  handler: async (ctx, args) => {
    const client = getS3Client();
    const bucket = getBucket();

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: args.key,
      ContentType: args.contentType,
    });

    const url = await getSignedUrl(client, command, {
      expiresIn: args.expiresIn || 3600,
    });

    return { url, key: args.key };
  },
});

// Generate presigned URL for downloading files
export const getPresignedDownloadUrl = action({
  args: {
    key: v.string(),
    expiresIn: v.optional(v.number()), // seconds, default 3600
    responseContentDisposition: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const client = getS3Client();
    const bucket = getBucket();

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: args.key,
      ResponseContentDisposition: args.responseContentDisposition,
    });

    const url = await getSignedUrl(client, command, {
      expiresIn: args.expiresIn || 3600,
    });

    return { url };
  },
});

// Delete a file from S3
export const deleteFile = action({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const client = getS3Client();
    const bucket = getBucket();

    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: args.key,
    });

    await client.send(command);

    return { success: true, key: args.key };
  },
});

// Delete multiple files from S3
export const deleteFiles = action({
  args: {
    keys: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const client = getS3Client();
    const bucket = getBucket();

    const results = await Promise.allSettled(
      args.keys.map(async (key) => {
        const command = new DeleteObjectCommand({
          Bucket: bucket,
          Key: key,
        });
        await client.send(command);
        return key;
      })
    );

    const deleted = results
      .filter((r) => r.status === "fulfilled")
      .map((r) => (r as PromiseFulfilledResult<string>).value);

    const failed = results
      .filter((r) => r.status === "rejected")
      .map((_, i) => args.keys[i]);

    return { deleted, failed };
  },
});

// Copy a file within S3
export const copyFile = action({
  args: {
    sourceKey: v.string(),
    destinationKey: v.string(),
    sourceBucket: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const client = getS3Client();
    const bucket = getBucket();
    const sourceBucket = args.sourceBucket || bucket;

    const command = new CopyObjectCommand({
      Bucket: bucket,
      Key: args.destinationKey,
      CopySource: `${sourceBucket}/${args.sourceKey}`,
    });

    await client.send(command);

    return { success: true, key: args.destinationKey };
  },
});

// Check if a file exists
export const fileExists = action({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const client = getS3Client();
    const bucket = getBucket();

    try {
      const command = new HeadObjectCommand({
        Bucket: bucket,
        Key: args.key,
      });

      const response = await client.send(command);

      return {
        exists: true,
        contentType: response.ContentType,
        contentLength: response.ContentLength,
        lastModified: response.LastModified?.getTime(),
      };
    } catch (error: any) {
      if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
        return { exists: false };
      }
      throw error;
    }
  },
});

// Generate a unique file key
export const generateFileKey = action({
  args: {
    teamId: v.string(),
    fileName: v.string(),
    folder: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const sanitizedFileName = args.fileName.replace(/[^a-zA-Z0-9.-]/g, "_");

    const folder = args.folder || "documents";
    const key = `${args.teamId}/${folder}/${timestamp}-${randomId}-${sanitizedFileName}`;

    return { key };
  },
});
