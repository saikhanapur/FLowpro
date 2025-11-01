import React from 'react';
import { X, CheckCircle, XCircle, AlertTriangle, Zap, Target, Database } from 'lucide-react';

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

  // Analyze gaps
  const criticalGaps = process?.nodes?.filter(n => 
    n.status === 'warning' || n.gap || n.hasGap
  ) || [];

  const worksWell = process?.nodes?.filter(n => 
    n.status === 'active' || n.status === 'complete'
  ).slice(0, 3) || [];

  return (
    <div className="fixed right-0 top-0 h-full w-[400px] bg-white shadow-2xl z-50 border-l border-gray-200 overflow-y-auto">
      
      {/* Simple White Header */}
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
                <p className="text-gray-500 text-sm mt-1">Your process looks good!</p>
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

        {/* Node Details View */}
        {!showIntelligence && nodeData && (
          <div className="space-y-6">
            {/* Node Title */}
            <div>
              <h3 className="text-gray-900 font-bold text-xl mb-2">
                {nodeData.title}
              </h3>
              {nodeData.description && (
                <p className="text-gray-600 text-sm leading-relaxed">
                  {nodeData.description}
                </p>
              )}
            </div>

            {/* Status */}
            {nodeData.status && (
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-700">STATUS:</span>
                  <span className={`text-xs font-medium px-2 py-1 rounded ${
                    nodeData.status === 'trigger' ? 'bg-blue-100 text-blue-700' :
                    nodeData.status === 'active' || nodeData.status === 'complete' ? 'bg-green-100 text-green-700' :
                    nodeData.status === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {nodeData.status.toUpperCase()}
                  </span>
                </div>
              </div>
            )}

            {/* Actor */}
            {nodeData.actor && (
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
                <p className="text-xs font-semibold text-gray-700 mb-1">RESPONSIBLE:</p>
                <p className="text-sm text-gray-900">{nodeData.actor}</p>
              </div>
            )}

            {/* Operational Details */}
            {nodeData.operationalDetails && (
              <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-4 h-4 text-blue-600" />
                  <h4 className="text-blue-900 font-semibold text-sm">Operational Details</h4>
                </div>

                {nodeData.operationalDetails.requiredData && nodeData.operationalDetails.requiredData.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-blue-900 mb-1">Required Data:</p>
                    <ul className="space-y-1">
                      {nodeData.operationalDetails.requiredData.map((item, i) => (
                        <li key={i} className="text-xs text-blue-800 flex items-start gap-1">
                          <span>•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {nodeData.operationalDetails.specificActions && nodeData.operationalDetails.specificActions.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-blue-900 mb-1">Actions:</p>
                    <ul className="space-y-1">
                      {nodeData.operationalDetails.specificActions.map((item, i) => (
                        <li key={i} className="text-xs text-blue-800 flex items-start gap-1">
                          <span>•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Gap Warning */}
            {nodeData.gap && (
              <div className="bg-red-50 rounded-lg border-l-4 border-red-500 p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-red-900 text-sm mb-1">Identified Gap</h4>
                    <p className="text-red-800 text-sm">
                      {nodeData.gap}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Process Context */}
            <div className="pt-4 border-t border-gray-200">
              <h4 className="text-gray-900 font-semibold text-sm mb-3">Process Context</h4>
              
              {/* Critical Gaps */}
              {criticalGaps.length > 0 && (
                <div className="bg-red-50 rounded-lg border border-red-200 p-3 mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <h5 className="text-red-900 font-semibold text-xs">
                      Critical Gaps ({criticalGaps.length})
                    </h5>
                  </div>
                  <div className="space-y-1">
                    {criticalGaps.slice(0, 2).map((node, i) => (
                      <div key={i} className="text-xs text-red-800">
                        {node.title}: {node.gap || 'Issue detected'}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Works Well */}
              {worksWell.length > 0 && (
                <div className="bg-green-50 rounded-lg border border-green-200 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <h5 className="text-green-900 font-semibold text-xs">
                      Works Well ({worksWell.length})
                    </h5>
                  </div>
                  <div className="space-y-1">
                    {worksWell.map((node, i) => (
                      <div key={i} className="text-xs text-green-800">
                        • {node.title}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IntegratedSidebar;
