/**
 * Midtrans API Service
 * Handles Midtrans Core API and Subscription API integration for recurring payments
 * Based on Midtrans Core API and Subscription API documentation
 */

import { convertUsdToIdr } from './currency-converter';

interface MidtransConfig {
  merchant_id: string;
  client_key: string;
  server_key: string;
  environment: 'sandbox' | 'production';
}

interface MidtransCustomerDetails {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

interface MidtransSubscriptionSchedule {
  interval: number;
  interval_unit: 'day' | 'week' | 'month';
  max_interval?: number;
  start_time: string; // ISO format: "2020-07-22 07:25:01 +0700"
}

interface MidtransRetrySchedule {
  interval: number;
  interval_unit: 'day' | 'hour';
  max_interval: number;
}

interface CreateSubscriptionRequest {
  name: string;
  amount: string; // IDR amount as string
  currency: 'IDR';
  payment_type: 'credit_card';
  token: string; // saved_token_id from previous transaction
  schedule: MidtransSubscriptionSchedule;
  retry_schedule?: MidtransRetrySchedule;
  metadata?: Record<string, any>;
  customer_details: MidtransCustomerDetails;
}

interface MidtransSubscription {
  id: string;
  name: string;
  amount: string;
  currency: string;
  created_at: string;
  schedule: MidtransSubscriptionSchedule & {
    current_interval?: number;
    previous_execution_at?: string;
    next_execution_at?: string;
  };
  retry_schedule?: MidtransRetrySchedule;
  status: 'active' | 'inactive';
  token: string;
  payment_type: string;
  transaction_ids?: string[];
  metadata?: Record<string, any>;
  customer_details: MidtransCustomerDetails;
}

// Core API interfaces for initial transaction to get card token
interface MidtransCoreChargeRequest {
  payment_type: 'credit_card';
  transaction_details: {
    order_id: string;
    gross_amount: number;
  };
  credit_card: {
    token_id?: string; // For existing saved token
    card_number?: string;
    card_exp_month?: string;
    card_exp_year?: string;
    card_cvv?: string;
    save_card?: boolean;
  };
  customer_details: MidtransCustomerDetails;
  item_details?: Array<{
    id: string;
    price: number;
    quantity: number;
    name: string;
  }>;
}

interface MidtransCoreChargeResponse {
  status_code: string;
  status_message: string;
  transaction_id: string;
  order_id: string;
  merchant_id: string;
  gross_amount: string;
  currency: string;
  payment_type: string;
  transaction_time: string;
  transaction_status: string;
  fraud_status: string;
  approval_code?: string;
  signature_key: string;
  saved_token_id?: string; // This is what we need for subscription
  saved_token_id_expired_at?: string;
  masked_card?: string;
  bank?: string;
}

export class MidtransService {
  private config: MidtransConfig;
  private baseUrl: string;

  constructor(config: MidtransConfig) {
    this.config = config;
    this.baseUrl = config.environment === 'production' 
      ? 'https://api.midtrans.com' 
      : 'https://api.sandbox.midtrans.com';
  }

  /**
   * Generate Basic Auth header for Midtrans API
   * Format: Basic base64(server_key:)
   */
  private getAuthHeader(): string {
    const credentials = `${this.config.server_key}:`;
    const encoded = Buffer.from(credentials).toString('base64');
    return `Basic ${encoded}`;
  }

  /**
   * Make API request to Midtrans
   */
  private async makeRequest<T>(
    endpoint: string, 
    method: 'GET' | 'POST' | 'PATCH' = 'GET',
    body?: any
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const options: RequestInit = {
      method,
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };

    if (body && (method === 'POST' || method === 'PATCH')) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Midtrans API Error: ${response.status} - ${JSON.stringify(error)}`);
    }

    return response.json();
  }

  /**
   * Create initial credit card charge to get saved token for subscription
   * This is the first step before creating a subscription
   */
  async createInitialCharge(
    orderData: {
      order_id: string;
      amount_usd: number;
      card_data: {
        card_number: string;
        expiry_month: string;
        expiry_year: string;
        cvv: string;
      };
      customer_details: MidtransCustomerDetails;
      item_details: {
        name: string;
        description?: string;
      };
    }
  ): Promise<MidtransCoreChargeResponse> {
    // Convert USD to IDR
    const idrAmount = await convertUsdToIdr(orderData.amount_usd);

    const request: MidtransCoreChargeRequest = {
      payment_type: 'credit_card',
      transaction_details: {
        order_id: orderData.order_id,
        gross_amount: Math.round(idrAmount), // Ensure integer amount
      },
      credit_card: {
        card_number: orderData.card_data.card_number.replace(/\s/g, ''), // Remove spaces
        card_exp_month: orderData.card_data.expiry_month.padStart(2, '0'),
        card_exp_year: orderData.card_data.expiry_year,
        card_cvv: orderData.card_data.cvv,
        save_card: true, // Important: save card for subscription
      },
      customer_details: orderData.customer_details,
      item_details: [
        {
          id: 'subscription_payment',
          price: Math.round(idrAmount),
          quantity: 1,
          name: orderData.item_details.name,
        }
      ],
    };

    return this.makeRequest<MidtransCoreChargeResponse>('/v2/charge', 'POST', request);
  }

  /**
   * Create a new subscription using saved token from initial charge
   */
  async createSubscription(
    usdAmount: number,
    subscriptionData: {
      name: string;
      token: string; // saved_token_id from first transaction
      schedule: Omit<MidtransSubscriptionSchedule, 'start_time'> & {
        start_time?: Date;
      };
      customer_details: MidtransCustomerDetails;
      metadata?: Record<string, any>;
    }
  ): Promise<MidtransSubscription> {
    // Convert USD to IDR
    const idrAmount = await convertUsdToIdr(usdAmount);
    
    // Format start time
    const startTime = subscriptionData.schedule.start_time || new Date();
    const formattedStartTime = this.formatMidtransDateTime(startTime);

    const request: CreateSubscriptionRequest = {
      name: subscriptionData.name,
      amount: Math.round(idrAmount).toString(), // Ensure integer as string
      currency: 'IDR',
      payment_type: 'credit_card',
      token: subscriptionData.token,
      schedule: {
        ...subscriptionData.schedule,
        start_time: formattedStartTime,
      },
      retry_schedule: {
        interval: 1,
        interval_unit: 'day',
        max_interval: 3,
      },
      metadata: subscriptionData.metadata,
      customer_details: subscriptionData.customer_details,
    };

    return this.makeRequest<MidtransSubscription>('/v1/subscriptions', 'POST', request);
  }

  /**
   * Complete payment flow: Initial charge + Subscription creation
   * This method handles the full recurring payment setup
   */
  async createRecurringPayment(
    orderData: {
      order_id: string;
      amount_usd: number;
      billing_period: 'monthly' | 'yearly';
      card_data: {
        card_number: string;
        expiry_month: string;
        expiry_year: string;
        cvv: string;
      };
      customer_details: MidtransCustomerDetails;
      package_details: {
        name: string;
        description?: string;
      };
      metadata?: Record<string, any>;
    }
  ): Promise<{
    initial_charge: MidtransCoreChargeResponse;
    subscription: MidtransSubscription;
  }> {
    // Step 1: Create initial charge to get saved token
    const initialCharge = await this.createInitialCharge({
      order_id: orderData.order_id,
      amount_usd: orderData.amount_usd,
      card_data: orderData.card_data,
      customer_details: orderData.customer_details,
      item_details: {
        name: orderData.package_details.name,
        description: orderData.package_details.description,
      },
    });

    // Check if initial charge was successful and token was saved
    if (initialCharge.transaction_status !== 'capture' && initialCharge.transaction_status !== 'settlement') {
      throw new Error(`Initial charge failed: ${initialCharge.status_message}`);
    }

    if (!initialCharge.saved_token_id) {
      throw new Error('Card token was not saved from initial transaction');
    }

    // Step 2: Create subscription using the saved token
    const subscription = await this.createSubscription(orderData.amount_usd, {
      name: `${orderData.package_details.name}_${orderData.billing_period}`.toUpperCase(),
      token: initialCharge.saved_token_id,
      schedule: {
        interval: 1,
        interval_unit: orderData.billing_period === 'monthly' ? 'month' : 'month',
        max_interval: orderData.billing_period === 'monthly' ? 12 : 1, // Monthly: 12 months, Yearly: 1 year
        start_time: new Date(Date.now() + (orderData.billing_period === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000), // Next billing cycle
      },
      customer_details: orderData.customer_details,
      metadata: orderData.metadata,
    });

    return {
      initial_charge: initialCharge,
      subscription: subscription,
    };
  }

  /**
   * Get subscription details
   */
  async getSubscription(subscriptionId: string): Promise<MidtransSubscription> {
    return this.makeRequest<MidtransSubscription>(`/v1/subscriptions/${subscriptionId}`);
  }

  /**
   * Disable subscription
   */
  async disableSubscription(subscriptionId: string): Promise<{ status_message: string }> {
    return this.makeRequest(`/v1/subscriptions/${subscriptionId}/disable`, 'POST');
  }

  /**
   * Cancel subscription (stops pending retries)
   */
  async cancelSubscription(subscriptionId: string): Promise<{ status_message: string }> {
    return this.makeRequest(`/v1/subscriptions/${subscriptionId}/cancel`, 'POST');
  }

  /**
   * Enable subscription
   */
  async enableSubscription(subscriptionId: string): Promise<{ status_message: string }> {
    return this.makeRequest(`/v1/subscriptions/${subscriptionId}/enable`, 'POST');
  }

  /**
   * Update subscription
   */
  async updateSubscription(
    subscriptionId: string, 
    updates: Partial<CreateSubscriptionRequest>
  ): Promise<{ status_message: string }> {
    return this.makeRequest(`/v1/subscriptions/${subscriptionId}`, 'PATCH', updates);
  }

  /**
   * Format date for Midtrans API
   * Format: "2020-07-22 07:25:01 +0700"
   */
  private formatMidtransDateTime(date: Date): string {
    // Indonesia timezone is UTC+7
    const offset = '+0700';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} ${offset}`;
  }

  /**
   * Get transaction status from Midtrans
   */
  async getTransactionStatus(transactionId: string): Promise<any> {
    return this.makeRequest(`/v2/${transactionId}/status`);
  }
}

/**
 * Create Midtrans service instance from database configuration
 */
export function createMidtransService(gatewayConfig: any): MidtransService {
  const config: MidtransConfig = {
    merchant_id: gatewayConfig.api_credentials?.merchant_id || '',
    client_key: gatewayConfig.api_credentials?.client_key || '',
    server_key: gatewayConfig.api_credentials?.server_key || '',
    environment: gatewayConfig.configuration?.environment || 'sandbox',
  };

  return new MidtransService(config);
}