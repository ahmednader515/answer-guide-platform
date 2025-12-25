# Database Migration Guide: Aiven to Prisma Postgres

This guide will help you migrate your database from Aiven PostgreSQL to Prisma Postgres.

## Step 1: Add Environment Variables

Add the following environment variables to your `.env` file (or `.env.local`):

```env
# Source Database (Aiven) - Your current Aiven PostgreSQL connection string
# You can use either DATABASE_URL or AIVEN_DATABASE_URL
DATABASE_URL="postgresql://user:password@aiven-host:port/database?sslmode=require"
# OR
AIVEN_DATABASE_URL="postgresql://user:password@aiven-host:port/database?sslmode=require"

# Destination Database (Prisma Postgres) - Your new Prisma Postgres connection string
PRISMA_DATABASE_URL="postgresql://user:password@prisma-host:port/database?sslmode=require"
PRISMA_DIRECT_DATABASE_URL="postgresql://user:password@prisma-host:port/database?sslmode=require"
```

### Environment Variable Names:

- **`DATABASE_URL`** or **`AIVEN_DATABASE_URL`** - Your current Aiven PostgreSQL connection string (source database)
  - The script will use `AIVEN_DATABASE_URL` if set, otherwise fall back to `DATABASE_URL`
- **`PRISMA_DATABASE_URL`** - Your new Prisma Postgres connection string (destination database)
- **`PRISMA_DIRECT_DATABASE_URL`** - Direct connection URL for Prisma Postgres (same as PRISMA_DATABASE_URL, used for migrations)

### Important Notes:

1. **Keep your existing `DATABASE_URL`** pointing to Aiven during migration (or set `AIVEN_DATABASE_URL`)
2. **Add the new Prisma Postgres URLs** as `PRISMA_DATABASE_URL` and `PRISMA_DIRECT_DATABASE_URL`
3. After migration is complete, you can update `DATABASE_URL` and `DIRECT_DATABASE_URL` to point to Prisma Postgres

## Step 2: Install Required Dependencies

Install the PostgreSQL client library needed for the migration:

```bash
npm install pg dotenv
npm install --save-dev @types/pg ts-node
```

## Step 3: Set Up Prisma Postgres Database Schema

**⚠️ IMPORTANT: You MUST run migrations on the Prisma Postgres database BEFORE running the migration script!**

1. Create a new database in Prisma Postgres
2. Run migrations to create the schema on the new database:
   
   **On Windows PowerShell:**
   ```powershell
   # Temporarily set DATABASE_URL to Prisma Postgres
   $env:DATABASE_URL=$env:PRISMA_DATABASE_URL
   $env:DIRECT_DATABASE_URL=$env:PRISMA_DIRECT_DATABASE_URL
   
   # Generate Prisma Client
   npx prisma generate
   
   # Run migrations on the new database
   npx prisma migrate deploy
   ```
   
   **On Linux/Mac:**
   ```bash
   # Temporarily set DATABASE_URL to Prisma Postgres
   export DATABASE_URL=$PRISMA_DATABASE_URL
   export DIRECT_DATABASE_URL=$PRISMA_DIRECT_DATABASE_URL
   
   # Generate Prisma Client
   npx prisma generate
   
   # Run migrations on the new database
   npx prisma migrate deploy
   ```
   
   **Note:** After running migrations, you can switch back to your original DATABASE_URL or keep both set. The migration script will check if tables exist and warn you if migrations haven't been run.

## Step 4: Run the Migration Script

Run the migration script using one of these methods:

**Option 1: Using npm script (recommended):**
```bash
npm run migrate:db
```

**Option 2: Using ts-node directly:**
```bash
npx ts-node scripts/migrate-db.ts
```

The script will:
- Connect to both databases
- Migrate all data in the correct order (respecting foreign key dependencies)
- Use `upsert` operations to handle duplicates safely
- Display progress and a summary at the end

## Step 5: Verify Migration

After migration completes:

1. Check the migration summary output
2. Verify data in your Prisma Postgres database
3. Test your application with the new database

## Step 6: Update Environment Variables

Once migration is verified and tested:

1. Update your `.env` file:
   ```env
   # Update these to point to Prisma Postgres
   DATABASE_URL=$PRISMA_DATABASE_URL
   DIRECT_DATABASE_URL=$PRISMA_DIRECT_DATABASE_URL
   ```

2. You can remove `AIVEN_DATABASE_URL` and `PRISMA_DATABASE_URL` after confirming everything works

## Migration Order

The script migrates data in this order to respect foreign key dependencies:

1. Users
2. Courses
3. Attachments
4. Chapters
5. Chapter Attachments
6. Quizzes
7. Questions
8. Purchase Codes
9. Purchases
10. User Progress
11. Balance Transactions
12. Quiz Results
13. Quiz Answers

## Troubleshooting

### Connection Errors
- Verify both connection strings are correct
- Check network access to both databases
- Ensure SSL mode is correctly configured

### Foreign Key Errors
- The script handles this by migrating in the correct order
- If errors occur, check that all parent records exist

### Duplicate Key Errors
- The script uses `upsert` to handle duplicates
- If errors persist, check unique constraints

### Missing Data
- Check the migration summary for counts
- Compare record counts between source and destination
- Re-run the script if needed (it's idempotent)

## Rollback Plan

If you need to rollback:
1. Keep your Aiven database intact (don't delete it)
2. Simply switch `DATABASE_URL` back to Aiven connection string
3. Your application will continue working with Aiven

## Support

If you encounter issues:
1. Check the error messages in the console
2. Verify environment variables are set correctly
3. Ensure both databases are accessible
4. Check that the Prisma Postgres database schema matches your Prisma schema

