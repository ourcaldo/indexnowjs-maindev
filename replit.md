# IndexNow Pro - Professional Web Application

## Overview

IndexNow Pro is a professional-grade, full-stack web application designed to automate Google URL indexing through the Google Search Console API. It serves as a comprehensive solution for SEO professionals, digital marketers, and website owners needing efficient, large-scale indexing with advanced monitoring and reporting. The application provides instant indexing capabilities, managing multiple service accounts, scheduled jobs, and enterprise-scale operations.

**Key Capabilities:**
- Automated Google Indexing for thousands of URLs.
- Multi-Service Account Management with load balancing.
- Advanced Scheduling (one-time, hourly, daily, weekly, monthly).
- Comprehensive Monitoring (real-time job tracking, quota, analytics).
- Professional Email Notifications for job status and quota alerts.
- Enterprise Security with role-based access control and auditing.

## User Preferences

- **Migration Status:** Project successfully migrated to Replit environment on 2025-08-13. All systems operational.
- **Architecture:** The project strictly uses Next.js with NO VITE. Database operations require SQL queries for Supabase SQL Editor. Database table names must follow the `indb_{collections}_{table-name}` prefix.
- **Color Scheme:** Use ONLY the defined project color scheme. Reference images are for layout/UI inspiration ONLY, not color.
  - Background: #FFFFFF (Pure White), #F7F9FC (Light Gray)
  - Primary: #1A1A1A (Graphite), #2C2C2E (Charcoal)
  - Accent: #3D8BFF (Soft Blue)
  - Text: #6C757D (Slate Gray)
  - Success: #4BB543 (Mint Green)
  - Warning: #F0A202 (Amber)
  - Error: #E63946 (Rose Red)
  - Borders: #E0E6ED (Cool Gray)
  - Button Colors: #1C2331, #0d1b2a, #22333b, #1E1E1E
- **Database Changes:** For any database updates/changes/additions/removals, provide SQL queries for user to run in Supabase SQL Editor. Do not install PostgreSQL locally or push database changes locally.
- **General Working Preferences:** Do not make changes to the folder `Z`. Do not make changes to the file `Y`.

## System Architecture

The application is built with Next.js App Router and integrates with an Express server for Google API calls.

**Overall Structure:**
- `app/`: Next.js App Router pages and layouts.
- `server/`: Express.js backend for API integration.
- `shared/`: Common TypeScript types and schemas.
- `components/`: Reusable UI components.
- `lib/`: Utility functions and configurations.

**Frontend Architecture:**
- **Framework:** Next.js (React 18, TypeScript).
- **Build System:** Next.js built-in system.
- **UI Framework:** Radix UI headless components with shadcn/ui.
- **State Management:** TanStack React Query v5.
- **Routing:** Wouter for client-side routing.
- **Form Handling:** React Hook Form with Zod validation.
- **Styling:** Tailwind CSS with a clean white background and dark palette accents (slate-900, stone-900, gray-800, neutral-800).
- **Authentication:** Supabase Auth with JWT tokens and automatic session management.

**Backend Architecture:**
- **Runtime:** Node.js 20+ with Express.js.
- **Language:** TypeScript with ES modules.
- **API Design:** RESTful API with comprehensive middleware.
- **Database:** Supabase with type-safe operations.
- **Job Processing:** Node-cron for scheduled jobs with WebSocket real-time updates.
- **Email System:** Nodemailer with custom HTML templates.
- **Security:** Multi-layered security, input validation, rate limiting, audit logging.

**Key Features:**
- **User Management & Authentication:** Secure JWT-based authentication, user profiles, three-tier role system (user, admin, super_admin), and granular settings management.
- **Service Account Management:** Secure JSON upload, AES-256-CBC credential encryption, daily and minute quota tracking, load balancing, and JWT token caching.
- **Indexing Job System:** Job creation via sitemap parsing or manual URL lists, various scheduling options, status tracking, real-time progress monitoring via WebSockets, and bulk operations.
- **Google API Integration:** Direct integration with Google Indexing API, service account authentication, comprehensive error handling with retry logic, and rate limiting.
- **Email Notification System:** Professional, branded email templates for job completion/failure, daily quota reports, and quota alerts.
- **Security Features:** Comprehensive Zod schema validation, SQL injection prevention, per-user rate limiting, CORS configuration, security headers, audit logging, and role-based authorization.
- **Database Schema:** Uses `indb_` prefixed tables for authentication, service accounts, indexing jobs, URL submissions, quota usage, notifications, and analytics.

**Data Flow:**
- **User Journey:** Authentication via Supabase Auth, service account setup, job creation, processing, real-time execution monitoring, and analytics.
- **API Request Flow:** Authentication middleware, input validation, authorization, business logic execution, database operations via Supabase client, external API calls, and consistent response formatting.
- **Job Processing Flow:** Job creation in database, Node-cron for scheduling, URL processing (sitemap/manual), Google API submission with quota management, WebSocket updates, and email notifications.

## Recent Changes
*Latest updates and modifications made to the project*

### 2025-08-13: Project Migration & Rank Tracking Backend Completion ✅
- ✅ **MIGRATION COMPLETE**: Successfully migrated IndexNow Pro project to Replit environment
- ✅ **FIXED CRITICAL SQL ISSUES**: Corrected integration table design to be site-level (removed user_id)
- ✅ **UPDATED API KEY MANAGER**: Changed from per-user to site-level API key management for ScrapingDog
- ✅ **CORRECTED DATABASE TYPES**: Updated TypeScript interfaces to match site-level architecture  
- ✅ **FIXED RANK TRACKER**: Updated all service calls to use site-level quota and API key management
- ✅ **CLEANED SQL QUERIES**: Removed attempts to add existing columns, proper IF NOT EXISTS usage
- ✅ **ALL LSP ERRORS RESOLVED**: Fixed TypeScript compilation errors across all backend services
- ✅ **PROVIDED TABLE FIX**: Created `sql-fix-integration-table.sql` to properly convert existing user-level table to site-level

### 2025-01-13: Complete Rank Tracking Backend Implementation ✅
- ✅ Implemented comprehensive ScrapingDog API integration service (`lib/scrapingdog-service.ts`)
- ✅ Created API key management system with quota tracking (`lib/api-key-manager.ts`) 
- ✅ Built core rank tracker service with batch processing (`lib/rank-tracker.ts`)
- ✅ Added daily rank check job scheduler with cron scheduling (`lib/daily-rank-check-job.ts`)
- ✅ Created batch processor for handling multiple keywords efficiently (`lib/batch-processor.ts`)
- ✅ Implemented worker startup service for background job initialization (`lib/worker-startup.ts`)
- ✅ Added manual rank check API endpoint (`app/api/keyword-tracker/check-rank/route.ts`)
- ✅ Created admin trigger endpoint for manual rank checks (`app/api/admin/rank-tracker/trigger-manual-check/route.ts`)
- ✅ Updated database types to include `indb_site_integration` table and `last_check_date` field
- ✅ Provided comprehensive SQL queries for database setup (`sql-queries-for-rank-tracking.sql`)
- ✅ Integrated background service initialization into app layout for automatic startup
- ✅ Added development test component for rank tracker testing (`components/job-processor-test.tsx`)
- ✅ Fixed TypeScript compilation errors and LSP diagnostics
- ✅ Properly integrated worker startup into Next.js application lifecycle

**BACKEND IMPLEMENTATION STATUS: COMPLETE** 🎉
All backend services are now fully implemented with proper error handling, logging, quota management, batch processing, and automatic startup capabilities. The system is ready for database setup and testing.

### 2025-08-14: Sidebar Hydration & API Key Management Updates ⚠️
- ✅ **CORRECTED SCRAPINGDOG API CREDITS**: Fixed business logic bug from 100 to 10 credits per request
- ✅ **IMPLEMENTED API KEY AUTO-SWITCHING**: Added intelligent API key rotation when quota exhausted
- ✅ **ENHANCED WEBSOCKET ERROR HANDLING**: Reduced console spam and improved error management
- ⚠️ **SIDEBAR HYDRATION WORK IN PROGRESS**: Implemented ClientOnlyWrapper solution but issue persists
- 🔧 **DASHBOARD COMPILATION FIXED**: Resolved syntax errors and JSX structure issues
- 📋 **REMAINING TASK**: Hydration mismatch still occurring on homepage LandingPage component

**User Interface Design:**
- **Main Color:** Clean white backgrounds.
- **Accent Colors:** PROPER dark palette (slate-900/800, stone-900/800, gray-800/900, neutral-800/900).
- **Typography:** Clean, readable fonts.
- **Layout:** Dashboard-style with collapsible left-aligned sidebar navigation.
- **Responsive Design:** Mobile-first approach.
- **Theme:** Professional appearance for SEO professionals.
- **Key Pages:** Dashboard, IndexNow (job creation), Manage Jobs, Job Details, Settings.

## External Dependencies

- **Supabase:** Backend-as-a-Service for database, authentication, and user management.
- **Google Indexing API:** Google's URL submission service.
- **Google Auth Library:** JWT authentication for Google services.
- **Frontend Libraries:** React 18, Next.js, TanStack React Query v5, React Hook Form, Wouter.
- **Backend Libraries:** Express, Node-cron, Nodemailer, Google APIs client library.
- **UI Libraries:** Radix UI components, shadcn/ui styling, Tailwind CSS, Lucide React icons.
- **Validation:** Zod.
- **Utilities:** xml2js (for sitemap parsing), date-fns, clsx, class-variance-authority, framer-motion.
- **Development:** TypeScript, tsx, esbuild.
- **Email Configuration:** SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS for Nodemailer.
- **Security Related:** ENCRYPTION_KEY, JWT_SECRET for sensitive data.