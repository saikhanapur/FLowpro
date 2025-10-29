import React, { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api } from '@/utils/api';

const ChatInterface = ({ onComplete, onCancel }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm SuperHumanly AI. I'll help you document your process through a few simple questions. Let's start: **What process would you like to document?**"
    }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [progress, setProgress] = useState(0);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsThinking(true);

    try {
      const data = await api.chat(messages, input);
      const assistantMessage = { role: 'assistant', content: data.response };
      setMessages(prev => [...prev, assistantMessage]);

      const questionsAsked = messages.filter(m => m.role === 'assistant').length;
      setProgress(Math.min((questionsAsked / 8) * 100, 100));

      if (data.response.includes("Perfect! I have everything")) {
        setTimeout(() => {
          const conversation = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
          onComplete(conversation);
        }, 2000);
      }
    } catch (error) {
      const errorMessage = { role: 'assistant', content: "I'm having trouble processing that. Could you rephrase?" };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <Card className="max-w-4xl mx-auto overflow-hidden" data-testid="chat-interface">
      <div className="gradient-amber text-white p-6">
        <h2 className="text-2xl font-bold mb-2">Chat with FlowForge AI</h2>
        <p className="text-amber-100 text-sm">Answer questions to build your process flowchart</p>
        
        <div className="mt-4 bg-amber-700/30 rounded-full h-2 overflow-hidden">
          <div className="bg-white h-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <div className="text-xs text-amber-100 mt-1">{Math.round(progress)}% Complete</div>
      </div>

      <div className="h-[500px] overflow-y-auto p-6 space-y-4 bg-slate-50">
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-4 rounded-lg ${
              message.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-800'
            }`}>
              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                {message.content.split('**').map((part, i) => 
                  i % 2 === 0 ? part : <strong key={i}>{part}</strong>
                )}
              </div>
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-slate-200 p-4 bg-white">
        <div className="flex gap-3">
          <Input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type your answer..."
            disabled={isThinking}
            data-testid="chat-input"
          />
          <Button onClick={sendMessage} disabled={!input.trim() || isThinking} className="gradient-amber text-white" data-testid="send-message-btn">
            <Send className="w-5 h-5" />
          </Button>
        </div>

        <div className="mt-3 flex justify-between items-center">
          <button onClick={onCancel} className="text-sm text-slate-600 hover:text-slate-800 font-medium">
            ← Cancel
          </button>
          <div className="text-xs text-slate-500">Press Enter to send • Answer naturally</div>
        </div>
      </div>
    </Card>
  );
};

export default ChatInterface;
