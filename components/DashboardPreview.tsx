
'use client'

import { useState, useEffect } from 'react'

interface DashboardPreviewProps {
  title: string
  subtitle: string
  variant?: 'login' | 'register' | 'forgot'
}

// Single comprehensive IndexNow Rank Tracker dashboard preview
const dashboardData = {
  title: "IndexNow Rank Tracker",
  description: "Professional keyword ranking monitoring with real-time SEO insights",
  stats: [
    { value: "1,247", label: "Keywords Tracked", color: "#1a1a1a", bg: "#f8f9fa" },
    { value: "89", label: "Top 10 Positions", color: "#4BB543", bg: "#f0fdf4", border: "#dcfce7" },
    { value: "12.4", label: "Average Position", color: "#5B7BBF", bg: "#f0f4ff", border: "#e0e8ff" }
  ],
  rankingChart: [
    { height: '45%', value: '156', change: '+12' },
    { height: '60%', value: '203', change: '+8' },
    { height: '35%', value: '124', change: '-5' },
    { height: '75%', value: '287', change: '+23' },
    { height: '55%', value: '198', change: '+2' },
    { height: '85%', value: '324', change: '+18' },
    { height: '95%', value: '389', change: '+27' }
  ],
  domains: [
    { name: "example.com", keywords: 324, avgPos: 8.5, trend: "up" },
    { name: "mysite.org", keywords: 198, avgPos: 12.1, trend: "stable" },
    { name: "business.net", keywords: 287, avgPos: 15.3, trend: "down" }
  ],
  bottomMetrics: [
    { value: "15", label: "Active Domains", color: "#5B7BBF", bg: "#f0f4ff", border: "#e0e8ff" },
    { value: "24", label: "Countries", color: "#F0A202", bg: "#fffbeb", border: "#fde68a" }
  ],
  status: { color: "#4BB543", label: "LIVE TRACKING" }
}

export default function DashboardPreview({ title, subtitle, variant = 'login' }: DashboardPreviewProps) {
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return
    
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    checkIfMobile()
    window.addEventListener('resize', checkIfMobile)
    
    return () => window.removeEventListener('resize', checkIfMobile)
  }, [mounted])

  const styles = {
    title: title || "IndexNow Rank Tracker Dashboard",
    subtitle: subtitle || "Professional keyword ranking monitoring with real-time analytics and comprehensive SEO insights.",
    opacity: 1
  }

  if (!mounted) {
    return null
  }

  return (
    <div style={{ 
      maxWidth: isMobile ? '100%' : '500px', 
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: isMobile ? 'center' : 'flex-start',
      textAlign: isMobile ? 'center' : 'left'
    }}>
      <h2 style={{
        fontSize: isMobile ? '28px' : '36px',
        fontWeight: '700',
        lineHeight: '1.2',
        marginBottom: '16px'
      }}>
        {styles.title}
      </h2>
      <p style={{
        fontSize: isMobile ? '16px' : '18px',
        color: '#d1d5db',
        marginBottom: '32px',
        lineHeight: '1.6'
      }}>
        {styles.subtitle}
      </p>

      {/* Dashboard Mock Slideshow */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: isMobile ? '20px' : '32px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
        position: 'relative',
        opacity: styles.opacity,
        width: '100%',
        maxWidth: isMobile ? '350px' : '500px'
      }}>
        {/* Header Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(1, 1fr)' : 'repeat(3, 1fr)',
          gap: isMobile ? '12px' : '16px',
          marginBottom: isMobile ? '24px' : '32px'
        }}>
          {dashboardData.stats.map((stat, idx) => (
            <div key={idx} style={{
              backgroundColor: stat.bg,
              borderRadius: '12px',
              padding: isMobile ? '16px' : '20px',
              textAlign: 'center',
              border: stat.border ? `1px solid ${stat.border}` : 'none'
            }}>
              <div style={{
                fontSize: isMobile ? '20px' : '24px',
                fontWeight: '800',
                color: stat.color,
                marginBottom: '4px'
              }}>
                {stat.value}
              </div>
              <div style={{
                fontSize: isMobile ? '11px' : '12px',
                color: stat.color === '#1a1a1a' ? '#6b7280' : stat.color,
                fontWeight: '500'
              }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Chart Area */}
        <div style={{
          backgroundColor: '#fafafa',
          borderRadius: '12px',
          padding: isMobile ? '16px' : '24px',
          marginBottom: isMobile ? '16px' : '24px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h3 style={{
              fontSize: isMobile ? '14px' : '16px',
              fontWeight: '600',
              color: '#1a1a1a',
              margin: 0
            }}>
              {dashboardData.title}
            </h3>
            <div style={{
              fontSize: '12px',
              color: dashboardData.status.color,
              fontWeight: '600',
              backgroundColor: `${dashboardData.status.color}15`,
              padding: '4px 8px',
              borderRadius: '6px'
            }}>
              {dashboardData.status.label}
            </div>
          </div>
          
          {/* Ranking Chart */}
          <div style={{
            display: 'flex',
            alignItems: 'end',
            justifyContent: 'space-between',
            height: isMobile ? '60px' : '80px',
            gap: isMobile ? '4px' : '8px'
          }}>
            {dashboardData.rankingChart.map((bar, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <div style={{
                  fontSize: '8px',
                  color: bar.change.startsWith('+') ? '#4BB543' : '#E63946',
                  marginBottom: '2px',
                  fontWeight: '600'
                }}>
                  {bar.change}
                </div>
                <div style={{
                  fontSize: '9px',
                  color: '#6b7280',
                  marginBottom: '4px',
                  fontWeight: '500'
                }}>
                  {bar.value}
                </div>
                <div style={{
                  backgroundColor: idx === dashboardData.rankingChart.length - 1 ? dashboardData.status.color : (bar.change.startsWith('+') ? '#4BB543' : '#d1d5db'),
                  height: bar.height,
                  width: '100%',
                  borderRadius: '3px',
                  transition: 'all 0.3s ease'
                }} />
              </div>
            ))}
          </div>
          
          <div style={{
            marginTop: '12px',
            fontSize: '10px',
            color: '#9ca3af',
            fontWeight: '500',
            textAlign: 'center'
          }}>
            {dashboardData.description}
          </div>
        </div>

        {/* Domain List */}
        <div style={{
          marginBottom: isMobile ? '16px' : '24px'
        }}>
          <div style={{
            fontSize: isMobile ? '12px' : '14px',
            color: '#1a1a1a',
            fontWeight: '600',
            marginBottom: '12px'
          }}>
            Top Domains
          </div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {dashboardData.domains.slice(0, 3).map((domain, idx) => (
              <div key={idx} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#fafafa',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{
                  fontSize: '11px',
                  fontWeight: '600',
                  color: '#1a1a1a'
                }}>
                  {domain.name}
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span style={{
                    fontSize: '10px',
                    color: '#6b7280'
                  }}>
                    {domain.keywords} keywords
                  </span>
                  <span style={{
                    fontSize: '10px',
                    color: domain.trend === 'up' ? '#4BB543' : domain.trend === 'down' ? '#E63946' : '#6b7280'
                  }}>
                    {domain.trend === 'up' ? '↗' : domain.trend === 'down' ? '↘' : '→'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Metrics */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(1, 1fr)' : 'repeat(2, 1fr)',
          gap: isMobile ? '12px' : '16px'
        }}>
          {dashboardData.bottomMetrics.map((metric, idx) => (
            <div key={idx} style={{
              backgroundColor: metric.bg,
              borderRadius: '10px',
              padding: isMobile ? '12px' : '16px',
              border: `1px solid ${metric.border}`
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{
                    fontSize: isMobile ? '16px' : '18px',
                    fontWeight: '700',
                    color: metric.color,
                    marginBottom: '2px'
                  }}>
                    {metric.value}
                  </div>
                  <div style={{
                    fontSize: isMobile ? '10px' : '11px',
                    color: metric.color,
                    fontWeight: '500'
                  }}>
                    {metric.label}
                  </div>
                </div>
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: metric.color,
                  borderRadius: '50%'
                }} />
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
