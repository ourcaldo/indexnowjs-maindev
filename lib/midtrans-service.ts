/**
 * Midtrans API Service using Official midtrans-client package
 * Handles Midtrans Core API and Subscription API integration for recurring payments
 * Based on official Midtrans Node.js Client and Core API documentation
 */

import { convertUsdToIdr } from './currency-converter';
const midtransClient = require('midtrans-client');

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
  private coreApi: any;
  private subscriptionApi: any;

  constructor(config: MidtransConfig) {
    this.config = config;
    
    // Initialize official Midtrans Core API client
    this.coreApi = new midtransClient.CoreApi({
      isProduction: config.environment === 'production',
      serverKey: config.server_key,
      clientKey: config.client_key
    });

    // Initialize official Midtrans Subscription API client  
    this.subscriptionApi = new midtransClient.SubscriptionApi({
      isProduction: config.environment === 'production',
      serverKey: config.server_key,
      clientKey: config.client_key
    });
  }

  /**
   * Create credit card charge using official midtrans-client Core API
   * Uses official midtrans-client package for /v2/charge endpoint
   */
  async createChargeTransaction(
    orderData: {
      order_id: string;
      amount_usd: number;
      token_id: string; // Card token from frontend MidtransNew3ds.getCardToken
      customer_details: MidtransCustomerDetails;
      item_details: {
        name: string;
        description?: string;
      };
    }
  ): Promise<MidtransCoreChargeResponse> {
    // Convert USD to IDR
    const idrAmount = await convertUsdToIdr(orderData.amount_usd);

    const chargeRequest = {
      payment_type: 'credit_card',
      transaction_details: {
        order_id: orderData.order_id,
        gross_amount: Math.round(idrAmount), // Ensure integer amount
      },
      credit_card: {
        token_id: orderData.token_id, // Use token from frontend
        authentication: true, // Enable 3DS
        save_token_id: true, // Save card for subscription
      },
      customer_details: orderData.customer_details,
      item_details: [
        {
          id: 'subscription_setup',
          price: Math.round(idrAmount),
          quantity: 1,
          name: orderData.item_details.name,
        }
      ],
    };

    // Use official midtrans-client Core API
    return await this.coreApi.charge(chargeRequest);
  }

  /**
   * Get transaction status using official midtrans-client Core API
   * Uses official midtrans-client package for transaction status
   */
  async getTransactionStatus(
    transactionId: string
  ): Promise<{
    saved_token_id?: string;
    saved_token_id_expired_at?: string;
    masked_card?: string;
    transaction_status: string;
    order_id: string;
    transaction_id: string;
    [key: string]: any;
  }> {
    // Use official midtrans-client Core API
    return await this.coreApi.transaction.status(transactionId);
  }

  /**
   * Create a new subscription using official midtrans-client Subscription API
   * Uses official midtrans-client package for subscription creation
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

    const subscriptionRequest: CreateSubscriptionRequest = {
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

    // Use official midtrans-client Subscription API
    return await this.subscriptionApi.createSubscription(subscriptionRequest);
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
      token_id: string; // Card token from frontend MidtransNew3ds.getCardToken
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
    // Step 1: Create charge transaction using token_id from frontend
    const chargeTransaction = await this.createChargeTransaction({
      order_id: orderData.order_id,
      amount_usd: orderData.amount_usd,
      token_id: orderData.token_id, // Card token from frontend MidtransNew3ds.getCardToken
      customer_details: orderData.customer_details,
      item_details: {
        name: orderData.package_details.name,
        description: orderData.package_details.description,
      },
    });

    // Check if charge was successful
    if (chargeTransaction.transaction_status !== 'capture' && chargeTransaction.transaction_status !== 'settlement') {
      throw new Error(`Charge transaction failed: ${chargeTransaction.status_message}`);
    }

    // Step 2: Get transaction status to retrieve saved_token_id (as per Midtrans docs)
    let savedTokenId = chargeTransaction.saved_token_id;
    let maskedCard = chargeTransaction.masked_card;

    if (!savedTokenId) {
      // Get transaction status to retrieve saved_token_id
      const transactionStatus = await this.getTransactionStatus(chargeTransaction.transaction_id);
      savedTokenId = transactionStatus.saved_token_id;
      maskedCard = transactionStatus.masked_card;
    }

    if (!savedTokenId) {
      throw new Error('Card token was not saved from transaction. Please try again.');
    }

    // Step 3: Create subscription using the saved_token_id
    const subscription = await this.createSubscription(orderData.amount_usd, {
      name: `${orderData.package_details.name}_${orderData.billing_period}`.toUpperCase(),
      token: savedTokenId,
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
      initial_charge: {
        ...chargeTransaction,
        saved_token_id: savedTokenId,
        masked_card: maskedCard,
      },
      subscription: subscription,
    };
  }

  /**
   * Get subscription details using official midtrans-client
   */
  async getSubscription(subscriptionId: string): Promise<MidtransSubscription> {
    return await this.subscriptionApi.getSubscription(subscriptionId);
  }

  /**
   * Disable subscription using official midtrans-client
   */
  async disableSubscription(subscriptionId: string): Promise<{ status_message: string }> {
    return await this.subscriptionApi.disableSubscription(subscriptionId);
  }

  /**
   * Cancel subscription (stops pending retries) using official midtrans-client
   */
  async cancelSubscription(subscriptionId: string): Promise<{ status_message: string }> {
    return await this.subscriptionApi.cancelSubscription(subscriptionId);
  }

  /**
   * Enable subscription using official midtrans-client
   */
  async enableSubscription(subscriptionId: string): Promise<{ status_message: string }> {
    return await this.subscriptionApi.enableSubscription(subscriptionId);
  }

  /**
   * Update subscription using official midtrans-client
   */
  async updateSubscription(
    subscriptionId: string, 
    updates: Partial<CreateSubscriptionRequest>
  ): Promise<{ status_message: string }> {
    return await this.subscriptionApi.updateSubscription(subscriptionId, updates);
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

}

/**
 * Create Midtrans service instance from database configuration
 */
export function createMidtransService(credentials: any): MidtransService {
  // Handle both direct credentials and gateway config structure
  const config: MidtransConfig = {
    merchant_id: credentials.merchant_id || credentials.api_credentials?.merchant_id || '',
    client_key: credentials.client_key || credentials.api_credentials?.client_key || '',
    server_key: credentials.server_key || credentials.api_credentials?.server_key || '',
    environment: credentials.environment || credentials.configuration?.environment || 'sandbox',
  };

  return new MidtransService(config);
}