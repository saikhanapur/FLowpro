import React from 'react';
import { X, AlertTriangle, Zap, CheckCircle } from 'lucide-react';

const IntegratedSidebar = ({ 
  selectedNode, 
  process, 
  intelligence, 
  intelligenceLoading, 
  showIntelligence, 
  onClose, 
  onRefreshIntelligence,
  onRegenerateIntelligence,
  isSimpleProcess 
}) => {
  const nodeData = selectedNode;

  return (
    <div className="fixed right-0 top-0 h-full w-[400px] bg-white shadow-2xl z-50 border-l border-gray-200 overflow-y-auto">
      
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-gray-900 font-bold text-lg">
            {showIntelligence ? 'AI Quick Tips' : 'Step Details'}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        
        {/* AI Intelligence View */}
        {showIntelligence && (
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-blue-600" />
                <h3 className="text-blue-900 font-bold">AI Process Intelligence</h3>
              </div>
              <p className="text-blue-700 text-sm">
                {isSimpleProcess 
                  ? 'Quick improvements to enhance your process'
                  : 'AI-generated insights to optimize your workflow'}
              </p>
            </div>

            {intelligenceLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 text-sm mt-4">Analyzing process...</p>
              </div>
            ) : intelligence?.issues && intelligence.issues.length > 0 ? (
              <div className="space-y-3">
                {intelligence.issues.map((issue, idx) => (
                  <div key={idx} className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        issue.severity === 'high' ? 'bg-red-100' : 'bg-yellow-100'
                      }`}>
                        <AlertTriangle className={`w-4 h-4 ${
                          issue.severity === 'high' ? 'text-red-600' : 'text-yellow-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 text-sm mb-1">
                          {issue.title || issue.description}
                        </h4>
                        <p className="text-gray-600 text-xs">
                          {issue.recommendation || issue.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-gray-700 font-medium">No issues found</p>
              </div>
            )}

            {onRegenerateIntelligence && (
              <button
                onClick={onRegenerateIntelligence}
                disabled={intelligenceLoading}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {intelligenceLoading ? 'Analyzing...' : 'Regenerate Insights'}
              </button>
            )}
          </div>
        )}

        {/* Node Details View - EXACT LAYOUT FROM REFERENCE */}
        {!showIntelligence && nodeData && (
          <div className="space-y-4">
            
            {/* STATUS Section */}
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Status
              </div>
              <div>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase ${
                  nodeData.status === 'trigger' ? 'bg-blue-100 text-blue-700' :
                  nodeData.status === 'active' || nodeData.status === 'complete' ? 'bg-green-100 text-green-700' :
                  nodeData.status === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                  nodeData.status === 'critical' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {nodeData.status || 'Active'}
                </span>
              </div>
            </div>

            {/* TITLE Section */}
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Title
              </div>
              <div className="text-gray-900 font-semibold text-base">
                {nodeData.title}
              </div>
            </div>

            {/* DESCRIPTION Section */}
            {nodeData.description && (
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Description
                </div>
                <div className="text-gray-700 text-sm leading-relaxed">
                  {nodeData.description}
                </div>
              </div>
            )}

            {/* RESPONSIBLE Section */}
            {nodeData.actor && (
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Responsible
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                    {nodeData.actor}
                  </span>
                  {nodeData.operationalDetails?.contactInfo && Object.keys(nodeData.operationalDetails.contactInfo).map((name, i) => (
                    <span key={i} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* GAP IDENTIFIED Section - Prominent Red Box */}
            {nodeData.gap && (
              <div className="bg-red-50 rounded-lg border border-red-200 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-red-900 uppercase tracking-wide mb-2">
                      Gap Identified
                    </div>
                    <p className="text-red-800 text-sm leading-relaxed mb-3">
                      {nodeData.gap}
                    </p>
                    <span className="inline-block px-2 py-1 bg-red-600 text-white text-xs font-semibold rounded">
                      Impact: High
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Operational Details if available */}
            {nodeData.operationalDetails && (nodeData.operationalDetails.requiredData?.length > 0 || nodeData.operationalDetails.specificActions?.length > 0) && (
              <div className="pt-4 border-t border-gray-200">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Operational Details
                </div>
                
                {nodeData.operationalDetails.requiredData && nodeData.operationalDetails.requiredData.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-gray-700 mb-1">Required Data:</p>
                    <ul className="space-y-1 ml-4">
                      {nodeData.operationalDetails.requiredData.map((item, i) => (
                        <li key={i} className="text-sm text-gray-600 list-disc">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {nodeData.operationalDetails.specificActions && nodeData.operationalDetails.specificActions.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-700 mb-1">Actions:</p>
                    <ul className="space-y-1 ml-4">
                      {nodeData.operationalDetails.specificActions.map((item, i) => (
                        <li key={i} className="text-sm text-gray-600 list-disc">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default IntegratedSidebar;
