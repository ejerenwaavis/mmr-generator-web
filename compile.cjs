const fs = require('fs');

const baseData = [
  {
    "unit": "411562",
    "recordMonth": "2026-06",
    "mileage": 277315,
    "mileageSource": "actual",
    "maintenancePerformed": true,
    "outOfService": false,
    "maintenance": []
  },
  {
    "unit": "419016",
    "recordMonth": "2026-06",
    "mileage": 175020,
    "mileageSource": "actual",
    "maintenancePerformed": true,
    "outOfService": false,
    "maintenance": []
  },
  {
    "unit": "411443",
    "recordMonth": "2026-06",
    "mileage": 266870,
    "mileageSource": "actual",
    "maintenancePerformed": true,
    "outOfService": false,
    "maintenance": []
  },
  {
    "unit": "414420",
    "recordMonth": "2026-06",
    "mileage": 205559,
    "mileageSource": "actual",
    "maintenancePerformed": true,
    "outOfService": false,
    "maintenance": []
  },
  {
    "unit": "403866",
    "recordMonth": "2026-06",
    "mileage": 443573,
    "mileageSource": "actual",
    "maintenancePerformed": true,
    "outOfService": false,
    "maintenance": []
  },
  {
    "unit": "402385",
    "recordMonth": "2026-06",
    "mileage": 269704,
    "mileageSource": "actual",
    "maintenancePerformed": true,
    "outOfService": false,
    "maintenance": []
  },
  {
    "unit": "440940",
    "recordMonth": "2026-06",
    "mileage": 229347,
    "mileageSource": "actual",
    "maintenancePerformed": true,
    "outOfService": false,
    "maintenance": []
  },
  {
    "unit": "467974",
    "recordMonth": "2026-06",
    "mileage": 179442,
    "mileageSource": "actual",
    "maintenancePerformed": true,
    "outOfService": false,
    "maintenance": []
  },
  {
    "unit": "412390",
    "recordMonth": "2026-06",
    "mileage": 130171,
    "mileageSource": "actual",
    "maintenancePerformed": true,
    "outOfService": false,
    "maintenance": []
  },
  {
    "unit": "87491",
    "recordMonth": "2026-06",
    "mileage": 253270,
    "mileageSource": "actual",
    "maintenancePerformed": true,
    "outOfService": false,
    "maintenance": []
  },
  {
    "unit": "463449",
    "recordMonth": "2026-06",
    "mileage": 186969,
    "mileageSource": "actual",
    "maintenancePerformed": true,
    "outOfService": false,
    "maintenance": []
  },
  {
    "unit": "463455",
    "recordMonth": "2026-06",
    "mileage": 164796,
    "mileageSource": "actual",
    "maintenancePerformed": true,
    "outOfService": false,
    "maintenance": []
  },
  {
    "unit": "317183",
    "recordMonth": "2026-06",
    "mileage": 190833,
    "mileageSource": "actual",
    "maintenancePerformed": true,
    "outOfService": false,
    "maintenance": []
  }
];

const historical = [
  { unit: "86916", recordMonth: "2026-01", mileage: 318792 },
  { unit: "86916", recordMonth: "2025-12", mileage: 197219 },
  { unit: "86916", recordMonth: "2025-11", mileage: 197219 },
  { unit: "86916", recordMonth: "2025-10", mileage: 317345 },

  { unit: "402385", recordMonth: "2026-02", mileage: 255607 },
  { unit: "402385", recordMonth: "2026-01", mileage: 264678 },
  { unit: "402385", recordMonth: "2025-12", mileage: 263257 },
  { unit: "402385", recordMonth: "2025-11", mileage: 261620 },
  { unit: "402385", recordMonth: "2025-08", mileage: 253102 },

  { unit: "436130", recordMonth: "2026-04", mileage: 101170 }, // Assumed typo 10117 -> 101170
  { unit: "436130", recordMonth: "2026-02", mileage: 96209 },
  { unit: "436130", recordMonth: "2025-11", mileage: 91692, maintenance: [{date: "11/08/2025", description: "brakes, roties rare g front oil change"}] },

  { unit: "440940", recordMonth: "2026-04", mileage: 165892 },
  { unit: "440940", recordMonth: "2026-01", mileage: 222500 },
  { unit: "440940", recordMonth: "2025-12", mileage: 221205 },
  { unit: "440940", recordMonth: "2025-09", mileage: 216758 },
  { unit: "440940", recordMonth: "2025-08", mileage: 155003 },

  { unit: "467974", recordMonth: "2026-04", mileage: 147621 },
  { unit: "467974", recordMonth: "2026-01", mileage: 175184 },
  { unit: "467974", recordMonth: "2025-10", mileage: 170975 },
  { unit: "467974", recordMonth: "2025-08", mileage: 136021 },

  { unit: "412390", recordMonth: "2026-04", mileage: 121406 },
  { unit: "412390", recordMonth: "2026-02", mileage: 118084 },
  { unit: "412390", recordMonth: "2026-01", mileage: 123512 },
  { unit: "412390", recordMonth: "2025-12", mileage: 122158 },

  { unit: "317183", recordMonth: "2026-06", mileage: 190833 },
  { unit: "317183", recordMonth: "2026-05", mileage: 190264 },
  { unit: "317183", recordMonth: "2024-05", mileage: 183404 },

  { unit: "415358", recordMonth: "2026-04", mileage: 299987 },
  { unit: "415358", recordMonth: "2026-03", mileage: 299903 },
  { unit: "415358", recordMonth: "2026-01", mileage: 250100 }, // Assumed typo 25010
  { unit: "415358", recordMonth: "2025-12", mileage: 211000 }, // Assumed typo 21100

  { unit: "403866", recordMonth: "2026-06", mileage: 443573 },
  { unit: "403866", recordMonth: "2026-05", mileage: 443066 },
  { unit: "403866", recordMonth: "2026-04", mileage: 203816 },
  { unit: "403866", recordMonth: "2026-03", mileage: 202866 },
  { unit: "403866", recordMonth: "2026-02", mileage: 202104 },
  { unit: "403866", recordMonth: "2026-01", mileage: 439410, maintenance: [{date: "01/15/2026", description: "backdoor repair"}] },
  { unit: "403866", recordMonth: "2025-12", mileage: 438828, maintenance: [{date: "12/15/2025", description: "radiator repair"}] },

  { unit: "419016", recordMonth: "2026-04", mileage: 166038 },
  { unit: "419016", recordMonth: "2026-01", mileage: 167219, maintenance: [{date: "01/25/2026", description: "glass replacement"}, {date: "01/18/2026", description: "tire replacement"}] },
  { unit: "419016", recordMonth: "2025-12", mileage: 166079, maintenance: [{date: "12/27/2025", description: "change tire and replace Miro"}] },

  { unit: "202302", recordMonth: "2026-04", mileage: 317180 },
  { unit: "202302", recordMonth: "2026-01", mileage: 319257 },
  { unit: "202302", recordMonth: "2025-12", mileage: 319257 },

  { unit: "87491", recordMonth: "2026-06", mileage: 253270 },
  { unit: "87491", recordMonth: "2026-04", mileage: 254089 },
  { unit: "87491", recordMonth: "2026-03", mileage: 253296 },
  { unit: "87491", recordMonth: "2026-01", mileage: 250010 },
  { unit: "87491", recordMonth: "2025-12", mileage: 249325 }
];

// Compile
const masterRecords = [];
const seenMap = new Set();

const addRecord = (r) => {
  const key = `${r.unit}_${r.recordMonth}`;
  if (!seenMap.has(key)) {
    masterRecords.push({
      unit: r.unit,
      recordMonth: r.recordMonth,
      mileage: r.mileage,
      mileageSource: "actual", // Historicals are actual
      maintenancePerformed: (r.maintenance && r.maintenance.length > 0) ? true : false,
      outOfService: false,
      maintenance: r.maintenance || []
    });
    seenMap.add(key);
  }
};

historical.forEach(addRecord);

// Add base data if not already added by historical
baseData.forEach(addRecord);

fs.writeFileSync('C:/Users/ejere/Documents/Projects/DevOps/mmr-generator-web/compiled-batch.json', JSON.stringify(masterRecords, null, 2));
console.log('Compiled to compiled-batch.json');
