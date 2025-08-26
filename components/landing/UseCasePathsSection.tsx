'use client'

import { User, Users, Building2 } from 'lucide-react'
import NeonCard from './NeonCard'

export default function UseCasePathsSection() {
  const useCases = [
    {
      icon: User,
      title: "Solo/Small Team",
      description: "Everything you need to prove impact without paying for features you'll never touch.",
      features: ["Up to 500 keywords", "Daily rank checks", "Basic reports", "Email alerts"],
      color: "text-blue-400"
    },
    {
      icon: Building2,
      title: "Agencies",
      description: "Clean, white-label reports and team roles. Track many clients, stay within budget.",
      features: ["Unlimited projects", "White-label reports", "Team collaboration", "Priority support"],
      color: "text-cyan-400"
    },
    {
      icon: Users,
      title: "In-house Marketer",
      description: "Daily visibility without distracting extras. Show real progress to stakeholders.",
      features: ["Executive dashboards", "Automated reporting", "Competitor tracking", "Custom alerts"],
      color: "text-green-400"
    }
  ]

  return (
    <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-white">
            Built for your workflow
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Whether you're flying solo or managing a team, IndexNow adapts to your needs.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {useCases.map((useCase, index) => (
            <div key={index} className="bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 p-8 hover:bg-white/10 transition-all duration-300">
              <div className={`w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-6 ${useCase.color}`}>
                <useCase.icon className="w-8 h-8" />
              </div>
              
              <h3 className="text-xl font-semibold mb-4 text-white">
                {useCase.title}
              </h3>
              
              <p className="text-gray-300 mb-6 leading-relaxed">
                {useCase.description}
              </p>
              
              <ul className="space-y-2">
                {useCase.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                    <span className="text-sm text-gray-400">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}