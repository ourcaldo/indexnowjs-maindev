# IndexNow Pro - Professional Web Application

## Overview
IndexNow Pro is a professional-grade, full-stack web application designed to automate Google URL indexing through the Google Search Console API. It serves as a comprehensive solution for SEO professionals, digital marketers, and website owners needing efficient large-scale indexing operations with advanced monitoring and reporting. The application provides instant indexing capabilities, handles multiple service accounts, supports advanced scheduling, and offers comprehensive monitoring and reporting. Key capabilities include automated Google Indexing, multi-service account management, advanced scheduling (one-time, hourly, daily, weekly, monthly), comprehensive monitoring (real-time job tracking, quota monitoring, analytics), professional email notifications, and enterprise security features like role-based access control.

## User Preferences
⚠️ **ARCHITECTURE REQUIREMENTS:**
1. **Next.js ONLY** - This project uses Next.js with NO VITE. Never suggest or implement Vite migration.
2. **Supabase Self-Hosted** - Database is hosted at https://base.indexnow.studio
   - Do NOT install PostgreSQL locally
   - Do NOT push database changes locally
   - For any database updates/changes/additions/removals, provide SQL queries for user to run in Supabase SQL Editor
   - You must be follow this prefix "indb_{collections}_{table-name}" "collections" is like same collections, for example like "security" collection which have tables "indb_security_event", "indb_security_log" and so-on.
3. **Project Color Scheme ONLY** - Use ONLY this project's color scheme:
   - Background: #FFFFFF (Pure White), #F7F9FC (Light Gray)
   - Primary: #1A1A1A (Graphite), #2C2C2E (Charcoal)
   - Accent: #3D8BFF (Soft Blue)
   - Text: #6C757D (Slate Gray)
   - Success: #4BB543 (Mint Green)
   - Warning: #F0A202 (Amber)
   - Error: #E63946 (Rose Red)
   - Borders: #E0E6ED (Cool Gray)
   - Button Colors: #1C2331, #0d1b2a, #22333b, #1E1E1E
   - If user sends reference images, they are for layout/UI inspiration ONLY - still use project colors

## System Architecture

### Overall Structure
The application follows a Next.js App Router structure with Express server integration:
- `app/` - Next.js App Router pages and layouts
- `server/` - Express.js backend API integration for Google API calls
- `shared/` - Common TypeScript types and schemas
- `components/` - Reusable UI components
- `lib/` - Utility functions and configurations
- `attached_assets/` - Project assets and documentation

### Frontend Architecture
- **Framework**: Next.js with React 18 and TypeScript
- **Build System**: Next.js built-in build system
- **UI Framework**: Radix UI headless components with shadcn/ui styling system
- **State Management**: TanStack React Query v5 for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation
- **Styling**: Tailwind CSS with clean white backgrounds and dark palette accents (slate-900, stone-900, gray-800, neutral-800)
- **Authentication**: Supabase Auth with JWT tokens and automatic session management

### Backend Architecture
- **Runtime**: Node.js 20+ with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with comprehensive middleware architecture
- **Database**: Supabase with type-safe database operations
- **External Integrations**: Google Indexing API, Google Auth Library, XML parsing for sitemaps
- **Job Processing**: Node-cron for scheduled job execution with WebSocket real-time updates
- **Email System**: Nodemailer with custom HTML templates and SMTP configuration
- **Security**: Multi-layered security with input validation, rate limiting, and audit logging

### Key Components & Features
- **User Management & Authentication**: Secure JWT-based authentication, user profiles, role-based access control (user, admin, super_admin), and preference management.
- **Service Account Management**: Secure upload of Google service account JSON files, credential encryption, quota tracking, load balancing, and token caching.
- **Indexing Job System**: Job creation from sitemap parsing or manual URL lists, advanced scheduling options, status tracking, progress monitoring, and bulk operations.
- **Google API Integration**: Direct integration with Google's Indexing API, service account authentication, comprehensive error handling with retry logic, and rate limiting.
- **Email Notification System**: Professional, branded email templates for job completion/failure, daily quota reports, and quota alerts.
- **Security Features**: Input validation (Zod), SQL injection prevention, rate limiting, CORS configuration, security headers, audit logging, and role-based authorization.
- **UI/UX Decisions**: Dashboard-style interface with collapsible left-aligned sidebar, clean white backgrounds, and a professional dark accent color palette. Responsive design with mobile-first approach.

### Data Flow & Architecture
- **Database Schema**: Prefixed collection structure (`indb_*`) with core tables for user profiles, Google service accounts, indexing jobs, URL submissions, quota usage, notifications, and analytics.
- **User Journey Flow**: Authentication -> Service Account Setup -> Job Creation -> Processing -> Execution -> Monitoring -> Analytics.
- **API Request Flow**: Authentication Middleware -> Input Validation -> Authorization -> Business Logic -> Database Operations -> External API Calls -> Response Formatting.
- **Job Processing Flow**: Job Creation -> Scheduler Pickup -> URL Processing -> Google API Submission -> Real-time Updates -> Email Notifications.

## External Dependencies

### Core Services
- **Supabase**: Backend-as-a-Service for database, authentication, and user management.
- **Google Indexing API**: Google's URL submission service.
- **Google Auth Library**: For JWT authentication with Google services.

### Key Libraries
- **Frontend**: React 18, Next.js, TanStack React Query v5, React Hook Form, Wouter.
- **Backend**: Express, Node-cron, Nodemailer, Google APIs client library.
- **UI**: Radix UI components, shadcn/ui styling, Tailwind CSS, Lucide React icons.
- **Validation**: Zod.
- **Utilities**: xml2js (sitemap parsing), date-fns, clsx, class-variance-authority, framer-motion.
- **Development**: TypeScript, tsx, esbuild.

### Google API Integration
- `googleapis`: Official Google API client library.
- `google-auth-library`: JWT authentication for Google services.
- Quota Management: Handles daily (200 requests) and per-minute (60 requests) limits.
- Error Handling: Comprehensive error catching with retry logic.

## Recent Updates & Timeline

### August 11, 2025 - Migration & Initial Setup
- **17:55-18:00**: Successfully migrated project from Replit Agent to standard Replit environment
- **Dependencies**: Installed all required packages including Next.js, React, TypeScript, Supabase libraries, and UI components
- **Configuration**: Verified Next.js configuration with proper Replit domain allowances and security headers
- **Background Services**: Confirmed job monitor, quota reset monitor, and WebSocket services initialize properly
- **Cleanup**: Removed unnecessary test-login directory as requested
- **Status**: Application running successfully on port 5000 with all core systems operational