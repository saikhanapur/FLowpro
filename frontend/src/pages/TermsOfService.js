import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">SuperHumanly</span>
          </div>
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Terms of Service</h1>
        <p className="text-slate-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-slate max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-slate-700 mb-4">
              By accessing and using SuperHumanly ("Service"), you accept and agree to be bound by these Terms of Service 
              ("Terms"). If you do not agree to these Terms, please do not use the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">2. Description of Service</h2>
            <p className="text-slate-700 mb-4">
              SuperHumanly provides an AI-powered platform for creating and managing process flowcharts. The Service includes:
            </p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li>Document upload and AI-powered process extraction</li>
              <li>Interactive flowchart generation and editing</li>
              <li>Workspace organization and collaboration tools</li>
              <li>Export and sharing capabilities</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">3. User Accounts</h2>
            <p className="text-slate-700 mb-4">To use the Service, you must:</p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li>Be at least 13 years of age</li>
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your password</li>
              <li>Notify us immediately of any unauthorized access</li>
              <li>Be responsible for all activities under your account</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Acceptable Use</h2>
            <p className="text-slate-700 mb-4">You agree not to:</p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li>Use the Service for any illegal purpose</li>
              <li>Violate any laws or regulations</li>
              <li>Infringe on intellectual property rights</li>
              <li>Upload malicious code or viruses</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Use automated means to access the Service without permission</li>
              <li>Interfere with or disrupt the Service</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Content Ownership and License</h2>
            <p className="text-slate-700 mb-4">
              <strong>Your Content:</strong> You retain all rights to the content you create and upload ("Your Content"). 
              By using the Service, you grant us a limited license to process, store, and display Your Content solely 
              to provide the Service.
            </p>
            <p className="text-slate-700 mb-4">
              <strong>Our Content:</strong> The Service, including its design, features, and functionality, is owned by 
              SuperHumanly and protected by copyright, trademark, and other laws.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">6. AI Processing</h2>
            <p className="text-slate-700 mb-4">
              Our Service uses AI (including Claude AI) to process your documents and generate flowcharts. You acknowledge that:
            </p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li>AI-generated content may contain errors or inaccuracies</li>
              <li>You are responsible for reviewing and verifying AI output</li>
              <li>Your documents may be processed by third-party AI services</li>
              <li>We take measures to protect your data during processing</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">7. Pricing and Payment</h2>
            <p className="text-slate-700 mb-4">
              Some features of the Service may require payment. By purchasing a paid plan:
            </p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li>You agree to pay the fees as stated at the time of purchase</li>
              <li>All fees are non-refundable unless otherwise stated</li>
              <li>Subscription renewals are automatic unless cancelled</li>
              <li>We may change pricing with 30 days' notice</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">8. Termination</h2>
            <p className="text-slate-700 mb-4">
              We may suspend or terminate your account if you violate these Terms. You may terminate your account 
              at any time by contacting us. Upon termination:
            </p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li>Your access to the Service will cease</li>
              <li>Your data will be deleted within 30 days</li>
              <li>Paid subscriptions will not be refunded</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">9. Disclaimer of Warranties</h2>
            <p className="text-slate-700 mb-4">
              THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE DO NOT WARRANT THAT:
            </p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li>The Service will be uninterrupted or error-free</li>
              <li>AI-generated content will be accurate or complete</li>
              <li>Defects will be corrected</li>
              <li>The Service is free from viruses or harmful components</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">10. Limitation of Liability</h2>
            <p className="text-slate-700 mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, SUPERHUMANLY SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, 
              SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING FROM YOUR USE OF THE SERVICE.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">11. Changes to Terms</h2>
            <p className="text-slate-700">
              We reserve the right to modify these Terms at any time. We will notify you of material changes by 
              posting the updated Terms on this page. Your continued use of the Service after changes constitutes 
              acceptance of the new Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">12. Governing Law</h2>
            <p className="text-slate-700">
              These Terms shall be governed by and construed in accordance with the laws of the jurisdiction where 
              SuperHumanly operates, without regard to its conflict of law provisions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">13. Contact Information</h2>
            <p className="text-slate-700">
              For questions about these Terms, please contact us:
            </p>
            <ul className="list-none pl-0 text-slate-700 mt-4 space-y-2">
              <li>Email: <a href="mailto:legal@superhumanly.ai" className="text-blue-600 hover:underline">legal@superhumanly.ai</a></li>
              <li>Address: SuperHumanly, Inc.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
