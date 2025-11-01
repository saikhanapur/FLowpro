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

export default SimpleFlowchart;
