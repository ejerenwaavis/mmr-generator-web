import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { UploadCloud, FileText, Download, X } from 'lucide-react';

export default function BatchUpload({ selectedSignature, applySignature, companyName, domicile }) {
  const [file, setFile] = useState(null);
  const [generating, setGenerating] = useState(false);

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles?.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/json': ['.json']
    },
    maxFiles: 1
  });

  const handleUpload = async () => {
    if (!file) return;
    if (applySignature && !selectedSignature) {
      alert("Please select a signature first, or uncheck 'Apply Signature'.");
      return;
    }

    setGenerating(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('signatureFilename', selectedSignature);
    formData.append('applySignature', applySignature);
    formData.append('companyName', companyName);
    formData.append('domicile', domicile);

    try {
      const response = await axios.post('/api/generate-batch', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'blob'
      });

      // Download the zip file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `MMR_Batch.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setFile(null); // Reset after success
    } catch (error) {
      console.error(error);
      alert('Batch generation failed. Please check the CSV format.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
        <h4 className="text-sm font-bold text-blue-900">CSV Format Requirements:</h4>
        <p className="text-xs text-blue-700 mt-1 font-mono">
          unit,recordMonth,mileage,mileageSource,maintenancePerformed,outOfService,maintenanceEntries<br/>
          MGBA-355,2026-06,87342,actual,true,false,"06/14/2026:Replaced brake pads|06/20/2026:Oil change"
        </p>
      </div>

      {!file ? (
        <div 
          {...getRootProps()} 
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
          }`}
        >
          <input {...getInputProps()} />
          <UploadCloud className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-sm font-medium text-slate-900">
            {isDragActive ? "Drop the file here" : "Drag & drop a CSV or JSON file here"}
          </p>
          <p className="text-xs text-slate-500 mt-1">or click to select a file</p>
        </div>
      ) : (
        <div className="border rounded-xl p-6 flex items-center justify-between bg-white shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 rounded-lg">
              <FileText className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">{file.name}</p>
              <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          </div>
          <button 
            onClick={() => setFile(null)}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="pt-4 flex justify-end">
        <button 
          onClick={handleUpload}
          disabled={!file || generating} 
          className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? 'Processing Batch...' : (
            <>
              <Download className="w-4 h-4" />
              Generate Batch ZIP
            </>
          )}
        </button>
      </div>
    </div>
  );
}
