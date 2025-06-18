# The Vault - Inventory Management System

## Overview

The Vault is a sophisticated inventory management platform designed for watches and leather goods. Built with TypeScript, React, and PostgreSQL, it features a normalized database structure, multi-user authentication with role-based access control, and comprehensive inventory tracking capabilities. The system is currently production-ready with 4 users and 22 inventory items in the database.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **UI Library**: Tailwind CSS with Radix UI components (shadcn/ui)
- **State Management**: TanStack Query for server state
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite with HMR support

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM with type-safe queries
- **Session Management**: PostgreSQL-based sessions with connect-pg-simple
- **File Handling**: Multer for multipart uploads with memory storage

### Database Architecture
- **Primary Database**: PostgreSQL (currently Neon, Supabase-ready)
- **Schema**: Normalized structure with brands → SKUs → inventory items hierarchy
- **ORM**: Drizzle with Neon HTTP adapter for serverless compatibility
- **Migrations**: Schema-first approach with push-based deployments

## Key Components

### Authentication System
- **Provider**: Replit Auth with OpenID Connect integration
- **Session Storage**: PostgreSQL sessions table with TTL management
- **Authorization**: Role-based access control (owner/admin/user)
- **Security**: Multi-factor authentication support with email/SMS codes

### Inventory Management
- **Data Model**: Three-tier structure (brands → SKUs → individual items)
- **Image System**: SKU-based inheritance with deduplication
- **Categories**: Watches and leather goods with extensible taxonomy
- **Status Tracking**: In-stock, sold, reserved, and custom statuses

### User Management
- **Account Requests**: Self-service registration with admin approval
- **Role Management**: Hierarchical permissions (owner > admin > user)
- **Profile Management**: Complete user profiles with contact information
- **Activity Logging**: Comprehensive audit trail for all user actions

### File Management
- **Upload System**: Image optimization with hash-based deduplication
- **Storage**: Local filesystem with cloud migration readiness
- **CSV Processing**: Bulk import/export with validation and error handling
- **Image Inheritance**: SKU-level image sharing across inventory items

## Data Flow

### Authentication Flow
1. User initiates login through Replit Auth
2. OpenID Connect discovery and token exchange
3. Session creation in PostgreSQL with user context
4. Role-based route protection and resource authorization

### Inventory Operations
1. Item creation with automatic SKU association
2. Image processing and storage with deduplication
3. Activity logging for audit trail
4. Real-time updates to dashboard metrics

### Bulk Operations
1. CSV file upload and parsing
2. Data validation against schema
3. Batch database operations with rollback capability
4. Error reporting and success confirmation

## External Dependencies

### Core Services
- **Database**: PostgreSQL (Neon/Supabase with HTTP adapter)
- **Authentication**: Replit Auth with OpenID Connect
- **Email**: Brevo API for transactional emails
- **Session Store**: PostgreSQL-based session management

### Development Tools
- **Build System**: Vite with TypeScript support
- **Code Quality**: ESLint and TypeScript strict mode
- **UI Components**: Radix UI primitives with Tailwind styling
- **Database Tools**: Drizzle Kit for schema management

### Production Dependencies
- **Runtime**: Node.js 20 with ES modules
- **Database Driver**: Neon serverless for HTTP connections
- **File Processing**: Sharp for image optimization
- **CSV Handling**: csv-parser for bulk operations

## Deployment Strategy

### Current Environment
- **Platform**: Replit with PostgreSQL module
- **Database**: Neon PostgreSQL (production-ready)
- **Build**: npm run build for static assets and server bundle
- **Runtime**: npm run start for production server

### Migration Path
- **Target Platform**: Vercel/Netlify + Supabase stack
- **Database Migration**: Automated schema push with data preservation
- **Authentication**: Transition from Replit Auth to Supabase Auth
- **File Storage**: Migration to cloud storage (Supabase Storage/AWS S3)

### Environment Variables
```
DATABASE_URL=postgresql://[connection-string]
SESSION_SECRET=[auto-generated]
BREVO_API_KEY=[configured]
REPLIT_DOMAINS=[development]
```

## Recent Changes
- June 18, 2025: Added sortable table columns for inventory management
  - Implemented clickable Price and Days in Stock column headers
  - Added ascending/descending sort functionality with visual indicators
  - Icons show current sort direction (up/down arrows, neutral state)
  - Hover effects on sortable headers for better user experience
  - Works seamlessly on both mobile and desktop views
- June 17, 2025: Fixed inventory management authentication issues
  - **CRITICAL FIX**: Resolved logout issues during edit/create/delete operations
  - Updated all inventory routes to use session-based authentication instead of Passport authentication
  - Fixed routes: create items, edit items, delete items, bulk import, image uploads, storage analytics
  - Users can now edit items with cost prices without being logged out
  - Authentication remains stable throughout all inventory operations
- June 17, 2025: Implemented complete cost price functionality
  - Added costPrice field to database schema with proper decimal precision
  - Updated add/edit forms with side-by-side selling price and cost price fields
  - Enhanced item details modal to display both prices (selling price in green, cost price in orange)
  - Updated CSV import template and processing to include cost price validation
  - Cost price is optional and validates as positive decimal number
- June 17, 2025: Enhanced SKU image inheritance debugging
  - Added comprehensive logging for SKU image inheritance during imports
  - Improved debugging for both individual item creation and bulk CSV imports
  - System now logs detailed information about existing SKU items and image inheritance
- June 17, 2025: Fixed critical authentication session bug affecting all users
  - **CRITICAL FIX**: Authentication was overwriting all user roles to "user" on every login
  - Modified authentication to preserve existing admin/owner roles across login sessions
  - Fixed session cookie configuration for proper session persistence
  - Updated admin routes to use consistent authentication middleware
  - All users (including 40 daily users) now maintain proper role-based access after logout/login cycles
  - User management tab now functions properly with preserved owner privileges
  - **CONFIRMED WORKING**: Role update functionality fully operational with proper authentication
- June 17, 2025: Enhanced security system and database management
  - Implemented comprehensive role-based access control with audit logging
  - Added role hierarchy validation preventing privilege escalation
  - Enhanced admin middleware with detailed authorization tracking
  - Successfully migrated from Neon to Replit PostgreSQL database
  - Preserved all user data and elevated account to owner status for full administrative access
  - Enhanced user management with self-modification prevention and ownership validation
- June 17, 2025: Fixed image upload system completely
  - Resolved base64 encoding memory issues by implementing proper file uploads
  - Created separate multer configurations for CSV and image files
  - Added dedicated image upload endpoint with authentication
  - Fixed date field validation to handle both Date objects and strings
  - System now successfully uploads, stores, and saves images with inventory items
- June 17, 2025: Fixed bulk import data integrity issues
  - Implemented two-phase transaction system for CSV imports
  - Added complete validation before any database operations
  - Eliminated partial imports that caused serial number conflicts
  - Enhanced error reporting and transaction rollback handling
- June 17, 2025: Added new inventory categories
  - Added "pens" category for luxury writing instruments
  - Added "other" category for miscellaneous items
  - Updated forms, filters, and CSV templates with new categories
- June 17, 2025: Complete date tracking system implementation
  - Added dateReceived field to database with automatic defaults
  - Implemented "Days in Stock" calculation and display
  - Added date range filtering (7/30/90 days, over 90 days)
  - Updated CSV bulk import to include dateReceived field
  - Enhanced inventory table with date tracking column
- June 17, 2025: Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.

## Planned Development: Sales Management System (June 18, 2025)

### Vision
Transform inventory management into complete business workflow by implementing sales processing system that moves items from inventory to client purchase history via CSV bulk import.

### Key Requirements Discussed
- **CSV Sales Import**: Bulk process sales data from previous day
- **Duplicate Prevention**: Handle overlap between manual sales and CSV imports
- **Client Purchase Tracking**: Build comprehensive client profiles with purchase history
- **Inventory Flow**: Clear progression from in_stock → sold → transferred_to_client
- **VIP Classification**: Automatic client classification based on purchase behavior

### Technical Architecture Planned
- **Sales Transactions Table**: Link clients to inventory items with pricing data
- **Enhanced Client Profiles**: Add birthday, preferences, notes, purchase analytics
- **Composite Unique Keys**: Prevent duplicate sales (client_id + item_serial + sale_date)
- **Audit Trail System**: Track all inventory status changes with timestamps
- **Smart CSV Processing**: Preview conflicts, skip duplicates, detailed reporting

### Implementation Phases
1. **Database Schema**: Sales transactions and enhanced client tables
2. **Client Management**: Enhanced profiles with purchase history
3. **CSV Sales Import**: Duplicate-aware bulk processing system
4. **Analytics Dashboard**: Purchase patterns, VIP identification, profit tracking

### Concerns Addressed
- Automatic duplicate detection without manual CSV editing
- Unified transaction system for both manual and CSV sales
- Complete audit trail for inventory status transitions
- Conflict resolution with detailed import previews