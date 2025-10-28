import React, { useState } from 'react';
import { Download, FileText, Image as ImageIcon, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const ExportModal = ({ process, onClose }) => {
  const [exporting, setExporting] = useState(false);

  const exportAsHTML = () => {
    const html = generateHTML(process);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${process.name}.html`;
    a.click();
    toast.success('Exported as HTML');
  };

  const exportAsPDF = async () => {
    setExporting(true);
    try {
      const canvas = document.querySelector('[data-testid="flowchart-canvas"]');
      const imgData = await html2canvas(canvas, {
        scale: 2,
        useCORS: true,
        logging: false,
        scrollY: -window.scrollY,
        scrollX: -window.scrollX
      });
      
      const imgWidth = 190;
      const pageHeight = 277;
      const imgHeight = (imgData.height * imgWidth) / imgData.width;
      let heightLeft = imgHeight;
      let position = 10;

      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.addImage(imgData.toDataURL('image/png'), 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData.toDataURL('image/png'), 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${process.name}.pdf`);
      toast.success('Exported as PDF');
    } catch (error) {
      toast.error('Failed to export PDF');
      console.error(error);
    } finally {
      setExporting(false);
    }
  };

  const exportAsJSON = () => {
    const json = JSON.stringify(process, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${process.name}.json`;
    a.click();
    toast.success('Exported as JSON');
  };

  const generateHTML = (process) => {
    const nodesHTML = process.nodes.map((node, idx) => {
      const statusClass = node.status === 'critical-gap' ? 'gradient-rose text-white shadow-lg' : 
                         node.status === 'trigger' ? 'gradient-blue text-white shadow-lg' :
                         node.status === 'warning' ? 'bg-white border-2 border-amber-500' :
                         'bg-white border-2 border-emerald-500';
      
      return `
        <div class="mb-6">
          <div class="rounded-xl p-6 ${statusClass} cursor-pointer hover:scale-105 transition-all" onclick="toggleDetail(${idx})">
            <h3 class="text-lg font-bold mb-2">${node.title}</h3>
            <p class="text-sm opacity-90">${node.description}</p>
            ${node.actors && node.actors.length > 0 ? `
              <div class="mt-3 flex flex-wrap gap-1">
                ${node.actors.map(actor => `<span class="px-2 py-1 bg-white bg-opacity-20 rounded text-xs">${actor}</span>`).join('')}
              </div>
            ` : ''}
            ${node.gap ? `<div class="mt-3 text-sm font-semibold">Gap: ${node.gap}</div>` : ''}
          </div>
          
          <!-- Detail Panel -->
          <div id="detail-${idx}" class="hidden mt-4 bg-white rounded-xl p-6 border-2 border-slate-200 slide-in">
            ${node.subSteps && node.subSteps.length > 0 ? `
              <div class="mb-4">
                <h4 class="font-semibold text-slate-800 mb-2">Process Steps:</h4>
                <ul class="space-y-1">
                  ${node.subSteps.map(step => `<li class="text-sm text-slate-600">→ ${step}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
            ${node.currentState ? `
              <div class="mb-4">
                <h4 class="font-semibold text-slate-800 mb-2">Current State:</h4>
                <p class="text-sm text-slate-600">${node.currentState}</p>
              </div>
            ` : ''}
            ${node.idealState ? `
              <div class="mb-4">
                <h4 class="font-semibold text-emerald-800 mb-2">Ideal State:</h4>
                <p class="text-sm text-emerald-600">${node.idealState}</p>
              </div>
            ` : ''}
            ${node.failures && node.failures.length > 0 ? `
              <div>
                <h4 class="font-semibold text-rose-800 mb-2">Potential Failures:</h4>
                <ul class="space-y-1">
                  ${node.failures.map(f => `<li class="text-sm text-rose-600">⚠ ${f}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
          </div>
          
          ${idx < process.nodes.length - 1 ? '<div class="flex justify-center my-2"><div class="w-0.5 h-12 bg-slate-300"></div></div>' : ''}
        </div>
      `;
    }).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${process.name} - FlowForge</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
      background: linear-gradient(to bottom right, #f8fafc, #f1f5f9);
    }
    .gradient-blue { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); }
    .gradient-rose { background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%); }
    .gradient-emerald { background: linear-gradient(135deg, #34d399 0%, #10b981 100%); }
    
    @keyframes slideIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .slide-in { animation: slideIn 0.3s ease-out; }
    
    .hover\\:scale-105:hover { transform: scale(1.05); }
  </style>
</head>
<body class="p-8">
  <div class="max-w-4xl mx-auto">
    <!-- Header -->
    <div class="mb-8">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-12 h-12 rounded-lg gradient-blue flex items-center justify-center">
          <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
        </div>
        <div>
          <h1 class="text-3xl font-bold text-slate-800">${process.name}</h1>
          <p class="text-slate-600">Created with FlowForge AI</p>
        </div>
      </div>
      ${process.description ? `<p class="text-slate-700 mb-4">${process.description}</p>` : ''}
      <div class="flex gap-3 text-sm text-slate-600">
        <span>📋 ${process.nodes.length} steps</span>
        ${process.actors.length > 0 ? `<span>• 👥 ${process.actors.length} actors</span>` : ''}
        ${process.criticalGaps.length > 0 ? `<span>• ⚠️ ${process.criticalGaps.length} gaps</span>` : ''}
      </div>
    </div>

    <!-- Process Nodes -->
    <div class="space-y-4">
      ${nodesHTML}
    </div>

    <!-- Summary Section -->
    ${process.criticalGaps.length > 0 ? `
      <div class="mt-8 bg-rose-50 border-2 border-rose-200 rounded-xl p-6">
        <h3 class="text-lg font-bold text-rose-900 mb-4 flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          Critical Gaps Identified
        </h3>
        <ul class="space-y-2">
          ${process.criticalGaps.map(gap => `<li class="text-sm text-rose-800">⚠️ ${gap}</li>`).join('')}
        </ul>
      </div>
    ` : ''}

    <!-- Footer -->
    <div class="mt-12 text-center text-sm text-slate-500 border-t border-slate-200 pt-6">
      <p>Generated by <strong>FlowForge AI</strong> • Transform your processes into flowcharts in minutes</p>
    </div>
  </div>

  <script>
    function toggleDetail(idx) {
      const detail = document.getElementById('detail-' + idx);
      if (detail.classList.contains('hidden')) {
        detail.classList.remove('hidden');
      } else {
        detail.classList.add('hidden');
      }
    }
  </script>
</body>
</html>`;
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent data-testid="export-modal">
        <DialogHeader>
          <DialogTitle>Export Process</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          <Button onClick={exportAsHTML} className="w-full justify-start" variant="outline" data-testid="export-html">
            <Code className="w-5 h-5 mr-3" />
            <div className="text-left flex-1">
              <div className="font-semibold">Interactive HTML</div>
              <div className="text-xs text-slate-600">Standalone file with full interactivity</div>
            </div>
          </Button>

          <Button onClick={exportAsPDF} disabled={exporting} className="w-full justify-start" variant="outline" data-testid="export-pdf">
            <FileText className="w-5 h-5 mr-3" />
            <div className="text-left flex-1">
              <div className="font-semibold">PDF Document</div>
              <div className="text-xs text-slate-600">Print-friendly format</div>
            </div>
          </Button>

          <Button onClick={exportAsJSON} className="w-full justify-start" variant="outline" data-testid="export-json">
            <Download className="w-5 h-5 mr-3" />
            <div className="text-left flex-1">
              <div className="font-semibold">JSON Data</div>
              <div className="text-xs text-slate-600">Editable process data</div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExportModal;
