'use client'

import { ArrowRight, MessageCircle } from 'lucide-react'
import NeonCard from './NeonCard'

interface PricingTeaserSectionProps {
  onGetStarted: () => void
  onScrollToPricing: () => void
}

export default function PricingTeaserSection({ onGetStarted, onScrollToPricing }: PricingTeaserSectionProps) {
  const plans = [
    {
      name: "Starter",
      description: "Up to 100 keywords • 1 user • weekly checks",
      cta: "Start free",
      action: onGetStarted,
      popular: false
    },
    {
      name: "Pro", 
      description: "Up to 500 keywords • 3 users • daily checks • reporting",
      cta: "Start free",
      action: onGetStarted,
      popular: true
    },
    {
      name: "Agency",
      description: "Up to 2K keywords • team roles • white-label • priority checks",
      cta: "Talk to us",
      action: () => window.open('mailto:hello@indexnow.studio', '_blank'),
      popular: false
    }
  ]

  return (
    <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-white">
            Built to be fair
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Pay for tracking, not bloat. Start small, scale when you're ready.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan, index) => (
            <NeonCard key={index} intensity={plan.popular ? "high" : "medium"} className="h-full">
              <div className="p-8 flex flex-col h-full">
                {plan.popular && (
                  <div className="bg-gradient-to-r from-blue-500 to-cyan-400 text-white text-xs font-bold px-3 py-1 rounded-full text-center mb-4">
                    MOST POPULAR
                  </div>
                )}
                
                <h3 className="text-2xl font-bold text-white mb-3">
                  {plan.name}
                </h3>
                
                <p className="text-gray-300 mb-8 leading-relaxed flex-grow">
                  {plan.description}
                </p>
                
                <button
                  onClick={plan.action}
                  className={`w-full py-4 rounded-full font-semibold transition-all duration-300 flex items-center justify-center space-x-2 ${
                    plan.name === "Agency" 
                      ? "border border-white/20 text-white hover:bg-white/5"
                      : "bg-white text-black hover:bg-gray-100"
                  }`}
                >
                  {plan.name === "Agency" && <MessageCircle className="w-5 h-5" />}
                  <span>{plan.cta}</span>
                  {plan.name !== "Agency" && <ArrowRight className="w-5 h-5" />}
                </button>
              </div>
            </NeonCard>
          ))}
        </div>

        {/* Link to full pricing */}
        <div className="text-center">
          <button
            onClick={onScrollToPricing}
            className="text-blue-400 hover:text-blue-300 transition-colors underline"
          >
            See full pricing
          </button>
        </div>
      </div>
    </section>
  )
}