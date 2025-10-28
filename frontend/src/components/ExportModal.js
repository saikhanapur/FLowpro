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
      const imgData = await html2canvas(canvas);
      const pdf = new jsPDF();
      pdf.addImage(imgData.toDataURL('image/png'), 'PNG', 10, 10, 190, 0);
      pdf.save(`${process.name}.pdf`);
      toast.success('Exported as PDF');
    } catch (error) {
      toast.error('Failed to export PDF');
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
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${process.name} - FlowForge</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; }
    .gradient-blue { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); }
    .gradient-rose { background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%); }
  </style>
</head>
<body class="bg-slate-50 p-8">
  <div class="max-w-4xl mx-auto">
    <h1 class="text-4xl font-bold text-slate-800 mb-8">${process.name}</h1>
    <div class="space-y-6">
      ${process.nodes.map(node => `
        <div class="rounded-xl p-6 ${node.status === 'critical-gap' ? 'gradient-rose text-white' : 'bg-white border-2 border-slate-200'}">
          <h3 class="text-lg font-bold mb-2">${node.title}</h3>
          <p class="text-sm opacity-90">${node.description}</p>
          ${node.actors && node.actors.length > 0 ? `
            <div class="mt-3 flex flex-wrap gap-1">
              ${node.actors.map(actor => `<span class="px-2 py-1 bg-white/20 rounded text-xs">${actor}</span>`).join('')}
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
  </div>
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
