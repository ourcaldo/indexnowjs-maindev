# IndexNow Pro

## Overview
IndexNow Pro is a professional, full-stack web application for automating Google URL indexing via the Google Search Console API. It serves SEO professionals, digital marketers, and website owners requiring efficient large-scale indexing with advanced monitoring and reporting. The application provides instant indexing capabilities, managing multiple service accounts, scheduled jobs, and enterprise-scale operations. Key capabilities include automated Google Indexing, multi-service account management, advanced scheduling (one-time, hourly, daily, weekly, monthly), comprehensive monitoring, professional email notifications, and enterprise security features like role-based access control. The business vision is to provide a standalone web platform similar to popular indexing plugins but with enhanced features for large-scale and managed operations.

## User Preferences
- **Architecture:** Exclusively use Next.js; do not suggest or implement Vite.
- **Database:** Supabase is self-hosted at `https://base.indexnow.studio`. Do not install PostgreSQL locally or push database changes locally. For any database updates, provide SQL queries for direct execution in the Supabase SQL Editor. New table names must follow the prefix `indb_{collection}_{table-name}` (e.g., `indb_security_event`).
- **Color Scheme:** Adhere strictly to the project's defined color palette:
    - Background: `#FFFFFF` (Pure White), `#F7F9FC` (Light Gray)
    - Primary: `#1A1A1A` (Graphite), `#2C2C2E` (Charcoal)
    - Accent: `#3D8BFF` (Soft Blue)
    - Text: `#6C757D` (Slate Gray)
    - Success: `#4BB543` (Mint Green)
    - Warning: `#F0A202` (Amber)
    - Error: `#E63946` (Rose Red)
    - Borders: `#E0E6ED` (Cool Gray)
    - Button Colors: `#1C2331`, `#0d1b2a`, `#22333b`, `#1E1E1E`
- **Reference Images:** If provided, reference images are for layout/UI inspiration only; always apply the project's specified color scheme.

## System Architecture

### Overall Structure
The application follows a Next.js App Router structure with Express server integration. It organizes code into `app/` (Next.js pages), `server/` (Express.js backend for Google API), `shared/` (common types/schemas), `components/` (UI components), and `lib/` (utilities).

### Frontend Architecture
- **Framework:** Next.js with React 18 and TypeScript.
- **Build System:** Next.js built-in build system.
- **UI Framework:** Radix UI headless components with shadcn/ui styling.
- **State Management:** TanStack React Query v5 for server state and caching.
- **Routing:** Wouter for client-side routing.
- **Form Handling:** React Hook Form with Zod validation.
- **Styling:** Tailwind CSS, using clean white backgrounds and specific dark palette accents (slate-900, stone-900, gray-800, neutral-800).
- **Authentication:** Supabase Auth with JWT tokens and automatic session management.
- **UI/UX Decisions:** Dashboard-style interface with collapsible left-aligned sidebar navigation, mobile-first responsive design, professional appearance optimized for SEO professionals.
    - **Color Scheme:** Clean white backgrounds (`#FFFFFF`, `#F7F9FC`). Accent colors are dark palette only (slate-900/800, stone-900/800, gray-800/900, neutral-800/900); no bright primary colors.
    - **Typography:** Clean, readable fonts with proper hierarchy.
    - **Key Pages:** Dashboard, IndexNow (job creation), Manage Jobs, Job Details, Settings.

### Backend Architecture
- **Runtime:** Node.js 20+ with Express.js.
- **Language:** TypeScript with ES modules.
- **API Design:** RESTful API with comprehensive middleware.
- **Database:** Supabase with type-safe operations.
- **Job Processing:** Node-cron for scheduled jobs with WebSocket real-time updates.
- **Email System:** Nodemailer with custom HTML templates and SMTP.
- **Security:** Multi-layered security including input validation, rate limiting, audit logging, and role-based authorization.
- **Key Components:**
    - **User Management & Authentication:** JWT-based authentication, user profiles, three-tier role hierarchy (user, admin, super_admin), granular settings management.
    - **Service Account Management:** Secure JSON upload, AES-256-CBC encryption, daily/minute quota tracking, load balancing, token caching.
    - **Indexing Job System:** Job creation from sitemaps or manual URL lists, various scheduling options, status tracking, real-time progress monitoring via WebSockets, bulk operations.
    - **Google API Integration:** Direct integration with Google Indexing API, JWT authentication, comprehensive error handling with retry logic and quota management, rate limiting compliance.
    - **Email Notification System:** Branded email templates for job completion/failure, daily quota reports, and quota alerts.
    - **Security Features:** Zod schema validation, SQL injection prevention, rate limiting, CORS, security headers, audit logging, role-based authorization.

### Data Flow & Architecture
- **Database Schema:** Uses `indb_*` prefixed tables in Supabase: `indb_auth_user_profiles`, `indb_google_service_accounts`, `indb_indexing_jobs`, `indb_indexing_url_submissions`, `indb_google_quota_usage`, `indb_google_quota_alerts`, `indb_notifications_dashboard`, `indb_analytics_daily_stats`, and others for payments, CMS, and security.
- **User Journey:** Authentication, service account setup, job creation, URL processing, job execution, real-time monitoring, analytics.
- **API Request Flow:** Authentication middleware, input validation (Zod), authorization, business logic, Supabase operations, external API calls, consistent response formatting.
- **Job Processing Flow:** Jobs stored as pending, scheduled pickup by Node-cron, URL parsing, Google API submission with quota management, real-time WebSocket updates, email notifications.

## External Dependencies
- **Core Services:**
    - **Supabase:** Database, authentication, user management.
    - **Google Indexing API:** Google's URL submission service.
    - **Google Auth Library:** JWT authentication for Google services.
- **Libraries:**
    - **Frontend:** React 18, Next.js, TanStack React Query v5, React Hook Form, Wouter.
    - **Backend:** Express, Node-cron, Nodemailer, Google APIs client library.
    - **UI:** Radix UI components, shadcn/ui styling, Tailwind CSS, Lucide React icons.
    - **Validation:** Zod.
    - **Utilities:** `xml2js` (sitemap parsing), `date-fns`, `clsx`, `class-variance-authority`, `framer-motion`.
    - **Development:** TypeScript, `tsx`, `esbuild`.
- **Google API Integration:** `googleapis` and `google-auth-library` for Google Indexing API, adhering to Google's 200 requests/day and 60 requests/minute quotas.