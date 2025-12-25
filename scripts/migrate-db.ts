/**
 * Database Migration Script
 * Migrates data from Aiven PostgreSQL to Prisma Postgres
 * 
 * Usage:
 * 1. Add the new environment variables to your .env file
 * 2. Run: npx ts-node scripts/migrate-db.ts
 */

import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });
dotenv.config();

// Source database (Aiven) - Use DATABASE_URL or AIVEN_DATABASE_URL
const sourceDatabaseUrl = process.env.AIVEN_DATABASE_URL || process.env.DATABASE_URL;
if (!sourceDatabaseUrl) {
  throw new Error("Either AIVEN_DATABASE_URL or DATABASE_URL must be set for the source database");
}

// Parse connection string and build config with SSL settings for Aiven
const sourceUrl = new URL(sourceDatabaseUrl);

const sourcePoolConfig: {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: { rejectUnauthorized: boolean };
} = {
  host: sourceUrl.hostname,
  port: parseInt(sourceUrl.port) || 5432,
  database: sourceUrl.pathname.slice(1) || sourceUrl.searchParams.get('database') || 'postgres',
  user: sourceUrl.username,
  password: sourceUrl.password,
  ssl: {
    rejectUnauthorized: false, // Allow self-signed certificates for Aiven
  },
};

const sourcePool = new Pool(sourcePoolConfig);

// Destination database (Prisma Postgres)
const destDatabaseUrl = process.env.PRISMA_DATABASE_URL;
if (!destDatabaseUrl) {
  throw new Error("PRISMA_DATABASE_URL must be set for the destination database");
}

// Create Prisma client factory function - we'll recreate it after schema sync
function createDestPrisma() {
  return new PrismaClient({
    datasources: {
      db: {
        url: destDatabaseUrl,
      },
    },
  });
}

let destPrisma = createDestPrisma();

interface MigrationStats {
  users: number;
  courses: number;
  attachments: number;
  chapters: number;
  chapterAttachments: number;
  quizzes: number;
  questions: number;
  purchaseCodes: number;
  purchases: number;
  userProgress: number;
  balanceTransactions: number;
  quizResults: number;
  quizAnswers: number;
}

const stats: MigrationStats = {
  users: 0,
  courses: 0,
  attachments: 0,
  chapters: 0,
  chapterAttachments: 0,
  quizzes: 0,
  questions: 0,
  purchaseCodes: 0,
  purchases: 0,
  userProgress: 0,
  balanceTransactions: 0,
  quizResults: 0,
  quizAnswers: 0,
};

async function migrateUsers() {
  console.log("📦 Migrating Users...");
  const result = await sourcePool.query("SELECT * FROM \"User\" ORDER BY \"createdAt\"");
  const totalUsers = result.rows.length;
  console.log(`   Found ${totalUsers} users to migrate\n`);
  
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows[i];
    try {
      await destPrisma.user.upsert({
        where: { id: row.id },
        update: {},
        create: {
          id: row.id,
          fullName: row.fullName,
          phoneNumber: row.phoneNumber,
          parentPhoneNumber: row.parentPhoneNumber,
          hashedPassword: row.hashedPassword,
          image: row.image,
          role: row.role,
          balance: parseFloat(row.balance) || 0,
          grade: row.grade || null,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        },
      });
      stats.users++;
      // Show progress for each user
      const userName = row.fullName || row.phoneNumber || 'Unknown';
      process.stdout.write(`\r   [${i + 1}/${totalUsers}] Migrating user: ${userName}...`);
    } catch (error: any) {
      console.error(`\n   Error migrating user ${row.id} (${row.fullName}):`, error.message);
    }
  }
  console.log(`\n✅ Migrated ${stats.users}/${totalUsers} users`);
}

async function migrateCourses() {
  console.log("📦 Migrating Courses...");
  const result = await sourcePool.query("SELECT * FROM \"Course\" ORDER BY \"createdAt\"");
  
  for (const row of result.rows) {
    try {
      await destPrisma.course.upsert({
        where: { id: row.id },
        update: {},
        create: {
          id: row.id,
          userId: row.userId,
          title: row.title,
          description: row.description,
          imageUrl: row.imageUrl,
          price: row.price ? parseFloat(row.price) : null,
          isPublished: row.isPublished,
          grade: row.grade || null,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        },
      });
      stats.courses++;
    } catch (error: any) {
      console.error(`Error migrating course ${row.id}:`, error.message);
    }
  }
  console.log(`✅ Migrated ${stats.courses} courses`);
}

async function migrateAttachments() {
  console.log("📦 Migrating Attachments...");
  const result = await sourcePool.query("SELECT * FROM \"Attachment\" ORDER BY \"createdAt\"");
  
  for (const row of result.rows) {
    try {
      await destPrisma.attachment.upsert({
        where: { id: row.id },
        update: {},
        create: {
          id: row.id,
          name: row.name,
          url: row.url,
          courseId: row.courseId,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        },
      });
      stats.attachments++;
    } catch (error: any) {
      console.error(`Error migrating attachment ${row.id}:`, error.message);
    }
  }
  console.log(`✅ Migrated ${stats.attachments} attachments`);
}

async function migrateChapters() {
  console.log("📦 Migrating Chapters...");
  const result = await sourcePool.query("SELECT * FROM \"Chapter\" ORDER BY \"createdAt\"");
  
  for (const row of result.rows) {
    try {
      await destPrisma.chapter.upsert({
        where: { id: row.id },
        update: {},
        create: {
          id: row.id,
          title: row.title,
          description: row.description,
          videoUrl: row.videoUrl,
          videoType: row.videoType || "UPLOAD",
          youtubeVideoId: row.youtubeVideoId,
          documentUrl: row.documentUrl,
          documentName: row.documentName,
          position: parseInt(row.position) || 0,
          isPublished: row.isPublished,
          isFree: row.isFree || false,
          courseId: row.courseId,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        },
      });
      stats.chapters++;
    } catch (error: any) {
      console.error(`Error migrating chapter ${row.id}:`, error.message);
    }
  }
  console.log(`✅ Migrated ${stats.chapters} chapters`);
}

async function migrateChapterAttachments() {
  console.log("📦 Migrating Chapter Attachments...");
  const result = await sourcePool.query("SELECT * FROM \"ChapterAttachment\" ORDER BY \"createdAt\"");
  
  for (const row of result.rows) {
    try {
      await destPrisma.chapterAttachment.upsert({
        where: { id: row.id },
        update: {},
        create: {
          id: row.id,
          name: row.name,
          url: row.url,
          position: parseInt(row.position) || 0,
          chapterId: row.chapterId,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        },
      });
      stats.chapterAttachments++;
    } catch (error: any) {
      console.error(`Error migrating chapter attachment ${row.id}:`, error.message);
    }
  }
  console.log(`✅ Migrated ${stats.chapterAttachments} chapter attachments`);
}

async function migrateQuizzes() {
  console.log("📦 Migrating Quizzes...");
  const result = await sourcePool.query("SELECT * FROM \"Quiz\" ORDER BY \"createdAt\"");
  
  for (const row of result.rows) {
    try {
      await destPrisma.quiz.upsert({
        where: { id: row.id },
        update: {},
        create: {
          id: row.id,
          title: row.title,
          description: row.description,
          position: parseInt(row.position) || 0,
          isPublished: row.isPublished,
          timer: row.timer ? parseInt(row.timer) : null,
          maxAttempts: parseInt(row.maxAttempts) || 1,
          courseId: row.courseId,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        },
      });
      stats.quizzes++;
    } catch (error: any) {
      console.error(`Error migrating quiz ${row.id}:`, error.message);
    }
  }
  console.log(`✅ Migrated ${stats.quizzes} quizzes`);
}

async function migrateQuestions() {
  console.log("📦 Migrating Questions...");
  const result = await sourcePool.query("SELECT * FROM \"Question\" ORDER BY \"createdAt\"");
  
  for (const row of result.rows) {
    try {
      await destPrisma.question.upsert({
        where: { id: row.id },
        update: {},
        create: {
          id: row.id,
          text: row.text,
          type: row.type,
          options: row.options,
          correctAnswer: row.correctAnswer,
          points: parseInt(row.points) || 1,
          imageUrl: row.imageUrl,
          position: parseInt(row.position) || 1,
          quizId: row.quizId,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        },
      });
      stats.questions++;
    } catch (error: any) {
      console.error(`Error migrating question ${row.id}:`, error.message);
    }
  }
  console.log(`✅ Migrated ${stats.questions} questions`);
}

async function migratePurchaseCodes() {
  console.log("📦 Migrating Purchase Codes...");
  const result = await sourcePool.query("SELECT * FROM \"PurchaseCode\" ORDER BY \"createdAt\"");
  
  for (const row of result.rows) {
    try {
      await destPrisma.purchaseCode.upsert({
        where: { id: row.id },
        update: {},
        create: {
          id: row.id,
          code: row.code,
          courseId: row.courseId,
          createdBy: row.createdBy,
          usedBy: row.usedBy,
          usedAt: row.usedAt,
          isUsed: row.isUsed,
          grade: row.grade || null,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        },
      });
      stats.purchaseCodes++;
    } catch (error: any) {
      console.error(`Error migrating purchase code ${row.id}:`, error.message);
    }
  }
  console.log(`✅ Migrated ${stats.purchaseCodes} purchase codes`);
}

async function migratePurchases() {
  console.log("📦 Migrating Purchases...");
  const result = await sourcePool.query("SELECT * FROM \"Purchase\" ORDER BY \"createdAt\"");
  
  for (const row of result.rows) {
    try {
      await destPrisma.purchase.upsert({
        where: { id: row.id },
        update: {},
        create: {
          id: row.id,
          userId: row.userId,
          courseId: row.courseId,
          status: row.status || "ACTIVE",
          purchaseCodeId: row.purchaseCodeId,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        },
      });
      stats.purchases++;
    } catch (error: any) {
      console.error(`Error migrating purchase ${row.id}:`, error.message);
    }
  }
  console.log(`✅ Migrated ${stats.purchases} purchases`);
}

async function migrateUserProgress() {
  console.log("📦 Migrating User Progress...");
  const result = await sourcePool.query("SELECT * FROM \"UserProgress\" ORDER BY \"createdAt\"");
  
  for (const row of result.rows) {
    try {
      await destPrisma.userProgress.upsert({
        where: { id: row.id },
        update: {},
        create: {
          id: row.id,
          userId: row.userId,
          chapterId: row.chapterId,
          isCompleted: row.isCompleted || false,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        },
      });
      stats.userProgress++;
    } catch (error: any) {
      console.error(`Error migrating user progress ${row.id}:`, error.message);
    }
  }
  console.log(`✅ Migrated ${stats.userProgress} user progress records`);
}

async function migrateBalanceTransactions() {
  console.log("📦 Migrating Balance Transactions...");
  const result = await sourcePool.query("SELECT * FROM \"BalanceTransaction\" ORDER BY \"createdAt\"");
  
  for (const row of result.rows) {
    try {
      await destPrisma.balanceTransaction.upsert({
        where: { id: row.id },
        update: {},
        create: {
          id: row.id,
          userId: row.userId,
          amount: parseFloat(row.amount) || 0,
          type: row.type,
          description: row.description,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        },
      });
      stats.balanceTransactions++;
    } catch (error: any) {
      console.error(`Error migrating balance transaction ${row.id}:`, error.message);
    }
  }
  console.log(`✅ Migrated ${stats.balanceTransactions} balance transactions`);
}

async function migrateQuizResults() {
  console.log("📦 Migrating Quiz Results...");
  const result = await sourcePool.query("SELECT * FROM \"QuizResult\" ORDER BY \"createdAt\"");
  
  for (const row of result.rows) {
    try {
      await destPrisma.quizResult.upsert({
        where: { id: row.id },
        update: {},
        create: {
          id: row.id,
          studentId: row.studentId,
          quizId: row.quizId,
          score: parseInt(row.score) || 0,
          totalPoints: parseInt(row.totalPoints) || 0,
          percentage: parseFloat(row.percentage) || 0,
          attemptNumber: parseInt(row.attemptNumber) || 1,
          submittedAt: row.submittedAt,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        },
      });
      stats.quizResults++;
    } catch (error: any) {
      console.error(`Error migrating quiz result ${row.id}:`, error.message);
    }
  }
  console.log(`✅ Migrated ${stats.quizResults} quiz results`);
}

async function migrateQuizAnswers() {
  console.log("📦 Migrating Quiz Answers...");
  const result = await sourcePool.query("SELECT * FROM \"QuizAnswer\" ORDER BY \"createdAt\"");
  
  for (const row of result.rows) {
    try {
      await destPrisma.quizAnswer.upsert({
        where: { id: row.id },
        update: {},
        create: {
          id: row.id,
          questionId: row.questionId,
          quizResultId: row.quizResultId,
          studentAnswer: row.studentAnswer,
          correctAnswer: row.correctAnswer,
          isCorrect: row.isCorrect,
          pointsEarned: parseInt(row.pointsEarned) || 0,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        },
      });
      stats.quizAnswers++;
    } catch (error: any) {
      console.error(`Error migrating quiz answer ${row.id}:`, error.message);
    }
  }
  console.log(`✅ Migrated ${stats.quizAnswers} quiz answers`);
}

async function main() {
  console.log("🚀 Starting database migration from Aiven to Prisma Postgres...\n");

  // Validate environment variables
  if (!sourceDatabaseUrl) {
    throw new Error("Source database URL (AIVEN_DATABASE_URL or DATABASE_URL) is not set");
  }

  if (!destDatabaseUrl) {
    throw new Error("PRISMA_DATABASE_URL is not set");
  }

  console.log(`📊 Source Database: ${sourceDatabaseUrl.split('@')[1] || 'Aiven'}`);
  console.log(`📊 Destination Database: ${destDatabaseUrl.split('@')[1] || 'Prisma Postgres'}\n`);

  try {
    // Test source connection
    console.log("🔌 Testing source database connection...");
    await sourcePool.query("SELECT 1");
    console.log("✅ Source database connected\n");

    // Test destination connection
    console.log("🔌 Testing destination database connection...");
    await destPrisma.$connect();
    console.log("✅ Destination database connected\n");

    // Check if tables exist in destination database
    console.log("🔍 Checking if database schema exists...");
    try {
      // Check for User table (case-insensitive check)
      const tableCheck = await destPrisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND (tablename = 'User' OR tablename = 'user');
      `;
      
      if (tableCheck.length === 0) {
        console.log("⚠️  Database tables not found in destination database!");
        console.log("\n📋 Running migrations automatically...\n");
        
        // Try to run migrations automatically
        const { execSync } = await import('child_process');
        const originalDatabaseUrl = process.env.DATABASE_URL;
        const originalDirectUrl = process.env.DIRECT_DATABASE_URL;
        
        try {
          // Temporarily set environment variables for migrations
          process.env.DATABASE_URL = destDatabaseUrl;
          process.env.DIRECT_DATABASE_URL = process.env.PRISMA_DIRECT_DATABASE_URL || destDatabaseUrl;
          
          // Use db push instead of migrate deploy to sync schema directly
          // This avoids issues with old migration files that may have MySQL syntax
          console.log("🔄 Syncing database schema (this may take a moment)...");
          execSync('npx prisma db push --accept-data-loss', { 
            stdio: 'inherit',
            env: { ...process.env, DATABASE_URL: destDatabaseUrl, DIRECT_DATABASE_URL: process.env.PRISMA_DIRECT_DATABASE_URL || destDatabaseUrl }
          });
          
          // Restore original values
          if (originalDatabaseUrl) process.env.DATABASE_URL = originalDatabaseUrl;
          if (originalDirectUrl) process.env.DIRECT_DATABASE_URL = originalDirectUrl;
          
          console.log("✅ Schema sync completed successfully!\n");
          
          // Disconnect old client
          await destPrisma.$disconnect();
          
          // Try to regenerate Prisma client (may fail on Windows due to file locks, but that's OK)
          console.log("🔄 Regenerating Prisma client...");
          try {
            execSync('npx prisma generate', { 
              stdio: 'pipe',
              env: { ...process.env, DATABASE_URL: destDatabaseUrl }
            });
            console.log("✅ Prisma client regenerated");
          } catch (genError: any) {
            // If generation fails (Windows file lock), that's OK - client might already be generated
            console.log("⚠️  Prisma generate skipped (may already be generated)");
          }
          
          // Wait a moment for any file operations to complete
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Create a new Prisma client instance to pick up the new schema
          console.log("🔄 Reconnecting Prisma client...");
          destPrisma = createDestPrisma();
          await destPrisma.$connect();
          
          // Verify tables exist
          const verifyTables = await destPrisma.$queryRaw<Array<{ tablename: string }>>`
            SELECT tablename FROM pg_tables 
            WHERE schemaname = 'public' 
            AND (tablename = 'User' OR tablename = 'user');
          `;
          
          if (verifyTables.length === 0) {
            throw new Error("Tables still not found after schema sync. Please check your Prisma schema.");
          }
          
          console.log("✅ Prisma client reconnected and verified\n");
          
        } catch (migrationError: any) {
          // Restore original values
          if (originalDatabaseUrl) process.env.DATABASE_URL = originalDatabaseUrl;
          if (originalDirectUrl) process.env.DIRECT_DATABASE_URL = originalDirectUrl;
          
          console.log("\n❌ Automatic migration failed. Please run migrations manually:");
          console.log("   1. Set DATABASE_URL to PRISMA_DATABASE_URL:");
          console.log("      $env:DATABASE_URL=$env:PRISMA_DATABASE_URL");
          console.log("      $env:DIRECT_DATABASE_URL=$env:PRISMA_DIRECT_DATABASE_URL");
          console.log("   2. Run migrations:");
          console.log("      npx prisma migrate deploy");
          console.log("   3. Then run this migration script again\n");
          throw new Error(`Migration failed: ${migrationError.message}`);
        }
      } else {
        console.log("✅ Database schema found\n");
      }
    } catch (error: any) {
      if (error.message.includes("Migration failed")) {
        throw error;
      }
      // If query fails, try to run migrations anyway
      console.log("⚠️  Could not verify database schema. Attempting to run migrations...\n");
      
      try {
        const { execSync } = await import('child_process');
        const originalDatabaseUrl = process.env.DATABASE_URL;
        const originalDirectUrl = process.env.DIRECT_DATABASE_URL;
        
        process.env.DATABASE_URL = destDatabaseUrl;
        process.env.DIRECT_DATABASE_URL = process.env.PRISMA_DIRECT_DATABASE_URL || destDatabaseUrl;
        
        // Use db push instead of migrate deploy to sync schema directly
        // This avoids issues with old migration files that may have MySQL syntax
        console.log("🔄 Syncing database schema (this may take a moment)...");
        execSync('npx prisma db push --accept-data-loss', { 
          stdio: 'inherit',
          env: { ...process.env, DATABASE_URL: destDatabaseUrl, DIRECT_DATABASE_URL: process.env.PRISMA_DIRECT_DATABASE_URL || destDatabaseUrl }
        });
        
        if (originalDatabaseUrl) process.env.DATABASE_URL = originalDatabaseUrl;
        if (originalDirectUrl) process.env.DIRECT_DATABASE_URL = originalDirectUrl;
        
        console.log("✅ Schema sync completed!\n");
        
        // Disconnect old client
        await destPrisma.$disconnect();
        
        // Try to regenerate Prisma client (may fail on Windows due to file locks, but that's OK)
        console.log("🔄 Regenerating Prisma client...");
        try {
          execSync('npx prisma generate', { 
            stdio: 'pipe',
            env: { ...process.env, DATABASE_URL: destDatabaseUrl }
          });
          console.log("✅ Prisma client regenerated");
        } catch (genError: any) {
          // If generation fails (Windows file lock), that's OK - client might already be generated
          console.log("⚠️  Prisma generate skipped (may already be generated)");
        }
        
        // Wait a moment for any file operations to complete
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Create a new Prisma client instance to pick up the new schema
        console.log("🔄 Reconnecting Prisma client...");
        destPrisma = createDestPrisma();
        await destPrisma.$connect();
        
        // Verify tables exist
        const verifyTables = await destPrisma.$queryRaw<Array<{ tablename: string }>>`
          SELECT tablename FROM pg_tables 
          WHERE schemaname = 'public' 
          AND (tablename = 'User' OR tablename = 'user');
        `;
        
        if (verifyTables.length === 0) {
          throw new Error("Tables still not found after schema sync. Please check your Prisma schema.");
        }
        
        console.log("✅ Prisma client reconnected and verified\n");
      } catch (migrationError: any) {
        console.log("\n❌ Could not run migrations automatically. Please run manually:");
        console.log("   $env:DATABASE_URL=$env:PRISMA_DATABASE_URL");
        console.log("   npx prisma migrate deploy\n");
        throw new Error(`Schema check and migration failed: ${error.message}`);
      }
    }

    // Migrate in order (respecting foreign key dependencies)
    await migrateUsers();
    await migrateCourses();
    await migrateAttachments();
    await migrateChapters();
    await migrateChapterAttachments();
    await migrateQuizzes();
    await migrateQuestions();
    await migratePurchaseCodes();
    await migratePurchases();
    await migrateUserProgress();
    await migrateBalanceTransactions();
    await migrateQuizResults();
    await migrateQuizAnswers();

    console.log("\n📊 Migration Summary:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`Users:              ${stats.users}`);
    console.log(`Courses:            ${stats.courses}`);
    console.log(`Attachments:        ${stats.attachments}`);
    console.log(`Chapters:           ${stats.chapters}`);
    console.log(`Chapter Attachments: ${stats.chapterAttachments}`);
    console.log(`Quizzes:            ${stats.quizzes}`);
    console.log(`Questions:          ${stats.questions}`);
    console.log(`Purchase Codes:     ${stats.purchaseCodes}`);
    console.log(`Purchases:          ${stats.purchases}`);
    console.log(`User Progress:      ${stats.userProgress}`);
    console.log(`Balance Transactions: ${stats.balanceTransactions}`);
    console.log(`Quiz Results:       ${stats.quizResults}`);
    console.log(`Quiz Answers:       ${stats.quizAnswers}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    const total = Object.values(stats).reduce((sum, count) => sum + count, 0);
    console.log(`\n✅ Migration completed! Total records migrated: ${total}`);
    
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    throw error;
  } finally {
    await sourcePool.end();
    await destPrisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

