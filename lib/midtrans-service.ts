/**
 * Midtrans API Service
 * Handles Midtrans subscription API integration for recurring payments
 * Based on Midtrans Subscription API documentation
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
   * Create a new subscription
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
      amount: idrAmount.toString(),
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