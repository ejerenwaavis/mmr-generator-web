import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Upload, PenTool, CheckCircle2 } from 'lucide-react';

export default function SignatureManager({ signatures, selectedSignature, setSelectedSignature, onSignatureAdded, disabled }) {
  const [uploading, setUploading] = useState(false);
  const [operatorName, setOperatorName] = useState('');
  const fileInputRef = useRef(null);

  const handleUpload = async (e) => {
    e.preventDefault();
    const file = fileInputRef.current?.files[0];
    if (!file || !operatorName) {
      alert("Please provide both a name and a signature image.");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('signature', file);
    formData.append('name', operatorName);

    try {
      const res = await axios.post('/api/signatures', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setOperatorName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      onSignatureAdded();
      setSelectedSignature(res.data.filename);
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`space-y-6 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* Signature Selector */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <PenTool className="w-5 h-5 text-indigo-500" />
          Active Signature
        </h2>
        {signatures.length === 0 ? (
          <p className="text-sm text-slate-500 italic">No signatures available. Add one below.</p>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {signatures.map(sig => (
              <label 
                key={sig} 
                className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
                  selectedSignature === sig ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input 
                  type="radio" 
                  name="signature" 
                  className="sr-only" 
                  checked={selectedSignature === sig}
                  onChange={() => setSelectedSignature(sig)}
                />
                <div className="flex-1 text-sm font-medium text-slate-700">
                  {sig.replace(/\.[^/.]+$/, "")}
                </div>
                {selectedSignature === sig && <CheckCircle2 className="w-5 h-5 text-indigo-600" />}
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Add New Signature */}
      <div className="card p-6 bg-slate-50 border-dashed">
        <h3 className="text-md font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Upload className="w-4 h-4 text-slate-500" />
          Add New Signature
        </h3>
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium leading-6 text-slate-900">Operator Name</label>
            <input 
              type="text" 
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              className="input-field mt-1" 
              placeholder="e.g. John Doe"
            />
          </div>
          <div>
            <label className="block text-sm font-medium leading-6 text-slate-900">Signature Image (PNG)</label>
            <input 
              type="file" 
              ref={fileInputRef}
              accept=".png,.jpg,.jpeg"
              className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-all"
            />
          </div>
          <button 
            type="submit" 
            disabled={uploading}
            className="btn-secondary w-full flex justify-center items-center"
          >
            {uploading ? 'Uploading...' : 'Save Signature'}
          </button>
        </form>
      </div>
    </div>
  );
}
