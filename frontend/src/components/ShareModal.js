import React, { useState, useEffect } from 'react';
import { Copy, Check, Lock, Eye, MessageSquare, Edit3, X, Trash2, Clock, Users, Calendar, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from 'sonner';
import { api } from '@/utils/api';

const ShareModal = ({ isOpen, onClose, processId, processName, isPublished }) => {
  const [activeTab, setActiveTab] = useState('create'); // 'create' or 'manage'
  const [accessLevel, setAccessLevel] = useState('view');
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shares, setShares] = useState([]);
  const [copiedToken, setCopiedToken] = useState(null);

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
      name: 'Can Suggest Edits',
      icon: Edit3,
      description: 'Can view, comment, and suggest edits (requires your approval).',
      color: 'emerald'
    }
  ];

  const expirationOptions = [
    { value: 7, label: '7 days' },
    { value: 30, label: '30 days' },
    { value: 90, label: '90 days' },
    { value: null, label: 'Never expires' }
  ];

  // Load shares when modal opens
  useEffect(() => {
    if (isOpen && isPublished) {
      loadShares();
    }
  }, [isOpen, isPublished]);

  const loadShares = async () => {
    setLoading(true);
    try {
      const data = await api.getShares(processId);
      setShares(data);
    } catch (error) {
      console.error('Failed to load shares:', error);
      toast.error('Failed to load shares');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShare = async () => {
    setCreating(true);
    try {
      const newShare = await api.createShare(processId, accessLevel, expiresInDays);
      toast.success('Share link created successfully!');
      setShares([newShare, ...shares]);
      setActiveTab('manage'); // Switch to manage tab to show the new share
    } catch (error) {
      console.error('Failed to create share:', error);
      toast.error(error.response?.data?.detail || 'Failed to create share');
    } finally {
      setCreating(false);
    }
  };

  const handleCopyLink = async (token) => {
    const shareUrl = `${window.location.origin}/view/${token}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedToken(token);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopiedToken(null), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleRevokeShare = async (token) => {
    if (!window.confirm('Are you sure you want to revoke this share? The link will no longer work.')) {
      return;
    }
    
    try {
      await api.revokeShare(token);
      toast.success('Share revoked successfully');
      setShares(shares.map(s => s.token === token ? { ...s, isActive: false, revokedAt: new Date() } : s));
    } catch (error) {
      console.error('Failed to revoke share:', error);
      toast.error('Failed to revoke share');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isExpired = (expiresAt) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const getAccessLevelBadge = (level) => {
    const config = accessLevels.find(l => l.id === level);
    if (!config) return null;
    const Icon = config.icon;
    
    const colorClasses = {
      blue: 'bg-blue-50 text-blue-700 border-blue-200',
      purple: 'bg-purple-50 text-purple-700 border-purple-200',
      emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    };
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${colorClasses[config.color]}`}>
        <Icon className="w-3.5 h-3.5" />
        {config.name}
      </span>
    );
  };

  const activeShares = shares.filter(s => s.isActive && !isExpired(s.expiresAt));
  const inactiveShares = shares.filter(s => !s.isActive || isExpired(s.expiresAt));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Lock className="w-5 h-5 text-blue-600" />
            Share: {processName || 'Untitled Process'}
          </DialogTitle>
          <DialogDescription className="text-base">
            {isPublished 
              ? 'Create secure share links with custom access levels and expiration dates'
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
          <>
            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200">
              <button
                onClick={() => setActiveTab('create')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'create'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Create New Share
              </button>
              <button
                onClick={() => setActiveTab('manage')}
                className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'manage'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Manage Shares
                {activeShares.length > 0 && (
                  <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                    {activeShares.length}
                  </span>
                )}
              </button>
            </div>

            {/* Create Tab */}
            {activeTab === 'create' && (
              <div className="space-y-6 py-4">
                {/* Access Level Selection */}
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-3 block">
                    Access Level
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

                {/* Expiration Selection */}
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-3 block">
                    Link Expiration
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {expirationOptions.map((option) => {
                      const isSelected = expiresInDays === option.value;
                      return (
                        <button
                          key={option.value || 'never'}
                          onClick={() => setExpiresInDays(option.value)}
                          className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50 text-blue-900'
                              : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                          }`}
                        >
                          <Clock className={`w-4 h-4 mx-auto mb-1 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Create Button */}
                <Button
                  onClick={handleCreateShare}
                  disabled={creating}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {creating ? 'Creating...' : 'Create Share Link'}
                </Button>

                {/* Info Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    <strong>🔐 Secure Sharing:</strong> Each link has a unique token and can be revoked anytime.
                  </p>
                </div>
              </div>
            )}

            {/* Manage Tab */}
            {activeTab === 'manage' && (
              <div className="space-y-4 py-4">
                {loading ? (
                  <div className="text-center py-8 text-slate-600">Loading shares...</div>
                ) : activeShares.length === 0 && inactiveShares.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600 mb-2">No shares created yet</p>
                    <Button
                      onClick={() => setActiveTab('create')}
                      variant="outline"
                      size="sm"
                    >
                      Create First Share
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Active Shares */}
                    {activeShares.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-slate-700 mb-3">
                          Active Shares ({activeShares.length})
                        </h4>
                        <div className="space-y-3">
                          {activeShares.map((share) => (
                            <div
                              key={share.token}
                              className="p-4 bg-white border border-slate-200 rounded-lg hover:shadow-sm transition-shadow"
                            >
                              <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="flex-1 min-w-0">
                                  {getAccessLevelBadge(share.accessLevel)}
                                  <div className="mt-2 flex items-center gap-4 text-xs text-slate-600">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3.5 h-3.5" />
                                      Created {formatDate(share.createdAt)}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3.5 h-3.5" />
                                      {share.expiresAt ? `Expires ${formatDate(share.expiresAt)}` : 'Never expires'}
                                    </span>
                                  </div>
                                  {share.accessCount > 0 && (
                                    <div className="mt-1 text-xs text-slate-500">
                                      <Users className="w-3 h-3 inline mr-1" />
                                      {share.accessCount} views · Last: {formatDate(share.lastAccessedAt)}
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => handleCopyLink(share.token)}
                                    size="sm"
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {copiedToken === share.token ? (
                                      <>
                                        <Check className="w-3.5 h-3.5 mr-1" />
                                        Copied
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3.5 h-3.5 mr-1" />
                                        Copy
                                      </>
                                    )}
                                  </Button>
                                  <Button
                                    onClick={() => handleRevokeShare(share.token)}
                                    size="sm"
                                    variant="outline"
                                    className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                                    Revoke
                                  </Button>
                                </div>
                              </div>
                              
                              {/* Share URL (collapsed) */}
                              <div className="mt-3 pt-3 border-t border-slate-100">
                                <input
                                  type="text"
                                  value={`${window.location.origin}/view/${share.token}`}
                                  readOnly
                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs font-mono text-slate-600"
                                  onClick={(e) => e.target.select()}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Inactive/Expired Shares */}
                    {inactiveShares.length > 0 && (
                      <div className="mt-6">
                        <h4 className="text-sm font-semibold text-slate-500 mb-3">
                          Revoked & Expired ({inactiveShares.length})
                        </h4>
                        <div className="space-y-2">
                          {inactiveShares.map((share) => (
                            <div
                              key={share.token}
                              className="p-3 bg-slate-50 border border-slate-200 rounded-lg opacity-60"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  {getAccessLevelBadge(share.accessLevel)}
                                  <div className="mt-1 text-xs text-slate-500">
                                    {share.revokedAt ? `Revoked ${formatDate(share.revokedAt)}` : `Expired ${formatDate(share.expiresAt)}`}
                                  </div>
                                </div>
                                <span className="text-xs text-slate-500 px-2 py-1 bg-slate-200 rounded">
                                  Inactive
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
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
