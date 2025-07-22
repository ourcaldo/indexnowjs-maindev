'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Archive
} from 'lucide-react';
import Link from 'next/link';

interface Job {
  id: string;
  name: string;
  jobId: string;
  created: string;
  schedule: string;
  urls: {
    total: number;
    success: number;
    failed: number;
  };
  status: 'paused' | 'completed' | 'running' | 'failed';
  progress: number;
}

const mockJobs: Job[] = [
  {
    id: '1753025054083-857',
    name: 'Main Website Sitemap',
    jobId: '#job-1753025054083-857',
    created: '20/7/2025, 22.24.42',
    schedule: 'one-time',
    urls: { total: 100, success: 0, failed: 0 },
    status: 'paused',
    progress: 0
  },
  {
    id: '22',
    name: 'Product Pages', 
    jobId: '#job-22',
    created: '18/7/2025, 13.02.11',
    schedule: 'one-time',
    urls: { total: 1, success: 0, failed: 1 },
    status: 'completed',
    progress: 100
  },
  {
    id: '9',
    name: 'Blog Posts Update',
    jobId: '#job-9', 
    created: '18/7/2025, 02.36.37',
    schedule: 'daily',
    urls: { total: 1, success: 1, failed: 0 },
    status: 'completed',
    progress: 100
  },
  {
    id: '8',
    name: 'Category Pages',
    jobId: '#job-8',
    created: '18/7/2025, 02.35.54', 
    schedule: 'weekly',
    urls: { total: 1, success: 0, failed: 1 },
    status: 'completed',
    progress: 100
  }
];

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
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [scheduleFilter, setScheduleFilter] = useState('All Schedules');
  const [currentPage, setCurrentPage] = useState(1);
  const jobsPerPage = 20;

  // Filter jobs
  const filteredJobs = mockJobs.filter(job => {
    const matchesSearch = job.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         job.jobId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All Status' || job.status === statusFilter.toLowerCase();
    const matchesSchedule = scheduleFilter === 'All Schedules' || job.schedule === scheduleFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesSchedule;
  });

  // Pagination
  const totalPages = Math.ceil(filteredJobs.length / jobsPerPage);
  const startIndex = (currentPage - 1) * jobsPerPage;
  const paginatedJobs = filteredJobs.slice(startIndex, startIndex + jobsPerPage);

  const handleSelectJob = (jobId: string, checked: boolean) => {
    if (checked) {
      setSelectedJobs([...selectedJobs, jobId]);
    } else {
      setSelectedJobs(selectedJobs.filter(id => id !== jobId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedJobs(paginatedJobs.map(job => job.id));
    } else {
      setSelectedJobs([]);
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
              {filteredJobs.length} jobs
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
                    checked={selectedJobs.length === paginatedJobs.length && paginatedJobs.length > 0}
                    onCheckedChange={handleSelectAll}
                    className="border-[#E0E6ED]"
                  />
                </th>
                <th className="text-left p-4 font-medium text-[#1A1A1A]">Name</th>
                <th className="text-left p-4 font-medium text-[#1A1A1A]">Created</th>
                <th className="text-left p-4 font-medium text-[#1A1A1A]">Schedule</th>
                <th className="text-left p-4 font-medium text-[#1A1A1A]">URLs</th>
                <th className="text-left p-4 font-medium text-[#1A1A1A]">Status</th>
                <th className="text-left p-4 font-medium text-[#1A1A1A]">Progress</th>
                <th className="text-left p-4 font-medium text-[#1A1A1A]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedJobs.map((job) => (
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
                      <p className="text-sm text-[#6C757D] mt-1">{job.jobId}</p>
                    </div>
                  </td>
                  <td className="p-4 text-[#1A1A1A]">{job.created}</td>
                  <td className="p-4">
                    <Badge className="bg-[#1C2331] text-white hover:bg-[#0d1b2a]">
                      {job.schedule}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <div className="text-sm">
                      <div className="text-[#1A1A1A] font-medium">{job.urls.total} total</div>
                      <div className="text-[#6C757D]">
                        <span className="text-[#4BB543]">{job.urls.success} success</span>, <span className="text-[#E63946]">{job.urls.failed} failed</span>
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
                        {job.urls.total > 0 ? `${Math.round((job.urls.success + job.urls.failed) / job.urls.total * 100)}%` : '0%'} processed
                      </div>
                      <Progress 
                        value={job.urls.total > 0 ? (job.urls.success + job.urls.failed) / job.urls.total * 100 : 0} 
                        className="h-2 w-24"
                      />
                    </div>
                  </td>
                  <td className="p-4">
                    <Button variant="ghost" size="sm" className="text-[#6C757D] hover:text-[#1A1A1A] hover:bg-[#F7F9FC]">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {paginatedJobs.length === 0 && (
          <div className="p-8 text-center">
            <Archive className="h-12 w-12 text-[#6C757D] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[#1A1A1A] mb-2">No jobs found</h3>
            <p className="text-[#6C757D]">
              {filteredJobs.length === 0 && mockJobs.length > 0 
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
              Showing {startIndex + 1} to {Math.min(startIndex + jobsPerPage, filteredJobs.length)} of {filteredJobs.length} jobs
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