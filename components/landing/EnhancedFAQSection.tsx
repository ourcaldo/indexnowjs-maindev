'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import NeonCard from './NeonCard'

export default function EnhancedFAQSection() {
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null)

  const faqs = [
    {
      question: "How does IndexNow Studio work?",
      answer: "IndexNow Studio combines Google URL indexing automation with rank tracking. Upload Google service account credentials, submit URLs via sitemaps or manual lists, and track keyword positions across countries and devices."
    },
    {
      question: "What indexing features are included?",
      answer: "We provide automated Google Indexing API submission, service account management with load balancing, scheduled jobs (one-time to monthly), quota monitoring, and email notifications for job completion."
    },
    {
      question: "How often do you check rankings?",
      answer: "Our rank tracking system checks keyword positions daily using ScrapingDog API. You can view position history, filter by device (desktop/mobile), country, and manage keywords with custom tags."
    },
    {
      question: "Can I track multiple domains?",
      answer: "Yes, you can add multiple domains to your account. Each domain can have its own set of keywords with individual tracking configurations for different countries and devices."
    },
    {
      question: "What payment methods do you support?",
      answer: "We support multiple payment methods through Midtrans integration including Snap payments, recurring subscriptions, and bank transfers with automatic invoice generation."
    },
    {
      question: "How do service accounts work for indexing?",
      answer: "Upload your Google service account JSON files securely. We encrypt credentials and automatically load balance requests across accounts while respecting Google's API quotas (200 daily, 60 per minute)."
    },
    {
      question: "Is my data secure?",
      answer: "Yes, we use AES-256-CBC encryption for sensitive data, comprehensive audit logging, rate limiting, and follow security best practices with Supabase authentication and database security."
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