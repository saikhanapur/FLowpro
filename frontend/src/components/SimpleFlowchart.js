import React from 'react';
import { CheckCircle, AlertTriangle, Play, XCircle, Database, Zap } from 'lucide-react';

const SimpleFlowchart = ({ process, onNodeClick, selectedNodeId }) => {
  if (!process?.nodes) return null;

  const getNodeStyle = (node) => {
    const isTrigger = node.type === 'trigger' || node.status === 'trigger';
    const isCritical = node.gap || node.hasGap || node.status === 'critical';
    const isWarning = node.status === 'warning';
    const isActive = node.status === 'active' || node.status === 'complete';

    if (isTrigger) {
      return {
        bgColor: 'bg-blue-500',
        borderColor: 'border-blue-600',
        textColor: 'text-white',
        icon: <Zap className="w-5 h-5 text-white" />
      };
    }
    
    if (isCritical) {
      return {
        bgColor: 'bg-red-50',
        borderColor: 'border-red-500',
        textColor: 'text-red-900',
        icon: <XCircle className="w-5 h-5 text-red-600" />
      };
    }
    
    if (isWarning) {
      return {
        bgColor: 'bg-white',
        borderColor: 'border-yellow-400',
        textColor: 'text-gray-900',
        icon: <AlertTriangle className="w-5 h-5 text-yellow-600" />
      };
    }
    
    if (isActive) {
      return {
        bgColor: 'bg-white',
        borderColor: 'border-green-400',
        textColor: 'text-gray-900',
        icon: <CheckCircle className="w-5 h-5 text-green-600" />
      };
    }
    
    return {
      bgColor: 'bg-white',
      borderColor: 'border-gray-300',
      textColor: 'text-gray-900',
      icon: null
    };
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-gray-50 p-8">
      {/* Legend Bar */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="bg-white rounded-lg shadow-sm px-6 py-3 border border-gray-200">
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-gray-700 font-medium">Trigger</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-400"></div>
              <span className="text-gray-700 font-medium">Active/Current</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
              <span className="text-gray-700 font-medium">Warning/Issue</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-400"></div>
              <span className="text-gray-700 font-medium">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-gray-700 font-medium">Critical Gap</span>
            </div>
          </div>
        </div>
      </div>

      {/* Flowchart Container */}
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="space-y-4">
          {process.nodes.map((node, index) => {
            const style = getNodeStyle(node);
            const isSelected = selectedNodeId === node.id;

            return (
              <div key={node.id} className="flex flex-col items-center">
                {/* Node Card */}
                <div
                  onClick={() => onNodeClick(node)}
                  className={`w-full ${style.bgColor} ${style.borderColor} border-2 rounded-lg p-5 cursor-pointer transition-all hover:shadow-md ${
                    isSelected ? 'ring-2 ring-blue-400 ring-offset-2' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {style.icon && <div className="mt-0.5">{style.icon}</div>}
                    <div className="flex-1">
                      <h3 className={`font-bold text-lg mb-2 ${style.textColor}`}>
                        {node.title}
                      </h3>
                      {node.description && (
                        <p className={`text-sm ${style.textColor} opacity-80`}>
                          {node.description}
                        </p>
                      )}
                      {node.actor && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            {node.actor}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Gap indicator */}
                  {node.gap && (
                    <div className="mt-3 bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded">
                      <p className="text-xs text-yellow-800">
                        <span className="font-semibold">⚠️ Gap:</span> {node.gap}
                      </p>
                    </div>
                  )}
                </div>

                {/* Arrow */}
                {index < process.nodes.length - 1 && (
                  <div className="flex justify-center my-3">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M12 5v14m0 0l-4-4m4 4l4-4" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Critical Gaps Summary */}
        {process.nodes.some(n => n.gap || n.hasGap) && (
          <div className="mt-8 bg-red-50 border border-red-200 rounded-lg p-5">
            <h3 className="text-red-900 font-bold text-lg mb-3 flex items-center gap-2">
              <XCircle className="w-5 h-5" />
              Critical Gaps ({process.nodes.filter(n => n.gap || n.hasGap).length})
            </h3>
            <div className="space-y-2">
              {process.nodes.filter(n => n.gap || n.hasGap).map((node, i) => (
                <div key={i} className="text-sm text-red-800">
                  <span className="font-semibold">Gap {i + 1}:</span> {node.gap || 'Issue identified in ' + node.title}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Improvement Opportunities */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-5">
          <h3 className="text-blue-900 font-bold text-lg mb-3">Improvement Opportunities</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• Review and optimize process flow for efficiency</li>
            <li>• Implement automation where possible</li>
            <li>• Add monitoring and alerts for critical steps</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SimpleFlowchart;
