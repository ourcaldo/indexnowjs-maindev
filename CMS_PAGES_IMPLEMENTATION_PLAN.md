# CMS Pages Implementation Plan

## Project Overview

This document outlines the complete implementation plan for the **Pages CMS** system within IndexNow Studio. This will complement the existing **Blog CMS** system by providing functionality to create and manage static pages (About, Contact, Services, etc.) that use direct slug routing (`/[slug]`) instead of categorized routing (`/blog/[category]/[slug]`).

## Current State Analysis

### ✅ **What's Already Available (Blog CMS)**
- **Database**: Complete `indb_cms_posts` table with categories, tags, SEO
- **Backend API**: Full CRUD operations at `/api/v1/admin/cms/posts/`
- **Frontend Components**: TiptapEditor, PostForm, ImageUploader, TagManager, CategorySelector, SEOFields, PublishControls
- **Admin Interface**: Complete listing, create, edit pages with filtering and status management
- **Validation**: Comprehensive Zod schemas in `lib/cms/validation.ts`
- **Category System**: Full hierarchical category management

### ✅ **What Exists for Pages**
- **Database Table**: `indb_cms_pages` exists with proper schema
- **Reusable Components**: Most CMS components can be adapted for pages

### ❌ **What's Missing for Pages**
- **Backend API**: No API routes for pages CRUD operations
- **Frontend Interface**: No admin interface for pages management
- **Validation Schemas**: No page-specific validation schemas
- **Frontend Routing**: No public page routing implementation
- **Page Components**: No page-specific form components

## Database Schema Analysis

### Current `indb_cms_pages` Schema
```sql
create table public.indb_cms_pages (
  id uuid not null default gen_random_uuid (),
  title text not null,
  slug text not null,
  content text null,
  template text null default 'default'::text,
  featured_image_url text null,
  author_id uuid null,
  status text null default 'draft'::text,
  is_homepage boolean null default false,
  meta_title text null,
  meta_description text null,
  custom_css text null,
  custom_js text null,
  published_at timestamp with time zone null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint indb_cms_pages_pkey primary key (id),
  constraint indb_cms_pages_slug_key unique (slug),
  constraint indb_cms_pages_author_id_fkey foreign KEY (author_id) references auth.users (id)
);
```

### Key Differences from Posts Table
| Feature | Pages | Posts | Notes |
|---------|--------|--------|--------|
| **Categories** | ❌ No | ✅ Yes | Pages don't need categorization |
| **Tags** | ❌ No | ✅ Yes | Pages don't need tagging |
| **Excerpt** | ❌ No | ✅ Yes | Pages use full content |
| **Post Type** | ❌ No | ✅ Yes | Pages have templates instead |
| **Template** | ✅ Yes | ❌ No | Pages support different templates |
| **Homepage Flag** | ✅ Yes | ❌ No | Pages can be set as homepage |
| **Custom CSS/JS** | ✅ Yes | ❌ No | Pages support custom styling |
| **Routing** | `/[slug]` | `/blog/[category]/[slug]` | Different URL structure |

### Database Schema Enhancements (if needed)
No changes required to the existing `indb_cms_pages` table. The current schema is well-designed and covers all necessary features for pages management.

## Development Phases

### Phase 1: Backend API Development

#### 1.1 Core API Routes
Create the following API routes structure:

**Main Pages Route**
- **File**: `app/api/v1/admin/cms/pages/route.ts`
- **Methods**:
  - `GET` - List all pages with pagination, search, and filtering
  - `POST` - Create new page

**Individual Page Route**
- **File**: `app/api/v1/admin/cms/pages/[id]/route.ts`
- **Methods**:
  - `GET` - Fetch single page by ID
  - `PUT` - Update existing page
  - `DELETE` - Delete page

**Page Status Route**
- **File**: `app/api/v1/admin/cms/pages/[id]/status/route.ts`
- **Method**: `PATCH` - Update page status only

**Slug Validation Route**
- **File**: `app/api/v1/admin/cms/pages/validate-slug/route.ts`
- **Method**: `GET` - Validate slug uniqueness

#### 1.2 Public Pages API
**Public Pages Route**
- **File**: `app/api/v1/public/pages/route.ts`
- **Method**: `GET` - Fetch published pages for public use

**Single Public Page Route**
- **File**: `app/api/v1/public/pages/[slug]/route.ts`
- **Method**: `GET` - Fetch single published page by slug

#### 1.3 Homepage Management
**Homepage Route**
- **File**: `app/api/v1/admin/cms/pages/homepage/route.ts`
- **Methods**:
  - `GET` - Get current homepage
  - `POST` - Set page as homepage

### Phase 2: Validation and Types

#### 2.1 Page Validation Schemas
**File**: `lib/cms/pageValidation.ts`

```typescript
import { z } from 'zod'

export const PageFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  slug: z.string().min(1, 'Slug is required').max(255, 'Slug must be less than 255 characters'),
  content: z.string().optional(),
  template: z.enum(['default', 'landing', 'about', 'contact', 'services']).default('default'),
  featured_image_url: z.string().url('Featured image must be a valid URL').optional().or(z.literal('')),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  is_homepage: z.boolean().default(false),
  meta_title: z.string().max(255, 'Meta title must be less than 255 characters').optional(),
  meta_description: z.string().max(500, 'Meta description must be less than 500 characters').optional(),
  custom_css: z.string().optional(),
  custom_js: z.string().optional()
})

export const PageStatusUpdateSchema = z.object({
  status: z.enum(['draft', 'published', 'archived'])
})

export const HomepageUpdateSchema = z.object({
  page_id: z.string().uuid()
})

export type PageFormData = z.infer<typeof PageFormSchema>
export type PageStatusUpdateData = z.infer<typeof PageStatusUpdateSchema>
export type HomepageUpdateData = z.infer<typeof HomepageUpdateSchema>
```

#### 2.2 Page Type Definitions
**File**: `types/pages.ts`

```typescript
export interface CMSPage {
  id: string
  title: string
  slug: string
  content: string | null
  template: string
  featured_image_url: string | null
  author_id: string
  status: 'draft' | 'published' | 'archived'
  is_homepage: boolean
  meta_title: string | null
  meta_description: string | null
  custom_css: string | null
  custom_js: string | null
  published_at: string | null
  created_at: string
  updated_at: string
  author_name?: string
  author_email?: string
}

export interface PageTemplate {
  id: string
  name: string
  description: string
  preview_image?: string
}
```

### Phase 3: Frontend Components

#### 3.1 Adapted CMS Components
Create page-specific versions of existing components:

**Page Form Component**
- **File**: `components/cms/PageForm.tsx`
- **Based on**: `PostForm.tsx`
- **Changes**:
  - Remove category and tag management
  - Add template selector
  - Add homepage toggle
  - Add custom CSS/JS fields
  - Remove excerpt field

**Template Selector Component**
- **File**: `components/cms/TemplateSelector.tsx`
- **Purpose**: Select page template with preview
- **Templates**: default, landing, about, contact, services

**Custom Code Editor Component**
- **File**: `components/cms/CustomCodeEditor.tsx`
- **Purpose**: Edit custom CSS and JavaScript with syntax highlighting
- **Features**: Separate tabs for CSS and JS, live preview option

**Homepage Toggle Component**
- **File**: `components/cms/HomepageToggle.tsx`
- **Purpose**: Toggle page as homepage with validation

#### 3.2 New Page-Specific Components
**Page SEO Fields**
- **File**: `components/cms/PageSEOFields.tsx`
- **Based on**: `SEOFields.tsx`
- **Changes**: Adapted for pages without categories/tags

**Page Publish Controls**
- **File**: `components/cms/PagePublishControls.tsx`
- **Based on**: `PublishControls.tsx`
- **Changes**: Include homepage setting, template preview

### Phase 4: Admin Interface Pages

#### 4.1 Pages Management Interface
**Pages List Page**
- **File**: `app/backend/admin/cms/pages/page.tsx`
- **Features**:
  - List all pages with status, template, homepage indicator
  - Search by title and content
  - Filter by status and template
  - Bulk actions (delete, status change)
  - Homepage indicator badge
  - Quick status toggle

**Create Page Interface**
- **File**: `app/backend/admin/cms/pages/create/page.tsx`
- **Features**:
  - PageForm component integration
  - Template preview
  - Real-time slug generation
  - Custom CSS/JS editor
  - Homepage setting

**Edit Page Interface**
- **File**: `app/backend/admin/cms/pages/[id]/edit/page.tsx`
- **Features**:
  - Load existing page data
  - Full edit capabilities
  - Preview functionality
  - Version history (future enhancement)

#### 4.2 Homepage Management
**Homepage Settings Page**
- **File**: `app/backend/admin/cms/pages/homepage/page.tsx`
- **Features**:
  - Current homepage display
  - Change homepage selection
  - Homepage preview
  - Reset to default option

### Phase 5: Public Frontend Implementation

#### 5.1 Dynamic Page Routing with ISR
**Dynamic Page Route with ISR**
- **File**: `app/(public)/[slug]/page.tsx`
- **Features**:
  - Fetch page by slug with ISR caching
  - Template-based rendering
  - SEO optimization
  - Custom CSS/JS injection
  - 404 handling for unpublished pages
- **ISR Configuration**:
  - `revalidate: 3600` (1 hour) for regular pages
  - `revalidate: 86400` (24 hours) for stable content pages
  - On-demand revalidation when pages are updated in admin
  - Static generation for all published pages at build time

**Page Components by Template**
- **File**: `app/(public)/[slug]/components/`
  - `DefaultPageContent.tsx` - Standard page layout
  - `LandingPageContent.tsx` - Landing page layout
  - `AboutPageContent.tsx` - About page layout
  - `ContactPageContent.tsx` - Contact page layout
  - `ServicesPageContent.tsx` - Services page layout

#### 5.2 Homepage Implementation with ISR
**Homepage Route Override with ISR**
- **File**: `app/(public)/page.tsx`
- **Logic**:
  - Check if custom homepage is set
  - Render custom page content if available
  - Fall back to default landing page
  - Handle homepage not found scenarios
- **ISR Configuration**:
  - `revalidate: 1800` (30 minutes) for homepage content
  - On-demand revalidation when homepage setting changes
  - Automatic cache invalidation on homepage updates

### Phase 6: Advanced Features

#### 6.1 Template System
**Template Manager**
- Custom template creation
- Template preview system
- Template inheritance
- Component library integration

#### 6.2 Page Analytics
**Page Performance Tracking**
- View counts
- Engagement metrics
- SEO performance
- Load time monitoring

#### 6.3 Version Control
**Page Versioning**
- Content version history
- Rollback functionality
- Change comparison
- Draft management

#### 6.4 Advanced ISR Features
**Smart Cache Management**
- Template-specific revalidation strategies
- Conditional revalidation based on content change type
- Batch revalidation for multiple pages
- Performance monitoring and cache hit analytics
- A/B testing support with ISR variants

## Implementation Details

### Authentication & Authorization
- **Admin Access**: Require `super_admin` role for pages management
- **Author Tracking**: Track page creator and last editor
- **Audit Logging**: Log all page operations for security

### SEO Optimization
- **Meta Tags**: Full meta title and description support
- **Open Graph**: Page-specific OG tags
- **Structured Data**: JSON-LD for pages
- **Sitemap Integration**: Automatic sitemap updates

### Performance Considerations & ISR Implementation

#### ISR (Incremental Static Regeneration) Strategy
- **Static Generation**: Pre-generate all published pages at build time
- **Revalidation Intervals**:
  - **Homepage**: `revalidate: 1800` (30 minutes) - More frequent due to higher traffic
  - **Regular Pages**: `revalidate: 3600` (1 hour) - Standard content pages
  - **Stable Pages**: `revalidate: 86400` (24 hours) - About, Terms, Privacy pages
- **On-Demand Revalidation**: Trigger cache updates when content changes via admin panel
- **Fallback Strategy**: `fallback: 'blocking'` for new pages to ensure immediate availability

#### Cache Invalidation Implementation
```typescript
// Backend API - Trigger revalidation when page is updated
export async function revalidatePage(slug: string) {
  await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/revalidate?path=/${slug}&secret=${process.env.REVALIDATION_TOKEN}`)
}

// Revalidation API route at /api/revalidate/route.ts
export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get('path')
  const secret = request.nextUrl.searchParams.get('secret')
  
  if (secret !== process.env.REVALIDATION_TOKEN) {
    return NextResponse.json({ message: 'Invalid token' }, { status: 401 })
  }
  
  try {
    await revalidatePath(path)
    return NextResponse.json({ revalidated: true })
  } catch (err) {
    return NextResponse.json({ message: 'Error revalidating' }, { status: 500 })
  }
}
```

#### Additional Performance Optimizations
- **Image Optimization**: Next.js Image component with featured image optimization
- **Code Splitting**: Template-based code splitting for different page layouts
- **Database Indexes**: Proper indexing on `slug`, `status`, and `published_at` columns
- **Static Assets**: Serve images, CSS, JS from CDN with proper caching headers
- **Compression**: Gzip/Brotli compression for all static assets

### Security Measures
- **Content Sanitization**: Sanitize custom CSS/JS
- **XSS Prevention**: Prevent malicious script injection
- **CSRF Protection**: Include CSRF tokens
- **Input Validation**: Server-side validation for all inputs

## File Structure Summary

```
📁 Backend API Routes
├── app/api/v1/admin/cms/pages/
│   ├── route.ts                    ← Main CRUD operations
│   ├── [id]/route.ts              ← Individual page operations
│   ├── [id]/status/route.ts       ← Status updates
│   ├── validate-slug/route.ts     ← Slug validation
│   └── homepage/route.ts          ← Homepage management
├── app/api/v1/public/pages/
│   ├── route.ts                   ← Public pages list
│   └── [slug]/route.ts           ← Public single page

📁 Frontend Admin Interface
├── app/backend/admin/cms/pages/
│   ├── page.tsx                   ← Pages list & management
│   ├── create/page.tsx           ← Create new page
│   ├── [id]/edit/page.tsx        ← Edit existing page
│   └── homepage/page.tsx         ← Homepage management

📁 Public Page Routes
├── app/(public)/[slug]/
│   ├── page.tsx                   ← Dynamic page route
│   └── components/               ← Template components
│       ├── DefaultPageContent.tsx
│       ├── LandingPageContent.tsx
│       ├── AboutPageContent.tsx
│       ├── ContactPageContent.tsx
│       └── ServicesPageContent.tsx

📁 Components & Utilities
├── components/cms/
│   ├── PageForm.tsx              ← Main page form
│   ├── TemplateSelector.tsx      ← Template selection
│   ├── CustomCodeEditor.tsx      ← CSS/JS editor
│   ├── HomepageToggle.tsx        ← Homepage toggle
│   ├── PageSEOFields.tsx         ← SEO fields for pages
│   └── PagePublishControls.tsx   ← Publish controls
├── lib/cms/
│   └── pageValidation.ts         ← Validation schemas
└── types/
    └── pages.ts                  ← TypeScript types
```

## Testing Strategy

### Unit Tests
- API route handlers
- Validation schemas
- Utility functions
- Component rendering

### Integration Tests
- Full CRUD operations
- Homepage management
- Public page rendering
- Template switching

### E2E Tests
- Complete page creation workflow
- Publishing and unpublishing
- Homepage setting and display
- Public page access

## Migration Strategy

### Phase 1: Backend Foundation
1. Create API routes
2. Implement validation
3. Test with API tools

### Phase 2: Admin Interface
1. Create admin components
2. Implement management pages
3. Test admin workflows

### Phase 3: Public Interface
1. Implement public routing
2. Create template system
3. Test public access

### Phase 4: Integration & Polish
1. Connect all systems
2. Implement advanced features
3. Performance optimization
4. Security hardening

## Future Enhancements

### Content Management
- **Page Builder**: Drag-and-drop page builder
- **Component Library**: Reusable page components
- **Multi-language**: Internationalization support
- **Content Scheduling**: Scheduled publishing

### Advanced Features
- **A/B Testing**: Page variant testing
- **Personalization**: User-specific content
- **Analytics Integration**: Google Analytics integration
- **Performance Monitoring**: Core Web Vitals tracking

### Developer Features
- **API Integration**: Headless CMS capabilities
- **Webhook System**: Content change notifications
- **Custom Fields**: Extensible field system
- **Theme System**: Advanced theming support

## Success Metrics

### Technical Metrics
- ✅ All API routes functional and tested
- ✅ Admin interface fully operational
- ✅ Public pages rendering correctly
- ✅ SEO optimization working
- ✅ Performance benchmarks met

### User Experience Metrics
- ✅ Intuitive admin interface
- ✅ Fast page creation workflow
- ✅ Reliable publishing system
- ✅ Good public page performance
- ✅ Mobile-responsive design

### Business Metrics
- ✅ Reduced time to create pages
- ✅ Improved SEO performance
- ✅ Better user engagement
- ✅ Increased content creation
- ✅ Enhanced brand consistency

---

## Implementation Readiness

This plan provides a comprehensive roadmap for implementing the Pages CMS system. The existing Blog CMS infrastructure provides a solid foundation, and most components can be adapted with minimal changes. The implementation should be straightforward given the existing patterns and codebase maturity.

**Estimated Development Time**: 2-3 weeks for complete implementation
**Complexity Level**: Medium (leveraging existing CMS patterns)
**Dependencies**: None (all prerequisites exist)
**Risk Level**: Low (well-established patterns)