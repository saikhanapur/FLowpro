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

  // Determine edge style based on type
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
        strokeWidth: 3,
      };
    }
    if (isNoBranch) {
      return {
        stroke: '#EF4444',
        strokeWidth: 3,
      };
    }
    return {
      stroke: '#94A3B8',
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
      
      {/* Edge Label (YES/NO) */}
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
                px-3 py-1 rounded-full font-bold text-sm shadow-lg
                ${isYesBranch ? 'bg-green-500 text-white' : ''}
                ${isNoBranch ? 'bg-red-500 text-white' : ''}
                ${!isYesBranch && !isNoBranch ? 'bg-slate-700 text-white' : ''}
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
