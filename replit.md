# IndexNow Studio - Replit Setup

## Overview
IndexNow Studio is a Next.js application for SEO rank tracking and IndexNow API integration. This project has been successfully imported and configured for the Replit environment.

## Project Architecture
- **Framework**: Next.js 15.5.0 with Turbopack
- **Database**: Supabase (configured with base.indexnow.studio)
- **Authentication**: Supabase Auth with JWT
- **Styling**: Tailwind CSS with Radix UI components
- **Rich Text Editor**: Tiptap
- **State Management**: TanStack Query
- **Email**: SMTP configuration for notifications
- **Payment**: Midtrans integration for billing

## Key Features
- CMS for content management (pages, posts, categories)
- User authentication and authorization
- Admin dashboard for user and order management
- SEO rank tracking with keyword monitoring
- IndexNow API integration for fast indexing
- Billing and subscription management
- Real-time WebSocket connections

## Environment Configuration
The application is configured with:
- Port 5000 for frontend (required for Replit)
- Host 0.0.0.0 for proper Replit integration
- Allowed origins configured for Replit domains
- Background services disabled in development mode

## Development Commands
- `npm run dev` - Start development server on port 5000
- `npm run build` - Build production version
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - TypeScript type checking

## Deployment
Configured for autoscale deployment with:
- Build command: `npm run build`
- Start command: `npm run start`

## Database Integration
Uses Supabase as the backend with pre-configured:
- User authentication
- CMS content storage
- Order and billing management
- Real-time subscriptions

## Recent Setup (September 2025)
- ✅ Dependencies installed and verified
- ✅ Next.js configuration optimized for Replit
- ✅ Workflow configured on port 5000 with webview
- ✅ Environment variables properly set
- ✅ Application tested and running successfully
- ✅ Deployment configuration completed

## Notes
- GeoIP-lite data files not found (using fallback IP-API service)
- Multiple GoTrueClient instances warning (non-critical)
- Cross-origin requests properly handled by Next.js configuration
- Background services intentionally disabled in development mode