// Midtrans Recurring Payment Service for Supabase Integration
export function midtransAuthHeader(): string {
  const key = process.env.MIDTRANS_SERVER_KEY!;
  const base = Buffer.from(`${key}:`).toString("base64");
  return `Basic ${base}`;
}

export async function midtransFetch(endpoint: string, options: RequestInit = {}) {
  const base = process.env.MIDTRANS_BASE_URL || 'https://api.sandbox.midtrans.com';
  const url = `${base}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    Authorization: midtransAuthHeader(),
    ...options.headers,
  };
  
  console.log(`[MIDTRANS] ${options.method || 'GET'} ${url}`);
  
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const errorText = await res.text();
    console.error(`[MIDTRANS ERROR] ${res.status}: ${errorText}`);
    throw new Error(`Midtrans API Error: ${res.status} - ${errorText}`);
  }
  
  const result = await res.json();
  console.log(`[MIDTRANS SUCCESS] Response:`, JSON.stringify(result, null, 2));
  return result;
}

// Step 1: Create initial charge with tokenization
export async function createChargeWithToken(tokenId: string, orderDetails: any) {
  const payload = {
    payment_type: "credit_card",
    transaction_details: orderDetails,
    credit_card: {
      token_id: tokenId,
      save_token_id: true // This is KEY for recurring
    }
  };
  
  console.log(`[MIDTRANS] Creating charge with token: ${tokenId.substring(0, 10)}...`);
  return midtransFetch('/v2/charge', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

// Step 2: Check transaction status to get saved_token_id
export async function getTransactionStatus(orderId: string) {
  console.log(`[MIDTRANS] Getting transaction status for: ${orderId}`);
  return midtransFetch(`/v2/${encodeURIComponent(orderId)}/status`, { method: "GET" });
}

// Step 3: Create subscription using saved_token_id
export async function createSubscription(payload: any) {
  console.log(`[MIDTRANS] Creating subscription:`, JSON.stringify(payload, null, 2));
  return midtransFetch(`/v1/subscriptions`, {
    method: "POST",
    body: JSON.stringify({ currency: "IDR", payment_type: "credit_card", ...payload }),
  });
}

export async function getSubscription(id: string) {
  console.log(`[MIDTRANS] Getting subscription: ${id}`);
  return midtransFetch(`/v1/subscriptions/${id}`, { method: "GET" });
}

export async function enableSubscription(id: string) {
  console.log(`[MIDTRANS] Enabling subscription: ${id}`);
  return midtransFetch(`/v1/subscriptions/${id}/enable`, { method: "POST" });
}

export async function disableSubscription(id: string) {
  console.log(`[MIDTRANS] Disabling subscription: ${id}`);
  return midtransFetch(`/v1/subscriptions/${id}/disable`, { method: "POST" });
}

export async function updateSubscription(id: string, patch: any) {
  console.log(`[MIDTRANS] Updating subscription: ${id}`, JSON.stringify(patch, null, 2));
  return midtransFetch(`/v1/subscriptions/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}