import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

interface BackupData {
  timestamp: string;
  users: Array<{ id: string; image: string | null }>;
  courses: Array<{ id: string; imageUrl: string | null }>;
  chapters: Array<{ id: string; videoUrl: string | null }>;
  attachments: Array<{ id: string; url: string }>;
  documents: Array<{ id: string; url: string }>;
}

async function backupDatabaseUrls() {
  try {
    console.log("📦 Starting database URL backup...");

    const users = await prisma.user.findMany({
      where: {
        image: {
          not: null,
        },
      },
      select: {
        id: true,
        image: true,
      },
    });

    const courses = await prisma.course.findMany({
      where: {
        imageUrl: {
          not: null,
        },
      },
      select: {
        id: true,
        imageUrl: true,
      },
    });

    const chapters = await prisma.chapter.findMany({
      where: {
        videoUrl: {
          not: null,
        },
      },
      select: {
        id: true,
        videoUrl: true,
      },
    });

    const attachments = await prisma.attachment.findMany({
      select: {
        id: true,
        url: true,
      },
    });

    const documents = await prisma.document.findMany({
      select: {
        id: true,
        url: true,
      },
    });

    const backup: BackupData = {
      timestamp: new Date().toISOString(),
      users,
      courses,
      chapters,
      attachments,
      documents,
    };

    const backupDir = path.join(process.cwd(), "backups");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const backupFile = path.join(
      backupDir,
      `db-urls-backup-${Date.now()}.json`
    );
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));

    console.log(`✅ Backup created: ${backupFile}`);
    console.log(`   - Users: ${users.length}`);
    console.log(`   - Courses: ${courses.length}`);
    console.log(`   - Chapters: ${chapters.length}`);
    console.log(`   - Attachments: ${attachments.length}`);
    console.log(`   - Documents: ${documents.length}`);
  } catch (error: any) {
    console.error("❌ Failed to backup database URLs:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

backupDatabaseUrls();

