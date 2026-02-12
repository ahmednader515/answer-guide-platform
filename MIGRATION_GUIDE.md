# Complete Guide: Migrating from UploadThing to Cloudflare R2

## Overview
This guide covers the complete migration from UploadThing to Cloudflare R2 with:
- ✅ Real-time upload progress tracking
- ✅ Server-Sent Events (SSE) for progress updates
- ✅ CORS configuration for video playback
- ✅ Database URL migration
- ✅ File organization by type

## Part 1: Setup and Configuration

### 1.1 Environment Variables
Add to your `.env` file:

```env
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=your-bucket-name
R2_PUBLIC_URL=https://your-bucket.r2.dev
# Or use custom domain: https://cdn.yourdomain.com
```

### 1.2 Cloudflare R2 Setup
1. Create an R2 bucket in Cloudflare Dashboard
2. Enable Public Access in bucket settings
3. Create API tokens (R2:Read, R2:Write)
4. Note your Account ID, Access Key ID, and Secret Access Key

## Part 2: Installation

Dependencies are already installed:
- `@aws-sdk/client-s3`
- `@aws-sdk/lib-storage`
- `dotenv` (already in dependencies)

## Part 3: Setup CORS

Run the CORS setup script:

```bash
npm run setup-r2-cors
```

This configures CORS for video playback from R2.

## Part 4: Migration Workflow

### Step 1: Backup Database URLs
Before making any changes, backup your current database URLs:

```bash
npm run backup-db-urls
```

This creates a backup in the `backups/` directory.

### Step 2: Download Existing Files (if needed)
If you haven't already downloaded files from UploadThing:

```bash
npm run download-uploadthing
```

### Step 3: Upload Files to R2
Upload all local files to R2:

```bash
npm run upload-to-r2
```

This will:
- Upload all files from the local directory to R2
- Organize files by type (images/, videos/, documents/)
- Create a mapping file: `uploadthing-to-r2-mapping.json`

**Note:** Set `UPLOADTHING_FILES_DIR` environment variable if your files are in a different location.

### Step 4: Migrate Database URLs
Update all database URLs from UploadThing to R2:

```bash
npm run migrate-db-to-r2
```

This updates:
- User images
- Course images
- Chapter videos
- Attachments
- Documents

## Part 5: Using the New Upload System

### File Upload Component
The `FileUpload` component has been updated to use R2 with:
- Real-time progress tracking
- Drag & drop support
- SSE-based progress updates

It automatically uses the correct folder based on endpoint:
- `courseImage` → `images/`
- `courseAttachment` → `documents/`
- `chapterVideo` → `videos/`

### API Endpoint
New upload endpoint: `/api/r2/upload`

Features:
- Server-Sent Events (SSE) for progress
- Multipart uploads for large files (>5MB)
- Automatic Content-Type detection
- Authentication required

## Part 6: Video Playback

The video player component has been updated with:
- CORS support (`crossOrigin="anonymous"`)
- Multiple source formats (mp4, webm, ogg)
- Preload metadata for better performance

## Part 7: Next.js Configuration

The `next.config.js` has been updated to include R2 image domains:
- `**.r2.dev`
- `**.r2.cloudflarestorage.com`

## Troubleshooting

### Videos not playing
- Check CORS configuration: `npm run setup-r2-cors`
- Verify R2 bucket has public access enabled
- Check browser console for CORS errors

### Upload stuck at 10%
- Verify R2 credentials in `.env`
- Check R2 bucket name is correct
- Ensure R2_ACCOUNT_ID is set correctly

### Progress not updating
- Verify SSE stream is being parsed correctly
- Check browser network tab for SSE events
- Ensure `/api/r2/upload` endpoint is accessible

### Database migration fails
- Ensure mapping file exists: `uploadthing-to-r2-mapping.json`
- Run `npm run upload-to-r2` first
- Check backup file exists before migration

## Important Notes

1. **R2 multipart uploads** require minimum 5MB part size (handled automatically)
2. **CORS must be configured** for video playback
3. **Public access must be enabled** on R2 bucket
4. **Always backup database** before migration
5. **Test thoroughly** before deploying to production

## File Structure

```
lib/r2/
  ├── config.ts          # R2 client configuration
  └── upload.ts          # Upload utilities

app/api/r2/
  └── upload/
      └── route.ts       # Upload API with SSE

scripts/
  ├── setup-r2-cors.ts              # CORS setup
  ├── backup-db-urls.ts             # Database backup
  ├── upload-to-r2.ts               # Upload files to R2
  └── migrate-db-urls-to-r2.ts      # Migrate database URLs
```

## Next Steps

1. ✅ Configure R2 credentials in `.env`
2. ✅ Run `npm run setup-r2-cors`
3. ✅ Test file uploads with new component
4. ✅ Backup database: `npm run backup-db-urls`
5. ✅ Upload existing files: `npm run upload-to-r2`
6. ✅ Migrate database: `npm run migrate-db-to-r2`
7. ✅ Test video playback
8. ✅ Deploy to production

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify all environment variables are set
3. Check R2 bucket settings in Cloudflare Dashboard
4. Review browser console and server logs
