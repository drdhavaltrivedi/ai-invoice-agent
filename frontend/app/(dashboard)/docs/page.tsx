"use client";

import { motion } from "framer-motion";
import { 
  Upload, 
  Mail, 
  Cpu, 
  CheckCircle2, 
  ArrowRight, 
  FileCheck, 
  Database, 
  Settings, 
  ShieldCheck,
  Zap
} from "lucide-react";

const steps = [
  {
    title: "Ingest Invoices",
    description: "Start by uploading PDF or image invoices directly, or connect your Gmail to automatically pull invoices from your inbox.",
    icon: Upload,
    color: "blue",
    details: [
      "Supported formats: PDF, JPG, PNG",
      "Bulk upload capability",
      "Automatic Gmail polling every 5 minutes",
      "Source tracking (Upload vs. Email)"
    ]
  },
  {
    title: "AI Data Extraction",
    description: "Our Gemini-powered AI engine analyzes the document to extract key fields with human-like precision.",
    icon: Cpu,
    color: "purple",
    details: [
      "Vendor name and GSTIN matching",
      "Invoice number and date",
      "PO Number detection",
      "Line item breakdown (Qty, Rate, Amount)"
    ]
  },
  {
    title: "Automated Reconciliation",
    description: "The system automatically matches the extracted data against your existing Purchase Orders (PO) and Goods Receipt Notes (GRN).",
    icon: FileCheck,
    color: "amber",
    details: [
      "3-Way matching (Invoice-PO-GRN)",
      "Price and quantity variance detection",
      "Automatic status updates",
      "Exception flagging for manual review"
    ]
  },
  {
    title: "Review & Resolve",
    description: "Handle exceptions through an intuitive interface where you can approve, reject, or edit extracted data.",
    icon: ShieldCheck,
    color: "rose",
    details: [
      "Single-click approval for matched invoices",
      "Detailed exception reasoning",
      "Human-in-the-loop validation",
      "Audit logs for all actions"
    ]
  },
  {
    title: "ERP Sync",
    description: "Once validated, invoices are posted to your ERP ledger system, completing the Accounts Payable cycle.",
    icon: Database,
    color: "emerald",
    details: [
      "Real-time ledger entries",
      "Payment status tracking",
      "Vendor balance updates",
      "Historical data archiving"
    ]
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function DocsPage() {
  return (
    <div className="max-w-5xl mx-auto py-12 px-6">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16"
      >
        <h1 className="text-4xl font-bold text-gray-900 mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
          How it Works: The AI Invoice Journey
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto">
          Master the automated workflow of our AI Invoice Processing Agent. 
          From ingestion to ERP posting, every step is optimized for speed and accuracy.
        </p>
      </motion.div>

      <div className="grid gap-12">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative"
        >
          {/* Vertical Line */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200 hidden md:block" />

          {steps.map((step, idx) => (
            <motion.div 
              key={idx}
              variants={itemVariants}
              className="relative flex flex-col md:flex-row gap-8 mb-16 last:mb-0"
            >
              {/* Step Icon */}
              <div className="flex-shrink-0 z-10">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg bg-white border-2 border-${step.color}-100`}>
                  <step.icon className={`h-8 w-8 text-${step.color}-600`} />
                </div>
              </div>

              {/* Step Content */}
              <div className="flex-1 bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-${step.color}-50 text-${step.color}-700`}>
                    Step {idx + 1}
                  </span>
                  <h3 className="text-2xl font-bold text-gray-900">{step.title}</h3>
                </div>
                
                <p className="text-gray-600 text-lg mb-6 leading-relaxed">
                  {step.description}
                </p>

                <div className="grid md:grid-cols-2 gap-4">
                  {step.details.map((detail, i) => (
                    <div key={i} className="flex items-center gap-2 text-gray-500 text-sm">
                      <CheckCircle2 className={`h-4 w-4 text-${step.color}-500`} />
                      {detail}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Feature Highlights */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-20 pt-20 border-t border-gray-100"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why AI-Driven AP Automation?</h2>
            <p className="text-gray-500">Industry-leading technology to transform your financial operations.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
              <Zap className="h-8 w-8 text-blue-600 mb-4" />
              <h4 className="font-bold text-blue-900 mb-2">90% Faster Processing</h4>
              <p className="text-blue-700 text-sm">Reduce manual data entry and invoice cycle time from days to minutes.</p>
            </div>
            <div className="p-6 bg-purple-50 rounded-2xl border border-purple-100">
              <ShieldCheck className="h-8 w-8 text-purple-600 mb-4" />
              <h4 className="font-bold text-purple-900 mb-2">Zero Data Leaks</h4>
              <p className="text-purple-700 text-sm">Enterprise-grade security for your financial documents and vendor data.</p>
            </div>
            <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
              <Settings className="h-8 w-8 text-emerald-600 mb-4" />
              <h4 className="font-bold text-emerald-900 mb-2">Scalable Workflow</h4>
              <p className="text-emerald-700 text-sm">Process thousands of invoices monthly without increasing headcount.</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Call to Action */}
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        className="mt-24 p-12 bg-gray-900 rounded-3xl text-center text-white relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600/10 rounded-full -ml-32 -mb-32 blur-3xl" />
        
        <h2 className="text-3xl font-bold mb-6">Ready to automate your invoices?</h2>
        <p className="text-gray-400 mb-8 max-w-xl mx-auto text-lg">
          Connect your first vendor or upload an invoice to see the AI in action.
        </p>
        <div className="flex justify-center gap-4">
          <a 
            href="/invoices" 
            className="px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition-all flex items-center gap-2"
          >
            Start Processing <ArrowRight className="h-5 w-5" />
          </a>
          <a 
            href="/settings" 
            className="px-8 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl font-bold transition-all"
          >
            Configure Gmail
          </a>
        </div>
      </motion.div>
    </div>
  );
}
