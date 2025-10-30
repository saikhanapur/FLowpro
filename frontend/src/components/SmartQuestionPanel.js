import React, { useState } from 'react';
import { Sparkles, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SmartQuestionPanel = ({ analysis, onComplete, onSkip }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showCustomInput, setShowCustomInput] = useState({});

  const questions = analysis.suggested_questions || [];
  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  const handleAnswer = (questionId, answer) => {
    const newAnswers = { ...answers, [questionId]: answer };
    setAnswers(newAnswers);
    setShowCustomInput({ ...showCustomInput, [questionId]: false });

    // Auto-advance to next question or complete
    setTimeout(() => {
      if (isLastQuestion) {
        onComplete(newAnswers);
      } else {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      }
    }, 300);
  };

  const handleCustomAnswer = (questionId) => {
    setShowCustomInput({ ...showCustomInput, [questionId]: true });
  };

  const handleCustomSubmit = (questionId, value) => {
    if (value.trim()) {
      handleAnswer(questionId, value.trim());
    }
  };

  const handleSkipQuestion = () => {
    if (isLastQuestion) {
      // If they skipped all questions, just proceed
      onComplete(answers);
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  if (!currentQuestion) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 sm:p-8 border border-blue-100 shadow-lg">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Let's customize this for your workflow
            </h3>
            <p className="text-sm text-slate-600 mt-0.5">
              Question {currentQuestionIndex + 1} of {questions.length}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onSkip}
          className="text-slate-500 hover:text-slate-700"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-slate-200 rounded-full mb-6 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300"
          style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      <div className="mb-6">
        <h4 className="text-base font-semibold text-slate-900 mb-2">
          {currentQuestion.question}
        </h4>
        <p className="text-sm text-slate-600 flex items-start gap-2">
          <span className="text-blue-500 font-medium">Why we're asking:</span>
          {currentQuestion.why_asking}
        </p>
      </div>

      {/* Options */}
      {!showCustomInput[currentQuestion.id] ? (
        <div className="space-y-2 mb-6">
          {currentQuestion.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleAnswer(currentQuestion.id, option)}
              className="w-full text-left px-4 py-3 rounded-xl border-2 border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 text-slate-900 font-medium group"
            >
              <div className="flex items-center justify-between">
                <span>{option}</span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
              </div>
            </button>
          ))}
          
          {/* Custom Option */}
          <button
            onClick={() => handleCustomAnswer(currentQuestion.id)}
            className="w-full text-left px-4 py-3 rounded-xl border-2 border-dashed border-slate-300 bg-white hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 text-slate-600 font-medium"
          >
            <div className="flex items-center justify-between">
              <span>✏️ Custom answer...</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </button>
        </div>
      ) : (
        <div className="mb-6">
          <input
            type="text"
            autoFocus
            placeholder="Type your custom answer..."
            className="w-full px-4 py-3 rounded-xl border-2 border-blue-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCustomSubmit(currentQuestion.id, e.target.value);
              } else if (e.key === 'Escape') {
                setShowCustomInput({ ...showCustomInput, [currentQuestion.id]: false });
              }
            }}
          />
          <p className="text-xs text-slate-500 mt-2">
            Press Enter to submit, Escape to go back
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <button
          onClick={handleSkipQuestion}
          className="text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors"
        >
          Skip this question
        </button>
        <div className="text-sm text-slate-500">
          {answers[currentQuestion.id] && (
            <span className="text-green-600 font-medium">
              ✓ Answered
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default SmartQuestionPanel;
