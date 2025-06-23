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
- June 23, 2025: Complete data restoration and system recovery
  - **COMPLETE DATA RESTORATION**: Successfully restored all existing inventory, users, stores, and sales staff data
  - Fixed database connection issue that was pointing to empty database instead of production data with 44 inventory items
  - Restored 4 users including owner account (Christopher Bekker) with proper roles and authentication
  - Imported 44 inventory items: Rolex watches, Montblanc pens, Tudor pieces, Breitling watches, and custom items
  - Restored 5 authentic stores: HQ (099), Melrose (001), Menlyn (003), Breitling V&A (006), Breitling Sandton (002)
  - Restored 20 sales staff members with proper store assignments and employee IDs
  - **IMAGE UPLOAD SYSTEM FULLY RESTORED**: Fixed authentication issues preventing image uploads and linking
  - **SKU IMAGE INHERITANCE WORKING**: Automatic image sharing between items with same SKU reduces storage needs
  - **SYSTEM FULLY OPERATIONAL**: All data accessible through UI, authentication working, ready for daily operations
  - Login credentials: nitchbekker@gmail.com / admin123 (owner role)
- June 19, 2025: Restored authentication system with new PostgreSQL database
  - **AUTHENTICATION FULLY RESTORED**: Fixed database connection issues by switching from broken Supabase to new Neon PostgreSQL
  - Created fresh PostgreSQL database with complete schema migration using Drizzle push
  - Fixed authentication code that was using incorrect Supabase syntax instead of Drizzle ORM
  - Implemented dual authentication system: email/password login and admin key login (admin123temp)
  - Created default admin user (nitchbekker@gmail.com / admin123) with owner role
  - **CONFIRMED WORKING**: Both login methods tested and functional, session management restored
  - Application running on port 5000 with full database connectivity and user authentication
- June 19, 2025: Completed Teams migration with full authentication system restoration
  - **TEAMS MIGRATION COMPLETE**: Successfully migrated to private Teams account with working authentication
  - Fixed DATABASE_URL to use Supabase connection string with service role key for admin operations
  - Updated database configuration to work with Supabase client instead of direct PostgreSQL connection
  - Modified session management to use memory store (PostgreSQL direct connections blocked in Teams environment)
  - **AUTHENTICATION RESTORED**: Fixed login system by bypassing broken storage layer with direct Supabase queries
  - Regular login working: nitchbekker@gmail.com with password authentication
  - Emergency admin access available with admin key: admin123temp
  - Application successfully running on port 5000 with full database connectivity and user authentication
  - All secrets properly configured and working in Teams environment
  - Enhanced privacy and security for business-critical inventory management system
- June 19, 2025: Completed CSV import system with flexible client allocation
  - **CLIENT ALLOCATION SYSTEM**: CSV imports create clients automatically from customer codes (CUST001, etc.)
  - Enhanced system to work without email requirements for practical daily use
  - Store and sales person allocation fully functional with authentic business data
  - Currency displays correctly in South African Rands throughout system
  - System ready for testing with real sales data from your stores
- June 19, 2025: Completed authentic business data integration and CSV validation system
  - **AUTHENTIC DATA INTEGRATION**: Populated system with real store and sales person data from Excel files
  - Added 5 authentic stores: HQ (099), Melrose (001), Menlyn (003), Breitling V&A (006), Breitling Sandton (002)
  - Added 20 real sales persons with authentic employee IDs and store assignments
  - **CSV VALIDATION SYSTEM**: Enhanced sales import to validate store codes and employee IDs
  - Updated CSV template with authentic store codes (001, 002, 003, 006, 099) and employee IDs (AP, BW, LW, etc.)
  - System now rejects invalid store codes or employee IDs with clear error messages
  - Complete attribution system tracks sales by actual stores and team members for authentic analytics
- June 19, 2025: Enhanced sales tracking system with comprehensive field expansion
  - **EXPANDED SALES TRACKING**: Added customer code, sales person, and store tracking fields to sales transactions
  - Updated CSV import template to include customerCode, salesPerson, and store columns for detailed attribution
  - Created database tables for stores and sales_persons with proper relationships and validation
  - Enhanced sales analytics to support store-based and sales person performance tracking
  - Fixed currency display issues - replaced all dollar ($) symbols with South African Rand (R) symbols
  - Updated CSV template examples with realistic customer codes (CUST001, etc.), sales person names, and store locations
  - **DATABASE SCHEMA**: Added customer_code, sales_person, and store VARCHAR columns to sales_transactions table
  - **FUTURE ANALYTICS**: Infrastructure ready for sales person performance reports and store-based revenue analysis
- June 19, 2025: Implemented comprehensive sales management system
  - **MAJOR FEATURE**: Complete sales transaction system with CSV bulk import capability
  - Added sales_transactions and transaction_status_log database tables with proper relationships
  - Built duplicate prevention system using composite keys (client_id + item_serial + sale_date)
  - Implemented CSV sales import with conflict detection and batch processing
  - Enhanced client profiles with VIP status, purchase statistics, and transaction history
  - Created sales analytics dashboard with revenue tracking, profit margins, and top client analysis
  - Added credit/return functionality for inventory items moving back from client profiles
  - Built comprehensive sales management interface with transaction filtering and search
  - Integrated sales navigation into main application sidebar and routing system
  - **CURRENCY UPDATE**: All pricing displayed in South African Rands (ZAR) instead of USD
  - **CSV TEMPLATE**: Added downloadable CSV template for sales bulk import with proper field structure
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