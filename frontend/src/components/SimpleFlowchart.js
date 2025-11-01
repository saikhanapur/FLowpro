import React from 'react';
import { CheckCircle, AlertTriangle, Play, HelpCircle, Database, Zap, XCircle, AlertCircle, Info } from 'lucide-react';

const SimpleFlowchart = ({ process, onNodeClick, selectedNodeId }) => {
  if (!process?.nodes) return null;

  // EROAD Color System
  const lineColors = {
    slate: '#cbd5e1',
    blue: '#60a5fa',
    emerald: '#10b981',
    amber: '#fbbf24',
    rose: '#f43f5e'
  };

  // Layout Configuration
  const layoutConfig = {
    nodeWidth: 450,
    nodeMinHeight: 100,
    verticalSpacing: 120,
    centerX: 450,
  };

  // Status Icon Mapping
  const getStatusIcon = (status) => {
    const iconSize = "w-5 h-5";
    
    const icons = {
      'trigger': <Zap className={`${iconSize} text-blue-600`} />,
      'active': <CheckCircle className={`${iconSize} text-emerald-500`} />,
      'complete': <CheckCircle className={`${iconSize} text-emerald-500`} />,
      'warning': <AlertCircle className={`${iconSize} text-amber-500`} />,
      'critical': <XCircle className={`${iconSize} text-rose-500`} />,
      'gap': <XCircle className={`${iconSize} text-rose-500`} />,
    };
    
    return icons[status] || <Info className={`${iconSize} text-slate-500`} />;
  };

  // Node Styling Function
  const getNodeStyle = (node) => {
    const isTrigger = node.type === 'trigger' || node.status === 'trigger';
    const isCritical = node.status === 'warning' || node.gap || node.hasGap;
    const isActive = node.status === 'active' || node.status === 'complete';
    const isWarning = node.status === 'warning';
    
    const baseClasses = "transition-all duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer rounded-xl p-6";
    
    if (isTrigger) {
      return {
        className: `${baseClasses} bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg border-2 border-blue-400`,
        textColor: 'text-white',
        descColor: 'text-white/90',
        status: 'trigger'
      };
    }
    
    if (isCritical) {
      return {
        className: `${baseClasses} bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-lg border-2 border-rose-400`,
        textColor: 'text-white',
        descColor: 'text-white/90',
        status: 'critical'
      };
    }
    
    if (isWarning) {
      return {
        className: `${baseClasses} bg-white border-2 border-amber-400 shadow-md`,
        textColor: 'text-slate-800',
        descColor: 'text-slate-600',
        status: 'warning'
      };
    }
    
    if (isActive) {
      return {
        className: `${baseClasses} bg-white border-2 border-emerald-400 shadow-md`,
        textColor: 'text-slate-800',
        descColor: 'text-slate-600',
        status: 'active'
      };
    }
    
    return {
      className: `${baseClasses} bg-white border-2 border-slate-300 shadow-sm`,
      textColor: 'text-slate-800',
      descColor: 'text-slate-600',
      status: 'default'
    };
  };

  // Calculate Node Positions
  const calculateNodePositions = (nodes) => {
    const positions = [];
    let currentY = 20;
    
    nodes.forEach((node) => {
      positions.push({
        id: node.id,
        x: layoutConfig.centerX - layoutConfig.nodeWidth / 2,
        y: currentY
      });
      currentY += layoutConfig.verticalSpacing;
    });
    
    return positions;
  };

  const nodePositions = calculateNodePositions(process.nodes);

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Legend Bar */}
        <div className="mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex flex-wrap items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-600" />
                <span className="text-slate-700 font-medium">Trigger</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span className="text-slate-700 font-medium">Active</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <span className="text-slate-700 font-medium">Warning</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-500" />
                <span className="text-slate-700 font-medium">Critical Gap</span>
              </div>
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-600" />
                <span className="text-slate-700 font-medium">API Integration</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Container with Grid Overlay */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-12 relative" style={{ minHeight: '1500px' }}>
          
          {/* Grid background overlay */}
          <div 
            className="absolute inset-0 opacity-30 pointer-events-none rounded-2xl" 
            style={{
              backgroundImage: 'radial-gradient(circle, #e2e8f0 1px, transparent 1px)',
              backgroundSize: '30px 30px'
            }} 
          />

          {/* Nodes */}
          <div className="relative">
            {process.nodes.map((node, index) => {
              const position = nodePositions[index];
              const style = getNodeStyle(node);
              const isSelected = selectedNodeId === node.id;

              return (
                <React.Fragment key={node.id}>
                  {/* Node */}
                  <div
                    className={style.className}
                    style={{
                      position: 'absolute',
                      left: position.x,
                      top: position.y,
                      width: layoutConfig.nodeWidth,
                      minHeight: layoutConfig.nodeMinHeight,
                      boxShadow: isSelected ? '0 0 0 4px rgba(59, 130, 246, 0.3)' : undefined
                    }}
                    onClick={() => onNodeClick(node)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex-shrink-0">
                        {getStatusIcon(style.status)}
                      </div>
                      <div className="flex-1">
                        <h3 className={`font-semibold text-base leading-tight mb-2 ${style.textColor}`}>
                          {node.title}
                        </h3>
                        {node.description && (
                          <p className={`text-sm leading-relaxed ${style.descColor}`}>
                            {node.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Connection Line & Arrow */}
                  {index < process.nodes.length - 1 && (
                    <>
                      {/* Vertical Line */}
                      <div
                        className="absolute pointer-events-none"
                        style={{
                          left: position.x + layoutConfig.nodeWidth / 2 - 1,
                          top: position.y + layoutConfig.nodeMinHeight,
                          width: 2,
                          height: layoutConfig.verticalSpacing - layoutConfig.nodeMinHeight,
                          backgroundColor: lineColors.slate
                        }}
                      />
                      {/* Arrow */}
                      <div
                        className="absolute pointer-events-none"
                        style={{
                          left: position.x + layoutConfig.nodeWidth / 2 - 4,
                          top: position.y + layoutConfig.verticalSpacing - 8,
                          width: 0,
                          height: 0,
                          borderLeft: '4px solid transparent',
                          borderRight: '4px solid transparent',
                          borderTop: `8px solid ${lineColors.slate}`
                        }}
                      />
                    </>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

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
              {/* Node Card - STATUS-BASED COLORS */}
              <div
                onClick={() => onNodeClick(node)}
                className="relative cursor-pointer transition-all duration-200 hover:scale-[1.02]"
                style={{
                  width: '600px',
                  border: `2px solid ${style.borderColor}`,
                  backgroundColor: style.backgroundColor,
                  boxShadow: isSelected ? `0 4px 16px ${style.dotColor}40` : '0 2px 8px rgba(0, 0, 0, 0.08)',
                  borderRadius: '12px',
                  padding: '24px', // Consistent 24px padding (8px grid: 3 units)
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                }}
              >
                {/* Status Dot */}
                {style.dotColor && (
                  <div
                    className="absolute -top-2 -right-2 w-4 h-4 rounded-full border-2 border-white"
                    style={{
                      backgroundColor: style.dotColor,
                      boxShadow: `0 0 8px ${style.dotColor}60`
                    }}
                  />
                )}

                {/* Gap Indicator */}
                {hasGap && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600 rounded-l-xl" />
                )}

                {/* Content */}
                <div>
                  {/* Title with Icon */}
                  <div className="flex items-start gap-3 mb-2">
                    {style.icon && <div className="mt-0.5">{style.icon}</div>}
                    <h3 
                      className="font-bold text-lg leading-tight flex-1"
                      style={{ color: style.textColor }}
                    >
                      {node.title}
                    </h3>
                  </div>

                  {/* Actor/User */}
                  {node.actor && (
                    <p 
                      className="text-sm mb-3 opacity-80"
                      style={{ color: style.textColor }}
                    >
                      User: {node.actor}
                    </p>
                  )}

                  {/* Description */}
                  {node.description && (
                    <p 
                      className="text-sm leading-relaxed opacity-90"
                      style={{ color: style.textColor }}
                    >
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
