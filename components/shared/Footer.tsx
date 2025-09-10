'use client'

interface SiteSettings {
  site_name: string
  white_logo: string
  contact_email: string
}

export interface FooterProps {
  siteSettings?: SiteSettings | null
  onScrollToPricing?: () => void
}

export default function Footer({ siteSettings, onScrollToPricing }: FooterProps) {
  return (
    <footer className="relative z-10 bg-black py-16">
      <div className="max-w-6xl mx-auto px-8">
        {/* Open container with elegant fade effect like Qoder */}
        <div className="relative border-t border-l border-r border-gray-600/40 rounded-t-3xl bg-gray-900/20 backdrop-blur-sm p-12">
          {/* Elegant bottom fade effect */}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-b from-transparent to-black pointer-events-none"></div>
          
          <div className="grid md:grid-cols-5 gap-8">
            {/* Company Info with Logo and Social Icons */}
            <div className="space-y-4">
              {/* Company Logo/Name */}
              <div className="flex items-center">
                <img 
                  src={siteSettings?.white_logo} 
                  alt={siteSettings?.site_name}
                  className="h-20 w-auto brightness-110"
                />
              </div>
              {/* Social Media Icons */}
              <div className="flex space-x-3">
                <a href="#" className="text-gray-500 hover:text-gray-300 transition-colors duration-200">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
                <a href="#" className="text-gray-500 hover:text-gray-300 transition-colors duration-200">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                </a>
                <a href="#" className="text-gray-500 hover:text-gray-300 transition-colors duration-200">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Product */}
            <div className="space-y-4">
              <h3 className="text-white font-medium text-sm">Product</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  {onScrollToPricing ? (
                    <button onClick={onScrollToPricing} className="text-gray-400 hover:text-gray-300 transition-colors duration-200">
                      Pricing
                    </button>
                  ) : (
                    <a href="/pricing" className="text-gray-400 hover:text-gray-300 transition-colors duration-200">
                      Pricing
                    </a>
                  )}
                </li>
                <li><a href="#" className="text-gray-400 hover:text-gray-300 transition-colors duration-200">Downloads</a></li>
              </ul>
            </div>

            {/* Resources */}
            <div className="space-y-4">
              <h3 className="text-white font-medium text-sm">Resources</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-gray-400 hover:text-gray-300 transition-colors duration-200">Docs</a></li>
                <li><a href="/blog" className="text-gray-400 hover:text-gray-300 transition-colors duration-200">Blog</a></li>
                <li><a href="/faq" className="text-gray-400 hover:text-gray-300 transition-colors duration-200">FAQs</a></li>
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
                <li><a href={`mailto:${siteSettings?.contact_email}`} className="text-gray-400 hover:text-gray-300 transition-colors duration-200">Contact ↗</a></li>
                <li><a href="#" className="text-gray-400 hover:text-gray-300 transition-colors duration-200">Forum</a></li>
              </ul>
            </div>
          </div>

          {/* Copyright section - INSIDE the open container like Qoder */}
          <div className="mt-8 relative z-10">
            <p className="text-gray-500 text-xs">
              © 2025 {siteSettings?.site_name}. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}