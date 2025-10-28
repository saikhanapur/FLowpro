import React from 'react';
import { AlertCircle, CheckCircle, AlertTriangle, Zap } from 'lucide-react';

const FlowNode = ({ node, onClick, isSelected }) => {
  const getStatusStyles = () => {
    switch (node.status) {
      case 'trigger':
        return 'gradient-blue text-white shadow-md border-2 border-blue-600';
      case 'current':
        return 'bg-emerald-50 border-2 border-emerald-500 text-slate-800 shadow-sm';
      case 'warning':
        return 'bg-amber-50 border-2 border-amber-500 text-slate-800 shadow-sm';
      case 'critical-gap':
        return 'gradient-rose text-white shadow-md border-2 border-rose-600';
      default:
        return 'bg-white border-2 border-slate-300 text-slate-800 shadow-sm';
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
      className={`rounded-lg p-4 pb-5 cursor-pointer transition-all duration-200 hover:scale-[1.01] mx-auto w-full overflow-visible ${getStatusStyles()} ${
        isSelected ? 'ring-4 ring-blue-400 ring-offset-2 scale-[1.01]' : ''
      }`}
      data-testid={`flow-node-${node.id}`}
      style={{ minHeight: 'auto' }}
    >
      <div className="flex items-start gap-2.5">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold mb-1.5 leading-tight break-words">{node.title}</h3>
          <p className="text-xs opacity-90 leading-relaxed mb-1 break-words whitespace-normal">{node.description}</p>
          
          {node.actors && node.actors.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1">
              {node.actors.map((actor, idx) => (
                <span
                  key={idx}
                  className={`px-2 py-0.5 rounded-full text-xs font-medium break-words ${
                    node.status === 'trigger' || node.status === 'critical-gap'
                      ? 'bg-white/20'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {actor}
                </span>
              ))}
            </div>
          )}

          {node.gap && (
            <div className="mt-2.5 mb-1 flex items-start gap-1.5 text-xs font-semibold">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span className="break-words whitespace-normal">{node.gap}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FlowNode;
