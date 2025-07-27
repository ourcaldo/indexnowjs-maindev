'use client'

import { useState, useEffect, useRef } from 'react'
import { authService } from '@/lib/auth'
import { ChevronUp, Menu, X, BarChart3, Zap, Shield, Users, ArrowRight, CheckCircle } from 'lucide-react'

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
  const problemRef = useRef<HTMLElement>(null)
  const solutionRef = useRef<HTMLElement>(null)
  const featuresRef = useRef<HTMLElement>(null)
  const pricingRef = useRef<HTMLElement>(null)
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
        { name: 'problem', ref: problemRef },
        { name: 'solution', ref: solutionRef },
        { name: 'features', ref: featuresRef },
        { name: 'pricing', ref: pricingRef },
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
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-sm border-b border-gray-800">
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
                onClick={() => scrollToSection(problemRef)}
                className={`text-sm font-medium transition-colors ${
                  activeSection === 'problem' ? 'text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                Problem
              </button>
              <button 
                onClick={() => scrollToSection(solutionRef)}
                className={`text-sm font-medium transition-colors ${
                  activeSection === 'solution' ? 'text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                Solution
              </button>
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
                onClick={() => scrollToSection(problemRef)}
                className="block px-3 py-2 text-white hover:text-gray-300 text-sm font-medium w-full text-left"
              >
                Problem
              </button>
              <button
                onClick={() => scrollToSection(solutionRef)}
                className="block px-3 py-2 text-white hover:text-gray-300 text-sm font-medium w-full text-left"
              >
                Solution
              </button>
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
                onClick={() => scrollToSection(contactRef)}
                className="block px-3 py-2 text-white hover:text-gray-300 text-sm font-medium w-full text-left"
              >
                Contact
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section - StoryBrand: Character */}
      <section ref={heroRef} className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Stop Waiting for Google to{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                Find Your Content
              </span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
              You're creating amazing content, but Google takes weeks to discover it. 
              Meanwhile, your competitors are getting indexed instantly and stealing your traffic.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleGetStarted}
                className="bg-white text-black px-8 py-4 rounded-full font-semibold text-lg hover:bg-gray-100 transition-all duration-300 transform hover:scale-105"
              >
                Get Instant Indexing Now
              </button>
              <button
                onClick={() => scrollToSection(solutionRef)}
                className="border border-gray-600 text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-gray-900 transition-all duration-300"
              >
                See How It Works
              </button>
            </div>
            
            {/* Statistics */}
            <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">98.7%</div>
                <div className="text-gray-400">Success Rate</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">&lt;30 min</div>
                <div className="text-gray-400">Average Index Time</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">50K+</div>
                <div className="text-gray-400">URLs Indexed Daily</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section - StoryBrand: Problem */}
      <section ref={problemRef} className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
              The Indexing Crisis Every Website Owner Faces
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              You're losing traffic, revenue, and search rankings because Google doesn't know your content exists.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Slow Discovery</h3>
              <p className="text-gray-300">
                Google takes 2-4 weeks to naturally discover your new content, 
                causing massive delays in organic traffic growth.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Lost Revenue</h3>
              <p className="text-gray-300">
                Every day your content isn't indexed is lost revenue. 
                Your competitors are capturing traffic that should be yours.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Manual Chaos</h3>
              <p className="text-gray-300">
                Manually submitting URLs through Google Search Console is 
                time-consuming, error-prone, and doesn't scale.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section - StoryBrand: Guide & Plan */}
      <section ref={solutionRef} className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
              Meet Your Indexing Guide: IndexNow Pro
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              We've helped thousands of websites get indexed instantly using Google's official Indexing API. 
              Here's our proven 3-step plan:
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="text-center">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">Connect Your Google Account</h3>
              <p className="text-gray-300">
                Securely link your Google Search Console using our enterprise-grade service accounts.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">Submit Your URLs</h3>
              <p className="text-gray-300">
                Upload sitemaps or individual URLs. Our system handles the technical complexity automatically.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">Get Instant Results</h3>
              <p className="text-gray-300">
                Watch your content get indexed in under 30 minutes with real-time progress tracking.
              </p>
            </div>
          </div>

          {/* Success Story */}
          <div className="bg-gray-900 rounded-2xl p-8 text-center">
            <div className="mb-6">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto" />
            </div>
            <blockquote className="text-xl text-gray-300 mb-4">
              "IndexNow Pro helped us index 10,000+ pages in just 2 hours. 
              Our organic traffic increased by 340% in the first month."
            </blockquote>
            <p className="text-white font-semibold">Sarah Johnson, SEO Manager at TechCorp</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section ref={featuresRef} className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
              Enterprise-Grade Features
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Built for professionals who need reliable, scalable indexing automation.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-black rounded-xl p-6 border border-gray-800">
              <Zap className="w-12 h-12 text-white mb-4" />
              <h3 className="text-xl font-semibold mb-3">Instant Indexing</h3>
              <p className="text-gray-300">
                Submit thousands of URLs to Google's Indexing API simultaneously with 98.7% success rate.
              </p>
            </div>

            <div className="bg-black rounded-xl p-6 border border-gray-800">
              <BarChart3 className="w-12 h-12 text-white mb-4" />
              <h3 className="text-xl font-semibold mb-3">Real-Time Analytics</h3>
              <p className="text-gray-300">
                Monitor indexing progress, success rates, and quota usage with professional dashboards.
              </p>
            </div>

            <div className="bg-black rounded-xl p-6 border border-gray-800">
              <Shield className="w-12 h-12 text-white mb-4" />
              <h3 className="text-xl font-semibold mb-3">Enterprise Security</h3>
              <p className="text-gray-300">
                Bank-level encryption, audit logs, and role-based access control for team management.
              </p>
            </div>

            <div className="bg-black rounded-xl p-6 border border-gray-800">
              <Users className="w-12 h-12 text-white mb-4" />
              <h3 className="text-xl font-semibold mb-3">Multi-Account Support</h3>
              <p className="text-gray-300">
                Load balance across multiple Google service accounts for maximum throughput.
              </p>
            </div>

            <div className="bg-black rounded-xl p-6 border border-gray-800">
              <Menu className="w-12 h-12 text-white mb-4" />
              <h3 className="text-xl font-semibold mb-3">Flexible Scheduling</h3>
              <p className="text-gray-300">
                Set up recurring indexing jobs with hourly, daily, weekly, or monthly schedules.
              </p>
            </div>

            <div className="bg-black rounded-xl p-6 border border-gray-800">
              <CheckCircle className="w-12 h-12 text-white mb-4" />
              <h3 className="text-xl font-semibold mb-3">Sitemap Integration</h3>
              <p className="text-gray-300">
                Automatically parse XML sitemaps and index all discovered URLs with one click.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section - StoryBrand: Call to Action */}
      <section ref={pricingRef} className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
              Choose Your Indexing Power
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Start getting your content indexed instantly. No setup fees, cancel anytime.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className={`relative bg-gray-900 rounded-2xl p-8 border-2 ${
                  pkg.is_popular 
                    ? 'border-white bg-gradient-to-b from-gray-900 to-black' 
                    : 'border-gray-800'
                }`}
              >
                {pkg.is_popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-white text-black px-4 py-1 rounded-full text-sm font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold mb-2">{pkg.name}</h3>
                  <p className="text-gray-400 mb-4">{pkg.description}</p>
                  <div className="mb-4">
                    <span className="text-4xl font-bold">
                      {pkg.price === 0 ? 'Free' : formatPrice(pkg.price)}
                    </span>
                    {pkg.price > 0 && (
                      <span className="text-gray-400">/{pkg.billing_period}</span>
                    )}
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {pkg.features && pkg.features.length > 0 ? (
                    pkg.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" />
                        <span className="text-gray-300">{feature}</span>
                      </li>
                    ))
                  ) : (
                    <li className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" />
                      <span className="text-gray-300">Features loading...</span>
                    </li>
                  )}
                </ul>

                <button
                  onClick={handleGetStarted}
                  className={`w-full py-3 px-6 rounded-full font-semibold transition-all duration-300 ${
                    pkg.is_popular
                      ? 'bg-white text-black hover:bg-gray-100'
                      : 'bg-gray-800 text-white hover:bg-gray-700'
                  }`}
                >
                  Get Started
                </button>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-400 mb-4">
              30-day money-back guarantee • No setup fees • Cancel anytime
            </p>
            <p className="text-sm text-gray-500">
              All plans include email support and regular feature updates
            </p>
          </div>
        </div>
      </section>

      {/* Contact Section - StoryBrand: Avoid Failure */}
      <section ref={contactRef} className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-900">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Don't Let Your Content Get Lost in the Void
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Every day you wait is another day your competitors are stealing your traffic. 
            Join thousands of successful websites using IndexNow Pro.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <button
              onClick={handleGetStarted}
              className="bg-white text-black px-8 py-4 rounded-full font-semibold text-lg hover:bg-gray-100 transition-all duration-300 transform hover:scale-105"
            >
              Start Your Free Trial <ArrowRight className="inline ml-2 w-5 h-5" />
            </button>
          </div>

          <div className="border-t border-gray-800 pt-8">
            <p className="text-gray-400 mb-4">Need help or have questions?</p>
            <p className="text-white">
              Contact us at{' '}
              <a 
                href={`mailto:${siteSettings?.contact_email || 'hello@indexnow.studio'}`}
                className="text-white hover:text-gray-300 underline"
              >
                {siteSettings?.contact_email || 'hello@indexnow.studio'}
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
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
            <p className="text-gray-400 mb-4">
              {siteSettings?.site_description || 'Professional URL indexing automation platform'}
            </p>
            <p className="text-sm text-gray-500">
              © 2025 {siteSettings?.site_name || 'IndexNow Pro'}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 bg-white text-black p-3 rounded-full shadow-lg hover:bg-gray-100 transition-all duration-300 transform hover:scale-110 z-40"
        >
          <ChevronUp className="w-6 h-6" />
        </button>
      )}
    </div>
  )
}