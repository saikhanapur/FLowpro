import React from 'react';
import { Handle, Position } from 'reactflow';
import { Circle, Phone, FileText, Clock, AlertCircle } from 'lucide-react';

const ActionNode = ({ data, selected }) => {
  // Check if node has operational details
  const hasDetails = data.operationalDetails && (
    data.operationalDetails.requiredData?.length > 0 ||
    data.operationalDetails.specificActions?.length > 0 ||
    Object.keys(data.operationalDetails.contactInfo || {}).length > 0
  );

  // Count total operational details
  const detailCount = (
    (data.operationalDetails?.requiredData?.length || 0) +
    (data.operationalDetails?.specificActions?.length || 0) +
    (Object.keys(data.operationalDetails?.contactInfo || {}).length || 0) +
    (data.operationalDetails?.systems?.length || 0)
  );

  // Determine visual weight based on details
  const isCritical = data.status === 'warning' || data.title?.toLowerCase().includes('critical');
  const isDetailRich = detailCount > 3;

  // Icon selection based on node content
  const getIcon = () => {
    const title = data.title?.toLowerCase() || '';
    if (Object.keys(data.operationalDetails?.contactInfo || {}).length > 0) {
      return <Phone className="w-5 h-5" />;
    }
    if (data.operationalDetails?.requiredData?.length > 0) {
      return <FileText className="w-5 h-5" />;
    }
    if (data.operationalDetails?.timeline) {
      return <Clock className="w-5 h-5" />;
    }
    if (isCritical) {
      return <AlertCircle className="w-5 h-5" />;
    }
    return <Circle className="w-4 h-4 fill-current" />;
  };

  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-blue-500" />
      
      {/* Rectangle with visual weight system */}
      <div 
        className={`
          px-6 py-4 rounded-xl
          ${selected ? 'ring-4 ring-blue-400 ring-offset-2' : ''}
          transition-all duration-200 hover:shadow-2xl
          min-w-[280px] max-w-[350px]
        `}
        style={{
          background: isCritical 
            ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'
            : 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
          boxShadow: selected 
            ? `0 ${isDetailRich ? '20' : '10'}px ${isDetailRich ? '40' : '30'}px rgba(59, 130, 246, 0.4)` 
            : `0 ${isDetailRich ? '12' : '6'}px ${isDetailRich ? '25' : '20'}px rgba(59, 130, 246, 0.3)`,
          borderLeft: isCritical ? '6px solid #DC2626' : isDetailRich ? '4px solid #60A5FA' : 'none',
        }}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 mt-0.5 text-white/90">
            {getIcon()}
          </div>

          {/* Content */}
          <div className="flex-1">
            <h3 className={`text-white font-bold ${isDetailRich ? 'text-base' : 'text-sm'} leading-tight mb-1`}>
              {data.title}
            </h3>
            
            {data.description && (
              <p className="text-white/80 text-xs leading-relaxed mb-2">
                {data.description}
              </p>
            )}

            {/* Actor badge */}
            {data.actor && (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/20 rounded-full text-white text-xs font-medium">
                <span>👤 {data.actor}</span>
              </div>
            )}

            {/* Detail badges */}
            {hasDetails && (
              <div className="mt-2 flex flex-wrap gap-1">
                {data.operationalDetails?.requiredData?.length > 0 && (
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/20 rounded-full text-white text-xs">
                    <FileText className="w-3 h-3" />
                    <span>{data.operationalDetails.requiredData.length} fields</span>
                  </div>
                )}
                
                {Object.keys(data.operationalDetails?.contactInfo || {}).length > 0 && (
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/20 rounded-full text-white text-xs">
                    <Phone className="w-3 h-3" />
                    <span>{Object.keys(data.operationalDetails.contactInfo).length} contacts</span>
                  </div>
                )}
                
                {data.operationalDetails?.timeline && (
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/20 rounded-full text-white text-xs">
                    <Clock className="w-3 h-3" />
                    <span>Timed</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Visual density indicator for detail-rich nodes */}
        {isDetailRich && (
          <div className="absolute top-2 right-2 w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-blue-500" />
    </>
  );
};

export default ActionNode;
