'use client'

import { useState, useEffect, useRef } from 'react'
import { authService } from '@/lib/auth'
import { ChevronUp, Menu, X } from 'lucide-react'

// New Landing Page Components
import HeroSection from '@/components/landing/HeroSection'
import ValueProofSection from '@/components/landing/ValueProofSection'
import PainPromiseSection from '@/components/landing/PainPromiseSection'
import CoreDifferentiatorsSection from '@/components/landing/CoreDifferentiatorsSection'
import ProductTourSection from '@/components/landing/ProductTourSection'
import UseCasePathsSection from '@/components/landing/UseCasePathsSection'
import ImprovedHowItWorksSection from '@/components/landing/ImprovedHowItWorksSection'
import PricingTeaserSection from '@/components/landing/PricingTeaserSection'
import ComparisonSection from '@/components/landing/ComparisonSection'
import EnhancedFAQSection from '@/components/landing/EnhancedFAQSection'
import FinalCTASection from '@/components/landing/FinalCTASection'

// Existing components to keep
import CompanyLogos from './CompanyLogos'

interface SiteSettings {
  site_name: string
  site_description: string
  site_logo_url: string
  contact_email: string
}

export default function LandingPage() {
  const [user, setUser] = useState<any>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [activeSection, setActiveSection] = useState('hero')
  const [isHeaderSticky, setIsHeaderSticky] = useState(false)

  // Refs for sections
  const heroRef = useRef<HTMLElement>(null)
  const companiesRef = useRef<HTMLElement>(null)
  const valueProofRef = useRef<HTMLElement>(null)
  const painPromiseRef = useRef<HTMLElement>(null)
  const differentiatorsRef = useRef<HTMLElement>(null)
  const productTourRef = useRef<HTMLElement>(null)
  const useCasesRef = useRef<HTMLElement>(null)
  const howItWorksRef = useRef<HTMLElement>(null)
  const pricingRef = useRef<HTMLElement>(null)
  const comparisonRef = useRef<HTMLElement>(null)
  const faqRef = useRef<HTMLElement>(null)
  const finalCtaRef = useRef<HTMLElement>(null)
  const contactRef = useRef<HTMLElement>(null)

  useEffect(() => {
    checkAuthStatus()
    loadSiteSettings()
    
    // Scroll event listener
    const handleScroll = () => {
      const scrollY = window.scrollY
      setShowScrollTop(scrollY > 400)
      setIsHeaderSticky(scrollY > 100)
      
      // Update active section based on scroll position
      const sections = [
        { name: 'hero', ref: heroRef },
        { name: 'companies', ref: companiesRef },
        { name: 'value-proof', ref: valueProofRef },
        { name: 'pain-promise', ref: painPromiseRef },
        { name: 'differentiators', ref: differentiatorsRef },
        { name: 'product-tour', ref: productTourRef },
        { name: 'use-cases', ref: useCasesRef },
        { name: 'how-it-works', ref: howItWorksRef },
        { name: 'pricing', ref: pricingRef },
        { name: 'comparison', ref: comparisonRef },
        { name: 'faq', ref: faqRef },
        { name: 'final-cta', ref: finalCtaRef },
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

  const scrollToSection = (ref: React.RefObject<HTMLElement>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth' })
    setIsMenuOpen(false)
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
      {/* Enhanced Black glossy background with subtle patterns */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-black"></div>
        {/* Glossy gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-950 to-black opacity-90"></div>
        {/* Subtle dot pattern */}
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '50px 50px'
        }}></div>
        {/* Enhanced glossy light effects */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-400/20 to-transparent"></div>
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-blue-500/[0.008] rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/3 w-96 h-96 bg-cyan-400/[0.008] rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-blue-500/[0.003] to-transparent rounded-full"></div>
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
                  {siteSettings?.site_name || 'IndexNow Rank Tracker'}
                </span>
              )}
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-8">
              <button 
                onClick={() => scrollToSection(productTourRef)}
                className={`text-sm font-medium transition-colors ${
                  activeSection === 'product-tour' ? 'text-white' : 'text-gray-300 hover:text-white'
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
                onClick={() => scrollToSection(productTourRef)}
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

      {/* Hero Section */}
      <section ref={heroRef}>
        <HeroSection 
          user={user}
          onGetStarted={handleGetStarted}
          onScrollToDemo={() => scrollToSection(productTourRef)}
        />
      </section>

      {/* Company Logos Section */}
      <section ref={companiesRef} className="relative z-10">
        <CompanyLogos />
      </section>

      {/* Value Proof Snapshot Section */}
      <section ref={valueProofRef}>
        <ValueProofSection />
      </section>

      {/* Pain → Promise Section */}
      <section ref={painPromiseRef}>
        <PainPromiseSection onGetStarted={handleGetStarted} />
      </section>

      {/* Core Differentiators Section */}
      <section ref={differentiatorsRef}>
        <CoreDifferentiatorsSection />
      </section>

      {/* Product Tour Section */}
      <section ref={productTourRef}>
        <ProductTourSection />
      </section>

      {/* Use Case Paths Section */}
      <section ref={useCasesRef}>
        <UseCasePathsSection />
      </section>

      {/* How It Works Section */}
      <section ref={howItWorksRef}>
        <ImprovedHowItWorksSection />
      </section>

      {/* Pricing Teaser Section */}
      <section ref={pricingRef}>
        <PricingTeaserSection 
          onGetStarted={handleGetStarted}
          onScrollToPricing={() => scrollToSection(pricingRef)}
        />
      </section>

      {/* Comparison Section */}
      <section ref={comparisonRef}>
        <ComparisonSection onGetStarted={handleGetStarted} />
      </section>

      {/* Enhanced FAQ Section */}
      <section ref={faqRef}>
        <EnhancedFAQSection />
      </section>

      {/* Final CTA Section */}
      <section ref={finalCtaRef}>
        <FinalCTASection onGetStarted={handleGetStarted} />
      </section>

      {/* Footer */}
      <footer ref={contactRef} className="relative z-10 border-t border-white/10 bg-black/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Company Info */}
            <div className="space-y-4">
              <div className="flex items-center">
                {siteSettings?.site_logo_url ? (
                  <img 
                    src={siteSettings.site_logo_url} 
                    alt={siteSettings.site_name}
                    className="h-8 w-auto"
                  />
                ) : (
                  <span className="text-lg font-bold text-white">
                    {siteSettings?.site_name || 'IndexNow'}
                  </span>
                )}
              </div>
              <p className="text-gray-400 text-sm">
                Professional rank tracking made simple. Focus on what actually matters for your SEO success.
              </p>
            </div>

            {/* Product */}
            <div className="space-y-4">
              <h3 className="text-white font-semibold">Product</h3>
              <ul className="space-y-2 text-sm">
                <li><button onClick={() => scrollToSection(productTourRef)} className="text-gray-400 hover:text-white transition-colors">Features</button></li>
                <li><button onClick={() => scrollToSection(pricingRef)} className="text-gray-400 hover:text-white transition-colors">Pricing</button></li>
                <li><a href="/dashboard" className="text-gray-400 hover:text-white transition-colors">Dashboard</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">API Docs</a></li>
              </ul>
            </div>

            {/* Support */}
            <div className="space-y-4">
              <h3 className="text-white font-semibold">Support</h3>
              <ul className="space-y-2 text-sm">
                <li><button onClick={() => scrollToSection(faqRef)} className="text-gray-400 hover:text-white transition-colors">FAQ</button></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Status</a></li>
                <li><a href={`mailto:${siteSettings?.contact_email || 'hello@indexnow.studio'}`} className="text-gray-400 hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div className="space-y-4">
              <h3 className="text-white font-semibold">Legal</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">GDPR</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2024 {siteSettings?.site_name || 'IndexNow'}. All rights reserved.
            </p>
            <p className="text-gray-400 text-sm mt-4 md:mt-0">
              Questions? Email us at{' '}
              <a 
                href={`mailto:${siteSettings?.contact_email || 'hello@indexnow.studio'}`}
                className="text-blue-400 hover:underline"
              >
                {siteSettings?.contact_email || 'hello@indexnow.studio'}
              </a>
              —real humans reply.
            </p>
          </div>
        </div>
      </footer>

      {/* Scroll to top button */}
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