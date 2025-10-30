import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle, Zap, Users, FileText, Database } from 'lucide-react';

const LiveProgressPanel = ({ progressUpdates, isComplete }) => {
  const [currentStep, setCurrentStep] = useState(null);

  useEffect(() => {
    if (progressUpdates.length > 0) {
      setCurrentStep(progressUpdates[progressUpdates.length - 1]);
    }
  }, [progressUpdates]);

  const getStepIcon = (step) => {
    switch (step) {
      case 'cache_check':
      case 'cache_hit':
        return <Database className="w-5 h-5" />;
      case 'preprocessing':
        return <FileText className="w-5 h-5" />;
      case 'ai_analysis':
        return <Sparkles className="w-5 h-5" />;
      case 'actors':
        return <Users className="w-5 h-5" />;
      case 'caching':
        return <Database className="w-5 h-5" />;
      default:
        return <Zap className="w-5 h-5" />;
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-2xl px-6">
        {/* Animated Spinner */}
        <div className="relative w-24 h-24 mx-auto mb-8">
          <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            {currentStep && getStepIcon(currentStep.step)}
          </div>
        </div>

        {/* Current Step Message */}
        <h2 className="text-3xl font-bold text-slate-800 mb-4">
          {isComplete ? '✨ Analysis Complete!' : 'Intelligent Analysis in Progress'}
        </h2>

        {currentStep && (
          <div className="mb-6">
            <p className="text-xl text-slate-600 mb-2">
              {currentStep.message}
            </p>
            
            {/* Progress Bar */}
            <div className="w-full bg-slate-200 rounded-full h-3 mb-6 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${currentStep.progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Live Updates Timeline */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 max-h-64 overflow-y-auto">
          <div className="space-y-3">
            {progressUpdates.map((update, index) => (
              <div 
                key={index}
                className={`flex items-start gap-3 p-3 rounded-xl transition-all duration-300 ${
                  index === progressUpdates.length - 1 
                    ? 'bg-blue-50 border-2 border-blue-200' 
                    : 'bg-slate-50'
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {update.step === 'cache_hit' ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    getStepIcon(update.step)
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-slate-700">
                    {update.message}
                  </p>
                  {update.step === 'cache_hit' && (
                    <p className="text-xs text-green-600 mt-1 font-semibold">
                      💰 Cost saved: No API call needed!
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  <span className="text-xs font-semibold text-blue-600">
                    {update.progress}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tips Section */}
        {!isComplete && (
          <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-5 border border-blue-100">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-left">
                <p className="text-sm font-semibold text-blue-900 mb-1">
                  💡 Smart Tip
                </p>
                <p className="text-sm text-blue-700">
                  {currentStep?.step === 'cache_check' && "We check if similar documents were analyzed before to save time and cost"}
                  {currentStep?.step === 'cache_hit' && "Found a match! This analysis took 0 seconds and cost $0"}
                  {currentStep?.step === 'ai_analysis' && "Claude AI is extracting actors, steps, and decision points from your document"}
                  {currentStep?.step === 'caching' && "Caching this result so future similar documents are instant"}
                  {!currentStep && "Our intelligent system optimizes every step for speed and cost efficiency"}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveProgressPanel;
