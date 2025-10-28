import React from 'react';
import { X, Target, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

const IdealStateModal = ({ data, onClose }) => {
  if (!data) return null;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" data-testid="ideal-state-modal">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Target className="w-6 h-6 text-blue-600" />
            Ideal State Vision
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Vision */}
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 mb-2">Vision</h3>
            <p className="text-blue-800">{data.vision}</p>
          </div>

          {/* Categories */}
          {data.categories && data.categories.map((category, idx) => (
            <div key={idx} className="border border-slate-200 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{category.icon}</span>
                <h3 className="font-bold text-slate-800 text-lg">{category.title}</h3>
                <Badge variant={category.priority === 'critical' ? 'destructive' : 'secondary'}>
                  {category.priority}
                </Badge>
              </div>

              <ul className="space-y-2">
                {category.improvements.map((improvement, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="text-emerald-600 font-bold">•</span>
                    {improvement}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Expected Outcomes */}
          <div className="grid md:grid-cols-2 gap-4">
            {data.expectedOutcomes && (
              <>
                <div className="bg-emerald-50 rounded-lg p-4">
                  <h4 className="font-semibold text-emerald-900 mb-2">Operational Benefits</h4>
                  <ul className="space-y-1 text-sm text-emerald-800">
                    {data.expectedOutcomes.operational?.map((benefit, idx) => (
                      <li key={idx}>▸ {benefit}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">Business Benefits</h4>
                  <ul className="space-y-1 text-sm text-blue-800">
                    {data.expectedOutcomes.business?.map((benefit, idx) => (
                      <li key={idx}>▸ {benefit}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>

          {/* Estimated Impact */}
          {data.estimatedImpact && (
            <div className="bg-gradient-to-r from-blue-50 to-emerald-50 rounded-lg p-6">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Estimated Impact
              </h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                {data.estimatedImpact.timeSaved && (
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{data.estimatedImpact.timeSaved}</div>
                    <div className="text-sm text-slate-600">Time Saved</div>
                  </div>
                )}
                {data.estimatedImpact.costSaved && (
                  <div>
                    <div className="text-2xl font-bold text-emerald-600">{data.estimatedImpact.costSaved}</div>
                    <div className="text-sm text-slate-600">Cost Saved</div>
                  </div>
                )}
                {data.estimatedImpact.efficiencyGain && (
                  <div>
                    <div className="text-2xl font-bold text-amber-600">{data.estimatedImpact.efficiencyGain}</div>
                    <div className="text-sm text-slate-600">Efficiency Gain</div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button onClick={onClose} className="flex-1">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IdealStateModal;
