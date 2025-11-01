import React from 'react';
import { getBezierPath, EdgeLabelRenderer } from 'reactflow';

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
  const [edgePath, labelX, labelY] = getBezierPath({
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

  // Minimalist edge style
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
        stroke: '#10B981',
        strokeWidth: 2.5,
      };
    }
    if (isNoBranch) {
      return {
        stroke: '#EF4444',
        strokeWidth: 2.5,
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
      
      {/* Minimalist edge label */}
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
                px-2.5 py-1 rounded-full font-semibold text-xs shadow-md
                ${isYesBranch ? 'bg-green-500 text-white' : ''}
                ${isNoBranch ? 'bg-red-500 text-white' : ''}
                ${!isYesBranch && !isNoBranch ? 'bg-white text-slate-700 border border-slate-300' : ''}
              `}
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
