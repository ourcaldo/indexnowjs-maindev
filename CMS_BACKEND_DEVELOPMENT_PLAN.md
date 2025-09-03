# CMS Backend Development Plan - IndexNow Studio Blog System

## Project Overview
Build complete CRUD (Create, Read, Update, Delete) functionality for the blog post management system in IndexNow Studio's admin backend. Currently, the system only displays existing posts but lacks creation and editing capabilities.

## Current State Analysis

### ✅ What We Have:
- **UI Framework**: Complete post listing interface in `/backend/admin/cms/posts`
- **Database Table**: `indb_cms_posts` with comprehensive schema
- **API Foundation**: Basic GET and POST endpoints in `/api/v1/admin/cms/posts/route.ts`
- **Authentication**: Super admin authentication already implemented
- **Post Interface**: CMSPost interface defined with all necessary fields

### ❌ What's Missing:
- Individual post CRUD API routes (`[id]/route.ts`)
- Create/Edit form components with rich text editor
- Image upload and management system
- Automatic slug generation
- Category management system
- URL structure updates (from `/blog/{slug}` to `/blog/{category}/{slug}`)
- Form validation and error handling

## Database Schema
Based on current `indb_cms_posts` table structure:

```sql
- id: uuid (Primary Key, auto-generated)
- title: text (Required)
- slug: text (Required, unique)
- content: text (Optional, rich HTML content)
- excerpt: text (Optional)
- featured_image_url: text (Optional)
- author_id: uuid (Foreign key to user profiles)
- status: text (draft/published/archived, default: 'draft')
- post_type: text (post/news/blog, default: 'post') 
- meta_title: text (Optional, SEO)
- meta_description: text (Optional, SEO)
- tags: jsonb (Array of strings, default: [])
- published_at: timestamp (Auto-set when status = 'published')
- created_at: timestamp (Auto-generated)
- updated_at: timestamp (Auto-updated)
- category: text (Required enhancement - default: 'uncategorized')
```

## Development Phases

### Phase 1: Database & API Foundation (Priority: HIGH)

#### 1.1 Database Schema Updates
- **Task**: Add `category` column to `indb_cms_posts` table
- **SQL Query**: 
  ```sql
  ALTER TABLE public.indb_cms_posts 
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'uncategorized';
  ```
- **Impact**: Enables category-based URL structure `/blog/{category}/{slug}`

#### 1.2 Individual Post API Routes
- **File**: Create `app/api/v1/admin/cms/posts/[id]/route.ts`
- **Methods**:
  - `GET` - Fetch single post by ID
  - `PUT` - Update existing post
  - `DELETE` - Delete post (already handled in main route)
  
#### 1.3 Post Status API Route
- **File**: Create `app/api/v1/admin/cms/posts/[id]/status/route.ts`
- **Method**: `PATCH` - Update post status only

### Phase 2: Create Post Functionality (Priority: HIGH)

#### 2.1 Create Post Form Component
- **File**: `app/backend/admin/cms/posts/create/page.tsx`
- **Features**:
  - Rich text editor (Tiptap with advanced features)
  - Featured image upload
  - SEO metadata fields
  - Tag management
  - Category selection
  - Auto-slug generation from title
  - Draft/Publish status toggle

#### 2.2 Form Validation & Utilities
- **File**: `lib/cms/validation.ts`
- **Functions**:
  - Post validation schemas
  - Slug generation utility
  - Duplicate slug checking
  - Content sanitization

#### 2.3 Image Upload System
- **File**: `app/api/v1/admin/cms/upload/route.ts`
- **Features**:
  - Image upload to Supabase Storage
  - Image optimization and resizing
  - URL generation for uploaded images

### Phase 3: Edit Post Functionality (Priority: HIGH)

#### 3.1 Edit Post Form Component  
- **File**: `app/backend/admin/cms/posts/[id]/edit/page.tsx`
- **Features**:
  - Pre-populated form with existing post data
  - Same functionality as create form
  - Update tracking (show last modified date)
  - Autosave functionality (draft)

#### 3.2 Post Preview System
- **File**: `app/backend/admin/cms/posts/[id]/preview/page.tsx`
- **Features**:
  - Live preview of post content
  - SEO preview (title, description, URL)
  - Mobile/desktop preview toggle

### Phase 4: URL Structure & Frontend Updates (Priority: MEDIUM)

#### 4.1 Update Public Blog Routes
- **Current**: `app/(public)/blog/[slug]/page.tsx`
- **New**: `app/(public)/blog/[category]/[slug]/page.tsx`
- **Migration**: Update existing posts to use category-based URLs

#### 4.2 Blog Archive Updates
- **File**: `app/(public)/blog/page.tsx`
- **Features**:
  - Category filtering
  - Category-based navigation
  - Breadcrumb navigation

#### 4.3 Category Management System
- **File**: `app/backend/admin/cms/categories/page.tsx`
- **Features**:
  - Create/edit/delete categories
  - Category slug management
  - Post count per category

### Phase 5: Enhanced Features (Priority: MEDIUM)

#### 5.1 Advanced Post Management
- **Bulk Actions**: Select multiple posts for status updates/deletion
- **Post Duplication**: Clone existing posts as drafts
- **Post Templates**: Predefined post structures
- **Scheduled Publishing**: Set future publish dates

#### 5.2 SEO Enhancements
- **Meta Preview**: Live preview of how posts appear in search results
- **SEO Score**: Basic SEO analysis of post content
- **Open Graph**: Social media preview generation

#### 5.3 Content Management
- **Version History**: Track post revisions
- **Content Analytics**: View count, engagement metrics
- **Related Posts**: Automatic suggestion system

### Phase 6: UI/UX Polish (Priority: LOW)

#### 6.1 Enhanced Post Editor
- **Rich Text Features**: Advanced Tiptap formatting, code blocks with syntax highlighting, tables, collaborative editing
- **Media Gallery**: Integrated image browser with drag-and-drop
- **Block Editor**: Tiptap-based modular block editor with custom extensions

#### 6.2 Improved Admin Interface
- **Dashboard Widgets**: Post stats, recent activity
- **Quick Actions**: Faster post status updates
- **Search & Filter**: Advanced post filtering options

## Technical Implementation Details

### API Endpoints to Create:

```
GET    /api/v1/admin/cms/posts/[id]         - Get single post
PUT    /api/v1/admin/cms/posts/[id]         - Update post  
DELETE /api/v1/admin/cms/posts/[id]         - Delete post
PATCH  /api/v1/admin/cms/posts/[id]/status  - Update status only
POST   /api/v1/admin/cms/upload             - Upload images
GET    /api/v1/admin/cms/categories         - List categories
POST   /api/v1/admin/cms/categories         - Create category
PUT    /api/v1/admin/cms/categories/[id]    - Update category
DELETE /api/v1/admin/cms/categories/[id]    - Delete category
```

### Form Components Structure:
```
components/
├── cms/
│   ├── PostEditor.tsx           # Rich text editor wrapper
│   ├── PostForm.tsx             # Main post form component
│   ├── ImageUploader.tsx        # Image upload component
│   ├── TagManager.tsx           # Tag input component
│   ├── CategorySelector.tsx     # Category dropdown
│   ├── SEOFields.tsx            # Meta title/description
│   └── PublishControls.tsx      # Status/publish controls
```

### Utility Functions:
```
lib/
├── cms/
│   ├── validation.ts            # Form validation schemas
│   ├── slugify.ts              # URL slug generation
│   ├── upload.ts               # File upload utilities
│   └── content.ts              # Content processing
```

## Dependencies to Install

```bash
# Rich Text Editor - Tiptap
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit
npm install @tiptap/extension-text-style @tiptap/extension-font-family
npm install @tiptap/extension-color @tiptap/extension-highlight
npm install @tiptap/extension-link @tiptap/extension-image
npm install @tiptap/extension-code-block-lowlight
npm install @tiptap/extension-table @tiptap/extension-table-row @tiptap/extension-table-cell @tiptap/extension-table-header

# Form Handling (already exists)
# react-hook-form @hookform/resolvers zod (already installed)

# Image Handling
npm install sharp @supabase/storage-js

# Utility Libraries
npm install slugify date-fns

# Syntax Highlighting for code blocks
npm install lowlight
```

## Database Queries Required

### Add Category Column:
```sql
ALTER TABLE public.indb_cms_posts 
ADD COLUMN IF NOT EXISTS category text DEFAULT 'uncategorized';

UPDATE public.indb_cms_posts 
SET category = 'general' 
WHERE category IS NULL OR category = '';
```

### Create Categories Table (Future):
```sql
CREATE TABLE IF NOT EXISTS public.indb_cms_categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  post_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

## Implementation Timeline

### Week 1: Foundation
- [ ] Add category column to database
- [ ] Create individual post API routes
- [ ] Set up post validation utilities

### Week 2: Create Functionality  
- [ ] Build create post form component
- [ ] Implement rich text editor
- [ ] Add image upload system
- [ ] Connect create form to API

### Week 3: Edit Functionality
- [ ] Build edit post form
- [ ] Add post preview system
- [ ] Implement autosave functionality
- [ ] Connect edit form to API

### Week 4: URL Structure & Polish
- [ ] Update public blog routes for categories
- [ ] Create category management system
- [ ] Add bulk actions and advanced features
- [ ] Testing and bug fixes

## Success Criteria

### Must Have:
- ✅ Create new blog posts with rich content
- ✅ Edit existing blog posts
- ✅ Upload and manage featured images
- ✅ Automatic slug generation
- ✅ SEO metadata management
- ✅ Post status management (draft/published/archived)
- ✅ Category-based URL structure

### Nice to Have:
- ✅ Post preview functionality  
- ✅ Bulk post operations
- ✅ Advanced rich text features
- ✅ Post analytics integration
- ✅ Content version history

## Notes & Considerations

1. **SEO Impact**: URL structure change requires 301 redirects for existing posts
2. **Image Storage**: Use Supabase Storage for scalable image management  
3. **Performance**: Implement pagination for post lists in admin
4. **Security**: Validate and sanitize all user input, especially rich content
5. **Backup**: Ensure proper backup strategy before major database changes
6. **Testing**: Implement both unit tests and integration tests for API routes

---

**Document Created**: January 03, 2025  
**Last Updated**: January 03, 2025  
**Status**: Planning Phase  
**Priority**: HIGH - Critical for CMS functionality