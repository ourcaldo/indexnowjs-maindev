# IndexNow Studio - Professional Web Application

## Overview

IndexNow Studio is a professional-grade, full-stack web application designed to automate Google URL indexing through the Google Search Console API. It provides instant indexing, manages multiple service accounts, schedules jobs, and offers advanced monitoring and reporting for SEO professionals, digital marketers, and website owners. Its vision is to be a comprehensive solution for efficient, large-scale indexing with a focus on comprehensive rank tracking and intelligent SEO insights.

**Key Capabilities:**
- Automated Google Indexing for thousands of URLs.
- Multi-Service Account Management with load balancing.
- Advanced Scheduling (one-time, hourly, daily, weekly, monthly).
- Comprehensive Monitoring (real-time job tracking, quota, analytics).
- Professional Email Notifications for job status and quota alerts.
- Enterprise Security with role-based access control and auditing.
- Smart Keyword Intelligence, Advanced Repository Insight, Intelligent Monitoring, Multi-Location Tracking, Competitor Intelligence for rank tracking.

## Recent Changes

**December 2024:**
- **Pricing Architecture Refactoring (Dec 2024):** Created dedicated pricing page at `/pricing` route with comprehensive features comparison and FAQ sections. Eliminated code duplication by creating shared `usePricingData` hook to centralize pricing logic across `PricingTeaserSection` and `PricingTable` components. Updated navigation from scroll-to-section to dedicated page routing for better user experience and scalability.
- **Shared Component Architecture:** Implemented consistent pricing data management with currency detection, package loading, price calculations, and feature extraction logic in a centralized hook, improving maintainability and consistency across the application.

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
- **API Design:** RESTful API with comprehensive middleware, organized in versioned /api/v1/ structure.
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
- **Rank Tracking Backend:** Implemented ScrapingDog API integration with API key management, quota tracking, daily rank checks, and batch processing. Enhanced admin package settings to support keyword limits configuration.
- **Payment System:** Unified payment channel architecture with modular handlers for various payment methods (Midtrans Snap, Midtrans Recurring, Bank Transfer) with 3DS authentication. Comprehensive validation, rate limiting, and error handling for payment processes.

**User Interface Design:**
- **Main Color:** Clean white backgrounds.
- **Accent Colors:** Dark palette (slate-900/800, stone-900/800, gray-800/900, neutral-800/900).
- **Typography:** Clean, readable fonts.
- **Layout:** Dashboard-style with collapsible left-aligned sidebar navigation.
- **Responsive Design:** Mobile-first approach.
- **Theme:** Professional appearance for SEO professionals.
- **Button Repositioning:** Bulk action buttons (Delete/Add Tags) on right side after domain selection.
- **Color Scheme:** Delete button uses Error Red (#E63946), Add Tag button uses Amber (#F0A202), Add Keyword uses project dark theme (#22333b).
- **Checkout UI:** Dynamic billing period selector and enhanced order summary with currency conversion.

## External Dependencies

- **Supabase:** Backend-as-a-Service for database, authentication, and user management.
- **Google Indexing API:** Google's URL submission service.
- **Google Auth Library:** JWT authentication for Google services.
- **ScrapingDog API:** Used for rank tracking services.
- **Midtrans:** Payment gateway for Snap and Recurring payments.
- **Frontend Libraries:** React 18, Next.js, TanStack React Query v5, React Hook Form, Wouter.
- **Backend Libraries:** Express, Node-cron, Nodemailer, Google APIs client library, `midtrans-client` package.
- **UI Libraries:** Radix UI components, shadcn/ui styling, Tailwind CSS, Lucide React icons.
- **Validation:** Zod.
- **Utilities:** xml2js (for sitemap parsing), date-fns, clsx, class-variance-authority, framer-motion.
- **Development:** TypeScript, tsx, esbuild.