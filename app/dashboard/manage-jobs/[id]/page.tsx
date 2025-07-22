
'use client';

import React, { useState } from 'react';
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

interface URLSubmission {
  id: string;
  url: string;
  status: 'success' | 'failed' | 'pending' | 'quota_exceeded';
  submittedAt: string;
  errorMessage?: string;
  responseTime?: number;
}

// Generate larger mock data set for pagination testing
const generateMockSubmissions = (): URLSubmission[] => {
  const baseUrls = [
    'https://nexjob.tech/lowongan-kerja/host-live-streaming-jakarta',
    'https://nexjob.tech/lowongan-kerja/content-creator-jakarta', 
    'https://nexjob.tech/lowongan-kerja/marketing-specialist-bandung',
    'https://nexjob.tech/lowongan-kerja/web-developer-surabaya',
    'https://nexjob.tech/lowongan-kerja/graphic-designer-yogyakarta',
    'https://nexjob.tech/lowongan-kerja/digital-marketing-manager-jakarta',
    'https://nexjob.tech/lowongan-kerja/ui-ux-designer-bali',
    'https://nexjob.tech/lowongan-kerja/data-scientist-jakarta',
    'https://nexjob.tech/lowongan-kerja/project-manager-surabaya',
    'https://nexjob.tech/lowongan-kerja/content-writer-yogyakarta',
    'https://nexjob.tech/lowongan-kerja/social-media-specialist-bandung',
    'https://nexjob.tech/lowongan-kerja/frontend-developer-jakarta',
    'https://nexjob.tech/lowongan-kerja/backend-developer-surabaya',
    'https://nexjob.tech/lowongan-kerja/mobile-developer-jakarta',
    'https://nexjob.tech/lowongan-kerja/devops-engineer-bandung'
  ];
  
  const statuses: URLSubmission['status'][] = ['success', 'failed', 'pending', 'quota_exceeded'];
  const errorMessages = [
    'Daily quota limit exceeded - job paused',
    'URL not found (404)',
    'Server timeout',
    'Invalid URL format',
    'Permission denied'
  ];
  
  const submissions: URLSubmission[] = [];
  
  for (let i = 0; i < 85; i++) {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const baseUrl = baseUrls[Math.floor(Math.random() * baseUrls.length)];
    const url = i > 0 ? `${baseUrl}-${i}` : baseUrl;
    
    const submission: URLSubmission = {
      id: (i + 1).toString(),
      url,
      status,
      submittedAt: `20/7/2025, 22.${String(38 - Math.floor(i / 4)).padStart(2, '0')}.${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
      responseTime: Math.floor(Math.random() * 500) + 100
    };
    
    if (status === 'failed' || status === 'quota_exceeded') {
      submission.errorMessage = status === 'quota_exceeded' 
        ? 'Daily quota limit exceeded - job paused'
        : errorMessages[Math.floor(Math.random() * errorMessages.length)];
    }
    
    submissions.push(submission);
  }
  
  return submissions;
};

const mockSubmissions = generateMockSubmissions();

const getStatusColor = (status: string) => {
  switch (status) {
    case 'success':
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

// Mock job data based on ID
const getJobData = (id: string) => {
  const jobs = {
    '1753025054083-857': {
      id: '1753025054083-857',
      name: 'Main Website Sitemap',
      status: 'paused' as const,
      schedule: 'one-time',
      created: '20/7/2025',
      lastRun: '20/7/2025, 22.38.02',
      totalUrls: 100,
      processed: 65,
      successful: 45,
      failed: 15,
      progress: 65,
      source: {
        type: 'Sitemap',
        url: 'https://nexjob.tech/sitemap-loker-1.xml'
      }
    },
    '22': {
      id: '22',
      name: 'Product Pages',
      status: 'completed' as const,
      schedule: 'one-time',
      created: '18/7/2025',
      lastRun: '18/7/2025, 13.02.11',
      totalUrls: 1,
      processed: 1,
      successful: 0,
      failed: 1,
      progress: 100,
      source: {
        type: 'Manual',
        url: 'Manual URL list'
      }
    },
    '9': {
      id: '9',
      name: 'Blog Posts Update',
      status: 'completed' as const,
      schedule: 'daily',
      created: '18/7/2025',
      lastRun: '18/7/2025, 02.36.37',
      totalUrls: 1,
      processed: 1,
      successful: 1,
      failed: 0,
      progress: 100,
      source: {
        type: 'Sitemap',
        url: 'https://nexjob.tech/blog-sitemap.xml'
      }
    },
    '8': {
      id: '8',
      name: 'Category Pages',
      status: 'completed' as const,
      schedule: 'weekly',
      created: '18/7/2025',
      lastRun: '18/7/2025, 02.35.54',
      totalUrls: 1,
      processed: 1,
      successful: 0,
      failed: 1,
      progress: 100,
      source: {
        type: 'Sitemap',
        url: 'https://nexjob.tech/category-sitemap.xml'
      }
    }
  };
  
  return jobs[id as keyof typeof jobs] || jobs['1753025054083-857'];
};

export default function JobDetailsPage() {
  const params = useParams();
  const jobId = params.id as string;
  const job = getJobData(jobId);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  // Calculate pagination
  const totalSubmissions = Math.min(mockSubmissions.length, job.processed);
  const totalPages = Math.ceil(totalSubmissions / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSubmissions = mockSubmissions.slice(0, job.processed).slice(startIndex, endIndex);
  
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

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
          <p className="text-[#6C757D] mt-1">Job ID: #{job.id}</p>
        </div>
        <div className="flex items-center gap-2">
          {job.status === 'paused' && (
            <>
              <Button 
                variant="outline" 
                size="sm"
                className="border-[#E0E6ED] text-[#1A1A1A] hover:bg-[#F7F9FC] hover:text-[#1A1A1A]"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Retry Failed
              </Button>
              <Button 
                size="sm"
                className="bg-[#1C2331] text-white hover:bg-[#0d1b2a] hover:text-white"
              >
                <Play className="h-4 w-4 mr-2" />
                Resume Job
              </Button>
            </>
          )}
          {job.status === 'running' && (
            <Button 
              size="sm"
              className="bg-[#F0A202] text-[#1A1A1A] hover:bg-[#F0A202]/90 hover:text-[#1A1A1A]"
            >
              <Pause className="h-4 w-4 mr-2" />
              Pause Job
            </Button>
          )}
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
              <span className="text-sm text-[#6C757D]">Status</span>
              <Badge className={`${getStatusColor(job.status)} flex items-center gap-1`}>
                {getStatusIcon(job.status)}
                {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#6C757D]">Schedule</span>
              <span className="text-sm font-medium text-[#1A1A1A]">{job.schedule}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#6C757D]">Created</span>
              <span className="text-sm font-medium text-[#1A1A1A]">{job.created}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#6C757D]">Last Run</span>
              <span className="text-sm font-medium text-[#1A1A1A]">{job.lastRun}</span>
            </div>
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
              <span className="text-sm text-[#6C757D]">Overall Progress</span>
              <span className="text-sm font-medium text-[#1A1A1A]">{job.progress}%</span>
            </div>
            <Progress value={job.progress} className="h-2" />
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-[#1A1A1A]">{job.totalUrls}</div>
                <div className="text-xs text-[#6C757D]">Total URLs</div>
              </div>
              <div>
                <div className="text-lg font-bold text-[#1A1A1A]">{job.processed}</div>
                <div className="text-xs text-[#6C757D]">Processed</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center pt-2 border-t border-[#E0E6ED]">
              <div>
                <div className="text-lg font-bold text-[#4BB543]">{job.successful}</div>
                <div className="text-xs text-[#6C757D]">Successful</div>
              </div>
              <div>
                <div className="text-lg font-bold text-[#E63946]">{job.failed}</div>
                <div className="text-xs text-[#6C757D]">Failed</div>
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
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-[#6C757D]" />
              <span className="text-sm font-medium text-[#1A1A1A]">{job.source.type}</span>
            </div>
            <div className="text-sm text-[#6C757D] break-all">
              {job.source.url}
            </div>
            {job.source.url.startsWith('http') && (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full border-[#E0E6ED] text-[#1A1A1A] hover:bg-[#F7F9FC] hover:text-[#1A1A1A]"
                asChild
              >
                <a href={job.source.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Source
                </a>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* URL Submissions History */}
      <Card className="bg-white border-[#E0E6ED]">
        <CardHeader>
          <CardTitle className="text-lg text-[#1A1A1A]">URL Submissions</CardTitle>
          <p className="text-sm text-[#6C757D]">Detailed history of each URL submission attempt</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F7F9FC] border-b border-[#E0E6ED]">
                <tr>
                  <th className="text-left p-4 font-medium text-[#1A1A1A]">URL</th>
                  <th className="text-left p-4 font-medium text-[#1A1A1A]">Status</th>
                  <th className="text-left p-4 font-medium text-[#1A1A1A]">Submitted At</th>
                  <th className="text-left p-4 font-medium text-[#1A1A1A]">Error Message</th>
                </tr>
              </thead>
              <tbody>
                {currentSubmissions.map((submission) => (
                  <tr key={submission.id} className="border-b border-[#E0E6ED] hover:bg-[#F7F9FC] transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-[#6C757D] flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-[#1A1A1A] truncate">
                            {submission.url}
                          </div>
                          {submission.responseTime && (
                            <div className="text-xs text-[#6C757D]">
                              Response: {submission.responseTime}ms
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge className={`${getStatusColor(submission.status)} flex items-center gap-1 w-fit`}>
                        {getStatusIcon(submission.status)}
                        {submission.status === 'quota_exceeded' ? 'Quota Exceeded' : 
                         submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-[#1A1A1A]">{submission.submittedAt}</div>
                    </td>
                    <td className="p-4">
                      {submission.errorMessage ? (
                        <div className="text-sm text-[#E63946]">
                          {submission.errorMessage}
                        </div>
                      ) : (
                        <div className="text-sm text-[#6C757D]">-</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalSubmissions > 0 && totalPages > 1 && (
            <div className="p-4 border-t border-[#E0E6ED] bg-[#F7F9FC]">
              <div className="flex items-center justify-between">
                <div className="text-sm text-[#6C757D]">
                  Showing {startIndex + 1} to {Math.min(endIndex, totalSubmissions)} of {totalSubmissions} submissions
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

          {job.processed === 0 && (
            <div className="p-8 text-center">
              <Archive className="h-12 w-12 text-[#6C757D] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[#1A1A1A] mb-2">No submissions yet</h3>
              <p className="text-[#6C757D]">
                This job hasn't started processing URLs yet.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
