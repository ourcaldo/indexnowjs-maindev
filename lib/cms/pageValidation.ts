import { z } from 'zod'
import slugify from 'slugify'

// Page validation schemas
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

// Slug generation utility
export function generateSlug(title: string): string {
  return slugify(title, {
    lower: true,
    strict: true,
    remove: /[*+~.()'"!:@]/g
  })
}

// Check if slug is unique (for frontend validation)
export async function isSlugUnique(slug: string, excludeId?: string): Promise<boolean> {
  try {
    const params = new URLSearchParams({ slug })
    if (excludeId) {
      params.append('excludeId', excludeId)
    }
    
    const response = await fetch(`/api/v1/admin/cms/pages/validate-slug?${params}`, {
      credentials: 'include'
    })
    
    if (!response.ok) {
      return false
    }
    
    const data = await response.json()
    return data.isUnique
  } catch (error) {
    console.error('Error validating slug:', error)
    return false
  }
}

// Content sanitization utility
export function sanitizeContent(content: string): string {
  // Basic HTML sanitization - remove script tags and other dangerous elements
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
}

// Sanitize custom CSS
export function sanitizeCustomCSS(css: string): string {
  // Remove dangerous CSS properties and functions
  return css
    .replace(/@import\s+/gi, '') // Remove @import statements
    .replace(/expression\s*\(/gi, '') // Remove CSS expressions (IE)
    .replace(/javascript\s*:/gi, '') // Remove javascript: URLs
    .replace(/behavior\s*:/gi, '') // Remove IE behaviors
    .replace(/binding\s*:/gi, '') // Remove binding property
}

// Sanitize custom JavaScript
export function sanitizeCustomJS(js: string): string {
  // Basic JS sanitization - remove dangerous patterns
  return js
    .replace(/eval\s*\(/gi, '') // Remove eval calls
    .replace(/Function\s*\(/gi, '') // Remove Function constructor
    .replace(/setTimeout\s*\(\s*["']/gi, 'setTimeout(function() {') // Convert string timeouts
    .replace(/setInterval\s*\(\s*["']/gi, 'setInterval(function() {') // Convert string intervals
    .replace(/document\.write\s*\(/gi, '') // Remove document.write
}

// Extract excerpt from content for pages (shorter than posts)
export function generatePageExcerpt(content: string, maxLength: number = 120): string {
  // Strip HTML tags and get plain text
  const plainText = content.replace(/<[^>]*>/g, '').trim()
  
  if (plainText.length <= maxLength) {
    return plainText
  }
  
  // Find the last complete word within the limit
  const truncated = plainText.substring(0, maxLength)
  const lastSpaceIndex = truncated.lastIndexOf(' ')
  
  if (lastSpaceIndex > 0) {
    return truncated.substring(0, lastSpaceIndex) + '...'
  }
  
  return truncated + '...'
}

// Validate file type for image uploads (same as posts)
export function isValidImageType(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  return validTypes.includes(file.type)
}

// Validate file size (in MB)
export function isValidImageSize(file: File, maxSizeMB: number = 5): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  return file.size <= maxSizeBytes
}

// Generate SEO-friendly meta title for pages
export function generatePageMetaTitle(title: string, siteName?: string): string {
  const maxLength = 60
  let metaTitle = title
  
  if (siteName) {
    const withSiteName = `${title} | ${siteName}`
    metaTitle = withSiteName.length <= maxLength ? withSiteName : title
  }
  
  return metaTitle.length > maxLength ? title.substring(0, 57) + '...' : metaTitle
}

// Generate SEO-friendly meta description for pages
export function generatePageMetaDescription(content: string, maxLength: number = 160): string {
  const excerpt = generatePageExcerpt(content, maxLength)
  return excerpt
}

// Validate template type
export function isValidTemplate(template: string): boolean {
  const validTemplates = ['default', 'landing', 'about', 'contact', 'services']
  return validTemplates.includes(template)
}

// Get template display name
export function getTemplateDisplayName(template: string): string {
  const templateNames = {
    'default': 'Default',
    'landing': 'Landing Page',
    'about': 'About Page',
    'contact': 'Contact Page',
    'services': 'Services Page'
  }
  return templateNames[template as keyof typeof templateNames] || 'Default'
}

// Get template description
export function getTemplateDescription(template: string): string {
  const templateDescriptions = {
    'default': 'Standard page layout with header and content area',
    'landing': 'Hero section with call-to-action and features',
    'about': 'Company information and team presentation',
    'contact': 'Contact form and business information',
    'services': 'Service listings with descriptions and pricing'
  }
  return templateDescriptions[template as keyof typeof templateDescriptions] || 'Standard page layout'
}