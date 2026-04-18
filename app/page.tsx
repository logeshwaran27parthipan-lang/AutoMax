"use client";

import Link from "next/link";
import { useState } from "react";

// SVG Icons
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

function EmailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2"/>
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
    </svg>
  );
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"/>
    </svg>
  );
}

function SheetsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 7h2v2H7V7zm0 4h2v2H7v-2zm0 4h2v2H7v-2zm4-8h6v2h-6V7zm0 4h6v2h-6v-2zm0 4h6v2h-6v-2z"/>
    </svg>
  );
}

function WebhookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2"/>
      <path d="m6 17 3.13-5.78c.53-.97.1-2.18-.5-3.1a4 4 0 1 1 6.89-4.06"/>
      <path d="m12 6 3.13 5.73C15.66 12.7 16.9 13 18 13a4 4 0 0 1 0 8"/>
    </svg>
  );
}

function HistoryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
      <path d="M3 3v5h5"/>
      <path d="M12 7v5l4 2"/>
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" x2="20" y1="12" y2="12"/>
      <line x1="4" x2="20" y1="6" y2="6"/>
      <line x1="4" x2="20" y1="18" y2="18"/>
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18"/>
      <path d="m6 6 12 12"/>
    </svg>
  );
}

// Section Badge Component
function SectionBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block px-4 py-1.5 text-sm font-medium text-[#1A1A2E] bg-amber-100 rounded-full mb-4">
      {children}
    </span>
  );
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-white border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="text-xl font-bold text-[#1A1A2E]">
              AutoMax
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-[#6B7280] hover:text-[#1A1A2E] transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-sm text-[#6B7280] hover:text-[#1A1A2E] transition-colors">
                How it works
              </a>
              <a href="#pricing" className="text-sm text-[#6B7280] hover:text-[#1A1A2E] transition-colors">
                Pricing
              </a>
            </div>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-3">
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium text-[#1A1A2E] hover:bg-[#F3F4F6] rounded-lg transition-colors"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 text-sm font-medium text-white bg-[#F59E0B] hover:bg-[#D97706] rounded-lg transition-colors"
              >
                Get Started Free
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-[#6B7280]"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <CloseIcon className="w-6 h-6" />
              ) : (
                <MenuIcon className="w-6 h-6" />
              )}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-[#E5E7EB]">
              <div className="flex flex-col gap-4">
                <a href="#features" className="text-sm text-[#6B7280] hover:text-[#1A1A2E]" onClick={() => setMobileMenuOpen(false)}>
                  Features
                </a>
                <a href="#how-it-works" className="text-sm text-[#6B7280] hover:text-[#1A1A2E]" onClick={() => setMobileMenuOpen(false)}>
                  How it works
                </a>
                <a href="#pricing" className="text-sm text-[#6B7280] hover:text-[#1A1A2E]" onClick={() => setMobileMenuOpen(false)}>
                  Pricing
                </a>
                <div className="flex flex-col gap-2 pt-4 border-t border-[#E5E7EB]">
                  <Link href="/login" className="px-4 py-2 text-sm font-medium text-[#1A1A2E] text-center border border-[#E5E7EB] rounded-lg">
                    Login
                  </Link>
                  <Link href="/register" className="px-4 py-2 text-sm font-medium text-white bg-[#F59E0B] text-center rounded-lg">
                    Get Started Free
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="bg-[#FAFAFA] py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-5 gap-12 lg:gap-16 items-center">
            {/* Left Content - 60% */}
            <div className="lg:col-span-3">
              {/* Badge */}
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-[#1A1A2E] bg-[#FEF3C7] rounded-full mb-6">
                <span className="text-[#F59E0B]">✦</span> Built for Indian businesses
              </span>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-bold text-[#1A1A2E] leading-[1.15] mb-6 text-balance">
                Stop doing the same<br />work twice.
              </h1>

              {/* Subheadline */}
              <p className="text-lg text-[#6B7280] leading-relaxed mb-8 max-w-xl">
                AutoMax connects your WhatsApp, Email, and Google Sheets — and runs your business workflows automatically.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center h-12 px-8 text-base font-semibold text-white bg-[#F59E0B] hover:bg-[#D97706] rounded-lg transition-colors"
                >
                  Get Started Free
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center h-12 px-8 text-base font-medium text-[#1A1A2E] border-2 border-[#1A1A2E] hover:bg-[#1A1A2E] hover:text-white rounded-lg transition-colors"
                >
                  See how it works →
                </a>
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#6B7280]">
                <span className="flex items-center gap-1.5">
                  <CheckIcon className="w-4 h-4 text-green-500" />
                  No credit card needed
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckIcon className="w-4 h-4 text-green-500" />
                  Free forever plan
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckIcon className="w-4 h-4 text-green-500" />
                  Setup in 5 minutes
                </span>
              </div>
            </div>

            {/* Right Content - Workflow Card - 40% */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-[#E5E7EB] p-6">
                {/* Card Header */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-[#1A1A2E]">Lead Follow-up Workflow</h3>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                    Running
                  </span>
                </div>

                {/* Workflow Steps */}
                <div className="space-y-4">
                  {/* Step 1 */}
                  <div className="flex items-center gap-4 p-4 bg-[#FAFAFA] rounded-xl border border-[#E5E7EB]">
                    <div className="w-3 h-3 bg-green-500 rounded-full flex-shrink-0"></div>
                    <WhatsAppIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span className="text-sm text-[#1A1A2E]">New WhatsApp message received</span>
                  </div>

                  {/* Connector */}
                  <div className="flex justify-center">
                    <div className="w-0.5 h-4 bg-[#E5E7EB]"></div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-center gap-4 p-4 bg-[#FAFAFA] rounded-xl border border-[#E5E7EB]">
                    <div className="w-3 h-3 bg-purple-500 rounded-full flex-shrink-0"></div>
                    <SparkleIcon className="w-5 h-5 text-purple-600 flex-shrink-0" />
                    <span className="text-sm text-[#1A1A2E]">AI decides the reply</span>
                  </div>

                  {/* Connector */}
                  <div className="flex justify-center">
                    <div className="w-0.5 h-4 bg-[#E5E7EB]"></div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-center gap-4 p-4 bg-[#FAFAFA] rounded-xl border border-[#E5E7EB]">
                    <div className="w-3 h-3 bg-[#F59E0B] rounded-full flex-shrink-0"></div>
                    <EmailIcon className="w-5 h-5 text-[#F59E0B] flex-shrink-0" />
                    <span className="text-sm text-[#1A1A2E]">Follow-up email sent automatically</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PAIN POINTS SECTION */}
      <section className="bg-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <SectionBadge>Does this sound familiar?</SectionBadge>
            <h2 className="text-3xl sm:text-4xl font-semibold text-[#1A1A2E] mb-4 text-balance">
              You&apos;re losing time to work that should run itself.
            </h2>
            <p className="text-lg text-[#6B7280]">
              Every business owner we talked to said the same things.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="p-6 bg-white border border-[#E5E7EB] rounded-xl">
              <span className="text-3xl mb-4 block">💬</span>
              <h3 className="text-lg font-semibold text-[#1A1A2E] mb-2">
                Sending the same WhatsApp message to every new lead
              </h3>
              <p className="text-sm text-[#6B7280] leading-relaxed">
                Manually, every single day. Copy, paste, send. Repeat.
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-6 bg-white border border-[#E5E7EB] rounded-xl">
              <span className="text-3xl mb-4 block">📊</span>
              <h3 className="text-lg font-semibold text-[#1A1A2E] mb-2">
                Copy-pasting data from WhatsApp into your spreadsheet
              </h3>
              <p className="text-sm text-[#6B7280] leading-relaxed">
                Every. Single. Time. Hours lost to data entry.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-6 bg-white border border-[#E5E7EB] rounded-xl">
              <span className="text-3xl mb-4 block">📧</span>
              <h3 className="text-lg font-semibold text-[#1A1A2E] mb-2">
                Forgetting to send follow-up emails
              </h3>
              <p className="text-sm text-[#6B7280] leading-relaxed">
                Because you were busy running the actual business.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section id="how-it-works" className="bg-[#F3F4F6] py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <SectionBadge>Simple by design</SectionBadge>
            <h2 className="text-3xl sm:text-4xl font-semibold text-[#1A1A2E] text-balance">
              Set it up once. AutoMax runs it forever.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting Line - Desktop Only */}
            <div className="hidden md:block absolute top-8 left-[16.67%] right-[16.67%] h-0.5 bg-[#E5E7EB]"></div>

            {/* Step 1 */}
            <div className="text-center relative">
              <div className="w-16 h-16 mx-auto mb-6 bg-[#F59E0B] text-white rounded-full flex items-center justify-center text-2xl font-bold relative z-10">
                1
              </div>
              <h3 className="text-xl font-semibold text-[#1A1A2E] mb-3">Connect your tools</h3>
              <p className="text-[#6B7280] leading-relaxed">
                Link your WhatsApp, Gmail, and Google Sheets in minutes. No coding needed.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center relative">
              <div className="w-16 h-16 mx-auto mb-6 bg-[#F59E0B] text-white rounded-full flex items-center justify-center text-2xl font-bold relative z-10">
                2
              </div>
              <h3 className="text-xl font-semibold text-[#1A1A2E] mb-3">Build your workflow</h3>
              <p className="text-[#6B7280] leading-relaxed">
                Choose a trigger and add steps. AutoMax gives you pre-built templates to start fast.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center relative">
              <div className="w-16 h-16 mx-auto mb-6 bg-[#F59E0B] text-white rounded-full flex items-center justify-center text-2xl font-bold relative z-10">
                3
              </div>
              <h3 className="text-xl font-semibold text-[#1A1A2E] mb-3">Let AutoMax run it</h3>
              <p className="text-[#6B7280] leading-relaxed">
                Your workflow runs automatically — 24/7, even when you&apos;re sleeping.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="bg-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <SectionBadge>Everything you need</SectionBadge>
            <h2 className="text-3xl sm:text-4xl font-semibold text-[#1A1A2E] text-balance">
              Powerful automations. Zero complexity.
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 bg-white border border-[#E5E7EB] rounded-xl">
              <WhatsAppIcon className="w-6 h-6 text-[#1A1A2E] mb-4" />
              <h3 className="text-base font-semibold text-[#1A1A2E] mb-2">WhatsApp Automation</h3>
              <p className="text-sm text-[#6B7280]">
                Trigger workflows from incoming messages. Reply automatically.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 bg-white border border-[#E5E7EB] rounded-xl">
              <EmailIcon className="w-6 h-6 text-[#1A1A2E] mb-4" />
              <h3 className="text-base font-semibold text-[#1A1A2E] mb-2">Email Follow-ups</h3>
              <p className="text-sm text-[#6B7280]">
                Send personalized emails automatically when a lead comes in.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 bg-white border border-[#E5E7EB] rounded-xl">
              <SparkleIcon className="w-6 h-6 text-[#1A1A2E] mb-4" />
              <h3 className="text-base font-semibold text-[#1A1A2E] mb-2">AI-Powered Decisions</h3>
              <p className="text-sm text-[#6B7280]">
                Let AI read the message and decide what to do next.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 bg-white border border-[#E5E7EB] rounded-xl">
              <SheetsIcon className="w-6 h-6 text-[#1A1A2E] mb-4" />
              <h3 className="text-base font-semibold text-[#1A1A2E] mb-2">Google Sheets Sync</h3>
              <p className="text-sm text-[#6B7280]">
                Append, read, and update your spreadsheets automatically.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 bg-white border border-[#E5E7EB] rounded-xl">
              <WebhookIcon className="w-6 h-6 text-[#1A1A2E] mb-4" />
              <h3 className="text-base font-semibold text-[#1A1A2E] mb-2">Webhook Triggers</h3>
              <p className="text-sm text-[#6B7280]">
                Connect any external system to AutoMax with a single URL.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 bg-white border border-[#E5E7EB] rounded-xl">
              <HistoryIcon className="w-6 h-6 text-[#1A1A2E] mb-4" />
              <h3 className="text-base font-semibold text-[#1A1A2E] mb-2">Full Run History</h3>
              <p className="text-sm text-[#6B7280]">
                See exactly what ran, when it ran, and what happened.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section id="pricing" className="bg-[#F3F4F6] py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <SectionBadge>Honest pricing</SectionBadge>
            <h2 className="text-3xl sm:text-4xl font-semibold text-[#1A1A2E] mb-4 text-balance">
              Free to start. Forever.
            </h2>
            <p className="text-lg text-[#6B7280]">
              AutoMax believes every small business deserves automation — not just the big ones.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Starter Plan */}
            <div className="p-8 bg-white border border-[#E5E7EB] rounded-xl">
              <h3 className="text-xl font-semibold text-[#1A1A2E] mb-2">Starter</h3>
              <div className="mb-1">
                <span className="text-4xl font-bold text-[#1A1A2E]">₹0</span>
                <span className="text-[#6B7280]"> / month</span>
              </div>
              <p className="text-sm text-[#6B7280] mb-6">Free forever</p>

              <ul className="space-y-3 mb-8">
                {[
                  "Up to 3 workflows",
                  "WhatsApp + Email + Sheets",
                  "100 workflow runs/month",
                  "AI decision steps",
                  "Run history",
                ].map((feature, index) => (
                  <li key={index} className="flex items-center gap-3 text-sm text-[#1A1A2E]">
                    <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href="/register"
                className="block w-full py-3 text-center text-base font-semibold text-white bg-[#F59E0B] hover:bg-[#D97706] rounded-lg transition-colors"
              >
                Get Started Free
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="p-8 bg-white border-2 border-[#F59E0B] rounded-xl relative">
              {/* Coming Soon Badge */}
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 text-xs font-semibold text-[#F59E0B] bg-[#FEF3C7] rounded-full">
                Coming Soon
              </span>

              <h3 className="text-xl font-semibold text-[#1A1A2E] mb-2">Pro</h3>
              <div className="mb-1">
                <span className="text-4xl font-bold text-[#1A1A2E]">₹499</span>
                <span className="text-[#6B7280]"> / month</span>
              </div>
              <p className="text-sm text-[#6B7280] mb-6">For growing businesses</p>

              <ul className="space-y-3 mb-8">
                {[
                  "Unlimited workflows",
                  "Unlimited runs",
                  "Priority support",
                  "Team access",
                  "Custom webhooks",
                  "Advanced AI models",
                ].map((feature, index) => (
                  <li key={index} className="flex items-center gap-3 text-sm text-[#1A1A2E]">
                    <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                className="block w-full py-3 text-center text-base font-semibold text-[#1A1A2E] border-2 border-[#1A1A2E] hover:bg-[#1A1A2E] hover:text-white rounded-lg transition-colors"
              >
                Join Waitlist
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA BANNER */}
      <section className="bg-[#1A1A2E] py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-semibold text-white mb-4 text-balance">
            Your competitors are automating. Are you?
          </h2>
          <p className="text-lg text-gray-300 mb-8">
            Join hundreds of Indian businesses saving hours every week with AutoMax.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center h-14 px-8 text-base font-bold text-[#1A1A2E] bg-[#F59E0B] hover:bg-[#D97706] rounded-lg transition-colors"
          >
            Start for Free — No Credit Card Needed
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-white border-t border-[#E5E7EB] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 items-start">
            {/* Left - Logo and tagline */}
            <div>
              <span className="text-xl font-bold text-[#1A1A2E]">AutoMax</span>
              <p className="text-sm text-[#6B7280] mt-2">
                Automate the work. Focus on the business.
              </p>
              <p className="text-sm text-[#6B7280] mt-4">
                Made with care in Tiruppur, Tamil Nadu, India 🇮🇳
              </p>
            </div>

            {/* Center - Links */}
            <div className="flex flex-wrap justify-center gap-6">
              <a href="#features" className="text-sm text-[#6B7280] hover:text-[#1A1A2E]">
                Features
              </a>
              <a href="#how-it-works" className="text-sm text-[#6B7280] hover:text-[#1A1A2E]">
                How it works
              </a>
              <a href="#pricing" className="text-sm text-[#6B7280] hover:text-[#1A1A2E]">
                Pricing
              </a>
              <Link href="/login" className="text-sm text-[#6B7280] hover:text-[#1A1A2E]">
                Login
              </Link>
              <Link href="/register" className="text-sm text-[#6B7280] hover:text-[#1A1A2E]">
                Register
              </Link>
            </div>

            {/* Right - Copyright */}
            <div className="text-sm text-[#6B7280] md:text-right">
              © 2026 AutoMax. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
