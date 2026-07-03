import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { UploadCloud, FileText, Download, X, Code } from 'lucide-react';

function getMonthsBetween(start, end) {
  const startDate = new Date(start + '-02');
  const endDate = new Date(end + '-02');
  const months = [];
  let current = new Date(startDate);
  while (current <= endDate) {
    months.push(current.toISOString().slice(0, 7));
    current.setMonth(current.getMonth() + 1);
  }
  return months;
}

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

  const triggerDownload = (blobData, filename) => {
    const url = window.URL.createObjectURL(new Blob([blobData]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setFile(null);
    setGenerating(false);
  };

  const handleUpload = async () => {
    if (!file) return;
    if (applySignature && !selectedSignature) {
      alert("Please select a signature first, or uncheck 'Apply Signature'.");
      return;
    }

    setGenerating(true);

    try {
      if (file.name.toLowerCase().endsWith('.json')) {
        const fileReader = new FileReader();
        fileReader.onload = async (e) => {
          try {
            const rawData = JSON.parse(e.target.result);
            const masterRecords = [];

            if (!Array.isArray(rawData)) throw new Error("JSON must be an array of objects.");

            for (const unitData of rawData) {
              if (unitData.baselineMonth && unitData.baselineMileage !== undefined) {
                const months = getMonthsBetween(unitData.baselineMonth, unitData.recordMonth);
                const numMonths = months.length - 1;
                const mileageDiff = unitData.mileage - unitData.baselineMileage;
                const increment = numMonths > 0 ? mileageDiff / numMonths : 0;
                const backfillMaintenance = unitData.backfillMaintenance || {};

                months.forEach((m, idx) => {
                  const isCurrent = m === unitData.recordMonth;
                  const monthMaintenance = backfillMaintenance[m] || [];
                  const record = {
                    unit: unitData.unit,
                    recordMonth: m,
                    mileage: Math.round(unitData.baselineMileage + (increment * idx)),
                    mileageSource: isCurrent ? (unitData.mileageSource || 'actual') : 'interpolated',
                    maintenancePerformed: monthMaintenance.length > 0 || !!(isCurrent && unitData.maintenancePerformed),
                    outOfService: !!(isCurrent && unitData.outOfService),
                    maintenance: monthMaintenance
                  };
                  
                  if (isCurrent && unitData.maintenance && unitData.maintenance.length > 0) {
                    record.maintenance = [...record.maintenance, ...unitData.maintenance];
                    record.maintenancePerformed = true;
                  }
                  masterRecords.push(record);
                });
              } else {
                masterRecords.push({
                  unit: unitData.unit,
                  recordMonth: unitData.recordMonth,
                  mileage: unitData.mileage,
                  mileageSource: unitData.mileageSource || 'actual',
                  maintenancePerformed: !!(unitData.maintenancePerformed || (unitData.maintenance && unitData.maintenance.length > 0)),
                  outOfService: !!unitData.outOfService,
                  maintenance: unitData.maintenance || []
                });
              }
            }

            const payload = { records: masterRecords, signatureFilename: selectedSignature, applySignature, companyName, domicile };
            const response = await axios.post('/api/generate-multiple', payload, {
              responseType: 'blob'
            });

            triggerDownload(response.data, 'MMR_Batch.zip');
          } catch (err) {
            console.error(err);
            alert('Error parsing JSON or generating backfill: ' + err.message);
            setGenerating(false);
          }
        };
        fileReader.onerror = () => {
          alert('Failed to read file');
          setGenerating(false);
        };
        fileReader.readAsText(file);
      } else {
        // Fallback to traditional CSV handling via FormData
        const formData = new FormData();
        formData.append('file', file);
        formData.append('signatureFilename', selectedSignature);
        formData.append('applySignature', applySignature);
        formData.append('companyName', companyName);
        formData.append('domicile', domicile);

        const response = await axios.post('/api/generate-batch', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          responseType: 'blob'
        });

        triggerDownload(response.data, 'MMR_Batch.zip');
      }
    } catch (error) {
      console.error(error);
      alert('Batch generation failed. Please check the format.');
      setGenerating(false);
    }
  };

  const downloadExampleJson = () => {
    const example = [
      {
        "unit": "MGBA-355",
        "recordMonth": "2026-07",
        "mileage": 120000,
        "baselineMonth": "2025-12",
        "baselineMileage": 108000,
        "backfillMaintenance": {
          "2026-02": [
            { "date": "02/14/2026", "description": "Oil change" }
          ],
          "2026-07": [
            { "date": "07/10/2026", "description": "Brake pads replaced" }
          ]
        }
      },
      {
        "unit": "MGBA-999",
        "recordMonth": "2026-07",
        "mileage": 85000,
        "baselineMonth": "2026-05",
        "baselineMileage": 80000
      }
    ];
    const blob = new Blob([JSON.stringify(example, null, 2)], { type: 'application/json' });
    triggerDownload(blob, 'batch-backfill-example.json');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg flex-1">
          <h4 className="text-sm font-bold text-blue-900">Standard CSV Format:</h4>
          <p className="text-xs text-blue-700 mt-1 font-mono">
            unit,recordMonth,mileage,mileageSource,maintenancePerformed,outOfService,maintenanceEntries<br/>
            MGBA-355,2026-06,87342,actual,true,false,"06/14/2026:Replaced brake pads"
          </p>
        </div>
        <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded-r-lg flex-1 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-indigo-900">Batch Backfill (JSON Only):</h4>
            <p className="text-xs text-indigo-700 mt-1">
              Upload a JSON array of vehicles with <code>baselineMonth</code> to automatically backfill hundreds of records instantly.
            </p>
          </div>
          <button onClick={downloadExampleJson} className="mt-2 text-xs font-semibold text-indigo-600 bg-white px-3 py-1.5 rounded shadow-sm border border-indigo-100 hover:bg-indigo-50 self-start flex items-center gap-1 transition-colors">
            <Code className="w-3 h-3" /> Download JSON Template
          </button>
        </div>
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
