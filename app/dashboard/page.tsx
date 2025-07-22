'use client'

import { PlusIcon, BellIcon, TrendingUpIcon, CalendarIcon, CheckCircleIcon, Database } from 'lucide-react'

export default function Dashboard() {
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 rounded-lg" style={{backgroundColor: '#FFFFFF', border: '1px solid #E0E6ED'}}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{color: '#6C757D'}}>Total URLs Indexed</p>
              <p className="text-3xl font-bold mt-2" style={{color: '#1A1A1A'}}>79</p>
              <p className="text-sm font-semibold mt-1" style={{color: '#4BB543'}}>+12% from last week</p>
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
              <p className="text-3xl font-bold mt-2" style={{color: '#1A1A1A'}}>0</p>
              <p className="text-sm font-semibold mt-1" style={{color: '#F0A202'}}>3 scheduled</p>
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
              <p className="text-3xl font-bold mt-2" style={{color: '#1A1A1A'}}>60.3%</p>
              <p className="text-sm font-semibold mt-1" style={{color: '#4BB543'}}>Excellent</p>
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
              <p className="text-3xl font-bold mt-2" style={{color: '#1A1A1A'}}>195</p>
              <p className="text-sm font-semibold mt-1" style={{color: '#E63946'}}>of 200 daily limit</p>
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
              <tr 
                className="transition-colors" 
                style={{borderBottom: '1px solid #F7F9FC'}}
                onMouseEnter={(e) => (e.target as HTMLTableRowElement).style.backgroundColor = '#F7F9FC'}
                onMouseLeave={(e) => (e.target as HTMLTableRowElement).style.backgroundColor = 'transparent'}
              >
                <td className="py-3 px-4 font-bold" style={{color: '#1A1A1A'}}>#Job-1753025054083-857</td>
                <td className="py-3 px-4" style={{color: '#6C757D'}}>20/7/2025, 22.24.42</td>
                <td className="py-3 px-4">
                  <span className="text-xs px-2 py-1 rounded-full font-medium" style={{backgroundColor: '#1C2331', color: '#FFFFFF'}}>one-time</span>
                </td>
                <td className="py-3 px-4">
                  <div className="font-semibold" style={{color: '#1A1A1A'}}>100 total</div>
                  <div className="text-xs" style={{color: '#6C757D'}}>0 success, 0 failed</div>
                </td>
                <td className="py-3 px-4">
                  <span className="text-xs px-2 py-1 rounded-full font-medium" style={{backgroundColor: '#F0A202', color: '#FFFFFF'}}>Paused</span>
                </td>
                <td className="py-3 px-4 font-semibold" style={{color: '#1A1A1A'}}>0/100 processed</td>
                <td className="py-3 px-4">
                  <button 
                    className="transition-colors" 
                    style={{color: '#6C757D'}}
                    onMouseEnter={(e) => (e.target as HTMLButtonElement).style.color = '#1A1A1A'}
                    onMouseLeave={(e) => (e.target as HTMLButtonElement).style.color = '#6C757D'}
                  >
                    ...
                  </button>
                </td>
              </tr>
              <tr 
                className="transition-colors" 
                style={{borderBottom: '1px solid #F7F9FC'}}
                onMouseEnter={(e) => (e.target as HTMLTableRowElement).style.backgroundColor = '#F7F9FC'}
                onMouseLeave={(e) => (e.target as HTMLTableRowElement).style.backgroundColor = 'transparent'}
              >
                <td className="py-3 px-4 font-bold" style={{color: '#1A1A1A'}}>#Job-22</td>
                <td className="py-3 px-4" style={{color: '#6C757D'}}>18/7/2025, 13.02.11</td>
                <td className="py-3 px-4">
                  <span className="text-xs px-2 py-1 rounded-full font-medium" style={{backgroundColor: '#1C2331', color: '#FFFFFF'}}>one-time</span>
                </td>
                <td className="py-3 px-4">
                  <div className="font-semibold" style={{color: '#1A1A1A'}}>1 total</div>
                  <div className="text-xs font-medium" style={{color: '#E63946'}}>0 success, 1 failed</div>
                </td>
                <td className="py-3 px-4">
                  <span className="text-xs px-2 py-1 rounded-full font-medium" style={{backgroundColor: '#4BB543', color: '#FFFFFF'}}>Completed</span>
                </td>
                <td className="py-3 px-4">
                  <div className="w-full rounded-full h-2" style={{backgroundColor: '#E0E6ED'}}>
                    <div className="h-2 rounded-full" style={{width: '100%', backgroundColor: '#4BB543'}}></div>
                  </div>
                  <span className="text-xs font-medium mt-1" style={{color: '#4BB543'}}>1/1 processed</span>
                </td>
                <td className="py-3 px-4">
                  <button 
                    className="transition-colors" 
                    style={{color: '#6C757D'}}
                    onMouseEnter={(e) => (e.target as HTMLButtonElement).style.color = '#1A1A1A'}
                    onMouseLeave={(e) => (e.target as HTMLButtonElement).style.color = '#6C757D'}
                  >
                    ...
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}