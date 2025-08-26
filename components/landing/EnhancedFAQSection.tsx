'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import NeonCard from './NeonCard'

export default function EnhancedFAQSection() {
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null)

  const faqs = [
    {
      question: "How accurate is IndexNow's data?",
      answer: "We use neutralized personalization and reliable location/device simulation with consistent daily schedules to ensure stable, accurate trendlines. Our data reflects real search results your customers see."
    },
    {
      question: "Do you track mobile and local rankings?",
      answer: "Yes, we support desktop and mobile tracking across 190+ countries. For local SEO, we can track down to city and ZIP code level, giving you granular insights into local performance."
    },
    {
      question: "How often do you check rankings?",
      answer: "Plans include daily checks by default, with weekly options available. Pro and Agency plans can set custom schedules including on-demand checks when you need immediate updates."
    },
    {
      question: "Can I add competitors to track?",
      answer: "Absolutely. Pro plans include up to 5 competitors per project, while Agency plans offer unlimited competitor tracking to keep you ahead of the competition."
    },
    {
      question: "Do you offer white-label reports?",
      answer: "Yes, our Pro and Agency plans include fully branded PDF reports and live dashboard links. Add your logo, colors, and domain for seamless client presentation."
    },
    {
      question: "What happens if I exceed my keyword limit?",
      answer: "No surprise fees. We'll notify you when approaching limits and offer easy upgrade options. Overage is handled transparently with clear pricing per additional keyword block."
    },
    {
      question: "Is there an API available?",
      answer: "Yes, we provide a comprehensive REST API for Pro and Agency plans, allowing you to integrate ranking data into your existing workflows and custom dashboards."
    }
  ]

  return (
    <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-white">
            Frequently asked questions
          </h2>
          <p className="text-xl text-gray-300">
            Everything you need to know about IndexNow rank tracking.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <NeonCard key={index} intensity="low">
              <div className="p-1">
                <button
                  onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                  className="w-full text-left p-6 focus:outline-none"
                >
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-white pr-4">
                      {faq.question}
                    </h3>
                    {expandedFAQ === index ? (
                      <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    )}
                  </div>
                </button>
                
                {expandedFAQ === index && (
                  <div className="px-6 pb-6">
                    <p className="text-gray-300 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            </NeonCard>
          ))}
        </div>
      </div>
    </section>
  )
}