import React, { useState } from 'react';
import { CheckCircle, AlertCircle, XCircle, Zap, Info, Phone, FileText } from 'lucide-react';

// EXACT recreation of EROAD design
const SimpleFlowchartView = ({ process, onNodeClick, selectedNode }) => {
  if (!process || !process.nodes) return null;

  // Calculate positions (vertical layout with proper spacing)
  const cx = 400; // Center X
  let currentY = 60;
  const verticalSpacing = 140;
  const nodeWidth = 240;

  // Position nodes
  const positionedNodes = process.nodes.map((node, index) => {
    const position = {
      x: cx - nodeWidth / 2,
      y: currentY,
      w: nodeWidth,
    };
    currentY += verticalSpacing;
    return { ...node, position };
  });

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-slate-50 to-slate-100 overflow-auto">
      <div className="relative" style={{ minHeight: `${currentY + 100}px`, width: '100%' }}>
        {/* Render connectors (lines + arrows) */}
        {positionedNodes.map((node, index) => {
          if (index < positionedNodes.length - 1) {
            const nextNode = positionedNodes[index + 1];
            const startY = node.position.y + 70; // Approx node height
            const endY = nextNode.position.y;
            const lineHeight = endY - startY - 8; // 8px for arrow

            // Get color based on status
            const getColor = (status) => {
              switch(status) {
                case 'trigger': return '#60a5fa'; // blue-400
                case 'critical-gap': return '#f43f5e'; // rose-500
                case 'warning': return '#fbbf24'; // amber-400
                case 'current': return '#10b981'; // emerald-500
                default: return '#cbd5e1'; // slate-300
              }
            };

            const color = getColor(nextNode.status);

            return (
              <React.Fragment key={`connector-${index}`}>
                {/* Vertical Line */}
                <div
                  style={{
                    position: 'absolute',
                    left: cx,
                    top: startY,
                    width: '2px',
                    height: `${lineHeight}px`,
                    backgroundColor: color,
                  }}
                />
                {/* Arrow */}
                <div
                  style={{
                    position: 'absolute',
                    left: cx - 4,
                    top: endY - 8,
                    width: 0,
                    height: 0,
                    borderLeft: '4px solid transparent',
                    borderRight: '4px solid transparent',
                    borderTop: `8px solid ${color}`,
                  }}
                />
              </React.Fragment>
            );
          }
          return null;
        })}

        {/* Render nodes */}
        {positionedNodes.map((node) => (
          <FlowNode
            key={node.id}
            node={node}
            isSelected={selectedNode?.id === node.id}
            onClick={() => onNodeClick(node)}
          />
        ))}
      </div>
    </div>
  );
};

// Individual node component - EXACT EROAD styling
const FlowNode = ({ node, isSelected, onClick }) => {
  const { position, title, status, actor, operationalDetails } = node;

  // Check if has details
  const hasDetails = operationalDetails && (
    operationalDetails.requiredData?.length > 0 ||
    operationalDetails.specificActions?.length > 0 ||
    Object.keys(operationalDetails.contactInfo || {}).length > 0
  );

  // Get styling based on status (EXACT EROAD colors)
  const getNodeStyle = () => {
    switch(status) {
      case 'trigger':
        return {
          bg: 'bg-gradient-to-br from-blue-500 to-blue-600',
          text: 'text-white',
          border: '',
          shadow: 'shadow-lg',
          icon: <Zap className="w-5 h-5" />,
          iconColor: 'text-blue-200',
        };
      case 'critical-gap':
        return {
          bg: 'bg-gradient-to-br from-rose-500 to-rose-600',
          text: 'text-white',
          border: '',
          shadow: 'shadow-lg',
          icon: <XCircle className="w-5 h-5" />,
          iconColor: 'text-rose-200',
        };
      case 'warning':
        return {
          bg: 'bg-white',
          text: 'text-slate-800',
          border: 'border-2 border-amber-400',
          shadow: 'shadow-md',
          icon: <AlertCircle className="w-5 h-5 text-amber-500" />,
          iconColor: '',
        };
      case 'current':
      default:
        return {
          bg: 'bg-white',
          text: 'text-slate-800',
          border: 'border-2 border-emerald-400',
          shadow: 'shadow-md',
          icon: <CheckCircle className="w-5 h-5 text-emerald-500" />,
          iconColor: '',
        };
    }
  };

  const style = getNodeStyle();

  return (
    <div
      className={`
        absolute rounded-xl p-4 cursor-pointer
        transition-all duration-300 hover:scale-105 hover:shadow-2xl
        ${style.bg} ${style.border} ${style.shadow}
        ${isSelected ? 'ring-4 ring-blue-300 ring-offset-2' : ''}
      `}
      style={{
        left: position.x,
        top: position.y,
        width: position.w,
      }}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 ${style.iconColor}`}>
          {style.icon}
        </div>

        {/* Content */}
        <div className="flex-1">
          <h3 className={`font-semibold text-sm leading-tight mb-1 ${style.text}`}>
            {title}
          </h3>
          
          {actor && (
            <p className={`text-xs ${style.text === 'text-white' ? 'text-white/80' : 'text-slate-600'}`}>
              {actor}
            </p>
          )}
        </div>

        {/* Detail indicator */}
        {hasDetails && (
          <div className="flex-shrink-0">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleFlowchartView;
