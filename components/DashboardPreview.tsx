'use client'

import { useState, useEffect, useRef } from 'react'

interface DashboardPreviewProps {
  title: string
  subtitle: string
  variant?: 'login' | 'register'
}

export default function DashboardPreview({ title, subtitle, variant = 'login' }: DashboardPreviewProps) {
  const [mounted, setMounted] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Mock rank tracking data for preview
  const mockStats = [
    { label: 'Keywords Tracked', value: '2,847', change: '+12%', positive: true },
    { label: 'Top 10 Positions', value: '342', change: '+8.2%', positive: true },
    { label: 'Avg Position', value: '8.4', change: '-1.3', positive: true },
    { label: 'Improving', value: '156', change: '+24', positive: true }
  ]

  const mockKeywords = [
    { keyword: 'seo tools online', position: 3, change: 2, url: '/seo-tools', country: 'US' },
    { keyword: 'rank tracker free', position: 7, change: -1, url: '/rank-tracker', country: 'UK' },
    { keyword: 'keyword research', position: 12, change: 3, url: '/keywords', country: 'CA' },
    { keyword: 'serp analysis', position: 5, change: 0, url: '/serp-checker', country: 'AU' },
    { keyword: 'local seo tools', position: 15, change: -2, url: '/local-seo', country: 'DE' }
  ]

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div style={{ 
        width: '100%', 
        height: '100%', 
        backgroundColor: '#f8fafc', 
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ color: '#64748b', fontSize: '14px' }}>Loading preview...</div>
      </div>
    )
  }

  return (
    <div ref={containerRef} style={{
      width: '100%',
      height: '100%',
      minHeight: '320px',
      maxHeight: '400px',
      backgroundColor: '#ffffff',
      borderRadius: '16px',
      padding: '16px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      border: '1px solid #e2e8f0',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Dashboard Content */}
      <div style={{ width: '100%' }}>
        {/* Top Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px',
          marginBottom: '16px'
        }}>
          {mockStats.map((stat, index) => (
            <div key={index} style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '12px',
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '10px',
                color: '#64748b',
                marginBottom: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {stat.label}
              </div>
              <div style={{
                fontSize: '18px',
                fontWeight: '700',
                color: '#1e293b',
                marginBottom: '2px'
              }}>
                {stat.value}
              </div>
              <div style={{
                fontSize: '11px',
                color: stat.positive ? '#16a34a' : '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span style={{ marginRight: '2px' }}>
                  {stat.positive ? '↗' : '↘'}
                </span>
                {stat.change}
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Area */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.5fr 1fr',
          gap: '16px'
        }}>
          {/* Rank Chart Area */}
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '16px'
          }}>
            <h3 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#1e293b',
              marginBottom: '12px'
            }}>
              Position Trends
            </h3>

            {/* Mock Chart */}
            <div style={{
              height: '100px',
              position: 'relative',
              background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'flex-end',
              padding: '12px',
              gap: '4px'
            }}>
              {[45, 38, 52, 29, 35, 48, 41, 56, 33, 42, 38, 44].map((height, index) => (
                <div key={index} style={{
                  flex: '1',
                  backgroundColor: `hsl(${200 + (height * 0.8)}, 70%, 50%)`,
                  height: `${height + 20}%`,
                  borderRadius: '2px 2px 0 0',
                  minHeight: '8px',
                  opacity: '0.8'
                }} />
              ))}
            </div>
          </div>

          {/* Top Keywords */}
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '16px'
          }}>
            <h3 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#1e293b',
              marginBottom: '12px'
            }}>
              Top Keywords
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {mockKeywords.slice(0, 4).map((keyword, index) => (
                <div key={index} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px',
                  backgroundColor: '#ffffff',
                  borderRadius: '6px',
                  border: '1px solid #f1f5f9'
                }}>
                  <div style={{ flex: '1', minWidth: '0' }}>
                    <div style={{
                      fontSize: '12px',
                      color: '#1e293b',
                      fontWeight: '500',
                      marginBottom: '2px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {keyword.keyword}
                    </div>
                    <div style={{
                      fontSize: '10px',
                      color: '#64748b'
                    }}>
                      {keyword.url} • {keyword.country}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#1e293b'
                    }}>
                      #{keyword.position}
                    </span>
                    <span style={{
                      fontSize: '10px',
                      color: keyword.change >= 0 ? '#16a34a' : '#dc2626'
                    }}>
                      {keyword.change > 0 ? '+' : ''}{keyword.change}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}