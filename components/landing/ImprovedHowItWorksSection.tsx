'use client'

import { 
  Database, 
  Search, 
  Zap, 
  BarChart3,
  Upload,
  Globe,
  Calendar,
  TrendingUp,
  CheckCircle 
} from 'lucide-react'

export default function ImprovedHowItWorksSection() {
  return (
    <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-white">
            How IndexNow Rank Tracker Works
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Professional keyword rank tracking platform with automated monitoring and analytics.
            Set up your complete rank tracking system in minutes.
          </p>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          
          {/* Large Feature - Keyword Management */}
          <div className="lg:col-span-2 lg:row-span-2 bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 p-8 hover:bg-white/10 transition-all duration-500 group">
            <div className="h-full flex flex-col">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 p-3 mr-4 group-hover:rotate-12 transition-transform duration-500">
                  <Search className="w-full h-full text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-1">Keyword Management</h3>
                  <p className="text-sm text-blue-300">Complete tracking setup</p>
                </div>
              </div>
              
              <div className="space-y-4 flex-grow">
                <div className="flex items-start space-x-3">
                  <Upload className="w-5 h-5 text-gray-300 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-white font-medium">CSV Import & Manual Entry</p>
                    <p className="text-sm text-gray-400">Bulk import keywords via CSV or add them manually with domain assignment</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Globe className="w-5 h-5 text-gray-300 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-white font-medium">Multi-Location Tracking</p>
                    <p className="text-sm text-gray-400">Track rankings across different countries with desktop and mobile support</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Database className="w-5 h-5 text-gray-300 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-white font-medium">Domain Organization</p>
                    <p className="text-sm text-gray-400">Organize keywords by domain with custom tagging and filtering system</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* API Integration */}
          <div className="bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 p-6 hover:bg-white/10 transition-all duration-500 group">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-400 p-2.5 mr-3 group-hover:rotate-12 transition-transform duration-500">
                <Globe className="w-full h-full text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">API Integration</h3>
                <p className="text-xs text-purple-300">ScrapingDog powered</p>
              </div>
            </div>
            <p className="text-sm text-gray-300">
              ScrapingDog API integration with quota management and batch processing for reliable rank checking.
            </p>
          </div>

          {/* Automated Tracking */}
          <div className="bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 p-6 hover:bg-white/10 transition-all duration-500 group">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-400 p-2.5 mr-3 group-hover:rotate-12 transition-transform duration-500">
                <Zap className="w-full h-full text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Daily Checks</h3>
                <p className="text-xs text-green-300">Automated monitoring</p>
              </div>
            </div>
            <p className="text-sm text-gray-300">
              ScrapingDog API integration provides daily automated rank checks with quota management.
            </p>
          </div>

          {/* Rank History & Analytics */}
          <div className="lg:col-span-2 bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 p-6 hover:bg-white/10 transition-all duration-500 group">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-400 p-3 mr-4 group-hover:rotate-12 transition-transform duration-500">
                <BarChart3 className="w-full h-full text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-1">Rank Analytics</h3>
                <p className="text-sm text-orange-300">Historical data & insights</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start space-x-3">
                <TrendingUp className="w-5 h-5 text-gray-300 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-white font-medium">Position Tracking</p>
                  <p className="text-sm text-gray-400">Monitor ranking changes with position history</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Database className="w-5 h-5 text-gray-300 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-white font-medium">Domain Management</p>
                  <p className="text-sm text-gray-400">Organize keywords by domain with tagging system</p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Process Flow */}
        <div className="text-center mb-12">
          <h3 className="text-2xl font-bold text-white mb-8">Simple 3-Step Process</h3>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 p-4">
                <span className="text-white text-2xl font-bold">1</span>
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">Add Keywords & Domains</h4>
              <p className="text-gray-300 text-sm">Import keywords via CSV or add manually, set up domains and configure tracking preferences</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-400 p-4">
                <span className="text-white text-2xl font-bold">2</span>
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">Configure Tracking</h4>
              <p className="text-gray-300 text-sm">Set device types, target countries, and enable automated daily rank monitoring</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-400 p-4">
                <span className="text-white text-2xl font-bold">3</span>
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">Monitor Rankings</h4>
              <p className="text-gray-300 text-sm">View rank history, position changes, and analytics with comprehensive reporting</p>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-green-500/10 to-emerald-400/10 backdrop-blur-sm rounded-2xl border border-green-500/20 px-8 py-6 inline-flex items-center space-x-3">
            <CheckCircle className="w-6 h-6 text-green-400" />
            <div>
              <p className="text-lg font-medium text-white">
                Complete rank tracking setup in under 5 minutes
              </p>
              <p className="text-sm text-green-300">
                No technical expertise required
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}