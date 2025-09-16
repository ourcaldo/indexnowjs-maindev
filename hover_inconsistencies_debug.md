# Dashboard Hover Color Inconsistencies Audit

## Reference Pattern (from rank history table):
- Table rows: `hover:bg-slate-50 transition-colors duration-150`
- Grouped hover: `group-hover:bg-slate-50 transition-colors duration-150`  
- Headers: `hover:bg-slate-100 transition-colors duration-150`

## Major Inconsistencies Found:

### 1. Dashboard Layout & Sidebar
- **app/dashboard/layout.tsx**: Lines 209, 216 - `hover:bg-muted`, `hover:bg-secondary`
- **components/Sidebar.tsx**: Line 155 - `hover:bg-secondary`
- **components/AdminSidebar.tsx**: Line 160 - `hover:bg-secondary`

### 2. Dashboard Components  
- **app/dashboard/indexnow/rank-history/components/DateRangeCalendar.tsx**: Lines 98, 139, 148 - `hover:bg-blue-100`, `hover:bg-blue-700`, `hover:bg-gray-100`
- **components/dashboard/enhanced/DataTable.tsx**: `hover:bg-muted/50`
- **components/dashboard/enhanced/StatCard.tsx**: `hover:bg-primary/20`, `hover:bg-success/20`, etc.
- **components/dashboard/widgets/ActivityTimeline.tsx**: `hover:bg-secondary`
- **components/dashboard/widgets/RankingDistribution.tsx**: `hover:bg-muted`

### 3. Overview & Bulk Actions
- **app/dashboard/indexnow/overview/components/BulkActions.tsx**: `hover:bg-destructive/10`
- **app/dashboard/indexnow/overview/components/FilterPanel.tsx**: Various inconsistencies
- **app/dashboard/indexnow/add/page.tsx**: `hover:bg-secondary`, `hover:bg-muted/70`

### 4. Plans & Billing
- **app/dashboard/settings/plans-billing/components/PricingCards.tsx**: `hover:bg-accent/10`, `hover:bg-white/20`
- **app/dashboard/settings/plans-billing/checkout/components/CheckoutSubmitButton.tsx**: `hover:bg-slate-50` (CORRECT)
- **app/dashboard/settings/plans-billing/history/HistoryTab.tsx**: `hover:bg-secondary`

### 5. Other Dashboard Pages
- **app/dashboard/manage-jobs/page.tsx**: Multiple `hover:bg-secondary`, `hover:bg-destructive/10`
- **app/dashboard/indexnow/page.tsx**: `hover:bg-secondary`, `hover:bg-muted`
- **app/dashboard/settings/service-accounts/page.tsx**: `hover:bg-brand-accent/5`

### 6. Filters & Tables
- **components/blog/BlogFilters.tsx**: `hover:bg-muted/50`, `hover:bg-muted/70`
- **Various table components**: Inconsistent hover states

## Action Plan:
1. Fix DateRangeCalendar hardcoded blue colors first
2. Update sidebar hover effects to slate-50 pattern
3. Fix dashboard component hover effects systematically
4. Update table and filter components
5. Test all changes work properly