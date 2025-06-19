# The Vault - Teams Migration Guide

## Current Project Status
- **Database**: Supabase PostgreSQL with production data (4 users, 22 inventory items)
- **Authentication**: Replit Auth with OpenID Connect
- **Features**: Complete inventory management, sales tracking, CSV imports
- **Environment**: Production-ready with authentic business data

## Migration Steps

### 1. Database Migration
Your Supabase database contains valuable production data that needs to be preserved:
- User accounts and roles
- Inventory items with images
- Sales transactions
- Store and sales person data

**Action Required**: Export your Supabase database before migration.

### 2. Environment Variables to Transfer
```
DATABASE_URL=your_supabase_connection_string
BREVO_API_KEY=your_email_service_key
SESSION_SECRET=auto_generated_in_new_environment
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. File Assets
- uploaded images in /uploads directory
- CSV templates and test files
- Business data files (stores, sales persons)

### 4. Teams-Specific Configuration
- Update REPLIT_DOMAINS environment variable for Teams domain
- Verify Replit Auth configuration for Teams environment
- Test database connectivity from Teams environment

## Migration Process

### Option A: Fork to Teams (Recommended)
1. In your current Repl, click the three dots menu
2. Select "Fork"
3. Choose your Teams account as the destination
4. All code and configuration will be copied

### Option B: Manual Recreation
1. Create new Repl in Teams account
2. Copy all project files
3. Reconfigure environment variables
4. Test database connectivity

## Post-Migration Checklist
- [ ] Database connection working
- [ ] Authentication functioning
- [ ] File uploads operational
- [ ] CSV imports working
- [ ] All environment variables configured
- [ ] Teams domain properly set

## Critical: Database Preservation
Your Supabase database will remain accessible from the new Teams environment using the same DATABASE_URL. No data migration needed - just environment configuration.