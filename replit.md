# IndexNow Pro - Professional Web Application

### Overview
IndexNow Pro is a professional-grade, full-stack web application designed to automate Google URL indexing through the Google Search Console API. It serves SEO professionals, digital marketers, and website owners by offering efficient large-scale indexing operations with advanced monitoring and reporting. The application provides instant indexing capabilities as a standalone web platform, managing multiple service accounts, scheduled jobs, and enterprise-scale indexing operations. Key capabilities include automated Google indexing, multi-service account management with load balancing, advanced scheduling options (one-time, hourly, daily, weekly, monthly), comprehensive real-time monitoring of jobs, quotas, and analytics, professional email notifications for job status and quota alerts, and enterprise-grade security features like role-based access control.

### User Preferences
- Always use Next.js ONLY; do not suggest or implement Vite migration.
- For any database updates/changes/additions/removals, provide SQL queries for user to run in Supabase SQL Editor.
- When creating new tables, follow the prefix "indb_{collections}_{table-name}" where "collections" groups similar tables (e.g., "indb_security_event", "indb_security_log").
- Use ONLY the specified project color scheme:
  - Background: #FFFFFF (Pure White), #F7F9FC (Light Gray)
  - Primary: #1A1A1A (Graphite), #2C2C2E (Charcoal)
  - Accent: #3D8BFF (Soft Blue)
  - Text: #6C757D (Slate Gray)
  - Success: #4BB543 (Mint Green)
  - Warning: #F0A202 (Amber)
  - Error: #E63946 (Rose Red)
  - Borders: #E0E6ED (Cool Gray)
  - Button Colors: #1C2331, #0d1b2a, #22333b, #1E1E1E
- If user sends reference images, they are for layout/UI inspiration ONLY; still use project colors.
- Database is hosted at https://base.indexnow.studio; do NOT install PostgreSQL locally or push database changes locally.

### System Architecture

#### Overall Structure
The application follows a Next.js App Router structure with Express server integration. Frontend code resides in `app/`, `components/`, and `lib/`, while backend API integration for Google API calls is handled in `server/`. Common types and schemas are in `shared/`, and project assets are in `attached_assets/`.

#### Frontend Architecture
- **Framework**: Next.js with React 18 and TypeScript.
- **Build System**: Next.js built-in build system (no Vite).
- **UI Framework**: Radix UI headless components with shadcn/ui styling system.
- **State Management**: TanStack React Query v5 for server state management and caching.
- **Routing**: Wouter for lightweight client-side routing.
- **Form Handling**: React Hook Form with Zod validation.
- **Styling**: Tailwind CSS with clean white backgrounds and dark palette accents (slate-900, stone-900, gray-800, neutral-800).
- **Authentication**: Supabase Auth with JWT tokens and automatic session management.

#### Backend Architecture
- **Runtime**: Node.js 20+ with Express.js framework.
- **Language**: TypeScript with ES modules.
- **API Design**: RESTful API with comprehensive middleware architecture.
- **Database**: Supabase with type-safe database operations.
- **Job Processing**: Node-cron for scheduled job execution with WebSocket real-time updates.
- **Email System**: Nodemailer with custom HTML templates and SMTP configuration.
- **Security**: Multi-layered security with input validation (Zod), rate limiting, audit logging, CORS configuration, security headers, and role-based authorization.

#### Key Components & Features
- **User Management & Authentication**: Secure JWT-based authentication via Supabase, user profiles with roles (user, admin, super_admin), and granular settings for notifications and job parameters.
- **Service Account Management**: Secure JSON upload of Google service accounts, AES-256-CBC encryption for credentials, daily and per-minute quota tracking, load balancing across accounts, and JWT token caching.
- **Indexing Job System**: Job creation from sitemap parsing or manual URL lists, flexible scheduling (one-time, recurring with cron), status tracking (pending, running, completed, failed, paused, cancelled), real-time progress monitoring via WebSockets, and bulk operations.
- **Google API Integration**: Direct integration with Google Indexing API, JWT-based authentication, comprehensive error handling with retry logic, and respect for API rate limits.
- **Email Notification System**: Professional, responsive templates for job completion/failure, daily quota reports, and quota alerts.
- **Security Features**: Zod schema validation, SQL injection prevention, per-user rate limiting, environment-based CORS, security headers, and detailed audit logging.
- **Payment System**: Comprehensive package subscription system (Free, Premium, Pro) with dynamic pricing tiers, package management interface, and user-specific quota enforcement.
- **Content Management System (CMS)**: For managing posts and pages with status workflow.

#### UI/UX Decisions
- **Color Scheme**: Uses a strictly defined palette of clean whites for backgrounds, graphite/charcoal for primary text/elements, a soft blue for accent, and specific colors for success, warning, error, and borders. No other bright colors are used.
- **Typography**: Clean, readable fonts with proper hierarchy.
- **Layout**: Dashboard-style interface with a collapsible left-aligned sidebar navigation.
- **Responsive Design**: Mobile-first approach with responsive breakpoints.
- **Theme**: Professional appearance optimized for SEO professionals.
- **Key Pages Structure**: Dashboard, IndexNow (job creation), Manage Jobs, Job Details, Settings, Billing, Admin Panel.

### External Dependencies

- **Supabase**: Backend-as-a-Service providing database, authentication, and user management.
- **Google Indexing API**: For submitting URLs to Google's index.
- **Google Auth Library**: For JWT authentication with Google services.
- **Next.js**: React framework for frontend and server-side rendering.
- **React 18**: Frontend JavaScript library.
- **TypeScript**: Superset of JavaScript for type-safe development.
- **TanStack React Query v5**: For server state management and caching on the frontend.
- **React Hook Form**: For form handling and validation.
- **Wouter**: Lightweight client-side router.
- **Express.js**: Node.js web application framework for backend APIs.
- **Node-cron**: For scheduling job execution on the backend.
- **Nodemailer**: For sending emails via SMTP.
- **Zod**: For schema validation across frontend and backend.
- **xml2js**: For parsing XML sitemaps.
- **date-fns**: For date manipulation.
- **clsx, class-variance-authority, framer-motion**: For UI styling and animations.
- **Pino**: For structured logging.
- **GeoIP-lite**: For IP-based geolocation (with graceful fallback).
- **Lucide React**: For icons.