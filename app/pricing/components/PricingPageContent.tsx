'use client'

import { useState, useEffect } from 'react'
import { authService } from '@/lib/auth'
import { ChevronUp, Menu, X, Check, Star, Shield, Clock, ArrowRight, MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/database/supabase-browser'
import { getUserCurrency } from '@/lib/utils/currency-utils'

// Landing Page Components - Reusing for consistent design
import NeonContainer from '@/components/landing/NeonContainer'
import AdvancedNeonCard from '@/components/landing/AdvancedNeonCard'

interface SiteSettings {
  site_name: string
  site_description: string
  site_logo_url: string
  contact_email: string
}

interface PricingTierData {
  IDR: {
    promo_price: number
    period_label: string
    regular_price: number
  }
  USD: {
    promo_price: number
    period_label: string
    regular_price: number
  }
}

interface Package {
  id: string
  name: string
  description: string
  price: number
  currency: string
  billing_period: string
  features: string[]
  quota_limits: {
    daily_urls?: number
    keywords_limit?: number
    concurrent_jobs?: number
    service_accounts?: number
  }
  is_popular: boolean
  pricing_tiers: {
    annual: PricingTierData
    monthly: PricingTierData
    biannual: PricingTierData
    quarterly: PricingTierData
  }
}

export default function PricingPageContent() {
  const [user, setUser] = useState<any>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null)
  const [packages, setPackages] = useState<Package[]>([])
  const [globalBillingPeriod, setGlobalBillingPeriod] = useState<'monthly' | 'quarterly' | 'biannual' | 'annual'>('monthly')
  const [currency, setCurrency] = useState<'USD' | 'IDR'>('USD')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkAuthStatus()
    loadSiteSettings()
    detectCurrencyAndLoadPackages()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const currentUser = await authService.getCurrentUser()
      setUser(currentUser)
    } catch (error) {
      setUser(null)
    }
  }

  const loadSiteSettings = async () => {
    try {
      const response = await fetch('/api/v1/public/site-settings')
      const data = await response.json()
      setSiteSettings(data)
    } catch (error) {
      console.error('Failed to load site settings:', error)
    }
  }

  const detectCurrencyAndLoadPackages = async () => {
    try {
      setIsLoading(true)
      
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      let detectedCurrency: 'USD' | 'IDR' = 'USD'
      
      if (user) {
        const { data: profile } = await supabase
          .from('indb_auth_user_profiles')
          .select('country')
          .eq('user_id', user.id)
          .single()
        
        if (profile?.country) {
          detectedCurrency = getUserCurrency(profile.country)
        }
      } else {
        try {
          const locationResponse = await fetch('/api/v1/auth/detect-location')
          if (locationResponse.ok) {
            const locationData = await locationResponse.json()
            if (locationData.country) {
              detectedCurrency = getUserCurrency(locationData.country)
            }
          }
        } catch (error) {
          // Fall back to USD
        }
      }
      
      setCurrency(detectedCurrency)
      await loadPackages()
      
    } catch (error) {
      console.error('Failed to detect currency:', error)
      setCurrency('USD')
      await loadPackages()
    } finally {
      setIsLoading(false)
    }
  }

  const loadPackages = async () => {
    try {
      const response = await fetch('/api/v1/public/packages', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.packages) {
          setPackages(data.packages)
        }
      }
    } catch (error) {
      console.error('Failed to load packages:', error)
    }
  }

  const handleAuthAction = () => {
    if (user) {
      window.location.href = '/dashboard'
    } else {
      window.location.href = '/dashboard/login'
    }
  }

  const handleGetStarted = () => {
    if (user) {
      window.location.href = '/dashboard'
    } else {
      window.location.href = '/register'
    }
  }

  const formatPrice = (price: number, currency: string = 'USD') => {
    if (currency === 'IDR') {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
      }).format(price)
    } else {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0
      }).format(price)
    }
  }

  const getCurrentPrice = (pkg: Package) => {
    if (!pkg.pricing_tiers || typeof pkg.pricing_tiers !== 'object') {
      return { price: 0, period: pkg.billing_period }
    }
    
    const periodData = pkg.pricing_tiers[globalBillingPeriod]
    if (!periodData || !periodData[currency]) {
      return { price: 0, period: pkg.billing_period }
    }
    
    const tierData = periodData[currency]
    return { 
      price: tierData.promo_price || tierData.regular_price, 
      period: tierData.period_label,
      originalPrice: tierData.regular_price !== tierData.promo_price ? tierData.regular_price : null
    }
  }

  const getFeaturesList = (pkg: Package): string[] => {
    const features: string[] = []
    
    const keywordLimit = pkg.quota_limits?.keywords_limit || 0
    const serviceAccounts = pkg.quota_limits?.service_accounts || 1
    const concurrentJobs = pkg.quota_limits?.concurrent_jobs || 1
    const dailyUrls = pkg.quota_limits?.daily_urls || 0
    
    if (keywordLimit === -1) {
      features.push('Unlimited Keywords')
    } else if (keywordLimit >= 1000) {
      features.push(`${Math.floor(keywordLimit / 1000)}K+ Keywords`)
    } else {
      features.push(`${keywordLimit} Keywords`)
    }
    
    if (serviceAccounts === -1) {
      features.push('Unlimited Service Accounts')
    } else if (serviceAccounts === 1) {
      features.push('1 Service Account')
    } else {
      features.push(`${serviceAccounts} Service Accounts`)
    }
    
    if (dailyUrls === -1) {
      features.push('Unlimited Daily Indexing')
    } else if (dailyUrls > 0) {
      features.push(`${dailyUrls} Daily URL Quota`)
    }
    
    if (concurrentJobs > 1) {
      features.push(`${concurrentJobs} Concurrent Jobs`)
    }
    
    if (pkg.features && Array.isArray(pkg.features)) {
      pkg.features.forEach(feature => {
        if (feature && !features.some(f => f.toLowerCase().includes(feature.toLowerCase().substring(0, 10)))) {
          features.push(feature)
        }
      })
    }
    
    return features
  }

  const periodOptions = [
    { key: 'monthly' as const, label: 'Monthly' },
    { key: 'quarterly' as const, label: 'Quarterly' },
    { key: 'biannual' as const, label: 'Biannual' },
    { key: 'annual' as const, label: 'Annual' }
  ]

  const pricingFAQs = [
    {
      question: "What happens if I exceed my keyword limit?",
      answer: "When you reach your keyword limit, you can either upgrade to a higher plan or remove some keywords to add new ones. We'll notify you when you're approaching your limit so you can decide what works best for your needs."
    },
    {
      question: "Do I need a credit card for the free trial?",
      answer: "No credit card required! Start your free trial immediately and explore all features. You only provide payment information when you're ready to upgrade to a paid plan."
    },
    {
      question: "Can I switch plans anytime?",
      answer: "Absolutely! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any billing adjustments."
    },
    {
      question: "Do you offer discounts for annual plans?",
      answer: "Yes! Annual plans offer significant savings - up to 16% off compared to monthly billing. The longer your commitment, the more you save."
    },
    {
      question: "Can I cancel anytime?",
      answer: "Yes, you can cancel your subscription at any time. There are no cancellation fees, and you'll retain access to your data until the end of your billing period."
    },
    {
      question: "Is there an API available?",
      answer: "Yes! Our API is available on Premium and Enterprise plans, allowing you to integrate rank tracking data into your own applications and workflows."
    }
  ]

  return (
    <div className="min-h-screen text-white relative overflow-hidden" style={{backgroundColor: '#111113'}}>
      {/* Enhanced Black glossy background with subtle patterns */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-black"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-950 to-black opacity-90"></div>
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '50px 50px'
        }}></div>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-400/20 to-transparent"></div>
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-blue-500/[0.008] rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/3 w-96 h-96 bg-cyan-400/[0.008] rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-blue-500/[0.003] to-transparent rounded-full"></div>
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="px-6 py-3">
          <div className="max-w-5xl mx-auto bg-black/95 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl">
            <div className="flex justify-between items-center h-14 px-6">
              {/* Logo */}
              <div className="flex items-center">
                <a href="/" className="flex items-center">
                  {siteSettings?.site_logo_url ? (
                    <img 
                      src={siteSettings.site_logo_url} 
                      alt={siteSettings.site_name}
                      className="h-8 w-auto"
                    />
                  ) : (
                    <span className="text-xl font-bold text-white">
                      {siteSettings?.site_name || 'IndexNow Rank Tracker'}
                    </span>
                  )}
                </a>
              </div>

              {/* Desktop Navigation */}
              <nav className="hidden md:flex space-x-8">
                <a href="/#features" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
                  Features
                </a>
                <a href="/pricing" className="text-sm font-medium text-white">
                  Pricing
                </a>
                <a href="/#faq" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
                  FAQ
                </a>
                <a href="/#contact" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
                  Contact
                </a>
              </nav>

              {/* Desktop Auth Button */}
              <div className="hidden md:flex">
                <button
                  onClick={handleAuthAction}
                  className="bg-white text-black px-4 py-2 hover:bg-gray-100 text-sm font-medium transition-all duration-300 rounded-full"
                >
                  {user ? 'Dashboard' : 'Sign In'}
                </button>
              </div>

              {/* Mobile menu button */}
              <div className="md:hidden flex items-center space-x-4">
                <button
                  onClick={handleAuthAction}
                  className="bg-white text-black px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-100 transition-colors"
                >
                  {user ? 'Dashboard' : 'Sign In'}
                </button>
                
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="text-white hover:text-gray-300 transition-colors"
                >
                  {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-black border-t border-gray-800">
              <a href="/#features" className="block px-3 py-2 text-white hover:text-gray-300 text-sm font-medium">
                Features
              </a>
              <a href="/pricing" className="block px-3 py-2 text-white hover:text-gray-300 text-sm font-medium">
                Pricing
              </a>
              <a href="/#faq" className="block px-3 py-2 text-white hover:text-gray-300 text-sm font-medium">
                FAQ
              </a>
              <a href="/#contact" className="block px-3 py-2 text-white hover:text-gray-300 text-sm font-medium">
                Contact
              </a>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="relative z-10 pt-24">
        {/* 1) Hero Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 text-white">
              Fair, transparent pricing—built to{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-400">
                grow with you
              </span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              No hidden fees. No confusing credits. Just straightforward plans that scale when you need them.
            </p>
            <button
              onClick={handleGetStarted}
              className="bg-white text-black px-8 py-4 rounded-full font-semibold text-lg hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 shadow-lg inline-flex items-center space-x-2"
            >
              <span>Start free</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <p className="text-sm text-gray-400 mt-4">
              14-day free trial • cancel anytime
            </p>
          </div>
        </section>

        {/* 2) Pricing Table */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            {/* Period Tabs */}
            <div className="flex justify-center mb-12">
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-2 inline-flex items-center">
                {periodOptions.map((option) => (
                  <button
                    key={option.key}
                    onClick={() => setGlobalBillingPeriod(option.key)}
                    className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                      globalBillingPeriod === option.key
                        ? 'bg-white text-black shadow-lg'
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span>{option.label}</span>
                    {globalBillingPeriod === option.key && option.key !== 'monthly' && (
                      <span className="ml-2 text-xs text-green-600 font-semibold">
                        Save {option.key === 'annual' ? '16%' : option.key === 'biannual' ? '12%' : '8%'}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Pricing Cards */}
            {isLoading ? (
              <div className="grid md:grid-cols-3 gap-8">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8 animate-pulse">
                    <div className="h-6 bg-white/10 rounded mb-4"></div>
                    <div className="h-4 bg-white/5 rounded mb-8"></div>
                    <div className="h-8 bg-white/10 rounded mb-4"></div>
                    <div className="space-y-3">
                      {[1, 2, 3, 4].map((j) => (
                        <div key={j} className="h-4 bg-white/5 rounded"></div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-8">
                <NeonContainer className="contents">
                  {(mousePosition, isTracking) => 
                    packages.slice(0, 3).map((pkg) => {
                      const pricing = getCurrentPrice(pkg)
                      const isPopular = pkg.is_popular
                      const features = getFeaturesList(pkg)
                      
                      return (
                        <AdvancedNeonCard 
                          key={pkg.id} 
                          intensity={isPopular ? "high" : "medium"} 
                          className="p-8 flex flex-col h-full min-h-[500px]"
                          mousePosition={mousePosition}
                          isTracking={isTracking}
                        >
                          {/* Popular Badge */}
                          {isPopular && (
                            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                              <div className="bg-gradient-to-r from-blue-500 to-cyan-400 text-white px-4 py-2 rounded-full text-sm font-semibold">
                                MOST POPULAR
                              </div>
                            </div>
                          )}
                          
                          {/* Plan Name */}
                          <div className="mb-6">
                            <h3 className="text-2xl font-bold text-white mb-2">
                              {pkg.name}
                            </h3>
                            <p className="text-gray-300 text-sm">
                              {pkg.description}
                            </p>
                          </div>
                          
                          {/* Price */}
                          <div className="mb-8">
                            {pricing.originalPrice && (
                              <div className="mb-2">
                                <span className="text-lg text-gray-500 line-through">
                                  {formatPrice(pricing.originalPrice, currency)}
                                </span>
                              </div>
                            )}
                            <div className="mb-2">
                              <span className="text-4xl font-bold text-white">
                                {formatPrice(pricing.price, currency)}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400 text-sm">
                                per {globalBillingPeriod === 'monthly' ? 'month' : 
                                     globalBillingPeriod === 'quarterly' ? '3 months' :
                                     globalBillingPeriod === 'biannual' ? '6 months' : 'year'}
                              </span>
                            </div>
                          </div>
                          
                          {/* Features */}
                          <div className="flex-grow">
                            <ul className="space-y-3 mb-8">
                              {features.map((feature, featureIndex) => (
                                <li key={featureIndex} className="flex items-start">
                                  <div className="flex-shrink-0 w-5 h-5 mt-0.5">
                                    <Check className="w-5 h-5 text-green-400" />
                                  </div>
                                  <span className="ml-3 text-gray-300 text-sm">
                                    {feature}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          
                          {/* CTA Button */}
                          <div className="mt-auto">
                            <button
                              onClick={handleGetStarted}
                              className="w-full bg-white text-black py-3 px-6 rounded-lg font-semibold hover:bg-gray-100 transition-colors duration-200"
                            >
                              Get started
                            </button>
                          </div>
                        </AdvancedNeonCard>
                      )
                    })
                  }
                </NeonContainer>
              </div>
            )}
          </div>
        </section>

        {/* 3) Value Reinforcement Strip */}
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-6">Every plan includes</h2>
            </div>
            <div className="grid md:grid-cols-5 gap-8">
              {[
                { icon: <Star className="w-8 h-8" />, title: "Local & mobile rank tracking", desc: "Track rankings across devices and locations" },
                { icon: <Clock className="w-8 h-8" />, title: "Real-time alerts", desc: "Get notified of significant rank changes" },
                { icon: <Check className="w-8 h-8" />, title: "Exportable reports", desc: "Clean, professional reports for clients" },
                { icon: <Shield className="w-8 h-8" />, title: "Secure cloud dashboard", desc: "Enterprise-grade security and uptime" },
                { icon: <MessageCircle className="w-8 h-8" />, title: "GDPR-ready privacy", desc: "Compliant data handling and storage" }
              ].map((item, index) => (
                <div key={index} className="text-center">
                  <div className="text-blue-400 mb-4 flex justify-center">
                    {item.icon}
                  </div>
                  <h3 className="text-white font-semibold mb-2 text-sm">
                    {item.title}
                  </h3>
                  <p className="text-gray-400 text-xs">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4) Objection Handling (Pricing FAQs) */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-white">
                Pricing questions answered
              </h2>
              <p className="text-xl text-gray-300">
                Everything you need to know about our plans and pricing.
              </p>
            </div>

            <div className="space-y-4">
              {pricingFAQs.map((faq, index) => (
                <div key={index} className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:bg-white/10 transition-all duration-300 p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">
                    {faq.question}
                  </h3>
                  <p className="text-gray-300 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5) Comparison / Why Choose Us */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-white">
                Why IndexNow over all-in-one tools?
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-12">
              {/* IndexNow - Left Side */}
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8">
                <h3 className="text-2xl font-bold text-white mb-6">IndexNow</h3>
                <div className="space-y-4">
                  {[
                    "Predictable pricing",
                    "Focused rank tracking",
                    "Clean, client-ready reports",
                    "Fast, responsive interface",
                    "No feature bloat"
                  ].map((item, index) => (
                    <div key={index} className="flex items-center">
                      <Check className="w-5 h-5 text-green-400 mr-3" />
                      <span className="text-gray-300">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* All-in-one tools - Right Side */}
              <div className="bg-red-500/5 backdrop-blur-sm rounded-2xl border border-red-500/20 p-8">
                <h3 className="text-2xl font-bold text-white mb-6">All-in-one tools</h3>
                <div className="space-y-4">
                  {[
                    "Expensive bundles",
                    "Overwhelming dashboards", 
                    "Features you don't use",
                    "Slow, cluttered interface",
                    "Pay for tools you never touch"
                  ].map((item, index) => (
                    <div key={index} className="flex items-center">
                      <X className="w-5 h-5 text-red-400 mr-3" />
                      <span className="text-gray-300">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 7) Final CTA */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6 text-white">
              Track rankings with clarity—without breaking the bank
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Start your 14-day free trial today and see how simple rank tracking can be.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleGetStarted}
                className="bg-white text-black px-8 py-4 rounded-full font-semibold text-lg hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 shadow-lg inline-flex items-center justify-center space-x-2"
              >
                <span>Start free</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <a
                href={`mailto:${siteSettings?.contact_email || 'hello@indexnow.studio'}`}
                className="border border-white/20 text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-white/5 transition-all duration-300 inline-flex items-center justify-center space-x-2"
              >
                <MessageCircle className="w-5 h-5" />
                <span>Talk to sales</span>
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 bg-black py-16">
        <div className="max-w-6xl mx-auto px-8">
          <div className="relative border-t border-l border-r border-gray-600/40 rounded-t-3xl bg-gray-900/20 backdrop-blur-sm p-12">
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-b from-transparent to-black pointer-events-none"></div>
            
            <div className="grid md:grid-cols-5 gap-8">
              {/* Company Info */}
              <div className="space-y-4">
                <div className="flex items-center">
                  {siteSettings?.site_logo_url ? (
                    <img 
                      src={siteSettings.site_logo_url} 
                      alt={siteSettings.site_name}
                      className="h-8 w-auto brightness-110"
                    />
                  ) : (
                    <span className="text-xl font-bold text-white tracking-tight">
                      {siteSettings?.site_name || 'IndexNow'}
                    </span>
                  )}
                </div>
              </div>

              {/* Product */}
              <div className="space-y-4">
                <h3 className="text-white font-medium text-sm">Product</h3>
                <ul className="space-y-2 text-sm">
                  <li><a href="/pricing" className="text-gray-400 hover:text-gray-300 transition-colors duration-200">Pricing</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-gray-300 transition-colors duration-200">Downloads</a></li>
                </ul>
              </div>

              {/* Resources */}
              <div className="space-y-4">
                <h3 className="text-white font-medium text-sm">Resources</h3>
                <ul className="space-y-2 text-sm">
                  <li><a href="#" className="text-gray-400 hover:text-gray-300 transition-colors duration-200">Docs</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-gray-300 transition-colors duration-200">Blog</a></li>
                  <li><a href="/#faq" className="text-gray-400 hover:text-gray-300 transition-colors duration-200">FAQs</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-gray-300 transition-colors duration-200">Changelog</a></li>
                </ul>
              </div>

              {/* Terms */}
              <div className="space-y-4">
                <h3 className="text-white font-medium text-sm">Terms</h3>
                <ul className="space-y-2 text-sm">
                  <li><a href="#" className="text-gray-400 hover:text-gray-300 transition-colors duration-200">Terms of Service</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-gray-300 transition-colors duration-200">Privacy Policy</a></li>
                </ul>
              </div>

              {/* Connect */}
              <div className="space-y-4">
                <h3 className="text-white font-medium text-sm">Connect</h3>
                <ul className="space-y-2 text-sm">
                  <li><a href={`mailto:${siteSettings?.contact_email || 'hello@indexnow.studio'}`} className="text-gray-400 hover:text-gray-300 transition-colors duration-200">Contact ↗</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-gray-300 transition-colors duration-200">Forum</a></li>
                </ul>
              </div>
            </div>

            <div className="mt-8 relative z-10">
              <div className="text-center">
                <p className="text-gray-500 text-xs mb-4">
                  Questions about pricing? Email {siteSettings?.contact_email || 'hello@indexnow.studio'}—we'll reply fast.
                </p>
                <p className="text-gray-500 text-xs">
                  © 2025 {siteSettings?.site_name || 'IndexNow'}. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}