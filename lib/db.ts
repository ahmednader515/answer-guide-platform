import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

// Validate DATABASE_URL
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL environment variable is not set. Please check your .env file."
  );
}

// Validate that DATABASE_URL is a valid PostgreSQL connection string
if (!databaseUrl.startsWith("postgresql://") && !databaseUrl.startsWith("postgres://")) {
  throw new Error(
    `Invalid DATABASE_URL format. Expected postgresql:// or postgres://, got: ${databaseUrl.substring(0, 50)}...`
  );
}

// Check if it's a Prisma Accelerate URL (starts with prisma://)
const isAccelerateUrl = databaseUrl.startsWith("prisma://");

const createPrismaClient = () => {
  const client = new PrismaClient({
    datasources: {
      db: { url: databaseUrl },
    },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  // Only use Accelerate extension if we have a proper Prisma Accelerate URL
  // Regular PostgreSQL URLs should NOT use Accelerate
  if (isAccelerateUrl) {
    try {
      return client.$extends(withAccelerate());
    } catch (error) {
      console.warn("Failed to initialize Prisma Accelerate, using direct connection:", error);
      return client;
    }
  }
  
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