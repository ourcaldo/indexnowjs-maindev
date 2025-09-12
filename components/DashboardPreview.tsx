
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

  // Mock dashboard data for preview
  const mockStats = [
    { label: 'URLs Indexed', value: '12,847', change: '+18%', positive: true },
    { label: 'Success Rate', value: '94.2%', change: '+2.1%', positive: true },
    { label: 'Keywords Tracked', value: '248', change: '+5', positive: true },
    { label: 'Avg. Position', value: '8.3', change: '-1.2', positive: true }
  ]

  const mockRecentActivity = [
    { action: 'Batch indexed', count: '156 URLs', time: '2 minutes ago', status: 'success' },
    { action: 'Keyword check', count: '48 keywords', time: '5 minutes ago', status: 'success' },
    { action: 'Sitemap parsed', count: '2,341 URLs', time: '12 minutes ago', status: 'success' },
    { action: 'Rank update', count: '127 positions', time: '18 minutes ago', status: 'success' }
  ]

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div style={{ 
        width: '100%', 
        height: '100%', 
        backgroundColor: '#1a1a1a', 
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ color: '#666', fontSize: '14px' }}>Loading preview...</div>
      </div>
    )
  }

  return (
    <div ref={containerRef} style={{
      width: '100%',
      height: '100%',
      minHeight: '500px',
      backgroundColor: '#0a0a0a',
      borderRadius: '16px',
      padding: '32px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      border: '1px solid #2a2a2a',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Header Text */}
      <div style={{ marginBottom: '40px', textAlign: 'center' }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: '700',
          color: '#ffffff',
          marginBottom: '12px',
          lineHeight: '1.2'
        }}>
          {title}
        </h2>
        <p style={{
          fontSize: '16px',
          color: '#888888',
          lineHeight: '1.5',
          maxWidth: '400px',
          margin: '0 auto'
        }}>
          {subtitle}
        </p>
      </div>

      {/* Dashboard Content */}
      <div style={{ width: '100%' }}>
        {/* Top Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '32px'
        }}>
          {mockStats.map((stat, index) => (
            <div key={index} style={{
              backgroundColor: '#111111',
              border: '1px solid #2a2a2a',
              borderRadius: '12px',
              padding: '20px',
              transition: 'transform 0.2s ease, border-color 0.2s ease',
              cursor: 'default'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.borderColor = '#444444'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.borderColor = '#2a2a2a'
            }}>
              <div style={{
                fontSize: '12px',
                color: '#888888',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {stat.label}
              </div>
              <div style={{
                fontSize: '28px',
                fontWeight: '700',
                color: '#ffffff',
                marginBottom: '4px'
              }}>
                {stat.value}
              </div>
              <div style={{
                fontSize: '14px',
                color: stat.positive ? '#22c55e' : '#ef4444',
                display: 'flex',
                alignItems: 'center'
              }}>
                <span style={{ marginRight: '4px' }}>
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
          gridTemplateColumns: '2fr 1fr',
          gap: '24px'
        }}>
          {/* Performance Chart Area */}
          <div style={{
            backgroundColor: '#111111',
            border: '1px solid #2a2a2a',
            borderRadius: '12px',
            padding: '24px'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#ffffff',
              marginBottom: '20px'
            }}>
              Indexing Performance
            </h3>
            
            {/* Mock Chart */}
            <div style={{
              height: '180px',
              position: 'relative',
              background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'flex-end',
              padding: '20px',
              gap: '8px'
            }}>
              {[65, 78, 45, 89, 92, 67, 84, 76, 95, 88, 71, 93].map((height, index) => (
                <div key={index} style={{
                  flex: '1',
                  backgroundColor: `hsl(${140 + (height * 0.5)}, 70%, 50%)`,
                  height: `${height}%`,
                  borderRadius: '4px 4px 0 0',
                  minHeight: '20px',
                  opacity: '0.8',
                  transition: 'opacity 0.3s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
                />
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div style={{
            backgroundColor: '#111111',
            border: '1px solid #2a2a2a',
            borderRadius: '12px',
            padding: '24px'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#ffffff',
              marginBottom: '20px'
            }}>
              Recent Activity
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {mockRecentActivity.map((activity, index) => (
                <div key={index} style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px',
                  backgroundColor: '#0a0a0a',
                  borderRadius: '8px',
                  border: '1px solid #1a1a1a'
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    backgroundColor: '#22c55e',
                    borderRadius: '50%',
                    marginRight: '12px'
                  }} />
                  <div style={{ flex: '1' }}>
                    <div style={{
                      fontSize: '14px',
                      color: '#ffffff',
                      marginBottom: '2px'
                    }}>
                      {activity.action}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#666666'
                    }}>
                      {activity.count} • {activity.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div style={{
          marginTop: '32px',
          padding: '20px',
          backgroundColor: '#111111',
          border: '1px solid #2a2a2a',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#ffffff',
              marginBottom: '4px'
            }}>
              Ready to get started?
            </div>
            <div style={{
              fontSize: '14px',
              color: '#888888'
            }}>
              Join thousands of users already indexing their content faster
            </div>
          </div>
          <div style={{
            padding: '12px 24px',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background-color 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}>
            Start Free Trial
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div style={{
        position: 'absolute',
        top: '-100px',
        right: '-100px',
        width: '200px',
        height: '200px',
        background: 'radial-gradient(circle, rgba(37, 99, 235, 0.1) 0%, transparent 70%)',
        borderRadius: '50%',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-50px',
        left: '-50px',
        width: '150px',
        height: '150px',
        background: 'radial-gradient(circle, rgba(34, 197, 94, 0.1) 0%, transparent 70%)',
        borderRadius: '50%',
        pointerEvents: 'none'
      }} />
    </div>
  )
}
