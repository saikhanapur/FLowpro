import React from 'react';
import { AlertTriangle, XCircle, CheckCircle } from 'lucide-react';

const GapsSummaryPanel = ({ process, intelligence }) => {
  if (!process?.nodes) return null;

  // Analyze gaps from process nodes
  const criticalGaps = process.nodes.filter(n => 
    n.status === 'warning' || 
    n.gap || 
    n.hasGap ||
    n.title?.toLowerCase().includes('critical')
  );

  const processGaps = intelligence?.issues?.filter(i => 
    i.severity === 'medium' || i.issue_type === 'serial_bottleneck'
  ) || [];

  const worksWell = process.nodes.filter(n => 
    n.status === 'complete' || 
    n.status === 'active'
  ).slice(0, 3);

  return (
    <div className="fixed bottom-6 left-6 right-6 z-40">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-2xl border border-gray-200 p-6">
          <div className="grid grid-cols-3 gap-6">
            
            {/* Critical Gaps - Pink */}
            <div className="bg-red-50 rounded-lg border border-red-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-red-900 font-bold text-base">
                  Critical Gaps ({criticalGaps.length})
                </h3>
              </div>
              
              <div className="space-y-3">
                {criticalGaps.slice(0, 2).map((node, i) => (
                  <div key={i} className="bg-red-100 rounded-lg p-3">
                    <p className="text-red-900 font-semibold text-sm mb-1">
                      {node.title}:
                    </p>
                    <p className="text-red-800 text-xs">
                      {node.gap || 'Missing error handling or backup procedure'}
                    </p>
                  </div>
                ))}
                {criticalGaps.length === 0 && (
                  <p className="text-red-700 text-sm italic">No critical gaps identified</p>
                )}
              </div>
            </div>

            {/* Process Gaps - Yellow */}
            <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                </div>
                <h3 className="text-yellow-900 font-bold text-base">
                  Process Gaps ({processGaps.length})
                </h3>
              </div>
              
              <div className="space-y-2">
                {processGaps.slice(0, 4).map((gap, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-yellow-900">
                    <span className="text-yellow-600">•</span>
                    <span>{gap.description || gap.title}</span>
                  </div>
                ))}
                {processGaps.length === 0 && (
                  <p className="text-yellow-700 text-sm italic">No process gaps identified</p>
                )}
              </div>
            </div>

            {/* Works Well - Green */}
            <div className="bg-green-50 rounded-lg border border-green-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="text-green-900 font-bold text-base">
                  Works Well ({worksWell.length})
                </h3>
              </div>
              
              <div className="space-y-2">
                {worksWell.map((node, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-green-900">
                    <span className="text-green-600">•</span>
                    <span>{node.title}</span>
                  </div>
                ))}
                {worksWell.length === 0 && (
                  <p className="text-green-700 text-sm italic">Analysis in progress</p>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default GapsSummaryPanel;
