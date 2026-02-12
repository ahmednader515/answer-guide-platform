import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

interface UploadMapping {
  [uploadthingUrl: string]: string;
}

function loadMapping(): UploadMapping {
  const mappingFile = path.join(process.cwd(), "uploadthing-to-r2-mapping.json");
  
  if (!fs.existsSync(mappingFile)) {
    console.error(`❌ Mapping file not found: ${mappingFile}`);
    console.log("Please run 'npm run upload-to-r2' first to create the mapping file.");
    process.exit(1);
  }

  return JSON.parse(fs.readFileSync(mappingFile, "utf-8"));
}

function findR2Url(uploadthingUrl: string | null, mapping: UploadMapping): string | null {
  if (!uploadthingUrl) return null;

  // Try exact match first
  if (mapping[uploadthingUrl]) {
    return mapping[uploadthingUrl];
  }

  // Try to extract file key/name from UploadThing URL
  // UploadThing URLs typically look like: https://utfs.io/f/[key] or https://[subdomain].ufs.sh/f/[key]
  const urlMatch = uploadthingUrl.match(/\/([^\/]+)$/);
  if (urlMatch) {
    const key = urlMatch[1];
    // Try to find by key
    for (const [utUrl, r2Url] of Object.entries(mapping)) {
      if (utUrl.includes(key) || key.includes(utUrl)) {
        return r2Url;
      }
    }
  }

  // Try partial match
  for (const [utUrl, r2Url] of Object.entries(mapping)) {
    if (uploadthingUrl.includes(utUrl) || utUrl.includes(uploadthingUrl)) {
      return r2Url;
    }
  }

  return null;
}

async function migrateDatabaseUrls() {
  try {
    console.log("🔄 Starting database URL migration...");

    const mapping = loadMapping();
    console.log(`📝 Loaded ${Object.keys(mapping).length} URL mappings`);

    let updatedCount = 0;

    // Migrate User images
    console.log("\n👤 Migrating user images...");
    const users = await prisma.user.findMany({
      where: {
        image: {
          not: null,
        },
      },
    });

    for (const user of users) {
      if (user.image) {
        const r2Url = findR2Url(user.image, mapping);
        if (r2Url && r2Url !== user.image) {
          await prisma.user.update({
            where: { id: user.id },
            data: { image: r2Url },
          });
          updatedCount++;
          console.log(`   ✓ Updated user ${user.id}`);
        }
      }
    }

    // Migrate Course images
    console.log("\n📚 Migrating course images...");
    const courses = await prisma.course.findMany({
      where: {
        imageUrl: {
          not: null,
        },
      },
    });

    for (const course of courses) {
      if (course.imageUrl) {
        const r2Url = findR2Url(course.imageUrl, mapping);
        if (r2Url && r2Url !== course.imageUrl) {
          await prisma.course.update({
            where: { id: course.id },
            data: { imageUrl: r2Url },
          });
          updatedCount++;
          console.log(`   ✓ Updated course ${course.id}`);
        }
      }
    }

    // Migrate Chapter videos
    console.log("\n🎥 Migrating chapter videos...");
    const chapters = await prisma.chapter.findMany({
      where: {
        videoUrl: {
          not: null,
        },
      },
    });

    for (const chapter of chapters) {
      if (chapter.videoUrl) {
        const r2Url = findR2Url(chapter.videoUrl, mapping);
        if (r2Url && r2Url !== chapter.videoUrl) {
          await prisma.chapter.update({
            where: { id: chapter.id },
            data: { videoUrl: r2Url },
          });
          updatedCount++;
          console.log(`   ✓ Updated chapter ${chapter.id}`);
        }
      }
    }

    // Migrate Attachments
    console.log("\n📎 Migrating attachments...");
    const attachments = await prisma.attachment.findMany();

    for (const attachment of attachments) {
      const r2Url = findR2Url(attachment.url, mapping);
      if (r2Url && r2Url !== attachment.url) {
        await prisma.attachment.update({
          where: { id: attachment.id },
          data: { url: r2Url },
        });
        updatedCount++;
        console.log(`   ✓ Updated attachment ${attachment.id}`);
      }
    }

    // Migrate Documents
    console.log("\n📄 Migrating documents...");
    const documents = await prisma.document.findMany();

    for (const document of documents) {
      const r2Url = findR2Url(document.url, mapping);
      if (r2Url && r2Url !== document.url) {
        await prisma.document.update({
          where: { id: document.id },
          data: { url: r2Url },
        });
        updatedCount++;
        console.log(`   ✓ Updated document ${document.id}`);
      }
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   Total records updated: ${updatedCount}`);
  } catch (error: any) {
    console.error("❌ Failed to migrate database URLs:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrateDatabaseUrls();

