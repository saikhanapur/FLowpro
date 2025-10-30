import React from 'react';
import { AlertCircle, CheckCircle, AlertTriangle, Zap } from 'lucide-react';

// Map node types to visual indicators
const NODE_TYPE_CONFIG = {
  trigger: { emoji: '⚡', borderColor: 'border-l-blue-500', bgTint: 'bg-blue-50/30' },
  action: { emoji: '▶️', borderColor: 'border-l-emerald-500', bgTint: 'bg-emerald-50/30' },
  decision: { emoji: '❓', borderColor: 'border-l-purple-500', bgTint: 'bg-purple-50/30' },
  approval: { emoji: '✋', borderColor: 'border-l-amber-500', bgTint: 'bg-amber-50/30' },
  review: { emoji: '👀', borderColor: 'border-l-indigo-500', bgTint: 'bg-indigo-50/30' },
  notification: { emoji: '📧', borderColor: 'border-l-cyan-500', bgTint: 'bg-cyan-50/30' },
  outcome: { emoji: '✅', borderColor: 'border-l-green-500', bgTint: 'bg-green-50/30' },
  completed: { emoji: '✓', borderColor: 'border-l-slate-400', bgTint: 'bg-slate-50/30' },
  warning: { emoji: '⚠️', borderColor: 'border-l-orange-500', bgTint: 'bg-orange-50/30' },
  'critical-gap': { emoji: '🚨', borderColor: 'border-l-rose-500', bgTint: 'bg-rose-50/30' },
  default: { emoji: '📋', borderColor: 'border-l-slate-400', bgTint: 'bg-slate-50/20' }
};

const FlowNode = ({ node, onClick, isSelected }) => {
  // Detect node type from title, description, or explicit type field
  const detectNodeType = () => {
    // Check explicit type first
    if (node.type && NODE_TYPE_CONFIG[node.type]) {
      return node.type;
    }
    
    // Use status as fallback
    if (node.status && NODE_TYPE_CONFIG[node.status]) {
      return node.status;
    }
    
    // Smart detection from title/description
    const text = `${node.title} ${node.description}`.toLowerCase();
    
    if (text.includes('trigger') || text.includes('start') || text.includes('submit')) return 'trigger';
    if (text.includes('approve') || text.includes('approval')) return 'approval';
    if (text.includes('review') || text.includes('check')) return 'review';
    if (text.includes('decide') || text.includes('decision') || text.includes('?')) return 'decision';
    if (text.includes('notify') || text.includes('send') || text.includes('email')) return 'notification';
    if (text.includes('complete') || text.includes('done') || text.includes('finish')) return 'outcome';
    
    return 'action'; // Default to action for process steps
  };
  
  const nodeType = detectNodeType();
  const typeConfig = NODE_TYPE_CONFIG[nodeType] || NODE_TYPE_CONFIG.default;

  const getStatusStyles = () => {
    switch (node.status) {
      case 'trigger':
        return 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg';
      case 'current':
      case 'active':  // Support AI-generated "active" status
        return `bg-white border border-emerald-300/60 text-slate-800 shadow-md hover:shadow-lg ${typeConfig.bgTint}`;
      case 'warning':
        return `bg-white border border-amber-300/60 text-slate-800 shadow-md hover:shadow-lg ${typeConfig.bgTint}`;
      case 'completed':  // Support AI-generated "completed" status
        return `bg-white border border-slate-300/50 text-slate-800 shadow-md hover:shadow-lg ${typeConfig.bgTint}`;
      case 'critical-gap':
        return 'bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-lg';
      default:
        return `bg-white border border-slate-300/50 text-slate-800 shadow-md hover:shadow-lg ${typeConfig.bgTint}`;
    }
  };

  const getIcon = () => {
    switch (node.status) {
      case 'trigger':
        return <Zap className="w-4 h-4" />;
      case 'current':
      case 'active':  // Support AI-generated "active" status
        return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'completed':  // Support AI-generated "completed" status
        return <CheckCircle className="w-4 h-4 text-slate-500" />;
      case 'critical-gap':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <CheckCircle className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl p-4 cursor-pointer transition-all duration-300 ease-out hover:scale-[1.01] mx-auto w-full overflow-visible border-l-4 ${typeConfig.borderColor} ${getStatusStyles()} ${
        isSelected ? 'ring-2 ring-blue-500 ring-offset-2 scale-[1.01]' : ''
      }`}
      data-testid={`flow-node-${node.id}`}
      style={{ minHeight: 'auto', minWidth: '320px' }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold mb-1.5 leading-tight break-words tracking-tight">
            <span className="mr-2 text-lg">{typeConfig.emoji}</span>
            {node.title}
          </h3>
          <p className="text-sm opacity-80 leading-relaxed mb-1.5 break-words whitespace-normal font-normal">{node.description}</p>
          
          {node.actors && node.actors.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {node.actors.map((actor, idx) => (
                <span
                  key={idx}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium break-words transition-all ${
                    node.status === 'trigger' || node.status === 'critical-gap'
                      ? 'bg-white/25 backdrop-blur-sm'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {actor}
                </span>
              ))}
            </div>
          )}

          {node.gap && (
            <div className={`mt-2.5 mb-0 p-2.5 rounded-xl flex items-start gap-2 text-xs font-medium border ${
              node.status === 'trigger' || node.status === 'critical-gap'
                ? 'bg-white/20 backdrop-blur-sm border-white/40'
                : 'bg-amber-50 border-amber-300/50'
            }`}>
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="break-words whitespace-normal leading-relaxed">{node.gap}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FlowNode;
