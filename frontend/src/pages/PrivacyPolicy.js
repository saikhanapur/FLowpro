import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PrivacyPolicy = () => {
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
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Privacy Policy</h1>
        <p className="text-slate-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-slate max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Information We Collect</h2>
            <p className="text-slate-700 mb-4">
              SuperHumanly collects information you provide directly to us when you create an account, use our services, or communicate with us.
            </p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li><strong>Account Information:</strong> Name, email address, and password</li>
              <li><strong>Process Data:</strong> Documents, flowcharts, and process descriptions you create</li>
              <li><strong>Usage Data:</strong> Information about how you use our service</li>
              <li><strong>Device Information:</strong> Browser type, IP address, and device identifiers</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">2. How We Use Your Information</h2>
            <p className="text-slate-700 mb-4">We use the information we collect to:</p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li>Provide, maintain, and improve our services</li>
              <li>Process your documents and generate flowcharts using AI</li>
              <li>Send you technical notices and support messages</li>
              <li>Respond to your comments and questions</li>
              <li>Protect against fraudulent or unauthorized activity</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">3. Data Storage and Security</h2>
            <p className="text-slate-700 mb-4">
              We take data security seriously and implement industry-standard measures to protect your information:
            </p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li>All data is encrypted in transit using TLS/SSL</li>
              <li>Passwords are hashed using bcrypt</li>
              <li>Database access is restricted and monitored</li>
              <li>Regular security audits and updates</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Data Sharing and Disclosure</h2>
            <p className="text-slate-700 mb-4">
              We do not sell your personal information. We may share your information in the following circumstances:
            </p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li><strong>With your consent:</strong> When you authorize us to share specific information</li>
              <li><strong>Service providers:</strong> Third-party services that help us operate (e.g., Claude AI for processing)</li>
              <li><strong>Legal requirements:</strong> When required by law or to protect our rights</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Your Rights and Choices</h2>
            <p className="text-slate-700 mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li>Access and update your personal information</li>
              <li>Delete your account and associated data</li>
              <li>Export your data in a portable format</li>
              <li>Opt out of marketing communications</li>
            </ul>
            <p className="text-slate-700 mt-4">
              To exercise these rights, please contact us at <a href="mailto:privacy@superhumanly.ai" className="text-blue-600 hover:underline">privacy@superhumanly.ai</a>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">6. Data Retention</h2>
            <p className="text-slate-700">
              We retain your information for as long as your account is active or as needed to provide services. 
              When you delete your account, we will delete your personal information within 30 days, except where 
              we are required to retain it for legal compliance.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">7. International Data Transfers</h2>
            <p className="text-slate-700">
              Your information may be transferred to and processed in countries other than your country of residence. 
              We ensure appropriate safeguards are in place to protect your data in accordance with this Privacy Policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">8. Children's Privacy</h2>
            <p className="text-slate-700">
              Our services are not intended for children under 13 years of age. We do not knowingly collect 
              personal information from children under 13.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">9. Changes to This Policy</h2>
            <p className="text-slate-700">
              We may update this Privacy Policy from time to time. We will notify you of significant changes 
              by posting the new policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">10. Contact Us</h2>
            <p className="text-slate-700">
              If you have questions about this Privacy Policy, please contact us:
            </p>
            <ul className="list-none pl-0 text-slate-700 mt-4 space-y-2">
              <li>Email: <a href="mailto:privacy@superhumanly.ai" className="text-blue-600 hover:underline">privacy@superhumanly.ai</a></li>
              <li>Address: SuperHumanly, Inc.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
