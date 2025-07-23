import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Get all service accounts with their quota usage for today
    const today = new Date().toISOString().split('T')[0];
    
    const { data: serviceAccounts, error: saError } = await supabaseAdmin
      .from('indb_google_service_accounts')
      .select(`
        id,
        name,
        email,
        daily_quota_limit,
        indb_google_quota_usage!service_account_id (
          requests_made,
          requests_successful,
          requests_failed,
          date,
          last_request_at
        )
      `)
      .eq('is_active', true)
      .eq('indb_google_quota_usage.date', today);

    if (saError) {
      return NextResponse.json({ error: saError.message }, { status: 500 });
    }

    // Format the data to show current quota usage
    const quotaData = serviceAccounts?.map(sa => {
      const usage = sa.indb_google_quota_usage?.[0];
      const dailyLimit = sa.daily_quota_limit || 200;
      const used = usage?.requests_made || 0;
      const remaining = Math.max(0, dailyLimit - used);
      
      return {
        service_account_id: sa.id,
        name: sa.name,
        email: sa.email,
        daily_limit: dailyLimit,
        requests_made: used,
        requests_successful: usage?.requests_successful || 0,
        requests_failed: usage?.requests_failed || 0,
        remaining_quota: remaining,
        quota_percentage_used: Math.round((used / dailyLimit) * 100),
        last_request: usage?.last_request_at || 'Never'
      };
    }) || [];

    return NextResponse.json({
      date: today,
      service_accounts: quotaData,
      total_requests_today: quotaData.reduce((sum, sa) => sum + sa.requests_made, 0),
      total_successful_today: quotaData.reduce((sum, sa) => sum + sa.requests_successful, 0),
      total_failed_today: quotaData.reduce((sum, sa) => sum + sa.requests_failed, 0)
    });

  } catch (error) {
    console.error('Error fetching quota tracking data:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch quota tracking data' 
    }, { status: 500 });
  }
}