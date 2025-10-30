import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/utils/api';
import { toast } from 'sonner';

const AIRefineChat = ({ processId, onClose, onRefineComplete }) => {
  const [message, setMessage] = useState('');
  const [refining, setRefining] = useState(false);
  const [conversation, setConversation] = useState([
    {
      type: 'system',
      content: "Hi! I can help refine your flowchart. Tell me what you'd like to change:",
      suggestions: [
        "Add a step after step 2",
        "Change the description of step 3",
        "Remove step 5",
        "Reorder steps 3 and 4"
      ]
    }
  ]);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  const handleSend = async () => {
    if (!message.trim() || refining) return;

    const userMessage = message.trim();
    setMessage('');

    // Add user message to conversation
    setConversation(prev => [...prev, { type: 'user', content: userMessage }]);

    setRefining(true);

    try {
      // Call AI refinement API
      const response = await api.refineProcess(processId, userMessage);

      // Add AI response to conversation
      setConversation(prev => [
        ...prev,
        {
          type: 'ai',
          content: "✓ Done! Here's what I changed:",
          changes: response.changes || [],
          success: true
        }
      ]);

      // Notify parent component to reload process
      if (onRefineComplete) {
        onRefineComplete(response.process);
      }

      toast.success('Flowchart refined successfully!');
    } catch (error) {
      console.error('Refine error:', error);

      setConversation(prev => [
        ...prev,
        {
          type: 'ai',
          content: error.response?.data?.detail || "Sorry, I couldn't process that request. Could you rephrase it?",
          success: false
        }
      ]);

      toast.error('Failed to refine flowchart');
    } finally {
      setRefining(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setMessage(suggestion);
  };

  return (
    <div className="fixed right-0 top-0 h-full w-full md:w-96 bg-white shadow-2xl flex flex-col z-50 animate-slide-in-right">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg">AI Refinement</h3>
            <p className="text-xs text-white/80">Make changes naturally</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-white hover:bg-white/20 h-8 w-8 p-0"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {conversation.map((msg, index) => (
          <div key={index}>
            {msg.type === 'system' && (
              <div className="space-y-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-900">{msg.content}</p>
                </div>
                {msg.suggestions && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500 font-semibold">Try saying:</p>
                    {msg.suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="block w-full text-left text-sm bg-white border border-slate-200 rounded-lg p-2 hover:bg-slate-50 hover:border-blue-300 transition-colors"
                      >
                        💡 {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {msg.type === 'user' && (
              <div className="flex justify-end">
                <div className="bg-blue-600 text-white rounded-lg px-4 py-2 max-w-[80%]">
                  <p className="text-sm">{msg.content}</p>
                </div>
              </div>
            )}

            {msg.type === 'ai' && (
              <div className="flex justify-start">
                <div className={`rounded-lg px-4 py-3 max-w-[80%] ${
                  msg.success 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-amber-50 border border-amber-200'
                }`}>
                  <div className="flex items-start gap-2 mb-2">
                    {msg.success ? (
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    )}
                    <p className="text-sm text-slate-800">{msg.content}</p>
                  </div>
                  {msg.changes && msg.changes.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {msg.changes.map((change, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                          <span className="text-green-600">•</span>
                          <span>{change}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {refining && (
          <div className="flex justify-start">
            <div className="bg-slate-100 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <p className="text-sm text-slate-600">Refining your flowchart...</p>
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-200 p-4 bg-white">
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Describe what to change..."
            disabled={refining}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!message.trim() || refining}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          💡 Tip: Be specific about what you want to change
        </p>
      </div>
    </div>
  );
};

export default AIRefineChat;
