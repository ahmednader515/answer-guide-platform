/**
 * Delete Users Without Purchases Script
 * Deletes all users with role "USER" that have 0 purchases
 * 
 * Usage:
 * npx ts-node scripts/delete-users-without-purchases.ts
 */

import { PrismaClient } from "@prisma/client";
import * as readline from "readline";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });
dotenv.config();

const prisma = new PrismaClient();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Helper function to ask for confirmation
function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  try {
    console.log("🔍 Finding users with role 'USER' and 0 purchases...\n");

    // Find all users with role "USER"
    const allUsers = await prisma.user.findMany({
      where: {
        role: "USER",
      },
      select: {
        id: true,
        fullName: true,
        phoneNumber: true,
        createdAt: true,
        _count: {
          select: {
            purchases: true,
          },
        },
      },
    });

    // Filter users with 0 purchases
    const usersToDelete = allUsers.filter((user) => user._count.purchases === 0);

    console.log(`📊 Total users with role "USER": ${allUsers.length}`);
    console.log(`❌ Users with 0 purchases: ${usersToDelete.length}\n`);

    if (usersToDelete.length === 0) {
      console.log("✅ No users to delete. All users with role 'USER' have purchases.");
      return;
    }

    // Show sample of users that will be deleted (first 10)
    console.log("📋 Sample of users that will be deleted (first 10):");
    usersToDelete.slice(0, 10).forEach((user, index) => {
      console.log(
        `  ${index + 1}. ${user.fullName} (${user.phoneNumber}) - Created: ${user.createdAt.toLocaleDateString()}`
      );
    });
    if (usersToDelete.length > 10) {
      console.log(`  ... and ${usersToDelete.length - 10} more users`);
    }
    console.log("");

    // Ask for confirmation
    const answer = await askQuestion(
      `⚠️  Are you sure you want to delete ${usersToDelete.length} user(s)? (yes/no): `
    );

    if (answer.toLowerCase() !== "yes" && answer.toLowerCase() !== "y") {
      console.log("❌ Deletion cancelled.");
      return;
    }

    console.log("\n🗑️  Deleting users...");

    // Delete users
    const userIds = usersToDelete.map((user) => user.id);
    
    const result = await prisma.user.deleteMany({
      where: {
        id: {
          in: userIds,
        },
      },
    });

    console.log(`✅ Successfully deleted ${result.count} user(s).`);
  } catch (error) {
    console.error("❌ Error deleting users:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

main()
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });

