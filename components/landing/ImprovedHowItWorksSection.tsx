'use client'

import { FileText, Settings2, Zap, CheckCircle, ArrowRight } from 'lucide-react'

export default function ImprovedHowItWorksSection() {
  const steps = [
    {
      number: "01",
      icon: FileText,
      title: "Add site & keywords",
      description: "Import CSV or paste your keywords. Setup takes under 5 minutes.",
      details: "Import CSV or paste",
      color: "from-blue-500 to-cyan-400"
    },
    {
      number: "02", 
      icon: Settings2,
      title: "Choose locations, devices, competitors",
      description: "Configure tracking for desktop/mobile across any location worldwide.",
      details: "Global configuration",
      color: "from-purple-500 to-pink-400"
    },
    {
      number: "03",
      icon: Zap,
      title: "Set schedule & alerts done",
      description: "Automated daily tracking with instant notifications when rankings change.",
      details: "Automated monitoring",
      color: "from-green-500 to-emerald-400"
    }
  ]

  return (
    <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-white">
            How it works
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Get started in minutes, not hours. Three simple steps to professional rank tracking.
          </p>
        </div>

        <div className="relative">
          {/* Background gradient line */}
          <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent transform -translate-y-1/2 hidden lg:block"></div>
          
          <div className="grid lg:grid-cols-3 gap-12 lg:gap-8" style={{gridAutoRows: '1fr'}}>
            {steps.map((step, index) => (
              <div key={index} className="relative group">
                {/* Step Card */}
                <div className="bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 p-8 text-center hover:bg-white/10 transition-all duration-500 group-hover:scale-105 h-full flex flex-col">
                  {/* Icon with gradient background */}
                  <div className="relative mb-6">
                    <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${step.color} p-4 mb-4 group-hover:rotate-12 transition-transform duration-500`}>
                      <step.icon className="w-full h-full text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center border border-white/20">
                      <span className="text-xs font-bold text-white">{step.number}</span>
                    </div>
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-semibold text-white mb-3 group-hover:text-blue-300 transition-colors">
                    {step.title}
                  </h3>
                  
                  <div className="text-sm text-blue-300 mb-4 font-medium">
                    {step.details}
                  </div>
                  
                  <p className="text-gray-300 leading-relaxed flex-grow">
                    {step.description}
                  </p>

                  {/* Arrow for connection (except last item) */}
                  {index < steps.length - 1 && (
                    <div className="absolute top-1/2 -right-6 transform -translate-y-1/2 hidden lg:block">
                      <div className="w-12 h-12 bg-white/5 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-all">
                        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Floating elements for visual enhancement */}
                <div className="absolute -top-4 -left-4 w-8 h-8 bg-blue-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute -bottom-4 -right-4 w-6 h-6 bg-cyan-400/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA with checkmark */}
        <div className="text-center mt-16">
          <div className="bg-gradient-to-r from-green-500/10 to-emerald-400/10 backdrop-blur-sm rounded-2xl border border-green-500/20 px-8 py-6 inline-flex items-center space-x-3">
            <CheckCircle className="w-6 h-6 text-green-400" />
            <div>
              <p className="text-lg font-medium text-white">
                Setup in under 5 minutes
              </p>
              <p className="text-sm text-green-300">
                No technical knowledge required
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}