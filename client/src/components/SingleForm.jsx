import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { Plus, Trash2, Download } from 'lucide-react';

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
  ).max(5, 'Max 5 entries')
});

export default function SingleForm({ selectedSignature, applySignature, companyName, domicile }) {
  const [generating, setGenerating] = useState(false);

  const { register, control, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(singleMmrSchema),
    defaultValues: {
      unit: '',
      recordMonth: new Date().toISOString().slice(0, 7), // YYYY-MM
      mileage: 0,
      mileageSource: 'actual',
      maintenancePerformed: false,
      outOfService: false,
      maintenance: []
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "maintenance"
  });

  const maintenancePerformed = watch("maintenancePerformed");

  const onSubmit = async (data) => {
    if (applySignature && !selectedSignature) {
      alert("Please select a signature first, or uncheck 'Apply Signature'.");
      return;
    }

    setGenerating(true);
    try {
      const payload = { ...data, signatureFilename: selectedSignature, applySignature, companyName, domicile };
      const response = await axios.post('/api/generate', payload, {
        responseType: 'blob' // Important for downloading files
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `MMR_${data.unit}_${data.recordMonth}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
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
        <h3 className="text-lg font-medium text-slate-900 mb-4">Status</h3>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" {...register('maintenancePerformed')} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 w-4 h-4" />
            Maintenance Performed
          </label>
          {!maintenancePerformed && (
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" {...register('outOfService')} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 w-4 h-4" />
              Out of Service (Q2)
            </label>
          )}
        </div>
      </div>

      {maintenancePerformed && (
        <div className="border-t border-slate-200 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-slate-900">Maintenance Entries</h3>
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
              Generate PDF
            </>
          )}
        </button>
      </div>
    </form>
  );
}
