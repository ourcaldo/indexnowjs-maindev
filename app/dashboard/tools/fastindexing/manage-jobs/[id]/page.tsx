
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Globe, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  ExternalLink,
  Play,
  Pause,
  RotateCcw,
  Archive,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { authService } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { useSocketIO } from '@/hooks/useSocketIO';

interface Job {
  id: string;
  name: string;
  type: 'manual' | 'sitemap';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused' | 'cancelled';
  schedule_type: 'one-time' | 'hourly' | 'daily' | 'weekly' | 'monthly';
  total_urls: number;
  processed_urls: number;
  successful_urls: number;
  failed_urls: number;
  progress_percentage: number;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
  next_run_at?: string;
  error_message?: string;
  source_data?: any;
}

interface URLSubmission {
  id: string;
  url: string;
  status: 'success' | 'failed' | 'pending' | 'quota_exceeded';
  submitted_at?: string;
  created_at: string;
  indexed_at?: string;
  error_message?: string;
  response_data?: any;
  retry_count: number;
}

// Real data will be loaded from API

const getStatusColor = (status: string) => {
  switch (status) {
    case 'success':
    case 'submitted':
      return 'bg-[#4BB543] text-white';
    case 'failed':
      return 'bg-[#E63946] text-white';
    case 'pending':
      return 'bg-[#6C757D] text-white';
    case 'quota_exceeded':
      return 'bg-[#F0A202] text-[#1A1A1A]';
    case 'paused':
      return 'bg-[#F0A202] text-[#1A1A1A]';
    case 'completed':
      return 'bg-[#4BB543] text-white';
    case 'running':
      return 'bg-[#3D8BFF] text-white';
    default:
      return 'bg-[#6C757D] text-white';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'success':
    case 'submitted':
    case 'completed':
      return <CheckCircle2 className="h-3 w-3" />;
    case 'failed':
      return <XCircle className="h-3 w-3" />;
    case 'pending':
      return <Clock className="h-3 w-3" />;
    case 'quota_exceeded':
      return <AlertCircle className="h-3 w-3" />;
    case 'paused':
      return <Pause className="h-3 w-3" />;
    case 'running':
      return <Play className="h-3 w-3" />;
    default:
      return <Clock className="h-3 w-3" />;
  }
};

// Removed mock job data - now uses real data from API

export default function JobDetailsPage() {
  const { addToast } = useToast();
  const params = useParams();
  const jobId = params.id as string;
  
  // State
  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<Job | null>(null);
  const [submissions, setSubmissions] = useState<URLSubmission[]>([]);
  const [isSubmissionsLoading, setIsSubmissionsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalSubmissions, setTotalSubmissions] = useState(0);
  const itemsPerPage = 20;

  // Memoized callback functions to prevent infinite re-renders
  const handleJobUpdate = useCallback((message: any) => {
    console.log('📨 Job update received on detail page:', message);
    // Update job data with real-time progress
    if (message.jobId === jobId) {
      setJob(prevJob => {
        if (!prevJob) return prevJob;
        
        console.log('🔄 Updating job state with:', message);
        return {
          ...prevJob,
          status: (message.status as Job['status']) || prevJob.status,
          progress_percentage: message.progress?.progress_percentage ?? prevJob.progress_percentage,
          processed_urls: message.progress?.processed_urls ?? prevJob.processed_urls,
          successful_urls: message.progress?.successful_urls ?? prevJob.successful_urls,
          failed_urls: message.progress?.failed_urls ?? prevJob.failed_urls,
          total_urls: message.progress?.total_urls ?? prevJob.total_urls,
          updated_at: new Date().toISOString()
        };
      });
    }
  }, [jobId]);

  const handleJobProgress = useCallback((message: any) => {
    console.log('📊 Job progress received on detail page:', message);
    if (message.jobId === jobId && message.progress) {
      setJob(prevJob => {
        if (!prevJob) return prevJob;
        
        return {
          ...prevJob,
          progress_percentage: message.progress.progress_percentage ?? prevJob.progress_percentage,
          processed_urls: message.progress.processed_urls ?? prevJob.processed_urls,
          successful_urls: message.progress.successful_urls ?? prevJob.successful_urls,
          failed_urls: message.progress.failed_urls ?? prevJob.failed_urls,
          total_urls: message.progress.total_urls ?? prevJob.total_urls,
          updated_at: new Date().toISOString()
        };
      });
    }
  }, [jobId]);

  const handleJobCompleted = useCallback((message: any) => {
    console.log('✅ Job completed on detail page:', message);
    if (message.jobId === jobId) {
      addToast({
        title: 'Job Completed',
        description: `Job completed successfully!`,
        type: 'success'
      });
      
      // Update job status to completed immediately
      setJob(prevJob => {
        if (!prevJob) return prevJob;
        return {
          ...prevJob,
          status: 'completed',
          progress_percentage: 100,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      });
    }
  }, [jobId, addToast]);

  // Socket.io for real-time job updates
  const { isConnected } = useSocketIO({
    jobId: jobId,
    onJobUpdate: handleJobUpdate,
    onJobProgress: handleJobProgress,
    onJobCompleted: handleJobCompleted
  });

  // Listen for real-time URL submission updates
  useEffect(() => {
    const handleUrlSubmissionUpdate = (event: any) => {
      const { detail: submission } = event;
      if (submission.job_id === jobId) {
        console.log('📨 Real-time URL submission update:', submission);
        
        setSubmissions(prevSubmissions => {
          // Check if this submission already exists
          const existingIndex = prevSubmissions.findIndex(sub => sub.id === submission.id);
          
          if (existingIndex >= 0) {
            // Update existing submission
            const updated = [...prevSubmissions];
            updated[existingIndex] = { ...updated[existingIndex], ...submission };
            return updated;
          } else {
            // Add new submission at the beginning (latest first)
            return [submission, ...prevSubmissions];
          }
        });
      }
    };

    // Listen for job-specific updates that might require reloading submissions
    const handleJobProgressUpdate = (event: any) => {
      const { detail: data } = event;
      if (data.jobId === jobId && data.reloadSubmissions) {
        console.log('🔄 Reloading submissions due to job progress update');
        // Using the memoized loadSubmissions function
        if (loadSubmissions) {
          loadSubmissions();
        }
      }
    };

    // Handle real-time URL status changes
    const handleUrlStatusChange = (event: any) => {
      const { detail: data } = event;
      if (data.jobId === jobId && data.submission) {
        console.log('📨 Real-time URL status change:', data.submission);
        setSubmissions(prevSubmissions => {
          const existingIndex = prevSubmissions.findIndex(sub => sub.id === data.submission.id);
          
          if (existingIndex >= 0) {
            // Update existing submission
            const updated = [...prevSubmissions];
            updated[existingIndex] = { ...updated[existingIndex], ...data.submission };
            return updated;
          } else {
            // Add new submission at the beginning (latest first)
            return [data.submission, ...prevSubmissions];
          }
        });
      }
    };

    // Handle detailed job progress updates
    const handleDetailedProgress = (event: any) => {
      const { detail: progressData } = event;
      if (progressData.jobId === jobId) {
        console.log('📊 Detailed progress update:', progressData);
        // Additional progress handling can be added here
      }
    };

    window.addEventListener('url-submission-update', handleUrlSubmissionUpdate);
    window.addEventListener('job-progress-update', handleJobProgressUpdate);
    window.addEventListener('url-status-change', handleUrlStatusChange);
    window.addEventListener('job-progress-detailed', handleDetailedProgress);
    
    return () => {
      window.removeEventListener('url-submission-update', handleUrlSubmissionUpdate);
      window.removeEventListener('job-progress-update', handleJobProgressUpdate);
      window.removeEventListener('url-status-change', handleUrlStatusChange);
      window.removeEventListener('job-progress-detailed', handleDetailedProgress);
    };
  }, [jobId]);

  // Memoized load functions to prevent unnecessary re-renders
  const loadJobData = useCallback(async () => {
    try {
      const user = await authService.getCurrentUser();
      if (!user) return;

      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;

      const response = await fetch(`/api/jobs/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setJob(data.job);
      } else {
        addToast({
          title: 'Error',
          description: 'Failed to load job details',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error loading job:', error);
      addToast({
        title: 'Error',
        description: 'Failed to load job details',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [jobId, addToast]);

  const loadSubmissions = useCallback(async () => {
    try {
      setIsSubmissionsLoading(true);
      const user = await authService.getCurrentUser();
      if (!user) return;

      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString()
      });

      const response = await fetch(`/api/jobs/${jobId}/submissions?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSubmissions(data.submissions);
        setTotalSubmissions(data.count);
      }
    } catch (error) {
      console.error('Error loading submissions:', error);
    } finally {
      setIsSubmissionsLoading(false);
    }
  }, [jobId, currentPage, itemsPerPage]);

  // Load job and submissions data
  useEffect(() => {
    loadJobData();
    loadSubmissions();
  }, [loadJobData, loadSubmissions]);

  // Helper functions
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const handleJobAction = async (action: string) => {
    try {
      const user = await authService.getCurrentUser();
      if (!user) return;

      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;

      if (action === 'delete') {
        // Confirm deletion
        if (!confirm('Are you sure you want to delete this job? This action cannot be undone.')) {
          return;
        }

        const response = await fetch(`/api/jobs/${jobId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.ok) {
          addToast({
            title: 'Success',
            description: 'Job deleted successfully',
            type: 'success'
          });
          // Redirect to manage jobs page
          window.location.href = '/dashboard/manage-jobs';
        } else {
          addToast({
            title: 'Error',
            description: 'Failed to delete job',
            type: 'error'
          });
        }
      } else {
        const response = await fetch(`/api/jobs/${jobId}`, {
          method: 'PUT',
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            status: action === 'start' ? 'pending' : 
                   action === 'stop' ? 'cancelled' : 
                   action === 'resume' ? 'pending' : 
                   action === 'pause' ? 'paused' : 
                   action === 'retry' ? 'pending' : action 
          })
        });

        if (response.ok) {
          const actionMsg = action === 'start' ? 'started' : 
                           action === 'stop' ? 'stopped' : 
                           action === 'pause' ? 'paused' : 
                           action === 'resume' ? 'resumed' : 
                           action === 'retry' ? 'restarted' : `${action}d`;
          addToast({
            title: 'Success',
            description: `Job ${actionMsg} successfully`,
            type: 'success'
          });
          loadJobData(); // Reload job data
        } else {
          addToast({
            title: 'Error',
            description: `Failed to ${action} job`,
            type: 'error'
          });
        }
      }
    } catch (error) {
      const actionMsg = action === 'start' ? 'starting' : 
                       action === 'stop' ? 'stopping' : 
                       action === 'pause' ? 'pausing' : 
                       action === 'resume' ? 'resuming' : 
                       action === 'retry' ? 'restarting' : `${action}ing`;
      console.error(`Error ${actionMsg} job:`, error);
      addToast({
        title: 'Error',
        description: `Failed to ${action} job`,
        type: 'error'
      });
    }
  };

  const totalPages = Math.ceil(totalSubmissions / itemsPerPage);
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-[#1A1A1A]">Loading job details...</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h3 className="text-lg font-medium text-[#1A1A1A] mb-2">Job not found</h3>
          <p className="text-[#1A1A1A]">The requested job could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/manage-jobs">
          <Button variant="ghost" size="sm" className="text-[#1A1A1A] hover:text-[#1A1A1A] hover:bg-[#F7F9FC]">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Jobs
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">{job.name}</h1>
          <p className="text-[#1A1A1A] mt-1">Job ID: #{job.id}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Dynamic Start/Stop button */}
          {job.status === 'pending' && (
            <Button 
              size="sm"
              onClick={() => handleJobAction('start')}
              className="bg-[#4BB543] text-white hover:bg-[#4BB543]/90 hover:text-white"
            >
              <Play className="h-4 w-4 mr-2" />
              Start Job
            </Button>
          )}
          {job.status === 'running' && (
            <Button 
              size="sm"
              onClick={() => handleJobAction('stop')}
              className="bg-[#E63946] text-white hover:bg-[#E63946]/90 hover:text-white"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Stop Job
            </Button>
          )}
          
          {/* Dynamic Pause/Resume button */}
          {job.status === 'running' && (
            <Button 
              size="sm"
              onClick={() => handleJobAction('pause')}
              className="bg-[#F0A202] text-[#1A1A1A] hover:bg-[#F0A202]/90 hover:text-[#1A1A1A]"
            >
              <Pause className="h-4 w-4 mr-2" />
              Pause Job
            </Button>
          )}
          {job.status === 'paused' && (
            <Button 
              size="sm"
              onClick={() => handleJobAction('resume')}
              className="bg-[#1C2331] text-white hover:bg-[#0d1b2a] hover:text-white"
            >
              <Play className="h-4 w-4 mr-2" />
              Resume Job
            </Button>
          )}
          
          {/* Re-run Job button - only for completed jobs */}
          {job.status === 'completed' && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleJobAction('retry')}
              className="border-[#E0E6ED] text-[#1A1A1A] hover:bg-[#F7F9FC] hover:text-[#1A1A1A]"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Re-run Job
            </Button>
          )}
          
          {/* Delete Job button - always visible */}
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleJobAction('delete')}
            className="border-[#E63946] text-[#E63946] hover:bg-[#E63946] hover:text-white"
          >
            <Archive className="h-4 w-4 mr-2" />
            Delete Job
          </Button>
        </div>
      </div>

      {/* Job Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Job Status */}
        <Card className="bg-white border-[#E0E6ED]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[#1A1A1A] flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Job Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#1A1A1A]">Status</span>
              <Badge className={`${getStatusColor(job.status)} flex items-center gap-1`}>
                {getStatusIcon(job.status)}
                {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#1A1A1A]">Schedule</span>
              <span className="text-sm font-medium text-[#1A1A1A]">{job.schedule_type}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#1A1A1A]">Created</span>
              <span className="text-sm font-medium text-[#1A1A1A]">{formatDate(job.created_at)}</span>
            </div>
            {job.started_at && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#1A1A1A]">Last Run</span>
                <span className="text-sm font-medium text-[#1A1A1A]">{formatDate(job.started_at)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Progress */}
        <Card className="bg-white border-[#E0E6ED]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[#1A1A1A] flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#1A1A1A]">Overall Progress</span>
              <span className="text-sm font-medium text-[#1A1A1A]">{Math.round(job.progress_percentage)}%</span>
            </div>
            <Progress value={job.progress_percentage} className="h-2" />
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-[#1A1A1A]">{job.total_urls}</div>
                <div className="text-xs text-[#1A1A1A]">Total URLs</div>
              </div>
              <div>
                <div className="text-lg font-bold text-[#1A1A1A]">{job.processed_urls}</div>
                <div className="text-xs text-[#1A1A1A]">Processed</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center pt-2 border-t border-[#E0E6ED]">
              <div>
                <div className="text-lg font-bold text-[#4BB543]">{job.successful_urls}</div>
                <div className="text-xs text-[#1A1A1A]">Successful</div>
              </div>
              <div>
                <div className="text-lg font-bold text-[#E63946]">{job.failed_urls}</div>
                <div className="text-xs text-[#1A1A1A]">Failed</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Source */}
        <Card className="bg-white border-[#E0E6ED]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[#1A1A1A] flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Source
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {job.type === 'manual' ? (
              <div>
                <div className="text-sm font-medium text-[#1A1A1A] mb-2">Manual URL list</div>
                {job.source_data?.urls && job.source_data.urls.length > 0 ? (
                  <div className="space-y-2">
                    {/* Show only first few URLs that fit in card space, then count */}
                    {job.source_data.urls.slice(0, 2).map((url: string, index: number) => (
                      <div key={index} className="text-xs text-[#1A1A1A] break-all p-2 rounded border border-[#E0E6ED]">
                        {url.length > 50 ? `${url.slice(0, 50)}...` : url}
                      </div>
                    ))}
                    {job.source_data.urls.length > 2 && (
                      <div className="text-sm text-[#1A1A1A] font-medium text-center p-2 rounded bg-[#F7F9FC]">
                        +{job.source_data.urls.length - 2} more URLs
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-[#1A1A1A]">No URLs specified</div>
                )}
              </div>
            ) : (
              <div>
                <div className="text-sm font-medium text-[#1A1A1A] mb-2">Sitemap URL</div>
                {job.source_data?.sitemap_url ? (
                  <>
                    <div className="text-sm text-[#1A1A1A] break-all p-2 rounded border border-[#E0E6ED]">
                      {job.source_data.sitemap_url.length > 50 ? 
                        `${job.source_data.sitemap_url.slice(0, 50)}...` : 
                        job.source_data.sitemap_url
                      }
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-2 border-[#E0E6ED] text-[#1A1A1A] hover:bg-[#F7F9FC] hover:text-[#1A1A1A]"
                      asChild
                    >
                      <a href={job.source_data.sitemap_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Sitemap
                      </a>
                    </Button>
                  </>
                ) : (
                  <div className="text-sm text-[#1A1A1A]">No sitemap URL available</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* URL Submissions History */}
      <Card className="bg-white border-[#E0E6ED]">
        <CardHeader>
          <CardTitle className="text-lg text-[#1A1A1A]">URL Submissions</CardTitle>
          <p className="text-sm text-[#1A1A1A]">Detailed history of each URL submission attempt</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F7F9FC] border-b border-[#E0E6ED]">
                <tr>
                  <th className="text-left p-4 font-medium text-[#1A1A1A] w-16">#</th>
                  <th className="text-left p-4 font-medium text-[#1A1A1A]">URL</th>
                  <th className="text-left p-4 font-medium text-[#1A1A1A]">Status</th>
                  <th className="text-left p-4 font-medium text-[#1A1A1A]">Submitted At</th>
                  <th className="text-left p-4 font-medium text-[#1A1A1A]">Error Message</th>
                </tr>
              </thead>
              <tbody>
                {submissions.length > 0 ? (
                  submissions.map((submission, index) => (
                    <tr key={submission.id} className="border-b border-[#E0E6ED] hover:bg-[#F7F9FC] transition-colors">
                      <td className="p-4">
                        <div className="text-sm font-medium text-[#1A1A1A]">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </div>
                      </td>
                      <td className="p-4 w-2/5">
                        <div className="flex items-start gap-2">
                          <Globe className="h-4 w-4 text-[#1A1A1A] flex-shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-[#1A1A1A] leading-tight break-words">
                              {submission.url}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge className={`${getStatusColor(submission.status)} flex items-center gap-1 w-fit`}>
                          {getStatusIcon(submission.status)}
                          {submission.status === 'quota_exceeded' ? 'Quota Exceeded' : 
                           submission.status === 'submitted' ? 'Success' :
                           submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="p-4 w-1/6">
                        <div className="text-sm text-[#1A1A1A]">
                          {(() => {
                            // Use submitted_at if available, otherwise use created_at
                            const dateToFormat = submission.submitted_at || submission.created_at;
                            // Check for invalid/epoch dates
                            if (dateToFormat && dateToFormat !== '1970-01-01T07:00:00.000Z') {
                              const date = new Date(dateToFormat);
                              if (date.getTime() > 0) { // Valid date check
                                return formatDate(dateToFormat);
                              }
                            }
                            return '-';
                          })()}
                        </div>
                      </td>
                      <td className="p-4 w-1/3">
                        {submission.error_message ? (
                          <div className="text-sm text-[#E63946] leading-tight">
                            {submission.error_message.length > 100 ? 
                              `${submission.error_message.slice(0, 100)}...` : 
                              submission.error_message
                            }
                          </div>
                        ) : (
                          <div className="text-sm text-[#1A1A1A]">-</div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-[#1A1A1A]">
                      No URL submissions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalSubmissions > 0 && totalPages > 1 && (
            <div className="p-4 border-t border-[#E0E6ED] bg-[#F7F9FC]">
              <div className="flex items-center justify-between">
                <div className="text-sm text-[#1A1A1A]">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalSubmissions)} of {totalSubmissions} submissions
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="border-[#E0E6ED] text-[#1A1A1A] hover:bg-white hover:text-[#1A1A1A] disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => goToPage(pageNum)}
                          className={
                            currentPage === pageNum
                              ? "bg-[#1C2331] text-white hover:bg-[#0d1b2a] hover:text-white"
                              : "border-[#E0E6ED] text-[#1A1A1A] hover:bg-white hover:text-[#1A1A1A]"
                          }
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="border-[#E0E6ED] text-[#1A1A1A] hover:bg-white hover:text-[#1A1A1A] disabled:opacity-50"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {submissions.length === 0 && !isSubmissionsLoading && (
            <div className="p-8 text-center">
              <Archive className="h-12 w-12 text-[#1A1A1A] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[#1A1A1A] mb-2">No submissions yet</h3>
              <p className="text-[#1A1A1A]">
                This job hasn't started processing URLs yet.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
