import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Edit, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { api } from '@/utils/api';
import { toast } from 'sonner';

const DetailPanel = ({ node, processId, onClose, onUpdate }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedNode, setEditedNode] = useState(node);

  useEffect(() => {
    loadComments();
  }, [processId]);

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

  const handleSave = () => {
    onUpdate(editedNode);
    setIsEditing(false);
    toast.success('Node updated');
  };

  return (
    <div className="w-96 bg-white border-l border-slate-200 overflow-y-auto slide-in-right" data-testid="detail-panel">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800">Node Details</h3>
        <Button variant="ghost" size="sm" onClick={onClose} data-testid="close-detail-panel">
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="p-6 space-y-6">
        {/* Status Badge */}
        <div>
          <Badge variant={node.status === 'critical-gap' ? 'destructive' : 'secondary'}>
            {node.status}
          </Badge>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Title</label>
          {isEditing ? (
            <input
              type="text"
              value={editedNode.title}
              onChange={(e) => setEditedNode({...editedNode, title: e.target.value})}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          ) : (
            <div className="font-medium text-slate-800">{node.title}</div>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
          {isEditing ? (
            <Textarea
              value={editedNode.description}
              onChange={(e) => setEditedNode({...editedNode, description: e.target.value})}
              rows={4}
            />
          ) : (
            <div className="text-sm text-slate-600">{node.description}</div>
          )}
        </div>

        {/* Actors */}
        {node.actors && node.actors.length > 0 && (
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Actors</label>
            <div className="flex flex-wrap gap-2">
              {node.actors.map((actor, idx) => (
                <Badge key={idx} variant="outline">{actor}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Sub-steps */}
        {node.subSteps && node.subSteps.length > 0 && (
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Process Steps</label>
            <ul className="space-y-1">
              {node.subSteps.map((step, idx) => (
                <li key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                  <span className="text-blue-600 font-bold">→</span>
                  {step}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Current vs Ideal State */}
        {(node.currentState || node.idealState) && (
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Current State</label>
            <div className="text-sm text-slate-600 mb-3">{node.currentState}</div>
            
            {node.idealState && (
              <>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Ideal State</label>
                <div className="text-sm text-emerald-600">{node.idealState}</div>
              </>
            )}
          </div>
        )}

        {/* Gap */}
        {node.gap && (
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
            <label className="block text-sm font-semibold text-rose-900 mb-2">Gap Identified</label>
            <div className="text-sm text-rose-800">{node.gap}</div>
            {node.impact && (
              <div className="mt-2">
                <Badge variant="destructive" className="text-xs">
                  Impact: {node.impact}
                </Badge>
              </div>
            )}
          </div>
        )}

        {/* Edit/Save Button */}
        <div>
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

        {/* Comments Section */}
        <div className="border-t border-slate-200 pt-6">
          <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Comments ({comments.length})
          </h4>

          <div className="space-y-3 mb-4">
            {comments.map((comment) => (
              <div key={comment.id} className="bg-slate-50 rounded-lg p-3">
                <div className="text-sm text-slate-700">{comment.content}</div>
                <div className="text-xs text-slate-500 mt-1">
                  {new Date(comment.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
              data-testid="comment-input"
            />
            <Button onClick={handleAddComment} size="sm" className="w-full" data-testid="add-comment-btn">
              Add Comment
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailPanel;
