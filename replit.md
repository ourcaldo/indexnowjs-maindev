# IndexNow Pro - Professional Web Application

## Overview
IndexNow Pro is a professional-grade, full-stack web application designed to automate Google URL indexing through the Google Search Console API. It serves SEO professionals, digital marketers, and website owners by providing efficient, large-scale indexing operations with advanced monitoring and reporting capabilities. Key features include automated Google Indexing, multi-service account management with load balancing, advanced scheduling options (one-time, hourly, daily, weekly, monthly), comprehensive monitoring (real-time tracking, quota monitoring, analytics), professional email notifications, and enterprise-grade security (role-based access control, input validation). The business vision is to provide an instant indexing platform akin to RankMath's plugin, but as a standalone web service for enterprise use.

## User Preferences
- **Architecture**: The project strictly uses Next.js with its built-in build system; no migration to or suggestion of Vite.
- **Database**: Supabase self-hosted at `https://base.indexnow.studio`. Do not install PostgreSQL locally or push local database changes. All database updates require SQL queries to be provided for execution in the Supabase SQL Editor. New tables must follow the `indb_{collections}_{table-name}` prefix.
- **Color Scheme**: Adhere strictly to the project's defined color palette:
    - Background: `#FFFFFF` (Pure White), `#F7F9FC` (Light Gray)
    - Primary: `#1A1A1A` (Graphite), `#2C2C2E` (Charcoal)
    - Accent: `#3D8BFF` (Soft Blue)
    - Text: `#6C757D` (Slate Gray)
    - Success: `#4BB543` (Mint Green)
    - Warning: `#F0A202` (Amber)
    - Error: `#E63946` (Rose Red)
    - Borders: `#E0E6ED` (Cool Gray)
    - Button Colors: `#1C2331`, `#0d1b2a`, `#22333b`, `#1E1E1E`
- **Reference Images**: If provided, reference images are for layout/UI inspiration only; always use the project's specified color scheme.
- **Communication**: Provide SQL queries for database changes/updates for manual execution.

## System Architecture
The application is structured as a Next.js App Router with Express server integration for Google API calls.

### Overall Structure
- `app/`: Next.js App Router pages and layouts.
- `server/`: Express.js backend API integration for Google API calls.
- `shared/`: Common TypeScript types and schemas.
- `components/`: Reusable UI components.
- `lib/`: Utility functions and configurations.

### Frontend Architecture
- **Framework**: Next.js with React 18 and TypeScript.
- **Build System**: Next.js built-in.
- **UI Framework**: Radix UI headless components with shadcn/ui styling.
- **State Management**: TanStack React Query v5 for server state and caching.
- **Routing**: Wouter for lightweight client-side routing.
- **Form Handling**: React Hook Form with Zod validation.
- **Styling**: Tailwind CSS with clean white backgrounds and dark palette accents (`slate-900`, `stone-900`, `gray-800`, `neutral-800`).
- **Authentication**: Supabase Auth with JWT tokens and automatic session management.

### Backend Architecture
- **Runtime**: Node.js 20+ with Express.js.
- **Language**: TypeScript with ES modules.
- **API Design**: RESTful API with comprehensive middleware.
- **Database**: Supabase with type-safe operations.
- **Job Processing**: Node-cron for scheduled jobs with WebSocket real-time updates.
- **Email System**: Nodemailer with custom HTML templates and SMTP configuration.
- **Security**: Multi-layered security including input validation, rate limiting, and audit logging.

### Key Components & Features
- **User Management & Authentication**: Secure JWT-based authentication via Supabase, user profiles, role-based access control (user, admin, super_admin), and granular user settings.
- **Service Account Management**: Secure upload and encryption of Google service account JSON files, quota tracking (daily 200, per-minute 60), load balancing, and token caching.
- **Indexing Job System**: Job creation from sitemaps or manual URL lists, flexible scheduling (one-time, hourly, daily, weekly, monthly via cron), real-time status and progress monitoring via WebSockets, and bulk operations.
- **Keyword Tracker System**: Complete keyword ranking monitoring system with domain management, multi-device tracking (desktop/mobile), country-specific tracking, position history tracking with 1D/3D/7D changes, search volume monitoring, tag-based organization, and quota-based limitations per package (Free: 50, Premium: 250, Pro: 1500 keywords).
- **Google API Integration**: Direct integration with Google's Indexing API, JWT-based authentication, comprehensive error handling with retry logic, and adherence to Google's rate limits.
- **Email Notification System**: Professional, responsive email templates for job completion/failure, daily reports, and quota alerts.
- **Security Features**: Zod schema validation, SQL injection prevention, per-user rate limiting, environment-based CORS, security headers, and detailed audit logging with role-based authorization.
- **Payment & Subscription**: Package subscription system (Free, Premium, Pro) with dynamic pricing tiers, payment gateway management, and invoice/transaction tracking.

### Data Flow & Architecture
The application uses a prefixed collection structure (`indb_*`) in Supabase. Core tables include `indb_auth_user_profiles`, `indb_google_service_accounts`, `indb_indexing_jobs`, `indb_indexing_url_submissions`, `indb_google_quota_usage`, `indb_google_quota_alerts`, `indb_notifications_dashboard`, `indb_analytics_daily_stats`, and various payment, CMS, and security-related tables.
User journey involves Supabase authentication, service account setup, job creation, system processing with real-time updates via WebSockets, monitoring via dashboard and email, and analytics tracking. API requests are processed through authentication, input validation, authorization, business logic, database operations, and external API calls. Job processing involves Node-cron scheduling, URL parsing, Google API submission, real-time WebSocket updates, and email notifications.

### UI/UX Decisions
- **Color Scheme**: Strictly adheres to the defined palette, emphasizing clean whites for backgrounds and specific dark accents, with accent colors for success, warning, and error states. No use of external colors like `blue-500` or `green-500`.
- **Typography**: Clean, readable fonts with proper hierarchy.
- **Layout**: Dashboard-style interface with a collapsible left-aligned sidebar navigation.
- **Responsive Design**: Mobile-first approach with responsive breakpoints.
- **Theme**: Professional appearance optimized for SEO professionals.

## External Dependencies
- **Supabase**: Used for database management, authentication, and user management.
- **Google Indexing API**: Primary integration for URL submission.
- **Google Auth Library**: For JWT authentication with Google services.
- **Frontend Libraries**: React 18, Next.js, TanStack React Query v5, React Hook Form, Wouter, Radix UI components, shadcn/ui, Tailwind CSS, Lucide React icons.
- **Backend Libraries**: Express, Node-cron, Nodemailer, Google APIs client library.
- **Validation**: Zod.
- **Utilities**: `xml2js` (for sitemap parsing), `date-fns`, `clsx`, `class-variance-authority`, `framer-motion`.