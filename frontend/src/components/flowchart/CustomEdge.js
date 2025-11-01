import React from 'react';
import { getStraightPath, EdgeLabelRenderer } from 'reactflow';

const CustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
  style = {},
}) => {
  // EROAD Design: Use straight lines (not bezier)
  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const isYesBranch = data?.condition === 'yes' || data?.label === 'YES';
  const isNoBranch = data?.condition === 'no' || data?.label === 'NO';
  const isErrorPath = data?.type === 'error' || data?.label?.toLowerCase().includes('error');

  // EROAD Style: Simple, clean edges
  const getEdgeStyle = () => {
    if (isErrorPath) {
      return {
        stroke: '#FF3B30',
        strokeWidth: 2,
        strokeDasharray: '5,5',
      };
    }
    if (isYesBranch) {
      return {
        stroke: '#34C759',
        strokeWidth: 2,
      };
    }
    if (isNoBranch) {
      return {
        stroke: '#FF3B30',
        strokeWidth: 2,
      };
    }
    return {
      stroke: '#CCCCCC',
      strokeWidth: 1.5,
    };
  };

  const edgeStyle = { ...getEdgeStyle(), ...style };

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        style={edgeStyle}
        markerEnd={markerEnd}
      />
      
      {/* EROAD Style: Simple edge labels */}
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <div 
              className="px-2 py-0.5 rounded text-xs font-semibold"
              style={{
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                backgroundColor: isYesBranch ? '#34C759' : isNoBranch ? '#FF3B30' : '#FFFFFF',
                color: isYesBranch || isNoBranch ? '#FFFFFF' : '#374151',
                border: !isYesBranch && !isNoBranch ? '1px solid #D1D5DB' : 'none'
              }}
            >
              {data.label}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default CustomEdge;
