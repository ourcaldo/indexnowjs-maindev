'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { usePageViewLogger } from '@/hooks/useActivityLogger'
import { 
  Settings as SettingsIcon, 
  User, 
  Key,
  CreditCard
} from 'lucide-react'
import GeneralSettingsPage from './general/page'
import ProfileSettingsPage from './profile/page'
import ServiceAccountsSettingsPage from './service-accounts/page'
import PlansBillingSettingsPage from './plans-billing/page'

export default function SettingsPage() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState('general')

  // Log page view
  usePageViewLogger('/dashboard/settings', 'Settings', { section: 'user_settings' })

  // Set active tab from URL parameter on load
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && ['general', 'profile', 'service-accounts', 'plans-billing'].includes(tab)) {
      setActiveTab(tab)
    }
  }, [searchParams])

  const tabs = [
    {
      id: 'general',
      label: 'General Settings',
      icon: SettingsIcon,
      description: 'Configure default schedule, timeouts, and notifications'
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      description: 'Update your profile information and password'
    },
    {
      id: 'service-accounts',
      label: 'Service Accounts',
      icon: Key,
      description: 'Manage your Google service accounts for indexing'
    },
    {
      id: 'plans-billing',
      label: 'Plans & Billing',
      icon: CreditCard,
      description: 'Manage your subscription and billing information'
    }
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return <GeneralSettingsPage />
      case 'profile':
        return <ProfileSettingsPage />
      case 'service-accounts':
        return <ServiceAccountsSettingsPage />
      case 'plans-billing':
        return <PlansBillingSettingsPage />
      default:
        return <GeneralSettingsPage />
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2" style={{color: '#1A1A1A'}}>Settings</h1>
        <p className="text-sm" style={{color: '#6C757D'}}>
          Manage your account settings, service accounts, and billing preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <nav className="space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left p-4 rounded-lg transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'font-medium'
                    : ''
                }`}
                style={{
                  backgroundColor: activeTab === tab.id ? '#F7F9FC' : '#FFFFFF',
                  border: '1px solid #E0E6ED',
                  color: activeTab === tab.id ? '#1A1A1A' : '#6C757D'
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.id) {
                    (e.target as HTMLButtonElement).style.backgroundColor = '#F7F9FC'
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.id) {
                    (e.target as HTMLButtonElement).style.backgroundColor = '#FFFFFF'
                  }
                }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <tab.icon className="w-4 h-4" />
                  <span className="font-medium">{tab.label}</span>
                </div>
                <p className="text-xs" style={{color: '#6C757D'}}>
                  {tab.description}
                </p>
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          {renderTabContent()}
        </div>
      </div>
    </div>
  )
}