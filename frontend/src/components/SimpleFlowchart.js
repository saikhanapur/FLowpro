import React from 'react';
import { Zap, CheckCircle, AlertCircle, XCircle, Database, Info } from 'lucide-react';

const SimpleFlowchart = ({ process, onNodeClick, selectedNodeId }) => {
  if (!process?.nodes) return null;

  // EXACT className strings from specification
  const nodeStyles = {
    trigger: "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg border-2 border-blue-400 rounded-xl p-6 transition-all duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer",
    critical: "bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-lg border-2 border-rose-400 rounded-xl p-6 transition-all duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer",
    active: "bg-white border-2 border-emerald-400 shadow-md rounded-xl p-6 transition-all duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer",
    warning: "bg-white border-2 border-amber-400 shadow-md rounded-xl p-6 transition-all duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer",
    default: "bg-white border-2 border-slate-300 shadow-sm rounded-xl p-6 transition-all duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer"
  };

  const getNodeClassName = (node) => {
    const isTrigger = node.type === 'trigger' || node.status === 'trigger';
    const isCritical = node.gap || node.hasGap || (node.status === 'critical');
    const isWarning = node.status === 'warning';
    const isActive = node.status === 'active' || node.status === 'complete';

    if (isTrigger) return nodeStyles.trigger;
    if (isCritical) return nodeStyles.critical;
    if (isWarning) return nodeStyles.warning;
    if (isActive) return nodeStyles.active;
    return nodeStyles.default;
  };

  const getIcon = (node) => {
    const isTrigger = node.type === 'trigger' || node.status === 'trigger';
    const isCritical = node.gap || node.hasGap;
    const isWarning = node.status === 'warning';
    const isActive = node.status === 'active' || node.status === 'complete';

    if (isTrigger) return <Zap className="w-5 h-5" />;
    if (isCritical) return <XCircle className="w-5 h-5" />;
    if (isWarning) return <AlertCircle className="w-5 h-5 text-amber-500" />;
    if (isActive) return <CheckCircle className="w-5 h-5 text-emerald-500" />;
    return <Info className="w-5 h-5 text-slate-500" />;
  };

  const isWhiteBackground = (node) => {
    return !(node.type === 'trigger' || node.status === 'trigger' || node.gap || node.hasGap || node.status === 'critical');
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-lg border-b border-slate-200 shadow-sm z-50">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            Process Flow
          </h1>
        </div>
      </div>

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
          
          {/* Grid background overlay - CRITICAL */}
          <div 
            className="absolute inset-0 opacity-30 pointer-events-none rounded-2xl" 
            style={{
              backgroundImage: 'radial-gradient(circle, #e2e8f0 1px, transparent 1px)',
              backgroundSize: '30px 30px'
            }} 
          />

          {/* Flowchart Nodes with Absolute Positioning */}
          <div className="relative">
            {process.nodes.map((node, index) => {
              const y = 20 + (index * 120); // 120px spacing between nodes
              const x = 225; // Center position for 450px nodes
              const isSelected = selectedNodeId === node.id;

              return (
                <React.Fragment key={node.id}>
                  {/* Node */}
                  <div
                    className={getNodeClassName(node)}
                    style={{
                      position: 'absolute',
                      width: '450px',
                      left: x,
                      top: y,
                      minHeight: '100px',
                      boxShadow: isSelected ? '0 0 0 4px rgba(59, 130, 246, 0.3)' : undefined
                    }}
                    onClick={() => onNodeClick(node)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="mt-0.5 flex-shrink-0">
                        {getIcon(node)}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1">
                        <h3 className={`font-semibold text-base leading-tight mb-2 ${isWhiteBackground(node) ? 'text-slate-800' : 'text-white'}`}>
                          {node.title}
                        </h3>
                        {node.description && (
                          <p className={`text-sm leading-relaxed ${isWhiteBackground(node) ? 'text-slate-600' : 'text-white/90'}`}>
                            {node.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Connection Line & Arrow */}
                  {index < process.nodes.length - 1 && (
                    <>
                      {/* Vertical Line - 2px wide */}
                      <div
                        className="absolute pointer-events-none"
                        style={{
                          left: x + 225 - 1, // Center of 450px node
                          top: y + 100, // Below current node
                          width: 2,
                          height: 120 - 100, // Space to next node minus node height
                          backgroundColor: '#cbd5e1'
                        }}
                      />
                      {/* Arrow - 8px tall triangle */}
                      <div
                        className="absolute pointer-events-none"
                        style={{
                          left: x + 225 - 4,
                          top: y + 120 - 8,
                          width: 0,
                          height: 0,
                          borderLeft: '4px solid transparent',
                          borderRight: '4px solid transparent',
                          borderTop: '8px solid #cbd5e1'
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
