'use client'

import { useState, useEffect, useRef } from 'react'

interface DashboardPreviewProps {
  title: string
  subtitle: string
  variant?: 'login' | 'register' | 'forgot'
}

export default function DashboardPreview({ title, subtitle, variant = 'login' }: DashboardPreviewProps) {
  const [mounted, setMounted] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Mock dashboard data for preview
  const dashboardData = {
    keywords: [
      { keyword: 'seo tools', position: 3, change: '+2' },
      { keyword: 'rank tracking', position: 7, change: '-1' },
      { keyword: 'website indexing', position: 12, change: '+5' },
      { keyword: 'google indexing', position: 8, change: '0' },
      { keyword: 'seo optimization', position: 15, change: '+3' }
    ]
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="w-full h-full bg-white rounded-lg flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef}
      className="w-full h-full overflow-hidden"
      style={{ 
        minHeight: '100%',
        boxSizing: 'border-box'
      }}
    >
      {/* Dashboard Container - Full size, light theme matching reference */}
      <div style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#ffffff',
        color: '#000000',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        overflow: 'hidden',
        display: 'flex',
        boxSizing: 'border-box',
        position: 'relative'
      }}>
        
        {/* Sidebar */}
        <div style={{
          width: '240px',
          backgroundColor: '#f8fafc',
          borderRight: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          overflow: 'hidden'
        }}>
          {/* Search bar */}
          <div style={{
            padding: '16px',
            borderBottom: '1px solid #e2e8f0'
          }}>
            <div style={{
              backgroundColor: '#f1f5f9',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '14px',
              color: '#64748b',
              border: '1px solid #e2e8f0'
            }}>
              🔍 Search
            </div>
          </div>

          {/* Navigation */}
          <div style={{ padding: '16px 0', flex: 1 }}>
            {[
              { name: 'Home', active: false },
              { name: 'Dashboard', active: true },
              { name: 'Projects', active: false },
              { name: 'Tasks', active: false },
              { name: 'Reporting', active: false },
              { name: 'Users', active: false }
            ].map((item, idx) => (
              <div key={item.name} style={{
                fontSize: '14px',
                color: item.active ? '#0f172a' : '#64748b',
                fontWeight: item.active ? '500' : '400',
                backgroundColor: item.active ? '#f1f5f9' : 'transparent',
                padding: '8px 24px',
                margin: '2px 8px',
                borderRadius: '6px',
                cursor: 'pointer',
                borderLeft: item.active ? '3px solid #3b82f6' : '3px solid transparent'
              }}>
                {item.name}
              </div>
            ))}
          </div>

          {/* Settings at bottom */}
          <div style={{ 
            padding: '16px',
            borderTop: '1px solid #e2e8f0'
          }}>
            <div style={{
              fontSize: '14px',
              color: '#64748b',
              padding: '8px 24px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}>
              ⚙️ Settings
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div style={{
          flex: 1,
          backgroundColor: '#ffffff',
          overflow: 'hidden',
          position: 'relative'
        }}>
          
          {/* Header */}
          <div style={{
            padding: '24px 32px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#ffffff'
          }}>
            <h1 style={{
              fontSize: '28px',
              fontWeight: '600',
              color: '#0f172a',
              margin: 0
            }}>
              My dashboard
            </h1>
            <div style={{
              fontSize: '14px',
              color: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: '500'
            }}>
              💬 What's new? ●
            </div>
          </div>

          {/* Metrics Grid */}
          <div style={{
            padding: '32px',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '24px'
          }}>
            {[
              { value: '$8,746.22', label: 'All revenue', trend: '+2.4%', up: true },
              { value: '12,440', label: 'Page Views', trend: '+6.2%', up: true },
              { value: '96', label: 'Active', trend: '', up: null }
            ].map((metric, idx) => (
              <div key={idx} style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
              }}>
                <div style={{
                  fontSize: '13px',
                  color: '#64748b',
                  marginBottom: '8px',
                  fontWeight: '500'
                }}>
                  {metric.label}
                </div>
                <div style={{
                  fontSize: '32px',
                  fontWeight: '700',
                  color: '#0f172a',
                  marginBottom: '8px',
                  lineHeight: '1.2'
                }}>
                  {metric.value}
                </div>
                {metric.trend && (
                  <div style={{
                    fontSize: '14px',
                    color: metric.up ? '#059669' : '#dc2626',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <span>{metric.up ? '↗' : '↘'}</span>
                    {metric.trend}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Net Revenue Section */}
          <div style={{
            padding: '0 32px 24px',
            position: 'relative'
          }}>
            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px'
              }}>
                <span style={{
                  fontSize: '13px',
                  color: '#64748b',
                  fontWeight: '500'
                }}>
                  Net revenue
                </span>
                <div style={{
                  display: 'flex',
                  gap: '16px',
                  fontSize: '13px',
                  color: '#64748b'
                }}>
                  <span style={{ color: '#0f172a', fontWeight: '500' }}>12 months</span>
                  <span>30 days</span>
                  <span>7 da...</span>
                </div>
              </div>
              <div style={{
                fontSize: '32px',
                fontWeight: '700',
                color: '#0f172a',
                marginBottom: '8px'
              }}>
                $7,804.16
              </div>
              <div style={{
                fontSize: '14px',
                color: '#059669',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <span>↗</span>
                +2.4%
              </div>
            </div>
          </div>

          {/* Chart Section */}
          <div style={{
            padding: '0 32px 24px'
          }}>
            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
              height: '200px',
              position: 'relative'
            }}>
              {/* Chart placeholder with smooth curve */}
              <svg width="100%" height="100%" viewBox="0 0 400 160" style={{ overflow: 'visible' }}>
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{stopColor: '#3b82f6', stopOpacity: 0.2}} />
                    <stop offset="100%" style={{stopColor: '#3b82f6', stopOpacity: 0}} />
                  </linearGradient>
                </defs>
                <path 
                  d="M 0 120 Q 50 100 100 90 T 200 70 T 300 60 Q 350 55 400 50" 
                  stroke="#3b82f6" 
                  strokeWidth="2" 
                  fill="none"
                />
                <path 
                  d="M 0 120 Q 50 100 100 90 T 200 70 T 300 60 Q 350 55 400 50 L 400 160 L 0 160 Z" 
                  fill="url(#gradient)"
                />
                {/* Month labels */}
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'].map((month, i) => (
                  <text 
                    key={month}
                    x={i * 45 + 20} 
                    y={150} 
                    fontSize="12" 
                    fill="#64748b" 
                    textAnchor="middle"
                  >
                    {month}
                  </text>
                ))}
              </svg>
            </div>
          </div>

          {/* Customers Section - Partially cut off to show it continues */}
          <div style={{
            padding: '0 32px',
            height: '120px',
            overflow: 'hidden'
          }}>
            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px'
              }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#0f172a',
                  margin: 0
                }}>
                  Customers
                </h3>
                <div style={{
                  backgroundColor: '#f1f5f9',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '13px',
                  color: '#64748b',
                  border: '1px solid #e2e8f0'
                }}>
                  🔍 Search
                </div>
              </div>
              
              {/* Table header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 2fr 1fr 1fr',
                gap: '16px',
                padding: '8px 0',
                borderBottom: '1px solid #e2e8f0',
                fontSize: '13px',
                color: '#64748b',
                fontWeight: '500'
              }}>
                <div>Customer</div>
                <div>Email</div>
                <div>Date</div>
                <div>Status</div>
              </div>
              
              {/* Customer row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 2fr 1fr 1fr',
                gap: '16px',
                padding: '12px 0',
                fontSize: '14px',
                color: '#0f172a',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    LR
                  </div>
                  Lily Ross Coulson
                </div>
                <div style={{ color: '#64748b' }}>lilyrosscoulson@gmail.com</div>
                <div style={{ color: '#64748b' }}>Jan 18, 2025</div>
                <div>
                  <span style={{
                    backgroundColor: '#dcfce7',
                    color: '#059669',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    Paid
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}