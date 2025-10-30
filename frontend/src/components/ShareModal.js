import React, { useState } from 'react';
import { Copy, Check, Lock, Eye, MessageSquare, Edit3, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from 'sonner';

const ShareModal = ({ isOpen, onClose, processId, processName, isPublished }) => {
  const [accessLevel, setAccessLevel] = useState('view'); // view, comment, edit
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}/view/${processId}?access=${accessLevel}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const accessLevels = [
    {
      id: 'view',
      name: 'View Only',
      icon: Eye,
      description: 'Can view the flowchart. Cannot edit or comment.',
      color: 'blue'
    },
    {
      id: 'comment',
      name: 'Can Comment',
      icon: MessageSquare,
      description: 'Can view and add comments. Cannot edit the flowchart.',
      color: 'purple'
    },
    {
      id: 'edit',
      name: 'Can Edit',
      icon: Edit3,
      description: 'Can view, comment, and suggest edits (requires your approval).',
      color: 'emerald'
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Lock className="w-5 h-5 text-blue-600" />
            Share: {processName || 'Untitled Process'}
          </DialogTitle>
          <DialogDescription className="text-base">
            {isPublished 
              ? 'Choose who can access this published process'
              : 'Publish this process first to enable sharing'}
          </DialogDescription>
        </DialogHeader>

        {!isPublished ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 my-4">
            <p className="text-sm text-amber-800">
              <strong>⚠️ Not Published:</strong> This process is currently in draft mode. 
              Publish it first to share with others.
            </p>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Access Level Selection */}
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-3 block">
                Choose Access Level
              </label>
              <div className="space-y-3">
                {accessLevels.map((level) => {
                  const Icon = level.icon;
                  const isSelected = accessLevel === level.id;
                  
                  return (
                    <button
                      key={level.id}
                      onClick={() => setAccessLevel(level.id)}
                      className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`font-semibold ${isSelected ? 'text-blue-900' : 'text-slate-900'}`}>
                              {level.name}
                            </span>
                            {isSelected && (
                              <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-sm text-slate-600">
                            {level.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Share Link */}
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">
                Shareable Link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-700 font-mono"
                  onClick={(e) => e.target.select()}
                />
                <Button
                  onClick={handleCopyLink}
                  className={`${copied ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'} text-white px-6`}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Anyone with this link can access the process with <strong>{accessLevels.find(l => l.id === accessLevel)?.name}</strong> permissions.
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>💡 Tip:</strong> You can change access levels anytime. Viewers will automatically get updated permissions.
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareModal;
