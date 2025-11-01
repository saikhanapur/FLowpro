import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { Circle, Phone, FileText, Clock, AlertCircle, Info } from 'lucide-react';

const ActionNode = ({ data, selected }) => {
  const [showDetails, setShowDetails] = useState(false);

  // Check if node has operational details
  const hasDetails = data.operationalDetails && (
    data.operationalDetails.requiredData?.length > 0 ||
    data.operationalDetails.specificActions?.length > 0 ||
    Object.keys(data.operationalDetails.contactInfo || {}).length > 0
  );

  const isCritical = data.status === 'warning' || data.title?.toLowerCase().includes('critical');

  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-slate-400 !w-2 !h-2" />
      
      {/* Minimalist Card Design */}
      <div 
        className={`
          group relative
          bg-white rounded-2xl shadow-lg hover:shadow-2xl
          transition-all duration-300
          ${selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
          ${isCritical ? 'ring-2 ring-red-500' : ''}
          min-w-[280px] max-w-[320px]
        `}
        onMouseEnter={() => hasDetails && setShowDetails(true)}
        onMouseLeave={() => setShowDetails(false)}
      >
        {/* Critical indicator - left accent */}
        {isCritical && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 rounded-l-2xl" />
        )}

        {/* Main Content */}
        <div className="px-6 py-5">
          {/* Title */}
          <h3 className="text-slate-900 font-semibold text-base leading-tight mb-2">
            {data.title}
          </h3>
          
          {/* Actor - subtle */}
          {data.actor && (
            <p className="text-slate-500 text-xs font-medium mb-3">
              {data.actor}
            </p>
          )}

          {/* Description - only if not too long */}
          {data.description && data.description.length < 80 && (
            <p className="text-slate-600 text-sm leading-relaxed">
              {data.description}
            </p>
          )}
        </div>

        {/* Detail indicator badge - bottom right */}
        {hasDetails && (
          <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <Info className="w-3.5 h-3.5 text-white" />
          </div>
        )}

        {/* Expandable details on hover - appears below */}
        {hasDetails && showDetails && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 z-50 max-w-[400px]">
            <div className="space-y-3 text-sm">
              {/* Required Data */}
              {data.operationalDetails?.requiredData?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <h4 className="font-semibold text-slate-900">Required Data:</h4>
                  </div>
                  <ul className="space-y-1 ml-6">
                    {data.operationalDetails.requiredData.map((item, i) => (
                      <li key={i} className="text-slate-700 text-xs">• {item}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Contact Info */}
              {Object.keys(data.operationalDetails?.contactInfo || {}).length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Phone className="w-4 h-4 text-blue-600" />
                    <h4 className="font-semibold text-slate-900">Contacts:</h4>
                  </div>
                  <div className="space-y-1 ml-6">
                    {Object.entries(data.operationalDetails.contactInfo).map(([name, number]) => (
                      <div key={name} className="text-xs">
                        <span className="font-medium text-slate-900">{name}:</span>{' '}
                        <span className="text-slate-700">{number}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Specific Actions */}
              {data.operationalDetails?.specificActions?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-blue-600" />
                    <h4 className="font-semibold text-slate-900">Actions:</h4>
                  </div>
                  <ul className="space-y-1 ml-6">
                    {data.operationalDetails.specificActions.map((item, i) => (
                      <li key={i} className="text-slate-700 text-xs">• {item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Timeline */}
              {data.operationalDetails?.timeline && (
                <div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="text-xs text-slate-700">{data.operationalDetails.timeline}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-slate-400 !w-2 !h-2" />
    </>
  );
};

export default ActionNode;
