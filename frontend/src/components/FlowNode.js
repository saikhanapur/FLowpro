import React from 'react';
import { AlertCircle, CheckCircle, AlertTriangle, Zap } from 'lucide-react';

const FlowNode = ({ node, onClick, isSelected }) => {
  const getStatusStyles = () => {
    switch (node.status) {
      case 'trigger':
        return 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg border border-blue-400/30';
      case 'current':
        return 'bg-white border border-emerald-200 text-slate-800 shadow-sm hover:shadow-md';
      case 'warning':
        return 'bg-white border border-amber-200 text-slate-800 shadow-sm hover:shadow-md';
      case 'critical-gap':
        return 'bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-lg border border-rose-400/30';
      default:
        return 'bg-white border border-slate-200 text-slate-800 shadow-sm hover:shadow-md';
    }
  };

  const getIcon = () => {
    switch (node.status) {
      case 'trigger':
        return <Zap className="w-4 h-4" />;
      case 'current':
        return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'critical-gap':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div
      onClick={onClick}
      className={`rounded-xl p-5 pb-6 cursor-pointer transition-all duration-300 ease-out hover:scale-[1.02] mx-auto w-full overflow-visible ${getStatusStyles()} ${
        isSelected ? 'ring-2 ring-blue-500 ring-offset-4 scale-[1.02] shadow-xl' : ''
      }`}
      data-testid={`flow-node-${node.id}`}
      style={{ minHeight: 'auto', minWidth: '280px' }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-semibold mb-2.5 leading-snug break-words tracking-tight">{node.title}</h3>
          <p className="text-[13px] opacity-85 leading-relaxed mb-2 break-words whitespace-normal font-normal">{node.description}</p>
          
          {node.actors && node.actors.length > 0 && (
            <div className="mt-3.5 flex flex-wrap gap-1.5">
              {node.actors.map((actor, idx) => (
                <span
                  key={idx}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium break-words transition-all ${
                    node.status === 'trigger' || node.status === 'critical-gap'
                      ? 'bg-white/20 backdrop-blur-sm border border-white/30'
                      : 'bg-slate-50 text-slate-700 border border-slate-200'
                  }`}
                >
                  {actor}
                </span>
              ))}
            </div>
          )}

          {node.gap && (
            <div className={`mt-3.5 mb-0 p-3 rounded-lg flex items-start gap-2 text-[12px] font-medium border transition-all ${
              node.status === 'trigger' || node.status === 'critical-gap'
                ? 'bg-white/15 backdrop-blur-sm border-white/30'
                : 'bg-amber-50/80 backdrop-blur-sm border-amber-200'
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
