/**
 * Helper script to check database connection configuration
 * Run with: npx ts-node scripts/check-db-config.ts
 */

import dotenv from "dotenv";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
const directUrl = process.env.DIRECT_DATABASE_URL;

console.log("\n🔍 Checking Database Configuration...\n");

if (!databaseUrl) {
  console.error("❌ DATABASE_URL is not set in your .env file");
  process.exit(1);
}

console.log("📋 DATABASE_URL:", databaseUrl.substring(0, 50) + "...");

if (directUrl) {
  console.log("📋 DIRECT_DATABASE_URL:", directUrl.substring(0, 50) + "...");
} else {
  console.log("⚠️  DIRECT_DATABASE_URL is not set (optional, but recommended for migrations)");
}

console.log("\n");

// Check for Prisma Data Platform
if (databaseUrl.includes("db.prisma.io")) {
  console.error("❌ ISSUE DETECTED:");
  console.error("   Your DATABASE_URL points to db.prisma.io, which is incorrect for Prisma Data Platform.\n");
  console.log("✅ SOLUTION:");
  console.log("   For Prisma Data Platform, you need to use a 'prisma://' connection string.\n");
  console.log("   Steps to fix:");
  console.log("   1. Go to your Prisma Data Platform dashboard");
  console.log("   2. Select your project");
  console.log("   3. Go to 'Settings' -> 'Connection Strings'");
  console.log("   4. Copy the 'Connection pooled' URL (should start with prisma://)");
  console.log("   5. Set this as your DATABASE_URL in .env file");
  console.log("   6. Copy the 'Direct connection' URL and set it as DIRECT_DATABASE_URL\n");
  console.log("   Example:");
  console.log("   DATABASE_URL=\"prisma://accelerate.prisma-data.net/?api_key=...\"");
  console.log("   DIRECT_DATABASE_URL=\"postgresql://user:password@host:port/database?sslmode=require\"\n");
  process.exit(1);
}

// Check if using prisma:// URL
if (databaseUrl.startsWith("prisma://")) {
  console.log("✅ DATABASE_URL is correctly using Prisma Accelerate (prisma://)");
  
  if (!directUrl) {
    console.log("\n⚠️  RECOMMENDATION:");
    console.log("   You should also set DIRECT_DATABASE_URL for migrations.");
    console.log("   This is the direct PostgreSQL connection string (postgresql://...)\n");
  } else if (directUrl.startsWith("postgresql://") || directUrl.startsWith("postgres://")) {
    console.log("✅ DIRECT_DATABASE_URL is correctly configured");
  }
} else if (databaseUrl.startsWith("postgresql://") || databaseUrl.startsWith("postgres://")) {
  console.log("✅ DATABASE_URL is using direct PostgreSQL connection");
  console.log("   This is fine if you're not using Prisma Data Platform connection pooling.");
}

console.log("\n✅ Configuration check complete!\n");

