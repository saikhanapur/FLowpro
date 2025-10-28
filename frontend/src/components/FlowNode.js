import React from 'react';
import { AlertCircle, CheckCircle, AlertTriangle, Zap } from 'lucide-react';

const FlowNode = ({ node, onClick, isSelected }) => {
  const getStatusStyles = () => {
    switch (node.status) {
      case 'trigger':
        return 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg';
      case 'current':
        return 'bg-white border border-emerald-300/60 text-slate-800 shadow-md hover:shadow-lg';
      case 'warning':
        return 'bg-white border border-amber-300/60 text-slate-800 shadow-md hover:shadow-lg';
      case 'critical-gap':
        return 'bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-lg';
      default:
        return 'bg-white border border-slate-300/50 text-slate-800 shadow-md hover:shadow-lg';
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
      className={`rounded-2xl p-4 cursor-pointer transition-all duration-300 ease-out hover:scale-[1.01] mx-auto w-full overflow-visible ${getStatusStyles()} ${
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
          <h3 className="text-base font-semibold mb-1.5 leading-tight break-words tracking-tight">{node.title}</h3>
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
