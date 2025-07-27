'use client'

import { useState, useEffect, useRef } from 'react'
import { authService } from '@/lib/auth'
import { ChevronUp, Menu, X, BarChart3, Zap, Shield, Users, ArrowRight, CheckCircle, Clock, Globe, TrendingUp, Star, Award, HelpCircle, Mail, MessageSquare } from 'lucide-react'
import DashboardPreview from './DashboardPreview'
import CompanyLogos from './CompanyLogos'

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
      setShowScrollTop(window.scrollY > 400)
      
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

  const formatPrice = (price: number, currency: string = 'IDR') => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0
    }).format(price)
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
      {/* Elegant background effects */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/[0.02] rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/[0.02] rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-white/[0.01] to-transparent rounded-full"></div>
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
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
                className="bg-white text-black px-6 py-2 rounded-full font-medium hover:bg-gray-100 transition-colors"
              >
                {user ? 'Go to Dashboard' : 'Sign In'}
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
                  SEO Professionals Are{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-400">
                    Losing Rankings
                  </span>{' '}
                  Every Single Day
                </h1>
                
                <p className="text-xl text-gray-300 leading-relaxed">
                  While you're waiting 2-4 weeks for Google to discover your content, 
                  your competitors are getting indexed in minutes and capturing your traffic.
                </p>
                
                <p className="text-lg text-gray-400">
                  Manual indexing is broken. Google Search Console limits you to 200 URLs per day. 
                  Your content gets buried while competitors steal your rankings.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-semibold text-white">
                  Meet IndexNow Pro - Your Professional Indexing Guide
                </h2>
                <p className="text-gray-300">
                  Join thousands who've improved their indexing speed by 95% with our proven 3-step plan:
                </p>
                <div className="space-y-2 text-sm text-gray-400">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center text-xs font-bold">1</div>
                    <span>Connect your Google Search Console</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center text-xs font-bold">2</div>
                    <span>Submit URLs in bulk or schedule automatic submissions</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center text-xs font-bold">3</div>
                    <span>Monitor real-time indexing progress and success rates</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleGetStarted}
                  className="bg-white text-black px-8 py-4 rounded-full font-semibold text-lg hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  Start Your Free Trial
                </button>
                <button
                  onClick={() => scrollToSection(statsRef)}
                  className="border border-white/20 text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-white/5 transition-all duration-300"
                >
                  See Success Stories
                </button>
              </div>

              <div className="pt-4 border-t border-white/10">
                <p className="text-sm text-gray-500 mb-2">Trusted by industry leaders</p>
                <p className="text-xs text-gray-600">
                  Don't let slow indexing hurt your search rankings. Join professionals who've improved traffic by 340%.
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
              The Results Speak for Themselves
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Over 50,000 professionals trust IndexNow Pro to get their content indexed instantly.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
            <div className="text-center p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
              <div className="text-4xl font-bold text-white mb-2">98.7%</div>
              <div className="text-gray-400">Success Rate</div>
              <div className="text-xs text-gray-500 mt-1">Industry Leading</div>
            </div>
            <div className="text-center p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
              <div className="text-4xl font-bold text-white mb-2">&lt;24min</div>
              <div className="text-gray-400">Average Index Time</div>
              <div className="text-xs text-gray-500 mt-1">95% Faster</div>
            </div>
            <div className="text-center p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
              <div className="text-4xl font-bold text-white mb-2">2.1M+</div>
              <div className="text-gray-400">URLs Indexed</div>
              <div className="text-xs text-gray-500 mt-1">This Month</div>
            </div>
            <div className="text-center p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
              <div className="text-4xl font-bold text-white mb-2">340%</div>
              <div className="text-gray-400">Traffic Increase</div>
              <div className="text-xs text-gray-500 mt-1">Average Client</div>
            </div>
          </div>

          {/* Success Story */}
          <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-8 border border-white/10 text-center max-w-4xl mx-auto">
            <div className="mb-6">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto">
                <Award className="w-8 h-8 text-white" />
              </div>
            </div>
            <blockquote className="text-xl text-gray-300 mb-6 italic">
              "IndexNow Pro transformed our SEO workflow. We went from manually submitting 50 URLs per day 
              to automatically indexing 10,000+ pages in hours. Our organic traffic increased by 340% in just one month."
            </blockquote>
            <div className="flex items-center justify-center space-x-4">
              <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <p className="text-white font-semibold">Sarah Johnson</p>
                <p className="text-gray-400 text-sm">SEO Manager at TechCorp</p>
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
              Professional Features That Actually Work
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Built for SEO professionals who need reliable, scalable indexing automation without the technical headaches.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:bg-white/10 transition-all duration-300">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-6">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-white">Instant Batch Indexing</h3>
              <p className="text-gray-300 leading-relaxed">
                Submit thousands of URLs to Google's official Indexing API simultaneously. 
                No more manual submissions or waiting weeks for discovery.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:bg-white/10 transition-all duration-300">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-6">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-white">Real-Time Analytics Dashboard</h3>
              <p className="text-gray-300 leading-relaxed">
                Monitor indexing progress, success rates, and quota usage with professional dashboards. 
                Get detailed insights into your indexing performance.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:bg-white/10 transition-all duration-300">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-6">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-white">Smart Scheduling System</h3>
              <p className="text-gray-300 leading-relaxed">
                Set up automated indexing jobs with flexible schedules. 
                Hourly, daily, weekly, or monthly - your content gets indexed automatically.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:bg-white/10 transition-all duration-300">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-6">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-white">Enterprise Security</h3>
              <p className="text-gray-300 leading-relaxed">
                Bank-level encryption, comprehensive audit logs, and role-based access control. 
                Your data and credentials are completely secure.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:bg-white/10 transition-all duration-300">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-6">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-white">Multi-Account Load Balancing</h3>
              <p className="text-gray-300 leading-relaxed">
                Automatically distribute indexing requests across multiple Google service accounts 
                for maximum throughput and quota optimization.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:bg-white/10 transition-all duration-300">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-6">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-white">Sitemap Integration</h3>
              <p className="text-gray-300 leading-relaxed">
                Automatically parse XML sitemaps and index all discovered URLs with one click. 
                Perfect for large websites with thousands of pages.
              </p>
            </div>
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
              Start getting your content indexed instantly. No setup fees, no hidden costs, cancel anytime.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className={`relative rounded-3xl p-8 border-2 transition-all duration-300 hover:scale-105 ${
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

                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold mb-3 text-white">{pkg.name}</h3>
                  <p className="text-gray-300 mb-6 leading-relaxed">{pkg.description}</p>
                  <div className="mb-6">
                    <span className="text-5xl font-bold text-white">
                      {pkg.price === 0 ? 'Free' : formatPrice(pkg.price)}
                    </span>
                    {pkg.price > 0 && (
                      <span className="text-gray-400 text-lg">/{pkg.billing_period}</span>
                    )}
                  </div>
                </div>

                <ul className="space-y-4 mb-8">
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
                  className={`w-full py-4 px-6 rounded-full font-semibold text-lg transition-all duration-300 ${
                    pkg.is_popular
                      ? 'bg-white text-black hover:bg-gray-100 shadow-lg'
                      : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                  }`}
                >
                  {pkg.price === 0 ? 'Start Free' : 'Get Started'}
                </button>
              </div>
            ))}
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
              Everything you need to know about IndexNow Pro
            </p>
          </div>

          <div className="space-y-8">
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <HelpCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-3">How is this different from Google Search Console?</h3>
                  <p className="text-gray-300 leading-relaxed">
                    Google Search Console limits you to 200 URLs per day and requires manual submission. 
                    IndexNow Pro uses Google's official Indexing API to submit thousands of URLs automatically 
                    with enterprise-grade service accounts, achieving 95% faster indexing times.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <HelpCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-3">Is this similar to RankMath's Instant Indexing?</h3>
                  <p className="text-gray-300 leading-relaxed">
                    Yes! IndexNow Pro provides the same instant indexing capabilities as RankMath's plugin, 
                    but as a standalone web platform. We offer advanced features like multi-account management, 
                    scheduled jobs, team collaboration, and enterprise security that WordPress plugins can't provide.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <HelpCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-3">What's the success rate for indexing?</h3>
                  <p className="text-gray-300 leading-relaxed">
                    Our platform achieves a 98.7% success rate with an average indexing time of under 24 minutes. 
                    We use multiple Google service accounts for load balancing and have built-in retry mechanisms 
                    for maximum reliability.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <HelpCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-3">Can I cancel anytime?</h3>
                  <p className="text-gray-300 leading-relaxed">
                    Absolutely. There are no long-term contracts or cancellation fees. 
                    You can upgrade, downgrade, or cancel your subscription at any time. 
                    We also offer a 30-day money-back guarantee for your peace of mind.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - StoryBrand: Avoid Failure & Success */}
      <section ref={ctaRef} className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-12 border border-white/10">
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
              Don't Let Your Content Get Lost in the Search Void
            </h2>
            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
              Every day you wait is another day your competitors are stealing your traffic. 
              Join thousands of successful SEO professionals who've improved their indexing speed by 95%.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-8">
              <button
                onClick={handleGetStarted}
                className="bg-white text-black px-10 py-5 rounded-full font-semibold text-lg hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                Start Your Free Trial <ArrowRight className="inline ml-2 w-5 h-5" />
              </button>
              <button
                onClick={() => scrollToSection(contactRef)}
                className="border border-white/20 text-white px-10 py-5 rounded-full font-semibold text-lg hover:bg-white/5 transition-all duration-300"
              >
                Contact Sales
              </button>
            </div>

            <p className="text-gray-400 text-sm">
              🚀 Success: Get your content indexed in minutes, not weeks<br />
              ⚠️ Failure: Watch competitors steal your rankings while you wait
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
              Get in touch with our indexing experts for personalized assistance
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
                  Chat with our technical support team for immediate assistance with setup and configuration.
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
                <h3 className="text-xl font-semibold text-white mb-4">Common Questions:</h3>
                <ul className="space-y-2 text-gray-300">
                  <li>• Enterprise pricing and custom solutions</li>
                  <li>• API integration and technical setup</li>
                  <li>• Multi-account configuration</li>
                  <li>• White-label solutions</li>
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
                    placeholder="Tell us about your indexing needs..."
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
                  {siteSettings?.site_name || 'IndexNow Pro'}
                </span>
              )}
            </div>
            <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
              {siteSettings?.site_description || 'Professional URL indexing automation platform that helps SEO professionals get their content indexed by Google instantly using the official Indexing API.'}
            </p>
            <div className="border-t border-white/10 pt-6">
              <p className="text-sm text-gray-500">
                © 2025 {siteSettings?.site_name || 'IndexNow Pro'}. All rights reserved. 
                Built for SEO professionals who demand results.
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