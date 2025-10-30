import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Edit, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { api } from '@/utils/api';
import { toast } from 'sonner';

const DetailPanel = ({ node, processId, onClose, onUpdate, readOnly = false, accessLevel = 'owner' }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedNode, setEditedNode] = useState(node);
  const [saving, setSaving] = useState(false);
  const [actorInput, setActorInput] = useState('');
  
  // Determine permissions based on access level
  // Owner in their own view OR shared with edit access
  const canEdit = (!readOnly && accessLevel === 'owner') || (readOnly && accessLevel === 'edit');
  // Owner in their own view OR shared with comment/edit access
  const canComment = (!readOnly && accessLevel === 'owner') || (readOnly && (accessLevel === 'comment' || accessLevel === 'edit'));
  const canViewComments = canComment; // Show comments section only if user can comment

  const statusOptions = [
    { value: 'trigger', label: 'Trigger', color: 'bg-blue-100 text-blue-800' },
    { value: 'current', label: 'Active/Current', color: 'bg-emerald-100 text-emerald-800' },
    { value: 'warning', label: 'Warning/Issue', color: 'bg-amber-100 text-amber-800' },
    { value: 'completed', label: 'Completed', color: 'bg-slate-100 text-slate-800' },
    { value: 'critical-gap', label: 'Critical Gap', color: 'bg-red-100 text-red-800' }
  ];

  useEffect(() => {
    loadComments();
    setEditedNode(node); // Reset edited node when node prop changes
  }, [node, processId]);

  const loadComments = async () => {
    try {
      const data = await api.getComments(processId);
      setComments(data.filter(c => c.nodeId === node.id));
    } catch (error) {
      console.error('Failed to load comments');
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      const comment = {
        id: `comment-${Date.now()}`,
        processId,
        nodeId: node.id,
        content: newComment,
        isResolved: false
      };

      await api.createComment(comment);
      setComments([...comments, comment]);
      setNewComment('');
      toast.success('Comment added');
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Call backend API to update the node
      await api.updateNode(processId, node.id, editedNode);
      
      // Update local state
      onUpdate(editedNode);
      setIsEditing(false);
      toast.success('Node updated successfully!');
    } catch (error) {
      console.error('Failed to save node:', error);
      toast.error(error.response?.data?.detail || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleAddActor = () => {
    if (!actorInput.trim()) return;
    const newActors = [...(editedNode.actors || []), actorInput.trim()];
    setEditedNode({ ...editedNode, actors: newActors });
    setActorInput('');
  };

  const handleRemoveActor = (index) => {
    const newActors = editedNode.actors.filter((_, i) => i !== index);
    setEditedNode({ ...editedNode, actors: newActors });
  };

  return (
    <div className="w-96 bg-white border-l border-slate-200 overflow-y-auto flex-shrink-0" data-testid="detail-panel" style={{animation: 'slideInRight 0.3s ease-out'}}>
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between z-10">
        <h3 className="text-lg font-bold text-slate-800">Step Details</h3>
        <Button variant="ghost" size="sm" onClick={onClose} data-testid="close-detail-panel">
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="p-6 space-y-6">
        {/* Status Badge */}
        <div>
          <Badge variant={node.status === 'critical-gap' ? 'destructive' : node.status === 'current' ? 'default' : 'secondary'} className="text-xs">
            {node.status.toUpperCase()}
          </Badge>
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Title</label>
          {isEditing ? (
            <input
              type="text"
              value={editedNode.title}
              onChange={(e) => setEditedNode({...editedNode, title: e.target.value})}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          ) : (
            <div className="font-semibold text-slate-800">{node.title}</div>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Description</label>
          {isEditing ? (
            <Textarea
              value={editedNode.description}
              onChange={(e) => setEditedNode({...editedNode, description: e.target.value})}
              rows={4}
              className="text-sm"
            />
          ) : (
            <div className="text-sm text-slate-700 leading-relaxed">{node.description}</div>
          )}
        </div>

        {/* Responsible */}
        {node.actors && node.actors.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Responsible</label>
            <div className="flex flex-wrap gap-2">
              {node.actors.map((actor, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">{actor}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Sub-steps */}
        {node.subSteps && node.subSteps.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Process Steps</label>
            <ul className="space-y-2">
              {node.subSteps.map((step, idx) => (
                <li key={idx} className="text-sm text-slate-700 flex items-start gap-2 leading-relaxed">
                  <span className="text-blue-600 font-bold mt-0.5">→</span>
                  {step}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Current vs Ideal State */}
        {(node.currentState || node.idealState) && (
          <div className="space-y-4">
            {node.currentState && (
              <div className="bg-slate-50 rounded-lg p-4">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Current State</label>
                <div className="text-sm text-slate-700 leading-relaxed">{node.currentState}</div>
              </div>
            )}
            
            {node.idealState && (
              <div className="bg-emerald-50 rounded-lg p-4">
                <label className="block text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">Ideal State</label>
                <div className="text-sm text-emerald-800 leading-relaxed">{node.idealState}</div>
              </div>
            )}
          </div>
        )}

        {/* Gap */}
        {node.gap && (
          <div className="bg-rose-50 border-l-4 border-rose-500 rounded-lg p-4">
            <label className="block text-xs font-semibold text-rose-900 uppercase tracking-wide mb-2">Gap Identified</label>
            <div className="text-sm text-rose-800 leading-relaxed">{node.gap}</div>
            {node.impact && (
              <div className="mt-3">
                <Badge variant="destructive" className="text-xs">
                  Impact: {node.impact}
                </Badge>
              </div>
            )}
          </div>
        )}

        {/* Edit/Save Button */}
        {canEdit && (
          <div className="pt-4 border-t border-slate-200">
            {isEditing ? (
              <Button onClick={handleSave} className="w-full" data-testid="save-node-btn">
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            ) : (
              <Button onClick={() => setIsEditing(true)} variant="outline" className="w-full" data-testid="edit-node-btn">
                <Edit className="w-4 h-4 mr-2" />
                Edit Node
              </Button>
            )}
          </div>
        )}

        {/* Comments Section */}
        {canViewComments && (
          <div className="pt-4 border-t border-slate-200">
            <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Comments ({comments.length})
            </h4>

            <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
              {comments.map((comment) => (
                <div key={comment.id} className="bg-slate-50 rounded-lg p-3">
                  <div className="text-sm text-slate-700 leading-relaxed">{comment.content}</div>
                  <div className="text-xs text-slate-500 mt-2">
                    {comment.createdAt ? new Date(comment.createdAt).toLocaleString() : 'Just now'}
                  </div>
                </div>
              ))}
            </div>

            {canComment && (
              <div className="space-y-2">
                <Textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                  data-testid="comment-input"
                  className="text-sm"
                />
                <Button onClick={handleAddComment} size="sm" className="w-full" data-testid="add-comment-btn">
                  Add Comment
                </Button>
              </div>
            )}
          </div>
        )}
        
        {/* Access Level Info for non-owners */}
        {!canEdit && readOnly && (
          <div className="pt-4 border-t border-slate-200">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
              <p className="text-xs text-blue-800">
                {accessLevel === 'view' && '👁️ View-only access'}
                {accessLevel === 'comment' && '💬 You can view and comment'}
                {accessLevel === 'edit' && '✏️ You can view, comment, and suggest edits'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DetailPanel;
