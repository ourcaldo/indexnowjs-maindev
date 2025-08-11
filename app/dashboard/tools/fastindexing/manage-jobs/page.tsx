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
import { supabase } from '@/lib/supabase';
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

const getScheduleTypeColor = (scheduleType: string) => {
  switch (scheduleType) {
    case 'one-time':
      return 'bg-[#6C757D] text-white';
    case 'hourly':
      return 'bg-[#3D8BFF] text-white';
    case 'daily':
      return 'bg-[#1C2331] text-white';
    case 'weekly':
      return 'bg-[#22333b] text-white';
    case 'monthly':
      return 'bg-[#1E1E1E] text-white';
    default:
      return 'bg-[#6C757D] text-white';
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function ManageJobsPage() {
  // Log page view
  usePageViewLogger('Visited Manage Jobs');
  const { logActivity } = useActivityLogger();
  
  const { addToast } = useToast();
  const { isConnected } = useSocketIO();
  
  // State management
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [scheduleFilter, setScheduleFilter] = useState('All Schedules');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const itemsPerPage = 20;

  // Load jobs from API
  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const user = await authService.getCurrentUser();
      if (!user) return;

      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;

      // Build query parameters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        search: searchTerm,
        status: statusFilter === 'All Status' ? '' : statusFilter,
        schedule: scheduleFilter === 'All Schedules' ? '' : scheduleFilter
      });

      const response = await fetch(`/api/jobs?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobs || []);
        setTotalPages(data.totalPages || 1);
        setTotalJobs(data.totalJobs || 0);
      } else {
        addToast({
          title: "Error",
          description: "Failed to load jobs",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
      addToast({
        title: "Error", 
        description: "Failed to load jobs",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, statusFilter, scheduleFilter, addToast]);

  // Load jobs on mount and filter changes
  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  // Handle job actions
  const handleJobAction = async (jobId: string, action: 'pause' | 'resume' | 'cancel' | 'delete') => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;

      const response = await fetch(`/api/jobs/${jobId}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });

      if (response.ok) {
        addToast({
          title: "Success",
          description: `Job ${action}d successfully`,
          variant: "default"
        });
        
        // Log the action
        logActivity('job_action', `${action} job: ${jobId}`);
        
        // Reload jobs
        loadJobs();
      } else {
        const errorData = await response.json();
        addToast({
          title: "Error",
          description: errorData.error || `Failed to ${action} job`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error(`Error ${action}ing job:`, error);
      addToast({
        title: "Error",
        description: `Failed to ${action} job`,
        variant: "destructive"
      });
    }
  };

  // Handle bulk actions
  const handleBulkAction = async (action: 'pause' | 'resume' | 'cancel' | 'delete') => {
    if (selectedJobs.length === 0) {
      addToast({
        title: "Error",
        description: "Please select jobs first",
        variant: "destructive"
      });
      return;
    }

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;

      const response = await fetch('/api/jobs/bulk-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          jobIds: selectedJobs,
          action 
        })
      });

      if (response.ok) {
        const data = await response.json();
        addToast({
          title: "Success",
          description: `${action}d ${data.affected} job(s) successfully`,
          variant: "default"
        });
        
        // Log bulk action
        logActivity('bulk_job_action', `${action} ${selectedJobs.length} jobs`);
        
        setSelectedJobs([]);
        loadJobs();
      } else {
        const errorData = await response.json();
        addToast({
          title: "Error",
          description: errorData.error || `Failed to ${action} jobs`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error(`Error in bulk ${action}:`, error);
      addToast({
        title: "Error",
        description: `Failed to ${action} jobs`,
        variant: "destructive"
      });
    }
  };

  // Handle checkbox selection
  const handleSelectAll = () => {
    if (selectedJobs.length === jobs.length) {
      setSelectedJobs([]);
    } else {
      setSelectedJobs(jobs.map(job => job.id));
    }
  };

  const handleSelectJob = (jobId: string) => {
    setSelectedJobs(prev => 
      prev.includes(jobId) 
        ? prev.filter(id => id !== jobId)
        : [...prev, jobId]
    );
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, scheduleFilter]);

  return (
    <div className="space-y-6" style={{ backgroundColor: '#FFFFFF' }}>
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>Manage Jobs</h1>
          <p style={{ color: '#6C757D' }}>Monitor and manage your indexing jobs</p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Connection Status */}
          <div className="flex items-center gap-2 text-sm">
            <div 
              className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#4BB543]' : 'bg-[#E63946]'}`}
            />
            <span style={{ color: '#6C757D' }}>
              {isConnected ? 'Live Updates' : 'Disconnected'}
            </span>
          </div>
          
          <Button
            onClick={loadJobs}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search jobs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="w-full md:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Status">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Schedule Filter */}
            <div className="w-full md:w-48">
              <Select value={scheduleFilter} onValueChange={setScheduleFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Schedules">All Schedules</SelectItem>
                  <SelectItem value="one-time">One-time</SelectItem>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedJobs.length > 0 && (
        <div className="flex items-center gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm font-medium" style={{ color: '#1A1A1A' }}>
            {selectedJobs.length} job(s) selected
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <Button
              onClick={() => handleBulkAction('pause')}
              size="sm"
              variant="outline"
              className="flex items-center gap-1"
            >
              <Pause className="h-3 w-3" />
              Pause
            </Button>
            <Button
              onClick={() => handleBulkAction('resume')}
              size="sm"
              variant="outline" 
              className="flex items-center gap-1"
            >
              <Play className="h-3 w-3" />
              Resume
            </Button>
            <Button
              onClick={() => handleBulkAction('cancel')}
              size="sm"
              variant="outline"
              className="flex items-center gap-1"
            >
              <Archive className="h-3 w-3" />
              Cancel
            </Button>
            <Button
              onClick={() => handleBulkAction('delete')}
              size="sm"
              variant="destructive"
              className="flex items-center gap-1"
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Jobs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Jobs ({totalJobs})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#3D8BFF' }} />
              <span className="ml-2" style={{ color: '#6C757D' }}>Loading jobs...</span>
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-8">
              <p style={{ color: '#6C757D' }}>No jobs found matching your criteria</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b" style={{ borderColor: '#E0E6ED' }}>
                    <th className="text-left py-3 px-4">
                      <Checkbox
                        checked={selectedJobs.length === jobs.length && jobs.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </th>
                    <th className="text-left py-3 px-4 font-medium" style={{ color: '#1A1A1A' }}>Job Name</th>
                    <th className="text-left py-3 px-4 font-medium" style={{ color: '#1A1A1A' }}>Type</th>
                    <th className="text-left py-3 px-4 font-medium" style={{ color: '#1A1A1A' }}>Status</th>
                    <th className="text-left py-3 px-4 font-medium" style={{ color: '#1A1A1A' }}>Schedule</th>
                    <th className="text-left py-3 px-4 font-medium" style={{ color: '#1A1A1A' }}>Progress</th>
                    <th className="text-left py-3 px-4 font-medium" style={{ color: '#1A1A1A' }}>URLs</th>
                    <th className="text-left py-3 px-4 font-medium" style={{ color: '#1A1A1A' }}>Created</th>
                    <th className="text-left py-3 px-4 font-medium" style={{ color: '#1A1A1A' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id} className="border-b hover:bg-gray-50" style={{ borderColor: '#E0E6ED' }}>
                      <td className="py-3 px-4">
                        <Checkbox
                          checked={selectedJobs.includes(job.id)}
                          onCheckedChange={() => handleSelectJob(job.id)}
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium" style={{ color: '#1A1A1A' }}>{job.name}</div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="secondary" className="capitalize">
                          {job.type}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={`flex items-center gap-1 w-fit ${getStatusColor(job.status)}`}>
                          {getStatusIcon(job.status)}
                          <span className="capitalize">{job.status}</span>
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={`${getScheduleTypeColor(job.schedule_type)}`}>
                          {job.schedule_type}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="w-24">
                          <Progress value={job.progress_percentage} className="h-2" />
                          <div className="text-xs text-center mt-1" style={{ color: '#6C757D' }}>
                            {job.progress_percentage}%
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm">
                          <div style={{ color: '#1A1A1A' }}>Total: {job.total_urls}</div>
                          <div style={{ color: '#4BB543' }}>Success: {job.successful_urls}</div>
                          <div style={{ color: '#E63946' }}>Failed: {job.failed_urls}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm" style={{ color: '#6C757D' }}>
                          {formatDate(job.created_at)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Link href={`/dashboard/tools/fastindexing/manage-jobs/${job.id}`}>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {job.status === 'running' && (
                                <DropdownMenuItem onClick={() => handleJobAction(job.id, 'pause')}>
                                  <Pause className="h-4 w-4 mr-2" />
                                  Pause
                                </DropdownMenuItem>
                              )}
                              {job.status === 'paused' && (
                                <DropdownMenuItem onClick={() => handleJobAction(job.id, 'resume')}>
                                  <Play className="h-4 w-4 mr-2" />
                                  Resume
                                </DropdownMenuItem>
                              )}
                              {(job.status === 'running' || job.status === 'paused' || job.status === 'pending') && (
                                <DropdownMenuItem onClick={() => handleJobAction(job.id, 'cancel')}>
                                  <Archive className="h-4 w-4 mr-2" />
                                  Cancel
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem 
                                onClick={() => handleJobAction(job.id, 'delete')}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm" style={{ color: '#6C757D' }}>
            Showing page {currentPage} of {totalPages} ({totalJobs} total jobs)
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              size="sm"
              variant="outline"
              className="flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                return (
                  <Button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    size="sm"
                    variant={currentPage === pageNum ? "default" : "outline"}
                    className="w-8"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              size="sm"
              variant="outline"
              className="flex items-center gap-1"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}