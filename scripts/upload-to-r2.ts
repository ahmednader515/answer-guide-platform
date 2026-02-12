import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import { uploadToR2, generateR2Key, detectContentType } from "../lib/r2/upload";

const prisma = new PrismaClient();

interface UploadMapping {
  [uploadthingUrl: string]: string; // Maps UploadThing URL to R2 URL
}

async function uploadLocalFilesToR2(localDir: string): Promise<UploadMapping> {
  const mapping: UploadMapping = {};
  const files = fs.readdirSync(localDir, { recursive: true });

  console.log(`📤 Found ${files.length} files to upload...`);

  for (const file of files) {
    const filePath = path.join(localDir, file as string);
    const stat = fs.statSync(filePath);

    if (stat.isFile()) {
      try {
        // Determine folder based on file extension
        const ext = path.extname(filePath).toLowerCase().slice(1);
        let folder = "uploads";
        
        if (["mp4", "webm", "ogg", "mov", "avi"].includes(ext)) {
          folder = "videos";
        } else if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) {
          folder = "images";
        } else if (["pdf", "doc", "docx", "txt", "xls", "xlsx"].includes(ext)) {
          folder = "documents";
        }

        const key = generateR2Key(path.basename(filePath), folder);
        const contentType = detectContentType(path.basename(filePath));
        
        console.log(`   Uploading: ${file} -> ${key}`);
        const url = await uploadToR2(filePath, key, contentType);
        
        // Store mapping - you'll need to match this with UploadThing URLs
        // This is a simplified version - you may need to adjust based on your file naming
        mapping[file as string] = url;
      } catch (error: any) {
        console.error(`   ❌ Failed to upload ${file}:`, error.message);
      }
    }
  }

  return mapping;
}

async function main() {
  const localDir = process.env.UPLOADTHING_FILES_DIR || "E:\\uploadthing-files\\answer-guide-platform";
  
  if (!fs.existsSync(localDir)) {
    console.error(`❌ Directory not found: ${localDir}`);
    console.log("Please set UPLOADTHING_FILES_DIR environment variable or download files first.");
    process.exit(1);
  }

  console.log("🚀 Starting upload to R2...");
  console.log(`📁 Source directory: ${localDir}`);

  const mapping = await uploadLocalFilesToR2(localDir);

  // Save mapping file
  const mappingFile = path.join(process.cwd(), "uploadthing-to-r2-mapping.json");
  fs.writeFileSync(mappingFile, JSON.stringify(mapping, null, 2));

  console.log(`✅ Upload complete!`);
  console.log(`📝 Mapping saved to: ${mappingFile}`);
  console.log(`   Total files uploaded: ${Object.keys(mapping).length}`);
}

main()
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

