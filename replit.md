# IndexNow Studio - Professional Web Application

## Overview

IndexNow Studio is a professional-grade, full-stack web application designed to automate Google URL indexing through the Google Search Console API. It provides instant indexing, manages multiple service accounts, schedules jobs, and offers advanced monitoring and reporting for SEO professionals, digital marketers, and website owners. Its vision is to be a comprehensive solution for efficient, large-scale indexing.

**Key Capabilities:**
- Automated Google Indexing for thousands of URLs.
- Multi-Service Account Management with load balancing.
- Advanced Scheduling (one-time, hourly, daily, weekly, monthly).
- Comprehensive Monitoring (real-time job tracking, quota, analytics).
- Professional Email Notifications for job status and quota alerts.
- Enterprise Security with role-based access control and auditing.

## User Preferences

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

## Recent Changes (August 21, 2025)

**IndexNow Rank Tracker UI/UX Enhancement & Server-Side Compatibility:**
- ✅ Successfully migrated project from Replit Agent to standard Replit environment 
- ✅ Implemented complete multiselect functionality with checkboxes in Keywords Overview page
- ✅ Added bulk delete and bulk tag addition features with confirmation modals and safety measures
- ✅ Enhanced activity tracking system with 11 new keyword tracker event types (KEYWORD_ADD, KEYWORD_DELETE, etc.)
- ✅ Created comprehensive API endpoints for bulk operations (/api/keyword-tracker/keywords/bulk-delete and /api/keyword-tracker/keywords/add-tag)
- ✅ Resolved server-side compatibility issues with activity logger for browser environments
- ✅ **Button Repositioning:** Moved bulk action buttons (Delete/Add Tags) to right side after domain selection, with updated color scheme
- ✅ **Enhanced Color Scheme:** Delete button now uses Error Red (#E63946), Add Tag button uses Amber (#F0A202), Add Keyword uses project dark theme (#22333b)
- ✅ **Rank History Page Enhancement:** Moved "Add Keyword" button from inside table to top right of main screen with proper page header
- ✅ **Navigation Cleanup:** Removed "Add Keyword" submenu from sidebar navigation to reduce clutter
- ✅ Fixed all TypeScript errors and ensured smooth compilation

**Previous Updates (August 19, 2025):**
- ✅ Login Notification Email System Enhancement & Branding Update
- ✅ Updated all branding from "IndexNow Pro" to "IndexNow Studio" throughout codebase
- 📧 SMTP operational: mail.indexnow.studio with notifikasi@indexnow.studio

**Overall Structure:**
- `app/`: Next.js App Router pages and layouts.
- `server/`: Express.js backend for API integration.
- `shared/`: Common TypeScript types and schemas.
- `components/`: Reusable UI components.
- `lib/`: Utility functions and configurations.

**Frontend Architecture:**
- **Framework:** Next.js (React 18, TypeScript) with App Router.
- **UI Framework:** Radix UI headless components with shadcn/ui.
- **State Management:** TanStack React Query v5.
- **Routing:** Wouter for client-side routing.
- **Form Handling:** React Hook Form with Zod validation.
- **Styling:** Tailwind CSS with a clean white background and dark palette accents.
- **Authentication:** Supabase Auth with JWT tokens and automatic session management.

**Backend Architecture:**
- **Runtime:** Node.js 20+ with Express.js.
- **Language:** TypeScript with ES modules.
- **API Design:** RESTful API with comprehensive middleware.
- **Database:** Supabase with type-safe operations, using `indb_` prefixed tables.
- **Job Processing:** Node-cron for scheduled jobs with WebSocket real-time updates.
- **Email System:** Nodemailer with custom HTML templates.
- **Security:** Multi-layered security, input validation, rate limiting, audit logging.

**Key Features:**
- **User Management & Authentication:** Secure JWT-based authentication, user profiles, three-tier role system (user, admin, super_admin).
- **Service Account Management:** Secure JSON upload, AES-256-CBC credential encryption, daily and minute quota tracking, load balancing, and JWT token caching.
- **Indexing Job System:** Job creation via sitemap parsing or manual URL lists, various scheduling options, status tracking, real-time progress monitoring via WebSockets, and bulk operations.
- **Google API Integration:** Direct integration with Google Indexing API, service account authentication, comprehensive error handling with retry logic, and rate limiting.
- **Email Notification System:** Professional, branded email templates for job completion/failure, daily quota reports, and quota alerts.
- **Security Features:** Comprehensive Zod schema validation, SQL injection prevention, per-user rate limiting, CORS configuration, security headers, audit logging, and role-based authorization.
- **Rank Tracking Backend:** Implemented ScrapingDog API integration with API key management, quota tracking, daily rank checks, and batch processing. Includes comprehensive error tracking and advanced quota monitoring. Enhanced admin package settings to support keyword limits configuration.

**User Interface Design:**
- **Main Color:** Clean white backgrounds.
- **Accent Colors:** Dark palette (slate-900/800, stone-900/800, gray-800/900, neutral-800/900).
- **Typography:** Clean, readable fonts.
- **Layout:** Dashboard-style with collapsible left-aligned sidebar navigation.
- **Responsive Design:** Mobile-first approach.
- **Theme:** Professional appearance for SEO professionals.

## External Dependencies

- **Supabase:** Backend-as-a-Service for database, authentication, and user management.
- **Google Indexing API:** Google's URL submission service.
- **Google Auth Library:** JWT authentication for Google services.
- **ScrapingDog API:** Used for rank tracking services.
- **Frontend Libraries:** React 18, Next.js, TanStack React Query v5, React Hook Form, Wouter.
- **Backend Libraries:** Express, Node-cron, Nodemailer, Google APIs client library.
- **UI Libraries:** Radix UI components, shadcn/ui styling, Tailwind CSS, Lucide React icons.
- **Validation:** Zod.
- **Utilities:** xml2js (for sitemap parsing), date-fns, clsx, class-variance-authority, framer-motion.
- **Development:** TypeScript, tsx, esbuild.