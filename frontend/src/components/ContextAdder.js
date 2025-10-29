import React, { useState } from 'react';
import { Mic, MessageSquare, ArrowRight, X, Sparkles, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { api } from '@/utils/api';

const ContextAdder = ({ documentText, onContextAdded, onSkip }) => {
  const [mode, setMode] = useState(null); // 'voice' or 'chat'
  const [chatContext, setChatContext] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setAudioChunks(chunks);
      setIsRecording(true);
      toast.success('Recording started - speak now');
    } catch (error) {
      toast.error('Failed to start recording. Please check microphone permissions.');
      console.error(error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setIsTranscribing(true);
    }
  };

  const transcribeAudio = async (audioBlob) => {
    try {
      const result = await api.transcribeAudio(audioBlob);
      setChatContext(result.text);
      setIsTranscribing(false);
      toast.success('Voice transcribed successfully!');
    } catch (error) {
      setIsTranscribing(false);
      toast.error('Failed to transcribe audio. Please try again.');
      console.error(error);
    }
  };

  const handleAddContext = () => {
    if (!chatContext.trim()) {
      toast.error('Please add some context first');
      return;
    }
    onContextAdded(chatContext);
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <Card className="p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-800">
              Add Context (Optional)
            </h2>
            <p className="text-slate-600">
              Enhance the AI's understanding with additional details
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onSkip}
            data-testid="skip-context-btn"
          >
            Skip <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {/* Document Preview */}
        <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-xs font-semibold text-slate-500 mb-2">DOCUMENT TEXT (PREVIEW)</p>
          <p className="text-sm text-slate-700 line-clamp-3">
            {documentText.substring(0, 200)}...
          </p>
        </div>

        {/* Mode Selection or Input */}
        {!mode ? (
          <div className="space-y-4">
            <p className="text-center text-slate-600 mb-6">
              Want to add details the document missed?
            </p>
            
            <div className="grid md:grid-cols-2 gap-4">
              {/* Voice Button */}
              <button
                onClick={() => setMode('voice')}
                className="group p-6 border-2 border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-200"
                data-testid="voice-context-btn"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <Mic className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-bold text-slate-800 mb-1">Speak</h3>
                <p className="text-sm text-slate-600">
                  Add context via voice recording
                </p>
              </button>

              {/* Chat Button */}
              <button
                onClick={() => setMode('chat')}
                className="group p-6 border-2 border-slate-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all duration-200"
                data-testid="chat-context-btn"
              >
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <MessageSquare className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-bold text-slate-800 mb-1">Type</h3>
                <p className="text-sm text-slate-600">
                  Add context via text input
                </p>
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Mode Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {mode === 'voice' ? (
                  <Mic className="w-5 h-5 text-blue-600" />
                ) : (
                  <MessageSquare className="w-5 h-5 text-purple-600" />
                )}
                <span className="font-semibold text-slate-800">
                  {mode === 'voice' ? 'Voice Context' : 'Text Context'}
                </span>
              </div>
              <button
                onClick={() => {
                  setMode(null);
                  setChatContext('');
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Voice Recording */}
            {mode === 'voice' && !chatContext && (
              <div className="space-y-4">
                {!isRecording && !isTranscribing && (
                  <div className="text-center py-8">
                    <Button
                      onClick={startRecording}
                      size="lg"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Mic className="w-5 h-5 mr-2" />
                      Start Recording
                    </Button>
                    <p className="text-sm text-slate-500 mt-3">
                      Example: "The approval step takes 2 days. Sarah handles finance."
                    </p>
                  </div>
                )}

                {isRecording && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                      <div className="w-4 h-4 bg-red-600 rounded-full"></div>
                    </div>
                    <p className="text-lg font-semibold text-slate-800 mb-2">Recording...</p>
                    <p className="text-sm text-slate-600 mb-4">Speak clearly about additional details</p>
                    <Button
                      onClick={stopRecording}
                      variant="outline"
                      className="border-red-500 text-red-600 hover:bg-red-50"
                    >
                      Stop Recording
                    </Button>
                  </div>
                )}

                {isTranscribing && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-lg font-semibold text-slate-800">Transcribing...</p>
                    <p className="text-sm text-slate-600">Converting your voice to text with AI</p>
                  </div>
                )}
              </div>
            )}

            {/* Chat Input */}
            {mode === 'chat' && (
              <div className="space-y-4">
                <textarea
                  value={chatContext}
                  onChange={(e) => setChatContext(e.target.value)}
                  placeholder="Type additional context here...&#10;&#10;Example:&#10;- The approval step usually takes 2 business days&#10;- Sarah from Finance handles all approvals&#10;- Manager sign-off needed for amounts over $5,000"
                  className="w-full h-48 px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-purple-500 focus:outline-none resize-none"
                  data-testid="chat-context-input"
                  autoFocus
                />
              </div>
            )}

            {/* Transcribed Text Display - AFTER transcription completes */}
            {mode === 'voice' && chatContext && !isTranscribing && (
              <div className="space-y-4">
                {/* Success indicator */}
                <div className="flex items-center justify-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-semibold text-green-800">
                    Voice transcribed successfully! Review and edit if needed:
                  </span>
                </div>

                {/* Editable transcription */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    What You Said (edit if needed):
                  </label>
                  <textarea
                    value={chatContext}
                    onChange={(e) => setChatContext(e.target.value)}
                    className="w-full h-40 px-4 py-3 border-2 border-blue-200 rounded-lg focus:border-blue-500 focus:outline-none resize-none bg-blue-50"
                    autoFocus
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    💡 Tip: You can edit the text above if the transcription isn't perfect
                  </p>
                </div>

                {/* Re-record option */}
                <div className="flex justify-center">
                  <button
                    onClick={() => {
                      setChatContext('');
                      setIsRecording(false);
                      setIsTranscribing(false);
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    <Mic className="w-4 h-4" />
                    Record Again
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {chatContext && !isTranscribing && (
              <div className="flex gap-3 mt-6">
                <Button
                  onClick={handleAddContext}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  size="lg"
                  data-testid="use-context-btn"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Use This Context
                </Button>
                <Button
                  onClick={onSkip}
                  variant="outline"
                  size="lg"
                >
                  Skip
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default ContextAdder;
