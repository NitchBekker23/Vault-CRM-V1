# The Vault - Inventory Management System (V2 Development)

**GitHub Repository**: https://github.com/NitchBekker23/Vault-CRM-V1
**Current Branch**: v2-development
**Status**: Development version with Supabase migration prep

A sophisticated inventory management platform for watches and leather goods, designed to streamline multi-user inventory tracking with enhanced user experience and interactive features.

## Features

- **Normalized Database Structure**: Brands → SKUs → Inventory Items hierarchy
- **Multi-User Authentication**: Role-based access control (Owner, Admin, User)
- **Email Integration**: Brevo API for notifications and account management
- **Image Management**: Optimized storage with SKU inheritance
- **Real-time Analytics**: Dashboard with inventory metrics
- **Bulk Operations**: CSV import/export with validation
- **Activity Logging**: Complete audit trail

## Tech Stack

- **Frontend**: TypeScript React with Tailwind CSS
- **Backend**: Node.js Express with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth (migrating to Supabase)
- **Email**: Brevo API
- **File Storage**: Local uploads with planned cloud migration

## Database Schema

### Core Tables
- `brands` - Product brands (Rolex, Omega, etc.)
- `skus` - Stock keeping units with brand relationships
- `inventory_items` - Individual items linked to SKUs
- `users` - User accounts with role-based permissions
- `clients` - Customer management with categories
- `sales` - Transaction tracking
- `activity_log` - System audit trail

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   - `DATABASE_URL` - PostgreSQL connection string
   - `BREVO_API_KEY` - Email service API key
   - `SESSION_SECRET` - Session encryption key

3. Initialize database:
   ```bash
   npm run db:push
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

## Migration Plan

Moving to Supabase + GitHub + Vercel stack:
- **Database**: Migrate PostgreSQL to Supabase
- **Authentication**: Replace Replit Auth with Supabase Auth
- **Frontend**: Deploy to Vercel
- **Backend**: Supabase Edge Functions or continue with Express

## API Endpoints

- `/api/inventory` - Inventory management
- `/api/admin/users` - User management (admin only)
- `/api/auth/*` - Authentication flow
- `/api/dashboard/metrics` - Analytics data

## Current Status

- ✅ Normalized database structure implemented
- ✅ User authentication and management working
- ✅ Email integration with Brevo API active
- ✅ Image optimization and SKU inheritance
- ✅ Bulk CSV import/export functionality
- ✅ Real-time dashboard metrics
- 🔄 Ready for Supabase migration