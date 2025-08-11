# IndexNow Pro - Professional Web Application

### Overview
IndexNow Pro is a professional-grade, full-stack web application designed to automate Google URL indexing through the Google Search Console API. It provides a comprehensive solution for SEO professionals, digital marketers, and website owners for efficient large-scale indexing operations with advanced monitoring and reporting. Key capabilities include automated Google Indexing, multi-service account management, advanced scheduling, comprehensive monitoring, professional email notifications, and enterprise-grade security. The business vision is to provide instant indexing capabilities as a standalone web platform handling multiple service accounts, scheduled jobs, and enterprise-scale indexing operations.

### User Preferences
- **Architecture Requirements**:
  - **Next.js ONLY**: This project uses Next.js with NO VITE. Never suggest or implement Vite migration.
  - **Supabase Self-Hosted**: Database is hosted at https://base.indexnow.studio. Do NOT install PostgreSQL locally. Do NOT push database changes locally. For any database updates/changes/additions/removals, provide SQL queries for user to run in Supabase SQL Editor. New tables must follow the prefix "indb_{collections}_{table-name}".
  - **Project Color Scheme ONLY**: Use ONLY this project's color scheme:
    - Background: #FFFFFF (Pure White), #F7F9FC (Light Gray)
    - Primary: #1A1A1A (Graphite), #2C2C2E (Charcoal)
    - Accent: #3D8BFF (Soft Blue)
    - Text: #6C757D (Slate Gray)
    - Success: #4BB543 (Mint Green)
    - Warning: #F0A202 (Amber)
    - Error: #E63946 (Rose Red)
    - Borders: #E0E6ED (Cool Gray)
    - Button Colors: #1C2331, #0d1b2a, #22333b, #1E1E1E
    - If user sends reference images, they are for layout/UI inspiration ONLY - still use project colors.
- **Interaction**: Ask before making major changes.
- **Workflow**: Iterative development, focusing on high-level features rather than granular implementation details.

### System Architecture

**Overall Structure**
The application follows a Next.js App Router structure with Express server integration:
- `app/`: Next.js App Router pages and layouts
- `server/`: Express.js backend API integration for Google API calls
- `shared/`: Common TypeScript types and schemas
- `components/`: Reusable UI components
- `lib/`: Utility functions and configurations
- `attached_assets/`: Project assets and documentation

**Frontend Architecture**
- **Framework**: Next.js with React 18 and TypeScript.
- **Build System**: Next.js built-in build system (NO Vite allowed).
- **UI Framework**: Radix UI headless components with shadcn/ui styling system.
- **State Management**: TanStack React Query v5 for server state management and caching.
- **Routing**: Wouter for lightweight client-side routing.
- **Form Handling**: React Hook Form with Zod validation.
- **Styling**: Tailwind CSS with clean white backgrounds and PROPER dark palette accents (slate-900, stone-900, gray-800, neutral-800).
- **Authentication**: Supabase Auth with JWT tokens and automatic session management.

**Backend Architecture**
- **Runtime**: Node.js 20+ with Express.js framework.
- **Language**: TypeScript with ES modules.
- **API Design**: RESTful API with comprehensive middleware architecture.
- **Database**: Supabase with type-safe database operations.
- **External Integrations**: Google Indexing API, Google Auth Library, XML parsing for sitemaps.
- **Job Processing**: Node-cron for scheduled job execution with WebSocket real-time updates.
- **Email System**: Nodemailer with custom HTML templates and SMTP configuration.
- **Security**: Multi-layered security with input validation, rate limiting, and audit logging.

**Key Components & Features**
- **User Management & Authentication**: Secure JWT-based authentication, user profiles with roles (user, admin, super_admin), and granular settings for notifications, timeouts, and retries.
- **Service Account Management**: Secure upload of Google service account JSON files, AES-256-CBC credential encryption, daily and per-minute quota monitoring, automatic request load balancing, and JWT token caching.
- **Indexing Job System**: Job creation from sitemap parsing or manual URL lists, flexible scheduling (one-time, hourly, daily, weekly, monthly with cron), status tracking (pending, running, completed, failed, paused, cancelled), real-time progress monitoring via WebSockets, and bulk operations.
- **Google API Integration**: Direct integration with Google's URL submission service, JWT-based authentication, comprehensive error handling with retry logic and quota management, and intelligent rate limiting.
- **Email Notification System**: Professional, responsive email templates for job completion/failure, daily quota reports, and quota alerts.
- **Security Features**: Comprehensive Zod schema input validation, SQL injection prevention, per-user rate limiting, environment-based CORS configuration, security headers, detailed audit logging, and role-based authorization.
- **Data Flow**: Database schema (`indb_` prefixed tables) for user profiles, service accounts, indexing jobs, URL submissions, quota usage/alerts, and notifications. User journey flows from authentication to job creation, processing, monitoring, and analytics. API requests flow through authentication, validation, authorization, business logic, database operations, and external API calls. Job processing involves creation, scheduling, URL processing, Google API submission, real-time updates, and email notifications.

**User Interface Design**
- **Main Color**: Clean white backgrounds (#FFFFFF).
- **Accent Colors**: PROPER dark palette ONLY - slate-900/800, stone-900/800, gray-800/900, neutral-800/900 (NO bright colors).
- **Typography**: Clean, readable fonts with proper hierarchy.
- **Layout**: Dashboard-style interface with collapsible left-aligned sidebar navigation.
- **Responsive Design**: Mobile-first approach with responsive breakpoints.
- **Theme**: Professional appearance optimized for SEO professionals.

**Key Pages Structure**
- **Dashboard**: Overview statistics, recent jobs, quick actions.
- **IndexNow**: Job creation interface for sitemaps and manual URLs.
- **Manage Jobs**: Paginated job listing with filtering, searching, and bulk operations.
- **Job Details**: Individual job monitoring with URL-level status tracking.
- **Settings**: User preferences, notification settings, and system configuration.

**Deployment Strategy**
- **Build System**: Next.js built-in build system (NO Vite).
- **Development**: Next.js dev server with hot reload.
- **Production**: Next.js production build with static optimization.
- **Hosting**: Designed for Replit deployment with proper environment variable configuration.
- **Database**: Supabase cloud service for scalability and reliability.

### External Dependencies
- **Supabase**: Backend-as-a-Service for database, authentication, and user management.
- **Google Indexing API**: Direct integration with Google's URL submission service.
- **Google Auth Library**: JWT authentication for Google services.
- **Frontend Libraries**: React 18, Next.js, TanStack React Query v5, React Hook Form, Wouter.
- **Backend Libraries**: Express, Node-cron, Nodemailer, Google APIs client library.
- **UI Libraries**: Radix UI components, shadcn/ui styling, Tailwind CSS, Lucide React icons.
- **Validation**: Zod for comprehensive schema validation.
- **Utilities**: xml2js (sitemap parsing), date-fns, clsx, class-variance-authority, framer-motion.
- **Development Tools**: TypeScript, tsx, esbuild.
```