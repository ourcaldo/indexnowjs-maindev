# IndexNow Studio - Subdomain Implementation Plan

## Overview
Implement subdomain routing for IndexNow Studio to achieve clean URL structure:
- **dashboard.domain.com** - User Dashboard
- **backend.domain.com** - Admin Backend  
- **api.domain.com** - Centralized API

**Implementation Strategy**: Single Next.js App + Middleware Rewrites (Industry Standard)

## Implementation Steps

### Step 1: Project Analysis & Planning
**Objective**: Understand current routing structure and plan exact subdomain mapping

**Goals**:
- ✅ Map existing routes to target subdomains
- ✅ Identify shared components that need subdomain awareness
- ✅ Plan authentication flow across subdomains
- ✅ Document current navigation patterns

**Current Route Analysis**:
```
Current Structure:
├── app/dashboard/*              → dashboard.domain.com/*
├── app/backend/admin/*          → backend.domain.com/*
├── app/api/*                    → api.domain.com/*
├── app/(public)/*               → www.domain.com/* (main site)
└── app/login, /register, etc.   → www.domain.com/login (auth pages)
```

**Action Items**:
- [ ] Analyze all existing routes in app/ directory
- [ ] Map each route to target subdomain
- [ ] Identify cross-subdomain navigation needs
- [ ] Plan authentication redirect flows

---

### Step 2: Standardize API Calls to Use Environment Variables
**Objective**: Update all API calls to use base URL from environment variables for proper api.domain.com display

**Goals**:
- ✅ All API calls show `api.domain.com/v1/xxx` in network tab
- ✅ Use existing `NEXT_PUBLIC_API_BASE_URL` environment variable
- ✅ Standardize API call format across entire codebase
- ✅ Ensure consistent API URL structure

**Current Environment Configuration**:
```bash
# .env.local (already configured)
NEXT_PUBLIC_API_BASE_URL=http://0.0.0.0:5000/api  # Will change to https://api.domain.com
```

**Expected Behavior**:
```
Before: fetch('/api/v1/auth/login')        → Network shows: /api/v1/auth/login
After:  fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/auth/login`) → Network shows: https://api.domain.com/v1/auth/login
```

**Technical Requirements**:
- Update ~60 files with hardcoded `/api/...` calls
- Replace with `${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/...` format
- Maintain existing API route structure
- No new helper functions or middleware needed

**Action Items**:
- [ ] Update core API helper functions
- [ ] Update all hook files with API calls (~20 files)
- [ ] Update all page components with API calls (~30 files)
- [ ] Update TanStack Query keys
- [ ] Test all API calls work with env variable URLs

---

### Step 3: Update Next.js Configuration
**Objective**: Configure Next.js to support multiple subdomains with proper CORS and security

**Goals**:
- ✅ Allow requests from all target subdomains
- ✅ Update CORS headers for cross-subdomain requests
- ✅ Configure security headers for subdomains
- ✅ Ensure proper host header handling

**Configuration Updates**:
- Update `next.config.js` allowed origins
- Modify CORS headers for subdomain support
- Update server actions allowed origins
- Configure proper host header validation

**Security Considerations**:
- Maintain existing security headers
- Ensure subdomain isolation where needed
- Preserve authentication security across domains

**Action Items**:
- [ ] Update allowedOrigins in next.config.js
- [ ] Modify CORS headers for subdomains
- [ ] Update server actions configuration
- [ ] Test configuration with multiple subdomains

---

### Step 4: Update Authentication System
**Objective**: Ensure seamless authentication across all subdomains

**Goals**:
- ✅ Enable cross-subdomain cookie sharing
- ✅ Implement proper authentication redirects
- ✅ Maintain role-based access control
- ✅ Handle logout across all subdomains

**Authentication Flow Updates**:
- Set cookie domain to `.domain.com` for cross-subdomain access
- Update login redirects based on user role:
  - Regular users → `dashboard.domain.com`
  - Admin users → `backend.domain.com`
- Update logout to work across all subdomains
- Ensure JWT tokens work across subdomains

**Role-Based Routing**:
```
User Login Flow:
1. User logs in at www.domain.com/login
2. System checks user role
3. Regular user → Redirect to dashboard.domain.com
4. Admin user → Redirect to backend.domain.com
```

**Action Items**:
- [ ] Update cookie configuration for cross-subdomain
- [ ] Modify login redirect logic
- [ ] Update authentication middleware
- [ ] Test authentication across subdomains

---

### Step 5: Modify Layouts for Subdomain Awareness
**Objective**: Make navigation and layouts aware of current subdomain context

**Goals**:
- ✅ Hide irrelevant navigation on each subdomain
- ✅ Update links to use appropriate subdomains
- ✅ Maintain consistent branding across subdomains
- ✅ Optimize user experience per subdomain

**Layout Modifications**:

**Dashboard Layout** (`app/dashboard/layout.tsx`):
- Remove admin-specific navigation
- Update internal links to use dashboard.domain.com
- Hide backend access for regular users

**Backend Layout** (`app/backend/admin/layout.tsx`):
- Remove user dashboard navigation
- Update internal links to use backend.domain.com
- Maintain admin-specific navigation

**Shared Components**:
- Update components that generate URLs
- Make navigation subdomain-aware
- Update any hardcoded domain references

**Action Items**:
- [ ] Update dashboard layout navigation
- [ ] Update backend layout navigation  
- [ ] Modify shared components for subdomain links
- [ ] Test navigation across subdomains

---

### Step 6: Development Testing
**Objective**: Test all subdomain functionality locally using hosts file configuration

**Goals**:
- ✅ Verify all subdomains route correctly
- ✅ Test authentication across subdomains
- ✅ Ensure navigation works properly
- ✅ Validate API calls from different subdomains

**Local Testing Setup**:
```bash
# Add to /etc/hosts (Mac/Linux) or C:\Windows\System32\drivers\etc\hosts (Windows)
127.0.0.1 dashboard.localhost
127.0.0.1 backend.localhost  
127.0.0.1 api.localhost
127.0.0.1 www.localhost
```

**Testing Checklist**:
- [ ] Dashboard subdomain loads correctly
- [ ] Backend subdomain loads correctly
- [ ] API subdomain responds correctly
- [ ] Authentication works across subdomains
- [ ] Navigation links use correct subdomains
- [ ] User roles redirect to appropriate subdomains
- [ ] Logout works across all subdomains

**Test Cases**:
1. **Dashboard Access**: Visit dashboard.localhost:5000, verify dashboard loads
2. **Backend Access**: Visit backend.localhost:5000, verify admin panel loads
3. **API Access**: Make API call to api.localhost:5000, verify response
4. **Cross-Auth**: Login on www.localhost:5000, verify redirect to correct subdomain
5. **Navigation**: Test internal links maintain correct subdomain context

**Action Items**:
- [ ] Configure local hosts file
- [ ] Test each subdomain individually
- [ ] Test authentication flow
- [ ] Test cross-subdomain navigation
- [ ] Document any issues found

---

### Step 7: Update Project Documentation
**Objective**: Document the subdomain implementation in project.md for future reference

**Goals**:
- ✅ Document subdomain architecture in project.md
- ✅ Record implementation details for future maintenance
- ✅ Update timeline in Recent Changes section
- ✅ Document deployment requirements

**Documentation Updates**:
- Add subdomain architecture to project.md
- Document middleware implementation
- Record configuration changes
- Update deployment requirements
- Add troubleshooting guide

**Recent Changes Entry**:
Add comprehensive entry to project.md Recent Changes section with:
- Implementation date
- Architecture changes
- Files modified
- Benefits achieved
- Deployment considerations

**Action Items**:
- [ ] Update project.md with subdomain architecture
- [ ] Document all files modified
- [ ] Add Recent Changes timeline entry
- [ ] Create deployment checklist
- [ ] Document troubleshooting steps

---

## Deployment Considerations

### DNS Configuration Required:
```
DNS Records Needed:
A/CNAME dashboard.yourdomain.com → Replit deployment
A/CNAME backend.yourdomain.com  → Replit deployment  
A/CNAME api.yourdomain.com      → Replit deployment
A/CNAME www.yourdomain.com      → Replit deployment (optional)
```

### Environment Variables:
```bash
NEXT_PUBLIC_DASHBOARD_URL=https://dashboard.yourdomain.com
NEXT_PUBLIC_BACKEND_URL=https://backend.yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
DOMAIN=yourdomain.com
```

### Replit Configuration:
- Single deployment serves all subdomains
- Configure custom domains for each subdomain
- Update allowed origins in deployment settings

## Success Criteria

✅ **Functional Requirements**:
- All subdomains load appropriate content
- Authentication works seamlessly across subdomains
- Navigation maintains correct subdomain context
- API calls work from any subdomain

✅ **User Experience Requirements**:
- Clean, professional URLs for each service
- Intuitive navigation within each subdomain
- Consistent branding across all subdomains
- Fast loading and proper error handling

✅ **Technical Requirements**:
- Single codebase maintains all functionality
- Proper security headers and CORS configuration
- Scalable architecture for future enhancements
- Comprehensive error handling and logging

## Estimated Timeline

- **Step 1-2**: 1 day (Analysis + Middleware)
- **Step 3-4**: 1 day (Configuration + Authentication)  
- **Step 5**: 0.5 day (Layout modifications)
- **Step 6**: 1 day (Testing and refinement)
- **Step 7**: 0.5 day (Documentation)

**Total Estimated Time**: 4 days

## Risk Mitigation

**Potential Issues**:
- Authentication cookie conflicts
- CORS issues with cross-subdomain requests
- Navigation link inconsistencies
- SEO impact on existing URLs

**Mitigation Strategies**:
- Thorough testing with hosts file before deployment
- Gradual rollout with fallback options
- Comprehensive error logging
- Documentation of all changes for rollback if needed