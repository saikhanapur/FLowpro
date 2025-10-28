import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

const VoiceRecorder = ({ onComplete, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [duration, setDuration] = useState(0);
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      
      recognition.onresult = (event) => {
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptPart = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptPart + ' ';
          }
        }
        
        if (finalTranscript) {
          setTranscript(prev => prev + finalTranscript);
        }
      };
      
      recognitionRef.current = recognition;
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, isPaused]);

  const startRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.start();
      setIsRecording(true);
      setIsPaused(false);
    }
  };

  const pauseRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsPaused(true);
    }
  };

  const resumeRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.start();
      setIsPaused(false);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="max-w-4xl mx-auto p-8" data-testid="voice-recorder">
      <h2 className="text-2xl font-bold text-slate-800 mb-2">
        Voice Recording
      </h2>
      <p className="text-slate-600 mb-8">
        Explain your process step-by-step. Mention who does what, when things happen, and any problems you've noticed.
      </p>

      <div className="text-center mb-8">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="w-24 h-24 gradient-blue text-white rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg mx-auto"
            data-testid="start-recording-btn"
          >
            <Mic className="w-12 h-12" />
          </button>
        ) : (
          <div className="relative">
            <div className={`w-24 h-24 gradient-rose text-white rounded-full flex items-center justify-center mx-auto ${
              !isPaused ? 'animate-pulse' : ''
            }`}>
              <Mic className="w-12 h-12" />
            </div>
          </div>
        )}

        <div className="text-3xl font-bold text-slate-800 mt-6">
          {formatDuration(duration)}
        </div>

        {isRecording && (
          <div className="text-sm text-slate-600 mt-2">
            {isPaused ? 'Recording Paused' : 'Recording...'}
          </div>
        )}
      </div>

      {isRecording && (
        <div className="flex justify-center gap-4 mb-8">
          {!isPaused ? (
            <Button onClick={pauseRecording} className="gradient-amber text-white" data-testid="pause-btn">
              <Pause className="w-5 h-5 mr-2" />Pause
            </Button>
          ) : (
            <Button onClick={resumeRecording} className="bg-green-500 hover:bg-green-600 text-white" data-testid="resume-btn">
              <Play className="w-5 h-5 mr-2" />Resume
            </Button>
          )}
          <Button onClick={stopRecording} className="gradient-rose text-white" data-testid="stop-btn">
            <Square className="w-5 h-5 mr-2" />Stop
          </Button>
        </div>
      )}

      <div className="bg-slate-50 rounded-lg p-6 mb-6">
        <label className="block text-sm font-semibold text-slate-700 mb-3">Transcript (Live)</label>
        <div className="bg-white rounded border border-slate-200 p-4 min-h-[200px] max-h-[400px] overflow-y-auto text-slate-700 leading-relaxed">
          {transcript || <span className="text-slate-400 italic">Start recording to see your transcript here...</span>}
        </div>
      </div>

      <Alert className="mb-6">
        <AlertDescription>
          <h3 className="font-semibold text-blue-900 mb-2">💡 Recording Tips</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Start with: "The process begins when..."</li>
            <li>• Mention parallel actions: "At the same time..." or "Meanwhile..."</li>
            <li>• Point out problems: "The issue is..." or "We don't have visibility on..."</li>
            <li>• Explain failures: "If this fails..." or "Sometimes this breaks..."</li>
          </ul>
        </AlertDescription>
      </Alert>

      <div className="flex gap-4">
        <Button onClick={() => onComplete(transcript)} disabled={!transcript} className="flex-1 gradient-blue text-white" data-testid="process-transcript-btn">
          Process Transcript →
        </Button>
        <Button onClick={onCancel} variant="outline">Cancel</Button>
      </div>
    </Card>
  );
};

export default VoiceRecorder;