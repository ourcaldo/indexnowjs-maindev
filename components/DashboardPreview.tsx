
'use client'

import { useState, useEffect } from 'react'

interface DashboardPreviewProps {
  title: string
  subtitle: string
  variant?: 'login' | 'register' | 'forgot'
}

const slides = [
  {
    title: "Real-time Analytics Dashboard",
    description: "Monitor your indexing performance with live charts and metrics",
    stats: [
      { value: "189K", label: "URLs Indexed", color: "#1a1a1a", bg: "#f8f9fa" },
      { value: "97.8%", label: "Success Rate", color: "#0284c7", bg: "#f0f9ff", border: "#e0f2fe" },
      { value: "2.4s", label: "Avg Response", color: "#059669", bg: "#f0fdf4", border: "#dcfce7" }
    ],
    chartData: [
      { height: '45%', value: '1.2K' },
      { height: '60%', value: '1.8K' },
      { height: '35%', value: '890' },
      { height: '75%', value: '2.1K' },
      { height: '55%', value: '1.5K' },
      { height: '85%', value: '2.4K' },
      { height: '95%', value: '2.8K' }
    ],
    bottomMetrics: [
      { value: "12", label: "Active Accounts", color: "#ea580c", bg: "#fff7ed", border: "#fed7aa" },
      { value: "47", label: "Scheduled Jobs", color: "#4b5563", bg: "#f3f4f6", border: "#e5e7eb" }
    ],
    status: { color: "#22c55e", label: "LIVE" }
  },
  {
    title: "Multi-Account Management",
    description: "Load balance across multiple Google service accounts efficiently",
    stats: [
      { value: "8", label: "Service Accounts", color: "#1a1a1a", bg: "#f8f9fa" },
      { value: "99.9%", label: "Uptime", color: "#059669", bg: "#f0fdf4", border: "#dcfce7" },
      { value: "45K", label: "Daily Quota", color: "#7c3aed", bg: "#faf5ff", border: "#e9d5ff" }
    ],
    chartData: [
      { height: '85%', value: '5.2K' },
      { height: '70%', value: '4.1K' },
      { height: '90%', value: '5.8K' },
      { height: '65%', value: '3.9K' },
      { height: '95%', value: '6.1K' },
      { height: '75%', value: '4.5K' },
      { height: '80%', value: '4.8K' }
    ],
    bottomMetrics: [
      { value: "8", label: "Connected APIs", color: "#059669", bg: "#f0fdf4", border: "#dcfce7" },
      { value: "156", label: "Requests/min", color: "#0284c7", bg: "#f0f9ff", border: "#e0f2fe" }
    ],
    status: { color: "#059669", label: "ACTIVE" }
  },
  {
    title: "Advanced Scheduling System",
    description: "Set up automated indexing with flexible scheduling options",
    stats: [
      { value: "24", label: "Active Jobs", color: "#1a1a1a", bg: "#f8f9fa" },
      { value: "5.2K", label: "Scheduled Today", color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" },
      { value: "98.5%", label: "Completion Rate", color: "#059669", bg: "#f0fdf4", border: "#dcfce7" }
    ],
    chartData: [
      { height: '60%', value: '2.8K' },
      { height: '45%', value: '2.1K' },
      { height: '75%', value: '3.5K' },
      { height: '55%', value: '2.6K' },
      { height: '80%', value: '3.8K' },
      { height: '65%', value: '3.1K' },
      { height: '70%', value: '3.3K' }
    ],
    bottomMetrics: [
      { value: "6", label: "Job Types", color: "#7c3aed", bg: "#faf5ff", border: "#e9d5ff" },
      { value: "2.1K", label: "Queue Size", color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" }
    ],
    status: { color: "#f59e0b", label: "SCHEDULED" }
  },
  {
    title: "Performance Insights",
    description: "Deep analytics and insights to optimize your indexing strategy",
    stats: [
      { value: "2.1M", label: "Total Processed", color: "#1a1a1a", bg: "#f8f9fa" },
      { value: "94.2%", label: "Index Success", color: "#059669", bg: "#f0fdf4", border: "#dcfce7" },
      { value: "1.8s", label: "Avg Latency", color: "#0284c7", bg: "#f0f9ff", border: "#e0f2fe" }
    ],
    chartData: [
      { height: '70%', value: '14K' },
      { height: '85%', value: '17K' },
      { height: '65%', value: '13K' },
      { height: '90%', value: '18K' },
      { height: '75%', value: '15K' },
      { height: '95%', value: '19K' },
      { height: '80%', value: '16K' }
    ],
    bottomMetrics: [
      { value: "15", label: "Error Types", color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
      { value: "3.2K", label: "Retries/day", color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" }
    ],
    status: { color: "#0284c7", label: "ANALYZING" }
  },
  {
    title: "API Integration Hub",
    description: "Connect with Google Search Console and other SEO tools seamlessly",
    stats: [
      { value: "5", label: "Integrations", color: "#1a1a1a", bg: "#f8f9fa" },
      { value: "99.8%", label: "API Reliability", color: "#059669", bg: "#f0fdf4", border: "#dcfce7" },
      { value: "127", label: "Endpoints", color: "#7c3aed", bg: "#faf5ff", border: "#e9d5ff" }
    ],
    chartData: [
      { height: '55%', value: '8.2K' },
      { height: '75%', value: '11K' },
      { height: '85%', value: '12K' },
      { height: '65%', value: '9.5K' },
      { height: '90%', value: '13K' },
      { height: '70%', value: '10K' },
      { height: '80%', value: '12K' }
    ],
    bottomMetrics: [
      { value: "98", label: "Webhooks", color: "#ec4899", bg: "#fdf2f8", border: "#fce7f3" },
      { value: "45", label: "Rate Limits", color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb" }
    ],
    status: { color: "#7c3aed", label: "CONNECTED" }
  }
]

export default function DashboardPreview({ title, subtitle, variant = 'login' }: DashboardPreviewProps) {
  const [currentSlide, setCurrentSlide] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 4000) // 4 seconds per slide

    return () => clearInterval(interval)
  }, [])

  const currentData = slides[currentSlide]

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
    <div style={{ maxWidth: '500px', width: '100%' }}>
      <h2 style={{
        fontSize: '36px',
        fontWeight: '700',
        lineHeight: '1.2',
        marginBottom: '24px'
      }}>
        {styles.title}
      </h2>
      <p style={{
        fontSize: '18px',
        color: '#d1d5db',
        marginBottom: '40px',
        lineHeight: '1.6'
      }}>
        {styles.subtitle}
      </p>

      {/* Dashboard Mock */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
        position: 'relative',
        opacity: styles.opacity
      }}>
        {/* Header Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
          marginBottom: '32px'
        }}>
          {currentData.stats.map((stat, idx) => (
            <div key={idx} style={{
              backgroundColor: stat.bg,
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center',
              border: stat.border ? `1px solid ${stat.border}` : 'none'
            }}>
              <div style={{
                fontSize: '28px',
                fontWeight: '800',
                color: stat.color,
                marginBottom: '4px'
              }}>
                {stat.value}
              </div>
              <div style={{
                fontSize: '12px',
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
          padding: '24px',
          marginBottom: '24px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#1a1a1a',
              margin: 0
            }}>
              {currentData.title}
            </h3>
            <div style={{
              fontSize: '12px',
              color: currentData.status.color,
              fontWeight: '500'
            }}>
              ↗
            </div>
          </div>
          
          {/* Chart Bars */}
          <div style={{
            display: 'flex',
            alignItems: 'end',
            justifyContent: 'space-between',
            height: '80px',
            gap: '8px'
          }}>
            {currentData.chartData.map((bar, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <div style={{
                  fontSize: '9px',
                  color: '#6b7280',
                  marginBottom: '4px',
                  fontWeight: '500'
                }}>
                  {bar.value}
                </div>
                <div style={{
                  backgroundColor: idx === 6 ? currentData.status.color : '#d1d5db',
                  height: bar.height,
                  width: '100%',
                  borderRadius: '3px',
                  transition: 'all 0.3s ease'
                }} />
              </div>
            ))}
          </div>
          
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '12px',
            fontSize: '10px',
            color: '#9ca3af',
            fontWeight: '500'
          }}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'].map((day, idx) => (
              <span key={idx} style={{ 
                flex: 1, 
                textAlign: 'center',
                color: idx === 6 ? currentData.status.color : '#9ca3af'
              }}>
                {day}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom Metrics */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '16px'
        }}>
          {currentData.bottomMetrics.map((metric, idx) => (
            <div key={idx} style={{
              backgroundColor: metric.bg,
              borderRadius: '10px',
              padding: '16px',
              border: `1px solid ${metric.border}`
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{
                    fontSize: '20px',
                    fontWeight: '700',
                    color: metric.color,
                    marginBottom: '2px'
                  }}>
                    {metric.value}
                  </div>
                  <div style={{
                    fontSize: '11px',
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

        

        {/* Slide indicators */}
        <div style={{
          position: 'absolute',
          bottom: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '8px'
        }}>
          {slides.map((_, idx) => (
            <div
              key={idx}
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: idx === currentSlide ? currentData.status.color : '#d1d5db',
                transition: 'all 0.3s ease'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
