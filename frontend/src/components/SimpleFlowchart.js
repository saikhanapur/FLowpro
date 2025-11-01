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

  // Analyze which icon types are actually used in this flowchart
  const usedIconTypes = new Set();
  process.nodes.forEach(node => {
    const isTrigger = node.type === 'trigger' || node.status === 'trigger';
    const isActive = node.status === 'active' || node.status === 'complete';
    const isWarning = node.status === 'warning';
    const isCriticalGap = node.gap || node.hasGap;
    const isAPIIntegration = node.title?.toLowerCase().includes('api') || 
                             node.title?.toLowerCase().includes('integration') ||
                             node.title?.toLowerCase().includes('database');

    if (isTrigger) usedIconTypes.add('trigger');
    if (isActive) usedIconTypes.add('active');
    if (isWarning) usedIconTypes.add('warning');
    if (isCriticalGap) usedIconTypes.add('criticalGap');
    if (isAPIIntegration) usedIconTypes.add('apiIntegration');
  });

  const getNodeStyle = (node) => {
    const isCritical = node.status === 'warning' || node.gap || node.hasGap;
    const isComplete = node.status === 'complete' || node.type === 'end';
    const isActive = node.status === 'active';
    const isDecision = node.type === 'decision';
    const isStartEnd = node.type === 'trigger' || node.type === 'end';

    // STATUS-BASED FULL CARD COLORS (not just borders)
    if (isDecision) {
      return {
        borderColor: '#F59E0B',
        backgroundColor: '#FEF3C7',
        textColor: '#92400E',
        icon: <HelpCircle className="w-4 h-4 text-amber-700" />,
        dotColor: '#F59E0B'
      };
    }

    if (isStartEnd && node.type === 'trigger') {
      return {
        borderColor: '#059669',
        backgroundColor: '#D1FAE5',
        textColor: '#065F46',
        icon: <Play className="w-4 h-4 text-emerald-700 fill-emerald-700" />,
        dotColor: '#059669'
      };
    }

    if (isStartEnd && node.type === 'end') {
      return {
        borderColor: '#10B981',
        backgroundColor: '#D1FAE5',
        textColor: '#065F46',
        icon: <CheckCircle className="w-4 h-4 text-emerald-700" />,
        dotColor: '#10B981'
      };
    }

    if (isCritical) {
      return {
        borderColor: '#DC2626',
        backgroundColor: '#FEE2E2',
        textColor: '#991B1B',
        icon: <AlertTriangle className="w-4 h-4 text-red-700" />,
        dotColor: '#DC2626'
      };
    }

    if (isComplete) {
      return {
        borderColor: '#10B981',
        backgroundColor: '#D1FAE5',
        textColor: '#065F46',
        icon: <CheckCircle className="w-4 h-4 text-emerald-700" />,
        dotColor: '#10B981'
      };
    }

    if (isActive) {
      return {
        borderColor: '#3B82F6',
        backgroundColor: '#DBEAFE',
        textColor: '#1E40AF',
        icon: <Database className="w-4 h-4 text-blue-700" />,
        dotColor: '#3B82F6'
      };
    }

    return {
      borderColor: '#9CA3AF',
      backgroundColor: '#F9FAFB',
      textColor: '#374151',
      icon: null,
      dotColor: '#9CA3AF'
    };
  };

  return (
    <div className="w-full h-full flex flex-col" style={{ backgroundColor: '#E8EEF5' }}>
      {/* Legend Bar - Only show icons actually used in this flowchart */}
      <div className="px-8 pt-8 pb-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm px-6 py-3 border border-gray-200">
            <div className="flex items-center gap-8 justify-center flex-wrap">
            {/* Trigger */}
            {usedIconTypes.has('trigger') && (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                  <Play className="w-3.5 h-3.5 text-white fill-white" />
                </div>
                <span className="text-sm text-gray-700 font-medium">Trigger</span>
              </div>
            )}
            
            {/* Active */}
            {usedIconTypes.has('active') && (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                  <CheckCircle className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm text-gray-700 font-medium">Active</span>
              </div>
            )}
            
            {/* Warning */}
            {usedIconTypes.has('warning') && (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center">
                  <AlertTriangle className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm text-gray-700 font-medium">Warning</span>
              </div>
            )}
            
            {/* Critical Gap */}
            {usedIconTypes.has('criticalGap') && (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                  <HelpCircle className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm text-gray-700 font-medium">Critical Gap</span>
              </div>
            )}
            
            {/* API Integration */}
            {usedIconTypes.has('apiIntegration') && (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                  <Database className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm text-gray-700 font-medium">API Integration</span>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
      
      {/* Framed Container - Fills remaining height */}
      <div className="flex-1 px-8 pb-8 overflow-hidden">
        <div 
          className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm h-full overflow-y-auto"
          style={{ 
            border: '1px solid #D1D5DB',
            padding: '32px'
          }}
        >
        {process.nodes.map((node, index) => {
          const style = getNodeStyle(node);
          const isSelected = selectedNodeId === node.id;
          const hasGap = node.gap || node.hasGap;

          return (
            <div key={node.id} className="mb-6 flex flex-col items-center">
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

              {/* Connector Arrow */}
              {index < process.nodes.length - 1 && (
                <div className="flex items-center justify-center my-2">
                  <svg width="24" height="48" viewBox="0 0 24 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Vertical line */}
                    <line x1="12" y1="0" x2="12" y2="40" stroke="#3B82F6" strokeWidth="2"/>
                    {/* Arrow head */}
                    <polygon points="12,48 8,40 16,40" fill="#3B82F6"/>
                  </svg>
                </div>
              )}
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
};

export default SimpleFlowchart;
