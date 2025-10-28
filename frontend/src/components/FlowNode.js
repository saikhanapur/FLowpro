import React from 'react';
import { AlertCircle, CheckCircle, AlertTriangle, Zap } from 'lucide-react';

const FlowNode = ({ node, onClick, isSelected }) => {
  const getStatusStyles = () => {
    switch (node.status) {
      case 'trigger':
        return 'gradient-blue text-white shadow-lg';
      case 'current':
        return 'bg-white border-2 border-emerald-500 text-slate-800';
      case 'warning':
        return 'bg-white border-2 border-amber-500 text-slate-800';
      case 'critical-gap':
        return 'gradient-rose text-white shadow-lg pulse-glow';
      default:
        return 'bg-white border-2 border-slate-300 text-slate-800';
    }
  };

  const getIcon = () => {
    switch (node.status) {
      case 'trigger':
        return <Zap className="w-5 h-5" />;
      case 'current':
        return <CheckCircle className="w-5 h-5 text-emerald-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case 'critical-gap':
        return <AlertCircle className="w-5 h-5" />;
      default:
        return null;
    }
  };

  return (
    <div
      onClick={onClick}
      className={`rounded-xl p-6 cursor-pointer transition-all hover:scale-105 ${getStatusStyles()} ${
        isSelected ? 'ring-4 ring-blue-400 ring-offset-2' : ''
      }`}
      data-testid={`flow-node-${node.id}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold mb-2">{node.title}</h3>
          <p className="text-sm opacity-90 line-clamp-2">{node.description}</p>
          
          {node.actors && node.actors.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {node.actors.map((actor, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-white/20 rounded text-xs"
                >
                  {actor}
                </span>
              ))}
            </div>
          )}

          {node.gap && (
            <div className="mt-3 text-sm font-semibold">
              Gap: {node.gap}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FlowNode;
