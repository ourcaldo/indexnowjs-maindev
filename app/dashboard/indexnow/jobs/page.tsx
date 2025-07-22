'use client'

import { useState } from 'react'
import { SearchIcon, FilterIcon, CalendarIcon } from 'lucide-react'

export default function JobsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [scheduleFilter, setScheduleFilter] = useState('All Schedules')

  const jobs = [
    {
      id: '#Job-1753025054083-857',
      created: '20/7/2025, 22.24.42',
      schedule: 'one-time',
      urls: { total: 100, success: 0, failed: 0 },
      status: 'Paused',
      progress: { completed: 0, total: 100 }
    },
    {
      id: '#Job-22',
      created: '18/7/2025, 13.02.11',
      schedule: 'one-time', 
      urls: { total: 1, success: 0, failed: 1 },
      status: 'Completed',
      progress: { completed: 1, total: 1 }
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{color: '#1A1A1A'}}>Jobs</h1>
        <p className="mt-1" style={{color: '#6C757D'}}>View and manage your indexing jobs</p>
      </div>

      {/* Filters */}
      <div className="p-4 rounded-lg border" style={{backgroundColor: '#FFFFFF', borderColor: '#E0E6ED'}}>
        <div className="flex items-center gap-2 mb-4">
          <FilterIcon className="w-4 h-4" style={{color: '#6C757D'}} />
          <h3 className="font-semibold" style={{color: '#1A1A1A'}}>Filters</h3>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2" style={{color: '#6C757D'}} />
            <input
              type="text"
              placeholder="Search jobs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent"
              style={{borderColor: '#E0E6ED', '--tw-ring-color': '#3D8BFF'} as any}
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent"
            style={{borderColor: '#E0E6ED', '--tw-ring-color': '#3D8BFF'} as any}
          >
            <option>All Status</option>
            <option>Completed</option>
            <option>Running</option>
            <option>Paused</option>
            <option>Failed</option>
          </select>

          {/* Schedule Filter */}
          <select
            value={scheduleFilter}
            onChange={(e) => setScheduleFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent"
            style={{borderColor: '#E0E6ED', '--tw-ring-color': '#3D8BFF'} as any}
          >
            <option>All Schedules</option>
            <option>one-time</option>
            <option>hourly</option>
            <option>daily</option>
            <option>weekly</option>
            <option>monthly</option>
          </select>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="rounded-lg border" style={{backgroundColor: '#FFFFFF', borderColor: '#E0E6ED'}}>
        <div className="p-4 border-b" style={{borderColor: '#E0E6ED'}}>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" style={{color: '#6C757D'}} />
            <h2 className="text-lg font-semibold" style={{color: '#1A1A1A'}}>Indexing Jobs</h2>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{backgroundColor: '#F7F9FC'}}>
              <tr>
                <th className="text-left py-3 px-4">
                  <input type="checkbox" className="rounded border" style={{borderColor: '#E0E6ED'}} />
                </th>
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
              {jobs.map((job, index) => (
                <tr key={job.id} className="border-b transition-colors" style={{borderColor: '#E0E6ED'}}
                    onMouseEnter={(e) => (e.target as HTMLTableRowElement).style.backgroundColor = '#F7F9FC'}
                    onMouseLeave={(e) => (e.target as HTMLTableRowElement).style.backgroundColor = 'transparent'}>
                  <td className="py-3 px-4">
                    <input type="checkbox" className="rounded border" style={{borderColor: '#E0E6ED'}} />
                  </td>
                  <td className="py-3 px-4 font-medium" style={{color: '#1A1A1A'}}>{job.id}</td>
                  <td className="py-3 px-4" style={{color: '#6C757D'}}>{job.created}</td>
                  <td className="py-3 px-4">
                    <span className="text-xs px-2 py-1 rounded-full font-medium" style={{backgroundColor: '#1C2331', color: '#FFFFFF'}}>
                      {job.schedule}
                    </span>
                  </td>
                  <td className="py-3 px-4" style={{color: '#6C757D'}}>
                    <div>{job.urls.total} total</div>
                    <div className="text-xs" style={{color: '#6C757D'}}>
                      {job.urls.success} success, {job.urls.failed} failed
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-xs px-2 py-1 rounded-full font-medium" style={{
                      backgroundColor: job.status === 'Completed' ? '#4BB543' 
                        : job.status === 'Paused' ? '#F0A202' 
                        : '#1C2331',
                      color: job.status === 'Paused' ? '#1A1A1A' : '#FFFFFF'
                    }}>
                      {job.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {job.status === 'Completed' ? (
                      <div className="w-full rounded-full h-2" style={{backgroundColor: '#E0E6ED'}}>
                        <div className="h-2 rounded-full w-full" style={{backgroundColor: '#4BB543'}}></div>
                      </div>
                    ) : (
                      <span style={{color: '#6C757D'}}>{job.progress.completed}/{job.progress.total} processed</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <button className="transition-colors" style={{color: '#6C757D'}}
                      onMouseEnter={(e) => (e.target as HTMLButtonElement).style.color = '#1A1A1A'}
                      onMouseLeave={(e) => (e.target as HTMLButtonElement).style.color = '#6C757D'}>...</button>
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