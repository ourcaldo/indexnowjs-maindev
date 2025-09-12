
'use client'

import { useState, useEffect } from 'react'

interface DashboardPreviewProps {
  title: string
  subtitle: string
  variant?: 'login' | 'register' | 'forgot'
}

// Single dashboard data for IndexNow Rank Tracker
const dashboardData = {
  title: "IndexNow Rank Tracker Dashboard",
  description: "Track your keyword rankings and SEO performance in real-time",
  topMetrics: [
    { value: "8,746", label: "Tracked Keywords", color: "#6366f1", bg: "#f0f0ff" },
    { value: "12,440", label: "Avg Position", color: "#10b981", bg: "#f0fff4" },
    { value: "96", label: "Domains", color: "#f59e0b", bg: "#fffbeb" }
  ],
  chartData: [
    { height: '65%', day: 'Jan' },
    { height: '72%', day: 'Feb' },
    { height: '58%', day: 'Mar' },
    { height: '81%', day: 'Apr' },
    { height: '69%', day: 'May' },
    { height: '85%', day: 'Jun' },
    { height: '77%', day: 'Jul' }
  ],
  keywords: [
    { keyword: "seo tools online", position: 3, trend: "up", change: "+2" },
    { keyword: "rank tracker free", position: 7, trend: "up", change: "+1" },
    { keyword: "keyword monitoring", position: 12, trend: "down", change: "-3" },
    { keyword: "serp analysis", position: 5, trend: "up", change: "+4" }
  ]
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

  const getVariantStyles = () => {
    switch (variant) {
      case 'register':
        return {
          title: title || "Join thousands of developers getting results.",
          subtitle: subtitle || "Create your account and start indexing your URLs instantly with powerful analytics.",
          opacity: 1
        }
      case 'forgot':
        return {
          title: title || "Get back to your indexing dashboard.",
          subtitle: subtitle || "Your analytics and performance data are waiting for you to return.",
          opacity: 0.8
        }
      default:
        return {
          title: title || "Real-time indexing analytics at your fingertips.",
          subtitle: subtitle || "Monitor performance, track success rates, and manage your URL indexing operations.",
          opacity: 1
        }
    }
  }

  const styles = getVariantStyles()

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
        marginBottom: '24px',
        color: '#ffffff'
      }}>
        {styles.title}
      </h2>
      <p style={{
        fontSize: isMobile ? '16px' : '18px',
        color: '#d1d5db',
        marginBottom: '40px',
        lineHeight: '1.6'
      }}>
        {styles.subtitle}
      </p>

      {/* Dark Dashboard Interface */}
      <div style={{
        backgroundColor: '#1f2937',
        borderRadius: '16px',
        padding: isMobile ? '20px' : '24px',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
        position: 'relative',
        width: '100%',
        maxWidth: isMobile ? '350px' : '500px',
        border: '1px solid #374151'
      }}>
        {/* Header with Navigation */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: '1px solid #374151'
        }}>
          <h3 style={{
            fontSize: isMobile ? '16px' : '18px',
            fontWeight: '600',
            color: '#ffffff',
            margin: 0
          }}>
            My dashboard
          </h3>
          <div style={{
            fontSize: '12px',
            color: '#10b981',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <div style={{
              width: '6px',
              height: '6px',
              backgroundColor: '#10b981',
              borderRadius: '50%'
            }} />
            LIVE
          </div>
        </div>

        {/* Top Metrics Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(1, 1fr)' : 'repeat(3, 1fr)',
          gap: isMobile ? '12px' : '16px',
          marginBottom: '24px'
        }}>
          {dashboardData.topMetrics.map((metric, idx) => (
            <div key={idx} style={{
              backgroundColor: '#374151',
              borderRadius: '8px',
              padding: isMobile ? '16px' : '18px',
              border: '1px solid #4b5563'
            }}>
              <div style={{
                fontSize: isMobile ? '20px' : '24px',
                fontWeight: '700',
                color: '#ffffff',
                marginBottom: '4px'
              }}>
                {metric.value}
              </div>
              <div style={{
                fontSize: isMobile ? '11px' : '12px',
                color: '#9ca3af',
                fontWeight: '500'
              }}>
                {metric.label}
              </div>
              <div style={{
                marginTop: '8px',
                fontSize: '10px',
                color: metric.color,
                fontWeight: '500'
              }}>
                {idx === 0 ? '+2.4%' : idx === 1 ? '+9.2%' : '+5.8%'}
              </div>
            </div>
          ))}
        </div>

        {/* Chart Area */}
        <div style={{
          backgroundColor: '#374151',
          borderRadius: '8px',
          padding: isMobile ? '16px' : '20px',
          marginBottom: '20px',
          border: '1px solid #4b5563'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h4 style={{
              fontSize: isMobile ? '14px' : '15px',
              fontWeight: '600',
              color: '#ffffff',
              margin: 0
            }}>
              Ranking Trends
            </h4>
            <div style={{
              fontSize: '12px',
              color: '#10b981',
              fontWeight: '500'
            }}>
              ↗ +12%
            </div>
          </div>
          
          {/* Chart Bars */}
          <div style={{
            display: 'flex',
            alignItems: 'end',
            justifyContent: 'space-between',
            height: isMobile ? '50px' : '60px',
            gap: isMobile ? '4px' : '6px'
          }}>
            {dashboardData.chartData.map((bar, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <div style={{
                  backgroundColor: idx === 6 ? '#10b981' : '#6b7280',
                  height: bar.height,
                  width: '100%',
                  borderRadius: '2px',
                  transition: 'all 0.3s ease'
                }} />
              </div>
            ))}
          </div>
          
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '8px',
            fontSize: '9px',
            color: '#6b7280',
            fontWeight: '500'
          }}>
            {dashboardData.chartData.map((item, idx) => (
              <span key={idx} style={{ 
                flex: 1, 
                textAlign: 'center'
              }}>
                {item.day}
              </span>
            ))}
          </div>
        </div>

        {/* Keywords List */}
        <div style={{
          backgroundColor: '#374151',
          borderRadius: '8px',
          padding: isMobile ? '16px' : '20px',
          border: '1px solid #4b5563'
        }}>
          <h4 style={{
            fontSize: isMobile ? '14px' : '15px',
            fontWeight: '600',
            color: '#ffffff',
            margin: '0 0 16px 0'
          }}>
            Top Keywords
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {dashboardData.keywords.map((keyword, idx) => (
              <div key={idx} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 0',
                borderBottom: idx < dashboardData.keywords.length - 1 ? '1px solid #4b5563' : 'none'
              }}>
                <div style={{
                  fontSize: isMobile ? '12px' : '13px',
                  color: '#ffffff',
                  fontWeight: '500',
                  flex: 1
                }}>
                  {keyword.keyword}
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{
                    fontSize: '12px',
                    color: '#9ca3af'
                  }}>
                    #{keyword.position}
                  </span>
                  <span style={{
                    fontSize: '11px',
                    color: keyword.trend === 'up' ? '#10b981' : '#ef4444',
                    fontWeight: '600'
                  }}>
                    {keyword.change}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
