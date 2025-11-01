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
  // EROAD Design: Use straight lines instead of bezier curves
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

  // Simple, clean edge styling
  const getEdgeStyle = () => {
    if (isErrorPath) {
      return {
        stroke: '#EF4444',
        strokeWidth: 2,
        strokeDasharray: '5,5',
      };
    }
    if (isYesBranch) {
      return {
        stroke: '#22C55E',
        strokeWidth: 2,
      };
    }
    if (isNoBranch) {
      return {
        stroke: '#EF4444',
        strokeWidth: 2,
      };
    }
    return {
      stroke: '#CBD5E1',
      strokeWidth: 2,
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
      
      {/* Simple edge label */}
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
              className={`
                px-2 py-0.5 rounded text-xs font-medium
                ${isYesBranch ? 'bg-green-500 text-white' : ''}
                ${isNoBranch ? 'bg-red-500 text-white' : ''}
                ${!isYesBranch && !isNoBranch ? 'bg-slate-100 text-slate-700' : ''}
              `}
              style={{
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
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
