# Free Trial Implementation Plan (Revised Approach)
**IndexNow Studio - Free Trial with Parameter-Based System**

## Overview
Transform the current Free Package system into a Free Trial model using URL parameters and metadata. Users can choose "Subscribe" or "Start Free Trial" for Premium and Pro plans. The trial flow uses the same packages but with different payment processing and metadata tracking.

---

## Current System Analysis

### Current Package Structure
- **Free Package**: Automatically assigned on user registration, no payment required
- **Premium Package**: Mid-tier with enhanced features (500 daily URLs, 250 keywords)
- **Pro Package**: Highest tier with unlimited service accounts and daily URLs (1500 keywords)

### Current Flow
1. User registers → Automatically assigned to Free Package
2. User can upgrade to Premium or Pro through checkout page
3. Payment via Midtrans Snap or Bank Transfer

---

## New Free Trial System Requirements (Simplified Approach)

### Core Concept
- **No new packages needed** - Use existing Premium and Pro packages
- Add "Start Free Trial" buttons alongside "Subscribe" buttons
- Use URL parameter `trial=true` to indicate trial flow
- Same database tables, enhanced with metadata fields
- Midtrans handles auto-billing through subscription scheduling

### Trial Configuration
- **Trial Duration**: 3 days (configurable)
- **Available Plans**: Existing Premium and Pro packages
- **Payment Method**: **Card Recurring ONLY** when `trial=true`
- **Restriction**: Hide Bank Transfer and other methods for trial flow
- **Initial Charge**: $0 (tokenization transaction)
- **Post-Trial Charge**: Full plan amount in IDR
- **Database**: Same order/subscription tables with enhanced metadata

---

## Detailed Implementation Plan

### Phase 1: Database Schema Updates (Simplified)

#### 1.1 No Changes to `indb_payment_packages` Table
**No new packages needed** - We use existing Premium and Pro packages for both regular subscriptions and trials. The trial logic is handled through metadata and URL parameters.

#### 1.2 Update `indb_auth_user_profiles` Table
```sql
-- Add trial tracking columns
ALTER TABLE indb_auth_user_profiles 
ADD COLUMN trial_started_at TIMESTAMPTZ,
ADD COLUMN trial_ends_at TIMESTAMPTZ,
ADD COLUMN trial_status VARCHAR(20) DEFAULT 'none', -- 'none', 'active', 'ended', 'converted'
ADD COLUMN auto_billing_enabled BOOLEAN DEFAULT false,
ADD COLUMN has_used_trial BOOLEAN DEFAULT false, -- Track if user has ever used trial
ADD COLUMN trial_used_at TIMESTAMPTZ; -- When trial was first used

-- Create index for trial eligibility checks
CREATE INDEX idx_user_profiles_trial_usage ON indb_auth_user_profiles(has_used_trial, trial_used_at);
```

#### 1.2 Enhance Existing Subscription/Order Tables
**Use existing subscription/order tables** with enhanced metadata fields to track trial information:

```sql
-- Add trial tracking columns to existing subscription table (if not already present)
-- Note: Check current table structure first - you may already have metadata JSONB fields

-- If using existing indb_user_subscriptions table:
ALTER TABLE indb_user_subscriptions 
ADD COLUMN IF NOT EXISTS trial_metadata JSONB,
ADD COLUMN IF NOT EXISTS midtrans_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS saved_token_id TEXT; -- This comes from subscription.create response, NOT tokenization

-- Create index for trial lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_trial 
ON indb_user_subscriptions USING GIN (trial_metadata);

-- Example trial_metadata structure:
-- {
--   "is_trial": true,
--   "trial_start_date": "2025-08-27T10:00:00Z",
--   "trial_end_date": "2025-08-30T10:00:00Z",
--   "trial_duration_days": 3,
--   "auto_billing_start": "2025-08-30T10:00:01Z",
--   "trial_package_slug": "premium",
--   "original_amount_usd": 45.00,
--   "converted_amount_idr": 736649
-- }
```

---

### Phase 2: Midtrans Integration Updates

#### 2.1 Enhanced Checkout Flow for Trials
**Process**: Same checkout endpoint with `trial=true` parameter → Filter payment methods → Use $0 tokenization → Create scheduled subscription

```typescript
// Enhanced existing endpoint: /api/billing/checkout
interface CheckoutRequest {
  package_id: string; // existing premium or pro package ID
  is_trial?: boolean; // NEW: indicates trial flow
  card_token: string; // From Midtrans frontend tokenization
  customer_info: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
}

// Enhanced Flow:
1. Frontend: If URL has ?trial=true, show only Card Recurring payment method
2. Frontend: User completes card tokenization with Midtrans SDK → gets token_id
3. Backend: Check is_trial parameter in existing checkout endpoint
4. Backend: If trial=true:
   - Get user's original package pricing based on their currency (USD/IDR)
   - If user currency is USD: Convert to IDR using convertUsdToIdr() for Midtrans
   - Create FULL PRICE charge transaction using token_id with save_card: true
   - Charge response includes token_id (NOT saved_token_id)
   - Create Midtrans subscription with:
     * amount: 0 (no additional charges during trial period)
     * start_time: trial_end_date + 1 day
     * interval: 1 month
     * token: token_id (from charge response)
   - Extract saved_token_id from subscription.create response
5. Backend: Save to existing subscription table with trial_metadata and saved_token_id
6. Backend: Update user profile with trial status
```

#### 2.1 Currency Conversion & Multi-Currency Trial Logic

**Package Pricing Structure (Current Database):**
```javascript
// Premium Plan pricing_tiers JSON structure:
{
  "monthly": {
    "IDR": { "promo_price": 25000, "regular_price": 50000, "period_label": "Monthly" },
    "USD": { "promo_price": 15, "regular_price": 19, "period_label": "Monthly" }
  },
  "annual": {
    "IDR": { "promo_price": 120000, "regular_price": 600000, "period_label": "12 Months" },
    "USD": { "promo_price": 159, "regular_price": 199, "period_label": "12 Months" }
  }
}

// Pro Plan pricing_tiers JSON structure:
{
  "monthly": {
    "IDR": { "promo_price": 80000, "regular_price": 140000, "period_label": "Monthly" },
    "USD": { "promo_price": 45, "regular_price": 59, "period_label": "Monthly" }
  },
  "annual": {
    "IDR": { "promo_price": 790000, "regular_price": 1680000, "period_label": "12 Months" },
    "USD": { "promo_price": 499, "regular_price": 599, "period_label": "12 Months" }
  }
}
```

**Currency Detection Logic:**
```javascript
// lib/utils/currency-utils.ts
function getUserCurrency(country: string): 'IDR' | 'USD' {
  const indonesiaVariants = ['indonesia', 'id', 'idn', 'republic of indonesia']
  return indonesiaVariants.includes(country.toLowerCase()) ? 'IDR' : 'USD'
}
```

**Currency Conversion for Midtrans (USD → IDR Only):**
```javascript
// lib/utils/currency-converter.ts
async function convertUsdToIdr(usdAmount: number): Promise<number> {
  try {
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD')
    const data = await response.json()
    const idrRate = data.rates?.IDR || 15800 // Fallback rate
    return Math.round(usdAmount * idrRate)
  } catch (error) {
    return Math.round(usdAmount * 15800) // Fallback rate if API fails
  }
}
```

**Trial Pricing Examples:**

| User Country | Package | Billing Period | User's Currency | Display Price | Midtrans Charge (IDR) |
|-------------|---------|----------------|-----------------|---------------|---------------------|
| Indonesia | Premium | Monthly | IDR | IDR 25,000 | IDR 25,000 |
| United States | Premium | Monthly | USD | $15 | IDR ~237,000 (15 × 15,800) |
| Indonesia | Pro | Annual | IDR | IDR 790,000 | IDR 790,000 |
| United States | Pro | Annual | USD | $499 | IDR ~7,884,200 (499 × 15,800) |

#### 2.2 Midtrans Subscription Payload for Free Trial
```javascript
{
  "name": "PRO_TRIAL_AUTO_BILLING",
  "amount": "0", // ZERO amount for auto-billing subscription
  "currency": "IDR",
  "payment_type": "credit_card",
  "token": "48111111sHfSakAvHvFQFEjTivUV1114", // token_id from FULL PRICE charge response
  "schedule": {
    "interval": 1,
    "interval_unit": "month",
    "max_interval": null, // Indefinite until cancelled
    "start_time": "2025-08-30 17:45:00 +0700" // 3 days after trial starts
  },
  "retry_schedule": {
    "interval": 1,
    "interval_unit": "day",
    "max_interval": 3
  },
  "metadata": {
    "user_id": "915f50e5-0902-466a-b1af-bdf19d789722",
    "package_slug": "pro",
    "trial_type": "free_trial_auto_billing",
    "original_trial_start": "2025-08-27T17:45:00Z"
  },
  "customer_details": {
    "first_name": "John",
    "last_name": "Doe", 
    "email": "john@example.com",
    "phone": "+62812345678"
  }
}

// Note: saved_token_id will be returned from this subscription.create response
// and stored for future subscription management
```

---

### Phase 3: User Flow Changes

#### 3.1 Registration Flow Update
**Current**: User registers → Free package assigned automatically
**New**: User registers → No package assigned → Must choose Premium or Pro trial to continue

```typescript
// Updated user registration (no change to registration itself)
1. User completes sign-up form
2. Email verification (existing)
3. Redirect to pricing/dashboard page
4. User sees "Subscribe" and "Start Free Trial" buttons for Premium/Pro
5. "Start Free Trial" redirects to checkout with ?trial=true&package=premium
6. Card tokenization required before trial activation
```

#### 3.2 Enhanced Settings Page (Billing & Subscriptions Tab)
Modify existing settings page `/dashboard/settings` (Plans and Billing tab) to show dual options:
- **For each Premium/Pro plan**: Two buttons side by side
  - "Subscribe Now" (existing flow)
  - "Start 3-Day Free Trial" (new trial flow with ?trial=true)
- Show trial duration (3 days) clearly
- Explain auto-billing after trial
- "Start Free Trial" buttons redirect to: `/checkout?package=premium&trial=true`

#### 3.3 Enhanced Checkout Flow (Same Page, Different Logic)
Modify existing checkout page to handle trial parameter:

```typescript
// Checkout modifications based on URL parameter ?trial=true
const isTrialFlow = searchParams.get('trial') === 'true';

if (isTrialFlow) {
  // Show trial-specific UI
  - "Start 3-Day Trial" instead of "Subscribe Now"
  - Explain $0 charge now, auto-billing later
  - ONLY show Midtrans Card Recurring option
  - Hide all other payment methods (Bank Transfer, etc.)
  - Add clear messaging: "Credit card required for trial and auto-billing"
  - Different success flow after payment
}

// Payment method filtering for trials
const availablePaymentMethods = paymentGateways.filter(gateway => {
  if (isTrialFlow) {
    // Only allow Midtrans Card Recurring for trials (need tokenization)
    return gateway.slug === 'midtrans' && gateway.supports_recurring === true;
  }
  return gateway.is_active; // Normal flow for non-trial packages
});

// Payment processing for trials (same endpoint, different logic)
if (isTrialFlow) {
  1. Frontend: Tokenize card with Midtrans SDK → gets token_id
  2. Backend: Get package pricing from user's original currency (USD/IDR from pricing_tiers)
  3. Backend: If user currency is USD: Convert to IDR using convertUsdToIdr() for Midtrans
  4. Backend: Create FULL PRICE charge transaction using token_id with save_card: true  
  5. Backend: Charge response includes token_id (NOT saved_token_id)
  6. Backend: Create Midtrans subscription with ZERO amount using token_id with start_time = trial_end + 1 day
  7. Backend: Extract saved_token_id from subscription.create response
  8. Backend: Save to existing subscription table with trial_metadata and saved_token_id
  9. Backend: Activate trial immediately (user gets full access)
}
```

---

### Phase 4: Backend API Updates

#### 4.1 New API Endpoints

**4.1.1 Enhanced Existing Checkout Endpoint**
```typescript
// POST /api/billing/checkout (existing endpoint, enhanced for trials)
- **NEW: Check if is_trial parameter is true**
- **FIRST: Check trial eligibility** (has_used_trial = false) if trial
- Validate package selection (existing Premium/Pro packages)
- If trial: Validate credit card information (Card Recurring only)
- If trial: Create $0 tokenization transaction instead of full charge
- If trial: Setup Midtrans subscription with delayed start
- Save to existing subscription table with trial_metadata
- **If trial: Mark user as trial used** (has_used_trial = true, trial_used_at = now())
- Update user profile with trial status
```

**4.1.2 Trial Eligibility Check**
```typescript
// GET /api/user/trial-eligibility (new endpoint)
- Check if user has already used trial (has_used_trial field)
- Return eligibility status and reasoning
- Include existing Premium/Pro packages if eligible
- Include restriction message if not eligible

interface TrialEligibilityResponse {
  eligible: boolean;
  reason?: 'already_used' | 'existing_subscriber' | 'invalid_account';
  trial_used_at?: string;
  available_packages?: Package[]; // Existing Premium/Pro packages
  message: string;
}
```

**4.1.2 Trial Status Check**
```typescript
// GET /api/user/trial-status
- Return current trial status
- Days remaining in trial
- Next billing date
- Auto-billing status
```

**4.1.3 Trial Cancellation**
```typescript
// POST /api/billing/cancel-trial
- Cancel Midtrans subscription
- Update trial status to 'cancelled'
- Revert user to no package
```

#### 4.2 Updated User Profile API
Modify `/api/user/profile` to include trial information:
```typescript
interface UserProfileWithTrial {
  // ... existing fields
  trial_status: 'none' | 'active' | 'ended' | 'converted';
  trial_ends_at?: string;
  auto_billing_enabled: boolean;
  next_billing_date?: string;
  trial_package?: PackageInfo;
}
```

---

### Phase 5: Scheduled Jobs & Monitoring

#### 5.1 Trial Status Monitor Job
Create new scheduled job to monitor trial status:

```typescript
// New job: TrialStatusMonitor
// Runs every hour to check trial statuses
1. Find trials ending in next 24 hours
2. Send trial ending notification emails
3. Find trials that have ended
4. Update user status if needed
5. Handle failed auto-billing scenarios
```

#### 5.2 Trial Notification System
Email notifications for trial lifecycle:
- **Trial Started**: Welcome email with trial details
- **Trial Ending Soon**: 1 day before trial ends
- **Trial Ended**: Confirmation that billing has started
- **Billing Failed**: Payment failed, retry notification
- **Subscription Cancelled**: Trial cancelled confirmation

#### 5.3 Webhook Updates
Update Midtrans webhook handler to process trial subscription events:
```typescript
// Enhanced webhook: /api/billing/midtrans/webhook
- Handle subscription_payment_success for trials
- Handle subscription_payment_failed for trials  
- Update trial subscription status
- Send appropriate notifications
- Handle trial-to-paid conversion
```

---

### Phase 6: Frontend UI Updates

#### 6.1 Dashboard Updates
- Show trial status in sidebar
- Trial countdown timer in header
- Upgrade prompts for active trials
- Auto-billing management in settings

#### 6.2 Pricing Page Updates
Replace "Free" with "Premium Trial" and "Pro Trial":
- Show "Start 3-Day Trial" buttons
- Explain auto-billing clearly
- **Clearly state**: "Credit card required - no other payment methods accepted for trials"
- Add prominent notice: "Only card payments accepted for trial subscriptions"
- Add trial terms and conditions
- FAQ section about trial billing and payment method requirements

#### 6.3 Settings Page Updates
Add trial management section:
- Current trial status
- Next billing date and amount  
- Cancel trial option
- Payment method management
- Billing history

---

### Phase 7: User Experience Flow

#### 7.1 New User Journey
```
1. User registers → Email verification
2. Redirect to /dashboard/select-trial
3. **STEP: Check trial eligibility** (call /api/user/trial-eligibility)
   - If eligible: Show Premium Trial and Pro Trial options
   - If NOT eligible: Show message "You have already used your free trial" and redirect to normal pricing
4. Choose Premium Trial or Pro Trial (only if eligible)
5. Redirect to checkout with trial=true
6. **STEP: Double-check eligibility** before showing payment form
7. Enter credit card details (only Midtrans Card Recurring shown)
8. Midtrans tokenizes card ($0 charge)
9. **STEP: Final eligibility check** before creating subscription
10. System creates subscription with delayed start
11. **STEP: Mark user as trial used** (has_used_trial = true)
12. Trial activated immediately
13. User has 3 days full access
14. Day 3: Email reminder about upcoming billing
15. Day 4: Auto-billing via Midtrans subscription
16. If successful: User continues with full plan
17. If failed: Retry mechanism + notifications
```

#### 7.2 Trial Eligibility Validation Flow (Multiple Checkpoints)
```
Checkpoint 1: Registration redirect
- Check has_used_trial before showing trial selection page
- If true: Redirect to normal pricing page instead

Checkpoint 2: Trial selection page load  
- Call /api/user/trial-eligibility
- Hide trial options if not eligible
- Show clear message: "Free trial already used on [date]"

Checkpoint 3: Checkout page load
- Verify trial package selection is valid
- Double-check user eligibility
- Block payment form if not eligible

Checkpoint 4: Payment processing
- Final eligibility check before Midtrans tokenization
- Fail payment if has_used_trial = true
- Atomic transaction: mark trial used + create subscription

Checkpoint 5: Frontend protection
- Disable trial buttons via JavaScript if not eligible
- Show "Already used" status instead of "Start Trial"
```

#### 7.2 Trial Experience
- Full access to all plan features during trial
- Prominent trial status indicator
- Regular reminders about trial end date
- Easy cancellation option (cancels auto-billing)
- Seamless transition to paid if trial completes

---

### Phase 8: Business Logic & Validation

#### 8.1 Trial Eligibility Rules
- **One trial per user lifetime** - Each user can only get free trial once, ever
- Must provide valid credit card (mandatory)
- **Card Recurring payment method only** - no exceptions
- Credit card must pass tokenization successfully
- No trial for existing paying customers
- Block known fraud patterns
- Validate card supports recurring payments
- Track trial usage by user ID and email address to prevent multiple trials

#### 8.2 Trial Limitations
- Cannot downgrade during trial
- Cannot change payment method during trial
- Must cancel before trial ends to avoid billing
- Cannot extend trial duration

#### 8.3 Error Handling
- Card tokenization failures
- Subscription creation failures
- Currency conversion errors
- Webhook processing failures
- Auto-billing failures and retries

---

### Phase 9: Testing Strategy

#### 9.1 Midtrans Sandbox Testing
- Test card tokenization with $0 amount
- Test subscription creation with future start date
- Test webhook notifications for subscription events
- Test auto-billing after trial period
- Test failed payment scenarios
- **Verify only Card Recurring payment method is available for trials**
- Test payment method filtering logic in checkout

#### 9.2 User Flow Testing
- Complete trial signup flow
- Trial experience during 3-day period
- Trial cancellation before billing
- Auto-billing success scenarios
- Auto-billing failure scenarios
- Email notification delivery

#### 9.3 Edge Cases
- User deletes account during trial
- Credit card expires during trial
- Time zone handling for trial dates
- Concurrent trial attempts
- Invalid package selections

---

### Phase 10: Deployment & Rollout

#### 10.1 Database Migration
1. Run schema updates on staging
2. Migrate existing free users (manual decision)
3. Test trial functionality thoroughly
4. Deploy to production with feature flag
5. Gradually enable for new registrations

#### 10.2 Feature Flag Strategy
- `ENABLE_TRIAL_SYSTEM`: Global enable/disable
- `TRIAL_DURATION_DAYS`: Configurable trial length
- `TRIAL_PACKAGES_ENABLED`: Per-package trial enable
- `FORCE_TRIAL_FOR_NEW_USERS`: Registration requirement

#### 10.3 Monitoring & Analytics
- Trial conversion rates
- Payment failure rates
- Cancellation rates during trial
- User engagement during trial
- Revenue impact analysis

---

## Risk Assessment & Mitigation

### High-Risk Areas
1. **Payment Failures**: Robust retry mechanism + notifications
2. **Currency Conversion**: Cache rates, handle API failures
3. **Time Zone Issues**: Use UTC consistently, convert for display
4. **Webhook Reliability**: Implement idempotency + manual verification

### Mitigation Strategies
- Extensive testing with Midtrans sandbox
- Gradual rollout with feature flags
- Comprehensive error logging and alerts
- Manual override capabilities for support team
- Clear communication about trial terms

---

## Success Metrics

### Key Performance Indicators
- **Trial-to-Paid Conversion Rate**: Target >40%
- **Payment Success Rate**: Target >95%
- **Trial Cancellation Rate**: Monitor <30%
- **User Experience Satisfaction**: Post-trial surveys
- **Revenue Impact**: Monthly recurring revenue growth

### Technical Metrics
- API response times for trial flows
- Webhook processing success rate
- Database query performance
- Email delivery rates
- Error rates across all flows

---

## Summary: Why Parameter-Based Approach vs Separate Trial Packages

### Technical Justification for Parameter-Based Approach:

1. **Simplified Package Management**: 
   - Use existing Premium and Pro packages for both regular and trial flows
   - No need to create duplicate trial packages in database
   - Midtrans still gets exact billing amounts from existing package pricing

2. **Database Simplicity**:
   - Same subscription/order tables with enhanced metadata
   - Trial information stored in JSONB metadata fields
   - Easier reporting and analytics with unified data structure

3. **User Experience Benefits**:
   - Clear dual-button approach on pricing page ("Subscribe" vs "Start Free Trial")
   - Users see actual package they'll be paying for after trial
   - No confusion about different trial vs regular packages

4. **Frontend Logic Simplification**:
   - Single checkout page with conditional logic based on ?trial=true parameter
   - Payment method filtering based on URL parameter
   - Same success flows with different messaging

5. **Maintenance Efficiency**:
   - No duplicate package configurations to maintain
   - Single source of truth for package features and pricing
   - Easier A/B testing of trial flows

### One Trial Per User Lifetime Implementation:

- **Database tracking**: `has_used_trial` and `trial_used_at` fields
- **Multiple validation checkpoints** throughout user journey
- **Atomic transaction** to prevent race conditions
- **Frontend and backend validation** for comprehensive protection
- **Clear messaging** when trial already used

This approach ensures robust, scalable, and maintainable free trial functionality while meeting Midtrans requirements and providing excellent user experience.

---

This comprehensive plan provides the detailed step-by-step approach to implement the Free Trial system with Midtrans recurring payments, ensuring seamless user experience while maximizing conversion rates and minimizing technical risks.