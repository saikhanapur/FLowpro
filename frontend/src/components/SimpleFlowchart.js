import React from 'react';
import { CheckCircle, AlertTriangle, Play, HelpCircle, Database } from 'lucide-react';

const SimpleFlowchart = ({ 
  process, 
  onNodeClick, 
  selectedNodeId, 
  readOnly, 
  onAddNode, 
  onDeleteNode, 
  onMoveNode, 
  reordering 
}) => {
  if (!process?.nodes) return null;

  const getNodeStyle = (node) => {
    const isCritical = node.status === 'warning' || node.gap || node.hasGap;
    const isComplete = node.status === 'complete' || node.type === 'end';
    const isActive = node.status === 'active';
    const isDecision = node.type === 'decision';
    const isStartEnd = node.type === 'trigger' || node.type === 'end';

    if (isDecision) {
      return {
        borderColor: '#FFCC00',
        backgroundColor: '#FFF9E6',
        icon: <HelpCircle className="w-4 h-4 text-yellow-600" />
      };
    }

    if (isStartEnd) {
      return {
        borderColor: '#34C759',
        backgroundColor: '#E8F8ED',
        icon: node.type === 'trigger' ? <Play className="w-4 h-4 text-green-600" /> : <CheckCircle className="w-4 h-4 text-green-600" />
      };
    }

    if (isCritical) {
      return {
        borderColor: '#FF3B30',
        backgroundColor: '#FFE5E5',
        icon: <AlertTriangle className="w-4 h-4 text-red-600" />,
        dotColor: '#FF3B30'
      };
    }

    if (isComplete) {
      return {
        borderColor: '#34C759',
        backgroundColor: '#E8F8ED',
        icon: <CheckCircle className="w-4 h-4 text-green-600" />,
        dotColor: '#34C759'
      };
    }

    if (isActive) {
      return {
        borderColor: '#007AFF',
        backgroundColor: '#E5F2FF',
        icon: <Database className="w-4 h-4 text-blue-600" />,
        dotColor: '#007AFF'
      };
    }

    return {
      borderColor: '#CCCCCC',
      backgroundColor: '#FFFFFF',
      icon: null,
      dotColor: '#CCCCCC'
    };
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {process.nodes.map((node, index) => {
          const style = getNodeStyle(node);
          const isSelected = selectedNodeId === node.id;
          const hasGap = node.gap || node.hasGap;

          return (
            <div key={node.id} className="flex flex-col items-center">
              {/* Node Card */}
              <div
                onClick={() => onNodeClick(node)}
                className="relative cursor-pointer transition-all duration-200 hover:scale-105"
                style={{
                  width: '600px',
                  border: `2px solid ${style.borderColor}`,
                  backgroundColor: style.backgroundColor,
                  boxShadow: isSelected ? `0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 4px ${style.dotColor}20` : '0 2px 8px rgba(0, 0, 0, 0.08)',
                  borderRadius: '12px',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                }}
              >
                {/* Status Dot */}
                {style.dotColor && (
                  <div
                    className="absolute -top-2 -right-2 w-4 h-4 rounded-full border-2 border-white"
                    style={{
                      backgroundColor: style.dotColor,
                      boxShadow: `0 0 8px ${style.dotColor}40`
                    }}
                  />
                )}

                {/* Gap Indicator */}
                {hasGap && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 rounded-l-xl" />
                )}

                {/* Content */}
                <div className="px-6 py-5">
                  {/* Title with Icon */}
                  <div className="flex items-start gap-2 mb-2">
                    {style.icon && <div className="mt-0.5">{style.icon}</div>}
                    <h3 className="text-gray-900 font-bold text-lg leading-tight flex-1">
                      {node.title}
                    </h3>
                  </div>

                  {/* Actor/User */}
                  {node.actor && (
                    <p className="text-gray-600 text-sm mb-3">
                      User: {node.actor}
                    </p>
                  )}

                  {/* Description */}
                  {node.description && (
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {node.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Connector Line */}
              {index < process.nodes.length - 1 && (
                <div className="w-0.5 h-12 bg-gray-300 my-2" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SimpleFlowchart;
