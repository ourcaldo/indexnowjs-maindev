'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSocketIO } from '@/hooks/useSocketIO';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Search, 
  Filter, 
  MoreHorizontal,
  CheckCircle2, 
  XCircle, 
  Clock, 
  Pause,
  Play,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Archive,
  Eye,
  RefreshCw,
  Trash2
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/database';
import { authService } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { usePageViewLogger, useActivityLogger } from '@/hooks/useActivityLogger';

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
}

// Real jobs data will be loaded from API

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-[#4BB543] text-white';
    case 'failed':
      return 'bg-[#E63946] text-white';
    case 'running':
      return 'bg-[#1C2331] text-white';
    case 'paused':
      return 'bg-[#F0A202] text-[#1A1A1A]';
    default:
      return 'bg-[#6C757D] text-white';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-3 w-3" />;
    case 'failed':
      return <XCircle className="h-3 w-3" />;
    case 'running':
      return <Play className="h-3 w-3" />;
    case 'paused':
      return <Pause className="h-3 w-3" />;
    default:
      return <Clock className="h-3 w-3" />;
  }
};

export default function ManageJobsPage() {
  const { addToast } = useToast();
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  
  // Log page view and job management activities
  usePageViewLogger('/dashboard/manage-jobs', 'Manage Jobs', { section: 'job_management' })
  const { logJobActivity } = useActivityLogger();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [scheduleFilter, setScheduleFilter] = useState('All Schedules');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const jobsPerPage = 20;

  // Memoized callback functions to prevent infinite re-renders
  const handleJobUpdate = useCallback((message: any) => {
    // Update the specific job in the list
    setJobs(prevJobs => 
      prevJobs.map(job => {
        if (job.id === message.jobId) {
          return {
            ...job,
            status: (message.status as Job['status']) || job.status,
            progress_percentage: message.progress?.progress_percentage ?? job.progress_percentage,
            processed_urls: message.progress?.processed_urls ?? job.processed_urls,
            successful_urls: message.progress?.successful_urls ?? job.successful_urls,
            failed_urls: message.progress?.failed_urls ?? job.failed_urls,
            total_urls: message.progress?.total_urls ?? job.total_urls,
            updated_at: new Date().toISOString()
          };
        }
        return job;
      })
    );
  }, []);

  const handleJobCompleted = useCallback((message: any) => {
    addToast({
      title: 'Job Completed',
      description: `Job completed successfully!`,
      type: 'success'
    });
  }, [addToast]);

  // Socket.io for real-time updates
  const { isConnected } = useSocketIO({
    onJobUpdate: handleJobUpdate,
    onJobCompleted: handleJobCompleted
  });

  // Listen for real-time job list updates
  useEffect(() => {
    const handleJobListUpdate = (event: any) => {
      const { detail: updatedJobs } = event;
      setJobs(updatedJobs);
    };

    window.addEventListener('job-list-update', handleJobListUpdate);
    return () => {
      window.removeEventListener('job-list-update', handleJobListUpdate);
    };
  }, []);

  // Memoized loadJobs function to prevent unnecessary re-renders
  const loadJobs = useCallback(async () => {
    try {
      setLoading(true);
      // Auth handled by AuthProvider - get session token directly
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: jobsPerPage.toString(),
        search: searchTerm,
        status: statusFilter,
        schedule: scheduleFilter
      });

      const response = await fetch(`/api/v1/indexing/jobs?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobs);
        setTotalCount(data.count);
      } else {
        addToast({
          title: 'Error',
          description: 'Failed to load jobs',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
      addToast({
        title: 'Error',
        description: 'Failed to load jobs',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, statusFilter, scheduleFilter, addToast]);

  // Load jobs data
  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

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

  const generateJobId = (id: string) => `#${id}`;

  // Pagination
  const totalPages = Math.ceil(totalCount / jobsPerPage);
  const startIndex = (currentPage - 1) * jobsPerPage;

  const handleSelectJob = (jobId: string, checked: boolean) => {
    if (checked) {
      setSelectedJobs([...selectedJobs, jobId]);
    } else {
      setSelectedJobs(selectedJobs.filter(id => id !== jobId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedJobs(jobs.map(job => job.id));
    } else {
      setSelectedJobs([]);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    try {
      // Auth handled by AuthProvider - get session token directly
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;

      const response = await fetch(`/api/v1/indexing/jobs/${jobId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        addToast({
          title: 'Success',
          description: 'Job deleted successfully',
          type: 'success'
        });
        
        // Log job deletion activity
        const job = jobs.find(j => j.id === jobId);
        logJobActivity('job_delete', jobId, `Deleted job: ${job?.name || jobId}`, {
          job_id: jobId,
          job_name: job?.name,
          job_type: job?.type,
          action: 'delete'
        });
        
        loadJobs(); // Reload jobs list
      } else {
        addToast({
          title: 'Error',
          description: 'Failed to delete job',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error deleting job:', error);
      addToast({
        title: 'Error',
        description: 'Failed to delete job',
        type: 'error'
      });
    }
  };

  const handleRerunJob = async (jobId: string) => {
    try {
      // Auth handled by AuthProvider - get session token directly
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;

      const response = await fetch(`/api/v1/indexing/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'pending' })
      });

      if (response.ok) {
        addToast({
          title: 'Success',
          description: 'Job restarted successfully',
          type: 'success'
        });
        loadJobs(); // Reload jobs list
      } else {
        addToast({
          title: 'Error',
          description: 'Failed to restart job',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error restarting job:', error);
      addToast({
        title: 'Error',
        description: 'Failed to restart job',
        type: 'error'
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Manage Jobs</h1>
          <p className="text-[#6C757D] mt-1">View and manage your indexing jobs</p>
        </div>
        {selectedJobs.length > 0 && (
          <Button 
            variant="destructive"
            className="bg-[#E63946] hover:bg-[#d62839] text-white"
          >
            <Archive className="h-4 w-4 mr-2" />
            Delete Selected ({selectedJobs.length})
          </Button>
        )}
      </div>

      {/* Filters Section */}
      <div className="bg-white border border-[#E0E6ED] rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search Jobs */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#1A1A1A]">Search Jobs</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#6C757D]" />
              <Input
                placeholder="Search by name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-[#E0E6ED] focus:border-[#6C757D] focus:ring-[#6C757D]"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#1A1A1A]">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="border-[#E0E6ED] focus:border-[#6C757D] focus:ring-[#6C757D] focus-visible:ring-[#6C757D]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-[#E0E6ED]">
                <SelectItem value="All Status" className="hover:bg-[#F7F9FC] focus:bg-[#F7F9FC] focus:text-[#1A1A1A]">All Status</SelectItem>
                <SelectItem value="completed" className="hover:bg-[#F7F9FC] focus:bg-[#F7F9FC] focus:text-[#1A1A1A]">Completed</SelectItem>
                <SelectItem value="paused" className="hover:bg-[#F7F9FC] focus:bg-[#F7F9FC] focus:text-[#1A1A1A]">Paused</SelectItem>
                <SelectItem value="running" className="hover:bg-[#F7F9FC] focus:bg-[#F7F9FC] focus:text-[#1A1A1A]">Running</SelectItem>
                <SelectItem value="failed" className="hover:bg-[#F7F9FC] focus:bg-[#F7F9FC] focus:text-[#1A1A1A]">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Schedule Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#1A1A1A]">Schedule</label>
            <Select value={scheduleFilter} onValueChange={setScheduleFilter}>
              <SelectTrigger className="border-[#E0E6ED] focus:border-[#6C757D] focus:ring-[#6C757D] focus-visible:ring-[#6C757D]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-[#E0E6ED]">
                <SelectItem value="All Schedules" className="hover:bg-[#F7F9FC] focus:bg-[#F7F9FC] focus:text-[#1A1A1A]">All Schedules</SelectItem>
                <SelectItem value="one-time" className="hover:bg-[#F7F9FC] focus:bg-[#F7F9FC] focus:text-[#1A1A1A]">One-time</SelectItem>
                <SelectItem value="daily" className="hover:bg-[#F7F9FC] focus:bg-[#F7F9FC] focus:text-[#1A1A1A]">Daily</SelectItem>
                <SelectItem value="weekly" className="hover:bg-[#F7F9FC] focus:bg-[#F7F9FC] focus:text-[#1A1A1A]">Weekly</SelectItem>
                <SelectItem value="monthly" className="hover:bg-[#F7F9FC] focus:bg-[#F7F9FC] focus:text-[#1A1A1A]">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="bg-white border border-[#E0E6ED] rounded-lg">
        {/* Table Header */}
        <div className="px-6 py-4 border-b border-[#E0E6ED] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Archive className="h-5 w-5 text-[#1A1A1A]" />
            <h2 className="text-lg font-semibold text-[#1A1A1A]">Indexing Jobs</h2>
            <Badge variant="secondary" className="bg-[#F7F9FC] text-[#6C757D]">
              {totalCount} jobs
            </Badge>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F7F9FC] border-b border-[#E0E6ED]">
              <tr>
                <th className="text-left p-4 w-12">
                  <Checkbox
                    checked={selectedJobs.length === jobs.length && jobs.length > 0}
                    onCheckedChange={handleSelectAll}
                    className="border-[#E0E6ED]"
                  />
                </th>
                <th className="text-left p-4 font-medium text-[#1A1A1A]">Name</th>
                <th className="text-left p-4 font-medium text-[#1A1A1A]">Created</th>
                <th className="text-left p-4 font-medium text-[#1A1A1A] min-w-[120px]">Schedule</th>
                <th className="text-left p-4 font-medium text-[#1A1A1A]">URLs</th>
                <th className="text-left p-4 font-medium text-[#1A1A1A]">Status</th>
                <th className="text-left p-4 font-medium text-[#1A1A1A]">Progress</th>
                <th className="text-left p-4 font-medium text-[#1A1A1A]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center">
                    <div className="text-[#6C757D]">Loading jobs...</div>
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="border-b border-[#E0E6ED] hover:bg-[#F7F9FC] transition-colors duration-200">
                    <td className="p-4">
                      <Checkbox
                        checked={selectedJobs.includes(job.id)}
                        onCheckedChange={(checked) => handleSelectJob(job.id, checked as boolean)}
                        className="border-[#E0E6ED]"
                      />
                    </td>
                    <td className="p-4">
                      <div>
                        <Link 
                          href={`/dashboard/manage-jobs/${job.id}`}
                          className="font-medium text-[#1A1A1A] hover:text-[#1C2331] hover:underline"
                        >
                          {job.name}
                        </Link>
                        <p className="text-sm text-[#6C757D] mt-1">{generateJobId(job.id)}</p>
                      </div>
                    </td>
                    <td className="p-4 text-[#1A1A1A]">{formatDate(job.created_at)}</td>
                    <td className="p-4 min-w-[100px]">
                      <Badge className="bg-[#1C2331] text-white hover:bg-[#0d1b2a] whitespace-nowrap">
                        {job.schedule_type}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="text-sm">
                        <div className="text-[#1A1A1A] font-medium">{job.total_urls} total</div>
                        <div className="text-[#6C757D]">
                          <span className="text-[#4BB543]">{job.successful_urls} success</span>, <span className="text-[#E63946]">{job.failed_urls} failed</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge className={`${getStatusColor(job.status)} flex items-center gap-1 w-fit`}>
                        {getStatusIcon(job.status)}
                        {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="space-y-2">
                        <div className="text-sm text-[#1A1A1A] font-medium">
                          {job.total_urls > 0 ? `${Math.round(job.progress_percentage)}%` : '0%'} processed
                        </div>
                        <Progress 
                          value={job.progress_percentage || 0} 
                          className="h-2 w-24"
                        />
                      </div>
                    </td>
                    <td className="p-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-[#6C757D] hover:text-[#1A1A1A] hover:bg-[#F7F9FC]">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white border-[#E0E6ED]">
                          <DropdownMenuItem asChild className="hover:bg-[#F7F9FC] focus:bg-[#F7F9FC] focus:text-[#1A1A1A]">
                            <Link 
                              href={`/dashboard/manage-jobs/${job.id}`}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <Eye className="h-4 w-4" />
                              See details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleRerunJob(job.id)}
                            className="flex items-center gap-2 cursor-pointer hover:bg-[#F7F9FC] focus:bg-[#F7F9FC] focus:text-[#1A1A1A]"
                          >
                            <RefreshCw className="h-4 w-4" />
                            Re-run
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteJob(job.id)}
                            className="flex items-center gap-2 cursor-pointer text-[#E63946] hover:bg-[#fef2f2] focus:bg-[#fef2f2] focus:text-[#E63946]"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && jobs.length === 0 && (
          <div className="p-8 text-center">
            <Archive className="h-12 w-12 text-[#6C757D] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[#1A1A1A] mb-2">No jobs found</h3>
            <p className="text-[#6C757D]">
              {searchTerm || statusFilter !== 'All Status' || scheduleFilter !== 'All Schedules'
                ? "Try adjusting your filters to see more jobs."
                : "You haven't created any indexing jobs yet."
              }
            </p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-[#E0E6ED] flex items-center justify-between">
            <div className="text-sm text-[#6C757D]">
              Showing {startIndex + 1} to {Math.min(startIndex + jobsPerPage, totalCount)} of {totalCount} jobs
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="border-[#E0E6ED] text-[#1A1A1A] hover:bg-[#F7F9FC]"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className={currentPage === page 
                      ? "bg-[#1C2331] text-white hover:bg-[#0d1b2a]" 
                      : "border-[#E0E6ED] text-[#1A1A1A] hover:bg-[#F7F9FC]"
                    }
                  >
                    {page}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="border-[#E0E6ED] text-[#1A1A1A] hover:bg-[#F7F9FC]"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}