import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, Zap, Users, Shield, ChevronRight, CheckCircle, Play, Upload, Mic, Network, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/70 backdrop-blur-lg border-b border-slate-200/50 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                SuperHumanly
              </span>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                EARLY ACCESS
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-slate-600 hover:text-slate-900 font-medium transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-slate-600 hover:text-slate-900 font-medium transition-colors">
              How it Works
            </a>
            <a href="#pricing" className="text-slate-600 hover:text-slate-900 font-medium transition-colors">
              Pricing
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/login')}
              className="font-medium"
            >
              Sign In
            </Button>
            <Button 
              onClick={() => navigate('/signup')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium"
            >
              Get Started
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-12 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-200 mb-8">
            <Zap className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-600">AI-Powered Process Intelligence</span>
          </div>

          <h1 className="text-6xl md:text-7xl font-bold text-slate-900 mb-6 leading-tight">
            Find what's slowing down
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
              your company.
            </span>
          </h1>

          <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            Upload your process. AI shows what's broken, what it costs, and how to fix it.
          </p>
          
          <p className="text-2xl font-semibold text-slate-900 mb-12">
            Save thousands per month. See results in minutes.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Button 
              size="lg"
              onClick={() => navigate('/signup')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-10 py-7 text-lg font-semibold shadow-xl hover:shadow-2xl transition-all"
            >
              Try it now
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>

          <p className="text-sm text-slate-500 mt-6">
            No credit card required • Free 14-day trial • Cancel anytime
          </p>
        </div>
      </section>

      {/* Subtle Section Separator */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>

      {/* Features Section */}
      <section id="features" className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-slate-900 mb-4">
              Everything you need to map processes
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Powerful AI, intuitive interface, enterprise-grade security
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            {/* Feature 1 */}
            <div className="p-8 rounded-2xl border border-slate-100 hover:border-blue-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 bg-white group">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">AI-Powered Analysis</h3>
              <p className="text-slate-600 leading-relaxed">
                Advanced AI analyzes your processes, identifies gaps, bottlenecks, and suggests improvements automatically.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-2xl border border-slate-100 hover:border-purple-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 bg-white group">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Multi-Input Capture</h3>
              <p className="text-slate-600 leading-relaxed">
                Upload documents, record voice, or chat with AI. Add context to refine outputs. Works your way.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-2xl border border-slate-100 hover:border-emerald-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 bg-white group">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Enterprise Security</h3>
              <p className="text-slate-600 leading-relaxed">
                SOC 2 compliant, encrypted at rest and in transit. Your data never leaves your control.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-slate-900 mb-4">
              How it works
            </h2>
            <p className="text-xl text-slate-600">
              Three simple steps to process clarity
            </p>
          </div>

          {/* Horizontal Process Flow */}
          <div className="grid md:grid-cols-3 gap-6 relative">
            {/* Connecting arrows for desktop */}
            <div className="hidden md:block absolute top-1/4 left-1/3 transform -translate-x-1/2 text-slate-300">
              <ArrowRight className="w-8 h-8" />
            </div>
            <div className="hidden md:block absolute top-1/4 left-2/3 transform -translate-x-1/2 text-slate-300">
              <ArrowRight className="w-8 h-8" />
            </div>

            {/* Step 1: Upload */}
            <div className="relative bg-white p-8 rounded-2xl border-2 border-blue-200 hover:border-blue-400 hover:shadow-xl transition-all group">
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                  <Upload className="w-10 h-10 text-white" />
                </div>
                <div className="mb-4">
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-600 text-xs font-bold rounded-full mb-3">
                    STEP 1
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">Upload a Doc</h3>
                <p className="text-slate-600 leading-relaxed">
                  Drop a PDF, Word doc, or any process document. We'll extract the content instantly.
                </p>
              </div>
            </div>

            {/* Step 2: Add Context */}
            <div className="relative bg-white p-8 rounded-2xl border-2 border-purple-200 hover:border-purple-400 hover:shadow-xl transition-all group">
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                  <Mic className="w-10 h-10 text-white" />
                </div>
                <div className="mb-4">
                  <span className="inline-block px-3 py-1 bg-purple-100 text-purple-600 text-xs font-bold rounded-full mb-3">
                    STEP 2
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">Add Context</h3>
                <p className="text-slate-600 leading-relaxed">
                  Speak or type additional details. Our AI uses your context for precision.
                </p>
              </div>
            </div>

            {/* Step 3: Get Flowchart */}
            <div className="relative bg-white p-8 rounded-2xl border-2 border-emerald-200 hover:border-emerald-400 hover:shadow-xl transition-all group">
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                  <Network className="w-10 h-10 text-white" />
                </div>
                <div className="mb-4">
                  <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-600 text-xs font-bold rounded-full mb-3">
                    STEP 3
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">Get Flowchart</h3>
                <p className="text-slate-600 leading-relaxed">
                  Receive an interactive flowchart with gaps identified and insights highlighted.
                </p>
              </div>
            </div>
          </div>

          {/* CTA below process */}
          <div className="text-center mt-12">
            <Button 
              size="lg"
              onClick={() => navigate('/signup')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 text-lg font-semibold"
            >
              See it in action
              <Play className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-slate-900 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-xl text-slate-600">
              Choose the plan that fits your team
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Free Tier */}
            <div className="p-8 rounded-2xl border-2 border-slate-200 bg-white">
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Free</h3>
              <p className="text-slate-600 mb-6">Perfect for trying out</p>
              <div className="mb-6">
                <span className="text-5xl font-bold text-slate-900">$0</span>
                <span className="text-slate-600">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-slate-700">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  5 processes per month
                </li>
                <li className="flex items-center gap-2 text-slate-700">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Document & chat input
                </li>
                <li className="flex items-center gap-2 text-slate-700">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Basic AI analysis
                </li>
                <li className="flex items-center gap-2 text-slate-700">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  PDF export
                </li>
              </ul>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/signup')}
              >
                Start Free
              </Button>
            </div>

            {/* Premium Tier */}
            <div className="p-8 rounded-2xl border-2 border-blue-500 bg-gradient-to-br from-blue-50 to-purple-50 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                  POPULAR
                </span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Premium</h3>
              <p className="text-slate-600 mb-6">For power users</p>
              <div className="mb-6">
                <span className="text-5xl font-bold text-slate-900">$29</span>
                <span className="text-slate-600">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-slate-700">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Unlimited processes
                </li>
                <li className="flex items-center gap-2 text-slate-700">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  🎤 Voice input (Premium)
                </li>
                <li className="flex items-center gap-2 text-slate-700">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Advanced AI insights
                </li>
                <li className="flex items-center gap-2 text-slate-700">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Priority processing
                </li>
                <li className="flex items-center gap-2 text-slate-700">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Team collaboration
                </li>
              </ul>
              <Button 
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                onClick={() => navigate('/signup')}
              >
                Start Free Trial
              </Button>
            </div>

            {/* Enterprise Tier */}
            <div className="p-8 rounded-2xl border-2 border-slate-200 bg-white">
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Enterprise</h3>
              <p className="text-slate-600 mb-6">For large organizations</p>
              <div className="mb-6">
                <span className="text-5xl font-bold text-slate-900">Custom</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-slate-700">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Everything in Premium
                </li>
                <li className="flex items-center gap-2 text-slate-700">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  SSO & advanced security
                </li>
                <li className="flex items-center gap-2 text-slate-700">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Dedicated support
                </li>
                <li className="flex items-center gap-2 text-slate-700">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Custom integrations
                </li>
                <li className="flex items-center gap-2 text-slate-700">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  SLA guarantee
                </li>
              </ul>
              <Button 
                variant="outline" 
                className="w-full"
              >
                Contact Sales
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-gradient-to-br from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-5xl font-bold mb-6">
            Ready to work SuperHumanly?
          </h2>
          <p className="text-xl mb-10 opacity-90">
            Join teams already transforming their process documentation
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button 
              size="lg"
              onClick={() => navigate('/signup')}
              className="bg-white text-blue-600 hover:bg-slate-100 px-8 py-6 text-lg font-semibold shadow-xl"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="border-2 border-white text-white hover:bg-white/10 px-8 py-6 text-lg font-semibold"
            >
              Schedule Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold">SuperHumanly</span>
              </div>
              <p className="text-slate-400 text-sm">
                Turn process documentation chaos into clarity in 2 minutes with AI.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><button onClick={() => navigate('/')} className="hover:text-white transition">Home</button></li>
                <li><button onClick={() => navigate('/signup')} className="hover:text-white transition">Get Started</button></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><button onClick={() => navigate('/privacy')} className="hover:text-white transition">Privacy Policy</button></li>
                <li><button onClick={() => navigate('/terms')} className="hover:text-white transition">Terms of Service</button></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-800 pt-8 text-center text-sm text-slate-400">
            © {new Date().getFullYear()} SuperHumanly. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
