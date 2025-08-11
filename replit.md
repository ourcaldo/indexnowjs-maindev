# IndexNow Pro - Professional Web Application

## Overview

IndexNow Pro is a professional-grade, full-stack web application designed to automate Google URL indexing through the Google Search Console API. It provides a comprehensive solution for SEO professionals, digital marketers, and website owners requiring efficient, large-scale indexing operations with advanced monitoring and reporting. The application offers instant indexing capabilities as a standalone web platform, handling multiple service accounts, scheduled jobs, and enterprise-scale indexing operations.

**Key Capabilities:**
- Automated Google Indexing for bulk URL submissions.
- Multi-Service Account Management for load balancing.
- Advanced Scheduling (one-time, hourly, daily, weekly, monthly jobs).
- Comprehensive Monitoring: real-time job tracking, quota monitoring, detailed analytics.
- Professional Email Notifications for job status and alerts.
- Enterprise Security: role-based access control, input validation, auditing.

## User Preferences

*   **ARCHITECTURE REQUIREMENTS:**
    1.  **Next.js ONLY** - This project uses Next.js with NO VITE. Never suggest or implement Vite migration.
    2.  **Supabase Self-Hosted** - Database is hosted at https://base.indexnow.studio
        -   Do NOT install PostgreSQL locally
        -   Do NOT push database changes locally
        -   For any database updates/changes/additions/removals, provide SQL queries for user to run in Supabase SQL Editor
        -   You must be follow this prefix "indb_{collections}_{table-name}" "collections" is like same collections, for example like "security" collection which have tables "indb_security_event", "indb_security_log" and so-on.
    3.  **Project Color Scheme ONLY** - Use ONLY this project's color scheme:
        -   Background: #FFFFFF (Pure White), #F7F9FC (Light Gray)
        -   Primary: #1A1A1A (Graphite), #2C2C2E (Charcoal)
        -   Accent: #3D8BFF (Soft Blue)
        -   Text: #6C757D (Slate Gray)
        -   Success: #4BB543 (Mint Green)
        -   Warning: #F0A202 (Amber)
        -   Error: #E63946 (Rose Red)
        -   Borders: #E0E6ED (Cool Gray)
        -   Button Colors: #1C2331, #0d1b2a, #22333b, #1E1E1E
        -   If user sends reference images, they are for layout/UI inspiration ONLY - still use project colors

## System Architecture

The application is built as a full-stack Next.js web application with a Supabase PostgreSQL backend. It emphasizes modularity, scalability, and robust security.

**Overall Structure:**
-   **Frontend:** Next.js 15+ (App Router), React 18, TypeScript.
-   **UI:** Radix UI (headless) with shadcn/ui styling and Tailwind CSS.
-   **State Management:** TanStack React Query v5.
-   **Form Handling:** React Hook Form with Zod validation.
-   **Backend:** Node.js 20+ (Express.js integration), TypeScript.
-   **Database:** Supabase PostgreSQL with Row Level Security (RLS) and real-time subscriptions.
-   **Job Processing:** Node-cron for scheduled tasks, WebSocket for real-time updates.
-   **Email System:** Nodemailer with custom HTML templates.

**Key Architectural Decisions & Features:**

-   **Database Schema Design:** Uses a prefixed collection structure (`indb_*`) organized by functional areas (e.g., `indb_auth_*`, `indb_indexing_*`, `indb_security_*`). All tables are hosted on Supabase (https://base.indexnow.studio).
-   **User Management:** Secure JWT-based authentication via Supabase, comprehensive user profiles, role-based access control (user, admin, super_admin), granular user settings.
-   **Service Account Management:** Encrypted storage of Google service account JSON files, real-time quota tracking, intelligent load balancing across accounts.
-   **Indexing Job System:** Supports sitemap parsing or manual URL input, flexible scheduling, real-time job progress monitoring, efficient bulk processing with retry logic.
-   **Keyword Tracker System:** Complete keyword ranking monitoring across multiple domains, devices, and countries. Includes position history, search volume, and tag-based organization with quota-based limitations.
-   **Google API Integration:** Native integration with Google Indexing API, secure JWT authentication, comprehensive error handling with retry logic, automatic adherence to API rate limits.
-   **Email Notification System:** Branded, responsive email templates for job status, daily reports, and quota alerts.
-   **Security Features:** Comprehensive Zod schema validation, SQL injection prevention, rate limiting, proper CORS configuration, security headers, detailed audit logging, role-based authorization.
-   **Payment & Subscription System:** Dynamic subscription packages, integrated payment processing, real-time monitoring of package quotas, and analytics.
-   **UI/UX Design:** Strict adherence to a professional color palette (#FFFFFF, #F7F9FC, #1A1A1A, #2C2C2E, #3D8BFF, #6C757D, #4BB543, #F0A202, #E63946, #E0E6ED, #1C2331, #0d1b2a, #22333b, #1E1E1E). Clean typography, dashboard-style layout with collapsible sidebar, responsive design, and focus on efficiency, clarity, and consistency.

## External Dependencies

**Core Services:**
-   **Supabase:** Database, authentication, real-time subscriptions, user management.
-   **Google Indexing API:** Primary integration for URL submission and indexing.
-   **Google Auth Library:** JWT authentication and service account management for Google services.

**Frontend Libraries:**
-   React 18
-   Next.js 15+
-   TanStack React Query v5
-   React Hook Form
-   Wouter
-   Framer Motion

**Backend Libraries:**
-   Express.js
-   Node-cron
-   Nodemailer
-   Google APIs Client Library
-   Socket.io

**UI & Styling Libraries:**
-   Radix UI
-   shadcn/ui
-   Tailwind CSS
-   Lucide React
-   React Icons

**Validation & Utilities:**
-   Zod
-   xml2js
-   date-fns
-   clsx
-   class-variance-authority

**Development Tools:**
-   TypeScript
-   tsx
-   ESLint
-   Prettier