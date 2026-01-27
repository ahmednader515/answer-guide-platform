import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

// Use PRISMA_ACCELERATE_URL if available (recommended for serverless), otherwise fall back to DATABASE_URL
const databaseUrl = process.env.DATABASE_URL;
const accelerateUrl = process.env.PRISMA_ACCELERATE_URL;

if (!databaseUrl && !accelerateUrl) {
  throw new Error(
    "Either DATABASE_URL or PRISMA_ACCELERATE_URL environment variable must be set. Please check your .env file."
  );
}

// Normalize prisma+postgres:// to prisma:// (Prisma Accelerate format)
let normalizedAccelerateUrl = accelerateUrl;
if (normalizedAccelerateUrl?.startsWith("prisma+postgres://")) {
  normalizedAccelerateUrl = normalizedAccelerateUrl.replace("prisma+postgres://", "prisma://");
}

// Prefer Prisma Accelerate if available (better for serverless environments like Vercel)
// Only use direct connection if Accelerate URL is not provided
const useAccelerate = !!normalizedAccelerateUrl && normalizedAccelerateUrl.startsWith("prisma://");
const finalDatabaseUrl = useAccelerate ? normalizedAccelerateUrl! : databaseUrl!;

// Validate that finalDatabaseUrl is a valid connection string
if (
  !finalDatabaseUrl.startsWith("postgresql://") && 
  !finalDatabaseUrl.startsWith("postgres://") && 
  !finalDatabaseUrl.startsWith("prisma://")
) {
  throw new Error(
    `Invalid database URL format. Expected postgresql://, postgres://, prisma://, or prisma+postgres://, got: ${finalDatabaseUrl.substring(0, 50)}...`
  );
}

const createPrismaClient = () => {
  const client = new PrismaClient({
    datasources: {
      db: { url: finalDatabaseUrl },
    },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  // Use Accelerate extension if using Prisma Accelerate URL
  if (useAccelerate && finalDatabaseUrl.startsWith("prisma://")) {
    try {
      return client.$extends(withAccelerate());
    } catch (error) {
      console.warn("⚠️  Failed to initialize Prisma Accelerate extension, falling back to direct connection");
      // Fall back to direct connection if Accelerate fails
      if (!databaseUrl) {
        throw new Error("Prisma Accelerate failed and no DATABASE_URL fallback is available");
      }
      return new PrismaClient({
        datasources: {
          db: { url: databaseUrl },
        },
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
      });
    }
  }
  
  // Use direct PostgreSQL connection
  return client;
};

declare global {
  // eslint-disable-next-line no-var
  var prisma: ReturnType<typeof createPrismaClient> | undefined;
}

// Singleton pattern - CRITICAL for serverless environments like Vercel
// This prevents connection pool exhaustion by reusing the same PrismaClient instance
export const db = globalThis.prisma ?? createPrismaClient();

// Always use singleton pattern, even in production (essential for serverless)
if (!globalThis.prisma) {
  globalThis.prisma = db;
}

// Graceful shutdown handling
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    await db.$disconnect();
  });
}