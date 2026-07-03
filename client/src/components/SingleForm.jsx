import React, { useState, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { Plus, Trash2, Download, Layers } from 'lucide-react';

const singleMmrSchema = z.object({
  unit: z.string().min(1, 'Unit ID is required'),
  recordMonth: z.string().regex(/^\d{4}-\d{2}$/, 'Must be YYYY-MM'),
  mileage: z.number().int().nonnegative('Must be a positive integer'),
  mileageSource: z.enum(['actual', 'interpolated']),
  maintenancePerformed: z.boolean(),
  outOfService: z.boolean(),
  maintenance: z.array(
    z.object({
      date: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/, 'MM/DD/YYYY required'),
      description: z.string().min(1, 'Required')
    })
  ).max(5, 'Max 5 entries'),
  autoBackfill: z.boolean().optional(),
  baselineMonth: z.string().optional(),
  baselineMileage: z.number().optional()
});

export default function SingleForm({ selectedSignature, applySignature, companyName, domicile }) {
  const [generating, setGenerating] = useState(false);
  const [backfillMaintenance, setBackfillMaintenance] = useState({});

  const { register, control, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(singleMmrSchema),
    defaultValues: {
      unit: '',
      recordMonth: new Date().toISOString().slice(0, 7), // YYYY-MM
      mileage: 0,
      mileageSource: 'actual',
      maintenancePerformed: false,
      outOfService: false,
      maintenance: [],
      autoBackfill: false,
      baselineMonth: '',
      baselineMileage: 0
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "maintenance"
  });

  const maintenancePerformed = watch("maintenancePerformed");
  const autoBackfill = watch("autoBackfill");
  const recordMonth = watch("recordMonth");
  const mileage = watch("mileage");
  const baselineMonth = watch("baselineMonth");
  const baselineMileage = watch("baselineMileage");

  const generatedMonths = useMemo(() => {
    if (!autoBackfill || !baselineMonth || !recordMonth || baselineMonth > recordMonth) return [];
    
    const startDate = new Date(baselineMonth + '-02');
    const endDate = new Date(recordMonth + '-02');
    const months = [];
    
    let current = new Date(startDate);
    while (current <= endDate) {
      months.push(current.toISOString().slice(0, 7));
      current.setMonth(current.getMonth() + 1);
    }

    const numMonths = months.length - 1; // Number of gap intervals
    const mileageDiff = mileage - (baselineMileage || 0);
    const increment = numMonths > 0 ? mileageDiff / numMonths : 0;

    return months.map((m, idx) => ({
      month: m,
      mileage: Math.round((baselineMileage || 0) + (increment * idx))
    }));
  }, [autoBackfill, baselineMonth, recordMonth, baselineMileage, mileage]);

  const addBackfillMaintenance = (month) => {
    setBackfillMaintenance(prev => {
      const current = prev[month] || [];
      if (current.length >= 5) {
        alert('Maximum 5 maintenance entries allowed per month.');
        return prev;
      }
      return {
        ...prev,
        [month]: [...current, { date: '', description: '' }]
      };
    });
  };

  const updateBackfillMaintenance = (month, index, field, value) => {
    setBackfillMaintenance(prev => {
      const updated = [...(prev[month] || [])];
      updated[index][field] = value;
      return { ...prev, [month]: updated };
    });
  };

  const removeBackfillMaintenance = (month, index) => {
    setBackfillMaintenance(prev => {
      const updated = [...(prev[month] || [])];
      updated.splice(index, 1);
      return { ...prev, [month]: updated };
    });
  };

  const onSubmit = async (data) => {
    if (applySignature && !selectedSignature) {
      alert("Please select a signature first, or uncheck 'Apply Signature'.");
      return;
    }

    setGenerating(true);
    try {
      if (data.autoBackfill && generatedMonths.length > 0) {
        // Validate backfill maintenance
        for (const month in backfillMaintenance) {
          const items = backfillMaintenance[month];
          for (let i = 0; i < items.length; i++) {
             if (!/^\d{2}\/\d{2}\/\d{4}$/.test(items[i].date) || !items[i].description) {
                alert(`Invalid maintenance entry in month ${month}. Date must be MM/DD/YYYY and description is required.`);
                setGenerating(false);
                return;
             }
          }
        }

        // Construct multiple records
        const records = generatedMonths.map(gm => ({
          unit: data.unit,
          recordMonth: gm.month,
          mileage: gm.mileage,
          mileageSource: 'interpolated', // backfilled records are usually considered interpolated unless told otherwise
          maintenancePerformed: (backfillMaintenance[gm.month] || []).length > 0,
          outOfService: false, 
          maintenance: backfillMaintenance[gm.month] || []
        }));

        // The current month should take actual source and outOfService if set
        records[records.length - 1].mileageSource = data.mileageSource;
        if (data.outOfService) records[records.length - 1].outOfService = true;
        // Merge the main form's maintenance into the current month if the user used the main toggle instead of the backfill list
        if (data.maintenancePerformed && data.maintenance.length > 0) {
           records[records.length - 1].maintenance = data.maintenance;
           records[records.length - 1].maintenancePerformed = true;
        }

        const payload = { records, signatureFilename: selectedSignature, applySignature, companyName, domicile };
        const response = await axios.post('/api/generate-multiple', payload, {
          responseType: 'blob'
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `MMR_Backfill_${data.unit}.zip`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        // Single record logic
        const payload = { ...data, signatureFilename: selectedSignature, applySignature, companyName, domicile };
        const response = await axios.post('/api/generate', payload, {
          responseType: 'blob'
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `MMR_${data.unit}_${data.recordMonth}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (error) {
      console.error(error);
      alert('Failed to generate PDF. Check console for details.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700">Vehicle Unit ID</label>
          <input {...register('unit')} className="input-field mt-1" placeholder="e.g. MGBA-355" />
          {errors.unit && <p className="text-red-500 text-xs mt-1">{errors.unit.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Record Month (YYYY-MM)</label>
          <input type="month" {...register('recordMonth')} className="input-field mt-1" />
          {errors.recordMonth && <p className="text-red-500 text-xs mt-1">{errors.recordMonth.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Mileage</label>
          <input type="number" {...register('mileage', { valueAsNumber: true })} className="input-field mt-1" />
          {errors.mileage && <p className="text-red-500 text-xs mt-1">{errors.mileage.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Mileage Source</label>
          <select {...register('mileageSource')} className="input-field mt-1">
            <option value="actual">Actual</option>
            <option value="interpolated">Interpolated</option>
          </select>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-6">
        <h3 className="text-lg font-medium text-slate-900 mb-4">Features & Status</h3>
        <div className="flex flex-col gap-4">
          <label className="flex items-center gap-2 text-sm font-bold text-indigo-700 cursor-pointer bg-indigo-50 p-4 rounded-xl border border-indigo-200 transition-colors hover:bg-indigo-100">
            <input type="checkbox" {...register('autoBackfill')} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 w-5 h-5" />
            Enable Auto-Backfill (Generates ZIP of multiple months)
          </label>
          
          <div className="flex gap-6 mt-2">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" {...register('maintenancePerformed')} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 w-4 h-4" />
              Maintenance Performed (Current Month)
            </label>
            {!maintenancePerformed && (
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" {...register('outOfService')} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 w-4 h-4" />
                Out of Service (Q2)
              </label>
            )}
          </div>
        </div>
      </div>

      {autoBackfill && (
        <div className="border border-indigo-200 bg-indigo-50/30 rounded-xl p-6 space-y-6 mt-4 shadow-sm">
          <div className="flex items-center gap-2 text-indigo-800">
            <Layers className="w-5 h-5" />
            <h3 className="text-lg font-semibold">Auto-Backfill Configuration</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-5 rounded-lg border border-slate-200">
            <div>
              <label className="block text-sm font-medium text-slate-700">Baseline Month (Backfill To)</label>
              <input type="month" {...register('baselineMonth')} className="input-field mt-1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Baseline Mileage</label>
              <input type="number" {...register('baselineMileage', { valueAsNumber: true })} className="input-field mt-1" />
            </div>
          </div>

          {generatedMonths.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-slate-800 mb-3">Generated Records Preview:</h4>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {generatedMonths.map((gm) => (
                  <div key={gm.month} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 hover:border-indigo-300 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                      <div>
                        <span className="font-bold text-slate-800 text-lg">{gm.month}</span>
                        <span className="ml-4 text-sm text-slate-500">Interpolated Mileage: <span className="font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{gm.mileage.toLocaleString()}</span></span>
                      </div>
                      <button
                        type="button"
                        onClick={() => addBackfillMaintenance(gm.month)}
                        className="text-xs font-semibold bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-md hover:bg-indigo-200 flex items-center gap-1 transition-colors"
                      >
                        <Plus className="w-3 h-3" /> Add Maintenance
                      </button>
                    </div>

                    {backfillMaintenance[gm.month]?.length > 0 && (
                      <div className="mt-4 pl-4 border-l-2 border-indigo-300 space-y-3">
                        {backfillMaintenance[gm.month].map((maint, idx) => (
                          <div key={idx} className="flex gap-3 items-center bg-slate-50 p-2 rounded-md">
                            <input 
                              type="text" 
                              placeholder="MM/DD/YYYY" 
                              className="input-field text-sm py-1.5 w-32" 
                              value={maint.date}
                              onChange={(e) => updateBackfillMaintenance(gm.month, idx, 'date', e.target.value)}
                            />
                            <input 
                              type="text" 
                              placeholder="Description of work" 
                              className="input-field text-sm py-1.5 flex-1" 
                              value={maint.description}
                              onChange={(e) => updateBackfillMaintenance(gm.month, idx, 'description', e.target.value)}
                            />
                            <button type="button" onClick={() => removeBackfillMaintenance(gm.month, idx)} className="p-1.5 text-red-500 hover:bg-red-100 rounded-md transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {maintenancePerformed && !autoBackfill && (
        <div className="border-t border-slate-200 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-slate-900">Current Month Maintenance</h3>
            <button
              type="button"
              onClick={() => {
                if (fields.length < 5) append({ date: '', description: '' });
              }}
              disabled={fields.length >= 5}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500 disabled:opacity-50 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Add Row
            </button>
          </div>
          
          <div className="space-y-3">
            {fields.map((item, index) => (
              <div key={item.id} className="flex gap-3 items-start">
                <div className="w-1/3">
                  <input {...register(`maintenance.${index}.date`)} placeholder="MM/DD/YYYY" className="input-field" />
                  {errors?.maintenance?.[index]?.date && <p className="text-red-500 text-xs mt-1">{errors.maintenance[index].date.message}</p>}
                </div>
                <div className="flex-1">
                  <input {...register(`maintenance.${index}.description`)} placeholder="Description of work" className="input-field" />
                  {errors?.maintenance?.[index]?.description && <p className="text-red-500 text-xs mt-1">{errors.maintenance[index].description.message}</p>}
                </div>
                <button type="button" onClick={() => remove(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
            {fields.length === 0 && <p className="text-sm text-slate-500 italic">No maintenance entries added.</p>}
          </div>
        </div>
      )}

      <div className="pt-4 flex justify-end">
        <button type="submit" disabled={generating} className="btn-primary flex items-center gap-2">
          {generating ? 'Generating...' : (
            <>
              <Download className="w-4 h-4" />
              {autoBackfill && generatedMonths.length > 0 ? `Generate ZIP (${generatedMonths.length} MMRs)` : 'Generate PDF'}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
