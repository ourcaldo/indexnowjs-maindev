'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import NeonCard from './NeonCard'

export default function EnhancedFAQSection() {
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null)

  const faqs = [
    {
      question: "What rank tracking features does IndexNow Studio provide?",
      answer: "IndexNow Studio offers **daily keyword position tracking**, **multi-device monitoring** (desktop/mobile), **country-specific tracking**, **position history analytics**, **tag-based keyword organization**, and **domain management**. Track unlimited keywords across multiple domains with detailed historical data."
    },
    {
      question: "How accurate is the rank tracking data?",
      answer: "Our **rank tracking system** uses ScrapingDog API for reliable daily position checks. You get **real-time position updates**, **historical trend analysis**, and **device-specific rankings** (desktop vs mobile) across different countries for accurate SEO insights."
    },
    {
      question: "Can I track multiple websites and keywords?",
      answer: "Yes! IndexNow Studio supports **unlimited domain tracking**. Each domain can have its own keyword set with **individual country/device configurations**. Organize keywords with **custom tags** and view **comprehensive analytics** for each domain separately."
    },
    {
      question: "What indexing automation is included?",
      answer: "Beyond rank tracking, IndexNow Studio provides **automated Google URL indexing** via Google Indexing API. Upload service account credentials for **automated submission**, **scheduled indexing jobs**, **quota monitoring**, and **email notifications** for job completion."
    },
    {
      question: "How does the scheduling system work?",
      answer: "Set up **automated indexing jobs** with flexible scheduling: one-time, hourly, daily, weekly, or monthly. The system includes **service account load balancing**, **quota management**, and **email notifications** to keep your URLs consistently indexed."
    },
    {
      question: "What analytics and reporting features are available?",
      answer: "View **detailed position history**, **ranking trend analysis**, **keyword performance metrics**, and **domain-specific statistics**. Filter data by device type, country, and time periods. Export historical data and track keyword progress over time."
    },
    {
      question: "Is my data and credentials secure?",
      answer: "Yes, IndexNow Studio uses **enterprise-grade security**: encrypted storage for service account credentials, comprehensive audit logging, rate limiting, and secure authentication with role-based access control."
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
            <div key={index} className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:bg-white/10 transition-all duration-300">
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
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}