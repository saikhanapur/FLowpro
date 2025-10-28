import React, { useState } from 'react';
import { Upload, File, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { api } from '@/utils/api';
import { toast } from 'sonner';

const DocumentUploader = ({ onComplete, onCancel }) => {
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState('');

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(prev => [...prev, ...droppedFiles]);
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processFiles = async () => {
    setProcessing(true);
    let allText = '';

    try {
      for (const file of files) {
        const data = await api.uploadDocument(file);
        allText += data.text + '\n\n';
      }

      setExtractedText(allText);
      toast.success('Text extracted successfully!');
    } catch (error) {
      toast.error('Failed to extract text from documents');
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card className="max-w-4xl mx-auto p-8" data-testid="document-uploader">
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Upload Documents</h2>
      <p className="text-slate-600 mb-8">Upload existing process documentation, emails, or screenshots. We'll extract and structure the information.</p>

      {files.length === 0 && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-slate-300 rounded-lg p-12 text-center hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer"
          onClick={() => document.getElementById('fileInput').click()}
          data-testid="drop-zone"
        >
          <Upload className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-800 mb-2">Drop files here or click to browse</h3>
          <p className="text-sm text-slate-600">Supports PDF, Word, Excel, images (JPG, PNG), and text files</p>
          <input id="fileInput" type="file" multiple accept=".pdf,.doc,.docx,.txt,.jpg,.png,.xlsx,.xls" onChange={handleFileSelect} className="hidden" />
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-3 mb-6">
          {files.map((file, index) => (
            <div key={index} className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <File className="w-8 h-8 text-blue-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-800 truncate">{file.name}</div>
                <div className="text-sm text-slate-600">{(file.size / 1024).toFixed(1)} KB</div>
              </div>
              {!processing && (
                <button onClick={() => removeFile(index)} className="p-2 hover:bg-slate-200 rounded transition-colors" data-testid={`remove-file-${index}`}>
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              )}
            </div>
          ))}
          {!processing && (
            <button onClick={() => document.getElementById('fileInput').click()} className="w-full py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-blue-500 hover:text-blue-600 transition-all font-medium" data-testid="add-more-files">+ Add More Files</button>
          )}
        </div>
      )}

      {extractedText && (
        <div className="mb-6">
          <label className="block text-sm font-semibold text-slate-700 mb-3">Extracted Text Preview</label>
          <div className="bg-slate-50 rounded-lg p-4 max-h-[300px] overflow-y-auto">
            <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans">{extractedText}</pre>
          </div>
        </div>
      )}

      {processing && (
        <div className="text-center py-8">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Extracting text from your documents...</p>
        </div>
      )}

      <div className="flex gap-4">
        {!extractedText ? (
          <Button onClick={processFiles} disabled={files.length === 0 || processing} className="flex-1 gradient-blue text-white" data-testid="process-documents-btn">
            Process Documents →
          </Button>
        ) : (
          <Button onClick={() => onComplete(extractedText)} className="flex-1 gradient-blue text-white" data-testid="generate-flowchart-from-docs">
            Generate Flowchart →
          </Button>
        )}
        <Button onClick={onCancel} disabled={processing} variant="outline">Cancel</Button>
      </div>

      <div className="mt-6 bg-slate-50 rounded-lg p-4">
        <h3 className="font-semibold text-slate-700 mb-2 text-sm">Supported Formats:</h3>
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
          <div>• PDF documents</div>
          <div>• Word documents (.doc, .docx)</div>
          <div>• Excel spreadsheets (.xlsx, .xls)</div>
          <div>• Images (.jpg, .png) with OCR</div>
          <div>• Plain text files (.txt)</div>
          <div>• Email exports (.eml, .msg)</div>
        </div>
      </div>
    </Card>
  );
};

export default DocumentUploader;