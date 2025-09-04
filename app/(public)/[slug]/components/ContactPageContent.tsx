'use client'

import { Mail, Phone, MapPin, Clock, Send, MessageCircle } from 'lucide-react'

interface CMSPage {
  id: string
  title: string
  slug: string
  content: string | null
  template: string
  featured_image_url: string | null
  status: string
  is_homepage: boolean
  meta_title: string | null
  meta_description: string | null
  custom_css: string | null
  custom_js: string | null
  published_at: string | null
  created_at: string
  updated_at: string
  author_name?: string
}

interface ContactPageContentProps {
  page: CMSPage
}

export default function ContactPageContent({ page }: ContactPageContentProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-[#1A1A1A] text-white">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="max-w-4xl">
            <h1 className="text-4xl lg:text-5xl font-bold mb-6">
              {page.title}
            </h1>
            
            {page.meta_description && (
              <p className="text-xl text-[#F7F9FC] leading-relaxed mb-8">
                {page.meta_description}
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: Mail,
                  title: 'Email Us',
                  content: 'support@indexnow.studio',
                  description: 'Get in touch via email'
                },
                {
                  icon: MessageCircle,
                  title: 'Live Chat',
                  content: 'Available 24/7',
                  description: 'Instant support when you need it'
                },
                {
                  icon: Clock,
                  title: 'Response Time',
                  content: 'Within 24 hours',
                  description: 'We respond quickly to your inquiries'
                }
              ].map((item, index) => {
                const IconComponent = item.icon
                return (
                  <div key={index} className="text-center">
                    <div className="w-12 h-12 bg-[#3D8BFF]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <IconComponent className="h-6 w-6 text-[#3D8BFF]" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                    <p className="text-[#3D8BFF] font-medium mb-1">{item.content}</p>
                    <p className="text-sm text-[#F7F9FC]">{item.description}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div>
              <h2 className="text-3xl font-bold text-[#1A1A1A] mb-8">Send us a Message</h2>
              
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-[#1A1A1A] mb-2">
                      First Name <span className="text-[#E63946]">*</span>
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      required
                      className="w-full px-4 py-3 border border-[#E0E6ED] rounded-lg focus:ring-2 focus:ring-[#3D8BFF] focus:border-transparent"
                      placeholder="Your first name"
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-[#1A1A1A] mb-2">
                      Last Name <span className="text-[#E63946]">*</span>
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      required
                      className="w-full px-4 py-3 border border-[#E0E6ED] rounded-lg focus:ring-2 focus:ring-[#3D8BFF] focus:border-transparent"
                      placeholder="Your last name"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-[#1A1A1A] mb-2">
                    Email Address <span className="text-[#E63946]">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    className="w-full px-4 py-3 border border-[#E0E6ED] rounded-lg focus:ring-2 focus:ring-[#3D8BFF] focus:border-transparent"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-[#1A1A1A] mb-2">
                    Subject <span className="text-[#E63946]">*</span>
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    required
                    className="w-full px-4 py-3 border border-[#E0E6ED] rounded-lg focus:ring-2 focus:ring-[#3D8BFF] focus:border-transparent"
                  >
                    <option value="">Select a subject</option>
                    <option value="general">General Inquiry</option>
                    <option value="support">Technical Support</option>
                    <option value="billing">Billing Question</option>
                    <option value="feature">Feature Request</option>
                    <option value="partnership">Partnership</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-[#1A1A1A] mb-2">
                    Message <span className="text-[#E63946]">*</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={6}
                    className="w-full px-4 py-3 border border-[#E0E6ED] rounded-lg focus:ring-2 focus:ring-[#3D8BFF] focus:border-transparent resize-none"
                    placeholder="Tell us more about your inquiry..."
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 bg-[#3D8BFF] hover:bg-[#3D8BFF]/90 text-white px-8 py-4 rounded-lg font-semibold transition-colors"
                >
                  <Send className="h-5 w-5" />
                  Send Message
                </button>
              </form>
            </div>

            {/* Content & Info */}
            <div className="space-y-8">
              {/* Custom Content */}
              {page.content && (
                <div>
                  <div className="prose prose-lg max-w-none">
                    <div 
                      dangerouslySetInnerHTML={{ __html: page.content }} 
                      className="text-[#1A1A1A] leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {/* Contact Information */}
              <div className="bg-[#F7F9FC] rounded-lg p-8">
                <h3 className="text-xl font-semibold text-[#1A1A1A] mb-6">Get in Touch</h3>
                
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-[#3D8BFF]/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <Mail className="h-5 w-5 text-[#3D8BFF]" />
                    </div>
                    <div>
                      <h4 className="font-medium text-[#1A1A1A] mb-1">Email Support</h4>
                      <p className="text-[#6C757D] text-sm mb-2">
                        For technical support and general inquiries
                      </p>
                      <a 
                        href="mailto:support@indexnow.studio"
                        className="text-[#3D8BFF] hover:underline"
                      >
                        support@indexnow.studio
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-[#3D8BFF]/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <MessageCircle className="h-5 w-5 text-[#3D8BFF]" />
                    </div>
                    <div>
                      <h4 className="font-medium text-[#1A1A1A] mb-1">Live Chat</h4>
                      <p className="text-[#6C757D] text-sm mb-2">
                        Available 24/7 for immediate assistance
                      </p>
                      <p className="text-[#3D8BFF]">Chat widget available in app</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-[#3D8BFF]/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <Clock className="h-5 w-5 text-[#3D8BFF]" />
                    </div>
                    <div>
                      <h4 className="font-medium text-[#1A1A1A] mb-1">Response Time</h4>
                      <p className="text-[#6C757D] text-sm mb-2">
                        We strive to respond to all inquiries promptly
                      </p>
                      <p className="text-[#4BB543]">Usually within 24 hours</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* FAQ Quick Links */}
              <div className="bg-[#3D8BFF]/5 border border-[#3D8BFF]/20 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-[#3D8BFF] mb-4">
                  Need Quick Answers?
                </h3>
                <p className="text-[#3D8BFF] text-sm mb-4">
                  Check out our FAQ section for immediate answers to common questions.
                </p>
                <a
                  href="/faq"
                  className="inline-flex items-center gap-2 text-[#3D8BFF] hover:text-[#3D8BFF]/80 font-medium"
                >
                  Visit FAQ Section
                  <Send className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}