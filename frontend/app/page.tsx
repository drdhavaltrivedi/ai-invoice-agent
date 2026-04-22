"use client";

import { Button } from "@/components/ui/button";
import { Mail, Shield, Zap, CheckCircle, ArrowRight, BarChart3, Clock, Globe } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
              <Mail className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">InvoiceAgent</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
            <a href="#workflow" className="hover:text-blue-600 transition-colors">Workflow</a>
            <a href="#security" className="hover:text-blue-600 transition-colors">Security</a>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild className="hidden sm:flex text-gray-600">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-full shadow-lg shadow-blue-600/20 transition-all hover:scale-105 active:scale-95">
              <Link href="/login">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider mb-6">
              <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
              AI-Powered AP Automation
            </div>
            <h1 className="text-6xl lg:text-7xl font-extrabold tracking-tight text-gray-900 leading-[1.1] mb-8">
              Automate Invoices <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Without Lifting a Finger.</span>
            </h1>
            <p className="text-xl text-gray-500 leading-relaxed mb-10 max-w-xl">
              Connect your Gmail, and let our AI-driven agent handle the rest. 
              Extraction, verification, and ERP synchronization — all in one place.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" asChild className="h-16 px-10 text-lg rounded-full bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-600/20 transition-all hover:translate-y-[-2px]">
                <Link href="/login" className="flex items-center gap-2">
                  Start Automating <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-16 px-10 text-lg rounded-full border-gray-200 hover:bg-gray-50 transition-all">
                <Link href="/dashboard?demo=true">Try Live Demo</Link>
              </Button>
            </div>
            <div className="mt-12 flex items-center gap-6">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-10 w-10 rounded-full border-2 border-white bg-gray-200" />
                ))}
              </div>
              <div className="text-sm">
                <span className="font-bold text-gray-900">500+ Businesses</span>
                <p className="text-gray-500">already automating with InvoiceAgent</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-3xl blur-3xl opacity-50 -z-10 animate-pulse" />
            <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl overflow-hidden p-2">
               <img 
                src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=2426&ixlib=rb-4.0.3" 
                alt="Dashboard Preview" 
                className="rounded-2xl shadow-inner border border-gray-50"
              />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/90 backdrop-blur px-6 py-4 rounded-2xl shadow-2xl border border-white flex items-center gap-4">
                <div className="h-12 w-12 bg-green-500 rounded-full flex items-center justify-center text-white">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Match Found</p>
                  <p className="text-xs text-gray-500">Invoice matched with PO #2024-001</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <h2 className="text-4xl font-bold tracking-tight text-gray-900 mb-4">Everything you need to automate AP</h2>
            <p className="text-lg text-gray-500">From inbox to ledger, we've built the most resilient AI pipeline for accounts payable.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Zap className="h-6 w-6 text-blue-600" />}
              title="Instant Extraction"
              description="Our multi-model AI pipeline extracts data with 99% accuracy, including messy scans and photos."
            />
            <FeatureCard 
              icon={<Shield className="h-6 w-6 text-indigo-600" />}
              title="Self-Healing Match"
              description="The system learns from your corrections. Fix it once, and the AI will auto-correct next time."
            />
            <FeatureCard 
              icon={<Globe className="h-6 w-6 text-emerald-600" />}
              title="Global Multi-Currency"
              description="Native support for USD, EUR, INR, and 50+ other currencies with real-time conversion."
            />
            <FeatureCard 
              icon={<BarChart3 className="h-6 w-6 text-purple-600" />}
              title="ERP Sync"
              description="Seamlessly post journal entries directly to your ERP or accounting software."
            />
            <FeatureCard 
              icon={<Clock className="h-6 w-6 text-orange-600" />}
              title="Gmail Polling"
              description="Automatically fetch invoices from your inbox. No more manual downloading and uploading."
            />
            <FeatureCard 
              icon={<CheckCircle className="h-6 w-6 text-blue-600" />}
              title="Vendor Onboarding"
              description="Automatically detect and onboard new vendors from their invoice details."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-6 bg-blue-600 rounded-[3rem] p-12 lg:p-20 relative overflow-hidden shadow-2xl shadow-blue-600/30">
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 h-96 w-96 bg-white/10 rounded-full blur-3xl" />
          <div className="relative z-10 text-center">
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-8">Ready to reclaim your time?</h2>
            <p className="text-xl text-blue-100 mb-10 max-w-xl mx-auto">Join hundreds of accounting teams who have automated their entire invoice workflow.</p>
            <Button size="lg" asChild className="h-16 px-12 text-lg rounded-full bg-white text-blue-600 hover:bg-blue-50 transition-all hover:scale-105 shadow-xl">
              <Link href="/login">Get Started for Free</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:row items-center justify-between gap-8">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <Mail className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold">InvoiceAgent</span>
          </div>
          <div className="flex gap-8 text-sm text-gray-500">
            <a href="#" className="hover:text-blue-600">Privacy</a>
            <a href="#" className="hover:text-blue-600">Terms</a>
            <a href="#" className="hover:text-blue-600">Security</a>
            <a href="#" className="hover:text-blue-600">Contact</a>
          </div>
          <p className="text-sm text-gray-400">© 2026 InvoiceAgent Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="bg-white p-8 rounded-3xl border border-gray-100 hover:border-blue-200 transition-all hover:shadow-xl hover:shadow-blue-500/5 group">
      <div className="h-14 w-14 bg-gray-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-50 transition-colors">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-4">{title}</h3>
      <p className="text-gray-500 leading-relaxed">{description}</p>
    </div>
  );
}
