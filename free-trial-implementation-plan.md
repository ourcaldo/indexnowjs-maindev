# Free Trial Implementation Plan
**IndexNow Studio - Free Trial with Recurring Payment System**

## Overview
Transform the current Free Package system into a Free Trial model where users must provide credit card information to access trial periods. After the trial ends, automatic billing occurs through Midtrans recurring payments.

---

## Current System Analysis

### Current Package Structure
- **Free Package**: Automatically assigned on user registration, no payment required
- **Pro Package**: Highest tier with full feature access

### Current Flow
1. User registers → Automatically assigned to Free Package
2. User can upgrade to Pro through checkout page
3. Payment via Midtrans Snap or Bank Transfer

---

## New Free Trial System Requirements

### Core Concept
- Replace "Free Package" with "Free Trial" for Pro plan
- Require credit card tokenization before trial activation
- Use Midtrans scheduler to automatically charge after trial period
- No manual intervention needed - Midtrans handles the billing

### Trial Configuration
- **Trial Duration**: 3 days (configurable)
- **Available Plans**: Pro Trial only
- **Payment Method**: **Card Recurring ONLY** (required for tokenization and future auto-billing)
- **Restriction**: Bank Transfer and other payment methods are disabled for trials
- **Initial Charge**: $0 (tokenization transaction)
- **Post-Trial Charge**: Full plan amount in IDR

---

## Detailed Implementation Plan

### Phase 1: Database Schema Updates

#### 1.1 Update `indb_payment_packages` Table
```sql
-- Add trial-related columns to packages
ALTER TABLE indb_payment_packages 
ADD COLUMN is_trial BOOLEAN DEFAULT false,
ADD COLUMN trial_duration_days INTEGER DEFAULT 0,
ADD COLUMN trial_description TEXT;

-- Update existing packages to support trial
UPDATE indb_payment_packages 
SET is_trial = false, trial_duration_days = 0 
WHERE slug IN ('free', 'pro');

-- Create new trial package
INSERT INTO indb_payment_packages (
  name, slug, description, price, currency, billing_period,
  is_trial, trial_duration_days, trial_description,
  features, quota_limits, is_active, sort_order
) VALUES 
(
  'Pro Trial', 'pro-trial', 'Try Pro features for 3 days, then $45/month',
  45.00, 'USD', 'monthly',
  true, 3, '3-day free trial, then automatically billed monthly',
  '["All Pro features", "3-day trial period", "Auto-billing after trial"]',
  '{"daily_urls": -1, "service_accounts": -1, "concurrent_jobs": -1, "keywords_limit": -1}',
  true, 2
);
```

#### 1.2 Update `indb_auth_user_profiles` Table
```sql
-- Add trial tracking columns
ALTER TABLE indb_auth_user_profiles 
ADD COLUMN trial_started_at TIMESTAMPTZ,
ADD COLUMN trial_ends_at TIMESTAMPTZ,
ADD COLUMN trial_status VARCHAR(20) DEFAULT 'none', -- 'none', 'active', 'ended', 'converted'
ADD COLUMN auto_billing_enabled BOOLEAN DEFAULT false;
```

#### 1.3 Create Free Trial Subscriptions Table
```sql
CREATE TABLE indb_free_trial_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES indb_payment_packages(id),
  midtrans_subscription_id TEXT UNIQUE,
  saved_token_id TEXT NOT NULL,
  saved_token_expiry TIMESTAMPTZ,
  trial_start_date TIMESTAMPTZ NOT NULL,
  trial_end_date TIMESTAMPTZ NOT NULL,
  billing_start_date TIMESTAMPTZ NOT NULL, -- When actual billing begins
  amount_usd DECIMAL(10,2) NOT NULL,
  amount_idr BIGINT NOT NULL, -- Converted amount for Midtrans
  status VARCHAR(20) DEFAULT 'trial_active', -- 'trial_active', 'billing_active', 'cancelled', 'failed'
  customer_details JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes
CREATE INDEX idx_trial_subscriptions_user ON indb_free_trial_subscriptions(user_id);
CREATE INDEX idx_trial_subscriptions_status ON indb_free_trial_subscriptions(status);
CREATE INDEX idx_trial_subscriptions_billing_start ON indb_free_trial_subscriptions(billing_start_date);
```

---

### Phase 2: Midtrans Integration Updates

#### 2.1 Free Trial Tokenization Flow
**Process**: User provides credit card via Midtrans Card Recurring → Tokenize with $0 charge → Store token → Create scheduled subscription
**Restriction**: Only Midtrans Card Recurring gateway allowed for trials

```typescript
// New endpoint: /api/billing/free-trial
interface FreeTrialRequest {
  package_id: string; // pro-trial
  card_token: string; // From Midtrans frontend tokenization
  customer_info: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
}

// Flow:
1. Frontend tokenizes card using Midtrans SDK
2. Backend creates $0 tokenization transaction
3. Extract saved_token_id from response
4. Create Midtrans subscription with:
   - amount: Full plan price in IDR
   - start_time: trial_end_date + 1 day
   - interval: 1 month
   - token: saved_token_id
5. Save trial subscription record
6. Update user profile with trial status
```

#### 2.2 Midtrans Subscription Payload for Free Trial
```javascript
{
  "name": "PRO_TRIAL_AUTO_BILLING",
  "amount": "736649", // 45 USD converted to IDR
  "currency": "IDR",
  "payment_type": "credit_card",
  "token": "48111111sHfSakAvHvFQFEjTivUV1114", // saved_token_id from tokenization
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
    "package_slug": "pro-trial",
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
```

---

### Phase 3: User Flow Changes

#### 3.1 Registration Flow Update
**Current**: User registers → Free package assigned automatically
**New**: User registers → No package assigned → Must choose Pro trial to continue

```typescript
// Updated user registration
1. User completes sign-up form
2. Email verification (existing)
3. Redirect to trial selection page (/dashboard/select-trial)
4. User must choose Pro Trial
5. Redirect to checkout with trial parameter
6. Card tokenization required before trial activation
```

#### 3.2 Trial Selection Page
New page: `/dashboard/select-trial`
- Display Pro Trial option
- Show trial duration (3 days)
- Explain auto-billing after trial
- "Start Trial" button redirects to checkout

#### 3.3 Updated Checkout Flow
Modify existing checkout page to handle trial subscriptions:

```typescript
// Checkout modifications for trials
if (package.is_trial) {
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
  if (selectedPackage.is_trial) {
    // Only allow Midtrans for trials (need card tokenization)
    return gateway.slug === 'midtrans' && gateway.supports_recurring === true;
  }
  return gateway.is_active; // Normal flow for non-trial packages
});

// Payment processing for trials
1. Tokenize card with Midtrans SDK
2. Create $0 authorization transaction
3. Extract saved_token_id
4. Create Midtrans subscription with start_time = trial_end + 1 day
5. Save trial subscription record
6. Activate trial immediately
```

---

### Phase 4: Backend API Updates

#### 4.1 New API Endpoints

**4.1.1 Free Trial Initiation**
```typescript
// POST /api/billing/free-trial
- Validate trial package selection
- Create $0 tokenization transaction
- Setup Midtrans subscription with delayed start
- Save trial subscription record
- Update user profile with trial status
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
Replace "Free" with "Pro Trial":
- Show "Start 3-Day Trial" button
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
3. Choose Pro Trial
4. Redirect to checkout with trial=true
5. Enter credit card details
6. Midtrans tokenizes card ($0 charge)
7. System creates subscription with delayed start
8. Trial activated immediately
9. User has 3 days full access
10. Day 3: Email reminder about upcoming billing
11. Day 4: Auto-billing via Midtrans subscription
12. If successful: User continues with full plan
13. If failed: Retry mechanism + notifications
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
- One trial per user per email address
- Must provide valid credit card (mandatory)
- **Card Recurring payment method only** - no exceptions
- Credit card must pass tokenization successfully
- No trial for existing paying customers
- Block known fraud patterns
- Validate card supports recurring payments

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

This comprehensive plan provides the detailed step-by-step approach to implement the Free Trial system with Midtrans recurring payments, ensuring seamless user experience while maximizing conversion rates and minimizing technical risks.