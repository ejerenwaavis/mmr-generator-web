import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FileText, Files, PenTool, Upload, Download, CheckCircle2 } from 'lucide-react';
import SingleForm from './components/SingleForm';
import BatchUpload from './components/BatchUpload';
import SignatureManager from './components/SignatureManager';

function App() {
  const [activeTab, setActiveTab] = useState('single');
  const [signatures, setSignatures] = useState([]);
  const [selectedSignature, setSelectedSignature] = useState('');
  const [applySignature, setApplySignature] = useState(true);
  const [companyName, setCompanyName] = useState(() => localStorage.getItem('companyName') || 'Demo Service Provider Inc.');
  const [domicile, setDomicile] = useState(() => localStorage.getItem('domicile') || '');

  useEffect(() => {
    localStorage.setItem('companyName', companyName);
    localStorage.setItem('domicile', domicile);
  }, [companyName, domicile]);

  const fetchSignatures = async () => {
    try {
      const res = await axios.get('/api/signatures');
      setSignatures(res.data);
      if (res.data.length > 0 && !selectedSignature) {
        setSelectedSignature(res.data[0]);
      }
    } catch (err) {
      console.error('Failed to fetch signatures', err);
    }
  };

  useEffect(() => {
    fetchSignatures();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-100 rounded-2xl mb-2">
            <FileText className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">FedEx MMR Generator</h1>
          <p className="text-slate-500 max-w-2xl mx-auto">Generate U.S. Monthly Maintenance Records seamlessly with automated mileage interpolation and digital signatures.</p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Config & Signatures */}
          <div className="lg:col-span-1 space-y-6">
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium leading-6 text-slate-900">Service Provider Company Name</label>
                  <input 
                    type="text" 
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="input-field mt-1" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium leading-6 text-slate-900">Domicile Station/Hub</label>
                  <input 
                    type="text" 
                    value={domicile}
                    onChange={(e) => setDomicile(e.target.value)}
                    className="input-field mt-1" 
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={applySignature}
                    onChange={(e) => setApplySignature(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 w-4 h-4" 
                  />
                  Apply Signature to PDF
                </label>
              </div>
            </div>

            <SignatureManager 
              signatures={signatures} 
              selectedSignature={selectedSignature}
              setSelectedSignature={setSelectedSignature}
              onSignatureAdded={fetchSignatures}
              disabled={!applySignature}
            />
          </div>

          {/* Right Column: Generation Tools */}
          <div className="lg:col-span-2">
            <div className="card h-full">
              {/* Tabs */}
              <div className="border-b border-slate-200">
                <nav className="-mb-px flex" aria-label="Tabs">
                  <button
                    onClick={() => setActiveTab('single')}
                    className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'single'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="w-4 h-4" />
                      Single Record
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('batch')}
                    className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'batch'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Files className="w-4 h-4" />
                      Batch Upload (CSV)
                    </div>
                  </button>
                </nav>
              </div>

              {/* Tab Panels */}
              <div className="p-6">
                {activeTab === 'single' ? (
                  <SingleForm selectedSignature={selectedSignature} applySignature={applySignature} companyName={companyName} domicile={domicile} />
                ) : (
                  <BatchUpload selectedSignature={selectedSignature} applySignature={applySignature} companyName={companyName} domicile={domicile} />
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;
