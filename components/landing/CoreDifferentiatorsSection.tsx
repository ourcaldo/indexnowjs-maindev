'use client'

import { Target, Eye, DollarSign } from 'lucide-react'
import NeonCard from './NeonCard'

export default function CoreDifferentiatorsSection() {
  const differentiators = [
    {
      icon: Target,
      title: "Accuracy that matches reality",
      description: "Neutralized personalization, reliable location/device simulation, and consistent schedules for stable trendlines.",
      color: "text-blue-400"
    },
    {
      icon: Eye,
      title: "Clarity over complexity",
      description: "A dashboard you'll actually open. Find wins, losses, and actions in seconds.",
      color: "text-cyan-400"
    },
    {
      icon: DollarSign,
      title: "Fair pricing that grows with you",
      description: "Transparent plans, flexible credits, unlimited projects on higher tiers. No lock-in.",
      color: "text-green-400"
    }
  ]

  return (
    <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-white">
            Three pillars that set us apart
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            While others overcomplicate, we focus on what actually matters for your success.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {differentiators.map((item, index) => (
            <NeonCard key={index} intensity="medium">
              <div className="p-8 text-center">
                <div className={`w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-6 ${item.color}`}>
                  <item.icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-semibold mb-4 text-white">
                  {item.title}
                </h3>
                <p className="text-gray-300 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </NeonCard>
          ))}
        </div>
      </div>
    </section>
  )
}