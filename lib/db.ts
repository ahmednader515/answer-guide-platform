import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

// Use DATABASE_URL by default (direct connection - more reliable)
// Only use PRISMA_ACCELERATE_URL if ENABLE_PRISMA_ACCELERATE is set to "true"
const databaseUrl = process.env.DATABASE_URL;
const accelerateUrl = process.env.PRISMA_ACCELERATE_URL;
const enableAccelerate = process.env.ENABLE_PRISMA_ACCELERATE === "true";

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL environment variable is not set. Please check your .env file."
  );
}

// Normalize prisma+postgres:// to prisma:// (Prisma Accelerate format)
let normalizedAccelerateUrl = accelerateUrl;
if (normalizedAccelerateUrl?.startsWith("prisma+postgres://")) {
  normalizedAccelerateUrl = normalizedAccelerateUrl.replace("prisma+postgres://", "prisma://");
}

// Determine which URL to use - default to direct connection unless Accelerate is explicitly enabled
const useAccelerate = enableAccelerate && normalizedAccelerateUrl?.startsWith("prisma://");
const finalDatabaseUrl = useAccelerate ? normalizedAccelerateUrl! : databaseUrl;

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
  // Use direct PostgreSQL connection by default (more reliable)
  const client = new PrismaClient({
    datasources: {
      db: { url: finalDatabaseUrl },
    },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  // Use Accelerate extension only if explicitly enabled
  if (useAccelerate && finalDatabaseUrl.startsWith("prisma://")) {
    try {
      return client.$extends(withAccelerate());
    } catch (error) {
      console.warn("⚠️  Failed to initialize Prisma Accelerate extension, falling back to direct connection");
      // Fall back to direct connection if Accelerate fails
      return new PrismaClient({
        datasources: {
          db: { url: databaseUrl },
        },
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
      });
    }
  }
  
  // Use direct PostgreSQL connection (default)
  return client;
};

declare global {
  // eslint-disable-next-line no-var
  var prisma: ReturnType<typeof createPrismaClient> | undefined;
}

export const db = globalThis.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = db;
}