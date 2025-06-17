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