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
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 12;
      const contentWidth = pageWidth - (2 * margin);
      
      let currentY = margin;
      let pageNumber = 1;
      
      // Add Title Header on first page
      pdf.setFontSize(22);
      pdf.setTextColor(30, 41, 59); // slate-800
      pdf.setFont(undefined, 'bold');
      pdf.text(process.name, margin, currentY);
      currentY += 8;
      
      // Add metadata
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      pdf.setTextColor(100, 116, 139); // slate-500
      pdf.text(`Version ${process.version} • ${process.nodes?.length || 0} steps • Generated ${new Date().toLocaleDateString()}`, margin, currentY);
      currentY += 10;
      
      // Add divider line
      pdf.setDrawColor(203, 213, 225); // slate-300
      pdf.setLineWidth(0.5);
      pdf.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 8;
      
      // Get all FlowNode elements directly (not the containers)
      const flowNodeElements = document.querySelectorAll('[data-testid^="flow-node-"]');
      
      for (let i = 0; i < flowNodeElements.length; i++) {
        const nodeElement = flowNodeElements[i];
        
        // Store original styles
        const originalOverflow = nodeElement.style.overflow;
        const originalHeight = nodeElement.style.height;
        const originalMinHeight = nodeElement.style.minHeight;
        
        // Force node to render its full height with proper spacing
        nodeElement.style.overflow = 'visible';
        nodeElement.style.height = 'auto';
        nodeElement.style.minHeight = 'auto';
        
        // Wait for layout to settle
        await new Promise(resolve => setTimeout(resolve, 150));
        
        // Capture the node with enhanced quality settings
        const canvas = await html2canvas(nodeElement, {
          scale: 3,
          useCORS: true,
          logging: false,
          backgroundColor: '#f8fafc',
          scrollY: -window.scrollY,
          scrollX: -window.scrollX,
          windowWidth: nodeElement.scrollWidth,
          windowHeight: nodeElement.scrollHeight,
          width: nodeElement.scrollWidth,
          height: nodeElement.scrollHeight,
          onclone: (clonedDoc) => {
            // Enhance text rendering in the cloned document
            const clonedNode = clonedDoc.querySelector('[data-testid^="flow-node-"]');
            if (clonedNode) {
              clonedNode.style.fontSmoothing = 'antialiased';
              clonedNode.style.webkitFontSmoothing = 'antialiased';
            }
          }
        });
        
        // Restore original styles
        nodeElement.style.overflow = originalOverflow;
        nodeElement.style.height = originalHeight;
        nodeElement.style.minHeight = originalMinHeight;
        
        const imgData = canvas.toDataURL('image/png', 1.0);
        const imgWidth = contentWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // Check if we need a new page (leave space at bottom for page numbers and header on new page)
        if (currentY + imgHeight > pageHeight - 20) {
          // Add page number before moving to next page
          pdf.setFontSize(9);
          pdf.setTextColor(148, 163, 184);
          pdf.text(`Page ${pageNumber}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
          
          pdf.addPage();
          pageNumber++;
          currentY = margin;
          
          // Add process name header on new page
          pdf.setFontSize(11);
          pdf.setTextColor(100, 116, 139);
          pdf.setFont(undefined, 'bold');
          pdf.text(process.name, margin, currentY);
          currentY += 8;
          
          // Add divider
          pdf.setDrawColor(203, 213, 225);
          pdf.setLineWidth(0.3);
          pdf.line(margin, currentY, pageWidth - margin, currentY);
          currentY += 6;
        }
        
        // Add the image with higher quality
        pdf.addImage(imgData, 'PNG', margin, currentY, imgWidth, imgHeight, undefined, 'FAST');
        currentY += imgHeight + 3; // Reduced spacing between nodes
      }
      
      // Add page number on last page
      pdf.setFontSize(9);
      pdf.setTextColor(148, 163, 184);
      pdf.text(`Page ${pageNumber}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
      
      pdf.save(`${process.name}.pdf`);
      toast.success(`PDF exported successfully with ${pageNumber} page(s)!`);
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
      const statusClass = node.status === 'critical-gap' ? 'bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-lg' : 
                         node.status === 'trigger' ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg' :
                         node.status === 'warning' ? 'bg-white border border-amber-300/60 shadow-md hover:shadow-lg' :
                         'bg-white border border-emerald-300/60 shadow-md hover:shadow-lg';
      
      const iconHTML = node.status === 'trigger' ? '⚡' :
                       node.status === 'current' ? '✓' :
                       node.status === 'warning' ? '⚠' :
                       node.status === 'critical-gap' ? '🚨' : '•';
      
      return `
        <div class="node-container mb-2 mx-auto" style="max-width: 900px;">
          <div class="rounded-2xl p-4 ${statusClass} cursor-pointer hover:scale-[1.01] transition-all duration-300" onclick="showDetail(${idx})" data-node-id="${idx}" style="min-width: 320px;">
            <div class="flex items-start gap-3">
              <span class="text-xl flex-shrink-0 mt-0.5">${iconHTML}</span>
              <div class="flex-1">
                <h3 class="text-base font-semibold mb-1.5 leading-tight tracking-tight">${node.title}</h3>
                <p class="text-sm opacity-80 leading-relaxed mb-1.5 font-normal">${node.description}</p>
                ${node.actors && node.actors.length > 0 ? `
                  <div class="mt-2.5 flex flex-wrap gap-1.5">
                    ${node.actors.map(actor => `
                      <span class="px-2.5 py-1 rounded-full text-xs font-medium ${
                        node.status === 'trigger' || node.status === 'critical-gap' ? 'bg-white/25 backdrop-blur-sm' : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }">${actor}</span>
                    `).join('')}
                  </div>
                ` : ''}
                ${node.gap ? `
                  <div class="mt-2.5 p-2.5 rounded-xl flex items-start gap-2 text-xs font-medium border ${
                    node.status === 'trigger' || node.status === 'critical-gap' ? 'bg-white/20 backdrop-blur-sm border-white/40' : 'bg-amber-50 border-amber-300/50'
                  }">
                    <span class="flex-shrink-0 mt-0.5">⚠️</span>
                    <span class="leading-relaxed">${node.gap}</span>
                  </div>
                ` : ''}
              </div>
            </div>
          </div>
          ${idx < process.nodes.length - 1 ? `
            <div class="flex justify-center py-1.5">
              <svg width="20" height="24" viewBox="0 0 20 24" class="text-slate-400">
                <line x1="10" y1="0" x2="10" y2="16" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                <polygon points="10,24 4,16 16,16" fill="currentColor" />
              </svg>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    const nodeDetailsData = process.nodes.map((node, idx) => ({
      id: idx,
      title: node.title,
      description: node.description,
      actors: node.actors || [],
      subSteps: node.subSteps || [],
      currentState: node.currentState,
      idealState: node.idealState,
      gap: node.gap,
      impact: node.impact,
      failures: node.failures || []
    }));

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${process.name} - SuperHumanly</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
      margin: 0;
      padding: 0;
    }
    .gradient-blue { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); }
    .gradient-rose { background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%); }
    .gradient-emerald { background: linear-gradient(135deg, #34d399 0%, #10b981 100%); }
    
    #detailPanel {
      position: fixed;
      right: 0;
      top: 0;
      height: 100vh;
      width: 400px;
      background: white;
      box-shadow: -4px 0 20px rgba(0,0,0,0.1);
      transform: translateX(100%);
      transition: transform 0.3s ease-out;
      z-index: 50;
      overflow-y: auto;
    }
    
    #detailPanel.open {
      transform: translateX(0);
    }
    
    .node-container div[onclick]:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    
    @media (max-width: 768px) {
      #detailPanel {
        width: 100%;
      }
    }
    
    /* Print Styles - Critical for PDF Export */
    @media print {
      body {
        background: white !important;
      }
      
      #detailPanel {
        display: none !important;
      }
      
      /* Ensure sections don't break across pages */
      .bg-rose-50, .bg-blue-50 {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      
      /* Force page breaks before major sections if needed */
      .node-container {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      
      /* Ensure all content is visible */
      * {
        overflow: visible !important;
      }
      
      /* Remove shadows and transitions for print */
      * {
        box-shadow: none !important;
        transition: none !important;
      }
    }
  </style>
</head>
<body class="bg-slate-50">
  <div class="flex">
    <!-- Main Content -->
    <div id="mainContent" class="flex-1 p-8 transition-all duration-300">
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
            <p class="text-slate-600">Generated with SuperHumanly</p>
          </div>
        </div>
        ${process.description ? `<p class="text-slate-700 mb-4">${process.description}</p>` : ''}
        
        <!-- Legend -->
        <div class="bg-white rounded-2xl p-5 border border-slate-300/50 shadow-md flex flex-wrap gap-5 text-sm">
          <div class="flex items-center gap-2.5">
            <div class="w-5 h-5 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm"></div>
            <span class="text-slate-700 font-medium">Trigger</span>
          </div>
          <div class="flex items-center gap-2.5">
            <div class="w-5 h-5 rounded-lg bg-white border border-emerald-300/60 shadow-sm"></div>
            <span class="text-slate-700 font-medium">Active</span>
          </div>
          <div class="flex items-center gap-2.5">
            <div class="w-5 h-5 rounded-lg bg-white border border-amber-300/60 shadow-sm"></div>
            <span class="text-slate-700 font-medium">Warning</span>
          </div>
          <div class="flex items-center gap-2.5">
            <div class="w-5 h-5 rounded-lg bg-gradient-to-br from-rose-500 to-rose-600 shadow-sm"></div>
            <span class="text-slate-700 font-medium">Critical Gap</span>
          </div>
        </div>
      </div>

      <!-- Process Nodes -->
      <div class="max-w-4xl">
        ${nodesHTML}
      </div>

      <!-- Summary Sections -->
      ${process.criticalGaps && process.criticalGaps.length > 0 ? `
        <div class="mt-8 bg-rose-50 border-2 border-rose-200 rounded-xl p-6 max-w-4xl">
          <h3 class="text-lg font-bold text-rose-900 mb-4">Critical Gaps (${process.criticalGaps.length})</h3>
          <ul class="space-y-2">
            ${process.criticalGaps.map(gap => `<li class="text-sm text-rose-800"><strong>•</strong> ${gap}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      ${process.improvementOpportunities && process.improvementOpportunities.length > 0 ? `
        <div class="mt-4 bg-blue-50 border-2 border-blue-200 rounded-xl p-6 max-w-4xl">
          <h3 class="text-lg font-bold text-blue-900 mb-4">Improvement Opportunities</h3>
          <ul class="space-y-2">
            ${process.improvementOpportunities.map(opp => `<li class="text-sm text-blue-800">• ${opp.description}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    </div>

    <!-- Detail Panel (Slides from Right) -->
    <div id="detailPanel">
      <div class="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
        <h3 class="text-lg font-bold text-slate-800">Step Details</h3>
        <button onclick="closeDetail()" class="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      
      <div id="detailContent" class="p-6">
        <!-- Content loaded dynamically -->
      </div>
    </div>
  </div>

  <script>
    const nodeData = ${JSON.stringify(nodeDetailsData)};
    
    function showDetail(nodeId) {
      const node = nodeData[nodeId];
      const panel = document.getElementById('detailPanel');
      const content = document.getElementById('detailContent');
      const mainContent = document.getElementById('mainContent');
      
      let html = \`
        <div class="space-y-6">
          <div>
            <h3 class="text-xl font-bold text-slate-800 mb-2">\${node.title}</h3>
            <p class="text-sm text-slate-600 leading-relaxed">\${node.description}</p>
          </div>
      \`;
      
      if (node.actors && node.actors.length > 0) {
        html += \`
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Responsible</label>
            <div class="flex flex-wrap gap-2">
              \${node.actors.map(actor => \`<span class="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">\${actor}</span>\`).join('')}
            </div>
          </div>
        \`;
      }
      
      if (node.subSteps && node.subSteps.length > 0) {
        html += \`
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Process Steps</label>
            <ul class="space-y-2">
              \${node.subSteps.map(step => \`<li class="text-sm text-slate-700 flex items-start gap-2"><span class="text-blue-600 font-bold">→</span> \${step}</li>\`).join('')}
            </ul>
          </div>
        \`;
      }
      
      if (node.currentState) {
        html += \`
          <div class="bg-slate-50 rounded-lg p-4">
            <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Current State</label>
            <p class="text-sm text-slate-700 leading-relaxed">\${node.currentState}</p>
          </div>
        \`;
      }
      
      if (node.idealState) {
        html += \`
          <div class="bg-emerald-50 rounded-lg p-4">
            <label class="block text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">Ideal State</label>
            <p class="text-sm text-emerald-800 leading-relaxed">\${node.idealState}</p>
          </div>
        \`;
      }
      
      if (node.gap) {
        html += \`
          <div class="bg-rose-50 border-l-4 border-rose-500 rounded-lg p-4">
            <label class="block text-xs font-semibold text-rose-900 uppercase tracking-wide mb-2">Gap Identified</label>
            <p class="text-sm text-rose-800 leading-relaxed">\${node.gap}</p>
            \${node.impact ? \`<div class="mt-2"><span class="px-2 py-1 bg-rose-600 text-white rounded text-xs font-medium">Impact: \${node.impact}</span></div>\` : ''}
          </div>
        \`;
      }
      
      if (node.failures && node.failures.length > 0) {
        html += \`
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Potential Failures</label>
            <ul class="space-y-1">
              \${node.failures.map(f => \`<li class="text-sm text-rose-600">⚠ \${f}</li>\`).join('')}
            </ul>
          </div>
        \`;
      }
      
      html += '</div>';
      
      content.innerHTML = html;
      panel.classList.add('open');
      
      // Adjust main content margin on desktop
      if (window.innerWidth >= 768) {
        mainContent.style.marginRight = '400px';
      }
    }
    
    function closeDetail() {
      const panel = document.getElementById('detailPanel');
      const mainContent = document.getElementById('mainContent');
      panel.classList.remove('open');
      mainContent.style.marginRight = '0';
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
