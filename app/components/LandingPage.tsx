'use client'

import { useState, useEffect, useRef } from 'react'
import { authService } from '@/lib/auth'
import { ChevronUp, Menu, X, BarChart3, Zap, Shield, Users, ArrowRight, CheckCircle, Clock, Globe, TrendingUp, Star, Award, HelpCircle, Mail, MessageSquare } from 'lucide-react'
import DashboardPreview from './DashboardPreview'
import CompanyLogos from './CompanyLogos'

interface PricingTier {
  period: string
  period_label: string
  regular_price: number
  promo_price: number
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
    daily_quota_limit?: number
    service_accounts_limit?: number
    concurrent_jobs_limit?: number
  }
  is_popular: boolean
  pricing_tiers?: PricingTier[]
}

interface SiteSettings {
  site_name: string
  site_description: string
  site_logo_url: string
  contact_email: string
}

export default function LandingPage() {
  const [user, setUser] = useState<any>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [packages, setPackages] = useState<Package[]>([])
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [activeSection, setActiveSection] = useState('hero')
  const [globalBillingPeriod, setGlobalBillingPeriod] = useState('monthly')
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null)
  const [isHeaderSticky, setIsHeaderSticky] = useState(false)

  // Refs for sections
  const heroRef = useRef<HTMLElement>(null)
  const companiesRef = useRef<HTMLElement>(null)
  const statsRef = useRef<HTMLElement>(null)
  const featuresRef = useRef<HTMLElement>(null)
  const pricingRef = useRef<HTMLElement>(null)
  const faqRef = useRef<HTMLElement>(null)
  const ctaRef = useRef<HTMLElement>(null)
  const contactRef = useRef<HTMLElement>(null)

  useEffect(() => {
    checkAuthStatus()
    loadSiteSettings()
    loadPackages()
    
    // Scroll event listener
    const handleScroll = () => {
      const scrollY = window.scrollY
      setShowScrollTop(scrollY > 400)
      setIsHeaderSticky(scrollY > 100)
      
      // Update active section based on scroll position
      const sections = [
        { name: 'hero', ref: heroRef },
        { name: 'companies', ref: companiesRef },
        { name: 'stats', ref: statsRef },
        { name: 'features', ref: featuresRef },
        { name: 'pricing', ref: pricingRef },
        { name: 'faq', ref: faqRef },
        { name: 'contact', ref: contactRef }
      ]
      
      const current = sections.find(section => {
        if (section.ref.current) {
          const rect = section.ref.current.getBoundingClientRect()
          return rect.top <= 100 && rect.bottom >= 100
        }
        return false
      })
      
      if (current) {
        setActiveSection(current.name)
      }
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll()
    
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const checkAuthStatus = async () => {
    try {
      const currentUser = await authService.getCurrentUser()
      setUser(currentUser)
    } catch (error) {
      // User not authenticated
      setUser(null)
    }
  }

  const loadSiteSettings = async () => {
    try {
      const response = await fetch('/api/site-settings')
      const data = await response.json()
      if (data.success) {
        setSiteSettings(data.settings)
      }
    } catch (error) {
      console.error('Failed to load site settings:', error)
    }
  }

  const loadPackages = async () => {
    try {
      // Use the new public packages endpoint to get real data from database
      const response = await fetch('/api/public/packages', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.packages) {
          setPackages(data.packages)
          return
        }
      }

      console.error('Failed to load packages from database')
      
    } catch (error) {
      console.error('Failed to load packages:', error)
    }
  }

  const scrollToSection = (ref: React.RefObject<HTMLElement>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth' })
    setIsMenuOpen(false)
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Neon hover effect component
  const NeonCard = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => {
    const cardRef = useRef<HTMLDivElement>(null)
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
    const [isHovered, setIsHovered] = useState(false)

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!cardRef.current) return
      const rect = cardRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      setMousePosition({ x, y })
    }

    const handleMouseEnter = () => {
      setIsHovered(true)
    }

    const handleMouseLeave = () => {
      setIsHovered(false)
    }

    return (
      <div
        ref={cardRef}
        className={`relative overflow-hidden group ${className}`}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Neon glow effect */}
        <div
          className={`absolute pointer-events-none transition-opacity duration-300 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            left: mousePosition.x - 100,
            top: mousePosition.y - 100,
            width: '200px',
            height: '200px',
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 50%, transparent 100%)',
            borderRadius: '50%',
            filter: 'blur(20px)',
          }}
        />
        {/* Card border glow */}
        <div
          className={`absolute inset-0 rounded-2xl transition-all duration-300 ${
            isHovered 
              ? 'bg-gradient-to-r from-blue-500/20 via-cyan-400/20 to-blue-500/20 p-[1px]' 
              : 'bg-white/10 p-[1px]'
          }`}
        >
          <div className="w-full h-full bg-black/80 backdrop-blur-sm rounded-2xl">
            {children}
          </div>
        </div>
      </div>
    )
  }

  const formatPrice = (price: number, currency: string = 'IDR') => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0
    }).format(price)
  }

  // Get current price for a package based on global billing period
  const getCurrentPrice = (pkg: Package) => {
    if (!pkg.pricing_tiers || !Array.isArray(pkg.pricing_tiers) || pkg.pricing_tiers.length === 0) {
      return { price: pkg.price, period: pkg.billing_period }
    }
    
    const tier = pkg.pricing_tiers.find(t => t.period === globalBillingPeriod)
    
    if (tier) {
      return { 
        price: tier.promo_price || tier.regular_price, 
        period: tier.period_label,
        originalPrice: tier.regular_price !== tier.promo_price ? tier.regular_price : null
      }
    }
    
    return { price: pkg.price, period: pkg.billing_period }
  }

  // Get available billing periods from any package that has pricing tiers
  const getBillingPeriods = () => {
    const packageWithTiers = packages.find(pkg => pkg.pricing_tiers && Array.isArray(pkg.pricing_tiers) && pkg.pricing_tiers.length > 0)
    return packageWithTiers?.pricing_tiers || []
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

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Black glossy background with subtle patterns */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-black"></div>
        {/* Glossy gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-950 to-black opacity-90"></div>
        {/* Subtle dot pattern */}
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '50px 50px'
        }}></div>
        {/* Glossy light effects */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-white/[0.008] rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/3 w-96 h-96 bg-white/[0.008] rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isHeaderSticky 
          ? 'bg-black/95 backdrop-blur-md' 
          : 'bg-transparent'
      }`}>
        <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-300 ${
          isHeaderSticky ? 'py-2' : 'py-0'
        }`}>
          <div className={`flex justify-between items-center transition-all duration-300 ${
            isHeaderSticky 
              ? 'h-14 bg-white/5 backdrop-blur-sm rounded-2xl px-6 border border-white/10' 
              : 'h-16'
          }`}>
            {/* Logo */}
            <div className="flex items-center">
              {siteSettings?.site_logo_url ? (
                <img 
                  src={siteSettings.site_logo_url} 
                  alt={siteSettings.site_name}
                  className="h-8 w-auto"
                />
              ) : (
                <span className="text-xl font-bold text-white">
                  {siteSettings?.site_name || 'IndexNow Pro'}
                </span>
              )}
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-8">
              <button 
                onClick={() => scrollToSection(featuresRef)}
                className={`text-sm font-medium transition-colors ${
                  activeSection === 'features' ? 'text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                Features
              </button>
              <button 
                onClick={() => scrollToSection(pricingRef)}
                className={`text-sm font-medium transition-colors ${
                  activeSection === 'pricing' ? 'text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                Pricing
              </button>
              <button 
                onClick={() => scrollToSection(faqRef)}
                className={`text-sm font-medium transition-colors ${
                  activeSection === 'faq' ? 'text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                FAQ
              </button>
              <button 
                onClick={() => scrollToSection(contactRef)}
                className={`text-sm font-medium transition-colors ${
                  activeSection === 'contact' ? 'text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                Contact
              </button>
            </nav>

            {/* Desktop Auth Button */}
            <div className="hidden md:flex">
              <button
                onClick={handleAuthAction}
                className={`font-medium transition-colors rounded-full ${
                  isHeaderSticky 
                    ? 'bg-white text-black px-4 py-2 hover:bg-gray-100 text-sm' 
                    : 'bg-white text-black px-6 py-2 hover:bg-gray-100'
                }`}
              >
                {user ? (isHeaderSticky ? 'Dashboard' : 'Go to Dashboard') : 'Sign In'}
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

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-black border-t border-gray-800">
              <button
                onClick={() => scrollToSection(featuresRef)}
                className="block px-3 py-2 text-white hover:text-gray-300 text-sm font-medium w-full text-left"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection(pricingRef)}
                className="block px-3 py-2 text-white hover:text-gray-300 text-sm font-medium w-full text-left"
              >
                Pricing
              </button>
              <button
                onClick={() => scrollToSection(faqRef)}
                className="block px-3 py-2 text-white hover:text-gray-300 text-sm font-medium w-full text-left"
              >
                FAQ
              </button>
              <button
                onClick={() => scrollToSection(contactRef)}
                className="block px-3 py-2 text-white hover:text-gray-300 text-sm font-medium w-full text-left"
              >
                Contact
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section - StoryBrand: Character with Problem */}
      <section ref={heroRef} className="relative z-10 pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Copywriting */}
            <div className="space-y-8">
              <div className="space-y-6">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                  Not just another rank tracker.{' '}
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-400">
                    IndexNow thinks deeper
                  </span>{' '}
                  to solve real SEO challenges.
                </h1>
                
                <p className="text-xl text-gray-300 leading-relaxed">
                  Simple yet powerful rank tracking that gives you the insights you need 
                  to dominate search results without the complexity.
                </p>
              </div>

              

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleGetStarted}
                  className="bg-white text-black px-8 py-4 rounded-full font-semibold text-lg hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  Start Tracking
                </button>
                <button
                  onClick={() => scrollToSection(statsRef)}
                  className="border border-white/20 text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-white/5 transition-all duration-300"
                >
                  See What's Possible
                </button>
              </div>

              <div className="pt-4 border-t border-white/10">
                <p className="text-sm text-gray-500">
                  Trusted by SEO professionals • Real-time tracking • Enterprise-grade precision
                </p>
              </div>
            </div>

            {/* Right Column - Dashboard Preview */}
            <div className="lg:pl-8">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-white/10 via-white/5 to-white/10 rounded-3xl blur-xl"></div>
                <div className="relative h-96 lg:h-[500px]">
                  <DashboardPreview />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Company Logos Section */}
      <section ref={companiesRef} className="relative z-10">
        <CompanyLogos />
      </section>

      {/* Value Proposition with Statistics */}
      <section ref={statsRef} className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
              Rank Tracking Platform for Real SEO Professionals
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Track what matters. Monitor keywords that drive business results with enterprise-grade precision.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
            <NeonCard>
              <div className="text-center p-6">
                <div className="text-4xl font-bold text-white mb-2">99.9%</div>
                <div className="text-gray-400">Uptime</div>
                <div className="text-xs text-gray-500 mt-1">Never Miss Rankings</div>
              </div>
            </NeonCard>
            <NeonCard>
              <div className="text-center p-6">
                <div className="text-4xl font-bold text-white mb-2">Real-Time</div>
                <div className="text-gray-400">Data Updates</div>
                <div className="text-xs text-gray-500 mt-1">Always Current</div>
              </div>
            </NeonCard>
            <NeonCard>
              <div className="text-center p-6">
                <div className="text-4xl font-bold text-white mb-2">500K+</div>
                <div className="text-gray-400">Keywords Tracked</div>
                <div className="text-xs text-gray-500 mt-1">Daily Monitoring</div>
              </div>
            </NeonCard>
            <NeonCard>
              <div className="text-center p-6">
                <div className="text-4xl font-bold text-white mb-2">15min</div>
                <div className="text-gray-400">Setup Time</div>
                <div className="text-xs text-gray-500 mt-1">Start Tracking Fast</div>
              </div>
            </NeonCard>
          </div>

          {/* Success Story */}
          <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-8 border border-white/10 text-center max-w-4xl mx-auto">
            <div className="mb-6">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto">
                <Award className="w-8 h-8 text-white" />
              </div>
            </div>
            <blockquote className="text-xl text-gray-300 mb-6 italic">
              "Finally, a rank tracker that doesn't over-complicate things. Clean interface, accurate data, 
              and the insights I actually need to make decisions. It just works."
            </blockquote>
            <div className="flex items-center justify-center space-x-4">
              <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <p className="text-white font-semibold">Marcus Chen</p>
                <p className="text-gray-400 text-sm">Head of SEO at GrowthLabs</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section ref={featuresRef} className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
              Rank Tracking Mode:
              <br />Delegate Rankings to Intelligence
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Add your keywords with specifications. Our intelligence will 
              complete the tracking, monitoring, and deliver precision 
              results automatically.
            </p>
            <div className="grid md:grid-cols-3 gap-6 mt-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-lg font-bold">1</span>
                </div>
                <h3 className="font-semibold mb-2">Add Keywords</h3>
                <p className="text-sm text-gray-400">Simple keyword input</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-lg font-bold">2</span>
                </div>
                <h3 className="font-semibold mb-2">Auto-Track</h3>
                <p className="text-sm text-gray-400">Daily rank monitoring</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-lg font-bold">3</span>
                </div>
                <h3 className="font-semibold mb-2">Get Insights</h3>
                <p className="text-sm text-gray-400">Actionable analytics</p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <NeonCard>
              <div className="p-8">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-6">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-4 text-white">Smart Keyword Intelligence</h3>
                <p className="text-gray-300 leading-relaxed">
                  Track thousands of keywords across multiple search engines simultaneously. 
                  Our intelligence pinpoints the rankings that matter most.
                </p>
              </div>
            </NeonCard>

            <NeonCard>
              <div className="p-8">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-6">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-4 text-white">Advanced Repository Insight</h3>
                <p className="text-gray-300 leading-relaxed">
                  Monitor ranking changes, competitor movements, and search visibility with precision dashboards. 
                  Resolve SEO issues based on deep understanding of your keyword landscape.
                </p>
              </div>
            </NeonCard>

            <NeonCard>
              <div className="p-8">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-6">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-4 text-white">Intelligent Monitoring System</h3>
                <p className="text-gray-300 leading-relaxed">
                  Set up automated rank checks with flexible frequencies. 
                  Daily, weekly, or custom schedules - your rankings are monitored intelligently.
                </p>
              </div>
            </NeonCard>

            <NeonCard>
              <div className="p-8">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-6">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-4 text-white">Enterprise Security</h3>
                <p className="text-gray-300 leading-relaxed">
                  Bank-level encryption, comprehensive audit logs, and role-based access control. 
                  Your ranking data and API credentials are completely secure.
                </p>
              </div>
            </NeonCard>

            <NeonCard>
              <div className="p-8">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-6">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-4 text-white">Multi-Location Tracking</h3>
                <p className="text-gray-300 leading-relaxed">
                  Automatically track rankings across multiple locations and search engines 
                  for comprehensive visibility and performance optimization.
                </p>
              </div>
            </NeonCard>

            <NeonCard>
              <div className="p-8">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-6">
                  <Globe className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-4 text-white">Competitor Intelligence</h3>
                <p className="text-gray-300 leading-relaxed">
                  Monitor your competitors' ranking movements and discover new keyword opportunities. 
                  Perfect for staying ahead in competitive markets.
                </p>
              </div>
            </NeonCard>
          </div>
        </div>
      </section>

      {/* Pricing Section - StoryBrand: Call to Action */}
      <section ref={pricingRef} className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
              Simple Pricing That Scales With Your Success
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Start tracking your rankings with precision. No setup fees, no hidden costs, cancel anytime.
            </p>
            
            {/* Global Billing Period Selector */}
            {getBillingPeriods().length > 0 && (
              <div className="flex justify-center mb-8">
                <div className="bg-white/5 backdrop-blur-sm rounded-full p-2 border border-white/10">
                  {getBillingPeriods().map((tier) => (
                    <button
                      key={tier.period}
                      onClick={() => setGlobalBillingPeriod(tier.period)}
                      className={`px-6 py-3 rounded-full font-medium transition-all duration-300 ${
                        globalBillingPeriod === tier.period
                          ? 'bg-white text-black'
                          : 'text-white hover:bg-white/10'
                      }`}
                    >
                      {tier.period_label}
                      {tier.promo_price < tier.regular_price && (
                        <span className="ml-2 text-xs bg-green-500 text-white px-2 py-1 rounded-full">
                          Save {Math.round((1 - tier.promo_price / tier.regular_price) * 100)}%
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {packages.map((pkg) => {
              const currentPrice = getCurrentPrice(pkg)
              
              return (
                <div
                  key={pkg.id}
                  className={`relative rounded-3xl p-8 border-2 transition-all duration-300 hover:scale-105 flex flex-col h-full ${
                    pkg.is_popular 
                      ? 'border-white bg-white/10 backdrop-blur-sm shadow-2xl' 
                      : 'border-white/20 bg-white/5 backdrop-blur-sm hover:border-white/40'
                  }`}
                >
                  {pkg.is_popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <div className="bg-white text-black px-6 py-2 rounded-full text-sm font-semibold flex items-center space-x-1">
                        <Star className="w-4 h-4" />
                        <span>Most Popular</span>
                      </div>
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold mb-3 text-white">{pkg.name}</h3>
                    <p className="text-gray-300 mb-6 leading-relaxed">{pkg.description}</p>
                    
                    <div className="mb-6">
                      {pkg.price === 0 ? (
                        <div className="text-center">
                          <span className="text-5xl font-bold text-white">Free</span>
                        </div>
                      ) : (
                        <div className="text-center px-2">
                          <div className="flex flex-col items-center justify-center">
                            <div className="flex flex-col items-center justify-center space-y-1">
                              <span className="text-4xl font-bold text-white break-words text-center leading-tight">
                                {formatPrice(currentPrice.price)}
                              </span>
                              {currentPrice.originalPrice && (
                                <span className="text-xl text-gray-500 line-through break-words text-center">
                                  {formatPrice(currentPrice.originalPrice)}
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-400 mt-2">
                              per {currentPrice.period}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <ul className="space-y-4 mb-8 flex-grow">
                    {pkg.features && pkg.features.length > 0 ? (
                      pkg.features.map((feature, index) => (
                        <li key={index} className="flex items-start">
                          <CheckCircle className="w-5 h-5 text-white mt-0.5 mr-3 flex-shrink-0" />
                          <span className="text-gray-300 leading-relaxed">{feature}</span>
                        </li>
                      ))
                    ) : (
                      <li className="flex items-start">
                        <CheckCircle className="w-5 h-5 text-white mt-0.5 mr-3 flex-shrink-0" />
                        <span className="text-gray-300">Features loading...</span>
                      </li>
                    )}
                  </ul>

                  <button
                    onClick={handleGetStarted}
                    className={`w-full py-4 px-6 rounded-full font-semibold text-lg transition-all duration-300 mt-auto ${
                      pkg.is_popular
                        ? 'bg-white text-black hover:bg-gray-100 shadow-lg'
                        : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                    }`}
                  >
                    {pkg.price === 0 ? 'Start Free' : 'Get Started'}
                  </button>
                </div>
              )
            })}
          </div>

          <div className="text-center mt-16">
            <p className="text-gray-300 mb-4 text-lg">
              ✓ 30-day money-back guarantee • ✓ No setup fees • ✓ Cancel anytime
            </p>
            <p className="text-gray-500">
              All plans include priority email support and regular feature updates
            </p>
          </div>
        </div>
      </section>



      {/* FAQ Section */}
      <section ref={faqRef} className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-300">
              Everything you need to know about IndexNow Rank Tracker
            </p>
          </div>

          <div className="space-y-6">
            {[
              {
                question: "How is this different from other rank trackers?",
                answer: "IndexNow Rank Tracker focuses on simplicity without sacrificing power. While other tools overwhelm you with unnecessary features, we provide precise ranking data, intelligent insights, and clean interfaces that help you make decisions faster."
              },
              {
                question: "How accurate is the ranking data?",
                answer: "Our platform achieves enterprise-grade accuracy with real-time data updates. We use multiple data sources and advanced algorithms to ensure you get the most reliable ranking information available."
              },
              {
                question: "Can I track competitors?",
                answer: "Yes! Monitor your competitors' keyword rankings and discover new opportunities. Our intelligent analysis helps you understand market movements and find gaps in your SEO strategy."
              },
              {
                question: "Can I cancel anytime?",
                answer: "Absolutely. There are no long-term contracts or cancellation fees. You can upgrade, downgrade, or cancel your subscription at any time. We also offer a 30-day money-back guarantee for your peace of mind."
              }
            ].map((faq, index) => (
              <div key={index} className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
                <button
                  onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                  className="w-full p-8 text-left hover:bg-white/5 transition-all duration-300 flex items-center justify-between"
                >
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <HelpCircle className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-white">{faq.question}</h3>
                  </div>
                  <ChevronUp className={`w-5 h-5 text-white transition-transform duration-300 ${
                    expandedFAQ === index ? 'rotate-180' : ''
                  }`} />
                </button>
                
                {expandedFAQ === index && (
                  <div className="px-8 pb-8 pt-0">
                    <div className="pl-12">
                      <p className="text-gray-300 leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - StoryBrand: Avoid Failure & Success */}
      <section ref={ctaRef} className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-12 border border-white/10">
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
              Don't Let Your Rankings Slip Away Unnoticed
            </h2>
            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
              Every day you wait is another day your competitors gain ranking advantages. 
              Join thousands of successful SEO professionals who've improved their ranking visibility by 95%.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-8">
              <button
                onClick={handleGetStarted}
                className="bg-white text-black px-10 py-5 rounded-full font-semibold text-lg hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                Start Tracking Now <ArrowRight className="inline ml-2 w-5 h-5" />
              </button>
              <button
                onClick={() => scrollToSection(contactRef)}
                className="border border-white/20 text-white px-10 py-5 rounded-full font-semibold text-lg hover:bg-white/5 transition-all duration-300"
              >
                Contact Sales
              </button>
            </div>

            <p className="text-gray-400 text-sm">
              🚀 Success: Track your rankings with precision and stay ahead<br />
              ⚠️ Failure: Miss ranking opportunities while competitors advance
            </p>
          </div>
        </div>
      </section>

      {/* Contact Questions Section */}
      <section ref={contactRef} className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
              Have Questions? We're Here to Help
            </h2>
            <p className="text-xl text-gray-300">
              Get in touch with our rank tracking experts for personalized assistance
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Left Column - Contact Info */}
            <div className="space-y-8">
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">Email Support</h3>
                    <p className="text-gray-300">Get expert help within 24 hours</p>
                  </div>
                </div>
                <p className="text-white text-lg">
                  <a 
                    href={`mailto:${siteSettings?.contact_email || 'hello@indexnow.studio'}`}
                    className="hover:text-gray-300 transition-colors"
                  >
                    {siteSettings?.contact_email || 'hello@indexnow.studio'}
                  </a>
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">Live Chat</h3>
                    <p className="text-gray-300">Available Monday - Friday, 9AM - 6PM UTC</p>
                  </div>
                </div>
                <p className="text-gray-300">
                  Chat with our support team for immediate assistance with rank tracking setup and configuration.
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
                <h3 className="text-xl font-semibold text-white mb-4">Common Questions:</h3>
                <ul className="space-y-2 text-gray-300">
                  <li>• Enterprise pricing and custom solutions</li>
                  <li>• Keyword tracking setup and configuration</li>
                  <li>• Multi-location tracking setup</li>
                  <li>• White-label rank tracking solutions</li>
                </ul>
              </div>
            </div>

            {/* Right Column - Contact Form Placeholder */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
              <h3 className="text-2xl font-semibold text-white mb-6">Send Us a Message</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-white/40 transition-colors"
                    placeholder="Your full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                  <input 
                    type="email" 
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-white/40 transition-colors"
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Message</label>
                  <textarea 
                    rows={4}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-white/40 transition-colors resize-none"
                    placeholder="Tell us about your rank tracking needs..."
                  />
                </div>
                <button className="w-full bg-white text-black py-3 px-6 rounded-xl font-semibold hover:bg-gray-100 transition-colors">
                  Send Message
                </button>
                <p className="text-xs text-gray-500 text-center">
                  We typically respond within 24 hours during business days
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-12 px-4 sm:px-6 lg:px-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              {siteSettings?.site_logo_url ? (
                <img 
                  src={siteSettings.site_logo_url} 
                  alt={siteSettings.site_name}
                  className="h-10 w-auto"
                />
              ) : (
                <span className="text-2xl font-bold text-white">
                  {siteSettings?.site_name || 'IndexNow Rank Tracker'}
                </span>
              )}
            </div>
            <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
              {siteSettings?.site_description || 'Professional rank tracking platform that helps SEO professionals monitor keyword rankings with precision and intelligence.'}
            </p>
            <div className="border-t border-white/10 pt-6">
              <p className="text-sm text-gray-500">
                © 2025 {siteSettings?.site_name || 'IndexNow Rank Tracker'}. All rights reserved. 
                Built for SEO professionals who demand precision.
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 bg-white/10 backdrop-blur-sm text-white p-4 rounded-full border border-white/20 hover:bg-white/20 transition-all duration-300 transform hover:scale-110 z-40 shadow-lg"
        >
          <ChevronUp className="w-6 h-6" />
        </button>
      )}
    </div>
  )
}