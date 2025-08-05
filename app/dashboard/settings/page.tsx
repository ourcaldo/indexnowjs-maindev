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
    const tab = searchParams?.get('tab')
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

      {/* Top Tab Navigation */}
      <div className="mb-6">
        <nav className="flex space-x-1 border-b" style={{borderColor: '#E0E6ED'}}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200 border-b-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content Area */}
      <div>
        {renderTabContent()}
      </div>
    </div>
  )
}