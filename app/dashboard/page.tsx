'use client'

import { PlusIcon, BellIcon, TrendingUpIcon, CalendarIcon, CheckCircleIcon, Database } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useSocketIO } from '@/hooks/useSocketIO'
import { authService } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import QuotaCard from '@/components/QuotaCard'
import { usePageViewLogger, useActivityLogger } from '@/hooks/useActivityLogger'

interface DashboardStats {
  totalUrlsIndexed: number;
  activeJobs: number;
  scheduledJobs: number;
  successRate: number;
  quotaUsed: number;
  quotaLimit: number;
}

interface RecentJob {
  id: string;
  name: string;
  created_at: string;
  schedule_type: string;
  total_urls: number;
  successful_urls: number;
  failed_urls: number;
  status: string;
  progress_percentage: number;
  processed_urls: number;
}

interface UserProfile {
  full_name: string | null;
  email: string;
  package?: {
    name: string;
    slug: string;
    description: string;
    price: number;
    currency: string;
    billing_period: string;
    quota_limits: {
      daily_urls: number;
      service_accounts: number;
      concurrent_jobs: number;
    };
  };
  daily_quota_used?: number;
  expires_at?: string;
  service_account_count?: number;
  active_jobs_count?: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUrlsIndexed: 0,
    activeJobs: 0,
    scheduledJobs: 0,
    successRate: 0,
    quotaUsed: 0,
    quotaLimit: 200
  });
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Log page view and dashboard activities
  usePageViewLogger('/dashboard', 'Dashboard', { section: 'main_dashboard' })
  const { logDashboardActivity } = useActivityLogger()

  // Socket.io for real-time updates
  const { isConnected } = useSocketIO({
    onJobUpdate: (message) => {
      // Update job status in real-time
      setRecentJobs(prevJobs => 
        prevJobs.map(job => {
          if (job.id === message.jobId) {
            return {
              ...job,
              status: message.status || job.status,
              progress_percentage: message.progress?.progress_percentage ?? job.progress_percentage,
              processed_urls: message.progress?.processed_urls ?? job.processed_urls,
              successful_urls: message.progress?.successful_urls ?? job.successful_urls,
              failed_urls: message.progress?.failed_urls ?? job.failed_urls
            };
          }
          return job;
        })
      );
      
      // Update stats based on job updates
      loadDashboardStats();
    }
  });

  // Listen for real-time dashboard stats updates
  useEffect(() => {
    const handleDashboardStatsUpdate = (event: any) => {
      const { detail: newStats } = event;
      setStats(prevStats => ({ ...prevStats, ...newStats }));
    };

    window.addEventListener('dashboard-stats-update', handleDashboardStatsUpdate);
    return () => {
      window.removeEventListener('dashboard-stats-update', handleDashboardStatsUpdate);
    };
  }, []);

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadDashboardStats(),
        loadRecentJobs(),
        loadUserProfile()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserProfile = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (!user) return;

      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;

      const response = await fetch('/api/user/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setUserProfile(data.profile);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadDashboardStats = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (!user) return;

      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;

      // Load both dashboard stats and real quota data
      const [statsResponse, quotaResponse] = await Promise.all([
        fetch('/api/dashboard/stats', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/user/quota', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (statsResponse.ok && quotaResponse.ok) {
        const statsData = await statsResponse.json();
        const quotaData = await quotaResponse.json();
        
        // Merge stats with real quota data
        setStats({
          ...statsData,
          quotaUsed: quotaData.quota.daily_quota_used || 0,
          quotaLimit: quotaData.quota.is_unlimited ? 999999 : (quotaData.quota.daily_quota_limit || 200)
        });

        // Log dashboard stats view activity
        logDashboardActivity('dashboard_stats_view', 'Loaded dashboard statistics', {
          stats: statsData,
          quota: quotaData.quota
        });
      } else if (statsResponse.ok) {
        // Fallback to just stats if quota fails
        const data = await statsResponse.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    }
  };

  const loadRecentJobs = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (!user) return;

      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;

      const response = await fetch('/api/jobs?limit=5&page=1', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setRecentJobs(data.jobs || []);
      }
    } catch (error) {
      console.error('Error loading recent jobs:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'completed':
        return { backgroundColor: '#4BB543', color: '#FFFFFF' };
      case 'running':
        return { backgroundColor: '#3D8BFF', color: '#FFFFFF' };
      case 'failed':
        return { backgroundColor: '#E63946', color: '#FFFFFF' };
      case 'paused':
        return { backgroundColor: '#F0A202', color: '#FFFFFF' };
      default:
        return { backgroundColor: '#6C757D', color: '#FFFFFF' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{color: '#1A1A1A'}}>Dashboard</h1>
          <p className="mt-1 max-w-xs" style={{color: '#6C757D'}}>Monitor your indexing performance and manage your requests</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            className="text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all duration-200 hover:opacity-90" 
            style={{backgroundColor: '#1C2331'}}
          >
            <PlusIcon className="w-4 h-4" />
            New Request
          </button>
          {/* Notification icon - hidden on mobile, moved to mobile header */}
          <button className="hidden lg:block p-2 rounded-lg transition-colors" style={{backgroundColor: '#F7F9FC', color: '#6C757D'}} onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#E0E6ED'} onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#F7F9FC'}>
            <BellIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* User Greeting & Package Information */}
      {userProfile && (
        <div className="bg-white rounded-lg border border-[#E0E6ED] p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-[#3D8BFF]/10 rounded-full flex items-center justify-center">
                  <span className="text-lg font-bold text-[#3D8BFF]">
                    {userProfile.full_name?.charAt(0) || userProfile.email?.charAt(0) || 'U'}
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#1A1A1A]">
                    Welcome back, {userProfile.full_name || 'User'}!
                  </h2>
                  <p className="text-[#6C757D]">
                    {new Date().getHours() < 12 ? 'Good morning' : 
                     new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'}! 
                    Ready to boost your SEO today?
                  </p>
                </div>
              </div>
            </div>
            
            {userProfile.package && (
              <div className="text-right">
                <div className={`inline-flex px-3 py-1 text-sm font-medium rounded-full border ${
                  userProfile.package.slug === 'free' ? 'bg-[#6C757D]/10 text-[#6C757D] border-[#6C757D]/20' :
                  userProfile.package.slug === 'premium' ? 'bg-[#3D8BFF]/10 text-[#3D8BFF] border-[#3D8BFF]/20' :
                  userProfile.package.slug === 'pro' ? 'bg-[#F0A202]/10 text-[#F0A202] border-[#F0A202]/20' :
                  'bg-[#6C757D]/10 text-[#6C757D] border-[#6C757D]/20'
                }`}>
                  {userProfile.package.name}
                </div>
                <p className="text-xs text-[#6C757D] mt-1">
                  {userProfile.package.price === 0 ? 'Free Plan' : 
                   `${userProfile.package.currency} ${userProfile.package.price.toLocaleString()}/${userProfile.package.billing_period}`}
                </p>
              </div>
            )}
          </div>

          {/* Real-time Package Quota Overview */}
          {userProfile && <QuotaCard userProfile={userProfile} />}

          {/* Subscription Status */}
          {userProfile.package && userProfile.expires_at && userProfile.package.slug !== 'free' && (
            <div className="mt-4 pt-4 border-t border-[#E0E6ED]">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    new Date(userProfile.expires_at) > new Date() ? 'bg-[#4BB543]' : 'bg-[#E63946]'
                  }`}></div>
                  <span className="text-sm text-[#6C757D]">
                    Subscription {new Date(userProfile.expires_at) > new Date() ? 'active' : 'expired'} • 
                    Expires {new Date(userProfile.expires_at).toLocaleDateString()}
                  </span>
                </div>
                {new Date(userProfile.expires_at) <= new Date() && (
                  <button className="px-3 py-1 bg-[#3D8BFF] text-white rounded-lg text-sm hover:bg-[#3D8BFF]/90 transition-colors">
                    Renew Now
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 rounded-lg" style={{backgroundColor: '#FFFFFF', border: '1px solid #E0E6ED'}}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{color: '#6C757D'}}>Total URLs Indexed</p>
              <p className="text-3xl font-bold mt-2" style={{color: '#1A1A1A'}}>
                {loading ? '...' : stats.totalUrlsIndexed.toLocaleString()}
              </p>
              <p className="text-sm font-semibold mt-1" style={{color: stats.totalUrlsIndexed > 0 ? '#4BB543' : '#6C757D'}}>
                {stats.totalUrlsIndexed > 0 ? 'Successfully indexed' : 'No URLs indexed yet'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{backgroundColor: '#1C2331'}}>
              <TrendingUpIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="p-6 rounded-lg" style={{backgroundColor: '#FFFFFF', border: '1px solid #E0E6ED'}}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{color: '#6C757D'}}>Active Jobs</p>
              <p className="text-3xl font-bold mt-2" style={{color: '#1A1A1A'}}>
                {loading ? '...' : stats.activeJobs}
              </p>
              <p className="text-sm font-semibold mt-1" style={{color: stats.scheduledJobs > 0 ? '#F0A202' : '#6C757D'}}>
                {stats.scheduledJobs} scheduled
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{backgroundColor: '#0d1b2a'}}>
              <CalendarIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="p-6 rounded-lg" style={{backgroundColor: '#FFFFFF', border: '1px solid #E0E6ED'}}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{color: '#6C757D'}}>Success Rate</p>
              <p className="text-3xl font-bold mt-2" style={{color: '#1A1A1A'}}>
                {loading ? '...' : `${stats.successRate.toFixed(1)}%`}
              </p>
              <p className="text-sm font-semibold mt-1" style={{color: stats.successRate >= 70 ? '#4BB543' : stats.successRate >= 50 ? '#F0A202' : '#E63946'}}>
                {stats.successRate >= 70 ? 'Excellent' : stats.successRate >= 50 ? 'Good' : 'Needs improvement'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{backgroundColor: '#22333b'}}>
              <CheckCircleIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="p-6 rounded-lg" style={{backgroundColor: '#FFFFFF', border: '1px solid #E0E6ED'}}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{color: '#6C757D'}}>API Quota Used</p>
              <p className="text-3xl font-bold mt-2" style={{color: '#1A1A1A'}}>
                {loading ? '...' : stats.quotaUsed}
              </p>
              <p className="text-sm font-semibold mt-1" style={{color: stats.quotaUsed >= stats.quotaLimit * 0.9 ? '#E63946' : stats.quotaUsed >= stats.quotaLimit * 0.7 ? '#F0A202' : '#4BB543'}}>
                of {stats.quotaLimit} daily limit
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{backgroundColor: '#1E1E1E'}}>
              <Database className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="p-6 rounded-lg" style={{backgroundColor: '#FFFFFF', border: '1px solid #E0E6ED'}}>
          <h2 className="text-lg font-semibold mb-4" style={{color: '#1A1A1A'}}>Quick Actions</h2>
          <div className="space-y-3">
            <div 
              className="flex items-center gap-4 p-4 rounded-lg cursor-pointer transition-all duration-200" 
              style={{backgroundColor: 'transparent', border: '1px solid #E0E6ED'}}
              onMouseEnter={(e) => (e.target as HTMLDivElement).style.backgroundColor = '#F7F9FC'}
              onMouseLeave={(e) => (e.target as HTMLDivElement).style.backgroundColor = 'transparent'}
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{backgroundColor: '#1C2331'}}>
                <PlusIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-medium" style={{color: '#1A1A1A'}}>Submit URLs for Indexing</h3>
                <p className="text-sm" style={{color: '#6C757D'}}>Manually add URLs or import from sitemap</p>
              </div>
            </div>
            
            <div 
              className="flex items-center gap-4 p-4 rounded-lg cursor-pointer transition-all duration-200" 
              style={{backgroundColor: 'transparent', border: '1px solid #E0E6ED'}}
              onMouseEnter={(e) => (e.target as HTMLDivElement).style.backgroundColor = '#F7F9FC'}
              onMouseLeave={(e) => (e.target as HTMLDivElement).style.backgroundColor = 'transparent'}
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{backgroundColor: '#0d1b2a'}}>
                <Database className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-medium" style={{color: '#1A1A1A'}}>Manage Service Accounts</h3>
                <p className="text-sm" style={{color: '#6C757D'}}>Add or update Google service accounts</p>
              </div>
            </div>
            
            <div 
              className="flex items-center gap-4 p-4 rounded-lg cursor-pointer transition-all duration-200" 
              style={{backgroundColor: 'transparent', border: '1px solid #E0E6ED'}}
              onMouseEnter={(e) => (e.target as HTMLDivElement).style.backgroundColor = '#F7F9FC'}
              onMouseLeave={(e) => (e.target as HTMLDivElement).style.backgroundColor = 'transparent'}
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{backgroundColor: '#22333b'}}>
                <TrendingUpIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-medium" style={{color: '#1A1A1A'}}>View Job Status</h3>
                <p className="text-sm" style={{color: '#6C757D'}}>Monitor indexing progress and results</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="p-6 rounded-lg" style={{backgroundColor: '#FFFFFF', border: '1px solid #E0E6ED'}}>
          <h2 className="text-lg font-semibold mb-4" style={{color: '#1A1A1A'}}>Recent Activity</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full mt-2" style={{backgroundColor: '#4BB543'}}></div>
              <div className="flex-1">
                <p className="text-sm font-medium" style={{color: '#1A1A1A'}}>45 URLs indexed successfully</p>
                <p className="text-xs" style={{color: '#6C757D'}}>2 minutes ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full mt-2" style={{backgroundColor: '#1C2331'}}></div>
              <div className="flex-1">
                <p className="text-sm font-medium" style={{color: '#1A1A1A'}}>Scheduled job created</p>
                <p className="text-xs" style={{color: '#6C757D'}}>15 minutes ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full mt-2" style={{backgroundColor: '#2C2C2E'}}></div>
              <div className="flex-1">
                <p className="text-sm font-medium" style={{color: '#1A1A1A'}}>New service account added</p>
                <p className="text-xs" style={{color: '#6C757D'}}>1 hour ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full mt-2" style={{backgroundColor: '#1E1E1E'}}></div>
              <div className="flex-1">
                <p className="text-sm font-medium" style={{color: '#1A1A1A'}}>Sitemap imported - 120 URLs</p>
                <p className="text-xs" style={{color: '#6C757D'}}>2 hours ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Jobs Table */}
      <div className="p-6 rounded-lg" style={{backgroundColor: '#FFFFFF', border: '1px solid #E0E6ED'}}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold" style={{color: '#1A1A1A'}}>Recent Jobs</h2>
          <button 
            className="text-sm transition-colors" 
            style={{color: '#6C757D'}}
            onMouseEnter={(e) => (e.target as HTMLButtonElement).style.color = '#1A1A1A'}
            onMouseLeave={(e) => (e.target as HTMLButtonElement).style.color = '#6C757D'}
          >
            View All
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{borderBottom: '1px solid #E0E6ED'}}>
                <th className="text-left py-3 px-4 font-medium" style={{color: '#6C757D'}}>Name</th>
                <th className="text-left py-3 px-4 font-medium" style={{color: '#6C757D'}}>Created</th>
                <th className="text-left py-3 px-4 font-medium" style={{color: '#6C757D'}}>Schedule</th>
                <th className="text-left py-3 px-4 font-medium" style={{color: '#6C757D'}}>URLs</th>
                <th className="text-left py-3 px-4 font-medium" style={{color: '#6C757D'}}>Status</th>
                <th className="text-left py-3 px-4 font-medium" style={{color: '#6C757D'}}>Progress</th>
                <th className="text-left py-3 px-4 font-medium" style={{color: '#6C757D'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center" style={{color: '#6C757D'}}>
                    Loading recent jobs...
                  </td>
                </tr>
              ) : recentJobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center" style={{color: '#6C757D'}}>
                    No jobs found. Create your first indexing job to get started.
                  </td>
                </tr>
              ) : recentJobs.map((job) => (
                <tr 
                  key={job.id}
                  className="transition-colors" 
                  style={{borderBottom: '1px solid #F7F9FC'}}
                  onMouseEnter={(e) => (e.target as HTMLTableRowElement).style.backgroundColor = '#F7F9FC'}
                  onMouseLeave={(e) => (e.target as HTMLTableRowElement).style.backgroundColor = 'transparent'}
                >
                  <td className="py-3 px-4 font-bold" style={{color: '#1A1A1A'}}>
                    #{job.id.slice(-12)}
                  </td>
                  <td className="py-3 px-4" style={{color: '#6C757D'}}>
                    {formatDate(job.created_at)}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-xs px-2 py-1 rounded-full font-medium" style={{backgroundColor: '#1C2331', color: '#FFFFFF'}}>
                      {job.schedule_type}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold" style={{color: '#1A1A1A'}}>
                      {job.total_urls} total
                    </div>
                    <div className="text-xs" style={{color: job.successful_urls > 0 ? '#4BB543' : job.failed_urls > 0 ? '#E63946' : '#6C757D'}}>
                      {job.successful_urls} success, {job.failed_urls} failed
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span 
                      className="text-xs px-2 py-1 rounded-full font-medium" 
                      style={getStatusBadgeStyle(job.status)}
                    >
                      {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {job.status === 'completed' ? (
                      <div>
                        <div className="w-full rounded-full h-2" style={{backgroundColor: '#E0E6ED'}}>
                          <div className="h-2 rounded-full" style={{width: '100%', backgroundColor: '#4BB543'}}></div>
                        </div>
                        <span className="text-xs font-medium mt-1" style={{color: '#4BB543'}}>
                          {job.processed_urls}/{job.total_urls} processed
                        </span>
                      </div>
                    ) : (
                      <div className="font-semibold" style={{color: '#1A1A1A'}}>
                        {job.processed_urls}/{job.total_urls} processed
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <button 
                      className="transition-colors" 
                      style={{color: '#6C757D'}}
                      onMouseEnter={(e) => (e.target as HTMLButtonElement).style.color = '#1A1A1A'}
                      onMouseLeave={(e) => (e.target as HTMLButtonElement).style.color = '#6C757D'}
                      onClick={() => window.location.href = `/dashboard/manage-jobs/${job.id}`}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}